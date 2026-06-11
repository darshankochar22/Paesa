import { useState } from "react";
import ExciseTariffDetails from "./ExciseTariffDetails";

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
}

interface OtherStatutoryDetailsProps {
  stockItemName: string;
  unitLabel?: string;
  initialData?: Partial<OtherStatutoryFormData>;
  onAccept: (data: OtherStatutoryFormData) => void;
  onClose: () => void;
}

const EXCISE_APPLICABLE_OPTIONS = [
  { id: "Applicable", label: "Applicable" },
  { id: "Not Applicable", label: "Not Applicable" },
  { id: "Undefined", label: "Undefined" },
];

const VAT_APPLICABLE_OPTIONS = [
  { id: "Applicable", label: "Applicable" },
  { id: "Not Applicable", label: "Not Applicable" },
];

const YES_NO_OPTIONS = [
  { id: "Yes", label: "Yes" },
  { id: "No", label: "No" },
];

export default function OtherStatutoryDetails({
  stockItemName,
  unitLabel,
  initialData,
  onAccept,
  onClose,
}: OtherStatutoryDetailsProps) {
  const [form, setForm] = useState<OtherStatutoryFormData>({
    excise_applicable: initialData?.excise_applicable || "Not Applicable",
    set_alter_excise_details: initialData?.set_alter_excise_details || "No",
    excise_tariff_name: initialData?.excise_tariff_name || "",
    excise_tariff_hsn_code: initialData?.excise_tariff_hsn_code || "",
    excise_tariff_uom: initialData?.excise_tariff_uom || "Undefined",
    excise_tariff_valuation_type: initialData?.excise_tariff_valuation_type || "Undefined",
    excise_tariff_rate: initialData?.excise_tariff_rate || "0",
    excise_tariff_rate_per_unit: initialData?.excise_tariff_rate_per_unit || "0",
    vat_applicable: initialData?.vat_applicable || "Applicable",
    set_alter_vat_details: initialData?.set_alter_vat_details || "No",
  });

  const [activeDropdown, setActiveDropdown] = useState<
    "excise_applicable" | "set_alter_excise" | "vat_applicable" | "set_alter_vat" | null
  >(null);

  const [showExciseTariff, setShowExciseTariff] = useState(false);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") { e.preventDefault(); onClose(); }
    if (e.altKey && e.key.toLowerCase() === "a") { e.preventDefault(); onAccept(form); }
  };

  const hasExcise = form.excise_applicable === "Applicable";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/20"
      onKeyDown={handleKeyDown}
      tabIndex={-1}
    >
      <div className="bg-white border border-zinc-400 w-[520px] flex flex-col shadow-xl">
        <div className="bg-zinc-900 text-white text-xs font-bold px-4 py-2 tracking-widest uppercase">
          Tax Details for {stockItemName}
        </div>

        <div className="px-6 py-4 space-y-2">
          {/* ── Excise Section ── */}
          <div className="text-sm font-bold text-zinc-900 mb-1 font-sans">Excise</div>

          <div className="flex items-center min-h-[26px]" onClick={() => setActiveDropdown("excise_applicable")}>
            <span className="w-48 shrink-0 text-sm text-zinc-700 font-sans">Is Excise applicable</span>
            <span className="w-4 shrink-0 text-zinc-400 text-sm text-center">:</span>
            <div className="flex-1">
              <span className="text-sm text-zinc-955 font-bold">{form.excise_applicable}</span>
            </div>
          </div>

          <div className="flex items-center min-h-[26px] cursor-pointer hover:bg-zinc-50 py-0.5 rounded transition-colors" onClick={() => {
            if (form.set_alter_excise_details === "Yes") {
              setShowExciseTariff(true);
            } else {
              setActiveDropdown("set_alter_excise");
            }
          }}>
            <span className="w-48 shrink-0 text-sm text-zinc-700 font-sans">Set/alter excise details</span>
            <span className="w-4 shrink-0 text-zinc-400 text-sm text-center">:</span>
            <div className="flex-1">
              <span className="text-sm text-zinc-955 font-bold">{form.set_alter_excise_details}</span>
            </div>
          </div>

          {hasExcise && form.set_alter_excise_details === "Yes" && (
            <div className="flex items-center min-h-[26px]">
              <span className="w-48 shrink-0 text-sm text-zinc-700 font-sans">Conversion Factor</span>
              <span className="w-4 shrink-0 text-zinc-400 text-sm text-center">:</span>
              <div className="flex-1">
                <span className="text-sm text-zinc-955 font-bold">1 {unitLabel || "nos"} = 1</span>
              </div>
            </div>
          )}

          {/* ── VAT Section ── */}
          <div className="text-sm font-bold text-zinc-900 mt-4 mb-1 font-sans">VAT</div>

          <div className="flex items-center min-h-[26px]">
            <span className="w-48 shrink-0 text-sm text-zinc-700 font-sans">VAT Applicable</span>
            <span className="w-4 shrink-0 text-zinc-400 text-sm text-center">:</span>
            <div className="flex-1">
              <span className="text-sm text-zinc-955 font-bold">{form.vat_applicable}</span>
            </div>
          </div>

          <div className="flex items-center min-h-[26px]">
            <span className="w-48 shrink-0 text-sm text-zinc-700 font-sans">Set/Alter VAT details</span>
            <span className="w-4 shrink-0 text-zinc-400 text-sm text-center">:</span>
            <div className="flex-1">
              <span className="text-sm text-zinc-955 font-bold">{form.set_alter_vat_details}</span>
            </div>
          </div>
        </div>

        {/* ── Dropdown panels ── */}
        {activeDropdown === "excise_applicable" && (
          <div className="w-64 border-l border-zinc-300 flex flex-col bg-white shrink-0 font-mono shadow-md">
            <div className="bg-zinc-800 text-white text-xs px-3 py-1.5 font-bold uppercase tracking-wider">Excise Applicable</div>
            <div className="flex-1 overflow-y-auto min-h-0 py-0.5">
              {EXCISE_APPLICABLE_OPTIONS.map(opt => (
                <div
                  key={opt.id}
                  className={`flex items-center px-3 py-1 text-xs cursor-pointer border-b border-zinc-100/50 transition-colors ${form.excise_applicable === opt.id ? "bg-zinc-200 font-bold text-zinc-955" : "text-zinc-800 hover:bg-zinc-50"}`}
                  onClick={() => { setForm(f => ({ ...f, excise_applicable: opt.id })); setActiveDropdown(null); }}
                >
                  <span className="truncate">{opt.label}</span>
                </div>
              ))}
            </div>
            <div className="border-t border-zinc-200 px-3 py-1.5 bg-zinc-50">
              <button onClick={() => setActiveDropdown(null)} className="text-xs text-zinc-500 hover:text-zinc-800 font-sans">Esc: Close</button>
            </div>
          </div>
        )}

        {activeDropdown === "set_alter_excise" && (
          <div className="w-64 border-l border-zinc-300 flex flex-col bg-white shrink-0 font-mono shadow-md">
            <div className="bg-zinc-800 text-white text-xs px-3 py-1.5 font-bold uppercase tracking-wider">Excise Details</div>
            <div className="flex-1 overflow-y-auto min-h-0 py-0.5">
              {YES_NO_OPTIONS.map(opt => (
                <div
                  key={opt.id}
                  className={`flex items-center px-3 py-1 text-xs cursor-pointer border-b border-zinc-100/50 transition-colors ${form.set_alter_excise_details === opt.id ? "bg-zinc-200 font-bold text-zinc-955" : "text-zinc-800 hover:bg-zinc-50"}`}
                  onClick={() => {
                    setForm(f => ({ ...f, set_alter_excise_details: opt.id }));
                    setActiveDropdown(null);
                    if (opt.id === "Yes") {
                      setShowExciseTariff(true);
                    }
                  }}
                >
                  <span className="truncate">{opt.label}</span>
                </div>
              ))}
            </div>
            <div className="border-t border-zinc-200 px-3 py-1.5 bg-zinc-50">
              <button onClick={() => setActiveDropdown(null)} className="text-xs text-zinc-500 hover:text-zinc-800 font-sans">Esc: Close</button>
            </div>
          </div>
        )}

        {/* ── Footer ── */}
        <div className="border-t border-zinc-300 flex text-xs bg-zinc-50 shrink-0">
          <button onClick={onClose} className="flex-1 py-1.5 border-r border-zinc-300 hover:bg-zinc-100 text-left px-3 transition-colors"><span className="font-bold">Q</span>: Quit</button>
          <button onClick={() => onAccept(form)} className="flex-1 py-1.5 hover:bg-zinc-100 text-left px-3 transition-colors"><span className="font-bold">A</span>: Accept</button>
        </div>
      </div>

      {/* ── Excise Tariff Details stacked modal ── */}
      {showExciseTariff && (
        <ExciseTariffDetails
          initialData={{
            tariff_name: form.excise_tariff_name,
            hsn_code: form.excise_tariff_hsn_code,
            reporting_uom: form.excise_tariff_uom,
            valuation_type: form.excise_tariff_valuation_type,
            rate: form.excise_tariff_rate,
            rate_per_unit: form.excise_tariff_rate_per_unit,
          }}
          onAccept={(data) => {
            setForm(f => ({
              ...f,
              excise_tariff_name: data.tariff_name,
              excise_tariff_hsn_code: data.hsn_code,
              excise_tariff_uom: data.reporting_uom,
              excise_tariff_valuation_type: data.valuation_type,
              excise_tariff_rate: data.rate,
              excise_tariff_rate_per_unit: data.rate_per_unit,
            }));
            setShowExciseTariff(false);
          }}
          onClose={() => setShowExciseTariff(false)}
        />
      )}
    </div>
  );
}
