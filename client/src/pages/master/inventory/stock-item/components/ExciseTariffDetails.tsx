import { useState, useEffect, useRef } from "react";
import { EXCISE_REPORTING_UOM_OPTIONS, EXCISE_VALUATION_TYPE_OPTIONS } from "../consts";

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

export default function ExciseTariffDetails({
  initialData,
  onAccept,
  onClose,
}: ExciseTariffDetailsProps) {
  const [form, setForm] = useState<ExciseTariffFormData>({
    tariff_name: initialData?.tariff_name || "",
    hsn_code: initialData?.hsn_code || "",
    reporting_uom: initialData?.reporting_uom || "Undefined",
    valuation_type: initialData?.valuation_type || "Undefined",
    rate: initialData?.rate || "0",
    rate_per_unit: initialData?.rate_per_unit || "0",
  });

  const [activeDropdown, setActiveDropdown] = useState<
    "reporting_uom" | "valuation_type" | null
  >(null);

  const tariffRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    tariffRef.current?.focus();
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") { e.preventDefault(); onClose(); }
    if (e.altKey && e.key.toLowerCase() === "a") { e.preventDefault(); onAccept(form); }
  };

  const showRate = form.valuation_type === "Ad Valorem" || form.valuation_type === "Valorem + Quantum";
  const showRatePerUnit = form.valuation_type === "Ad Quantum" || form.valuation_type === "Valorem + Quantum";

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/20"
      onKeyDown={handleKeyDown}
      tabIndex={-1}
    >
      <div className="bg-white border border-zinc-400 w-[520px] flex flex-col shadow-xl">
        <div className="bg-zinc-900 text-white text-xs font-bold px-4 py-2 tracking-widest uppercase">
          Excise Tariff Details
        </div>

        <div className="px-6 py-4 space-y-2">

          {/* Tariff name */}
          <div className="flex items-center min-h-[26px]">
            <span className="w-48 shrink-0 text-sm text-zinc-700 font-sans">Tariff name</span>
            <span className="w-4 shrink-0 text-zinc-400 text-sm text-center">:</span>
            <div className="flex-1">
              <input
                ref={tariffRef}
                className="w-full bg-transparent text-sm outline-none border-b border-zinc-300 focus:border-zinc-600 font-mono"
                value={form.tariff_name}
                onChange={e => setForm(f => ({ ...f, tariff_name: e.target.value }))}
                placeholder=""
              />
            </div>
          </div>

          {/* HSN code */}
          <div className="flex items-center min-h-[26px]">
            <span className="w-48 shrink-0 text-sm text-zinc-700 font-sans">HSN code</span>
            <span className="w-4 shrink-0 text-zinc-400 text-sm text-center">:</span>
            <div className="flex-1">
              <input
                className="w-full bg-transparent text-sm outline-none border-b border-zinc-300 focus:border-zinc-600 font-mono"
                value={form.hsn_code}
                onChange={e => setForm(f => ({ ...f, hsn_code: e.target.value }))}
                placeholder=""
              />
            </div>
          </div>

          {/* Reporting unit of measure */}
          <div
            className="flex items-center min-h-[26px] cursor-pointer hover:bg-zinc-50 py-0.5 rounded transition-colors"
            onClick={() => setActiveDropdown("reporting_uom")}
          >
            <span className="w-48 shrink-0 text-sm text-zinc-700 font-sans">Reporting unit of measure</span>
            <span className="w-4 shrink-0 text-zinc-400 text-sm text-center">:</span>
            <div className="flex-1">
              <span className="text-sm text-zinc-955 font-bold">
                {EXCISE_REPORTING_UOM_OPTIONS.find(o => o.id === form.reporting_uom)?.label || form.reporting_uom}
              </span>
            </div>
          </div>

          {/* Valuation type */}
          <div
            className="flex items-center min-h-[26px] cursor-pointer hover:bg-zinc-50 py-0.5 rounded transition-colors"
            onClick={() => setActiveDropdown("valuation_type")}
          >
            <span className="w-48 shrink-0 text-sm text-zinc-700 font-sans">Valuation type</span>
            <span className="w-4 shrink-0 text-zinc-400 text-sm text-center">:</span>
            <div className="flex-1">
              <span className="text-sm text-zinc-955 font-bold">
                {EXCISE_VALUATION_TYPE_OPTIONS.find(o => o.id === form.valuation_type)?.label || form.valuation_type}
              </span>
            </div>
          </div>

          {/* Rate (Ad Valorem / Valorem + Quantum) */}
          {showRate && (
            <div className="flex items-center min-h-[26px]">
              <span className="w-48 shrink-0 text-sm text-zinc-700 font-sans">Rate</span>
              <span className="w-4 shrink-0 text-zinc-400 text-sm text-center">:</span>
              <div className="flex-1 flex items-center gap-1">
                <input
                  className="w-20 bg-transparent text-sm outline-none border-b border-zinc-300 focus:border-zinc-600 text-right tabular-nums font-mono"
                  type="number" min="0" max="100" step="0.01"
                  value={form.rate}
                  onChange={e => setForm(f => ({ ...f, rate: e.target.value }))}
                  placeholder="0"
                />
                <span className="text-xs text-zinc-600 font-sans">%</span>
              </div>
            </div>
          )}

          {/* Rate per Unit (Ad Quantum / Valorem + Quantum) */}
          {showRatePerUnit && (
            <div className="flex items-center min-h-[26px]">
              <span className="w-48 shrink-0 text-sm text-zinc-700 font-sans">Rate per Unit</span>
              <span className="w-4 shrink-0 text-zinc-400 text-sm text-center">:</span>
              <div className="flex-1">
                <input
                  className="w-24 bg-transparent text-sm outline-none border-b border-zinc-300 focus:border-zinc-600 text-right tabular-nums font-mono"
                  type="number" min="0" step="0.01"
                  value={form.rate_per_unit}
                  onChange={e => setForm(f => ({ ...f, rate_per_unit: e.target.value }))}
                  placeholder="0"
                />
              </div>
            </div>
          )}
        </div>

        {/* ── Side dropdowns ── */}
        {activeDropdown === "reporting_uom" && (
          <div className="absolute right-0 top-0 w-72 border-l border-zinc-300 flex flex-col bg-white shadow-md font-mono max-h-full">
            <div className="bg-zinc-800 text-white text-xs px-3 py-1.5 font-bold uppercase tracking-wider shrink-0">List of Excise Reporting UoMs</div>
            <div className="overflow-y-auto min-h-0 py-0.5 flex-1">
              {EXCISE_REPORTING_UOM_OPTIONS.map(opt => (
                <div
                  key={opt.id}
                  className={`flex items-center px-3 py-1 text-xs cursor-pointer border-b border-zinc-100/50 transition-colors ${form.reporting_uom === opt.id ? "bg-zinc-200 font-bold text-zinc-955" : "text-zinc-800 hover:bg-zinc-50"}`}
                  onClick={() => { setForm(f => ({ ...f, reporting_uom: opt.id })); setActiveDropdown(null); }}
                >
                  <span className="truncate">{opt.label}</span>
                </div>
              ))}
            </div>
            <div className="border-t border-zinc-200 px-3 py-1.5 bg-zinc-50 shrink-0">
              <button onClick={() => setActiveDropdown(null)} className="text-xs text-zinc-500 hover:text-zinc-800 font-sans">Esc: Close</button>
            </div>
          </div>
        )}

        {activeDropdown === "valuation_type" && (
          <div className="absolute right-0 top-0 w-72 border-l border-zinc-300 flex flex-col bg-white shadow-md font-mono max-h-full">
            <div className="bg-zinc-800 text-white text-xs px-3 py-1.5 font-bold uppercase tracking-wider shrink-0">List of Valuation Types</div>
            <div className="overflow-y-auto min-h-0 py-0.5 flex-1">
              {EXCISE_VALUATION_TYPE_OPTIONS.map(opt => (
                <div
                  key={opt.id}
                  className={`flex items-center px-3 py-1 text-xs cursor-pointer border-b border-zinc-100/50 transition-colors ${form.valuation_type === opt.id ? "bg-zinc-200 font-bold text-zinc-955" : "text-zinc-800 hover:bg-zinc-50"}`}
                  onClick={() => { setForm(f => ({ ...f, valuation_type: opt.id })); setActiveDropdown(null); }}
                >
                  <span className="truncate">{opt.label}</span>
                </div>
              ))}
            </div>
            <div className="border-t border-zinc-200 px-3 py-1.5 bg-zinc-50 shrink-0">
              <button onClick={() => setActiveDropdown(null)} className="text-xs text-zinc-500 hover:text-zinc-800 font-sans">Esc: Close</button>
            </div>
          </div>
        )}

        <div className="border-t border-zinc-300 flex text-xs bg-zinc-50 shrink-0">
          <button onClick={onClose} className="flex-1 py-1.5 border-r border-zinc-300 hover:bg-zinc-100 text-left px-3 transition-colors"><span className="font-bold">Q</span>: Quit</button>
          <button onClick={() => onAccept(form)} className="flex-1 py-1.5 hover:bg-zinc-100 text-left px-3 transition-colors"><span className="font-bold">A</span>: Accept</button>
        </div>
      </div>
    </div>
  );
}
