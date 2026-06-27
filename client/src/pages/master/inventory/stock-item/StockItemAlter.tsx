import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useCompany } from "@/context/CompanyContext";
import {
  PageTitleBar,
  RightActionPanel,
  SearchInput,
  DataTable,
  FormRow,
  MasterFormFooter,
} from "@/components/ui";
import type { StockGroupType, UnitType, StockItemType, GodownType } from "@/types/api";
import BomListModal from "./components/BomListModal";
import BomComponentsModal, { type BomEntry } from "./components/BomComponentsModal";
import ListSidePanel from "./components/ListSidePanel";
import GSTStatutoryDetails from "./components/GSTStatutoryDetails";
import OpeningBalanceAllocationModal from "./components/OpeningBalanceAllocationModal";
import OtherStatutoryDetails from "./components/OtherStatutoryDetails";
import type { FormData, PanelType } from "./types";
import {
  GST_APPLICABILITY_OPTIONS,
  HSN_SAC_DETAILS_OPTIONS,
  GST_RATE_DETAILS_OPTIONS,
  TAXABILITY_TYPE_OPTIONS,
  TYPE_OF_SUPPLY_OPTIONS,
  YES_NO_OPTIONS
} from "./consts";
import { calculateGstDetails } from "./utils";
import { useStockItemBom } from "./hooks/useStockItemBom";

const inputCls =
  "flex-1 bg-transparent text-sm outline-none px-1 py-0.5 border border-transparent " +
  "focus:bg-zinc-100 hover:bg-zinc-50 focus:border-zinc-300 transition-colors";

interface StockItemAlterProps {
  initialItemId?: number;
  onDone?: () => void;
  onCancel?: () => void;
}

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

  const filtered = items.filter(
    i =>
      i.name.toLowerCase().includes(search.toLowerCase()) ||
      (i.alias && i.alias.toLowerCase().includes(search.toLowerCase()))
  );

  const columns = [
    {
      key: "name",
      label: "Item Name",
      span: "col-span-8",
      render: (r: StockItemType) => (
        <span className="font-bold text-zinc-950 uppercase">{r.name}</span>
      ),
    },
    {
      key: "alias",
      label: "Alias",
      span: "col-span-4",
      render: (r: StockItemType) => (
        <span className="text-zinc-500">{r.alias || "—"}</span>
      ),
    },
  ];

  const selectionActions = [
    { key: "Alt+C", label: "Create Item", onClick: onCreate },
    { key: "Esc",   label: "Quit",        onClick: onCancel },
  ];

  return (
    <div className="flex-1 flex flex-col h-full bg-white select-none">
      <PageTitleBar title="Alter Stock Item" subtitle="Select Item to Alter" />
      <div className="p-3 bg-zinc-50 border-b border-zinc-200 shrink-0">
        <SearchInput value={search} onChange={setSearch} placeholder="Search items by name…" autoFocus />
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
        <button onClick={onCancel} className="text-xs px-4 py-1.5 rounded border border-zinc-200 bg-white shadow-sm text-zinc-600 hover:bg-zinc-50 transition-colors font-medium">
          Cancel
        </button>
      </div>
    </div>
  );
}

export default function StockItemAlter({ initialItemId, onDone, onCancel }: StockItemAlterProps = {}) {
  const navigate = useNavigate();
  const { selectedCompany } = useCompany();

  const [stockItems,  setStockItems]  = useState<StockItemType[]>([]);
  const [stockGroups, setStockGroups] = useState<StockGroupType[]>([]);
  const [units,       setUnits]       = useState<UnitType[]>([]);
  const [godowns,     setGodowns]     = useState<GodownType[]>([]);
  const [gstClassifications, setGstClassifications] = useState<any[]>([]);
  const [selectedItem, setSelectedItem] = useState<StockItemType | null>(null);
  const [form,         setForm]         = useState<FormData | null>(null);
  const [loading,      setLoading]      = useState(false);
  const [error,        setError]        = useState<string | null>(null);
  const [success,      setSuccess]      = useState<string | null>(null);
  const [showPanel,    setShowPanel]    = useState<PanelType>(null);
  const [showAllocationModal, setShowAllocationModal] = useState(false);
  const [showOtherStatutory,  setShowOtherStatutory]  = useState(false);

  const updateFormFields = useCallback((updater: (prev: FormData) => Partial<FormData>) => {
    setForm(f => f ? ({ ...f, ...updater(f) }) : null);
  }, []);

  const {
    boms, setBoms,
    showBomList, setShowBomList,
    showBomComponents, setShowBomComponents,
    currentBomName, savePendingRef,
    handleBomToggle, handleBomSelect, handleBomAccept,
    handleBomListClose, handleBomComponentsClose,
  } = useStockItemBom(updateFormFields);

  const handleSelectItem = useCallback(async (item: any) => {
    setLoading(true);
    setError(null);
    try {
      const res = await window.api.stockItem.getById(item.item_id);
      if (res.success && res.item) {
        const fullItem = res.item;
        setSelectedItem(fullItem);
        setForm({
          name:  fullItem.name  ?? "",
          alias: fullItem.alias ?? "",
          group_id: fullItem.group_id ? String(fullItem.group_id) : "",
          unit_id:  fullItem.unit_id  ? String(fullItem.unit_id)  : "",
          rate_of_duty: String(fullItem.rate_of_duty ?? 0),
          has_bom:  Boolean(fullItem.has_bom),
          bom_name: fullItem.bom_name ?? "",
          opening_quantity: String(fullItem.opening_quantity ?? 0),
          opening_rate:     String(fullItem.opening_rate     ?? 0),
          gst_applicable: fullItem.gst_applicable ?? "Not Applicable",
          hsn_sac_details: fullItem.hsn_sac_details ?? (fullItem.source_of_details === "Specified Here" ? "specify_here" : fullItem.source_of_details === "GST Classification" ? "use_classification" : fullItem.source_of_details === "Specify in Voucher" ? "specify_in_voucher" : "as_per_company"),
          hsn_sac: fullItem.hsn_sac ?? "",
          hsn_sac_description: fullItem.hsn_sac_description ?? "",
          hsn_classification_id: fullItem.hsn_classification_id ? String(fullItem.hsn_classification_id) : "",
          gst_rate_details: fullItem.gst_rate_details ?? (fullItem.source_of_gst_rate === "GST Classification" ? "use_classification" : fullItem.source_of_gst_rate === "Specified Here" ? "specify_here" : fullItem.source_of_gst_rate === "Specify in Voucher" ? "specify_in_voucher" : "as_per_company"),
          rate_classification_id: fullItem.rate_classification_id ? String(fullItem.rate_classification_id) : "",
          taxability_type: fullItem.taxability_type ?? "",
          gst_rate: String(fullItem.gst_rate ?? 0),
          type_of_supply: fullItem.type_of_supply ?? "Goods",
          track_batches: Boolean(fullItem.track_batches),
          track_expiry:  Boolean(fullItem.track_expiry),
          allocations: (fullItem.allocations ?? []).map((a: any) => ({
            allocation_id: a.allocation_id,
            godown_id: String(a.godown_id ?? ""),
            batch_number: a.batch_number ?? "",
            mfg_date: a.mfg_date ?? "",
            expiry_date: a.expiry_date ?? "",
            quantity: String(a.quantity ?? 0),
            rate: String(a.rate ?? 0),
          })),
          maintain_in_batches: fullItem.track_batches ? "Yes" : "No",
          track_date_of_manufacturing: fullItem.track_date_of_manufacturing ? "Yes" : "No",
          use_expiry_dates: fullItem.track_expiry ? "Yes" : "No",
          enable_cost_tracking: fullItem.enable_cost_tracking ? "Yes" : "No",
          set_alter_statutory: fullItem.excise_applicable || fullItem.vat_applicable ? "Yes" : "No",
          excise_applicable: fullItem.excise_applicable ?? "Not Applicable",
          set_alter_excise_details: fullItem.excise_details === "Yes" ? "Yes" : "No",
          excise_tariff_name: fullItem.excise_tariff_name ?? "",
          excise_tariff_hsn_code: fullItem.excise_tariff_hsn_code ?? "",
          excise_tariff_uom: fullItem.excise_tariff_uom ?? "Undefined",
          excise_tariff_valuation_type: fullItem.excise_tariff_valuation_type ?? "Undefined",
          excise_tariff_rate: String(fullItem.excise_tariff_rate ?? 0),
          excise_tariff_rate_per_unit: String(fullItem.excise_tariff_rate_per_unit ?? 0),
          vat_applicable: fullItem.vat_applicable ?? "Applicable",
          set_alter_vat_details: fullItem.vat_details === "Yes" ? "Yes" : "No",
        });
        setBoms([]);
        setShowBomList(false);
        setShowBomComponents(false);
      } else {
        setError(res.error || "Failed to load stock item details.");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unexpected error.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const company_id = selectedCompany?.company_id;
    if (!company_id) return;
    window.api.stockItem.getAll(company_id).then(r => {
      if (r.success) {
        setStockItems(r.stockItems ?? []);
        if (initialItemId) {
          const found = (r.stockItems ?? []).find((i: StockItemType) => i.item_id === initialItemId);
          if (found) handleSelectItem(found);
        }
      }
    });
    window.api.stockGroup.getAll(company_id).then(r => { if (r.success) setStockGroups(r.stockGroups ?? []); });
    window.api.unit.getAll(company_id).then(r => { if (r.success) setUnits(r.units ?? []); });
    window.api.godown.getAll(company_id).then(r => { if (r.success) setGodowns(r.godowns ?? []); });
    window.api.gstClassification.getAll(company_id).then(r => { if (r.success) setGstClassifications(r.gstClassifications ?? []); });
  }, [selectedCompany]);

  const setVal = useCallback((key: keyof FormData, value: any) => {
    setForm(f => f ? ({ ...f, [key]: value }) : null);
  }, []);

  const selectedGroupLabel = form?.group_id
    ? stockGroups.find(g => String(g.sg_id) === form.group_id)?.name ?? "Primary"
    : "Primary";

  const selectedUnitLabel = form?.unit_id
    ? units.find(u => String(u.unit_id) === form.unit_id)?.symbol ?? "Not Applicable"
    : "Not Applicable";

  const openingQty   = parseFloat(form?.opening_quantity ?? "0") || 0;
  const openingRate  = parseFloat(form?.opening_rate     ?? "0") || 0;
  const openingValue = openingQty * openingRate;

  const handleBack = useCallback(() => {
    if (onDone) { onDone(); return; }
    setSelectedItem(null);
    setForm(null);
  }, [onDone]);

  const executeSave = async (bomsToSave: BomEntry[] = boms) => {
    if (!form || !selectedItem) return;
    if (!selectedCompany?.company_id) { setError("No company selected."); return; }
    setLoading(true); setError(null);

    const gst = calculateGstDetails(form, gstClassifications);

    try {
      const result = await window.api.stockItem.update({
        item_id:    selectedItem.item_id,
        company_id: selectedCompany.company_id,
        name:  form.name.trim(),
        alias: form.alias.trim() || null,
        group_id: form.group_id ? Number(form.group_id) : null,
        unit_id:  form.unit_id  ? Number(form.unit_id)  : null,
        rate_of_duty:   Number(form.rate_of_duty) || 0,
        has_bom:  form.has_bom,
        bom_name: form.has_bom ? (bomsToSave[0]?.bomName || form.bom_name).trim() || null : null,
        opening_quantity: Number(form.opening_quantity) || 0,
        opening_rate:     Number(form.opening_rate)     || 0,
        gst_applicable: gst.gst_applicable,
        gst_rate: gst.gst_rate,
        cgst_rate: gst.cgst_rate,
        sgst_rate: gst.sgst_rate,
        igst_rate: gst.igst_rate,
        type_of_supply: gst.type_of_supply,
        hsn_sac: gst.hsn_sac,
        source_of_details: gst.source_of_details,
        hsn_sac_description: gst.hsn_sac_description,
        hsn_code: gst.hsn_sac,
        gst_rate_details: gst.gst_rate_details,
        source_of_gst_rate: gst.source_of_gst_rate,
        taxability_type: gst.taxability_type,
        rate_classification_id: gst.rate_classification_id,
        hsn_classification_id: gst.hsn_classification_id,
        reorder_level: 0, reorder_quantity: 0,
        track_batches: form.track_batches ? 1 : 0,
        track_expiry:  form.track_expiry  ? 1 : 0,
        allocations: form.allocations,
        track_date_of_manufacturing: form.track_date_of_manufacturing === "Yes" ? 1 : 0,
        enable_cost_tracking: form.enable_cost_tracking === "Yes" ? 1 : 0,
        excise_applicable: form.excise_applicable,
        excise_details: form.set_alter_excise_details,
        excise_tariff_name: form.excise_tariff_name,
        excise_tariff_hsn_code: form.excise_tariff_hsn_code,
        excise_tariff_uom: form.excise_tariff_uom,
        excise_tariff_valuation_type: form.excise_tariff_valuation_type,
        excise_tariff_rate: Number(form.excise_tariff_rate) || 0,
        excise_tariff_rate_per_unit: Number(form.excise_tariff_rate_per_unit) || 0,
        vat_applicable: form.vat_applicable,
        vat_details: form.set_alter_vat_details,
      });

      if (result.success) {
        const updated = await window.api.stockItem.getAll(selectedCompany.company_id);
        if (updated.success) setStockItems(updated.stockItems ?? []);
        setSuccess(`Stock Item "${form.name}" updated successfully.`);
        setTimeout(() => { setSuccess(null); handleBack(); }, 1500);
      } else {
        setError(result.error || "Failed to update stock item.");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unexpected error.");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = useCallback(() => {
    if (!form || !selectedItem) return;
    if (!form.name.trim()) { setError("Name is required."); return; }
    if (!selectedCompany?.company_id) { setError("No company selected."); return; }
    if (form.has_bom && boms.length === 0) {
      savePendingRef.current = true;
      setShowBomList(true);
      return;
    }
    if (openingQty > 0 && form.allocations.length === 0 && (form.track_batches || godowns.length > 0)) {
      setError("Please allocate the opening balance quantity to godowns/batches.");
      setShowAllocationModal(true);
      return;
    }
    executeSave(boms);
  }, [form, selectedItem, selectedCompany, boms, gstClassifications, openingQty, godowns]);

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
        if (showBomList) { setShowBomList(false); savePendingRef.current = false; return; }
        if (showBomComponents) { setShowBomComponents(false); savePendingRef.current = false; return; }
        if (showPanel) { setShowPanel(null); return; }
        if (selectedItem) { handleBack(); return; }
        if (onCancel) { onCancel(); return; }
        navigate("/master/alter");
      }
      if (e.altKey && e.key.toLowerCase() === "g") { e.preventDefault(); if (selectedItem) setShowPanel(p => p === "group" ? null : "group"); }
      if (e.altKey && e.key.toLowerCase() === "u") { e.preventDefault(); if (selectedItem) setShowPanel(p => p === "unit"  ? null : "unit");  }
      if ((e.altKey || e.ctrlKey) && e.key.toLowerCase() === "a") { e.preventDefault(); handleSubmit(); }
      if (e.altKey && e.key.toLowerCase() === "d") { e.preventDefault(); handleDelete(); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handleSubmit, handleDelete, handleBack, navigate, showPanel, selectedItem, showBomList, showBomComponents, onCancel]);

  if (!selectedItem || !form) {
    return (
      <SelectionPanel
        items={stockItems}
        onSelect={handleSelectItem}
        onCancel={onCancel ?? (() => navigate("/master/alter"))}
        onCreate={() => navigate("/master/create/stock-item")}
      />
    );
  }

  const alterActions = [
    { key: "Alt+G", label: "Select Group", onClick: () => setShowPanel(p => p === "group" ? null : "group") },
    { key: "Alt+U", label: "Select Unit",  onClick: () => setShowPanel(p => p === "unit"  ? null : "unit")  },
    { key: "Alt+A", label: "Accept",       onClick: handleSubmit },
    { key: "Alt+D", label: "Delete",       onClick: handleDelete },
    { key: "Esc",   label: "Back",         onClick: handleBack   },
  ];

  return (
    <div className="flex flex-col h-full bg-white select-none overflow-hidden">
      <PageTitleBar
        title={`Stock Item Alteration: ${selectedItem.name}`}
        subtitle={selectedCompany?.name}
      />

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

      <div className="flex flex-1 min-h-0 overflow-hidden">
        <div className="flex flex-col flex-1 min-w-0 min-h-0 overflow-hidden">
          <div className="px-6 py-4 border-b border-zinc-200 flex flex-col gap-1 shrink-0">
            <FormRow label="Name" labelWidth="w-24" className="flex items-center min-h-[26px]">
              <input autoFocus className={inputCls} value={form.name} onChange={e => setVal("name", e.target.value)} placeholder="Enter item name" />
            </FormRow>
            <FormRow label="(alias)" labelWidth="w-24" className="flex items-center min-h-[26px]">
              <input className={inputCls} value={form.alias} onChange={e => setVal("alias", e.target.value)} placeholder="Optional alias" style={{ color: "#aaa" }} />
            </FormRow>
          </div>

          <div className="flex flex-1 min-h-0 overflow-hidden">
            <div className="flex-1 min-w-0 border-r border-zinc-200 px-6 pt-4 pb-2 flex flex-col gap-0 overflow-y-auto">
              <div className="cursor-pointer group" onClick={() => setShowPanel(p => p === "group" ? null : "group")}>
                <FormRow label="Under" labelWidth="w-32" className="flex items-center min-h-[26px]">
                  <span className="text-sm text-zinc-900 group-hover:underline">{selectedGroupLabel}</span>
                </FormRow>
              </div>
              <div className="cursor-pointer group" onClick={() => setShowPanel(p => p === "unit" ? null : "unit")}>
                <FormRow label="Units" labelWidth="w-32" className="flex items-center min-h-[26px]">
                  <span className="text-sm text-zinc-900 group-hover:underline">{selectedUnitLabel}</span>
                </FormRow>
              </div>

              <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mt-4 mb-2">Additional Details</div>

              <div className="cursor-pointer group" onClick={() => setShowPanel(p => p === "maintain_in_batches" ? null : "maintain_in_batches")}>
                <FormRow label="Maintain in batches" labelWidth="w-44" className="flex items-center min-h-[26px]">
                  <span className="text-sm text-zinc-900 group-hover:underline">{form.maintain_in_batches}</span>
                </FormRow>
              </div>

              {form.maintain_in_batches === "Yes" && (
                <div className="cursor-pointer group pl-4" onClick={() => setShowPanel(p => p === "track_date_of_manufacturing" ? null : "track_date_of_manufacturing")}>
                  <FormRow label="Track date of manufacturing" labelWidth="w-44" className="flex items-center min-h-[26px]">
                    <span className="text-sm text-zinc-900 group-hover:underline">{form.track_date_of_manufacturing}</span>
                  </FormRow>
                </div>
              )}

              {form.maintain_in_batches === "Yes" && (
                <div className="cursor-pointer group pl-4" onClick={() => setShowPanel(p => p === "use_expiry_dates" ? null : "use_expiry_dates")}>
                  <FormRow label="Use expiry dates" labelWidth="w-44" className="flex items-center min-h-[26px]">
                    <span className="text-sm text-zinc-900 group-hover:underline">{form.use_expiry_dates}</span>
                  </FormRow>
                </div>
              )}

              {form.unit_id && (
                <FormRow label="Set components (BOM)" labelWidth="w-44" className="flex items-center min-h-[26px]">
                  <div className="flex items-center gap-1.5">
                    <select
                      className="bg-transparent text-sm outline-none border-b border-zinc-300 focus:border-zinc-600 cursor-pointer font-mono"
                      value={form.has_bom ? "Yes" : "No"}
                      onChange={handleBomToggle}
                    >
                      <option value="No">No</option>
                      <option value="Yes">Yes</option>
                    </select>
                    {form.has_bom && boms.length > 0 && (
                      <span className="text-xs text-zinc-400 font-sans">({boms.length} BOM{boms.length > 1 ? "s" : ""})</span>
                    )}
                  </div>
                </FormRow>
              )}

              <div className="cursor-pointer group" onClick={() => setShowPanel(p => p === "enable_cost_tracking" ? null : "enable_cost_tracking")}>
                <FormRow label="Enable cost tracking" labelWidth="w-44" className="flex items-center min-h-[26px]">
                  <span className="text-sm text-zinc-900 group-hover:underline">{form.enable_cost_tracking}</span>
                </FormRow>
              </div>
            </div>

            <GSTStatutoryDetails
              form={form}
              setVal={setVal}
              setActivePanel={setShowPanel}
              gstClassifications={gstClassifications}
            />
          </div>

          <div className="shrink-0 border-t border-zinc-200">
            <div className="flex items-center px-6 pt-1.5 pb-0.5 border-b border-zinc-100 font-sans">
              <span className="w-32 shrink-0" />
              <span className="w-4 shrink-0" />
              <div className="flex-1 flex items-center justify-end">
                <span className="w-32 text-right text-[10px] uppercase tracking-widest text-zinc-400 font-semibold">Quantity</span>
                <span className="w-28 text-right text-[10px] uppercase tracking-widest text-zinc-400 font-semibold ml-4">Rate</span>
                <span className="w-16 text-center text-[10px] uppercase tracking-widest text-zinc-400 font-semibold ml-2">per</span>
                <span className="w-36 text-right text-[10px] uppercase tracking-widest text-zinc-400 font-semibold">Value</span>
              </div>
            </div>
            <div className="flex items-center px-6 py-2">
              <span className="w-32 text-sm text-zinc-700 shrink-0 font-sans">Opening Balance</span>
              <span className="w-4 text-zinc-400 shrink-0 text-center">:</span>
              <div className="flex-1 flex items-center justify-end">
                <div className="w-32 flex items-center gap-1 border-b border-zinc-300 focus-within:border-zinc-600">
                  <input
                    className="w-20 bg-transparent text-sm outline-none py-0.5 text-right tabular-nums font-mono"
                    type="number" min="0" step="0.01"
                    value={form.opening_quantity}
                    onChange={e => setVal("opening_quantity", e.target.value)}
                    placeholder="0"
                  />
                  <span className="text-sm text-zinc-600 shrink-0 font-sans">{form.unit_id ? selectedUnitLabel : ""}</span>
                </div>
                {openingQty > 0 && (form.track_batches || godowns.length > 0) && (
                  <button
                    type="button"
                    onClick={() => setShowAllocationModal(true)}
                    className="ml-2 text-xs px-2 py-0.5 rounded border border-zinc-300 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 font-sans font-medium shrink-0 transition-colors"
                  >
                    {form.allocations.length > 0 ? `Allocated (${form.allocations.length})` : "Allocate"}
                  </button>
                )}
                <div className="w-28 ml-4 border-b border-zinc-300 focus-within:border-zinc-600">
                  <input
                    className="w-full bg-transparent text-sm outline-none py-0.5 text-right tabular-nums pr-1 font-mono"
                    type="number" min="0" step="0.01"
                    value={form.opening_rate}
                    onChange={e => setVal("opening_rate", e.target.value)}
                    placeholder="0.00"
                  />
                </div>
                <span className="w-16 text-center text-sm text-zinc-600 ml-2 shrink-0 font-sans">{form.unit_id ? selectedUnitLabel : ""}</span>
                <span className="w-36 text-right text-sm font-mono text-zinc-800 tabular-nums">
                  {openingValue > 0 ? openingValue.toLocaleString("en-IN", { minimumFractionDigits: 2 }) : ""}
                </span>
              </div>
            </div>
          </div>
        </div>

        {showPanel === "group" && (
          <ListSidePanel
            title="List of Groups"
            items={stockGroups.filter(g => g.name.toLowerCase() !== "primary").map(g => ({ id: String(g.sg_id), label: g.name }))}
            selected={form.group_id}
            onSelect={val => { setVal("group_id", val); setShowPanel(null); }}
            onClose={() => setShowPanel(null)}
            showPrimary
            primaryLabel="Primary"
          />
        )}
        {showPanel === "unit" && (
          <ListSidePanel
            title="List of Units"
            items={units.map(u => ({ id: String(u.unit_id), label: `${u.symbol} (${u.name})` }))}
            selected={form.unit_id}
            onSelect={val => { setVal("unit_id", val); setShowPanel(null); }}
            onClose={() => setShowPanel(null)}
            showPrimary
            primaryLabel="Not Applicable"
            showCreate
            onCreateNew={() => navigate("/master/create/unit")}
          />
        )}
        {showPanel === "gst_applicable" && (
          <ListSidePanel
            title="GST Applicability"
            items={GST_APPLICABILITY_OPTIONS}
            selected={form.gst_applicable}
            onSelect={val => {
              setForm(f => {
                if (!f) return null;
                return {
                  ...f,
                  gst_applicable: val || "Not Applicable",
                  ...(val !== "Applicable" ? {
                    hsn_sac_details: "as_per_company",
                    hsn_sac: "",
                    hsn_sac_description: "",
                    hsn_classification_id: "",
                    gst_rate_details: "as_per_company",
                    rate_classification_id: "",
                    taxability_type: "",
                    gst_rate: "0",
                    type_of_supply: "Goods",
                  } : {})
                };
              });
              setShowPanel(null);
            }}
            onClose={() => setShowPanel(null)}
          />
        )}
        {showPanel === "hsn_sac_details" && (
          <ListSidePanel
            title="HSN/SAC Details"
            items={HSN_SAC_DETAILS_OPTIONS}
            selected={form.hsn_sac_details}
            onSelect={val => { setVal("hsn_sac_details", val || "as_per_company"); setShowPanel(null); }}
            onClose={() => setShowPanel(null)}
          />
        )}
        {showPanel === "hsn_classification" && (
          <ListSidePanel
            title="GST Classifications"
            items={gstClassifications.map(c => ({ id: String(c.gc_id), label: c.name }))}
            selected={form.hsn_classification_id}
            onSelect={val => { setVal("hsn_classification_id", val); setShowPanel(null); }}
            onClose={() => setShowPanel(null)}
            showCreate
            onCreateNew={() => navigate("/master/create/gst-classification")}
          />
        )}
        {showPanel === "gst_rate_details" && (
          <ListSidePanel
            title="GST Rate Details"
            items={GST_RATE_DETAILS_OPTIONS}
            selected={form.gst_rate_details}
            onSelect={val => { setVal("gst_rate_details", val || "as_per_company"); setShowPanel(null); }}
            onClose={() => setShowPanel(null)}
          />
        )}
        {showPanel === "rate_classification" && (
          <ListSidePanel
            title="GST Classifications"
            items={gstClassifications.map(c => ({ id: String(c.gc_id), label: c.name }))}
            selected={form.rate_classification_id}
            onSelect={val => { setVal("rate_classification_id", val); setShowPanel(null); }}
            onClose={() => setShowPanel(null)}
            showCreate
            onCreateNew={() => navigate("/master/create/gst-classification")}
          />
        )}
        {showPanel === "taxability_type" && (
          <ListSidePanel
            title="Taxability Type"
            items={TAXABILITY_TYPE_OPTIONS}
            selected={form.taxability_type}
            onSelect={val => { setVal("taxability_type", val || "Taxable"); setShowPanel(null); }}
            onClose={() => setShowPanel(null)}
          />
        )}
        {showPanel === "type_of_supply" && (
          <ListSidePanel
            title="Type of Supply"
            items={TYPE_OF_SUPPLY_OPTIONS}
            selected={form.type_of_supply}
            onSelect={val => { setVal("type_of_supply", val || "Goods"); setShowPanel(null); }}
            onClose={() => setShowPanel(null)}
          />
        )}
        {showPanel === "maintain_in_batches" && (
          <ListSidePanel
            title="Maintain in batches"
            items={YES_NO_OPTIONS}
            selected={form.maintain_in_batches}
            onSelect={val => {
              setForm(f => f ? {
                ...f,
                maintain_in_batches: val || "No",
                track_date_of_manufacturing: val !== "Yes" ? "No" : f.track_date_of_manufacturing,
                use_expiry_dates: val !== "Yes" ? "No" : f.use_expiry_dates,
                track_batches: val === "Yes",
                track_expiry: val === "Yes" && f.use_expiry_dates === "Yes",
                allocations: val !== "Yes" ? [] : f.allocations,
              } : null);
              setShowPanel(null);
            }}
            onClose={() => setShowPanel(null)}
          />
        )}
        {showPanel === "track_date_of_manufacturing" && (
          <ListSidePanel
            title="Track date of manufacturing"
            items={YES_NO_OPTIONS}
            selected={form.track_date_of_manufacturing}
            onSelect={val => { setVal("track_date_of_manufacturing", val || "No"); setShowPanel(null); }}
            onClose={() => setShowPanel(null)}
          />
        )}
        {showPanel === "use_expiry_dates" && (
          <ListSidePanel
            title="Use expiry dates"
            items={YES_NO_OPTIONS}
            selected={form.use_expiry_dates}
            onSelect={val => {
              setForm(f => f ? { ...f, use_expiry_dates: val || "No", track_expiry: val === "Yes" } : null);
              setShowPanel(null);
            }}
            onClose={() => setShowPanel(null)}
          />
        )}
        {showPanel === "enable_cost_tracking" && (
          <ListSidePanel
            title="Enable cost tracking"
            items={YES_NO_OPTIONS}
            selected={form.enable_cost_tracking}
            onSelect={val => { setVal("enable_cost_tracking", val || "No"); setShowPanel(null); }}
            onClose={() => setShowPanel(null)}
          />
        )}
        {showPanel === "set_alter_statutory" && (
          <ListSidePanel
            title="Set/Alter other Statutory details"
            items={YES_NO_OPTIONS}
            selected={form.set_alter_statutory}
            onSelect={val => {
              setVal("set_alter_statutory", val || "No");
              if (val === "Yes") { setShowPanel(null); setShowOtherStatutory(true); }
              else setShowPanel(null);
            }}
            onClose={() => setShowPanel(null)}
          />
        )}

        <RightActionPanel actions={alterActions} />
      </div>

      <MasterFormFooter
        onCancel={handleBack}
        onSubmit={handleSubmit}
        onDelete={handleDelete}
        loading={loading}
        submitLabel="Accept"
      />

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
          onAccept={(entry) => handleBomAccept(entry, executeSave)}
        />
      )}
      {showAllocationModal && (
        <OpeningBalanceAllocationModal
          itemName={form.name}
          totalQuantity={openingQty}
          defaultRate={openingRate}
          trackBatches={form.track_batches}
          trackExpiry={form.track_expiry}
          godowns={godowns}
          initialAllocations={form.allocations}
          onAccept={(allocs) => { setForm(f => f ? ({ ...f, allocations: allocs }) : null); setShowAllocationModal(false); }}
          onClose={() => setShowAllocationModal(false)}
        />
      )}
      {showOtherStatutory && (
        <OtherStatutoryDetails
          stockItemName={form.name}
          unitLabel={selectedUnitLabel}
          initialData={{
            excise_applicable: form.excise_applicable,
            set_alter_excise_details: form.set_alter_excise_details,
            excise_tariff_name: form.excise_tariff_name,
            excise_tariff_hsn_code: form.excise_tariff_hsn_code,
            excise_tariff_uom: form.excise_tariff_uom,
            excise_tariff_valuation_type: form.excise_tariff_valuation_type,
            excise_tariff_rate: form.excise_tariff_rate,
            excise_tariff_rate_per_unit: form.excise_tariff_rate_per_unit,
            vat_applicable: form.vat_applicable,
            set_alter_vat_details: form.set_alter_vat_details,
          }}
          onAccept={(data) => {
            setForm(f => f ? {
              ...f,
              excise_applicable: data.excise_applicable,
              set_alter_excise_details: data.set_alter_excise_details,
              excise_tariff_name: data.excise_tariff_name,
              excise_tariff_hsn_code: data.excise_tariff_hsn_code,
              excise_tariff_uom: data.excise_tariff_uom,
              excise_tariff_valuation_type: data.excise_tariff_valuation_type,
              excise_tariff_rate: data.excise_tariff_rate,
              excise_tariff_rate_per_unit: data.excise_tariff_rate_per_unit,
              vat_applicable: data.vat_applicable,
              set_alter_vat_details: data.set_alter_vat_details,
            } : null);
            setShowOtherStatutory(false);
          }}
          onClose={() => setShowOtherStatutory(false)}
        />
      )}
    </div>
  );
}