import { useState, useEffect, useMemo } from "react";
import FormRow from "@/components/ui/FormRow";

const TXN_TYPES_DEFAULT = ["End of List", "Cheque", "e-Fund Transfer", "Others"];
const TXN_TYPES_EXTRA = ["End of List", "ATM", "Card", "Cheque", "ECS", "e-Fund Transfer", "Electronic Cheque", "Electronic DD/PO", "Others"];

export interface BankDetails {
  account_holder_name?: string;
  account_number?: string;
  ifsc_code?: string;
  swift_code?: string;
  bank_name?: string;
  branch_name?: string;
  bank_configuration?: string;
  cheque_book_start_no?: string;
  cheque_book_end_no?: string;
  enable_cheque_printing?: number;
  cheque_printing_configuration?: string;
  od_limit?: number;
  transaction_type?: string;
  cross_using?: string;
  company_bank?: string;
}

export const EMPTY_BANK_DETAILS: BankDetails = {
  account_holder_name: "",
  account_number: "",
  ifsc_code: "",
  swift_code: "",
  bank_name: "",
  branch_name: "",
  bank_configuration: "",
  cheque_book_start_no: "",
  cheque_book_end_no: "",
  enable_cheque_printing: 0,
  cheque_printing_configuration: "",
  od_limit: 0,
  transaction_type: "",
  cross_using: "A/c Payee",
  company_bank: "",
};

interface BankDetailsPopupProps {
  ledgerName: string;
  bankForm: BankDetails;
  setBankForm: React.Dispatch<React.SetStateAction<BankDetails>>;
  onClose: () => void;
  onAccept: () => void;
  isOD?: boolean;
}

export default function BankDetailsPopup({
  ledgerName,
  bankForm,
  setBankForm,
  onClose,
  onAccept,
  isOD = false,
}: BankDetailsPopupProps) {
  const [showMore, setShowMore] = useState(false);
  const [txnSearch, setTxnSearch] = useState("");
  const [activeTxnIndex, setActiveTxnIndex] = useState(0);
  const [showTxnSearch, setShowTxnSearch] = useState(false);

  const selectedTxn = bankForm.transaction_type || "";

  const setBankField = (key: keyof BankDetails) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setBankForm((f) => ({ ...f, [key]: e.target.value }));

  const setBankNumber = (key: keyof BankDetails) =>
    (e: React.ChangeEvent<HTMLInputElement>) =>
      setBankForm((f) => ({ ...f, [key]: e.target.value === "" ? undefined : Number(e.target.value) }));

  const setBankToggle = (key: keyof BankDetails) =>
    (e: React.ChangeEvent<HTMLInputElement>) =>
      setBankForm((f) => ({ ...f, [key]: e.target.checked ? 1 : 0 }));

  const SIMPLE_TXN_TYPES = ["ATM", "Card", "ECS", "Electronic Cheque", "Electronic DD/PO", "Others", "End of List"];

  const handleTxnSelect = (txn: string) => {
    if (txn === "End of List") {
      setBankForm((f) => ({ ...f, transaction_type: "" }));
      onAccept();
      return;
    }
    if (SIMPLE_TXN_TYPES.includes(txn)) {
      setBankForm((f) => ({ ...f, transaction_type: txn }));
      onAccept();
      return;
    }
    setBankForm((f) => ({ ...f, transaction_type: txn }));
  };

  const txnList = useMemo(() => {
    return showMore ? TXN_TYPES_EXTRA : TXN_TYPES_DEFAULT;
  }, [showMore]);

  const filteredTxns = useMemo(() => {
    if (!txnSearch) return txnList;
    return txnList.filter((t) => t.toLowerCase().includes(txnSearch.toLowerCase()));
  }, [txnList, txnSearch]);

  useEffect(() => {
    setActiveTxnIndex(0);
  }, [txnSearch]);

  const handleSearchKeydown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (filteredTxns.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveTxnIndex((prev) => (prev + 1) % filteredTxns.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveTxnIndex((prev) => (prev - 1 + filteredTxns.length) % filteredTxns.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (filteredTxns[activeTxnIndex]) {
        handleTxnSelect(filteredTxns[activeTxnIndex]);
      }
    } else if (e.key === "Escape") {
      e.preventDefault();
      setTxnSearch("");
      setShowTxnSearch(false);
    }
  };

  useEffect(() => {
    const handlePopupKeys = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (showTxnSearch) {
          e.preventDefault();
          setTxnSearch("");
          setShowTxnSearch(false);
          return;
        }
        e.preventDefault();
        onClose();
      }

      if (e.altKey && (e.key === "a" || e.key === "A")) {
        e.preventDefault();
        onAccept();
      }

      if (e.altKey && (e.key === "s" || e.key === "S")) {
        e.preventDefault();
        setShowTxnSearch(true);
        setTimeout(() => {
          const searchInput = document.getElementById("txn-search-input");
          if (searchInput) searchInput.focus();
        }, 0);
      }

      if (e.key === "Enter" || e.key === "ArrowDown" || e.key === "ArrowUp") {
        const active = document.activeElement;
        if (!active) return;

        if (active.id === "txn-search-input" || active.classList.contains("txn-item")) {
          return;
        }

        const focusableSelectors = "input:not([disabled]), select:not([disabled]), button:not([disabled])";
        const focusables = Array.from(document.querySelectorAll(`#bank-details-form ${focusableSelectors}`)) as HTMLElement[];
        const index = focusables.indexOf(active as HTMLElement);

        if (index !== -1) {
          if (e.key === "Enter" || e.key === "ArrowDown") {
            e.preventDefault();
            const next = focusables[index + 1] || focusables[0];
            next?.focus();
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            const prev = focusables[index - 1] || focusables[focusables.length - 1];
            prev?.focus();
          }
        }
      }
    };

    window.addEventListener("keydown", handlePopupKeys);
    return () => window.removeEventListener("keydown", handlePopupKeys);
  }, [onClose, onAccept, showTxnSearch]);

  const inputCls =
    "flex-1 bg-transparent text-sm outline-none px-1.5 py-0.5 border border-zinc-200 rounded focus:border-zinc-800 transition-colors bg-white/50";

  const txnInputCls =
    "bg-zinc-50 border border-zinc-300 px-3 py-1.5 text-sm outline-none focus:border-zinc-500 transition-colors";

  const eftInputCls =
    "bg-zinc-50 border border-zinc-300 px-2 py-1 text-sm outline-none focus:border-zinc-500 transition-colors";

  const plainInputCls =
    "bg-white border border-zinc-200 px-2 py-1 text-sm outline-none focus:border-zinc-400 transition-colors";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/10">
      <div
        id="bank-details-form"
        className="bg-white border border-zinc-300 shadow-xl w-[780px] h-[520px] flex flex-col rounded-sm overflow-hidden"
      >
        {/* Simple centered title */}
        <div className="text-center py-3 border-b border-zinc-200 select-none">
          <span className="text-sm text-zinc-700">Bank Details for: </span>
          <span className="text-sm font-bold text-zinc-900">{ledgerName || "—"}</span>
        </div>

        {/* Body Container */}
        <div className="flex flex-1 min-h-0">
          
          {/* Main Form Area */}
          <div className="flex-1 p-5 overflow-y-auto bg-white">
            {/* Transaction Type Section */}
            <div className="mb-6">
              <div className="text-sm font-bold text-zinc-900 mb-1">Transaction Type</div>
              <div className="border-b border-zinc-300 mb-3" />

              {/* Transaction Type Display / Input */}
              <div className="mb-2">
                {selectedTxn ? (
                  <div className={`${txnInputCls} font-bold inline-block min-w-[220px] cursor-pointer`}
                    onClick={() => { setShowTxnSearch(true); setTimeout(() => document.getElementById("txn-search-input")?.focus(), 0); }}
                  >
                    {selectedTxn}
                  </div>
                ) : (
                  <input
                    className={`${txnInputCls} w-64 cursor-pointer`}
                    readOnly
                    placeholder=""
                    onClick={() => { setShowTxnSearch(true); setTimeout(() => document.getElementById("txn-search-input")?.focus(), 0); }}
                  />
                )}
              </div>

              {/* Conditional Fields for Cheque */}
              {selectedTxn === "Cheque" && (
                <div className="ml-6 mt-3">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-zinc-700">Cross using</span>
                    <span className="text-sm text-zinc-500">:</span>
                    <input
                      className="bg-transparent text-sm font-bold text-zinc-900 outline-none border-b border-transparent focus:border-zinc-400 px-1 py-0.5 min-w-[120px]"
                      value={bankForm.cross_using || "A/c Payee"}
                      onChange={setBankField("cross_using")}
                    />
                  </div>
                </div>
              )}

              {/* Conditional Fields for e-Fund Transfer */}
              {selectedTxn === "e-Fund Transfer" && (
                <div className="mt-3">
                  <div className="text-sm font-bold text-zinc-900 mb-2">e-Fund Transfer</div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2 flex-1 max-w-[280px]">
                        <span className="text-sm text-zinc-700 whitespace-nowrap">A/c No.</span>
                        <span className="text-sm text-zinc-500">:</span>
                        <input
                          className={`${eftInputCls} flex-1`}
                          value={bankForm.account_number || ""}
                          onChange={setBankField("account_number")}
                        />
                      </div>
                      <div className="flex items-center gap-2 flex-1 max-w-[280px]">
                        <span className="text-sm text-zinc-700 whitespace-nowrap">IFS Code</span>
                        <span className="text-sm text-zinc-500">:</span>
                        <input
                          className={`${eftInputCls} flex-1`}
                          value={bankForm.ifsc_code || ""}
                          onChange={setBankField("ifsc_code")}
                        />
                      </div>
                    </div>
                    <div className="flex items-center gap-2 max-w-[280px]">
                      <span className="text-sm text-zinc-700 whitespace-nowrap">Bank Name</span>
                      <span className="text-sm text-zinc-500">:</span>
                      <input
                        className={`${plainInputCls} flex-1`}
                        value={bankForm.bank_name || ""}
                        onChange={setBankField("bank_name")}
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-zinc-700 whitespace-nowrap">Company Bank</span>
                      <span className="text-sm text-zinc-500">:</span>
                      <span className="text-sm text-zinc-700">♦ End of List</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Existing Basic Bank Details Fields */}
            <div className="space-y-1">
              <FormRow label="A/c Holder's Name" labelWidth="w-44" className="flex items-center min-h-[26px]">
                <input className={inputCls} value={bankForm.account_holder_name || ""} onChange={setBankField("account_holder_name")} />
              </FormRow>
              <FormRow label="A/c No." labelWidth="w-44" className="flex items-center min-h-[26px]">
                <input className={inputCls} value={bankForm.account_number || ""} onChange={setBankField("account_number")} />
              </FormRow>
              <FormRow label="IFS Code" labelWidth="w-44" className="flex items-center min-h-[26px]">
                <input className={inputCls} value={bankForm.ifsc_code || ""} onChange={setBankField("ifsc_code")} />
              </FormRow>
              <FormRow label="SWIFT Code" labelWidth="w-44" className="flex items-center min-h-[26px]">
                <input className={inputCls} value={bankForm.swift_code || ""} onChange={setBankField("swift_code")} />
              </FormRow>
              <FormRow label="Bank Name" labelWidth="w-44" className="flex items-center min-h-[26px]">
                <input className={inputCls} value={bankForm.bank_name || ""} onChange={setBankField("bank_name")} />
              </FormRow>
              <FormRow label="Branch" labelWidth="w-44" className="flex items-center min-h-[26px]">
                <input className={inputCls} value={bankForm.branch_name || ""} onChange={setBankField("branch_name")} />
              </FormRow>

              {isOD && (
                <FormRow label="OD Limit" labelWidth="w-44" className="flex items-center min-h-[26px]">
                  <input
                    className={`${inputCls} text-right font-medium max-w-[120px]`}
                    type="number"
                    step="0.01"
                    value={bankForm.od_limit ?? 0}
                    onChange={setBankNumber("od_limit")}
                  />
                </FormRow>
              )}

              <div className="pt-2 border-t border-zinc-200/60 my-2" />

              <FormRow label="Set/Alter range for Cheque Books" labelWidth="w-44" className="flex items-center min-h-[26px]">
                <select
                  className={inputCls}
                  value={bankForm.bank_configuration === "Yes" ? "Yes" : "No"}
                  onChange={(e) => setBankForm((f) => ({ ...f, bank_configuration: e.target.value === "Yes" ? "Yes" : "No" }))}
                >
                  <option>No</option>
                  <option>Yes</option>
                </select>
              </FormRow>

              {bankForm.bank_configuration === "Yes" && (
                <div className="pl-4 border-l border-zinc-300 space-y-1 py-1">
                  <FormRow label="Cheque Book Start No" labelWidth="w-40" className="flex items-center min-h-[26px]">
                    <input className={inputCls} value={bankForm.cheque_book_start_no || ""} onChange={setBankField("cheque_book_start_no")} />
                  </FormRow>
                  <FormRow label="Cheque Book End No" labelWidth="w-40" className="flex items-center min-h-[26px]">
                    <input className={inputCls} value={bankForm.cheque_book_end_no || ""} onChange={setBankField("cheque_book_end_no")} />
                  </FormRow>
                </div>
              )}

              <div className="flex items-center min-h-[26px] mb-1">
                <span className="w-44 text-sm text-zinc-500 shrink-0">Enable Cheque Printing</span>
                <span className="text-zinc-400 mr-2 shrink-0">:</span>
                <label className="relative inline-flex items-center cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={!!bankForm.enable_cheque_printing}
                    onChange={setBankToggle("enable_cheque_printing")}
                    className="sr-only peer"
                  />
                  <div className="w-8 h-4.5 bg-zinc-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:bg-zinc-800"></div>
                </label>
              </div>

              {!!bankForm.enable_cheque_printing && (
                <div className="pl-4 border-l border-zinc-300 space-y-1 py-1">
                  <FormRow label="Cheque Print Config" labelWidth="w-40" className="flex items-center min-h-[26px]">
                    <input className={inputCls} value={bankForm.cheque_printing_configuration || ""} onChange={setBankField("cheque_printing_configuration")} />
                  </FormRow>
                </div>
              )}
            </div>
          </div>

          {/* Right Panel - Transaction Types List */}
          <div className="w-56 border-l border-zinc-200 flex flex-col shrink-0 bg-white">
            {/* Transaction Types Header */}
            <div className="bg-blue-700 text-white text-xs px-3 py-1.5 font-bold select-none">
              Transaction Types
            </div>

            {/* Show More / Show Less Button */}
            <div className="flex justify-end border-b border-zinc-200">
              <button
                onClick={() => setShowMore((v) => !v)}
                className="bg-zinc-200 text-xs px-3 py-1 font-medium hover:bg-zinc-300 transition-colors text-zinc-900"
              >
                {showMore ? "Show Less" : "Show More"}
              </button>
            </div>

            {/* Transaction Search (hidden by default, shown via Alt+S) */}
            {showTxnSearch && (
              <div className="border-b border-zinc-200 p-1">
                <input
                  id="txn-search-input"
                  className="w-full text-xs bg-zinc-50 border border-zinc-300 rounded px-2 py-0.5 outline-none focus:border-zinc-500 transition-colors"
                  placeholder="Search types..."
                  value={txnSearch}
                  onChange={(e) => setTxnSearch(e.target.value)}
                  onKeyDown={handleSearchKeydown}
                  onBlur={() => { if (!txnSearch) setShowTxnSearch(false); }}
                />
              </div>
            )}
            
            {/* Transaction Types List */}
            <div className="flex-1 overflow-y-auto py-1">
              {filteredTxns.length === 0 ? (
                <div className="text-[11px] text-zinc-400 px-3 py-1.5 italic select-none">No types matched</div>
              ) : (
                filteredTxns.map((txn, index) => {
                  const isSelected = selectedTxn === txn || (!selectedTxn && txn === "End of List");
                  const isActive = index === activeTxnIndex;
                  return (
                    <div
                      key={txn}
                      onClick={() => handleTxnSelect(txn)}
                      className={[
                        "txn-item text-xs px-3 py-1 select-none cursor-pointer transition-colors",
                        isSelected ? "bg-zinc-200 font-medium text-zinc-900" : "text-zinc-700 hover:bg-zinc-100",
                        isActive && !isSelected ? "bg-zinc-100" : "",
                      ].join(" ")}
                    >
                      {txn === "End of List" ? `♦ ${txn}` : txn}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


