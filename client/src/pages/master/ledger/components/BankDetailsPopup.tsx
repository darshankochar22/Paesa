import { useState, useEffect, useMemo } from "react";
import FormRow from "@/components/ui/FormRow";

const TXN_TYPES_DEFAULT = ["End of List", "Cheque", "e-Fund Transfer", "Others"];
const TXN_TYPES_EXTRA = ["ATM", "-Card", "ECS", "Electronic Cheque", "Electronic DD/PO", "others"];

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

  const handleTxnSelect = (txn: string) => {
    if (txn === "End of List") {
      setBankForm((f) => ({ ...f, transaction_type: "" }));
      return;
    }
    setBankForm((f) => ({ ...f, transaction_type: txn }));
  };

  const txnList = useMemo(() => {
    return showMore ? [...TXN_TYPES_DEFAULT, ...TXN_TYPES_EXTRA] : TXN_TYPES_DEFAULT;
  }, [showMore]);

  const filteredTxns = useMemo(() => {
    return txnList.filter((t) => t.toLowerCase().includes(txnSearch.toLowerCase()));
  }, [txnList, txnSearch]);

  // Adjust active index when search changes
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
    }
  };

  // Keyboard navigation inside popup
  useEffect(() => {
    const handlePopupKeys = (e: KeyboardEvent) => {
      // Esc to Close
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }

      // Alt+A to Accept
      if (e.altKey && (e.key === "a" || e.key === "A")) {
        e.preventDefault();
        onAccept();
      }

      // Alt+S to focus Transaction search input
      if (e.altKey && (e.key === "s" || e.key === "S")) {
        e.preventDefault();
        const searchInput = document.getElementById("txn-search-input");
        if (searchInput) searchInput.focus();
      }

      // Enter/Up/Down Arrow field skipping
      if (e.key === "Enter" || e.key === "ArrowDown" || e.key === "ArrowUp") {
        const active = document.activeElement;
        if (!active) return;

        // Skip hijacking keys if searching txn type
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
  }, [onClose, onAccept]);

  const inputCls =
    "flex-1 bg-transparent text-sm outline-none px-1.5 py-0.5 border border-zinc-200 rounded focus:border-zinc-800 transition-colors bg-white/50";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-900/40 backdrop-blur-[2px]">
      <div
        id="bank-details-form"
        className="bg-white border border-zinc-300 shadow-xl w-[720px] h-[480px] flex flex-col rounded-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150"
      >
        {/* Header */}
        <div className="bg-zinc-900 text-white text-xs px-4 py-2 font-medium select-none flex justify-between items-center border-b border-zinc-950">
          <div className="flex items-center gap-1.5">
            <span className="font-semibold text-zinc-100 uppercase tracking-wider text-[10px] bg-zinc-800 px-1.5 py-0.5 rounded">BANK DETAILS</span>
            <span className="text-zinc-400">For:</span>
            <span className="font-semibold text-white">{ledgerName || "—"}</span>
          </div>
          <button onClick={onClose} className="text-zinc-400 hover:text-white text-base leading-none transition-colors">&times;</button>
        </div>

        {/* Body Container */}
        <div className="flex flex-1 min-h-0">
          
          {/* Main Form Fields */}
          <div className="flex-1 p-4 space-y-1 overflow-y-auto bg-zinc-50/50">
            <div className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-2">Account Parameters</div>

            <FormRow label="A/c Holder's Name" labelWidth="w-44" className="flex items-center min-h-[26px]">
              <input autoFocus className={inputCls} value={bankForm.account_holder_name || ""} onChange={setBankField("account_holder_name")} />
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
            <div className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-2">Bank Configuration</div>

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
              <div className="pl-4 border-l border-zinc-300 space-y-1 py-1 animate-in slide-in-from-top-1 duration-150">
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
              <div className="pl-4 border-l border-zinc-300 space-y-1 py-1 animate-in slide-in-from-top-1 duration-150">
                <FormRow label="Cheque Print Config" labelWidth="w-40" className="flex items-center min-h-[26px]">
                  <input className={inputCls} value={bankForm.cheque_printing_configuration || ""} onChange={setBankField("cheque_printing_configuration")} />
                </FormRow>
              </div>
            )}
          </div>

          {/* Searchable Transaction Type Panel */}
          <div className="w-56 border-l border-zinc-200 bg-zinc-50/30 flex flex-col shrink-0">
            <div className="px-3 py-2 border-b border-zinc-200 bg-zinc-100/50 flex flex-col gap-1.5 select-none shrink-0">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Transaction Type</span>
                <button
                  onClick={() => setShowMore((v) => !v)}
                  className="text-[10px] text-zinc-500 hover:text-zinc-800 underline underline-offset-1 font-medium transition-colors"
                >
                  {showMore ? "Show Less" : "Show More"}
                </button>
              </div>
              <input
                id="txn-search-input"
                className="w-full text-xs bg-white border border-zinc-200 rounded px-2 py-0.5 outline-none focus:border-zinc-800 transition-colors"
                placeholder="Search types..."
                value={txnSearch}
                onChange={(e) => setTxnSearch(e.target.value)}
                onKeyDown={handleSearchKeydown}
              />
            </div>
            
            <div className="flex-1 overflow-y-auto p-1 space-y-0.5">
              {filteredTxns.length === 0 ? (
                <div className="text-[11px] text-zinc-400 px-2 py-1.5 italic select-none">No types matched</div>
              ) : (
                filteredTxns.map((txn, index) => {
                  const isSelected = selectedTxn === txn || (!selectedTxn && txn === "End of List");
                  const isActive = index === activeTxnIndex;
                  return (
                    <div
                      key={txn}
                      onClick={() => handleTxnSelect(txn)}
                      className={[
                        "txn-item text-xs px-2.5 py-1 rounded select-none cursor-pointer transition-colors flex items-center justify-between",
                        txn === "End of List" ? "italic text-zinc-400" : "text-zinc-700",
                        isSelected ? "bg-zinc-800 text-white font-medium hover:bg-zinc-800" : "hover:bg-zinc-200/50",
                        isActive && !isSelected ? "ring-1 ring-zinc-300 bg-zinc-100" : "",
                      ].join(" ")}
                    >
                      <span>{txn}</span>
                      {isSelected && <span className="text-[9px] bg-zinc-700 text-zinc-300 px-1 rounded font-sans">Active</span>}
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Right-Hand Vertical Hotkey Action Sidebar */}
          <div className="w-36 border-l border-zinc-200 bg-zinc-50 flex flex-col p-1.5 shrink-0 select-none text-[10px] font-medium text-zinc-500 gap-1.5 justify-start">
            <div className="text-center font-sans font-bold text-[9px] uppercase tracking-wider text-zinc-400 pb-1 border-b border-zinc-200/60 mb-1">Actions</div>
            
            <button
              onClick={() => {
                const next = document.querySelector("#bank-details-form input:focus") as HTMLElement;
                if (next) {
                  const focusables = Array.from(document.querySelectorAll("#bank-details-form input, #bank-details-form select")) as HTMLElement[];
                  const idx = focusables.indexOf(next);
                  focusables[idx + 1]?.focus();
                }
              }}
              className="flex flex-col items-start w-full text-left p-1.5 border border-zinc-200/60 rounded bg-white hover:bg-zinc-100 transition-colors shadow-sm"
            >
              <span className="text-zinc-800 font-bold bg-zinc-200/80 px-1.5 py-0.5 rounded text-[9px] mb-1">Enter / ↓</span>
              <span>Next Field</span>
            </button>

            <button
              onClick={() => {
                const searchInput = document.getElementById("txn-search-input");
                if (searchInput) searchInput.focus();
              }}
              className="flex flex-col items-start w-full text-left p-1.5 border border-zinc-200/60 rounded bg-white hover:bg-zinc-100 transition-colors shadow-sm"
            >
              <span className="text-zinc-800 font-bold bg-zinc-200/80 px-1.5 py-0.5 rounded text-[9px] mb-1">Alt+S</span>
              <span>Select Txn</span>
            </button>

            <button
              onClick={onAccept}
              className="flex flex-col items-start w-full text-left p-1.5 border border-zinc-700 bg-zinc-900 hover:bg-zinc-800 text-white transition-colors shadow shadow-zinc-900/20"
            >
              <span className="text-zinc-100 font-bold bg-zinc-800 px-1.5 py-0.5 rounded text-[9px] mb-1">Alt+A</span>
              <span>Accept & Save</span>
            </button>

            <button
              onClick={onClose}
              className="flex flex-col items-start w-full text-left p-1.5 border border-zinc-200/60 rounded bg-white hover:bg-zinc-100 transition-colors shadow-sm mt-auto"
            >
              <span className="text-zinc-800 font-bold bg-zinc-200/80 px-1.5 py-0.5 rounded text-[9px] mb-1">Esc</span>
              <span>Quit Details</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
