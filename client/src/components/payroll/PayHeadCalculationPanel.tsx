import { FormRow } from "@/components/ui";
import type { PayHeadSlabLineType, PayHeadFormulaLineType } from "@/types/entities/Payroll";
import ComputationSlabTable from "./ComputationSlabTable";
import FormulaBuilder from "./FormulaBuilder";

const inputCls = "flex-1 bg-transparent text-sm outline-none px-1.5 py-0.5 border border-transparent hover:border-zinc-200 focus:border-zinc-800 transition-colors bg-white/50 rounded";
const selectCls = "bg-transparent text-sm outline-none px-1.5 py-0.5 border border-transparent hover:border-zinc-200 focus:border-zinc-800 transition-colors bg-white/50 rounded";

export interface CalculationConfig {
  calculation_type: string;
  calculation_period: string;
  percentage_or_amount: number;
  rounding_method: string;
  rounding_limit: number;
  compute_method: string;
}

interface Props {
  config: CalculationConfig;
  slabs: PayHeadSlabLineType[];
  formulaLines: PayHeadFormulaLineType[];
  companyId: number | undefined;
  onConfigChange: (key: keyof CalculationConfig) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
  onConfigNumberChange: (key: keyof CalculationConfig) => (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSlabAdd: () => void;
  onSlabDelete: (index: number) => void;
  onSlabChange: (index: number, field: keyof PayHeadSlabLineType, value: string | number) => void;
  onFormulaAdd: (line: { function: string; pay_head_id_ref: number; operator: string }) => void;
  onFormulaDelete: (index: number) => void;
}

export default function PayHeadCalculationPanel({
  config, slabs, formulaLines, companyId,
  onConfigChange, onConfigNumberChange,
  onSlabAdd, onSlabDelete, onSlabChange,
  onFormulaAdd, onFormulaDelete,
}: Props) {
  return (
    <div className="p-3 border-t border-zinc-100 bg-white space-y-1.5">
      <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-2">Calculation / Rounding</div>

      <FormRow label="Calculation Period" labelWidth="w-44" className="flex items-center min-h-[26px]">
        <select className={selectCls} value={config.calculation_period} onChange={onConfigChange("calculation_period")}>
          <option value="Months">Months</option>
          <option value="Days">Days</option>
          <option value="Weeks">Weeks</option>
        </select>
      </FormRow>

      {(config.calculation_type === "As User Defined Value" || config.calculation_type === "Flat Rate") && (
        <FormRow label="Value" labelWidth="w-44" className="flex items-center min-h-[26px]">
          <input
            type="number"
            step="0.01"
            className={`${inputCls} text-right max-w-[120px]`}
            value={config.percentage_or_amount}
            onChange={onConfigNumberChange("percentage_or_amount")}
          />
        </FormRow>
      )}

      {config.calculation_type === "As Computed Value" && (
        <div className="space-y-2">
          <FormRow label="Compute" labelWidth="w-44" className="flex items-center min-h-[26px]">
            <select className={selectCls} value={config.compute_method} onChange={onConfigChange("compute_method")}>
              <option value="On Current Earnings Total">On Current Earnings Total</option>
              <option value="On Current Deductions Total">On Current Deductions Total</option>
              <option value="On Current SubTotal">On Current SubTotal</option>
              <option value="On Specified Formula">On Specified Formula</option>
            </select>
          </FormRow>

          {config.compute_method === "On Specified Formula" ? (
            <div className="pl-3 border-l-2 border-zinc-200">
              <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-2">Specified Formula</div>
              <FormulaBuilder
                formulaLines={formulaLines}
                onAdd={onFormulaAdd}
                onDelete={onFormulaDelete}
                companyId={companyId}
              />
            </div>
          ) : (
            <div className="pl-3 border-l-2 border-zinc-200 space-y-1">
              <div className="grid grid-cols-2 gap-2">
                <FormRow label="Amount Greater Than" labelWidth="w-44" className="flex items-center min-h-[26px]">
                  <input type="number" step="0.01" className={`${inputCls} text-right max-w-[100px]`} />
                </FormRow>
                <FormRow label="Amount Up To" labelWidth="w-32" className="flex items-center min-h-[26px]">
                  <input type="number" step="0.01" className={`${inputCls} text-right max-w-[100px]`} />
                </FormRow>
              </div>
              <ComputationSlabTable
                slabs={slabs}
                onAdd={onSlabAdd}
                onDelete={onSlabDelete}
                onChange={onSlabChange}
              />
            </div>
          )}
        </div>
      )}

      <div className="pt-2 border-t border-zinc-100" />
      <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-2">Rounding Off Information</div>
      <FormRow label="Rounding Method" labelWidth="w-44" className="flex items-center min-h-[26px]">
        <select className={selectCls} value={config.rounding_method} onChange={onConfigChange("rounding_method")}>
          <option value="Not Applicable">Not Applicable</option>
          <option value="Normal Rounding">Normal Rounding</option>
          <option value="Downward Rounding">Downward Rounding</option>
          <option value="Upward Rounding">Upward Rounding</option>
        </select>
      </FormRow>
      {config.rounding_method !== "Not Applicable" && (
        <FormRow label="Limit" labelWidth="w-44" className="flex items-center min-h-[26px]">
          <input
            type="number"
            step="0.01"
            className={`${inputCls} text-right max-w-[100px]`}
            value={config.rounding_limit}
            onChange={onConfigNumberChange("rounding_limit")}
          />
        </FormRow>
      )}
    </div>
  );
}
