import { FormRow } from "@/components/ui";
import type { FormData } from "../hooks/useGSTClassificationForm";

const inputCls = "w-full bg-transparent text-sm outline-none py-0.5 px-1.5 border border-transparent hover:border-zinc-200 focus:border-zinc-800 transition-colors bg-white/50 rounded";
const selectCls = "bg-transparent text-sm outline-none px-1.5 py-0.5 border border-transparent hover:border-zinc-200 focus:border-zinc-800 transition-colors bg-white/50 rounded w-44";

interface GSTClassificationFormFieldsProps {
  form: FormData;
  setField: (key: keyof FormData) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => void;
  addSlabRow: () => void;
  updateSlabRow: (index: number, field: keyof FormData["slabRows"][number], value: string) => void;
  removeSlabRow: (index: number) => void;
  isPredefined?: boolean;
}

export default function GSTClassificationFormFields({
  form,
  setField,
  addSlabRow,
  updateSlabRow,
  removeSlabRow,
  isPredefined = false,
}: GSTClassificationFormFieldsProps) {
  const dis = (extra = "") => `${extra} ${isPredefined ? "text-zinc-500 cursor-not-allowed bg-zinc-50" : ""}`.trim();
  const hsnDisabled = isPredefined || form.hsn_sac_details === "Not Defined";
  const gstDisabled = isPredefined || form.gst_rate_details === "Not Defined";

  return (
    <div className="flex-1 overflow-y-auto p-3 bg-white border-r border-zinc-100 font-sans">
      <div className="space-y-1.5">
        <div className="text-[10px] uppercase font-bold text-zinc-400 select-none">HSN / SAC & Related Details</div>

        <FormRow label="Name" required labelWidth="w-64" className="flex items-center min-h-[26px]">
          <input
            autoFocus={!isPredefined}
            disabled={isPredefined}
            className={`${inputCls} ${dis()}`}
            placeholder="e.g. GST 18%"
            value={form.name}
            onChange={setField("name")}
          />
        </FormRow>

        <FormRow label="HSN / SAC Details" labelWidth="w-64" className="flex items-center min-h-[26px]">
          <select
            disabled={isPredefined}
            className={`${selectCls} ${dis()}`}
            value={form.hsn_sac_details}
            onChange={setField("hsn_sac_details")}
          >
            <option>Not Defined</option>
            <option>Specify Details Here</option>
          </select>
        </FormRow>

        <FormRow label="HSN / SAC" labelWidth="w-64" className="flex items-center min-h-[26px]">
          <input
            disabled={hsnDisabled}
            inputMode="numeric"
            pattern="[0-9]*"
            className={`${inputCls} ${dis()}`}
            placeholder="Enter HSN or SAC code"
            value={form.hsn_sac_code}
            onChange={setField("hsn_sac_code")}
            maxLength={8}
          />
        </FormRow>

        <FormRow label="Description" labelWidth="w-64" className="flex items-center min-h-[26px]">
          <input
            disabled={hsnDisabled}
            className={`${inputCls} ${dis()}`}
            placeholder="Optional description"
            value={form.description}
            onChange={setField("description")}
          />
        </FormRow>
      </div>

      <div className="space-y-1.5 border-t border-zinc-100 pt-3">
        <div className="text-[10px] uppercase font-bold text-zinc-400 select-none">GST Rate & Related Details</div>

        <FormRow label="GST Rate Details" labelWidth="w-64" className="flex items-center min-h-[26px]">
          <select
            disabled={isPredefined}
            className={`${selectCls} ${dis()}`}
            value={form.gst_rate_details}
            onChange={setField("gst_rate_details")}
          >
            <option>Not Defined</option>
            <option>Specify Details Here</option>
            <option>Specify Slab-Based Rates</option>
          </select>
        </FormRow>

        {form.gst_rate_details === "Specify Slab-Based Rates" ? (
          <div className="space-y-2">
            <div className="text-[11px] uppercase font-bold text-zinc-400 select-none">Slab-Based Tax Rate Details</div>
            <div className="grid grid-cols-[1.1fr_1.1fr_1fr_1fr_80px] gap-2 text-[10px] uppercase text-zinc-500 tracking-wider mb-2">
              <div>Greater Than</div>
              <div>Up To</div>
              <div>Taxability Type</div>
              <div>GST Rate</div>
              <div className="text-right">Action</div>
            </div>
            {form.slabRows.map((row, index) => (
              <div key={index} className="grid grid-cols-[1.1fr_1.1fr_1fr_1fr_80px] gap-2 items-center">
                <input
                  disabled={isPredefined}
                  type="number"
                  min="0"
                  step="0.01"
                  className={`${inputCls} ${dis()}`}
                  value={row.greater_than}
                  onChange={(e) => updateSlabRow(index, "greater_than", e.target.value)}
                />
                <input
                  disabled={isPredefined}
                  type="number"
                  min="0"
                  step="0.01"
                  className={`${inputCls} ${dis()}`}
                  value={row.up_to}
                  onChange={(e) => updateSlabRow(index, "up_to", e.target.value)}
                />
                <select
                  disabled={isPredefined}
                  className={`${selectCls} ${dis()}`}
                  value={row.taxability}
                  onChange={(e) => updateSlabRow(index, "taxability", e.target.value)}
                >
                  <option>Taxable</option>
                  <option>Exempt</option>
                  <option>Nil Rated</option>
                </select>
                <div className="flex items-center gap-1">
                  <input
                    disabled={isPredefined || row.taxability === "Exempt" || row.taxability === "Nil Rated"}
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    className={`${inputCls} ${dis()} w-20`}
                    value={row.gst_rate}
                    onChange={(e) => updateSlabRow(index, "gst_rate", e.target.value)}
                  />
                  <span className="text-xs text-zinc-400">%</span>
                </div>
                <button
                  type="button"
                  disabled={isPredefined || form.slabRows.length === 1}
                  onClick={() => removeSlabRow(index)}
                  className="text-[10px] px-2 py-1 rounded bg-zinc-100 text-zinc-700 hover:bg-zinc-200 transition-colors disabled:opacity-50"
                >
                  Remove
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={addSlabRow}
              disabled={isPredefined}
              className="text-xs px-3 py-1 rounded bg-zinc-100 text-zinc-700 hover:bg-zinc-200 transition-colors disabled:opacity-50"
            >
              Add Slab Line
            </button>
          </div>
        ) : (
          <>
            <FormRow label="Taxability Type" labelWidth="w-64" className="flex items-center min-h-[26px]">
              <select
                disabled={gstDisabled}
                className={`${selectCls} ${dis()}`}
                value={form.taxability}
                onChange={setField("taxability")}
              >
                <option>Unknown</option>
                <option>Taxable</option>
                <option>Exempt</option>
                <option>Nil Rated</option>
              </select>
            </FormRow>

            <FormRow label="GST Rate" labelWidth="w-64" className="flex items-center min-h-[26px]">
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  disabled={gstDisabled || form.taxability === "Exempt" || form.taxability === "Nil Rated"}
                  className={`${inputCls} ${dis()} w-20`}
                  value={form.igst_rate}
                  onChange={setField("igst_rate")}
                />
                <span className="text-xs text-zinc-400">%</span>
              </div>
            </FormRow>
          </>
        )}

        {!gstDisabled && !isPredefined && (
          <div className="text-[10px] text-zinc-400 italic px-1.5 pt-1 font-sans">
            {form.gst_rate_details === "Specify Slab-Based Rates"
              ? "Slab-based GST rates are enabled for this classification."
              : "Editing GST Rate will auto-fill Central and State tax as half each."}
          </div>
        )}
      </div>
    </div>
  );
}
