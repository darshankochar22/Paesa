import { useState, useEffect, useRef } from "react";
import { FormRow } from "@/components/ui";

export interface ExciseTariffFormData {
  tariff_name: string;
  hsn_code: string;
  reporting_uom: string;
  valuation_type: string;
  rate: string;
  rate_per_unit: string;
}

interface ExciseTariffDetailsProps {
  initialData?: Partial<ExciseTariffFormData>;
  onAccept: (data: ExciseTariffFormData) => void;
  onClose: () => void;
}

const inputCls =
  "flex-1 bg-transparent text-sm outline-none px-1.5 py-0.5 border border-transparent hover:border-zinc-200 focus:border-zinc-800 transition-colors bg-white/50 rounded";
const selectCls =
  "bg-transparent text-sm outline-none px-1.5 py-0.5 border border-transparent hover:border-zinc-200 focus:border-zinc-800 transition-colors bg-white/50 rounded";

const REPORTING_UOM_OPTIONS = [
  { id: "Undefined",  label: "Undefined" },
  { id: "10GMS",      label: "10GMS - 10 Grams" },
  { id: "1KKWH",      label: "1KKWH - 1000 Kilowatt Hours" },
  { id: "CK",         label: "C/K - Carats" },
  { id: "CM",         label: "CM - Centimetre" },
  { id: "CM3",        label: "CM3 - Cubic Centimetre" },
  { id: "G",          label: "G - Grams" },
  { id: "Gl_FIS",     label: "Gl F/S - Gram of Fissile Isotopes" },
  { id: "KG",         label: "KG - Kilograms" },
  { id: "KL",         label: "KL - Kilolitre" },
  { id: "L",          label: "L - Litre" },
  { id: "M",          label: "M - Metre" },
  { id: "M2",         label: "M2 - Square Metre" },
  { id: "M3",         label: "M3 - Cubic Metre" },
  { id: "MM",         label: "MM - Millimetre" },
];

const VALUATION_TYPE_OPTIONS = [
  { id: "Undefined",          label: "Undefined" },
  { id: "Ad Quantum",         label: "Ad Quantum" },
  { id: "Ad Valorem",         label: "Ad Valorem" },
  { id: "Valorem + Quantum",  label: "Valorem + Quantum" },
];

export default function ExciseTariffDetails({
  initialData,
  onAccept,
  onClose,
}: ExciseTariffDetailsProps) {
  const [form, setForm] = useState<ExciseTariffFormData>({
    tariff_name:   initialData?.tariff_name   || "",
    hsn_code:      initialData?.hsn_code      || "",
    reporting_uom: initialData?.reporting_uom || "Undefined",
    valuation_type: initialData?.valuation_type || "Undefined",
    rate:          initialData?.rate          || "0",
    rate_per_unit: initialData?.rate_per_unit || "0",
  });

  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    containerRef.current?.focus();
  }, []);

  const setVal = (key: keyof ExciseTariffFormData, value: string) =>
    setForm(f => ({ ...f, [key]: value }));

  const showRate        = form.valuation_type === "Ad Valorem"  || form.valuation_type === "Valorem + Quantum";
  const showRatePerUnit = form.valuation_type === "Ad Quantum"  || form.valuation_type === "Valorem + Quantum";

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") { e.preventDefault(); onClose(); }
    if (e.altKey && e.key.toLowerCase() === "a") { e.preventDefault(); onAccept(form); }
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/20"
      onKeyDown={handleKeyDown}
      tabIndex={-1}
      ref={containerRef}
    >
      <div className="bg-white border border-zinc-300 w-[520px] flex flex-col shadow-xl">

        <div className="bg-zinc-900 text-white text-xs font-bold px-4 py-2 tracking-widest uppercase shrink-0">
          Excise Tariff Details
        </div>

        <div className="px-6 py-4 space-y-1">

          <FormRow label="Tariff name" labelWidth="w-52" className="flex items-center min-h-[26px]">
            <input
              autoFocus
              className={inputCls}
              value={form.tariff_name}
              onChange={e => setVal("tariff_name", e.target.value)}
            />
          </FormRow>

          <FormRow label="HSN code" labelWidth="w-52" className="flex items-center min-h-[26px]">
            <input
              className={inputCls}
              value={form.hsn_code}
              onChange={e => setVal("hsn_code", e.target.value)}
            />
          </FormRow>

          <FormRow label="Reporting unit of measure" labelWidth="w-52" className="flex items-center min-h-[26px]">
            <select
              className={selectCls}
              value={form.reporting_uom}
              onChange={e => setVal("reporting_uom", e.target.value)}
            >
              {REPORTING_UOM_OPTIONS.map(o => (
                <option key={o.id} value={o.id}>{o.label}</option>
              ))}
            </select>
          </FormRow>

          <FormRow label="Valuation type" labelWidth="w-52" className="flex items-center min-h-[26px]">
            <select
              className={selectCls}
              value={form.valuation_type}
              onChange={e => setVal("valuation_type", e.target.value)}
            >
              {VALUATION_TYPE_OPTIONS.map(o => (
                <option key={o.id} value={o.id}>{o.label}</option>
              ))}
            </select>
          </FormRow>

          {showRate && (
            <FormRow label="Rate" labelWidth="w-52" className="flex items-center min-h-[26px]">
              <div className="flex items-center gap-1">
                <input
                  className="w-20 bg-transparent text-sm outline-none px-1.5 py-0.5 border border-transparent hover:border-zinc-200 focus:border-zinc-800 transition-colors bg-white/50 rounded text-right tabular-nums"
                  type="number" min="0" max="100" step="0.01"
                  value={form.rate}
                  onChange={e => setVal("rate", e.target.value)}
                />
                <span className="text-sm text-zinc-500">%</span>
              </div>
            </FormRow>
          )}

          {showRatePerUnit && (
            <FormRow label="Rate per Unit" labelWidth="w-52" className="flex items-center min-h-[26px]">
              <input
                className="w-24 bg-transparent text-sm outline-none px-1.5 py-0.5 border border-transparent hover:border-zinc-200 focus:border-zinc-800 transition-colors bg-white/50 rounded text-right tabular-nums"
                type="number" min="0" step="0.01"
                value={form.rate_per_unit}
                onChange={e => setVal("rate_per_unit", e.target.value)}
              />
            </FormRow>
          )}

        </div>

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
