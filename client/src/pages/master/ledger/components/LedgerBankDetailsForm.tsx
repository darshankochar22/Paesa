import { FormRow } from "@/components/ui";
import type { BankDetails } from "./BankDetailsPopup";

const inputCls = "flex-1 bg-transparent text-sm outline-none px-1.5 py-0.5 border border-transparent hover:border-zinc-200 focus:border-zinc-800 transition-colors bg-white/50 rounded";
const selectCls = "bg-transparent text-sm outline-none px-1.5 py-0.5 border border-transparent hover:border-zinc-200 focus:border-zinc-800 transition-colors bg-white/50 rounded";

interface LedgerBankDetailsFormProps {
  bankForm: BankDetails;
  setBankForm: React.Dispatch<React.SetStateAction<BankDetails>>;
  setBankField: (key: keyof BankDetails) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
  setBankNumber: (key: keyof BankDetails) => (e: React.ChangeEvent<HTMLInputElement>) => void;
  groupLineage: {
    isBank: boolean;
    isOD: boolean;
  };
}

export default function LedgerBankDetailsForm({
  bankForm,
  setBankForm,
  setBankField,
  setBankNumber,
  groupLineage,
}: LedgerBankDetailsFormProps) {
  if (!groupLineage.isBank) return null;

  return (
    <div className="p-3 border-t border-zinc-100 bg-white space-y-1.5">
      <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-2">Bank Account Details</div>
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
      {groupLineage.isOD && (
        <FormRow label="OD Limit" labelWidth="w-44" className="flex items-center min-h-[26px]">
          <input
            type="number"
            step="0.01"
            className={`${inputCls} text-right font-medium max-w-[120px]`}
            value={bankForm.od_limit ?? 0}
            onChange={setBankNumber("od_limit")}
          />
        </FormRow>
      )}
      <div className="pt-2 border-t border-zinc-100 my-2" />
      <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-2">Bank Configuration</div>
      <FormRow label="Set/Alter range for Cheque Books" labelWidth="w-44" className="flex items-center min-h-[26px]">
        <select
          className={selectCls}
          value={bankForm.bank_configuration === "Yes" ? "Yes" : "No"}
          onChange={(e) => setBankForm((f) => ({ ...f, bank_configuration: e.target.value === "Yes" ? "Yes" : "No" }))}
        >
          <option>No</option>
          <option>Yes</option>
        </select>
      </FormRow>
      {bankForm.bank_configuration === "Yes" && (
        <div className="pl-3 border-l-2 border-zinc-200 space-y-1.5 py-1">
          <FormRow label="Cheque Book Start No" labelWidth="w-40" className="flex items-center min-h-[26px]">
            <input className={inputCls} value={bankForm.cheque_book_start_no || ""} onChange={setBankField("cheque_book_start_no")} />
          </FormRow>
          <FormRow label="Cheque Book End No" labelWidth="w-40" className="flex items-center min-h-[26px]">
            <input className={inputCls} value={bankForm.cheque_book_end_no || ""} onChange={setBankField("cheque_book_end_no")} />
          </FormRow>
        </div>
      )}
      <FormRow label="Enable Cheque Printing" labelWidth="w-44" className="flex items-center min-h-[26px]">
        <select
          className={selectCls}
          value={bankForm.enable_cheque_printing ? "Yes" : "No"}
          onChange={(e) => setBankForm((f) => ({ ...f, enable_cheque_printing: e.target.value === "Yes" ? 1 : 0 }))}
        >
          <option>No</option>
          <option>Yes</option>
        </select>
      </FormRow>
      {!!bankForm.enable_cheque_printing && (
        <div className="pl-3 border-l-2 border-zinc-200 space-y-1.5 py-1">
          <FormRow label="Cheque Print Config" labelWidth="w-40" className="flex items-center min-h-[26px]">
            <input className={inputCls} value={bankForm.cheque_printing_configuration || ""} onChange={setBankField("cheque_printing_configuration")} />
          </FormRow>
        </div>
      )}
    </div>
  );
}
