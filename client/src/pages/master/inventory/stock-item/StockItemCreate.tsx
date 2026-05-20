import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useCompany } from "@/context/CompanyContext";
import FormRow from "@/components/ui/FormRow";
import SideSelectionPanel from "@/components/ui/SideSelectionPanel";
import type { StockGroupType, UnitType } from "@/types/api";

const inputCls = "w-full bg-transparent text-sm outline-none py-1 px-1 rounded-sm placeholder:text-zinc-400";
const selectCls = "w-full bg-transparent text-sm outline-none py-1 px-1 rounded-sm cursor-pointer";

interface FormData {
  name: string;
  alias: string;
  group_id: string;
  unit_id: string;
  gst_applicable: string;
  hsn_code: string;
  sac_code: string;
  gst_rate: string;
  cgst_rate: string;
  sgst_rate: string;
  igst_rate: string;
  type_of_supply: string;
  rate_of_duty: string;
  opening_quantity: string;
  opening_rate: string;
  reorder_level: string;
  reorder_quantity: string;
  track_batches: boolean;
  track_expiry: boolean;
}

const INITIAL: FormData = {
  name: "", alias: "", group_id: "", unit_id: "",
  gst_applicable: "Not Applicable", hsn_code: "", sac_code: "",
  gst_rate: "0", cgst_rate: "0", sgst_rate: "0", igst_rate: "0",
  type_of_supply: "Goods", rate_of_duty: "0",
  opening_quantity: "0", opening_rate: "0",
  reorder_level: "0", reorder_quantity: "0",
  track_batches: false, track_expiry: false,
};

type PanelType = "group" | "unit" | null;

export default function StockItemCreate() {
  const navigate = useNavigate();
  const { selectedCompany } = useCompany();
  const [form, setForm] = useState<FormData>(INITIAL);
  const [stockGroups, setStockGroups] = useState<StockGroupType[]>([]);
  const [units, setUnits] = useState<UnitType[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showPanel, setShowPanel] = useState<PanelType>(null);

  const openingValue = (parseFloat(form.opening_quantity) || 0) * (parseFloat(form.opening_rate) || 0);
  const gstSections = form.gst_applicable !== "Not Applicable";

  useEffect(() => {
    const company_id = selectedCompany?.company_id;
    if (!company_id) return;
    window.api.stockGroup.getAll(company_id).then(r => { if (r.success) setStockGroups(r.stockGroups ?? []); });
    window.api.unit.getAll(company_id).then(r => { if (r.success) setUnits(r.units ?? []); });
  }, [selectedCompany]);

  const set = (key: keyof FormData) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm(f => ({ ...f, [key]: e.target.value }));

  const setCheck = (key: keyof FormData) =>
    (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm(f => ({ ...f, [key]: e.target.checked }));

  const handleGstChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    const half = val === "" ? "0" : String(parseFloat(val) / 2);
    setForm(f => ({ ...f, gst_rate: val, cgst_rate: half, sgst_rate: half }));
  };

  const validate = (): string | null => {
    if (!form.name.trim()) return "Name is required.";
    if (!selectedCompany?.company_id) return "No company selected.";
    if (!form.group_id) return "Stock Group is required.";
    if (!form.unit_id) return "Unit is required.";
    const rates = [form.gst_rate, form.cgst_rate, form.sgst_rate, form.igst_rate].map(Number);
    if (rates.some(v => v < 0)) return "GST rates cannot be negative.";
    if (rates.some(v => v > 100)) return "GST rates cannot exceed 100%.";
    if (Number(form.opening_quantity) < 0) return "Opening quantity cannot be negative.";
    if (Number(form.opening_rate) < 0) return "Opening rate cannot be negative.";
    return null;
  };

  const handleSubmit = useCallback(async () => {
    const validationError = validate();
    if (validationError) { setError(validationError); return; }
    setLoading(true); setError(null);
    try {
      const result = await window.api.stockItem.create({
        company_id:       selectedCompany!.company_id,
        name:             form.name.trim(),
        alias:            form.alias.trim()    || undefined,
        group_id:         form.group_id        ? Number(form.group_id)  : undefined,
        unit_id:          form.unit_id         ? Number(form.unit_id)   : undefined,
        gst_applicable:   form.gst_applicable,
        hsn_code:         form.hsn_code.trim() || undefined,
        sac_code:         form.sac_code.trim() || undefined,
        gst_rate:         Number(form.gst_rate)         || 0,
        cgst_rate:        Number(form.cgst_rate)        || 0,
        sgst_rate:        Number(form.sgst_rate)        || 0,
        igst_rate:        Number(form.igst_rate)        || 0,
        type_of_supply:   form.type_of_supply,
        rate_of_duty:     Number(form.rate_of_duty)     || 0,
        opening_quantity: Number(form.opening_quantity) || 0,
        opening_rate:     Number(form.opening_rate)     || 0,
        reorder_level:    Number(form.reorder_level)    || 0,
        reorder_quantity: Number(form.reorder_quantity) || 0,
        track_batches:    form.track_batches ? 1 : 0,
        track_expiry:     form.track_expiry  ? 1 : 0,
      });
      if (result.success) {
        setSuccess(`Stock Item "${form.name}" created.`);
        setForm(INITIAL);
        setTimeout(() => setSuccess(null), 3000);
      } else {
        setError(result.error || "Failed to create stock item.");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unexpected error.");
    } finally {
      setLoading(false);
    }
  }, [form, selectedCompany]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") { if (showPanel) setShowPanel(null); else navigate("/master/stock-item"); }
      if (e.ctrlKey && e.key === "a") { e.preventDefault(); handleSubmit(); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handleSubmit, navigate, showPanel]);

  const selectedGroupLabel = form.group_id
    ? stockGroups.find(g => String(g.sg_id) === form.group_id)?.name ?? "— Select Group —"
    : "— Select Group —";

  const selectedUnitLabel = (() => {
    if (!form.unit_id) return "— Select Unit —";
    const u = units.find(u => String(u.unit_id) === form.unit_id);
    return u ? `${u.name} (${u.symbol})` : "— Select Unit —";
  })();

  return (
    <div className="flex flex-col h-full relative overflow-hidden">
      <div className="px-6 py-3 flex items-center justify-between shrink-0">
        <span className="font-semibold text-base">Create Stock Item</span>
        <span className="text-xs text-zinc-500">Ctrl+A to accept &nbsp;|&nbsp; Esc to cancel</span>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-4 flex flex-col gap-6">

        {/* General */}
        <div>
          <div className="text-xs uppercase tracking-widest text-zinc-500 mb-2">General</div>
          <FormRow label="Name" required>
            <input autoFocus className={inputCls} value={form.name} onChange={set("name")} placeholder="Stock item name" />
          </FormRow>
          <FormRow label="Alias">
            <input className={inputCls} value={form.alias} onChange={set("alias")} placeholder="Short name (optional)" />
          </FormRow>
          <FormRow label="Under" required>
            <button
              type="button"
              onClick={() => setShowPanel("group")}
              className={`w-full text-left text-sm py-1 px-1 bg-transparent outline-none transition-colors hover:text-black ${form.group_id ? "text-zinc-700" : "text-zinc-400"}`}
            >
              {selectedGroupLabel}
            </button>
          </FormRow>
          <FormRow label="Unit" required>
            <button
              type="button"
              onClick={() => setShowPanel("unit")}
              className={`w-full text-left text-sm py-1 px-1 bg-transparent outline-none transition-colors hover:text-black ${form.unit_id ? "text-zinc-700" : "text-zinc-400"}`}
            >
              {selectedUnitLabel}
            </button>
          </FormRow>
          <FormRow label="Type of Supply">
            <select className={selectCls} value={form.type_of_supply} onChange={set("type_of_supply")}>
              <option value="Goods">Goods</option>
              <option value="Services">Services</option>
            </select>
          </FormRow>
        </div>

        {/* Opening Balance */}
        <div>
          <div className="text-xs uppercase tracking-widest text-zinc-500 mb-2">Opening Balance</div>
          <FormRow label="Opening Quantity">
            <input className={inputCls} type="number" min="0" step="0.01" value={form.opening_quantity} onChange={set("opening_quantity")} />
          </FormRow>
          <FormRow label="Opening Rate">
            <input className={inputCls} type="number" min="0" step="0.01" value={form.opening_rate} onChange={set("opening_rate")} />
          </FormRow>
          <FormRow label="Opening Value">
            <input className={`${inputCls} text-zinc-400 cursor-not-allowed`} readOnly value={openingValue} tabIndex={-1} />
          </FormRow>
        </div>

        {/* Reorder */}
        <div>
          <div className="text-xs uppercase tracking-widest text-zinc-500 mb-2">Reorder</div>
          <FormRow label="Reorder Level">
            <input className={inputCls} type="number" min="0" step="0.01" value={form.reorder_level} onChange={set("reorder_level")} />
          </FormRow>
          <FormRow label="Reorder Quantity">
            <input className={inputCls} type="number" min="0" step="0.01" value={form.reorder_quantity} onChange={set("reorder_quantity")} />
          </FormRow>
        </div>

        {/* Tracking */}
        <div>
          <div className="text-xs uppercase tracking-widest text-zinc-500 mb-2">Tracking</div>
          <FormRow label="Track Batches">
            <input type="checkbox" checked={form.track_batches} onChange={setCheck("track_batches")} className="cursor-pointer" />
          </FormRow>
          <FormRow label="Track Expiry">
            <input type="checkbox" checked={form.track_expiry} onChange={setCheck("track_expiry")} className="cursor-pointer" />
          </FormRow>
        </div>

        {/* HSN / SAC */}
        <div>
          <div className="text-xs uppercase tracking-widest text-zinc-500 mb-2">HSN / SAC</div>
          <FormRow label="GST Applicable">
            <select className={selectCls} value={form.gst_applicable} onChange={set("gst_applicable")}>
              <option value="Not Applicable">Not Applicable</option>
              <option value="Applicable">Applicable</option>
            </select>
          </FormRow>
          {gstSections && (
            <>
              <FormRow label="HSN Code">
                <input className={inputCls} value={form.hsn_code} onChange={set("hsn_code")} placeholder="e.g. 8517" />
              </FormRow>
              <FormRow label="SAC Code">
                <input className={inputCls} value={form.sac_code} onChange={set("sac_code")} placeholder="e.g. 998431" />
              </FormRow>
            </>
          )}
        </div>

        {/* GST Rates */}
        {gstSections && (
          <div>
            <div className="text-xs uppercase tracking-widest text-zinc-500 mb-2">GST Rates</div>
            <FormRow label="GST Rate (%)">
              <input className={inputCls} type="number" min="0" max="100" step="0.01" value={form.gst_rate} onChange={handleGstChange} />
            </FormRow>
            <FormRow label="CGST Rate (%)">
              <input className={inputCls} type="number" min="0" max="100" step="0.01" value={form.cgst_rate} onChange={set("cgst_rate")} />
            </FormRow>
            <FormRow label="SGST Rate (%)">
              <input className={inputCls} type="number" min="0" max="100" step="0.01" value={form.sgst_rate} onChange={set("sgst_rate")} />
            </FormRow>
            <FormRow label="IGST Rate (%)">
              <input className={inputCls} type="number" min="0" max="100" step="0.01" value={form.igst_rate} onChange={set("igst_rate")} />
            </FormRow>
            <FormRow label="Rate of Duty (%)">
              <input className={inputCls} type="number" min="0" max="100" step="0.01" value={form.rate_of_duty} onChange={set("rate_of_duty")} />
            </FormRow>
          </div>
        )}
      </div>

      {success && (
        <div className="px-6 py-2 border-t border-green-900 bg-green-950 text-green-400 text-sm shrink-0">✓ {success}</div>
      )}
      {error && (
        <div className="px-6 py-2 border-t border-red-900 bg-red-950 text-red-400 text-sm flex justify-between items-center shrink-0">
          <span>⚠ {error}</span>
          <button onClick={() => setError(null)} className="text-xs ml-4 hover:opacity-70">dismiss</button>
        </div>
      )}

      <div className="px-6 py-3 flex justify-end gap-3 shrink-0">
        <button onClick={() => navigate("/master/create")} className="text-sm px-4 py-1.5 rounded border text-zinc-600 hover:bg-zinc-100 transition-colors">
          Cancel
        </button>
        <button onClick={handleSubmit} disabled={loading} className="text-sm px-5 py-1.5 rounded bg-black text-white hover:bg-zinc-800 disabled:opacity-50 transition-colors font-medium">
          {loading ? "Saving..." : "Accept"}
        </button>
      </div>

      {showPanel === "group" && (
        <SideSelectionPanel
          title="Stock Groups"
          items={stockGroups.map(g => ({ id: g.sg_id, label: g.name }))}
          selected={form.group_id}
          onSelect={val => setForm(f => ({ ...f, group_id: val }))}
          onClose={() => setShowPanel(null)}
        />
      )}
      {showPanel === "unit" && (
        <SideSelectionPanel
          title="Units"
          items={units.map(u => ({ id: u.unit_id, label: `${u.name} (${u.symbol})` }))}
          selected={form.unit_id}
          onSelect={val => setForm(f => ({ ...f, unit_id: val }))}
          onClose={() => setShowPanel(null)}
        />
      )}
    </div>
  );
}