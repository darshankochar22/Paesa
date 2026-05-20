import { useState } from "react";
import FormRow from "@/components/ui/FormRow";

const TXN_TYPES_DEFAULT = ["End of List", "Cheque", "e-Fund Transfer", "Others"];
const TXN_TYPES_EXTRA = ["ATM-Card", "ECS", "Electronic Cheque", "Electronic DD/PO"];

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
}

export default function BankDetailsPopup({
  ledgerName,
  bankForm,
  setBankForm,
  onClose,
  onAccept,
}: BankDetailsPopupProps) {
  const [showMore, setShowMore] = useState(false);
  const [selectedTxn, setSelectedTxn] = useState<string>(bankForm.transaction_type || "");

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
    if (txn === "End of List") return;
    setSelectedTxn(txn);
    setBankForm((f) => ({ ...f, transaction_type: txn }));
  };

  const txnList = showMore ? [...TXN_TYPES_DEFAULT, ...TXN_TYPES_EXTRA] : TXN_TYPES_DEFAULT;

  const inputCls =
    "flex-1 bg-transparent text-sm outline-none px-1 py-0.5 border border-transparent focus:border-zinc-300";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
      <div className="bg-white border border-zinc-300 shadow-sm w-[680px] flex flex-col" style={{ minHeight: 380 }}>

        {/* Header */}
        <div className="bg-zinc-800 text-white text-sm px-3 py-1 font-medium select-none flex justify-between items-center">
          <span>
            Bank Details For:{" "}
            <span className="font-semibold">{ledgerName || "—"}</span>
          </span>
          <button onClick={onClose} className="text-zinc-400 hover:text-white text-base leading-none">&times;</button>
        </div>

        {/* Body */}
        <div className="flex flex-1 min-h-0">
          <div className="flex-1 p-3 space-y-0.5 overflow-y-auto">

            <FormRow label="Account Holder Name" labelWidth="w-44" className="flex items-center min-h-[22px]">
              <input className={inputCls} value={bankForm.account_holder_name || ""} onChange={setBankField("account_holder_name")} />
            </FormRow>
            <FormRow label="Account Number" labelWidth="w-44" className="flex items-center min-h-[22px]">
              <input className={inputCls} value={bankForm.account_number || ""} onChange={setBankField("account_number")} />
            </FormRow>
            <FormRow label="IFSC Code" labelWidth="w-44" className="flex items-center min-h-[22px]">
              <input className={inputCls} value={bankForm.ifsc_code || ""} onChange={setBankField("ifsc_code")} />
            </FormRow>
            <FormRow label="SWIFT Code" labelWidth="w-44" className="flex items-center min-h-[22px]">
              <input className={inputCls} value={bankForm.swift_code || ""} onChange={setBankField("swift_code")} />
            </FormRow>
            <FormRow label="Bank Name" labelWidth="w-44" className="flex items-center min-h-[22px]">
              <input className={inputCls} value={bankForm.bank_name || ""} onChange={setBankField("bank_name")} />
            </FormRow>
            <FormRow label="Branch Name" labelWidth="w-44" className="flex items-center min-h-[22px]">
              <input className={inputCls} value={bankForm.branch_name || ""} onChange={setBankField("branch_name")} />
            </FormRow>
            <FormRow label="OD Limit" labelWidth="w-44" className="flex items-center min-h-[22px]">
              <input
                className="w-28 bg-transparent text-sm outline-none px-1 py-0.5 border border-transparent focus:border-zinc-300 text-right"
                type="number"
                step="0.01"
                value={bankForm.od_limit ?? 0}
                onChange={setBankNumber("od_limit")}
              />
            </FormRow>

            <div className="pt-1" />

            <div className="flex items-center min-h-[22px]">
              <span className="w-44 text-sm text-zinc-400 shrink-0">Transaction Type</span>
              <span className="text-zinc-600 mr-2 shrink-0">:</span>
              <span className="text-sm px-1 py-0.5 text-zinc-700">
                {selectedTxn || <span className="text-zinc-400 italic text-xs">select from list →</span>}
              </span>
            </div>

            <div className="pt-1" />

            <div className="flex items-center min-h-[22px]">
              <label className="flex items-center gap-1.5 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={!!bankForm.enable_cheque_printing}
                  onChange={setBankToggle("enable_cheque_printing")}
                  className="rounded"
                />
                Enable Cheque Printing
              </label>
            </div>

            {!!bankForm.enable_cheque_printing && (
              <>
                <FormRow label="Cheque Book Start No" labelWidth="w-44" className="flex items-center min-h-[22px]">
                  <input className={inputCls} value={bankForm.cheque_book_start_no || ""} onChange={setBankField("cheque_book_start_no")} />
                </FormRow>
                <FormRow label="Cheque Book End No" labelWidth="w-44" className="flex items-center min-h-[22px]">
                  <input className={inputCls} value={bankForm.cheque_book_end_no || ""} onChange={setBankField("cheque_book_end_no")} />
                </FormRow>
                <FormRow label="Cheque Print Config" labelWidth="w-44" className="flex items-center min-h-[22px]">
                  <input className={inputCls} value={bankForm.cheque_printing_configuration || ""} onChange={setBankField("cheque_printing_configuration")} />
                </FormRow>
              </>
            )}
          </div>

          {/* Transaction Type Picker */}
          <div className="w-52 border-l border-zinc-200 flex flex-col shrink-0">
            <div className="flex items-center justify-between px-2 py-1 border-b border-zinc-200 bg-zinc-50 select-none">
              <span className="text-xs font-medium text-zinc-700">Transaction Type</span>
              <button
                onClick={() => setShowMore((v) => !v)}
                className="text-xs text-zinc-500 hover:text-zinc-800 underline underline-offset-1"
              >
                {showMore ? "Show Less" : "Show More"}
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              {txnList.map((txn) => (
                <div
                  key={txn}
                  onClick={() => handleTxnSelect(txn)}
                  className={[
                    "text-sm px-2 py-0.5 border-b border-zinc-100 select-none",
                    txn === "End of List"
                      ? "text-zinc-400 italic cursor-default"
                      : "cursor-pointer hover:bg-zinc-100",
                    selectedTxn === txn ? "bg-zinc-800 text-white hover:bg-zinc-800" : "",
                  ].join(" ")}
                >
                  {txn}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-zinc-200 px-3 py-1.5 flex justify-end gap-2 bg-zinc-50">
          <button
            onClick={onClose}
            className="text-sm px-4 py-0.5 border border-zinc-300 hover:bg-zinc-100 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onAccept}
            className="text-sm px-5 py-0.5 bg-black text-white hover:bg-zinc-800 transition-colors font-medium"
          >
            Accept
          </button>
        </div>
      </div>
    </div>
  );
}
