import { FormRow } from "@/components/ui";
import type { FormData } from "../hooks/useTDSNatureOfPaymentForm";

const inputCls = "w-full bg-transparent text-sm outline-none py-0.5 px-1.5 border border-transparent hover:border-zinc-200 focus:border-zinc-800 transition-colors bg-white/50 rounded";
const selectCls = "bg-transparent text-sm outline-none px-1.5 py-0.5 border border-transparent hover:border-zinc-200 focus:border-zinc-800 transition-colors bg-white/50 rounded w-64";

interface TDSNatureOfPaymentFormFieldsProps {
  form: FormData;
  setField: (key: keyof FormData) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => void;
  isPredefined?: boolean;
}

export default function TDSNatureOfPaymentFormFields({
  form,
  setField,
  isPredefined = false,
}: TDSNatureOfPaymentFormFieldsProps) {
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
              placeholder="e.g. Rent on Land or Building u/s 194I"
              value={form.name}
              onChange={setField("name")}
            />
          </FormRow>

          <FormRow label="Section" labelWidth="w-64" className="flex items-center min-h-[26px]">
            <input
              disabled={isPredefined}
              className={`${inputCls} ${dis()}`}
              placeholder="e.g. 194I"
              value={form.section}
              onChange={setField("section")}
            />
          </FormRow>

          <FormRow label="Payment code" labelWidth="w-64" className="flex items-center min-h-[26px]">
            <input
              disabled={isPredefined}
              className={`${inputCls} ${dis()}`}
              placeholder="e.g. 94I"
              value={form.payment_code}
              onChange={setField("payment_code")}
            />
          </FormRow>

          <FormRow label="Remittance code" labelWidth="w-64" className="flex items-center min-h-[26px]">
            <input
              disabled={isPredefined}
              className={`${inputCls} ${dis()}`}
              placeholder="e.g. 215"
              value={form.remittance_code}
              onChange={setField("remittance_code")}
            />
          </FormRow>
        </div>

        <div className="border-t border-zinc-100 pt-3">
          <div className="text-[10px] uppercase font-bold text-zinc-400 select-none mb-1">Rate for individuals/HUF</div>

          <FormRow label="With PAN" labelWidth="w-64" className="flex items-center min-h-[26px]">
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
        </div>

        <div className="border-t border-zinc-100 pt-3">
          <div className="text-[10px] uppercase font-bold text-zinc-400 select-none mb-1">Rate for other deductee types</div>

          <FormRow label="With PAN" labelWidth="w-64" className="flex items-center min-h-[26px]">
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
        </div>

        <div className="border-t border-zinc-100 pt-3">
          <div className="text-[10px] uppercase font-bold text-zinc-400 select-none mb-1">Other Settings</div>

          <FormRow label="Is zero rated" labelWidth="w-64" className="flex items-center min-h-[26px]">
            <select
              disabled={isPredefined}
              className={`${selectCls} ${dis()}`}
              value={form.is_zero_rated}
              onChange={setField("is_zero_rated")}
            >
              <option value="No">No</option>
              <option value="Yes">Yes</option>
            </select>
          </FormRow>

          <FormRow label="Threshold/exemption limit" labelWidth="w-64" className="flex items-center min-h-[26px]">
            <input
              type="number"
              min="0"
              step="1"
              disabled={isPredefined}
              className={`${inputCls} ${dis()} w-32`}
              value={form.threshold_limit}
              onChange={setField("threshold_limit")}
            />
          </FormRow>
        </div>
      </div>
    </div>
  );
}
