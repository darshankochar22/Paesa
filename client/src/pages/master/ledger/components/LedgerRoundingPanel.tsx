import { FormRow } from "@/components/ui";
import type { LedgerType } from "@/types/api";

const inputCls = "flex-1 bg-transparent text-sm outline-none px-1.5 py-0.5 border border-transparent hover:border-zinc-200 focus:border-zinc-800 transition-colors bg-white/50 rounded";
const selectCls = "bg-transparent text-sm outline-none px-1.5 py-0.5 border border-transparent hover:border-zinc-200 focus:border-zinc-800 transition-colors bg-white/50 rounded";

interface LedgerRoundingPanelProps {
  form: Partial<LedgerType>;
  setForm: React.Dispatch<React.SetStateAction<Partial<LedgerType>>>;
  setField: (key: keyof LedgerType) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
  setNumber: (key: keyof LedgerType) => (e: React.ChangeEvent<HTMLInputElement>) => void;
  groupLineage: {
    isInventory: boolean;
  };
}

type LedgerTypeOption = "Not Applicable" | "Invoice Rounding" | "Discount";

function getLedgerTypeOption(form: Partial<LedgerType>): LedgerTypeOption {
  if (form.invoice_rounding) return "Invoice Rounding";
  if (form.is_discount) return "Discount";
  return "Not Applicable";
}

export default function LedgerRoundingPanel({
  form,
  setForm,
  setField,
  setNumber,
  groupLineage,
}: LedgerRoundingPanelProps) {
  if (!groupLineage.isInventory) return null;

  const ledgerTypeOption = getLedgerTypeOption(form);

  return (
    <div className="p-3 border-t border-zinc-100 bg-white space-y-1.5">
      <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-2">Ledger Type</div>
      <FormRow label="Type of ledger" labelWidth="w-52" className="flex items-center min-h-[26px]">
        <select
          className={selectCls}
          value={ledgerTypeOption}
          onChange={(e) => {
            const val = e.target.value as LedgerTypeOption;
            setForm((f) => ({
              ...f,
              invoice_rounding: val === "Invoice Rounding" ? 1 : 0,
              is_discount: val === "Discount" ? 1 : 0,
              rounding_method: val === "Invoice Rounding" ? "Normal Rounding" : "",
              rounding_limit: val === "Invoice Rounding" ? 1 : 0,
            }));
          }}
        >
          <option value="Not Applicable">Not Applicable</option>
          <option value="Invoice Rounding">Invoice Rounding</option>
          <option value="Discount">Discount</option>
        </select>
      </FormRow>
      {ledgerTypeOption === "Invoice Rounding" && (
        <>
          <FormRow label="Rounding method" labelWidth="w-52" className="flex items-center min-h-[26px]">
            <select
              className={selectCls}
              value={form.rounding_method || "Normal Rounding"}
              onChange={setField("rounding_method")}
            >
              <option value="Normal Rounding">Normal Rounding</option>
              <option value="Downward Rounding">Downward Rounding</option>
              <option value="Upward Rounding">Upward Rounding</option>
            </select>
          </FormRow>
          <FormRow label="Rounding limit" labelWidth="w-52" className="flex items-center min-h-[26px]">
            <input
              type="number"
              step="0.01"
              className={`${inputCls} text-right max-w-[100px]`}
              value={form.rounding_limit ?? 1}
              onChange={setNumber("rounding_limit")}
            />
          </FormRow>
        </>
      )}
    </div>
  );
}