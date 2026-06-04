import { FormRow } from "@/components/ui";
import type { LedgerType } from "@/types/api";

const inputCls = "flex-1 bg-transparent text-sm outline-none px-1.5 py-0.5 border border-transparent hover:border-zinc-200 focus:border-zinc-800 transition-colors bg-white/50 rounded";
const selectCls = "bg-transparent text-sm outline-none px-1.5 py-0.5 border border-transparent hover:border-zinc-200 focus:border-zinc-800 transition-colors bg-white/50 rounded";

interface LedgerBillwisePanelProps {
  form: Partial<LedgerType>;
  setForm: React.Dispatch<React.SetStateAction<Partial<LedgerType>>>;
  setNumber: (key: keyof LedgerType) => (e: React.ChangeEvent<HTMLInputElement>) => void;
  groupLineage: {
    isDebtorCreditor: boolean;
  };
}

export default function LedgerBillwisePanel({
  form,
  setForm,
  setNumber,
  groupLineage,
}: LedgerBillwisePanelProps) {
  if (!groupLineage.isDebtorCreditor) return null;

  return (
    <div className="p-3 border-t border-zinc-100 bg-white">
      <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-2">Bill-wise Details</div>
      <div className="space-y-1">
        <FormRow label="Maintain balances bill-by-bill" labelWidth="w-52" className="flex items-center min-h-[26px]">
          <select
            className={selectCls}
            value={form.is_bill_wise ? "Yes" : "No"}
            onChange={(e) => setForm((f) => ({ ...f, is_bill_wise: e.target.value === "Yes" ? 1 : 0 }))}
          >
            <option>No</option>
            <option>Yes</option>
          </select>
        </FormRow>
        <FormRow label="Default credit period (days)" labelWidth="w-52" className="flex items-center min-h-[26px]">
          <input
            type="number"
            className={`${inputCls} max-w-[80px] text-right`}
            value={form.default_credit_period ?? 0}
            onChange={setNumber("default_credit_period")}
          />
        </FormRow>
        <FormRow label="Use default credit period during voucher entry" labelWidth="w-52" className="flex items-center min-h-[26px]">
          <select
            className={selectCls}
            value={form.check_credit_days ? "Yes" : "No"}
            onChange={(e) => setForm((f) => ({ ...f, check_credit_days: e.target.value === "Yes" ? 1 : 0 }))}
          >
            <option>No</option>
            <option>Yes</option>
          </select>
        </FormRow>
      </div>
    </div>
  );
}
