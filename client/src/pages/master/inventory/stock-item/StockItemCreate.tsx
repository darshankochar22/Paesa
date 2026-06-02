import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useCompany } from "@/context/CompanyContext";
import { FormRow, PageTitleBar, RightActionPanel, SideSelectionPanel } from "@/components/ui";
import type { StockGroupType, UnitType } from "@/types/api";
import { loadFormState, saveFormState, clearFormState } from "@/utils/formPersistence";

const inputCls =
  "flex-1 bg-transparent text-sm outline-none px-1 py-0.5 border border-transparent " +
  "focus:bg-zinc-100 hover:bg-zinc-50 focus:border-zinc-300 transition-colors";
const selectCls =
  "bg-transparent text-sm outline-none px-1 py-0.5 border border-transparent " +
  "cursor-pointer focus:bg-zinc-100 hover:bg-zinc-50 focus:border-zinc-300 transition-colors";

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
  rate_of_duty: string;
  has_bom: boolean;
  bom_name: string;
  opening_quantity: string;
  opening_rate: string;
}

const INITIAL: FormData = {
  name: "",
  alias: "",
  group_id: "",
  unit_id: "",
  rate_of_duty: "",
  has_bom: false,
  bom_name: "",
  opening_quantity: "",
  opening_rate: "",
};

function TallyPopup({
  children,
  width = "w-80",
  onKeyDown,
}: {
  children: React.ReactNode;
  width?: string;
  onKeyDown?: (e: React.KeyboardEvent) => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/20"
      onKeyDown={onKeyDown}
    >
      <div className={`bg-white border border-zinc-400 ${width} flex flex-col`}
        style={{ minHeight: 420 }}>
        {children}
      </div>
    </div>
  );
}

function BomListModal({
  stockItemName,
  existingBoms,
  onSelectBom,
  onClose,
}: {
  stockItemName: string;
  existingBoms: string[];
  onSelectBom: (name: string) => void;
  onClose: () => void;
}) {
  const [newName, setNewName] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  const accept = () => { if (newName.trim()) onSelectBom(newName.trim()); };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") { e.preventDefault(); onClose(); }
    if (e.key === "Enter")  { e.preventDefault(); accept(); }
    if (e.altKey && e.key.toLowerCase() === "a") { e.preventDefault(); accept(); }
  };

  return (
    <TallyPopup width="w-72" onKeyDown={handleKey}>

      <div className="text-center text-sm font-bold text-zinc-900 pt-4 pb-2 px-3 border-b border-zinc-300">
        BOM List of : <span>{stockItemName}</span>
      </div>

      <div className="text-sm font-bold text-zinc-900 px-3 pt-2 pb-1 border-b border-zinc-300">
        Name of BOM
      </div>

      <div className="flex-1 overflow-y-auto">
        {existingBoms.map((b, i) => (
          <div
            key={i}
            className="px-3 py-0.5 text-sm cursor-pointer hover:bg-zinc-100 border-b border-zinc-100"
            onClick={() => onSelectBom(b)}
          >
            {b}
          </div>
        ))}

 
        <input
          ref={inputRef}
          className="w-full px-3 py-0.5 text-sm outline-none bg-zinc-50 border-b border-zinc-200 focus:bg-zinc-100"
          value={newName}
          onChange={e => setNewName(e.target.value)}
        />
      </div>

      <div className="border-t border-zinc-300 flex text-xs shrink-0">
        <button
          onClick={onClose}
          className="flex-1 py-1.5 border-r border-zinc-300 hover:bg-zinc-100 transition-colors text-left px-2"
        >
          <span className="font-bold">Q</span>: Quit
          <span className="ml-1 text-zinc-400 text-[10px]">▲</span>
        </button>
        <button
          onClick={accept}
          className="flex-1 py-1.5 hover:bg-zinc-100 transition-colors text-left px-2"
        >
          <span className="font-bold">A</span>: Accept
          <span className="ml-1 text-zinc-400 text-[10px]">▲</span>
        </button>
      </div>
    </TallyPopup>
  );
}

function BomComponentsModal({
  bomName,
  stockItemName,
  onClose,
  onAccept,
}: {
  bomName: string;
  stockItemName: string;
  onClose: () => void;
  onAccept: (entry: BomEntry) => void;
}) {
  const [unitOfManufacture, setUnitOfManufacture] = useState("");
  const [items, setItems] = useState([
    { item: "", quantity: "" },
    { item: "", quantity: "" },
    { item: "", quantity: "" },
  ]);
  const unitRef = useRef<HTMLInputElement>(null);

  useEffect(() => { unitRef.current?.focus(); }, []);

  const updateItem = (i: number, key: "item" | "quantity", v: string) =>
    setItems(prev => prev.map((x, j) => (j === i ? { ...x, [key]: v } : x)));


  const handleItemKeyDown = (e: React.KeyboardEvent, i: number, key: "item" | "quantity") => {
    if (e.key === "Tab" && !e.shiftKey && key === "quantity" && i === items.length - 1) {
      setItems(r => [...r, { item: "", quantity: "" }]);
    }
  };

  const accept = () => onAccept({ bomName, unitOfManufacture, items: items.filter(r => r.item.trim()) });

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") { e.preventDefault(); onClose(); }
    if (e.altKey && e.key.toLowerCase() === "a") { e.preventDefault(); accept(); }
  };

  return (
    <TallyPopup width="w-96" onKeyDown={handleKey}>

      <div className="px-4 pt-3 pb-2 border-b border-zinc-200 space-y-0.5 text-sm">
        <div className="flex items-center min-h-[24px]">
          <span className="w-40 text-zinc-700 shrink-0">BoM Name</span>
          <span className="text-zinc-500 mr-2">:</span>
          <span className="font-bold text-zinc-900">{bomName}</span>
        </div>
        <div className="flex items-center min-h-[24px]">
          <span className="w-40 text-zinc-700 shrink-0">Components of</span>
          <span className="text-zinc-500 mr-2">:</span>
          <span className="font-bold text-zinc-900">{stockItemName}</span>
        </div>
        <div className="flex items-center min-h-[24px]">
          <span className="w-40 text-zinc-700 shrink-0">Unit of manufacture</span>
          <span className="text-zinc-500 mr-2">:</span>
          <input
            ref={unitRef}
            className="flex-1 bg-zinc-50 border border-zinc-300 px-1 py-0 text-sm outline-none focus:bg-zinc-100 focus:border-zinc-500"
            value={unitOfManufacture}
            onChange={e => setUnitOfManufacture(e.target.value)}
          />
        </div>
      </div>


      <div className="flex items-center border-b border-zinc-300 px-4 py-1">
        <span className="flex-1 text-sm font-bold text-zinc-900">Item</span>
        <span className="w-28 text-sm font-bold text-zinc-900 text-right">Quantity</span>
      </div>


      <div className="flex-1 overflow-y-auto">
        {items.map((r, i) => (
          <div key={i} className="flex items-center border-b border-zinc-100 last:border-0">
            <input
              className="flex-1 px-4 py-0.5 text-sm outline-none bg-transparent hover:bg-zinc-50 focus:bg-zinc-100 border-r border-zinc-200"
              value={r.item}
              onChange={e => updateItem(i, "item", e.target.value)}
              onKeyDown={e => handleItemKeyDown(e, i, "item")}
              placeholder=""
            />
            <input
              className="w-28 px-2 py-0.5 text-sm outline-none bg-transparent text-right hover:bg-zinc-50 focus:bg-zinc-100 tabular-nums"
              value={r.quantity}
              onChange={e => updateItem(i, "quantity", e.target.value)}
              onKeyDown={e => handleItemKeyDown(e, i, "quantity")}
              placeholder=""
            />
          </div>
        ))}
      </div>

      
      <div className="border-t border-zinc-300 flex text-xs shrink-0">
        <button
          onClick={onClose}
          className="flex-1 py-1.5 border-r border-zinc-300 hover:bg-zinc-100 transition-colors text-left px-2"
        >
          <span className="font-bold">Q</span>: Quit
          <span className="ml-1 text-zinc-400 text-[10px]">▲</span>
        </button>
        <button
          onClick={accept}
          className="flex-1 py-1.5 hover:bg-zinc-100 transition-colors text-left px-2"
        >
          <span className="font-bold">A</span>: Accept
          <span className="ml-1 text-zinc-400 text-[10px]">▲</span>
        </button>
      </div>
    </TallyPopup>
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
  const [unitsRefreshTrigger, ] = useState(0);

  
  const [showBomList, setShowBomList] = useState(false);
  const [showBomComponents, setShowBomComponents] = useState(false);
  const [currentBomName, setCurrentBomName] = useState("");
  const [boms, setBoms] = useState<BomEntry[]>([]);


  const loadUnits = useCallback(async (cid: number) => {
    try {
      const r = await window.api.unit.getAll(cid);
      if (r.success) setUnits(r.units ?? []);
    } catch (e) { console.error("Failed to load units:", e); }
  }, []);

  useEffect(() => {
    if (!companyId) return;
    window.api.stockGroup.getAll(companyId).then(r => {
      if (r.success) setStockGroups(r.stockGroups ?? []);
    });
    loadUnits(companyId);
  }, [companyId, loadUnits, unitsRefreshTrigger]);


  useEffect(() => {
    if (!persistKey) return;
    if (!hasRestored.current) { hasRestored.current = true; return; }
    saveFormState(persistKey, { form });
  }, [persistKey, form]);

  const setField = (key: keyof FormData) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      const value =
        e.target.type === "checkbox"
          ? (e.target as HTMLInputElement).checked
          : e.target.value;
      setForm(f => ({ ...f, [key]: value }));
    };

  const handleBomToggle = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const yes = e.target.value === "Yes";
    setForm(f => ({ ...f, has_bom: yes, bom_name: yes ? f.bom_name : "" }));
    if (yes) setShowBomList(true);
    else setBoms([]);
  };

  const handleBomSelect = (name: string) => {
    setCurrentBomName(name);
    setShowBomList(false);
    setShowBomComponents(true);
  };

  const handleBomAccept = (entry: BomEntry) => {
    setBoms(prev => [...prev, entry]);
    setForm(f => ({ ...f, bom_name: f.bom_name || entry.bomName }));
    setShowBomComponents(false);
  };

  const handleBomListClose = () => {
    setShowBomList(false);
    if (boms.length === 0) setForm(f => ({ ...f, has_bom: false, bom_name: "" }));
  };

  const handleBomComponentsClose = () => {
    setShowBomComponents(false);
    if (boms.length === 0) setForm(f => ({ ...f, has_bom: false, bom_name: "" }));
  };


  const selectedGroupLabel = form.group_id
    ? stockGroups.find(g => String(g.sg_id) === form.group_id)?.name ?? "Primary"
    : "Primary";

  const selectedUnitLabel = form.unit_id
    ? units.find(u => String(u.unit_id) === form.unit_id)?.symbol ?? "Not Applicable"
    : "Not Applicable";

  const openingValue =
    (parseFloat(form.opening_quantity) || 0) * (parseFloat(form.opening_rate) || 0);


  const validate = (): string | null => {
    if (!form.name.trim()) return "Name is required.";
    if (!companyId) return "No company selected.";
    if (form.has_bom && !form.bom_name.trim()) return "BOM name is required when BOM is enabled.";
    return null;
  };

  const handleSubmit = useCallback(async () => {
    const err = validate();
    if (err) { setError(err); return; }
    setLoading(true); setError(null);
    try {
      const result = await window.api.stockItem.create({
        company_id:       companyId!,
        name:             form.name.trim(),
        alias:            form.alias.trim() || undefined,
        group_id:         form.group_id  ? Number(form.group_id)  : undefined,
        unit_id:          form.unit_id   ? Number(form.unit_id)   : undefined,
        rate_of_duty:     Number(form.rate_of_duty) || 0,
        has_bom:          form.has_bom,
        bom_name:         form.has_bom ? form.bom_name.trim() : undefined,
        opening_quantity: Number(form.opening_quantity) || 0,
        opening_rate:     Number(form.opening_rate) || 0,

        gst_applicable: "Not Applicable",
        gst_rate: 0, cgst_rate: 0, sgst_rate: 0, igst_rate: 0,
        type_of_supply: "Goods",
        reorder_level: 0, reorder_quantity: 0,
        track_batches: 0, track_expiry: 0,
      });

      if (result.success) {
        setSuccess(`Stock Item "${form.name}" created successfully.`);
        setForm(INITIAL);
        setBoms([]);
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
      }
      if (e.altKey && e.key.toLowerCase() === "g") { e.preventDefault(); setActivePanel(p => p === "group" ? null : "group"); }
      if (e.altKey && e.key.toLowerCase() === "u") { e.preventDefault(); setActivePanel(p => p === "unit"  ? null : "unit");  }
      if ((e.altKey || e.ctrlKey) && e.key.toLowerCase() === "a") { e.preventDefault(); handleSubmit(); }
      if (e.altKey && e.key.toLowerCase() === "c") { e.preventDefault(); navigate("/master/alter/stock-item"); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handleSubmit, navigate, activePanel]);

  const itemActions = [
    { key: "Alt+G", label: "Select Group",  onClick: () => setActivePanel(p => p === "group" ? null : "group") },
    { key: "Alt+U", label: "Select Unit",   onClick: () => setActivePanel(p => p === "unit"  ? null : "unit")  },
    { key: "Alt+A", label: "Accept",        onClick: handleSubmit },
    { key: "Alt+C", label: "Alter Item",    onClick: () => navigate("/master/alter/stock-item") },
    { key: "Esc",   label: "Quit",          onClick: () => navigate("/master/create") },
  ];


  return (
    <div className="flex flex-col h-full bg-white select-none overflow-hidden">
      <PageTitleBar title="Stock Item Creation" subtitle={selectedCompany?.name} />

  
      {error && (
        <div className="px-3 py-1 border-b border-red-200 bg-red-50 text-red-700 text-xs flex justify-between items-center shrink-0">
          <span>• {error}</span>
          <button onClick={() => setError(null)} className="font-bold text-red-400 hover:text-red-700">×</button>
        </div>
      )}
      {success && (
        <div className="px-3 py-1 border-b border-green-200 bg-green-50 text-green-700 text-xs flex justify-between items-center shrink-0">
          <span>• {success}</span>
          <button onClick={() => setSuccess(null)} className="font-bold text-green-400 hover:text-green-700">×</button>
        </div>
      )}

      
      <div className="flex flex-1 min-h-0">


        <div className="flex flex-col flex-1 min-w-0 min-h-0 overflow-hidden">

  
          <div className="flex flex-1 min-h-0 overflow-hidden">

            
            <div className="flex-1 min-w-0 border-r border-zinc-100 px-4 pt-4 pb-2 flex flex-col gap-0.5 overflow-hidden">

              <div className="text-[10px] uppercase tracking-widest text-zinc-400 font-semibold mb-1">General</div>

              <FormRow label="Name" required labelWidth="w-48" className="flex items-center min-h-[26px]">
                <input autoFocus className={inputCls} value={form.name} onChange={setField("name")} />
              </FormRow>

              <FormRow label="(alias)" labelWidth="w-48" className="flex items-center min-h-[26px]">
                <input className={inputCls} value={form.alias} onChange={setField("alias")} />
              </FormRow>


              <div
                className="flex items-center min-h-[26px] cursor-pointer hover:bg-zinc-50 rounded"
                onClick={() => setActivePanel(p => p === "group" ? null : "group")}
              >
                <span className="w-48 text-sm text-zinc-500 shrink-0">Under</span>
                <span className="text-zinc-400 mr-2 shrink-0">:</span>
                <span className="text-sm font-semibold text-zinc-900 px-1">{selectedGroupLabel}</span>
              </div>

              <div
                className="flex items-center min-h-[26px] cursor-pointer hover:bg-zinc-50 rounded"
                onClick={() => setActivePanel(p => p === "unit" ? null : "unit")}
              >
                <span className="w-48 text-sm text-zinc-500 shrink-0">Units</span>
                <span className="text-zinc-400 mr-2 shrink-0">:</span>
                <span className="text-sm font-semibold text-zinc-900 px-1">{selectedUnitLabel}</span>
              </div>


              <div className="h-3" />

              <div className="text-[10px] uppercase tracking-widest text-zinc-400 font-semibold mb-1">Additional Details</div>

              <FormRow label="Set components (BOM)" labelWidth="w-48" className="flex items-center min-h-[26px]">
                <div className="flex items-center gap-2">
                  <select
                    className={selectCls}
                    value={form.has_bom ? "Yes" : "No"}
                    onChange={handleBomToggle}
                  >
                    <option value="No">No</option>
                    <option value="Yes">Yes</option>
                  </select>
                  {form.has_bom && boms.length > 0 && (
                    <span className="text-xs text-zinc-400">
                      ({boms.length} BOM{boms.length > 1 ? "s" : ""})
                    </span>
                  )}
                </div>
              </FormRow>
            </div>

            
            <div className="w-64 px-4 pt-4 pb-2 flex flex-col gap-0.5 overflow-hidden border-l border-zinc-100">
              <div className="text-[10px] uppercase tracking-widest text-zinc-400 font-semibold mb-1">Statutory Details</div>

              <FormRow label="Rate of Duty (eg 5)" labelWidth="w-36" className="flex items-center min-h-[26px]">
                <input
                  className={inputCls}
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  value={form.rate_of_duty}
                  onChange={setField("rate_of_duty")}
                  placeholder="0"
                />
              </FormRow>
            </div>
          </div>

         
          <div className="shrink-0 border-t border-zinc-200">
        
            <div className="flex items-center px-4 pt-1.5 pb-0.5 border-b border-zinc-100">
              <span className="w-48 shrink-0" />
              <span className="w-5 shrink-0" />
              <span className="w-32 text-right text-[10px] uppercase tracking-widest text-zinc-400 font-semibold">Quantity</span>
              <span className="w-28 text-right text-[10px] uppercase tracking-widest text-zinc-400 font-semibold ml-4">Rate</span>
              <span className="w-16 text-center text-[10px] uppercase tracking-widest text-zinc-400 font-semibold ml-2">per</span>
              <span className="flex-1 text-right text-[10px] uppercase tracking-widest text-zinc-400 font-semibold">Value</span>
            </div>

       
            <div className="flex items-center px-4 py-2">

              <span className="w-48 text-sm text-zinc-700 shrink-0">Opening Balance</span>
              <span className="w-5 text-zinc-400 shrink-0">:</span>

   
              <div className="w-32 flex items-center gap-1 border-b border-zinc-300 focus-within:border-zinc-600">
                <input
                  className="w-20 bg-transparent text-sm outline-none py-0.5 text-right tabular-nums"
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.opening_quantity}
                  onChange={setField("opening_quantity")}
                  placeholder="0"
                />
                <span className="text-sm text-zinc-600 shrink-0">
                  {form.unit_id ? selectedUnitLabel : ""}
                </span>
              </div>

      
              <div className="w-28 ml-4 border-b border-zinc-300 focus-within:border-zinc-600">
                <input
                  className="w-full bg-transparent text-sm outline-none py-0.5 text-right tabular-nums pr-1"
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.opening_rate}
                  onChange={setField("opening_rate")}
                  placeholder="0.00"
                />
              </div>


              <span className="w-16 text-center text-sm text-zinc-600 ml-2 shrink-0">
                {form.unit_id ? selectedUnitLabel : ""}
              </span>

     
              <span className="flex-1 text-right text-sm font-mono text-zinc-800 tabular-nums">
                {openingValue > 0
                  ? openingValue.toLocaleString("en-IN", { minimumFractionDigits: 2 })
                  : ""}
              </span>
            </div>
          </div>
        </div>

        {activePanel === "group" && (
          <SideSelectionPanel
            title="List of Groups"
            items={stockGroups
              .filter(g => g.name.toLowerCase() !== "primary")
              .map(g => ({ id: g.sg_id, label: g.name }))}
            selected={form.group_id}
            onSelect={val => setForm(f => ({ ...f, group_id: val }))}
            onClose={() => setActivePanel(null)}
            showPrimary
          />
        )}
        {activePanel === "unit" && (
          <SideSelectionPanel
            title="List of Units"
            items={[
              { id: "create", label: "Create New Unit" },
              ...units.map(u => ({ id: String(u.unit_id), label: `${u.symbol} (${u.name})` })),
            ]}
            selected={form.unit_id}
            onSelect={val => {
              if (val === "create") navigate("/master/create/unit");
              else { setForm(f => ({ ...f, unit_id: val })); setActivePanel(null); }
            }}
            onClose={() => setActivePanel(null)}
            showPrimary
            primaryLabel="Not Applicable"
          />
        )}

        <RightActionPanel actions={itemActions} />
      </div>


      <div className="border-t border-zinc-200 px-4 py-2.5 flex justify-between items-center shrink-0">
        <button
          onClick={() => navigate("/master/create")}
          className="text-xs text-zinc-400 hover:text-zinc-700 transition-colors"
        >
          ← Back to Masters
        </button>
        <button
          onClick={handleSubmit}
          disabled={loading}
          className="text-sm px-6 py-1.5 rounded bg-black text-white hover:bg-zinc-800 disabled:opacity-50 transition-colors font-medium"
        >
          {loading ? "Saving…" : "Create"}
        </button>
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