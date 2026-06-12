import { FormRow } from "@/components/ui";
import type { FormData } from "../hooks/useTCSNatureOfGoodsForm";

const inputCls = "w-full bg-transparent text-sm outline-none py-0.5 px-1.5 border border-transparent hover:border-zinc-200 focus:border-zinc-800 transition-colors bg-white/50 rounded";
const selectCls = "bg-transparent text-sm outline-none px-1.5 py-0.5 border border-transparent hover:border-zinc-200 focus:border-zinc-800 transition-colors bg-white/50 rounded w-64";

interface TCSNatureOfGoodsFormFieldsProps {
  form: FormData;
  setField: (key: keyof FormData) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => void;
  isPredefined?: boolean;
}

export default function TCSNatureOfGoodsFormFields({
  form,
  setField,
  isPredefined = false,
}: TCSNatureOfGoodsFormFieldsProps) {
  const dis = (extra = "") => `${extra} ${isPredefined ? "text-zinc-500 cursor-not-allowed bg-zinc-50" : ""}`.trim();

  return (
    <div className="flex-1 overflow-y-auto p-3 bg-white border-r border-zinc-100 font-sans">
      <div className="space-y-3">
        <div>
          <div className="text-[10px] uppercase font-bold text-zinc-400 select-none mb-1">General Details</div>
          
          <FormRow label="Name" required labelWidth="w-64" className="flex items-center min-h-[26px]">
            <input
              autoFocus={!isPredefined}
              disabled={isPredefined}
              className={`${inputCls} ${dis()}`}
              placeholder="e.g. Sale of any goods u/s 206C(1H)"
              value={form.name}
              onChange={setField("name")}
            />
          </FormRow>

          <FormRow label="Section" labelWidth="w-64" className="flex items-center min-h-[26px]">
            <input
              disabled={isPredefined}
              className={`${inputCls} ${dis()}`}
              placeholder="e.g. 206C"
              value={form.section}
              onChange={setField("section")}
            />
          </FormRow>

          <FormRow label="Payment Code" labelWidth="w-64" className="flex items-center min-h-[26px]">
            <input
              disabled={isPredefined}
              className={`${inputCls} ${dis()}`}
              placeholder="e.g. 1H"
              value={form.payment_code}
              onChange={setField("payment_code")}
            />
          </FormRow>
        </div>

        <div className="border-t border-zinc-100 pt-3">
          <div className="text-[10px] uppercase font-bold text-zinc-400 select-none mb-1">Rates for Individual / HUF</div>

          <FormRow label="Rate With PAN" labelWidth="w-64" className="flex items-center min-h-[26px]">
            <div className="flex items-center gap-1">
              <input
                type="number"
                min="0"
                max="100"
                step="0.01"
                disabled={isPredefined}
                className={`${inputCls} ${dis()} w-24`}
                value={form.rate_individual_with_pan}
                onChange={setField("rate_individual_with_pan")}
              />
              <span className="text-xs text-zinc-400">%</span>
            </div>
          </FormRow>

          <FormRow label="Rate Without PAN" labelWidth="w-64" className="flex items-center min-h-[26px]">
            <div className="flex items-center gap-1">
              <input
                type="number"
                min="0"
                max="100"
                step="0.01"
                disabled={isPredefined}
                className={`${inputCls} ${dis()} w-24`}
                value={form.rate_individual_without_pan}
                onChange={setField("rate_individual_without_pan")}
              />
              <span className="text-xs text-zinc-400">%</span>
            </div>
          </FormRow>
        </div>

        <div className="border-t border-zinc-100 pt-3">
          <div className="text-[10px] uppercase font-bold text-zinc-400 select-none mb-1">Rates for Other Collective Types</div>

          <FormRow label="Rate With PAN" labelWidth="w-64" className="flex items-center min-h-[26px]">
            <div className="flex items-center gap-1">
              <input
                type="number"
                min="0"
                max="100"
                step="0.01"
                disabled={isPredefined}
                className={`${inputCls} ${dis()} w-24`}
                value={form.rate_other_with_pan}
                onChange={setField("rate_other_with_pan")}
              />
              <span className="text-xs text-zinc-400">%</span>
            </div>
          </FormRow>

          <FormRow label="Rate Without PAN" labelWidth="w-64" className="flex items-center min-h-[26px]">
            <div className="flex items-center gap-1">
              <input
                type="number"
                min="0"
                max="100"
                step="0.01"
                disabled={isPredefined}
                className={`${inputCls} ${dis()} w-24`}
                value={form.rate_other_without_pan}
                onChange={setField("rate_other_without_pan")}
              />
              <span className="text-xs text-zinc-400">%</span>
            </div>
          </FormRow>
        </div>

        <div className="border-t border-zinc-100 pt-3">
          <div className="text-[10px] uppercase font-bold text-zinc-400 select-none mb-1">Other Settings</div>

          <FormRow label="Is own PAN available?" labelWidth="w-64" className="flex items-center min-h-[26px]">
            <select
              disabled={isPredefined}
              className={`${selectCls} ${dis()}`}
              value={form.is_own_status}
              onChange={setField("is_own_status")}
            >
              <option value="No">No</option>
              <option value="Yes">Yes</option>
            </select>
          </FormRow>

          <FormRow label="Tax calculated on receipt/realization" labelWidth="w-64" className="flex items-center min-h-[26px]">
            <select
              disabled={isPredefined}
              className={`${selectCls} ${dis()}`}
              value={form.tax_on_receipt_or_realization}
              onChange={setField("tax_on_receipt_or_realization")}
            >
              <option value="Tax Calculated on Receipt">Tax Calculated on Receipt</option>
              <option value="Tax Calculated on Realization">Tax Calculated on Realization</option>
            </select>
          </FormRow>

          <FormRow label="Threshold/Reservation Limit" labelWidth="w-64" className="flex items-center min-h-[26px]">
            <input
              type="number"
              min="0"
              step="1"
              disabled={isPredefined}
              className={`${inputCls} ${dis()} w-32`}
              value={form.threshold_level}
              onChange={setField("threshold_level")}
            />
          </FormRow>
        </div>
      </div>
    </div>
  );
}
