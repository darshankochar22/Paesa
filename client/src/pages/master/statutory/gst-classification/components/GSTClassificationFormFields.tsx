import { FormRow } from "@/components/ui";
import { NATURES } from "../hooks/useGSTClassificationForm";
import type { FormData } from "../hooks/useGSTClassificationForm";

const inputCls = "w-full bg-transparent text-sm outline-none py-0.5 px-1.5 border border-transparent hover:border-zinc-200 focus:border-zinc-800 transition-colors bg-white/50 rounded ";
const selectCls = "bg-transparent text-sm outline-none px-1.5 py-0.5 border border-transparent hover:border-zinc-200 focus:border-zinc-800 transition-colors bg-white/50 rounded w-44 ";
const smallSelectCls = "bg-transparent text-sm outline-none px-1.5 py-0.5 border border-transparent hover:border-zinc-200 focus:border-zinc-800 transition-colors bg-white/50 rounded w-36 ";

interface GSTClassificationFormFieldsProps {
  form: FormData;
  setField: (key: keyof FormData) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => void;
  isPredefined?: boolean;
}

export default function GSTClassificationFormFields({
  form,
  setField,
  isPredefined = false,
}: GSTClassificationFormFieldsProps) {
  const dis = (extra = "") => `${extra} ${isPredefined ? "text-zinc-500 cursor-not-allowed bg-zinc-50" : ""}`.trim();

  return (
    <div className="flex-1 overflow-y-auto p-3 space-y-4 bg-white border-r border-zinc-100 font-sans">
      {/* HSN/SAC Details */}
      <div className="space-y-1.5">
        <div className="text-[10px] uppercase font-bold text-zinc-400 select-none">HSN / SAC Details</div>

        <FormRow label="Name" required labelWidth="w-64" className="flex items-center min-h-[26px]">
          <input
            autoFocus={!isPredefined}
            disabled={isPredefined}
            className={inputCls + dis()}
            placeholder="e.g. GST 18%"
            value={form.name}
            onChange={setField("name")}
          />
        </FormRow>

        <FormRow label="Description" labelWidth="w-64" className="flex items-start">
          <textarea
            rows={2}
            disabled={isPredefined}
            className={`flex-1 bg-transparent text-sm outline-none px-1.5 py-0.5 border border-zinc-200 focus:border-zinc-800 transition-colors bg-white rounded w-full text-xs ${dis()}`}
            placeholder="Optional notes..."
            value={form.description}
            onChange={setField("description")}
          />
        </FormRow>

        <FormRow label="HSN / SAC" labelWidth="w-64" className="flex items-center min-h-[26px]">
          <input
            disabled={isPredefined}
            className={inputCls + dis()}
            placeholder="e.g. 9984 or 8471"
            value={form.hsn_sac_code}
            onChange={setField("hsn_sac_code")}
          />
        </FormRow>

        <FormRow label="Is non-GST goods" labelWidth="w-64" className="flex items-center min-h-[26px]">
          <select disabled={isPredefined} className={selectCls + dis()} value={form.is_non_gst_goods} onChange={setField("is_non_gst_goods")}>
            <option>No</option>
            <option>Yes</option>
          </select>
        </FormRow>

        <FormRow label="Nature of Transaction" labelWidth="w-64" className="flex items-center min-h-[26px]">
          <select disabled={isPredefined} className={selectCls + dis()} value={form.nature_of_transaction} onChange={setField("nature_of_transaction")}>
            {NATURES.map((n) => <option key={n}>{n}</option>)}
          </select>
        </FormRow>
      </div>

      {/* Tax Details */}
      <div className="space-y-1.5 border-t border-zinc-100 pt-3">
        <div className="text-[10px] uppercase font-bold text-zinc-400 select-none">Tax Details</div>

        <FormRow label="Taxability" labelWidth="w-64" className="flex items-center min-h-[26px]">
          <select disabled={isPredefined} className={selectCls + dis()} value={form.taxability} onChange={setField("taxability")}>
            <option>Unknown</option>
            <option>Taxable</option>
            <option>Exempt</option>
            <option>Nil Rated</option>
          </select>
        </FormRow>

        <FormRow label="Is reverse charge applicable" labelWidth="w-64" className="flex items-center min-h-[26px]">
          <select disabled={isPredefined} className={selectCls + dis()} value={form.is_reverse_charge} onChange={setField("is_reverse_charge")}>
            <option>No</option>
            <option>Yes</option>
          </select>
        </FormRow>

        <FormRow label="Is ineligible for input credit" labelWidth="w-64" className="flex items-center min-h-[26px]">
          <select disabled={isPredefined} className={selectCls + dis()} value={form.is_ineligible_for_itc} onChange={setField("is_ineligible_for_itc")}>
            <option>No</option>
            <option>Yes</option>
          </select>
        </FormRow>

        {/* Tax Table */}
        <div className="mt-2">
          <div className="grid grid-cols-3 text-[10px] uppercase font-bold text-zinc-400 px-1.5 pb-1 border-b border-zinc-100">
            <span>Tax Type</span>
            <span>Valuation Type</span>
            <span>Rate</span>
          </div>

          {(
            [
              { label: "Integrated Tax", rateKey: "igst_rate", valKey: "igst_valuation_type" },
              { label: "Central Tax",    rateKey: "cgst_rate", valKey: "cgst_valuation_type" },
              { label: "State Tax",      rateKey: "sgst_rate", valKey: "sgst_valuation_type" },
              { label: "Cess",           rateKey: "cess_rate", valKey: "cess_valuation_type" },
            ] as const
          ).map(({ label, rateKey, valKey }) => (
            <div key={label} className="grid grid-cols-3 items-center min-h-[26px] border-b border-zinc-50 hover:bg-zinc-50/50">
              <span className="text-xs text-zinc-600 px-1.5">{label}</span>
              <select
                disabled={isPredefined}
                className={smallSelectCls + dis()}
                value={form[valKey]}
                onChange={setField(valKey)}
              >
                <option>Based on Value</option>
                <option>Based on Quantity</option>
              </select>
              <div className="flex items-center gap-1 px-1.5">
                <input
                  type="number"
                  min="0" max="100" step="0.01"
                  disabled={isPredefined}
                  className={`w-16 bg-transparent text-sm outline-none py-0.5 px-1.5 border border-transparent hover:border-zinc-200 focus:border-zinc-800 transition-colors bg-white/50 rounded ${dis()}`}
                  value={form[rateKey]}
                  onChange={setField(rateKey)}
                />
                <span className="text-xs text-zinc-400">%</span>
              </div>
            </div>
          ))}

          {!isPredefined && (
            <div className="text-[10px] text-zinc-400 italic px-1.5 pt-1 font-sans">
              Editing Integrated Tax rate auto-fills Central & State Tax as half each.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
