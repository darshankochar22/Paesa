import { FormRow } from "@/components/ui";
import { INDIAN_STATES } from "@/constants/states";
import {
  type VATRegistrationDetails,
  type VatCommodity,
  VAT_TAX_TYPES,
  DEFAULT_VAT_COMMODITY,
} from "@/types/entities/VATRegistrationDetails";

// ─── Shared field tokens (black / white / zinc only) ───────────────────────────
const inputCls =
  "w-72 bg-transparent text-sm outline-none px-1.5 py-0.5 border border-transparent hover:border-zinc-200 focus:border-zinc-800 transition-colors bg-white/50 rounded";
const selectCls = inputCls;
const smallCls =
  "w-44 bg-transparent text-sm outline-none px-1.5 py-0.5 border border-transparent hover:border-zinc-200 focus:border-zinc-800 transition-colors bg-white/50 rounded";

const LABEL_W = "w-80";

export function VATRegistrationDetailsForm({
  form,
  setField,
  firstFieldAutoFocus = false,
}: {
  form: VATRegistrationDetails;
  setField: <K extends keyof VATRegistrationDetails>(key: K, value: VATRegistrationDetails[K]) => void;
  firstFieldAutoFocus?: boolean;
}) {
  const Text = ({
    label,
    field,
    autoFocus = false,
  }: {
    label: string;
    field: keyof VATRegistrationDetails;
    autoFocus?: boolean;
  }) => (
    <FormRow label={label} labelWidth={LABEL_W} className="flex items-center min-h-[26px]">
      <input
        autoFocus={autoFocus}
        className={inputCls}
        value={String(form[field] ?? "")}
        onChange={(e) => setField(field, e.target.value as VATRegistrationDetails[typeof field])}
      />
    </FormRow>
  );

  const YesNo = ({ label, field }: { label: string; field: keyof VATRegistrationDetails }) => (
    <FormRow label={label} labelWidth={LABEL_W} className="flex items-center min-h-[26px]">
      <select
        className={selectCls}
        value={Number(form[field]) ? "Yes" : "No"}
        onChange={(e) => setField(field, (e.target.value === "Yes" ? 1 : 0) as VATRegistrationDetails[typeof field])}
      >
        <option>No</option>
        <option>Yes</option>
      </select>
    </FormRow>
  );

  // ── commodity list helpers (keep one blank row to type into) ──
  const rows: VatCommodity[] = [...form.commodities, { ...DEFAULT_VAT_COMMODITY }];
  const commit = (next: VatCommodity[]) =>
    setField("commodities", next.filter((r) => String(r.name || "").trim() !== ""));
  const updateRow = (idx: number, patch: Partial<VatCommodity>) =>
    commit(rows.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
  const removeRow = (idx: number) => commit(rows.filter((_, i) => i !== idx));

  const cellInput =
    "w-full bg-transparent text-sm outline-none px-1 py-0.5 border border-transparent hover:border-zinc-200 focus:border-zinc-800 rounded";

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-white overflow-y-auto">
      <div className="p-6 max-w-[920px]">
        <div className="text-center text-sm font-bold text-zinc-800 mb-4">VAT Details</div>

        <FormRow label="State" labelWidth={LABEL_W} className="flex items-center min-h-[26px]">
          <select
            autoFocus={firstFieldAutoFocus}
            className={selectCls}
            value={form.state}
            onChange={(e) => setField("state", e.target.value)}
          >
            <option value="">Not Applicable</option>
            {INDIAN_STATES.map((s) => <option key={s}>{s}</option>)}
          </select>
        </FormRow>

        <Text label="TIN" field="tin" />
        <Text label="Interstate sales tax number" field="interstateSalesTaxNumber" />

        <YesNo label="Set/alter tax/rate details" field="setAlterTaxRateDetails" />
        {Number(form.setAlterTaxRateDetails) === 1 && (
          <>
            <div className="text-[12px] font-bold text-zinc-700 mt-1 mb-0.5 pl-4">VAT Rate</div>
            <FormRow label="Tax rate" labelWidth="w-80 pl-4" className="flex items-center min-h-[26px]">
              <input
                type="number"
                min={0}
                step="0.01"
                className={smallCls}
                value={Number(form.taxRate) || ""}
                onChange={(e) => setField("taxRate", Number(e.target.value) || 0)}
              />
              <span className="ml-1 text-sm text-zinc-500">%</span>
            </FormRow>
            <FormRow label="Tax type" labelWidth="w-80 pl-4" className="flex items-center min-h-[26px]">
              <select
                className={selectCls}
                value={form.taxType}
                onChange={(e) => setField("taxType", e.target.value as VATRegistrationDetails["taxType"])}
              >
                {VAT_TAX_TYPES.map((t) => <option key={t}>{t}</option>)}
              </select>
            </FormRow>
          </>
        )}

        <YesNo label="Define VAT commodity and tax details as masters" field="defineVatCommodityAsMasters" />

        <FormRow label="Deactivate from" labelWidth={LABEL_W} className="flex items-center min-h-[26px]">
          <input
            type="date"
            className={smallCls}
            value={form.deactivateFrom}
            onChange={(e) => setField("deactivateFrom", e.target.value)}
          />
        </FormRow>

        {/* ── VAT Commodity Details — commodity/rate masters ── */}
        {Number(form.defineVatCommodityAsMasters) === 1 && (
          <div className="mt-6">
            <div className="text-[12px] font-bold text-zinc-700 uppercase tracking-wide mb-2">
              VAT Commodity Details
            </div>
            <table className="border-collapse text-sm">
              <thead>
                <tr className="border-b border-zinc-800 text-zinc-700">
                  <th className="text-left font-semibold px-2 py-1 w-64">Commodity name</th>
                  <th className="text-right font-semibold px-2 py-1 w-28">Rate %</th>
                  <th className="text-left font-semibold px-2 py-1 w-40">Tax type</th>
                  <th className="w-8" />
                </tr>
              </thead>
              <tbody>
                {rows.map((row, idx) => {
                  const isBlankLast = idx === rows.length - 1;
                  return (
                    <tr key={idx} className="border-b border-zinc-100">
                      <td className="px-2 py-0.5">
                        <input
                          className={cellInput}
                          placeholder={isBlankLast ? "Add commodity…" : ""}
                          value={row.name}
                          onChange={(e) => updateRow(idx, { name: e.target.value })}
                        />
                      </td>
                      <td className="px-2 py-0.5 text-right">
                        <input
                          type="number"
                          min={0}
                          step="0.01"
                          className={`${cellInput} text-right`}
                          value={Number(row.rate) || ""}
                          onChange={(e) => updateRow(idx, { rate: Number(e.target.value) || 0 })}
                        />
                      </td>
                      <td className="px-2 py-0.5">
                        <select
                          className={cellInput}
                          value={row.taxType}
                          onChange={(e) => updateRow(idx, { taxType: e.target.value as VatCommodity["taxType"] })}
                        >
                          {VAT_TAX_TYPES.map((t) => <option key={t}>{t}</option>)}
                        </select>
                      </td>
                      <td className="px-1 text-center">
                        {!isBlankLast && (
                          <button
                            type="button"
                            onClick={() => removeRow(idx)}
                            className="text-zinc-400 hover:text-zinc-900 font-bold leading-none"
                            title="Remove"
                          >
                            ×
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <div className="text-[11px] italic text-zinc-400 mt-1">End of List</div>
          </div>
        )}

        <div className="mt-6 pt-3 border-t border-zinc-100 text-[11px] italic text-zinc-400">
          Note: VAT registration &amp; commodity details are used in VAT returns &amp; reports.
        </div>
      </div>
      <div className="flex-1" />
    </div>
  );
}
