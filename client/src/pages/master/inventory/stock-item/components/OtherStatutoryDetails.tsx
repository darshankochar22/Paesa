import { useState, useEffect, useRef } from "react";
import { FormRow } from "@/components/ui";
import { EXCISE_REPORTING_UOM_OPTIONS, EXCISE_VALUATION_TYPE_OPTIONS } from "../consts";

export interface OtherStatutoryFormData {
  excise_applicable: string;
  set_alter_excise_details: string;
  excise_tariff_name: string;
  excise_tariff_hsn_code: string;
  excise_tariff_uom: string;
  excise_tariff_valuation_type: string;
  excise_tariff_rate: string;
  excise_tariff_rate_per_unit: string;
  vat_applicable: string;
  set_alter_vat_details: string;
  vat_tax_rate: string;
  vat_tax_type: string;
}

interface OtherStatutoryDetailsProps {
  stockItemName: string;
  unitLabel?: string;
  initialData?: Partial<OtherStatutoryFormData>;
  onAccept: (data: OtherStatutoryFormData) => void;
  onClose: () => void;
}

const inputCls =
  "flex-1 bg-transparent text-sm outline-none px-1.5 py-0.5 border border-transparent hover:border-zinc-200 focus:border-zinc-800 transition-colors bg-white/50 rounded";
const selectCls =
  "bg-transparent text-sm outline-none px-1.5 py-0.5 border border-transparent hover:border-zinc-200 focus:border-zinc-800 transition-colors bg-white/50 rounded";

export default function OtherStatutoryDetails({
  stockItemName,
  unitLabel,
  initialData,
  onAccept,
  onClose,
}: OtherStatutoryDetailsProps) {
  const [form, setForm] = useState<OtherStatutoryFormData>({
    excise_applicable:        initialData?.excise_applicable        || "Not Applicable",
    set_alter_excise_details: initialData?.set_alter_excise_details || "No",
    excise_tariff_name:       initialData?.excise_tariff_name       || "",
    excise_tariff_hsn_code:   initialData?.excise_tariff_hsn_code   || "",
    excise_tariff_uom:        initialData?.excise_tariff_uom        || "Undefined",
    excise_tariff_valuation_type: initialData?.excise_tariff_valuation_type || "Undefined",
    excise_tariff_rate:       initialData?.excise_tariff_rate       || "0",
    excise_tariff_rate_per_unit: initialData?.excise_tariff_rate_per_unit || "0",
    vat_applicable:           initialData?.vat_applicable           || "Applicable",
    set_alter_vat_details:    initialData?.set_alter_vat_details    || "No",
    vat_tax_rate:             initialData?.vat_tax_rate             || "",
    vat_tax_type:             initialData?.vat_tax_type             || "Unknown",
  });

  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    containerRef.current?.focus();
  }, []);

  const setVal = (key: keyof OtherStatutoryFormData, value: string) =>
    setForm(f => ({ ...f, [key]: value }));

  const hasExcise    = form.excise_applicable === "Applicable";
  const showTariff   = hasExcise && form.set_alter_excise_details === "Yes";
  const showRate     = form.excise_tariff_valuation_type === "Ad Valorem" || form.excise_tariff_valuation_type === "Valorem + Quantum";
  const showRatePerUnit = form.excise_tariff_valuation_type === "Ad Quantum" || form.excise_tariff_valuation_type === "Valorem + Quantum";

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") { e.preventDefault(); onClose(); }
    if (e.altKey && e.key.toLowerCase() === "a") { e.preventDefault(); onAccept(form); }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/20"
      onKeyDown={handleKeyDown}
      tabIndex={-1}
      ref={containerRef}
    >
      <div className="bg-white border border-zinc-300 w-[560px] flex flex-col shadow-xl max-h-[90vh]">

        {/* Title */}
        <div className="bg-zinc-900 text-white text-xs font-bold px-4 py-2 tracking-widest uppercase shrink-0">
          Tax Details — {stockItemName}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-1">

          {/* ── Excise ── */}
          <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-2">Excise</div>

          <FormRow label="Is Excise applicable" labelWidth="w-52" className="flex items-center min-h-[26px]">
            <select
              className={selectCls}
              value={form.excise_applicable}
              onChange={e => {
                const val = e.target.value;
                setVal("excise_applicable", val);
                if (val !== "Applicable") setVal("set_alter_excise_details", "No");
              }}
            >
              <option value="Not Applicable">Not Applicable</option>
              <option value="Applicable">Applicable</option>
              <option value="Undefined">Undefined</option>
            </select>
          </FormRow>

          <FormRow label="Set/alter excise details" labelWidth="w-52" className="flex items-center min-h-[26px]">
            <select
              className={selectCls}
              value={form.set_alter_excise_details}
              disabled={!hasExcise}
              onChange={e => setVal("set_alter_excise_details", e.target.value)}
            >
              <option value="No">No</option>
              <option value="Yes">Yes</option>
            </select>
          </FormRow>

          {showTariff && (
            <>
              <FormRow label="Conversion factor" labelWidth="w-52" className="flex items-center min-h-[26px] pl-4">
                <span className="text-sm text-zinc-600 px-1.5">1 {unitLabel || "nos"} = 1</span>
              </FormRow>

              <FormRow label="Tariff name" labelWidth="w-52" className="flex items-center min-h-[26px] pl-4">
                <input
                  autoFocus
                  className={inputCls}
                  value={form.excise_tariff_name}
                  onChange={e => setVal("excise_tariff_name", e.target.value)}
                />
              </FormRow>

              <FormRow label="HSN code" labelWidth="w-52" className="flex items-center min-h-[26px] pl-4">
                <input
                  className={inputCls}
                  value={form.excise_tariff_hsn_code}
                  onChange={e => setVal("excise_tariff_hsn_code", e.target.value)}
                />
              </FormRow>

              <FormRow label="Reporting unit of measure" labelWidth="w-52" className="flex items-center min-h-[26px] pl-4">
                <select
                  className={selectCls}
                  value={form.excise_tariff_uom}
                  onChange={e => setVal("excise_tariff_uom", e.target.value)}
                >
                  {EXCISE_REPORTING_UOM_OPTIONS.map(o => (
                    <option key={o.id} value={o.id}>{o.label}</option>
                  ))}
                </select>
              </FormRow>

              <FormRow label="Valuation type" labelWidth="w-52" className="flex items-center min-h-[26px] pl-4">
                <select
                  className={selectCls}
                  value={form.excise_tariff_valuation_type}
                  onChange={e => setVal("excise_tariff_valuation_type", e.target.value)}
                >
                  {EXCISE_VALUATION_TYPE_OPTIONS.map(o => (
                    <option key={o.id} value={o.id}>{o.label}</option>
                  ))}
                </select>
              </FormRow>

              {showRate && (
                <FormRow label="Rate" labelWidth="w-52" className="flex items-center min-h-[26px] pl-4">
                  <div className="flex items-center gap-1">
                    <input
                      className="w-20 bg-transparent text-sm outline-none px-1.5 py-0.5 border border-transparent hover:border-zinc-200 focus:border-zinc-800 transition-colors bg-white/50 rounded text-right tabular-nums"
                      type="number" min="0" max="100" step="0.01"
                      value={form.excise_tariff_rate}
                      onChange={e => setVal("excise_tariff_rate", e.target.value)}
                    />
                    <span className="text-sm text-zinc-500">%</span>
                  </div>
                </FormRow>
              )}

              {showRatePerUnit && (
                <FormRow label="Rate per Unit" labelWidth="w-52" className="flex items-center min-h-[26px] pl-4">
                  <input
                    className="w-24 bg-transparent text-sm outline-none px-1.5 py-0.5 border border-transparent hover:border-zinc-200 focus:border-zinc-800 transition-colors bg-white/50 rounded text-right tabular-nums"
                    type="number" min="0" step="0.01"
                    value={form.excise_tariff_rate_per_unit}
                    onChange={e => setVal("excise_tariff_rate_per_unit", e.target.value)}
                  />
                </FormRow>
              )}
            </>
          )}

          {/* ── VAT ── */}
          <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mt-4 mb-2">VAT</div>

          <FormRow label="VAT Applicable" labelWidth="w-52" className="flex items-center min-h-[26px]">
            <select
              className={selectCls}
              value={form.vat_applicable}
              onChange={e => setVal("vat_applicable", e.target.value)}
            >
              <option value="Applicable">Applicable</option>
              <option value="Not Applicable">Not Applicable</option>
              <option value="Undefined">Undefined</option>
            </select>
          </FormRow>

          <FormRow label="Set/Alter VAT details" labelWidth="w-52" className="flex items-center min-h-[26px]">
            <select
              className={selectCls}
              value={form.set_alter_vat_details}
              onChange={e => setVal("set_alter_vat_details", e.target.value)}
            >
              <option value="No">No</option>
              <option value="Yes">Yes</option>
            </select>
          </FormRow>

          {form.set_alter_vat_details === "Yes" && (
            <>
              <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mt-2 mb-1 pl-4">VAT Rate</div>

              <FormRow label="Tax rate" labelWidth="w-52" className="flex items-center min-h-[26px] pl-4">
                <div className="flex items-center gap-1">
                  <input
                    className="w-20 bg-transparent text-sm outline-none px-1.5 py-0.5 border border-transparent hover:border-zinc-200 focus:border-zinc-800 transition-colors bg-white/50 rounded text-right tabular-nums"
                    type="number" min="0" max="100" step="0.01"
                    value={form.vat_tax_rate}
                    onChange={e => setVal("vat_tax_rate", e.target.value)}
                    placeholder="0"
                  />
                  <span className="text-sm text-zinc-500">%</span>
                </div>
              </FormRow>

              <FormRow label="Tax type" labelWidth="w-52" className="flex items-center min-h-[26px] pl-4">
                <input
                  className={inputCls}
                  value={form.vat_tax_type}
                  onChange={e => setVal("vat_tax_type", e.target.value)}
                  placeholder="Unknown"
                />
              </FormRow>
            </>
          )}

        </div>

        {/* Footer */}
        <div className="border-t border-zinc-200 flex text-xs bg-zinc-50 shrink-0">
          <button
            onClick={onClose}
            className="flex-1 py-2 border-r border-zinc-200 hover:bg-zinc-100 text-left px-4 transition-colors"
          >
            <span className="font-bold">Esc</span>: Quit
          </button>
          <button
            onClick={() => onAccept(form)}
            className="flex-1 py-2 hover:bg-zinc-100 text-left px-4 transition-colors"
          >
            <span className="font-bold">Alt+A</span>: Accept
          </button>
        </div>

      </div>
    </div>
  );
}
