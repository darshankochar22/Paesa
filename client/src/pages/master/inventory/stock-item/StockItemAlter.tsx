import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useCompany } from "@/context/CompanyContext";
import { FormRow, PageTitleBar, RightActionPanel, SearchInput, DataTable, SideSelectionPanel } from "@/components/ui";
import type { StockGroupType, UnitType, StockItemType } from "@/types/api";

const inputCls = "w-full bg-transparent text-sm outline-none py-0.5 px-1 rounded-sm placeholder:text-zinc-400 focus:bg-zinc-100 hover:bg-zinc-50 focus:border-zinc-300 transition-colors";
const selectCls = "w-full bg-transparent text-sm outline-none py-0.5 px-1 rounded-sm cursor-pointer focus:bg-zinc-100 hover:bg-zinc-50 focus:border-zinc-300 transition-colors";

function SelectionPanel({
  items,
  onSelect,
  onCancel,
  onCreate,
}: {
  items: StockItemType[];
  onSelect: (item: StockItemType) => void;
  onCancel: () => void;
  onCreate: () => void;
}) {
  const [search, setSearch] = useState("");

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") { e.preventDefault(); onCancel(); }
      if (e.altKey && e.key.toLowerCase() === "c") { e.preventDefault(); onCreate(); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onCancel, onCreate]);

  const filtered = items.filter(i =>
    i.name.toLowerCase().includes(search.toLowerCase()) ||
    (i.alias && i.alias.toLowerCase().includes(search.toLowerCase()))
  );

  const columns = [
    { key: "name", label: "Item Name", span: "col-span-8", render: (r: StockItemType) => <span className="font-bold text-zinc-950 uppercase">{r.name}</span> },
    { key: "alias", label: "Alias", span: "col-span-4", render: (r: StockItemType) => <span className="text-zinc-500">{r.alias || "—"}</span> },
  ];

  const selectionActions = [
    { key: "Alt+C", label: "Create Item", onClick: onCreate },
    { key: "Esc", label: "Quit", onClick: onCancel },
  ];

  return (
    <div className="flex-1 flex flex-col h-full bg-white select-none">
      <PageTitleBar title="Alter Stock Item" subtitle="Select Item to Alter" />

      <div className="p-3 bg-zinc-50 border-b border-zinc-200 shrink-0">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search items by name…"
          autoFocus
        />
      </div>

      <div className="flex-1 flex min-h-0">
        <div className="flex-1 flex flex-col bg-white border-r border-zinc-100">
          <DataTable
            columns={columns}
            rows={filtered}
            rowKey={(r: StockItemType) => r.item_id}
            onRowClick={onSelect}
            emptyMessage="No stock items found."
          />
        </div>
        <RightActionPanel actions={selectionActions} />
      </div>

      <div className="border-t border-zinc-200 p-3 flex justify-end bg-zinc-50">
        <button
          onClick={onCancel}
          className="text-xs px-4 py-1.5 rounded border border-zinc-200 bg-white shadow-sm text-zinc-600 hover:bg-zinc-50 transition-colors font-medium"
        >
          Cancel
        </button>
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

type PanelType = "group" | "unit" | null;

export default function StockItemAlter() {
  const navigate = useNavigate();
  const { selectedCompany } = useCompany();

  const [stockItems, setStockItems] = useState<StockItemType[]>([]);
  const [stockGroups, setStockGroups] = useState<StockGroupType[]>([]);
  const [units, setUnits] = useState<UnitType[]>([]);
  const [selectedItem, setSelectedItem] = useState<StockItemType | null>(null);
  const [form, setForm] = useState<FormData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showPanel, setShowPanel] = useState<PanelType>(null);

  useEffect(() => {
    const company_id = selectedCompany?.company_id;
    if (!company_id) return;
    window.api.stockItem.getAll(company_id).then(r => { if (r.success) setStockItems(r.stockItems ?? []); });
    window.api.stockGroup.getAll(company_id).then(r => { if (r.success) setStockGroups(r.stockGroups ?? []); });
    window.api.unit.getAll(company_id).then(r => { if (r.success) setUnits(r.units ?? []); });
  }, [selectedCompany]);

  const handleSelectItem = (item: StockItemType) => {
    setSelectedItem(item);
    setForm({
      name: item.name ?? "",
      alias: item.alias ?? "",
      group_id: item.group_id ? String(item.group_id) : "",
      unit_id: item.unit_id ? String(item.unit_id) : "",
      gst_applicable: item.gst_applicable ?? "Not Applicable",
      hsn_code: item.hsn_code ?? "",
      sac_code: item.sac_code ?? "",
      gst_rate: String(item.gst_rate ?? 0),
      cgst_rate: String(item.cgst_rate ?? 0),
      sgst_rate: String(item.sgst_rate ?? 0),
      igst_rate: String(item.igst_rate ?? 0),
      type_of_supply: item.type_of_supply ?? "Goods",
      rate_of_duty: String(item.rate_of_duty ?? 0),
      opening_quantity: String(item.opening_quantity ?? 0),
      opening_rate: String(item.opening_rate ?? 0),
      reorder_level: String(item.reorder_level ?? 0),
      reorder_quantity: String(item.reorder_quantity ?? 0),
      track_batches: Boolean(item.track_batches),
      track_expiry: Boolean(item.track_expiry),
    });
    setError(null);
    setSuccess(null);
  };

  const set = (key: keyof FormData) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm(f => f ? { ...f, [key]: e.target.value } : f);

  const setCheck = (key: keyof FormData) =>
    (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm(f => f ? { ...f, [key]: e.target.checked } : f);

  const handleGstChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    const half = val === "" ? "0" : String(parseFloat(val) / 2 || 0);
    setForm(f => f ? { ...f, gst_rate: val, cgst_rate: half, sgst_rate: half, igst_rate: val } : f);
  };

  const validate = (): string | null => {
    if (!form?.name.trim()) return "Name is required.";
    if (!selectedCompany?.company_id) return "No company selected.";
    if (!form.group_id) return "Stock Group is required.";
    if (!form.unit_id) return "Unit is required.";
    const rates = [form.gst_rate, form.cgst_rate, form.sgst_rate, form.igst_rate, form.rate_of_duty].map(Number);
    if (rates.some(v => v < 0)) return "GST rates cannot be negative.";
    if (rates.some(v => v > 100)) return "GST rates cannot exceed 100%.";
    if (Number(form.opening_quantity) < 0) return "Opening quantity cannot be negative.";
    if (Number(form.opening_rate) < 0) return "Opening rate cannot be negative.";
    return null;
  };

  const handleBack = useCallback(() => {
    setSelectedItem(null);
    setForm(null);
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!form || !selectedItem) return;
    const validationError = validate();
    if (validationError) { setError(validationError); return; }

    setLoading(true); setError(null);
    try {
      const result = await window.api.stockItem.update({
        item_id:          selectedItem.item_id,
        company_id:       selectedCompany!.company_id,
        name:             form.name.trim(),
        alias:            form.alias.trim()    || null,
        group_id:         form.group_id        ? Number(form.group_id)  : null,
        unit_id:          form.unit_id         ? Number(form.unit_id)   : null,
        gst_applicable:   form.gst_applicable,
        hsn_code:         form.hsn_code.trim() || null,
        sac_code:         form.sac_code.trim() || null,
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
        const updated = await window.api.stockItem.getAll(selectedCompany!.company_id!);
        if (updated.success) setStockItems(updated.stockItems ?? []);
        setSuccess(`Stock Item "${form.name}" updated successfully.`);
        setTimeout(() => {
          setSuccess(null);
          handleBack();
        }, 1500);
      } else {
        setError(result.error || "Failed to update stock item.");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unexpected error.");
    } finally {
      setLoading(false);
    }
  }, [form, selectedItem, selectedCompany, handleBack]);

  const handleDelete = useCallback(async () => {
    if (!selectedItem) return;
    if (!window.confirm(`Delete stock item "${selectedItem.name}"? This cannot be undone.`)) return;

    setLoading(true); setError(null);
    try {
      const result = await window.api.stockItem.delete(selectedItem.item_id);
      if (result.success) {
        const updated = await window.api.stockItem.getAll(selectedCompany!.company_id!);
        if (updated.success) setStockItems(updated.stockItems ?? []);
        handleBack();
      } else {
        setError(result.error || "Failed to delete stock item.");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unexpected error.");
    } finally {
      setLoading(false);
    }
  }, [selectedItem, selectedCompany, handleBack]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        if (showPanel) { setShowPanel(null); return; }
        if (selectedItem) { handleBack(); return; }
        navigate("/master/alter");
      }
      if (e.altKey && e.key.toLowerCase() === "g") {
        e.preventDefault();
        if (selectedItem) setShowPanel(prev => prev === "group" ? null : "group");
      }
      if (e.altKey && e.key.toLowerCase() === "u") {
        e.preventDefault();
        if (selectedItem) setShowPanel(prev => prev === "unit" ? null : "unit");
      }
      if (e.altKey && e.key.toLowerCase() === "a") {
        e.preventDefault();
        handleSubmit();
      }
      if (e.ctrlKey && e.key.toLowerCase() === "a") {
        e.preventDefault();
        handleSubmit();
      }
      if (e.altKey && e.key.toLowerCase() === "d") {
        e.preventDefault();
        handleDelete();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handleSubmit, handleDelete, handleBack, navigate, showPanel, selectedItem]);

  if (!selectedItem || !form) {
    return (
      <SelectionPanel
        items={stockItems}
        onSelect={handleSelectItem}
        onCancel={() => navigate("/master/alter")}
        onCreate={() => navigate("/master/create/stock-item")}
      />
    );
  }

  const openingValue = (parseFloat(form.opening_quantity) || 0) * (parseFloat(form.opening_rate) || 0);
  const gstSections = form.gst_applicable !== "Not Applicable";
  
  const selectedGroupLabel = form.group_id
    ? stockGroups.find(g => String(g.sg_id) === form.group_id)?.name ?? "Primary"
    : "Primary";

  const selectedUnitLabel = form.unit_id
    ? units.find(u => String(u.unit_id) === form.unit_id)?.symbol ?? "Not Applicable"
    : "Not Applicable";

  const alterActions = [
    { key: "Alt+G", label: "Select Group", onClick: () => setShowPanel(prev => prev === "group" ? null : "group") },
    { key: "Alt+U", label: "Select Unit", onClick: () => setShowPanel(prev => prev === "unit" ? null : "unit") },
    { key: "Alt+A", label: "Accept", onClick: handleSubmit },
    { key: "Alt+D", label: "Delete", onClick: handleDelete },
    { key: "Esc", label: "Back", onClick: handleBack },
  ];

  return (
    <div className="flex flex-col h-full relative overflow-hidden bg-white select-none">
      <PageTitleBar title={`Stock Item Alteration: ${selectedItem.name}`} subtitle={selectedCompany?.name} />

      {error && (
        <div className="px-3 py-1.5 border-b border-red-200 bg-red-50 text-red-700 text-xs flex justify-between items-center shrink-0">
          <span>• {error}</span>
          <button onClick={() => setError(null)} className="text-red-500 hover:text-red-700 text-xs font-bold font-sans">&times;</button>
        </div>
      )}
      {success && (
        <div className="px-3 py-1.5 border-b border-green-200 bg-green-50 text-green-700 text-xs flex justify-between items-center shrink-0">
          <span>• {success}</span>
          <button onClick={() => setSuccess(null)} className="text-green-500 hover:text-green-700 text-xs font-bold font-sans">&times;</button>
        </div>
      )}

      <div className="flex-1 flex min-h-0">
        <div className="flex-1 overflow-y-auto p-3 space-y-6 max-w-2xl bg-white border-r border-zinc-100">
          {/* General */}
          <div className="space-y-1">
            <div className="text-xs uppercase tracking-widest text-zinc-400 font-bold mb-2 font-sans select-none">General</div>
            
            <FormRow label="Name" required labelWidth="w-56" className="flex items-center min-h-[26px]">
              <input autoFocus className={inputCls} value={form.name} onChange={set("name")} placeholder="Item name" />
            </FormRow>

            <FormRow label="Alias" labelWidth="w-56" className="flex items-center min-h-[26px]">
              <input className={inputCls} value={form.alias} onChange={set("alias")} placeholder="Alias (optional)" />
            </FormRow>

            <FormRow label="Under" required labelWidth="w-56" className="flex items-center min-h-[26px]">
              <button
                type="button"
                onClick={() => setShowPanel("group")}
                className="w-full text-left text-sm py-0.5 px-1 bg-transparent outline-none uppercase font-bold text-zinc-800 tracking-wide hover:text-black transition-colors"
              >
                {selectedGroupLabel}
              </button>
            </FormRow>

            <FormRow label="Unit" required labelWidth="w-56" className="flex items-center min-h-[26px]">
              <button
                type="button"
                onClick={() => setShowPanel("unit")}
                className="w-full text-left text-sm py-0.5 px-1 bg-transparent outline-none uppercase font-bold text-zinc-800 tracking-wide hover:text-black transition-colors"
              >
                {selectedUnitLabel}
              </button>
            </FormRow>

            <FormRow label="Type of Supply" labelWidth="w-56" className="flex items-center min-h-[26px]">
              <select className={selectCls} value={form.type_of_supply} onChange={set("type_of_supply")}>
                <option value="Goods">Goods</option>
                <option value="Services">Services</option>
              </select>
            </FormRow>
          </div>

          {/* Opening Balance */}
          <div className="space-y-1 border-t border-zinc-100 pt-4">
            <div className="text-xs uppercase tracking-widest text-zinc-400 font-bold mb-2 font-sans select-none">Opening Balance</div>
            
            <FormRow label="Opening Quantity" labelWidth="w-56" className="flex items-center min-h-[26px]">
              <input className={inputCls} type="number" min="0" step="0.01" value={form.opening_quantity} onChange={set("opening_quantity")} />
            </FormRow>
            
            <FormRow label="Opening Rate" labelWidth="w-56" className="flex items-center min-h-[26px]">
              <input className={inputCls} type="number" min="0" step="0.01" value={form.opening_rate} onChange={set("opening_rate")} />
            </FormRow>
            
            <FormRow label="Opening Value" labelWidth="w-56" className="flex items-center min-h-[26px]">
              <input className={`${inputCls} text-zinc-400 bg-zinc-50 cursor-not-allowed`} readOnly value={openingValue} tabIndex={-1} />
            </FormRow>
          </div>

          {/* Reorder */}
          <div className="space-y-1 border-t border-zinc-100 pt-4">
            <div className="text-xs uppercase tracking-widest text-zinc-400 font-bold mb-2 font-sans select-none">Reorder Details</div>
            
            <FormRow label="Reorder Level" labelWidth="w-56" className="flex items-center min-h-[26px]">
              <input className={inputCls} type="number" min="0" step="0.01" value={form.reorder_level} onChange={set("reorder_level")} />
            </FormRow>
            
            <FormRow label="Reorder Quantity" labelWidth="w-56" className="flex items-center min-h-[26px]">
              <input className={inputCls} type="number" min="0" step="0.01" value={form.reorder_quantity} onChange={set("reorder_quantity")} />
            </FormRow>
          </div>

          {/* Tracking */}
          <div className="space-y-1 border-t border-zinc-100 pt-4">
            <div className="text-xs uppercase tracking-widest text-zinc-400 font-bold mb-2 font-sans select-none">Tracking</div>
            
            <FormRow label="Track Batches" labelWidth="w-56" className="flex items-center min-h-[26px]">
              <input type="checkbox" checked={form.track_batches} onChange={setCheck("track_batches")} className="cursor-pointer" />
            </FormRow>
            
            <FormRow label="Track Expiry" labelWidth="w-56" className="flex items-center min-h-[26px]">
              <input type="checkbox" checked={form.track_expiry} onChange={setCheck("track_expiry")} className="cursor-pointer" />
            </FormRow>
          </div>

          {/* Statutory HSN / SAC */}
          <div className="space-y-1 border-t border-zinc-100 pt-4">
            <div className="text-xs uppercase tracking-widest text-zinc-400 font-bold mb-2 font-sans select-none">Statutory Details</div>
            
            <FormRow label="Rate Of Duty" labelWidth="w-56" className="flex items-center min-h-[26px]">
              <select className={selectCls} value={form.gst_applicable} onChange={set("gst_applicable")}>
                <option value="Not Applicable">Not Applicable</option>
                <option value="Applicable">Applicable</option>
              </select>
            </FormRow>

            {gstSections && (
              <div className="space-y-1 mt-2 border-l-2 border-zinc-100 pl-3">
                <FormRow label="HSN Code" labelWidth="w-52" className="flex items-center min-h-[26px]">
                  <input className={inputCls} value={form.hsn_code} onChange={set("hsn_code")} placeholder="e.g. 8517" />
                </FormRow>

                <FormRow label="SAC Code" labelWidth="w-52" className="flex items-center min-h-[26px]">
                  <input className={inputCls} value={form.sac_code} onChange={set("sac_code")} placeholder="e.g. 998431" />
                </FormRow>

                <FormRow label="GST Rate (%)" labelWidth="w-52" className="flex items-center min-h-[26px]">
                  <input className={inputCls} type="number" min="0" max="100" step="0.01" value={form.gst_rate} onChange={handleGstChange} />
                </FormRow>

                <FormRow label="CGST Rate (%)" labelWidth="w-52" className="flex items-center min-h-[26px]">
                  <input className={inputCls} type="number" min="0" max="100" step="0.01" value={form.cgst_rate} onChange={set("cgst_rate")} />
                </FormRow>

                <FormRow label="SGST Rate (%)" labelWidth="w-52" className="flex items-center min-h-[26px]">
                  <input className={inputCls} type="number" min="0" max="100" step="0.01" value={form.sgst_rate} onChange={set("sgst_rate")} />
                </FormRow>

                <FormRow label="IGST Rate (%)" labelWidth="w-52" className="flex items-center min-h-[26px]">
                  <input className={inputCls} type="number" min="0" max="100" step="0.01" value={form.igst_rate} onChange={set("igst_rate")} />
                </FormRow>

                <FormRow label="Rate of Duty (%)" labelWidth="w-52" className="flex items-center min-h-[26px]">
                  <input className={inputCls} type="number" min="0" max="100" step="0.01" value={form.rate_of_duty} onChange={set("rate_of_duty")} />
                </FormRow>
              </div>
            )}
          </div>
        </div>

        <RightActionPanel actions={alterActions} />
      </div>

      <div className="px-3 py-3 border-t border-zinc-200 flex justify-between items-center bg-zinc-50 shrink-0">
        <button
          onClick={handleDelete}
          disabled={loading}
          className="text-xs px-4 py-1.5 rounded border border-red-200 text-red-500 hover:bg-red-50 hover:border-red-300 disabled:opacity-50 transition-colors font-medium shadow-sm"
        >
          Delete
        </button>
        <div className="flex gap-3">
          <button
            onClick={handleBack}
            className="text-xs px-4 py-1.5 rounded border border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50 shadow-sm transition-colors"
          >
            Back
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="text-xs px-5 py-1.5 rounded bg-black text-white hover:bg-zinc-800 disabled:opacity-50 shadow-sm transition-colors font-medium"
          >
            {loading ? "Saving..." : "Accept"}
          </button>
        </div>
      </div>

      {showPanel === "group" && (
        <SideSelectionPanel
          title="Stock Groups"
          items={stockGroups.filter(g => g.name.toLowerCase() !== "primary").map(g => ({ id: g.sg_id, label: g.name }))}
          selected={form.group_id}
          onSelect={val => setForm(f => f ? { ...f, group_id: val } : f)}
          onClose={() => setShowPanel(null)}
          showPrimary
        />
      )}
      {showPanel === "unit" && (
        <SideSelectionPanel
          title="Units"
          items={[
            { id: "create", label: "Create" }
          ]}
          selected={form.unit_id}
          onSelect={val => {
            if (val === "create") {
              navigate("/master/create/unit");
            } else {
              setForm(f => f ? { ...f, unit_id: val } : f);
            }
          }}
          onClose={() => setShowPanel(null)}
          showPrimary
          primaryLabel="Not Applicable"
        />
      )}
    </div>
  );
}