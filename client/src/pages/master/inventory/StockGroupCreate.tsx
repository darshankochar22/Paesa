import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useCompany } from "../../../context/CompanyContext";
import type { StockGroupType } from "../../../types/api";

function Row({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="flex items-center border-b last:border-0 min-h-[32px]">
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
  alias: string;
  parent_group_id: string;
  should_quantities_be_added: string;
  hsn_sac_code: string;
  hsn_sac_description: string;
  gst_rate: string;
  cgst_rate: string;
  sgst_rate: string;
}

const INITIAL: FormData = {
  name: "",
  alias: "",
  parent_group_id: "",
  should_quantities_be_added: "1",
  hsn_sac_code: "",
  hsn_sac_description: "",
  gst_rate: "0",
  cgst_rate: "0",
  sgst_rate: "0",
};

export default function StockGroupCreate() {
  const navigate = useNavigate();
  const { selectedCompany } = useCompany();
  const [form, setForm] = useState<FormData>(INITIAL);
  const [stockGroups, setStockGroups] = useState<StockGroupType[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    const company_id = selectedCompany?.company_id;
    if (!company_id) return;
    window.api.stockGroup.getAll(company_id).then(r => {
      if (r.success) setStockGroups(r.stockGroups ?? []);
    });
  }, [selectedCompany]);

  const set = (key: keyof FormData) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm(f => ({ ...f, [key]: e.target.value }));

  const handleGstChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    const half = val === "" ? "0" : String(parseFloat(val) / 2);
    setForm(f => ({ ...f, gst_rate: val, cgst_rate: half, sgst_rate: half }));
  };

  const validate = (): string | null => {
    if (!form.name.trim()) return "Name is required.";
    if (!selectedCompany?.company_id) return "No company selected.";
    const gst = Number(form.gst_rate);
    const cgst = Number(form.cgst_rate);
    const sgst = Number(form.sgst_rate);
    if (gst < 0 || cgst < 0 || sgst < 0) return "GST rates cannot be negative.";
    if (gst > 100 || cgst > 100 || sgst > 100) return "GST rates cannot exceed 100%.";
    return null;
  };

  const handleSubmit = useCallback(async () => {
    const validationError = validate();
    if (validationError) { setError(validationError); return; }

    setLoading(true); setError(null);
    try {
      const result = await window.api.stockGroup.create({
        company_id: selectedCompany!.company_id,
        name: form.name.trim(),
        alias: form.alias.trim() || undefined,
        parent_group_id: form.parent_group_id ? Number(form.parent_group_id) : undefined,
        should_quantities_be_added: Number(form.should_quantities_be_added),
        hsn_sac_code: form.hsn_sac_code.trim() || undefined,
        hsn_sac_description: form.hsn_sac_description.trim() || undefined,
        gst_rate: Number(form.gst_rate) || 0,
        cgst_rate: Number(form.cgst_rate) || 0,
        sgst_rate: Number(form.sgst_rate) || 0,
      });

      if (result.success) {
        const updated = await window.api.stockGroup.getAll(selectedCompany!.company_id!);
        if (updated.success) setStockGroups(updated.stockGroups ?? []);

        setSuccess(`Stock Group "${form.name}" created.`);
        setForm(INITIAL);
        setTimeout(() => setSuccess(null), 3000);
      } else {
        setError(result.error || "Failed to create stock group.");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unexpected error.");
    } finally {
      setLoading(false);
    }
  }, [form, selectedCompany]);

  // Keyboard shortcuts: Ctrl+A to accept, Esc to cancel
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        navigate("/master/stock-group");
      }
      if (e.ctrlKey && e.key === "a") {
        e.preventDefault();
        handleSubmit();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handleSubmit, navigate]);

  return (
    <div className="flex flex-col h-full">

      {/* Header */}
      <div className="px-6 py-3 flex items-center justify-between shrink-0">
        <span className="font-semibold text-base">Create Stock Group</span>
        <span className="text-xs text-zinc-500">Ctrl+A to accept &nbsp;|&nbsp; Esc to cancel</span>
      </div>

      {/* Form */}
      <div className="flex-1 overflow-y-auto px-6 py-4 flex flex-col gap-6">

        <div>
          <div className="text-xs uppercase tracking-widest text-zinc-500 mb-2">General</div>
          <Row label="Name" required>
            <input autoFocus className={inputCls} value={form.name} onChange={set("name")} placeholder="Stock group name" />
          </Row>
          <Row label="Alias">
            <input className={inputCls} value={form.alias} onChange={set("alias")} placeholder="Short name (optional)" />
          </Row>
          <Row label="Under">
            <select className={selectCls} value={form.parent_group_id} onChange={set("parent_group_id")}>
              <option value="">Primary</option>
              {stockGroups.map(g => (
                <option key={g.sg_id} value={g.sg_id}>{g.name}</option>
              ))}
            </select>
          </Row>
          <Row label="Should Quantities be Added">
            <select className={selectCls} value={form.should_quantities_be_added} onChange={set("should_quantities_be_added")}>
              <option value="1">Yes</option>
              <option value="0">No</option>
            </select>
          </Row>
        </div>

        <div>
          <div className="text-xs uppercase tracking-widest text-zinc-500 mb-2">HSN / SAC</div>
          <Row label="HSN / SAC Code">
            <input className={inputCls} value={form.hsn_sac_code} onChange={set("hsn_sac_code")} placeholder="e.g. 1001" />
          </Row>
          <Row label="Description">
            <input className={inputCls} value={form.hsn_sac_description} onChange={set("hsn_sac_description")} placeholder="HSN description (optional)" />
          </Row>
        </div>

        <div>
          <div className="text-xs uppercase tracking-widest text-zinc-500 mb-2">GST Rates</div>
          <Row label="GST Rate (%)">
            <input
              className={inputCls}
              type="number" min="0" max="100" step="0.01"
              value={form.gst_rate}
              onChange={handleGstChange}
            />
          </Row>
          <Row label="CGST Rate (%)">
            <input
              className={inputCls}
              type="number" min="0" max="100" step="0.01"
              value={form.cgst_rate}
              onChange={set("cgst_rate")}
            />
          </Row>
          <Row label="SGST Rate (%)">
            <input
              className={inputCls}
              type="number" min="0" max="100" step="0.01"
              value={form.sgst_rate}
              onChange={set("sgst_rate")}
            />
          </Row>
        </div>

      </div>

      {/* Success */}
      {success && (
        <div className="px-6 py-2 border-t border-green-900 bg-green-950 text-green-400 text-sm shrink-0">
          ✓ {success}
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="px-6 py-2 border-t border-red-900 bg-red-950 text-red-400 text-sm flex justify-between items-center shrink-0">
          <span>⚠ {error}</span>
          <button onClick={() => setError(null)} className="text-xs ml-4 hover:opacity-70">dismiss</button>
        </div>
      )}

      {/* Footer */}
      <div className="px-6 py-3 flex justify-end gap-3 shrink-0">
        <button
          onClick={() => navigate("/master/create")}
          className="text-sm px-4 py-1.5 rounded border text-zinc-600 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
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