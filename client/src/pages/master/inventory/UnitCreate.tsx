import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useCompany } from "../../../context/CompanyContext";

function Row({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="flex items-center last:border-0 min-h-[32px]">
      <span className="w-56 text-sm text-zinc-400 shrink-0 py-1">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </span>
      <span className="text-zinc-600 mr-2">:</span>
      <div className="flex-1">{children}</div>
    </div>
  );
}

const inputCls = "w-full bg-transparent text-sm outline-none py-1 px-1 rounded-sm placeholder:text-zinc-400";
const selectCls = "w-full bg-transparent text-sm outline-none py-1 px-1 rounded-sm cursor-pointer";

interface FormData {
  name: string;
  symbol: string;
  formal_name: string;
  unit_type: "Simple" | "Compound";
  decimal_places: string;
  unit_quantity_code: string;
}

const INITIAL: FormData = {
  name: "",
  symbol: "",
  formal_name: "",
  unit_type: "Simple",
  decimal_places: "0",
  unit_quantity_code: "",
};

export default function UnitCreate() {
  const navigate = useNavigate();
  const { selectedCompany } = useCompany();
  const [form, setForm] = useState<FormData>(INITIAL);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const set = (key: keyof FormData) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm(f => ({ ...f, [key]: e.target.value }));

  const handleSubmit = async () => {
    if (!form.name.trim()) { setError("Name is required."); return; }
    if (!form.symbol.trim()) { setError("Symbol is required."); return; }
    if (!selectedCompany?.company_id) { setError("No company selected."); return; }

    setLoading(true); setError(null);
    try {
      const result = await window.api.unit.create({
        company_id: selectedCompany.company_id,
        name: form.name.trim(),
        symbol: form.symbol.trim(),
        formal_name: form.formal_name.trim() || form.name.trim(),
        unit_type: form.unit_type,
        decimal_places: Number(form.decimal_places) || 0,
        unit_quantity_code: form.unit_quantity_code.trim() || undefined,
      });

      if (result.success) {
        setSuccess(`Unit "${form.name}" created.`);
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
    <div className="flex flex-col h-full">

      <div className="px-6 py-3 flex items-center justify-between shrink-0">
        <span className="font-semibold text-base">Create Unit</span>
        <span className="text-xs text-zinc-500">Ctrl+A to accept &nbsp;|&nbsp; Esc to cancel</span>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-4 flex flex-col gap-6">

        <div>
          <div className="text-xs uppercase tracking-widest text-zinc-500 mb-2">General</div>
          <Row label="Name" required>
            <input autoFocus className={inputCls} value={form.name} onChange={set("name")} placeholder="e.g. Kilograms" />
          </Row>
          <Row label="Symbol" required>
            <input className={inputCls} value={form.symbol} onChange={set("symbol")} placeholder="e.g. Kg" />
          </Row>
          <Row label="Formal Name">
            <input className={inputCls} value={form.formal_name} onChange={set("formal_name")} placeholder="Defaults to name" />
          </Row>
        </div>

        <div>
          <div className="text-xs uppercase tracking-widest text-zinc-500 mb-2">Configuration</div>
          <Row label="Unit Type">
            <select className={selectCls} value={form.unit_type} onChange={set("unit_type")}>
              <option value="Simple">Simple</option>
              <option value="Compound">Compound</option>
            </select>
          </Row>
          <Row label="Decimal Places">
            <select className={selectCls} value={form.decimal_places} onChange={set("decimal_places")}>
              {[0, 1, 2, 3, 4].map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </Row>
          <Row label="Unit Quantity Code">
            <input className={inputCls} value={form.unit_quantity_code} onChange={set("unit_quantity_code")} placeholder="Optional (e.g. KGS)" />
          </Row>
        </div>

      </div>

      {success && (
        <div className="px-6 py-2 border-t border-green-900 bg-green-950 text-green-400 text-sm shrink-0">
          ✓ {success}
        </div>
      )}

      {error && (
        <div className="px-6 py-2 border-t border-red-900 bg-red-950 text-red-400 text-sm flex justify-between items-center shrink-0">
          <span>⚠ {error}</span>
          <button onClick={() => setError(null)} className="text-red-500 hover:text-red-300 text-xs ml-4">dismiss</button>
        </div>
      )}

      <div className="px-6 py-3 flex justify-end gap-3 shrink-0">
        <button
          onClick={() => navigate("/master/create")}
          className="text-sm px-4 py-1.5 rounded border text-zinc-600 hover:bg-zinc-100 transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={handleSubmit}
          disabled={loading}
          className="text-sm px-5 py-1.5 rounded bg-black text-white hover:bg-zinc-800 disabled:opacity-50 transition-colors font-medium"
        >
          {loading ? "Saving..." : "Accept"}
        </button>
      </div>

    </div>
  );
}