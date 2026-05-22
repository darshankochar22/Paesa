import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useCompany } from "@/context/CompanyContext";
import { FormRow, PageTitleBar } from "@/components/ui";

const inputCls = "flex-1 bg-transparent text-sm outline-none px-1.5 py-0.5 border border-transparent hover:border-zinc-200 focus:border-zinc-800 transition-colors bg-white/50 rounded";
const selectCls = "bg-transparent text-sm outline-none px-1.5 py-0.5 border border-transparent hover:border-zinc-200 focus:border-zinc-800 transition-colors bg-white/50 rounded";

interface FormData {
  unit_type: "Simple" | "Compound";
  symbol: string;
  formal_name: string;
  decimal_places: string;
  first_unit: string;
  conversion: string;
  second_unit: string;
}

const INITIAL: FormData = {
  unit_type: "Simple",
  symbol: "",
  formal_name: "",
  decimal_places: "0",
  first_unit: "",
  conversion: "",
  second_unit: "",
};

export default function PayrollUnitCreate() {
  const navigate = useNavigate();
  const { selectedCompany } = useCompany();
  const [form, setForm] = useState<FormData>(INITIAL);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const setField = (key: keyof FormData) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm(f => ({ ...f, [key]: e.target.value }));

  const validate = (): string | null => {
    if (!form.symbol.trim()) return "Symbol is required.";
    if (!selectedCompany?.company_id) return "No company selected.";
    return null;
  };

  const handleSubmit = useCallback(async () => {
    const err = validate();
    if (err) { setError(err); return; }
    setLoading(true); setError(null);
    try {
      const result = await window.api.payrollUnit.create({
        company_id: selectedCompany!.company_id,
        name: form.symbol.trim(),
        symbol: form.symbol.trim(),
        formal_name: form.formal_name.trim() || undefined,
        unit_type: form.unit_type,
        decimal_places: Number(form.decimal_places) || 0,
        first_unit: form.unit_type === "Compound" ? form.first_unit.trim() || undefined : undefined,
        conversion: form.unit_type === "Compound" ? Number(form.conversion) || undefined : undefined,
        second_unit: form.unit_type === "Compound" ? form.second_unit.trim() || undefined : undefined,
      });
      if (result.success) {
        setSuccess(`Payroll Unit "${form.symbol}" created.`);
        setForm(INITIAL);
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
      if (e.key === "Escape") { e.preventDefault(); navigate("/master/create"); }
      if (e.altKey && e.key.toLowerCase() === "a") { e.preventDefault(); handleSubmit(); }
      if (e.ctrlKey && e.key.toLowerCase() === "a") { e.preventDefault(); handleSubmit(); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handleSubmit, navigate]);

  return (
    <div className="flex-1 flex flex-col h-full bg-white select-none">
      <PageTitleBar title="Unit Creation" subtitle={selectedCompany?.name} />

      {error && (
        <div className="px-3 py-1.5 border-b border-red-200 bg-red-50 text-red-700 text-xs flex justify-between items-center">
          <span>* {error}</span>
          <button onClick={() => setError(null)} className="text-red-500 hover:text-red-700 text-xs font-bold">&times;</button>
        </div>
      )}
      {success && (
        <div className="px-3 py-1.5 border-b border-green-200 bg-green-50 text-green-700 text-xs flex justify-between items-center">
          <span>* {success}</span>
          <button onClick={() => setSuccess(null)} className="text-green-500 hover:text-green-700 text-xs font-bold">&times;</button>
        </div>
      )}

      <div className="flex-1 flex min-h-0">
        <div className="flex-1 flex flex-col min-w-0 bg-white border-r border-zinc-100">
          <div className="p-3 space-y-1 max-w-2xl">
            <FormRow label="Type" labelWidth="w-56" className="flex items-center min-h-[26px]">
              <select className={selectCls} value={form.unit_type} onChange={setField("unit_type")}>
                <option value="Simple">Simple</option>
                <option value="Compound">Compound</option>
              </select>
            </FormRow>
            <FormRow label="Symbol" required labelWidth="w-56" className="flex items-center min-h-[26px]">
              <input autoFocus className={inputCls} value={form.symbol} onChange={setField("symbol")} placeholder="e.g. Days" />
            </FormRow>
            <FormRow label="Formal Name" labelWidth="w-56" className="flex items-center min-h-[26px]">
              <input className={inputCls} value={form.formal_name} onChange={setField("formal_name")} placeholder="e.g. Number of Days" />
            </FormRow>
            <FormRow label="Number of Decimal Places" labelWidth="w-56" className="flex items-center min-h-[26px]">
              <select className={selectCls} value={form.decimal_places} onChange={setField("decimal_places")}>
                {[0, 1, 2, 3, 4].map(n => <option key={n} value={n}>{n}</option>)}
              </select>
            </FormRow>

            {form.unit_type === "Compound" && (
              <div className="pt-2 mt-2 border-t border-zinc-100 space-y-1">
                <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-2">Compound Unit</div>
                <FormRow label="First Unit" labelWidth="w-56" className="flex items-center min-h-[26px]">
                  <input className={inputCls} value={form.first_unit} onChange={setField("first_unit")} placeholder="e.g. Hours" />
                </FormRow>
                <FormRow label="Conversion" labelWidth="w-56" className="flex items-center min-h-[26px]">
                  <input className={inputCls} value={form.conversion} onChange={setField("conversion")} type="number" placeholder="e.g. 60" />
                </FormRow>
                <FormRow label="Second Unit" labelWidth="w-56" className="flex items-center min-h-[26px]">
                  <input className={inputCls} value={form.second_unit} onChange={setField("second_unit")} placeholder="e.g. Minutes" />
                </FormRow>
              </div>
            )}
          </div>
          <div className="flex-1" />
        </div>
      </div>

      <div className="border-t border-zinc-200 p-3 flex justify-between items-center bg-zinc-50">
        <button onClick={() => navigate("/master/create")} className="text-xs text-zinc-500 hover:text-zinc-800 transition-colors font-medium">&larr; Back to Masters</button>
        <button onClick={handleSubmit} disabled={loading} className="text-sm px-6 py-1.5 rounded bg-black text-white hover:bg-zinc-800 disabled:opacity-50 transition-colors font-medium">
          {loading ? "Saving..." : "Create"}
        </button>
      </div>
    </div>
  );
}
