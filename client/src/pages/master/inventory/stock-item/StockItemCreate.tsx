import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useCompany } from "@/context/CompanyContext";
import type { StockGroupType, UnitType } from "@/types/api";
import { loadFormState, saveFormState, clearFormState } from "@/utils/formPersistence";


interface BomEntry {
  bomName: string;
  unitOfManufacture: string;
  items: { item: string; quantity: string }[];
}

interface FormData {
  name: string;
  alias: string;
  group_id: string;
  unit_id: string;
  gst_applicable: "Applicable" | "Not Applicable";
  hsn_sac: string;
  source_of_hsn: string;
  hsn_sac_description: string;
  gst_rate_details: string;
  source_of_gst_rate: string;
  taxability_type: string;
  gst_rate: string;
  type_of_supply: "Goods" | "Services";
  rate_of_duty: string;
  has_bom: boolean;
  bom_name: string;
  opening_quantity: string;
  opening_rate: string;
}

const INITIAL: FormData = {
  name: "", alias: "", group_id: "", unit_id: "",
  gst_applicable: "Applicable",
  hsn_sac: "",
  source_of_hsn: "As per Company/Stock Group",
  hsn_sac_description: "",
  gst_rate_details: "",
  source_of_gst_rate: "As per Company/Stock Group",
  taxability_type: "",
  gst_rate: "0",
  type_of_supply: "Goods",
  rate_of_duty: "0",
  has_bom: false, bom_name: "",
  opening_quantity: "", opening_rate: "",
};

const SOURCE_OPTIONS = [
  "As per Company/Stock Group",
  "Specify Details Here",
  "Use GST Classification",
];


function SourceDropdown({
  value,
  options,
  onChange,
}: {
  value: string;
  options: string[];
  onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);


  const display = value.length > 22 ? value.slice(0, 22) + "..." : value;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        className="text-xs text-zinc-700 text-left bg-transparent outline-none w-full hover:text-zinc-900"
        onClick={() => setOpen(o => !o)}
      >
        {display}
      </button>
      {open && (
        <div className="absolute left-0 top-full z-50 bg-white border border-zinc-300 shadow-lg w-56">
          <div className="bg-zinc-800 text-white text-xs px-3 py-1 flex items-center justify-between">
            <span>List of Actions</span>
            <span className="text-zinc-400 text-[10px]">Show More</span>
          </div>
          {options.map((opt) => (
            <div
              key={opt}
              className={`px-3 py-1 text-xs cursor-pointer ${
                opt === value
                  ? "bg-yellow-200 text-zinc-900 font-medium"
                  : "hover:bg-zinc-100 text-zinc-700"
              }`}
              onClick={() => { onChange(opt); setOpen(false); }}
            >
              {opt}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// LIST OF UNITS / GROUPS side panel
// ─────────────────────────────────────────────────────────────────────────────
function ListSidePanel({
  title,
  items,
  selected,
  onSelect,
  onClose,
  primaryLabel = "Not Applicable",
  showCreate = false,
  onCreateNew,
}: {
  title: string;
  items: { id: string; label: string }[];
  selected: string;
  onSelect: (id: string) => void;
  onClose: () => void;
  primaryLabel?: string;
  showCreate?: boolean;
  onCreateNew?: () => void;
}) {
  const [search, setSearch] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => { inputRef.current?.focus(); }, []);

  const filtered = items.filter(i =>
    i.label.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="w-52 border-l border-zinc-300 flex flex-col bg-white shrink-0">
      {/* Title */}
      <div className="bg-zinc-800 text-white text-xs px-3 py-1.5 font-medium">{title}</div>
      {/* Search */}
      <input
        ref={inputRef}
        className="px-3 py-1.5 text-xs outline-none border-b border-zinc-200 placeholder-zinc-400"
        placeholder="Search..."
        value={search}
        onChange={e => setSearch(e.target.value)}
        onKeyDown={e => {
          if (e.key === "Escape") onClose();
          if (e.key === "Enter" && filtered.length > 0) { onSelect(filtered[0].id); onClose(); }
        }}
      />
      {/* Items */}
      <div className="flex-1 overflow-y-auto">
        {/* Primary / Not Applicable */}
        <div
          className={`flex items-center px-3 py-1 text-xs cursor-pointer border-b border-zinc-100 ${
            !selected ? "bg-yellow-100 font-medium" : "hover:bg-zinc-50"
          }`}
          onClick={() => { onSelect(""); onClose(); }}
        >
          <span className="text-zinc-800 mr-1">♦</span>
          <span className="text-zinc-800">{primaryLabel}</span>
        </div>
        {/* Create New */}
        {showCreate && (
          <div
            className="flex items-center px-3 py-1 text-xs cursor-pointer border-b border-zinc-100 hover:bg-zinc-50"
            onClick={() => { onCreateNew?.(); onClose(); }}
          >
            <span className="text-blue-600 mr-1">✦</span>
            <span className="text-blue-600 font-medium">Create New</span>
          </div>
        )}
        {/* List */}
        {filtered.map(item => (
          <div
            key={item.id}
            className={`px-3 py-1 text-xs cursor-pointer border-b border-zinc-100 ${
              selected === item.id ? "bg-yellow-100 font-medium text-zinc-900" : "hover:bg-zinc-50 text-zinc-800"
            }`}
            onClick={() => { onSelect(item.id); onClose(); }}
          >
            {item.label}
          </div>
        ))}
      </div>
      {/* Footer */}
      <div className="border-t border-zinc-200 px-3 py-1.5">
        <button onClick={onClose} className="text-xs text-zinc-500 hover:text-zinc-800">Esc: Close</button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// BOM LIST MODAL
// ─────────────────────────────────────────────────────────────────────────────
function BomListModal({
  stockItemName, existingBoms, onSelectBom, onClose,
}: {
  stockItemName: string; existingBoms: string[];
  onSelectBom: (name: string) => void; onClose: () => void;
}) {
  const [newName, setNewName] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => { inputRef.current?.focus(); }, []);
  const accept = () => { if (newName.trim()) onSelectBom(newName.trim()); };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20"
      onKeyDown={e => {
        if (e.key === "Escape") { e.preventDefault(); onClose(); }
        if (e.key === "Enter") { e.preventDefault(); accept(); }
      }}>
      <div className="bg-white border border-zinc-400 w-60 flex flex-col shadow-xl">
        <div className="text-center text-sm font-medium text-zinc-900 pt-3 pb-2 px-3 border-b border-zinc-300 bg-zinc-50">
          BOM List of: <span className="font-bold">{stockItemName}</span>
        </div>
        <div className="px-3 py-1 border-b border-zinc-200 bg-zinc-100">
          <span className="text-xs font-bold text-zinc-700 uppercase tracking-wider">Name of BOM</span>
        </div>
        <div className="flex-1 overflow-y-auto" style={{ minHeight: 100 }}>
          {existingBoms.map((b, i) => (
            <div key={i} className="px-3 py-0.5 text-sm cursor-pointer hover:bg-zinc-100 border-b border-zinc-100"
              onClick={() => onSelectBom(b)}>{b}</div>
          ))}
          <input ref={inputRef}
            className="w-full px-3 py-1 text-sm outline-none bg-yellow-50 border-b border-zinc-200"
            value={newName} onChange={e => setNewName(e.target.value)} placeholder="Type new BOM name..." />
        </div>
        <div className="border-t border-zinc-300 flex text-xs bg-zinc-50">
          <button onClick={onClose} className="flex-1 py-1.5 border-r border-zinc-300 hover:bg-zinc-100 text-left px-3">
            <span className="font-bold">Q</span>: Quit</button>
          <button onClick={accept} className="flex-1 py-1.5 hover:bg-zinc-100 text-left px-3">
            <span className="font-bold">A</span>: Accept</button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// BOM COMPONENTS MODAL
// ─────────────────────────────────────────────────────────────────────────────
function BomComponentsModal({
  bomName, stockItemName, onClose, onAccept,
}: {
  bomName: string; stockItemName: string;
  onClose: () => void; onAccept: (entry: BomEntry) => void;
}) {
  const [unitOfManufacture, setUnitOfManufacture] = useState("");
  const [items, setItems] = useState([
    { item: "", quantity: "" }, { item: "", quantity: "" }, { item: "", quantity: "" },
  ]);
  const unitRef = useRef<HTMLInputElement>(null);
  useEffect(() => { unitRef.current?.focus(); }, []);
  const updateItem = (i: number, key: "item" | "quantity", v: string) =>
    setItems(prev => prev.map((x, j) => j === i ? { ...x, [key]: v } : x));
  const accept = () =>
    onAccept({ bomName, unitOfManufacture, items: items.filter(r => r.item.trim()) });
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20"
      onKeyDown={e => {
        if (e.key === "Escape") { e.preventDefault(); onClose(); }
        if (e.altKey && e.key.toLowerCase() === "a") { e.preventDefault(); accept(); }
      }}>
      <div className="bg-white border border-zinc-400 w-96 flex flex-col shadow-xl">
        <div className="px-4 pt-3 pb-2 border-b border-zinc-200 bg-zinc-50 space-y-0.5">
          {[["BoM Name", bomName], ["Components of", stockItemName]].map(([l, v]) => (
            <div key={l} className="flex items-center min-h-[22px] text-sm">
              <span className="w-40 text-zinc-600 shrink-0">{l}</span>
              <span className="text-zinc-400 mr-2">:</span>
              <span className="font-semibold text-zinc-900">{v}</span>
            </div>
          ))}
          <div className="flex items-center min-h-[22px] text-sm">
            <span className="w-40 text-zinc-600 shrink-0">Unit of manufacture</span>
            <span className="text-zinc-400 mr-2">:</span>
            <input ref={unitRef}
              className="flex-1 border-b border-zinc-400 bg-yellow-50 px-0 py-0 text-sm outline-none"
              value={unitOfManufacture} onChange={e => setUnitOfManufacture(e.target.value)} />
          </div>
        </div>
        <div className="flex items-center border-b border-zinc-300 px-4 py-1 bg-zinc-100">
          <span className="flex-1 text-xs font-bold text-zinc-700">Item</span>
          <span className="w-28 text-xs font-bold text-zinc-700 text-right">Quantity</span>
        </div>
        <div className="flex-1 overflow-y-auto" style={{ minHeight: 100 }}>
          {items.map((r, i) => (
            <div key={i} className="flex items-center border-b border-zinc-100">
              <input className="flex-1 px-4 py-0.5 text-sm outline-none bg-transparent hover:bg-zinc-50 focus:bg-yellow-50 border-r border-zinc-200"
                value={r.item} onChange={e => updateItem(i, "item", e.target.value)}
                onKeyDown={e => { if (e.key === "Tab" && !e.shiftKey && i === items.length - 1) setItems(prev => [...prev, { item: "", quantity: "" }]); }} />
              <input className="w-28 px-2 py-0.5 text-sm outline-none bg-transparent text-right hover:bg-zinc-50 focus:bg-yellow-50 tabular-nums"
                value={r.quantity} onChange={e => updateItem(i, "quantity", e.target.value)} />
            </div>
          ))}
        </div>
        <div className="border-t border-zinc-300 flex text-xs bg-zinc-50">
          <button onClick={onClose} className="flex-1 py-1.5 border-r border-zinc-300 hover:bg-zinc-100 text-left px-3"><span className="font-bold">Q</span>: Quit</button>
          <button onClick={accept} className="flex-1 py-1.5 hover:bg-zinc-100 text-left px-3"><span className="font-bold">A</span>: Accept</button>
        </div>
      </div>
    </div>
  );
}


export default function StockItemCreate() {
  const navigate = useNavigate();
  const { selectedCompany } = useCompany();
  const companyId = selectedCompany?.company_id;
  const persistKey = companyId ? `stockItemCreate_${companyId}` : null;
  const hasRestored = useRef(false);

  const [form, setForm] = useState<FormData>(
    () => loadFormState<any>(persistKey ?? "")?.form ?? INITIAL
  );
  const [stockGroups, setStockGroups] = useState<StockGroupType[]>([]);
  const [units, setUnits] = useState<UnitType[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [activePanel, setActivePanel] = useState<"group" | "unit" | null>(null);

  const [showBomList, setShowBomList] = useState(false);
  const [showBomComponents, setShowBomComponents] = useState(false);
  const [currentBomName, setCurrentBomName] = useState("");
  const [boms, setBoms] = useState<BomEntry[]>([]);

  useEffect(() => {
    if (!companyId) return;
    window.api.stockGroup.getAll(companyId).then(r => { if (r.success) setStockGroups(r.stockGroups ?? []); });
    window.api.unit.getAll(companyId).then(r => { if (r.success) setUnits(r.units ?? []); });
  }, [companyId]);

  useEffect(() => {
    if (!persistKey) return;
    if (!hasRestored.current) { hasRestored.current = true; return; }
    saveFormState(persistKey, { form });
  }, [persistKey, form]);

  const set = (key: keyof FormData) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm(f => ({ ...f, [key]: e.target.value }));
  const setVal = (key: keyof FormData, value: any) =>
    setForm(f => ({ ...f, [key]: value }));

  const handleBomToggle = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const yes = e.target.value === "Yes";
    setForm(f => ({ ...f, has_bom: yes, bom_name: yes ? f.bom_name : "" }));
    if (yes) setShowBomList(true); else setBoms([]);
  };
  const handleBomSelect = (name: string) => { setCurrentBomName(name); setShowBomList(false); setShowBomComponents(true); };
  const handleBomAccept = (entry: BomEntry) => {
    setBoms(prev => [...prev, entry]);
    setForm(f => ({ ...f, bom_name: f.bom_name || entry.bomName }));
    setShowBomComponents(false);
  };
  const handleBomListClose = () => { setShowBomList(false); if (boms.length === 0) setForm(f => ({ ...f, has_bom: false, bom_name: "" })); };
  const handleBomComponentsClose = () => { setShowBomComponents(false); if (boms.length === 0) setForm(f => ({ ...f, has_bom: false, bom_name: "" })); };

  const selectedGroupLabel = form.group_id
    ? (stockGroups.find(g => String(g.sg_id) === form.group_id)?.name ?? "Primary")
    : "Primary";
  const selectedUnitLabel = form.unit_id
    ? (units.find(u => String(u.unit_id) === form.unit_id)?.symbol ?? "Not Applicable")
    : "Not Applicable";
  const openingQty = parseFloat(form.opening_quantity) || 0;
  const openingRate = parseFloat(form.opening_rate) || 0;
  const openingValue = openingQty * openingRate;

  const handleSubmit = useCallback(async () => {
    if (!form.name.trim()) { setError("Name is required."); return; }
    if (!companyId) { setError("No company selected."); return; }
    setLoading(true); setError(null);
    try {
      const result = await window.api.stockItem.create({
        company_id: companyId!,
        name: form.name.trim(),
        alias: form.alias.trim() || undefined,
        group_id: form.group_id ? Number(form.group_id) : undefined,
        unit_id: form.unit_id ? Number(form.unit_id) : undefined,
        gst_applicable: form.gst_applicable,
        hsn_sac: form.hsn_sac.trim() || undefined,
        source_of_details: form.source_of_hsn || undefined,
        hsn_sac_description: form.hsn_sac_description.trim() || undefined,
        gst_rate_details: form.gst_rate_details.trim() || undefined,
        source_of_gst_rate: form.source_of_gst_rate || undefined,
        taxability_type: form.taxability_type || undefined,
        gst_rate: Number(form.gst_rate) || 0,
        cgst_rate: 0, sgst_rate: 0, igst_rate: 0,
        type_of_supply: form.type_of_supply,
        rate_of_duty: Number(form.rate_of_duty) || 0,
        has_bom: form.has_bom,
        bom_name: form.has_bom ? form.bom_name.trim() : undefined,
        opening_quantity: Number(form.opening_quantity) || 0,
        opening_rate: Number(form.opening_rate) || 0,
        reorder_level: 0, reorder_quantity: 0,
        track_batches: 0, track_expiry: 0,
      });
      if (result.success) {
        setSuccess(`"${form.name}" created.`);
        setForm(INITIAL); setBoms([]);
        if (persistKey) clearFormState(persistKey);
        hasRestored.current = false;
        setTimeout(() => setSuccess(null), 3000);
      } else {
        setError(result.error || "Failed to create stock item.");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unexpected error.");
    } finally {
      setLoading(false);
    }
  }, [form, companyId, persistKey]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        if (activePanel) setActivePanel(null);
        else navigate("/master/create");
        return;
      }
      const tag = (e.target as HTMLElement).tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if (e.altKey && e.key.toLowerCase() === "g") { e.preventDefault(); setActivePanel(p => p === "group" ? null : "group"); }
      if (e.altKey && e.key.toLowerCase() === "u") { e.preventDefault(); setActivePanel(p => p === "unit" ? null : "unit"); }
      if ((e.altKey || e.ctrlKey) && e.key.toLowerCase() === "a") { e.preventDefault(); handleSubmit(); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handleSubmit, navigate, activePanel]);


  const inp = "w-full bg-transparent text-sm outline-none border-b border-zinc-300 focus:border-zinc-600 py-0 px-0 placeholder-zinc-300 transition-colors";
  const inpSm = "w-full bg-transparent text-xs outline-none border-b border-zinc-300 focus:border-zinc-600 py-0 px-0 placeholder-zinc-300 transition-colors";

  const gstOn = form.gst_applicable === "Applicable";

  return (
    <div className="flex flex-col h-full bg-white select-none overflow-hidden" style={{ fontFamily: "system-ui, sans-serif" }}>

      {/* ── Title bar ── */}
      <div className="shrink-0 bg-zinc-900 text-white text-xs font-bold px-4 py-2 tracking-widest uppercase">
        Stock Item Creation
      </div>

      {/* ── Alerts ── */}
      {error && (
        <div className="px-3 py-1 border-b border-red-200 bg-red-50 text-red-700 text-xs flex justify-between items-center shrink-0">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="ml-2 font-bold">×</button>
        </div>
      )}
      {success && (
        <div className="px-3 py-1 border-b border-green-200 bg-green-50 text-green-700 text-xs flex justify-between items-center shrink-0">
          <span>{success}</span>
          <button onClick={() => setSuccess(null)} className="ml-2 font-bold">×</button>
        </div>
      )}

      {/* ── Body ── */}
      <div className="flex flex-1 min-h-0 overflow-hidden">

        {/* ══ MAIN FORM ══ */}
        <div className="flex flex-col flex-1 min-w-0">

          {/* Two-column content */}
          <div className="flex flex-1 min-h-0 overflow-hidden">

            {/* ── LEFT PANEL ── */}
            <div className="flex-1 min-w-0 px-6 pt-4 pb-2 overflow-y-auto flex flex-col gap-0 border-r border-zinc-200">

              {/* GENERAL */}
              <div className="text-[10px] uppercase tracking-[0.2em] text-zinc-500 font-semibold mb-1">General</div>

              {/* Name */}
              <div className="flex items-center min-h-[26px]">
                <span className="w-24 shrink-0 text-sm text-zinc-700">Name</span>
                <span className="text-zinc-400 mr-3 text-sm">:</span>
                <input autoFocus className={inp} value={form.name} onChange={set("name")} placeholder="Enter item name" />
              </div>

              {/* (alias) */}
              <div className="flex items-center min-h-[26px]">
                <span className="w-24 shrink-0 text-sm text-zinc-400">(alias)</span>
                <span className="text-zinc-400 mr-3 text-sm">:</span>
                <input className={inp} value={form.alias} onChange={set("alias")} placeholder="Optional alias" style={{ color: "#aaa" }} />
              </div>

              {/* Spacer */}
              <div className="h-5" />

              {/* Under */}
              <div
                className="flex items-center min-h-[26px] cursor-pointer group"
                onClick={() => setActivePanel(p => p === "group" ? null : "group")}
              >
                <span className="w-24 shrink-0 text-sm text-zinc-700">Under</span>
                <span className="text-zinc-400 mr-3 text-sm">:</span>
                <span className="text-sm text-zinc-900 group-hover:underline">♦ {selectedGroupLabel}</span>
              </div>

              {/* Units */}
              <div
                className="flex items-center min-h-[26px] cursor-pointer group"
                onClick={() => setActivePanel(p => p === "unit" ? null : "unit")}
              >
                <span className="w-24 shrink-0 text-sm text-zinc-700">Units</span>
                <span className="text-zinc-400 mr-3 text-sm">:</span>
                <span className="text-sm text-zinc-900 group-hover:underline">♦ {selectedUnitLabel}</span>
              </div>

              {/* ADDITIONAL DETAILS */}
              <div className="h-5" />
              <div className="text-[10px] uppercase tracking-[0.2em] text-zinc-500 font-semibold mb-1">Additional Details</div>

              {/* Set components (BOM) */}
              <div className="flex items-center min-h-[26px]">
                <span className="w-44 shrink-0 text-sm text-zinc-700">Set components (BOM)</span>
                <span className="text-zinc-400 mr-3 text-sm">:</span>
                <div className="flex items-center gap-1.5">
                  <select
                    className="bg-transparent text-sm outline-none border-b border-zinc-300 focus:border-zinc-600 cursor-pointer"
                    value={form.has_bom ? "Yes" : "No"}
                    onChange={handleBomToggle}
                  >
                    <option value="No">No</option>
                    <option value="Yes">Yes</option>
                  </select>
                  {form.has_bom && boms.length > 0 && (
                    <span className="text-xs text-zinc-400">({boms.length} BOM{boms.length > 1 ? "s" : ""})</span>
                  )}
                </div>
              </div>
            </div>

            {/* ── RIGHT PANEL: Statutory Details ── */}
            <div className="shrink-0 px-4 pt-4 pb-2 overflow-y-auto flex flex-col gap-0 border-l border-zinc-100" style={{ width: 320 }}>

              <div className="text-[10px] uppercase tracking-[0.2em] text-zinc-500 font-semibold mb-1">Statutory Details</div>

              {/* GST Applicability */}
              <div className="flex items-center min-h-[24px]">
                <span className="w-32 shrink-0 text-xs text-zinc-700">GST Applicability</span>
                <span className="text-zinc-400 mr-2 text-xs shrink-0">:</span>
                <div className="flex items-center gap-1">
                  <span className="text-xs text-zinc-800">♦</span>
                  <select
                    className="bg-transparent text-xs outline-none border-b border-zinc-300 focus:border-zinc-600 cursor-pointer font-medium text-zinc-800"
                    value={form.gst_applicable}
                    onChange={set("gst_applicable") as any}
                  >
                    <option value="Applicable">Applicable</option>
                    <option value="Not Applicable">Not Applicable</option>
                  </select>
                </div>
              </div>

              {gstOn && (
                <>
                  {/* ── HSN/SAC & RELATED DETAILS ── */}
                  <div className="text-[10px] font-bold text-zinc-700 mt-2 mb-0.5 pb-0.5 border-b border-zinc-200 uppercase tracking-wider">
                    HSN/SAC &amp; Related Details
                  </div>

                  {/* HSN/SAC Details — INPUT */}
                  <div className="flex items-center min-h-[22px]">
                    <span className="w-32 shrink-0 text-xs text-zinc-400 truncate">HSN/SAC Details</span>
                    <span className="text-zinc-300 mr-2 text-xs shrink-0">:</span>
                    <input
                      className={inpSm}
                      value={form.hsn_sac}
                      onChange={set("hsn_sac")}
                      placeholder="Enter HSN/SAC code"
                    />
                  </div>

                  {/* Source of details — popup dropdown */}
                  <div className="flex items-center min-h-[22px]">
                    <span className="w-32 shrink-0 text-xs text-zinc-400 truncate">Source of details</span>
                    <span className="text-zinc-300 mr-2 text-xs shrink-0">:</span>
                    <SourceDropdown
                      value={form.source_of_hsn}
                      options={SOURCE_OPTIONS}
                      onChange={v => setVal("source_of_hsn", v)}
                    />
                  </div>

                  {/* HSN/SAC — NOT AVAILABLE (read-only) */}
                  <div className="flex items-center min-h-[22px]">
                    <span className="w-32 shrink-0 text-xs text-zinc-400 truncate">HSN/SAC</span>
                    <span className="text-zinc-300 mr-2 text-xs shrink-0">:</span>
                    <span className="text-xs text-zinc-400">Not Available</span>
                  </div>

                  {/* Description — INPUT */}
                  <div className="flex items-center min-h-[22px]">
                    <span className="w-32 shrink-0 text-xs text-zinc-400 truncate">Description</span>
                    <span className="text-zinc-300 mr-2 text-xs shrink-0">:</span>
                    <input
                      className={inpSm}
                      value={form.hsn_sac_description}
                      onChange={set("hsn_sac_description")}
                      placeholder="—"
                    />
                  </div>

                  {/* ── GST RATE & RELATED DETAILS ── */}
                  <div className="text-[10px] font-bold text-zinc-700 mt-2 mb-0.5 pb-0.5 border-b border-zinc-200 uppercase tracking-wider">
                    GST Rate &amp; Related Details
                  </div>

                  {/* GST Rate Details — INPUT */}
                  <div className="flex items-center min-h-[22px]">
                    <span className="w-32 shrink-0 text-xs text-zinc-400 truncate">GST Rate Details</span>
                    <span className="text-zinc-300 mr-2 text-xs shrink-0">:</span>
                    <input
                      className={inpSm}
                      value={form.gst_rate_details}
                      onChange={set("gst_rate_details")}
                      placeholder="—"
                    />
                  </div>

                  {/* Source of details (GST) — popup dropdown showing truncated text */}
                  <div className="flex items-center min-h-[22px]">
                    <span className="w-32 shrink-0 text-xs text-zinc-400 truncate">Source of details</span>
                    <span className="text-zinc-300 mr-2 text-xs shrink-0">:</span>
                    <SourceDropdown
                      value={form.source_of_gst_rate}
                      options={SOURCE_OPTIONS}
                      onChange={v => setVal("source_of_gst_rate", v)}
                    />
                  </div>

                  {/* GST Rate Details — NOT AVAILABLE (read-only) */}
                  <div className="flex items-center min-h-[22px]">
                    <span className="w-32 shrink-0 text-xs text-zinc-400 truncate">GST Rate Details</span>
                    <span className="text-zinc-300 mr-2 text-xs shrink-0">:</span>
                    <span className="text-xs text-zinc-400">Not Available</span>
                  </div>

                  {/* Taxability Type — "— ▾" dropdown */}
                  <div className="flex items-center min-h-[22px]">
                    <span className="w-32 shrink-0 text-xs text-zinc-400 truncate">Taxability Type</span>
                    <span className="text-zinc-300 mr-2 text-xs shrink-0">:</span>
                    <select
                      className="bg-transparent text-xs outline-none border-b border-zinc-300 focus:border-zinc-600 cursor-pointer text-zinc-700"
                      value={form.taxability_type}
                      onChange={set("taxability_type")}
                    >
                      <option value="">—</option>
                      <option value="Taxable">Taxable</option>
                      <option value="Exempt">Exempt</option>
                      <option value="Nil Rated">Nil Rated</option>
                      <option value="Non-GST">Non-GST</option>
                    </select>
                  </div>

                  {/* GST Rate — number + % */}
                  <div className="flex items-center min-h-[22px]">
                    <span className="w-32 shrink-0 text-xs text-zinc-400 truncate">GST Rate</span>
                    <span className="text-zinc-300 mr-2 text-xs shrink-0">:</span>
                    <div className="flex items-center gap-1">
                      <input
                        className="w-10 bg-transparent text-xs outline-none border-b border-zinc-300 focus:border-zinc-600 text-right tabular-nums"
                        type="number" min="0" max="100" step="0.01"
                        value={form.gst_rate}
                        onChange={set("gst_rate")}
                      />
                      <span className="text-xs text-zinc-500">%</span>
                    </div>
                  </div>

                  {/* Type of Supply — "Goods ▾" */}
                  <div className="flex items-center min-h-[22px]">
                    <span className="w-32 shrink-0 text-xs text-zinc-700 truncate">Type of Supply</span>
                    <span className="text-zinc-300 mr-2 text-xs shrink-0">:</span>
                    <select
                      className="bg-transparent text-xs outline-none border-b border-zinc-300 focus:border-zinc-600 cursor-pointer font-medium text-zinc-800"
                      value={form.type_of_supply}
                      onChange={set("type_of_supply") as any}
                    >
                      <option value="Goods">Goods</option>
                      <option value="Services">Services</option>
                    </select>
                  </div>
                </>
              )}

              {/* Rate of Duty — always shown, separated */}
              <div className={`flex items-center min-h-[22px] ${gstOn ? "mt-2 pt-1.5 border-t border-zinc-100" : "mt-1"}`}>
                <span className="w-32 shrink-0 text-xs text-zinc-700 truncate">Rate of Duty (e.g. 5)</span>
                <span className="text-zinc-400 mr-2 text-xs shrink-0">:</span>
                <div className="flex items-center gap-1">
                  <input
                    className="w-10 bg-transparent text-xs outline-none border-b border-zinc-300 focus:border-zinc-600 text-right tabular-nums"
                    type="number" min="0" max="100" step="0.01"
                    value={form.rate_of_duty}
                    onChange={set("rate_of_duty")}
                    placeholder="0"
                  />
                  <span className="text-xs text-zinc-500">%</span>
                </div>
              </div>
            </div>
          </div>

          {/* ── Opening Balance ── */}
          <div className="shrink-0 border-t border-zinc-300">
            {/* Column headers */}
            <div className="flex items-center px-6 pt-1 pb-0 border-b border-zinc-100">
              <div className="flex-1" />
              <span className="w-36 text-right text-[10px] uppercase tracking-widest text-zinc-500 font-semibold pr-1">Quantity</span>
              <span className="w-24 text-right text-[10px] uppercase tracking-widest text-zinc-500 font-semibold ml-4">Rate</span>
              <span className="w-10 text-center text-[10px] uppercase tracking-widest text-zinc-500 font-semibold ml-2">per</span>
              <span className="w-28 text-right text-[10px] uppercase tracking-widest text-zinc-500 font-semibold">Value</span>
            </div>
            {/* Data row */}
            <div className="flex items-center px-6 py-2">
              <div className="flex-1 flex items-center gap-2">
                <span className="text-sm text-zinc-700">Opening Balance</span>
                <span className="text-zinc-400 text-sm">:</span>
              </div>
              {/* Quantity */}
              <div className="w-36 flex items-center justify-end gap-1 border-b border-zinc-400 focus-within:border-zinc-700 pr-1">
                <input
                  className="w-24 bg-transparent text-sm outline-none py-0.5 text-right tabular-nums"
                  type="number" min="0" step="0.001"
                  value={form.opening_quantity}
                  onChange={set("opening_quantity")}
                  placeholder="0"
                />
                {form.unit_id && (
                  <span className="text-xs text-zinc-500 shrink-0">{selectedUnitLabel}</span>
                )}
              </div>
              {/* Rate */}
              <div className="w-24 ml-4 border-b border-zinc-400 focus-within:border-zinc-700">
                <input
                  className="w-full bg-transparent text-sm outline-none py-0.5 text-right tabular-nums pr-1"
                  type="number" min="0" step="0.01"
                  value={form.opening_rate}
                  onChange={set("opening_rate")}
                  placeholder="0.00"
                />
              </div>
              {/* per */}
              <span className="w-10 text-center text-xs text-zinc-500 ml-2 shrink-0">
                {form.unit_id ? selectedUnitLabel : ""}
              </span>
              {/* Value */}
              <span className="w-28 text-right text-sm tabular-nums text-zinc-800">
                {openingValue > 0
                  ? openingValue.toLocaleString("en-IN", { minimumFractionDigits: 2 })
                  : ""}
              </span>
            </div>
          </div>
        </div>

        {/* ── Side selection panel (group / unit) ── */}
        {activePanel === "group" && (
          <ListSidePanel
            title="List of Groups"
            items={stockGroups.map(g => ({ id: String(g.sg_id), label: g.name }))}
            selected={form.group_id}
            onSelect={val => { setVal("group_id", val); setActivePanel(null); }}
            onClose={() => setActivePanel(null)}
            primaryLabel="Primary"
          />
        )}
        {activePanel === "unit" && (
          <ListSidePanel
            title="List of Units"
            items={units.map(u => ({ id: String(u.unit_id), label: `${u.symbol} (${u.name})` }))}
            selected={form.unit_id}
            onSelect={val => { setVal("unit_id", val); setActivePanel(null); }}
            onClose={() => setActivePanel(null)}
            primaryLabel="Not Applicable"
            showCreate
            onCreateNew={() => navigate("/master/create/unit")}
          />
        )}
      </div>


      {showBomList && (
        <BomListModal
          stockItemName={form.name}
          existingBoms={boms.map(b => b.bomName)}
          onSelectBom={handleBomSelect}
          onClose={handleBomListClose}
        />
      )}
      {showBomComponents && (
        <BomComponentsModal
          bomName={currentBomName}
          stockItemName={form.name}
          onClose={handleBomComponentsClose}
          onAccept={handleBomAccept}
        />
      )}
    </div>
  );
}