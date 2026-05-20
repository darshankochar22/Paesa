import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useCompany } from "@/context/CompanyContext";
import FormRow from "@/components/ui/FormRow";

const inputCls = "flex-1 bg-transparent text-sm outline-none px-1 py-0.5 border border-transparent";
const selectCls = "bg-transparent text-sm outline-none px-1 py-0.5 border border-transparent";

interface FormData {
  unit_type: "Simple" | "Compound";
  symbol: string;
  formal_name: string;
  decimal_places: string;
}

const INITIAL: FormData = {
  unit_type: "Simple",
  symbol: "",
  formal_name: "",
  decimal_places: "0",
};

export default function UnitCreate() {
  const navigate = useNavigate();
  const { selectedCompany } = useCompany();
  const [form, setForm] = useState<FormData>(INITIAL);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const setField = (key: keyof FormData) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm(f => ({ ...f, [key]: e.target.value }));

  const handleSubmit = async () => {
    if (!form.symbol.trim()) { setError("Symbol is required."); return; }
    if (!selectedCompany?.company_id) { setError("No company selected."); return; }
    setLoading(true); setError(null);
    try {
      const result = await window.api.unit.create({
        company_id: selectedCompany.company_id,
        // API still needs `name` — use symbol as the canonical name
        name: form.symbol.trim(),
        symbol: form.symbol.trim(),
        formal_name: form.formal_name.trim() || form.symbol.trim(),
        unit_type: form.unit_type,
        decimal_places: Number(form.decimal_places) || 0,
      });
      if (result.success) {
        setSuccess(`Unit "${form.symbol}" created.`);
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
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-white">

      {/* Title bar */}
      <div className="px-3 py-1 text-sm font-medium flex justify-between items-center select-none">
        <span>Unit Creation</span>
      </div>

      {error && (
        <div className="px-3 py-1 border-b border-red-200 bg-red-50 text-red-700 text-xs flex justify-between items-center">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="text-red-500 hover:text-red-700 text-xs">dismiss</button>
        </div>
      )}
      {success && (
        <div className="px-3 py-1 border-b border-green-200 bg-green-50 text-green-700 text-xs flex justify-between items-center">
          <span>{success}</span>
          <button onClick={() => setSuccess(null)} className="text-green-500 hover:text-green-700 text-xs">dismiss</button>
        </div>
      )}

      <div className="flex-1 flex flex-col min-w-0 p-2 space-y-0.5">
        <FormRow label="Type" labelWidth="w-48" className="flex items-center min-h-[22px]">
          <select className={selectCls} value={form.unit_type} onChange={setField("unit_type")}>
            <option value="Simple">Simple</option>
            <option value="Compound">Compound</option>
          </select>
        </FormRow>
        <FormRow label="Symbol" labelWidth="w-48" className="flex items-center min-h-[22px]">
          <input autoFocus className={inputCls} value={form.symbol} onChange={setField("symbol")} placeholder="e.g. Kg" />
        </FormRow>
        <FormRow label="Formal Name" labelWidth="w-48" className="flex items-center min-h-[22px]">
          <input className={inputCls} value={form.formal_name} onChange={setField("formal_name")} placeholder="e.g. Kilogram (optional)" />
        </FormRow>
        <FormRow label="Number of Decimal Places" labelWidth="w-48" className="flex items-center min-h-[22px]">
          <select className={selectCls} value={form.decimal_places} onChange={setField("decimal_places")}>
            {[0, 1, 2, 3, 4].map(n => <option key={n} value={n}>{n}</option>)}
          </select>
        </FormRow>
      </div>

      {/* Footer */}
      <div className="border-t p-2 flex justify-between items-center bg-zinc-50">
        <button onClick={() => navigate("/master/create")} className="text-xs text-zinc-500 hover:text-zinc-800">
          &larr; Back to Masters
        </button>
        <button
          onClick={handleSubmit}
          disabled={loading}
          className="text-sm px-5 py-1 rounded bg-black text-white hover:bg-zinc-800 disabled:opacity-50 transition-colors font-medium"
        >
          {loading ? "Saving..." : "Create"}
        </button>
      </div>
    </div>
  );
}