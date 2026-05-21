import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useCompany } from "@/context/CompanyContext";
import type { UnitType } from "@/types/api";

function Row({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="flex items-center min-h-[32px]">
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

function SelectionPanel({
  units,
  onSelect,
  onCancel,
}: {
  units: UnitType[];
  onSelect: (u: UnitType) => void;
  onCancel: () => void;
}) {
  const [search, setSearch] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  const filtered = units.filter(u =>
    u.symbol.toLowerCase().includes(search.toLowerCase()) ||
    (u.formal_name && u.formal_name.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="flex flex-col h-full bg-white select-none">
      <div className="px-6 py-3 flex items-center justify-between shrink-0 border-b border-zinc-100">
        <span className="font-semibold text-base text-zinc-800">Alter Unit</span>
        <span className="text-xs text-zinc-500">Esc to cancel</span>
      </div>

      <div className="px-6 py-3 shrink-0">
        <div className="text-xs uppercase tracking-widest text-zinc-500 mb-2">Select Unit to Alter</div>
        <input
          ref={inputRef}
          className="w-full text-sm bg-transparent border-b border-zinc-300 outline-none py-1 placeholder:text-zinc-400"
          placeholder="Search units..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      <div className="flex-1 overflow-y-auto px-6">
        {filtered.length === 0 && (
          <div className="text-sm text-zinc-400 py-4 text-center">No units found</div>
        )}
        {filtered.map(u => (
          <div
            key={u.unit_id}
            onClick={() => onSelect(u)}
            className="py-2.5 text-sm text-zinc-700 hover:text-black cursor-pointer border-b border-zinc-100 last:border-0 hover:bg-zinc-50/50 px-2 rounded-sm transition-colors flex justify-between items-center"
          >
            <div>
              <span className="font-bold text-zinc-950 mr-3">{u.symbol}</span>
              <span className="text-zinc-500 text-xs">{u.formal_name}</span>
            </div>
            <span className="text-[10px] bg-zinc-100 text-zinc-400 px-1.5 py-0.5 rounded font-mono font-medium">
              {u.unit_type || "Simple"}
            </span>
          </div>
        ))}
      </div>

      <div className="px-6 py-3 flex justify-end shrink-0 border-t border-zinc-100 bg-zinc-50/50">
        <button
          onClick={onCancel}
          className="text-sm px-4 py-1.5 rounded border border-zinc-200 bg-white shadow-sm text-zinc-600 hover:bg-zinc-50 transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

interface FormData {
  unit_type: "Simple" | "Compound";
  symbol: string;
  formal_name: string;
  decimal_places: string;
  unit_quantity_code: string;
}

export default function UnitAlter() {
  const navigate = useNavigate();
  const location = useLocation();
  const { selectedCompany } = useCompany();

  const [units, setUnits] = useState<UnitType[]>([]);
  const [selectedUnit, setSelectedUnit] = useState<UnitType | null>(null);
  const [form, setForm] = useState<FormData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const fetchUnitsList = useCallback(async () => {
    const company_id = selectedCompany?.company_id;
    if (!company_id) return;
    try {
      const r = await window.api.unit.getAll(company_id);
      if (r.success) setUnits(r.units ?? []);
    } catch (err) {
      console.error(err);
    }
  }, [selectedCompany]);

  useEffect(() => {
    fetchUnitsList();
  }, [fetchUnitsList]);

  const handleSelectUnit = useCallback((u: UnitType) => {
    setSelectedUnit(u);
    setForm({
      unit_type: (u.unit_type as "Simple" | "Compound") || "Simple",
      symbol: u.symbol ?? "",
      formal_name: u.formal_name ?? "",
      decimal_places: String(u.decimal_places ?? 0),
      unit_quantity_code: u.unit_quantity_code ?? "",
    });
    setError(null);
    setSuccess(null);
  }, []);

  // Pre-load from navigation state if unitId is present
  useEffect(() => {
    const passedUnitId = location.state?.unitId;
    if (passedUnitId && units.length > 0) {
      const match = units.find(u => u.unit_id === passedUnitId);
      if (match) {
        handleSelectUnit(match);
      }
    }
  }, [passedUnitId => passedUnitId, units, handleSelectUnit, location.state]);

  const set = (key: keyof FormData) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm(f => f ? { ...f, [key]: e.target.value } : f);

  const validate = (): string | null => {
    if (!form?.symbol.trim()) return "Symbol is required.";
    if (!selectedCompany?.company_id) return "No company selected.";
    return null;
  };

  const handleSubmit = useCallback(async () => {
    if (!form || !selectedUnit) return;
    const validationError = validate();
    if (validationError) { setError(validationError); return; }

    setLoading(true); setError(null);
    try {
      const result = await window.api.unit.update({
        unit_id: selectedUnit.unit_id,
        company_id: selectedCompany!.company_id,
        name: form.symbol.trim(), // Use symbol as name
        symbol: form.symbol.trim(),
        formal_name: form.formal_name.trim() || form.symbol.trim(),
        unit_type: form.unit_type,
        decimal_places: Number(form.decimal_places) || 0,
        unit_quantity_code: form.unit_quantity_code.trim() || null,
      });

      if (result.success) {
        await fetchUnitsList();
        setSuccess(`Unit "${form.symbol}" updated.`);
        setTimeout(() => {
          setSuccess(null);
          setSelectedUnit(null);
          setForm(null);
          // If we came from navigation state, head back
          if (location.state?.unitId) {
            navigate("/master/coa/unit");
          }
        }, 1500);
      } else {
        setError(result.error || "Failed to update unit.");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unexpected error.");
    } finally {
      setLoading(false);
    }
  }, [form, selectedUnit, selectedCompany, fetchUnitsList, location.state, navigate]);

  const handleDelete = useCallback(async () => {
    if (!selectedUnit) return;
    if (!window.confirm(`Delete unit "${selectedUnit.symbol}"? This cannot be undone.`)) return;

    setLoading(true); setError(null);
    try {
      const result = await window.api.unit.delete(selectedUnit.unit_id!);
      if (result.success) {
        await fetchUnitsList();
        setSelectedUnit(null);
        setForm(null);
        if (location.state?.unitId) {
          navigate("/master/coa/unit");
        }
      } else {
        setError(result.error || "Failed to delete unit.");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unexpected error.");
    } finally {
      setLoading(false);
    }
  }, [selectedUnit, fetchUnitsList, location.state, navigate]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (selectedUnit) {
          setSelectedUnit(null);
          setForm(null);
          if (location.state?.unitId) {
            navigate("/master/coa/unit");
          }
          return;
        }
        navigate("/master/alter");
      }
      if (e.ctrlKey && e.key === "a") { e.preventDefault(); handleSubmit(); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handleSubmit, navigate, selectedUnit, location.state]);

  if (!selectedUnit || !form) {
    return (
      <SelectionPanel
        units={units.filter(u => !u.is_predefined)}
        onSelect={handleSelectUnit}
        onCancel={() => navigate("/master/alter")}
      />
    );
  }

  return (
    <div className="flex flex-col h-full relative overflow-hidden bg-white select-none">
      <div className="px-6 py-3 flex items-center justify-between shrink-0 border-b border-zinc-100">
        <span className="font-semibold text-base text-zinc-800">Alter Unit: <span className="font-bold text-black font-mono">{selectedUnit.symbol}</span></span>
        <span className="text-xs text-zinc-500">Ctrl+A to accept &nbsp;|&nbsp; Esc to go back</span>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-5 flex flex-col gap-6">
        <div>
          <div className="text-xs uppercase tracking-widest text-zinc-400 font-bold mb-3">Unit Details</div>
          
          <Row label="Type">
            <select className={selectCls} value={form.unit_type} onChange={set("unit_type")}>
              <option value="Simple">Simple</option>
              <option value="Compound">Compound</option>
            </select>
          </Row>

          <Row label="Symbol" required>
            <input autoFocus className={inputCls} value={form.symbol} onChange={set("symbol")} placeholder="e.g. Kg" />
          </Row>

          <Row label="Formal Name">
            <input className={inputCls} value={form.formal_name} onChange={set("formal_name")} placeholder="e.g. Kilogram (optional)" />
          </Row>

          <Row label="Number of Decimal Places">
            <select className={selectCls} value={form.decimal_places} onChange={set("decimal_places")}>
              {[0, 1, 2, 3, 4].map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </Row>

          <Row label="Unit Quantity Code (UQC)">
            <input className={inputCls} value={form.unit_quantity_code} onChange={set("unit_quantity_code")} placeholder="e.g. KGS-KILOGRAMS (optional)" />
          </Row>
        </div>
      </div>

      {success && (
        <div className="px-6 py-2 border-t border-green-900 bg-green-950 text-green-400 text-sm shrink-0 font-medium">
          ✓ {success}
        </div>
      )}

      {error && (
        <div className="px-6 py-2 border-t border-red-900 bg-red-950 text-red-400 text-sm flex justify-between items-center shrink-0 font-medium">
          <span>⚠ {error}</span>
          <button onClick={() => setError(null)} className="text-xs ml-4 hover:opacity-70 font-bold font-mono">✕</button>
        </div>
      )}

      <div className="px-6 py-3 flex justify-between items-center shrink-0 border-t border-zinc-100 bg-zinc-50/50">
        <button
          onClick={handleDelete}
          disabled={loading}
          className="text-sm px-4 py-1.5 rounded border border-red-200 text-red-500 hover:bg-red-50 hover:border-red-300 disabled:opacity-50 transition-colors font-medium"
        >
          Delete
        </button>
        <div className="flex gap-3">
          <button
            onClick={() => {
              setSelectedUnit(null);
              setForm(null);
              if (location.state?.unitId) {
                navigate("/master/coa/unit");
              }
            }}
            className="text-sm px-4 py-1.5 rounded border border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50 shadow-sm transition-colors"
          >
            Back
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="text-sm px-5 py-1.5 rounded bg-black text-white hover:bg-zinc-800 disabled:opacity-50 shadow-sm transition-colors font-medium"
          >
            {loading ? "Saving..." : "Accept"}
          </button>
        </div>
      </div>
    </div>
  );
}
