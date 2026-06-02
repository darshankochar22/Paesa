import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useCompany } from "@/context/CompanyContext";
import { FormRow, PageTitleBar, RightActionPanel } from "@/components/ui";
import { loadFormState, saveFormState, clearFormState } from "@/utils/formPersistence";
import UnitDropdown from "./UnitDropdown";
import type { UnitType } from "@/types/entities/Unit";

const inputCls = "flex-1 bg-transparent text-sm outline-none px-1 py-0.5 border border-transparent focus:bg-zinc-100 hover:bg-zinc-50 focus:border-zinc-300 transition-colors";
const selectCls = "bg-transparent text-sm outline-none px-1 py-0.5 border border-transparent cursor-pointer focus:bg-zinc-100 hover:bg-zinc-50 focus:border-zinc-300 transition-colors";
const smallInputCls = "w-20 bg-transparent text-sm outline-none px-1 py-0.5 border border-transparent focus:bg-zinc-100 hover:bg-zinc-50 focus:border-zinc-300 transition-colors text-center";

interface FormData {
  unit_type: "Simple" | "Compound";
  symbol: string;
  formal_name: string;
  decimal_places: string;
  first_unit_id: string;
  second_unit_id: string;
  conversion_factor: string;
}

const INITIAL: FormData = {
  unit_type: "Simple",
  symbol: "",
  formal_name: "",
  decimal_places: "0",
  first_unit_id: "",
  second_unit_id: "",
  conversion_factor: "",
};

export default function UnitCreate() {
  const navigate = useNavigate();
  const { selectedCompany } = useCompany();
  const companyId = selectedCompany?.company_id;
  const persistKey = companyId ? `unitCreate_${companyId}` : null;
  const hasRestored = useRef(false);
  const [form, setForm] = useState<FormData>(
    () => loadFormState<any>(persistKey ?? "")?.form ?? INITIAL
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [simpleUnits, setSimpleUnits] = useState<UnitType[]>([]);
  const [unitsLoading, setUnitsLoading] = useState(false);

  useEffect(() => {
    if (!persistKey) return;
    if (!hasRestored.current) {
      hasRestored.current = true;
      return;
    }
    saveFormState(persistKey, { form });
  }, [persistKey, form]);

  useEffect(() => {
    if (!companyId) return;
    const fetchSimpleUnits = async () => {
      setUnitsLoading(true);
      try {
        let units: UnitType[] = [];
        if (typeof window.api.unit.getSimpleUnits === "function") {
          const r = await window.api.unit.getSimpleUnits(companyId);
          if (r.success) units = r.units ?? [];
        }
        if (units.length === 0) {
          const r = await window.api.unit.getAll(companyId);
          if (r.success) {
            units = (r.units ?? []).filter(u => u.unit_type === "Simple" || u.is_simple === 1);
          }
        }
        setSimpleUnits(units);
      } catch (e) {
        console.error("Failed to fetch simple units", e);
      } finally {
        setUnitsLoading(false);
      }
    };
    fetchSimpleUnits();
  }, [companyId]);

  const setField = (key: keyof FormData) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm(f => ({ ...f, [key]: e.target.value }));

  const setUnitField = (key: keyof FormData) =>
    (val: string) => setForm(f => ({ ...f, [key]: val }));

  const validate = (): string | null => {
    if (!selectedCompany?.company_id) return "No company selected.";
    if (form.unit_type === "Simple") {
      if (!form.symbol.trim()) return "Symbol is required.";
    } else {
      if (!form.first_unit_id) return "First unit is required.";
      if (!form.second_unit_id) return "Second unit is required.";
      if (!form.conversion_factor.trim() || Number(form.conversion_factor) <= 0) return "Conversion factor must be greater than 0.";
      if (form.first_unit_id === form.second_unit_id) return "First and second unit cannot be the same.";
    }
    return null;
  };

  const handleSubmit = useCallback(async () => {
    const err = validate();
    if (err) { setError(err); return; }
    setLoading(true); setError(null);
    try {
      let result;
      if (form.unit_type === "Compound") {
        result = await window.api.unit.create({
          company_id: selectedCompany!.company_id,
          unit_type: "Compound",
          first_unit_id: Number(form.first_unit_id),
          second_unit_id: Number(form.second_unit_id),
          conversion_factor: Number(form.conversion_factor),
        });
      } else {
        result = await window.api.unit.create({
          company_id: selectedCompany!.company_id,
          name: form.symbol.trim(),
          symbol: form.symbol.trim(),
          formal_name: form.formal_name.trim() || form.symbol.trim(),
          unit_type: form.unit_type,
          decimal_places: Number(form.decimal_places) || 0,
        });
      }
      if (result.success) {
        setSuccess(`Unit "${result.unit.symbol}" created successfully.`);
        setForm(INITIAL);
        if (persistKey) clearFormState(persistKey);
        hasRestored.current = false;
        setTimeout(() => setSuccess(null), 3000);
      } else {
        setError(result.error || "Failed to create unit.");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unexpected error.");
    } finally {
      setLoading(false);
    }
  }, [form, selectedCompany]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        navigate("/master/create");
      }
      if (e.altKey && e.key.toLowerCase() === "a") {
        e.preventDefault();
        handleSubmit();
      }
      if (e.ctrlKey && e.key.toLowerCase() === "a") {
        e.preventDefault();
        handleSubmit();
      }
      if (e.altKey && e.key.toLowerCase() === "c") {
        e.preventDefault();
        navigate("/master/alter/unit");
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handleSubmit, navigate]);

  const unitActions = [
    { key: "Alt+A", label: "Accept", onClick: handleSubmit },
    { key: "Alt+C", label: "Alter Unit", onClick: () => navigate("/master/alter/unit") },
    { key: "Esc", label: "Quit", onClick: () => navigate("/master/create") },
  ];

  const isCompound = form.unit_type === "Compound";

  return (
    <div className="flex-1 flex flex-col h-full bg-white select-none">
      <PageTitleBar title="Unit Creation" subtitle={selectedCompany?.name} />

      {error && (
        <div className="px-3 py-1.5 border-b border-red-200 bg-red-50 text-red-700 text-xs flex justify-between items-center">
          <span>• {error}</span>
          <button onClick={() => setError(null)} className="text-red-500 hover:text-red-700 text-xs font-bold font-sans">&times;</button>
        </div>
      )}
      {success && (
        <div className="px-3 py-1.5 border-b border-green-200 bg-green-50 text-green-700 text-xs flex justify-between items-center">
          <span>• {success}</span>
          <button onClick={() => setSuccess(null)} className="text-green-500 hover:text-green-700 text-xs font-bold font-sans">&times;</button>
        </div>
      )}

      <div className="flex-1 flex min-h-0">
        {/* Left: form fields */}
        <div className="flex-1 flex flex-col min-w-0 bg-white border-r border-zinc-100">
          <div className="p-3 space-y-1 max-w-2xl">
            <FormRow label="Type" labelWidth="w-56" className="flex items-center min-h-[26px]">
              <select className={selectCls} value={form.unit_type} onChange={setField("unit_type")}>
                <option value="Simple">Simple</option>
                <option value="Compound">Compound</option>
              </select>
            </FormRow>

            {!isCompound && (
              <>
                <FormRow label="Symbol" required labelWidth="w-56" className="flex items-center min-h-[26px]">
                  <input autoFocus className={inputCls} value={form.symbol} onChange={setField("symbol")} placeholder="e.g. Kg" />
                </FormRow>
                <FormRow label="Formal Name" labelWidth="w-56" className="flex items-center min-h-[26px]">
                  <input className={inputCls} value={form.formal_name} onChange={setField("formal_name")} placeholder="e.g. Kilogram" />
                </FormRow>
                <FormRow label="Number of Decimal Places" labelWidth="w-56" className="flex items-center min-h-[26px]">
                  <select className={selectCls} value={form.decimal_places} onChange={setField("decimal_places")}>
                    {[0, 1, 2, 3, 4].map(n => <option key={n} value={n}>{n}</option>)}
                  </select>
                </FormRow>
              </>
            )}

            {isCompound && (
              <div className="mt-2 space-y-3">
                <div className="text-sm font-bold text-zinc-900">Units with Multiplier Factors</div>

                {unitsLoading ? (
                  <div className="text-xs text-zinc-400 py-2">Loading simple units…</div>
                ) : (
                  <div className="flex items-start gap-6 mt-1">
                    {/* First unit */}
                    <div className="flex flex-col gap-1">
                      <span className="text-xs text-zinc-700 italic font-medium">First unit</span>
                      <UnitDropdown
                        value={form.first_unit_id}
                        onChange={setUnitField("first_unit_id")}
                        units={simpleUnits}
                        onCreate={() => navigate("/master/create/unit")}
                        placeholder="Select…"
                      />
                    </div>

                    {/* Conversion */}
                    <div className="flex flex-col gap-1">
                      <span className="text-xs text-zinc-700 italic font-medium">Conversion</span>
                      <div className="flex items-center gap-1">
                        <span className="text-sm text-zinc-800">of</span>
                        <input
                          type="number"
                          min="1"
                          step="any"
                          className={smallInputCls}
                          value={form.conversion_factor}
                          onChange={setField("conversion_factor")}
                          placeholder=""
                        />
                      </div>
                    </div>

                    {/* Second unit */}
                    <div className="flex flex-col gap-1">
                      <span className="text-xs text-zinc-700 italic font-medium">Second unit</span>
                      <UnitDropdown
                        value={form.second_unit_id}
                        onChange={setUnitField("second_unit_id")}
                        units={simpleUnits}
                        onCreate={() => navigate("/master/create/unit")}
                        placeholder="Select…"
                      />
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
          <div className="flex-1" />
        </div>

        <RightActionPanel actions={unitActions} />
      </div>

      {/* Footer */}
      <div className="border-t border-zinc-200 p-3 flex justify-between items-center bg-zinc-50">
        <button onClick={() => navigate("/master/create")} className="text-xs text-zinc-500 hover:text-zinc-800 transition-colors font-medium">
          &larr; Back to Masters
        </button>
        <button
          onClick={handleSubmit}
          disabled={loading || (isCompound && simpleUnits.length === 0)}
          className="text-sm px-6 py-1.5 rounded bg-black text-white hover:bg-zinc-800 disabled:opacity-50 transition-colors font-medium"
        >
          {loading ? "Saving…" : "Create"}
        </button>
      </div>
    </div>
  );
}
