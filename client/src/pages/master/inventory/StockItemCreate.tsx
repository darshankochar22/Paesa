import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useCompany } from "../../../context/CompanyContext";
import type { StockGroupType, UnitType } from "../../../types/api";

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

interface SidePanelProps {
  title: string;
  items: { id: string | number; label: string }[];
  selected: string;
  onSelect: (val: string) => void;
  onClose: () => void;
}

function SidePanel({ title, items, selected, onSelect, onClose }: SidePanelProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);

  return (
    <div
      ref={ref}
      className="absolute top-0 right-0 h-full w-64 bg-white border-l border-zinc-200 shadow-xl z-50 flex flex-col"
    >
      <div className="px-3 py-2 border-b border-zinc-200 flex justify-between items-center shrink-0">
        <span className="text-xs font-semibold text-zinc-600 tracking-wide uppercase">{title}</span>
        <button onClick={onClose} className="text-zinc-400 hover:text-zinc-700 text-xs">✕</button>
      </div>
      <div className="flex-1 overflow-y-auto">
        {items.map(item => (
          <div
            key={item.id}
            className={`px-3 py-2 text-sm cursor-pointer ${selected === String(item.id) ? "text-black font-semibold bg-zinc-100" : "text-zinc-700 hover:bg-zinc-50"}`}
            onClick={() => { onSelect(String(item.id)); onClose(); }}
          >
            {item.label}
          </div>
        ))}
        {items.length === 0 && (
          <div className="px-3 py-2 text-sm text-zinc-400">No items found</div>
        )}
      </div>
    </div>
  );
}

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
  name: "",
  alias: "",
  group_id: "",
  unit_id: "",
  gst_applicable: "Not Applicable",
  hsn_code: "",
  sac_code: "",
  gst_rate: "0",
  cgst_rate: "0",
  sgst_rate: "0",
  igst_rate: "0",
  type_of_supply: "Goods",
  rate_of_duty: "0",
  opening_quantity: "0",
  opening_rate: "0",
  reorder_level: "0",
  reorder_quantity: "0",
  track_batches: false,
  track_expiry: false,
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
  const gstSections  = form.gst_applicable !== "Not Applicable";

  useEffect(() => {
    const company_id = selectedCompany?.company_id;
    if (!company_id) return;
    window.api.stockGroup.getAll(company_id).then(r => {
      if (r.success) setStockGroups(r.stockGroups ?? []);
    });
    window.api.unit.getAll(company_id).then(r => {
      if (r.success) setUnits(r.units ?? []);
    });
  }, [selectedCompany]);

  const set = (key: keyof FormData) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm(f => ({ ...f, [key]: e.target.value }));

  const setCheck = (key: keyof FormData) =>
    (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm(f => ({ ...f, [key]: e.target.checked }));

  const handleGstChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val  = e.target.value;
    const half = val === "" ? "0" : String(parseFloat(val) / 2);
    setForm(f => ({ ...f, gst_rate: val, cgst_rate: half, sgst_rate: half }));
  };

  const validate = (): string | null => {
    if (!form.name.trim())            return "Name is required.";
    if (!selectedCompany?.company_id) return "No company selected.";
    if (!form.group_id)               return "Stock Group is required.";
    if (!form.unit_id)                return "Unit is required.";
    const gst  = Number(form.gst_rate);
    const cgst = Number(form.cgst_rate);
    const sgst = Number(form.sgst_rate);
    const igst = Number(form.igst_rate);
    if ([gst, cgst, sgst, igst].some(v => v < 0))   return "GST rates cannot be negative.";
    if ([gst, cgst, sgst, igst].some(v => v > 100)) return "GST rates cannot exceed 100%.";
    if (Number(form.opening_quantity) < 0)           return "Opening quantity cannot be negative.";
    if (Number(form.opening_rate) < 0)               return "Opening rate cannot be negative.";
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

  const selectedUnitLabel = form.unit_id
    ? units.find(u => String(u.unit_id) === form.unit_id)
        ? `${units.find(u => String(u.unit_id) === form.unit_id)!.name} (${units.find(u => String(u.unit_id) === form.unit_id)!.symbol})`
        : "— Select Unit —"
    : "— Select Unit —";

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
          <Row label="Name" required>
            <input autoFocus className={inputCls} value={form.name} onChange={set("name")} placeholder="Stock item name" />
          </Row>
          <Row label="Alias">
            <input className={inputCls} value={form.alias} onChange={set("alias")} placeholder="Short name (optional)" />
          </Row>
          <Row label="Under" required>
            <button
              type="button"
              onClick={() => setShowPanel("group")}
              className={`w-full text-left text-sm py-1 px-1 bg-transparent outline-none transition-colors hover:text-black dark:hover:text-white ${form.group_id ? "text-zinc-700 dark:text-zinc-300" : "text-zinc-400"}`}
            >
              {selectedGroupLabel}
            </button>
          </Row>
          <Row label="Unit" required>
            <button
              type="button"
              onClick={() => setShowPanel("unit")}
              className={`w-full text-left text-sm py-1 px-1 bg-transparent outline-none transition-colors hover:text-black dark:hover:text-white ${form.unit_id ? "text-zinc-700 dark:text-zinc-300" : "text-zinc-400"}`}
            >
              {selectedUnitLabel}
            </button>
          </Row>
          <Row label="Type of Supply">
            <select className={selectCls} value={form.type_of_supply} onChange={set("type_of_supply")}>
              <option value="Goods">Goods</option>
              <option value="Services">Services</option>
            </select>
          </Row>
        </div>

        {/* Opening Balance */}
        <div>
          <div className="text-xs uppercase tracking-widest text-zinc-500 mb-2">Opening Balance</div>
          <Row label="Opening Quantity">
            <input className={inputCls} type="number" min="0" step="0.01" value={form.opening_quantity} onChange={set("opening_quantity")} />
          </Row>
          <Row label="Opening Rate">
            <input className={inputCls} type="number" min="0" step="0.01" value={form.opening_rate} onChange={set("opening_rate")} />
          </Row>
          <Row label="Opening Value">
            <input
              className={`${inputCls} text-zinc-400 cursor-not-allowed`}
              readOnly
              value={openingValue}
              tabIndex={-1}
            />
          </Row>
        </div>

        {/* Reorder */}
        <div>
          <div className="text-xs uppercase tracking-widest text-zinc-500 mb-2">Reorder</div>
          <Row label="Reorder Level">
            <input className={inputCls} type="number" min="0" step="0.01" value={form.reorder_level} onChange={set("reorder_level")} />
          </Row>
          <Row label="Reorder Quantity">
            <input className={inputCls} type="number" min="0" step="0.01" value={form.reorder_quantity} onChange={set("reorder_quantity")} />
          </Row>
        </div>

        {/* Tracking */}
        <div>
          <div className="text-xs uppercase tracking-widest text-zinc-500 mb-2">Tracking</div>
          <Row label="Track Batches">
            <input type="checkbox" checked={form.track_batches} onChange={setCheck("track_batches")} className="cursor-pointer" />
          </Row>
          <Row label="Track Expiry">
            <input type="checkbox" checked={form.track_expiry} onChange={setCheck("track_expiry")} className="cursor-pointer" />
          </Row>
        </div>

        {/* HSN / SAC */}
        <div>
          <div className="text-xs uppercase tracking-widest text-zinc-500 mb-2">HSN / SAC</div>
          <Row label="GST Applicable">
            <select className={selectCls} value={form.gst_applicable} onChange={set("gst_applicable")}>
              <option value="Not Applicable">Not Applicable</option>
              <option value="Applicable">Applicable</option>
            </select>
          </Row>
          {gstSections && (
            <>
              <Row label="HSN Code">
                <input className={inputCls} value={form.hsn_code} onChange={set("hsn_code")} placeholder="e.g. 8517" />
              </Row>
              <Row label="SAC Code">
                <input className={inputCls} value={form.sac_code} onChange={set("sac_code")} placeholder="e.g. 998431" />
              </Row>
            </>
          )}
        </div>

        {/* GST Rates */}
        {gstSections && (
          <div>
            <div className="text-xs uppercase tracking-widest text-zinc-500 mb-2">GST Rates</div>
            <Row label="GST Rate (%)">
              <input className={inputCls} type="number" min="0" max="100" step="0.01" value={form.gst_rate} onChange={handleGstChange} />
            </Row>
            <Row label="CGST Rate (%)">
              <input className={inputCls} type="number" min="0" max="100" step="0.01" value={form.cgst_rate} onChange={set("cgst_rate")} />
            </Row>
            <Row label="SGST Rate (%)">
              <input className={inputCls} type="number" min="0" max="100" step="0.01" value={form.sgst_rate} onChange={set("sgst_rate")} />
            </Row>
            <Row label="IGST Rate (%)">
              <input className={inputCls} type="number" min="0" max="100" step="0.01" value={form.igst_rate} onChange={set("igst_rate")} />
            </Row>
            <Row label="Rate of Duty (%)">
              <input className={inputCls} type="number" min="0" max="100" step="0.01" value={form.rate_of_duty} onChange={set("rate_of_duty")} />
            </Row>
          </div>
        )}

      </div>

      {success && (
        <div className="px-6 py-2 border-t border-green-900 bg-green-950 text-green-400 text-sm shrink-0">
          ✓ {success}
        </div>
      )}

      {error && (
        <div className="px-6 py-2 border-t border-red-900 bg-red-950 text-red-400 text-sm flex justify-between items-center shrink-0">
          <span>⚠ {error}</span>
          <button onClick={() => setError(null)} className="text-xs ml-4 hover:opacity-70">dismiss</button>
        </div>
      )}

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

      {showPanel === "group" && (
        <SidePanel
          title="Stock Groups"
          items={stockGroups.map(g => ({ id: g.sg_id, label: g.name }))}
          selected={form.group_id}
          onSelect={val => setForm(f => ({ ...f, group_id: val }))}
          onClose={() => setShowPanel(null)}
        />
      )}

      {showPanel === "unit" && (
        <SidePanel
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