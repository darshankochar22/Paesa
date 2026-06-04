import { FormRow } from "@/components/ui";
import type { BankDetails } from "./BankDetailsPopup";

const selectCls = "bg-transparent text-sm outline-none px-1.5 py-0.5 border border-transparent hover:border-zinc-200 focus:border-zinc-800 transition-colors bg-white/50 rounded";

interface LedgerBankingPanelProps {
  provideBank: "No" | "Yes";
  handleProvideBankChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  bankForm: BankDetails;
  showBankPopup: boolean;
  setShowBankPopup: React.Dispatch<React.SetStateAction<boolean>>;
  groupLineage: {
    isBank: boolean;
  };
}

export default function LedgerBankingPanel({
  provideBank,
  handleProvideBankChange,
  bankForm,
  showBankPopup,
  setShowBankPopup,
  groupLineage,
}: LedgerBankingPanelProps) {
  if (groupLineage.isBank) return null;

  return (
    <div className="p-3 border-t border-zinc-100 bg-white">
      <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-2">Banking Details</div>
      <FormRow label="Provide bank details" labelWidth="w-40" className="flex items-center min-h-[26px]">
        <select className={selectCls} value={provideBank} onChange={handleProvideBankChange}>
          <option>No</option>
          <option>Yes</option>
        </select>
      </FormRow>

      {provideBank === "Yes" && !showBankPopup && (
        <div className="mt-2 pl-3 border-l-2 border-zinc-200 space-y-1 animate-in fade-in slide-in-from-top-1 duration-150">
          {bankForm.bank_name && (
            <FormRow label="Bank Name" labelWidth="w-36" className="flex items-center min-h-[22px] text-xs">
              <span className="text-sm text-zinc-700 font-medium">{bankForm.bank_name}</span>
            </FormRow>
          )}
          {bankForm.account_number && (
            <FormRow label="Account Number" labelWidth="w-36" className="flex items-center min-h-[22px] text-xs">
              <span className="text-sm text-zinc-700">{bankForm.account_number}</span>
            </FormRow>
          )}
          {bankForm.transaction_type && (
            <FormRow label="Transaction Type" labelWidth="w-36" className="flex items-center min-h-[22px] text-xs">
              <span className="text-sm text-zinc-700 font-medium">{bankForm.transaction_type}</span>
            </FormRow>
          )}
          <button
            onClick={() => setShowBankPopup(true)}
            className="text-xs text-zinc-500 hover:text-zinc-800 underline underline-offset-1 mt-1 block transition-colors font-medium"
          >
            Edit bank details
          </button>
        </div>
      )}
    </div>
  );
}
