import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useCompany } from "@/context/CompanyContext";
import type { StockGroupType, UnitType, GodownType } from "@/types/api";
import { loadFormState, saveFormState, clearFormState } from "@/utils/formPersistence";
import BomListModal from "./components/BomListModal";
import BomComponentsModal, { type BomEntry } from "./components/BomComponentsModal";
import ListSidePanel from "./components/ListSidePanel";
import GSTStatutoryDetails from "./components/GSTStatutoryDetails";
import OpeningBalanceAllocationModal from "./components/OpeningBalanceAllocationModal";
import OtherStatutoryDetails from "./components/OtherStatutoryDetails";
import type { FormData, PanelType } from "./types";
import {
  INITIAL_FORM_STATE,
  GST_APPLICABILITY_OPTIONS,
  HSN_SAC_DETAILS_OPTIONS,
  GST_RATE_DETAILS_OPTIONS,
  TAXABILITY_TYPE_OPTIONS,
  TYPE_OF_SUPPLY_OPTIONS,
  YES_NO_OPTIONS
} from "./consts";
import { calculateGstDetails } from "./utils";
import { useStockItemBom } from "./hooks/useStockItemBom";

export default function StockItemCreate() {
  const navigate = useNavigate();
  const { selectedCompany } = useCompany();
  const companyId = selectedCompany?.company_id;
  const persistKey = companyId ? `stockItemCreate_${companyId}` : null;
  const hasRestored = useRef(false);

  const [form, setForm] = useState<FormData>(
    () => loadFormState<any>(persistKey ?? "")?.form ?? INITIAL_FORM_STATE
  );
  const [stockGroups, setStockGroups] = useState<StockGroupType[]>([]);
  const [units, setUnits] = useState<UnitType[]>([]);
  const [godowns, setGodowns] = useState<GodownType[]>([]);
  const [gstClassifications, setGstClassifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [activePanel, setActivePanel] = useState<PanelType>(null);
  const [showAllocationModal, setShowAllocationModal] = useState(false);
  const [showOtherStatutory, setShowOtherStatutory] = useState(false);

  const updateFormFields = useCallback((updater: (prev: FormData) => Partial<FormData>) => {
    setForm(f => ({ ...f, ...updater(f) }));
  }, []);

  const {
    boms,
    setBoms,
    showBomList,
    setShowBomList,
    showBomComponents,
    setShowBomComponents,
    currentBomName,
    savePendingRef,
    handleBomToggle,
    handleBomSelect,
    handleBomAccept,
    handleBomListClose,
    handleBomComponentsClose,
  } = useStockItemBom(updateFormFields);

  // Fetch lists on company change
  useEffect(() => {
    const cid = selectedCompany?.company_id;
    if (!cid) return;
    window.api.stockGroup.getAll(cid).then(r => {
      if (r.success) setStockGroups(r.stockGroups ?? []);
    });
    window.api.unit.getAll(cid).then(r => {
      if (r.success) setUnits(r.units ?? []);
    });
    window.api.godown.getAll(cid).then(r => {
      if (r.success) setGodowns(r.godowns ?? []);
    });
    window.api.gstClassification.getAll(cid).then(r => {
      if (r.success) setGstClassifications(r.gstClassifications ?? []);
    });
  }, [selectedCompany]);

  // Persist form state
  useEffect(() => {
    if (!persistKey) return;
    if (!hasRestored.current) { hasRestored.current = true; return; }
    saveFormState(persistKey, { form });
  }, [persistKey, form]);

  const setVal = useCallback((key: keyof FormData, value: any) => {
    setForm(f => ({ ...f, [key]: value }));
  }, []);

  const selectedGroupLabel = form.group_id
    ? (stockGroups.find(g => String(g.sg_id) === form.group_id)?.name ?? "Primary")
    : "Primary";

  const selectedUnitLabel = form.unit_id
    ? (units.find(u => String(u.unit_id) === form.unit_id)?.symbol ?? "Not Applicable")
    : "Not Applicable";

  const openingQty = parseFloat(form.opening_quantity) || 0;
  const openingRate = parseFloat(form.opening_rate) || 0;
  const openingValue = openingQty * openingRate;

  const executeSave = async (bomsToSave: BomEntry[] = boms) => {
    if (!companyId) return;
    setLoading(true);
    setError(null);

    const gst = calculateGstDetails(form, gstClassifications);

    try {
      const result = await window.api.stockItem.create({
        company_id: companyId,
        name: form.name.trim(),
        alias: form.alias.trim() || undefined,
        group_id: form.group_id ? Number(form.group_id) : undefined,
        unit_id: form.unit_id ? Number(form.unit_id) : undefined,
        rate_of_duty: Number(form.rate_of_duty) || 0,
        has_bom: form.has_bom,
        bom_name: form.has_bom ? (bomsToSave[0]?.bomName || form.bom_name).trim() || undefined : undefined,
        opening_quantity: Number(form.opening_quantity) || 0,
        opening_rate: Number(form.opening_rate) || 0,
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
        reorder_level: 0,
        reorder_quantity: 0,
        track_batches: form.track_batches ? 1 : 0,
        track_expiry: form.track_expiry ? 1 : 0,
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
        setSuccess(`"${form.name}" created.`);
        setForm(INITIAL_FORM_STATE);
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
  };

  const handleSubmit = useCallback(() => {
    if (!form.name.trim()) { setError("Name is required."); return; }
    if (!companyId) { setError("No company selected."); return; }

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
  }, [form, companyId, boms, gstClassifications, openingQty, godowns]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        if (showBomList) { setShowBomList(false); savePendingRef.current = false; return; }
        if (showBomComponents) { setShowBomComponents(false); savePendingRef.current = false; return; }
        if (activePanel) { setActivePanel(null); return; }
        navigate("/master/create");
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
  }, [handleSubmit, activePanel, showBomList, showBomComponents, navigate]);

  const inp = "w-full bg-transparent text-sm outline-none border-b border-zinc-300 focus:border-zinc-600 py-0 px-0 placeholder-zinc-300 transition-colors";

  return (
    <div className="flex flex-col h-full bg-white select-none overflow-hidden" style={{ fontFamily: "system-ui, sans-serif" }}>
      {/* Title bar */}
      <div className="shrink-0 bg-zinc-900 text-white text-xs font-bold px-4 py-2 tracking-widest uppercase">
        Stock Item Creation
      </div>

      {/* Alerts */}
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

      {/* Body */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* MAIN FORM */}
        <div className="flex flex-col flex-1 min-w-0">
          {/* Top Section: Name and Alias */}
          <div className="px-6 py-4 border-b border-zinc-200 flex flex-col gap-1 shrink-0">
            {/* Name */}
            <div className="flex items-center min-h-[26px]">
              <span className="w-24 shrink-0 text-sm text-zinc-700 font-sans">Name</span>
              <span className="w-4 shrink-0 text-zinc-400 text-sm text-center">:</span>
              <div className="flex-1">
                <input autoFocus className={inp} value={form.name} onChange={e => setVal("name", e.target.value)} placeholder="Enter item name" />
              </div>
            </div>

            {/* alias */}
            <div className="flex items-center min-h-[26px]">
              <span className="w-24 shrink-0 text-sm text-zinc-400 font-sans">(alias)</span>
              <span className="w-4 shrink-0 text-zinc-400 text-sm text-center">:</span>
              <div className="flex-1">
                <input className={inp} value={form.alias} onChange={e => setVal("alias", e.target.value)} placeholder="Optional alias" style={{ color: "#aaa" }} />
              </div>
            </div>
          </div>

          {/* Two-column content */}
          <div className="flex flex-1 min-h-0 overflow-hidden">
            {/* LEFT PANEL */}
            <div className="flex-1 min-w-0 px-6 pt-4 pb-2 overflow-y-auto flex flex-col gap-0 border-r border-zinc-200">
              {/* Under */}
              <div
                className="flex items-center min-h-[26px] cursor-pointer group"
                onClick={() => setActivePanel(p => p === "group" ? null : "group")}
              >
                <span className="w-32 shrink-0 text-sm text-zinc-700 font-sans">Under</span>
                <span className="w-4 shrink-0 text-zinc-400 text-sm text-center">:</span>
                <div className="flex-1">
                  <span className="text-sm text-zinc-900 group-hover:underline">{selectedGroupLabel}</span>
                </div>
              </div>

              {/* Units */}
              <div
                className="flex items-center min-h-[26px] cursor-pointer group"
                onClick={() => setActivePanel(p => p === "unit" ? null : "unit")}
              >
                <span className="w-32 shrink-0 text-sm text-zinc-700 font-sans">Units</span>
                <span className="w-4 shrink-0 text-zinc-400 text-sm text-center">:</span>
                <div className="flex-1">
                  <span className="text-sm text-zinc-900 group-hover:underline">{selectedUnitLabel}</span>
                </div>
              </div>

              {/* ── Additional Details ── */}
              <div className="text-sm font-bold text-zinc-900 mt-4 mb-1 font-sans">Additional Details</div>

              {/* Maintain in batches */}
              <div
                className="flex items-center min-h-[26px] cursor-pointer group"
                onClick={() => setActivePanel(p => p === "maintain_in_batches" ? null : "maintain_in_batches")}
              >
                <span className="w-44 shrink-0 text-sm text-zinc-700 font-sans">Maintain in batches</span>
                <span className="w-4 shrink-0 text-zinc-400 text-sm text-center">:</span>
                <div className="flex-1">
                  <span className="text-sm text-zinc-900 group-hover:underline">{form.maintain_in_batches}</span>
                </div>
              </div>

              {/* Track date of manufacturing */}
              {form.maintain_in_batches === "Yes" && (
                <div
                  className="flex items-center min-h-[26px] cursor-pointer group"
                  onClick={() => setActivePanel(p => p === "track_date_of_manufacturing" ? null : "track_date_of_manufacturing")}
                >
                  <span className="w-44 shrink-0 text-sm text-zinc-700 font-sans pl-4">Track date of manufacturing</span>
                  <span className="w-4 shrink-0 text-zinc-400 text-sm text-center">:</span>
                  <div className="flex-1">
                    <span className="text-sm text-zinc-900 group-hover:underline">{form.track_date_of_manufacturing}</span>
                  </div>
                </div>
              )}

              {/* Use expiry dates */}
              {form.maintain_in_batches === "Yes" && (
                <div
                  className="flex items-center min-h-[26px] cursor-pointer group"
                  onClick={() => setActivePanel(p => p === "use_expiry_dates" ? null : "use_expiry_dates")}
                >
                  <span className="w-44 shrink-0 text-sm text-zinc-700 font-sans pl-4">Use expiry dates</span>
                  <span className="w-4 shrink-0 text-zinc-400 text-sm text-center">:</span>
                  <div className="flex-1">
                    <span className="text-sm text-zinc-900 group-hover:underline">{form.use_expiry_dates}</span>
                  </div>
                </div>
              )}

              {/* Set components (BOM) */}
              {form.unit_id && (
                <div className="flex items-center min-h-[26px] mt-0">
                  <span className="w-44 shrink-0 text-sm text-zinc-700 font-sans">Set components (BOM)</span>
                  <span className="w-4 shrink-0 text-zinc-400 text-sm text-center">:</span>
                  <div className="flex-1 flex items-center gap-1.5">
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
                </div>
              )}

              {/* Enable cost tracking */}
              <div
                className="flex items-center min-h-[26px] cursor-pointer group"
                onClick={() => setActivePanel(p => p === "enable_cost_tracking" ? null : "enable_cost_tracking")}
              >
                <span className="w-44 shrink-0 text-sm text-zinc-700 font-sans">Enable cost tracking</span>
                <span className="w-4 shrink-0 text-zinc-400 text-sm text-center">:</span>
                <div className="flex-1">
                  <span className="text-sm text-zinc-900 group-hover:underline">{form.enable_cost_tracking}</span>
                </div>
              </div>
            </div>

            {/* RIGHT PANEL: Statutory Details */}
            <GSTStatutoryDetails
              form={form}
              setVal={setVal}
              setActivePanel={setActivePanel}
              gstClassifications={gstClassifications}
            />
          </div>

          {/* Opening Balance */}
          <div className="shrink-0 border-t border-zinc-300">
            {/* Column headers */}
            <div className="flex items-center px-6 pt-1 pb-0 border-b border-zinc-100">
              <span className="w-32 shrink-0" />
              <span className="w-4 shrink-0" />
              <div className="flex-1 flex items-center justify-end">
                <span className="w-36 text-right text-[10px] uppercase tracking-widest text-zinc-500 font-semibold pr-1 font-sans">Quantity</span>
                <span className="w-24 text-right text-[10px] uppercase tracking-widest text-zinc-500 font-semibold ml-4 font-sans">Rate</span>
                <span className="w-10 text-center text-[10px] uppercase tracking-widest text-zinc-500 font-semibold ml-2 font-sans">per</span>
                <span className="w-28 text-right text-[10px] uppercase tracking-widest text-zinc-500 font-semibold font-sans">Value</span>
              </div>
            </div>
            {/* Data row */}
            <div className="flex items-center px-6 py-2">
              <span className="w-32 shrink-0 text-sm text-zinc-700 font-sans">Opening Balance</span>
              <span className="w-4 shrink-0 text-zinc-400 text-sm text-center">:</span>
              <div className="flex-1 flex items-center justify-end">
                {/* Quantity */}
                <div className="w-36 flex items-center justify-end gap-1 border-b border-zinc-400 focus-within:border-zinc-700 pr-1">
                  <input
                    className="w-24 bg-transparent text-sm outline-none py-0.5 text-right tabular-nums font-mono"
                    type="number" min="0" step="0.001"
                    value={form.opening_quantity}
                    onChange={e => setVal("opening_quantity", e.target.value)}
                    placeholder="0"
                  />
                  {form.unit_id && (
                    <span className="text-xs text-zinc-500 shrink-0 font-sans">{selectedUnitLabel}</span>
                  )}
                </div>
                {/* Allocation button */}
                {openingQty > 0 && (form.track_batches || godowns.length > 0) && (
                  <button
                    type="button"
                    onClick={() => setShowAllocationModal(true)}
                    className="ml-2 text-xs px-2 py-0.5 rounded border border-zinc-300 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 font-sans font-medium shrink-0 transition-colors"
                  >
                    {form.allocations.length > 0 ? `Allocated (${form.allocations.length})` : "Allocate"}
                  </button>
                )}
                {/* Rate */}
                <div className="w-24 ml-4 border-b border-zinc-400 focus-within:border-zinc-700">
                  <input
                    className="w-full bg-transparent text-sm outline-none py-0.5 text-right tabular-nums pr-1 font-mono"
                    type="number" min="0" step="0.01"
                    value={form.opening_rate}
                    onChange={e => setVal("opening_rate", e.target.value)}
                    placeholder="0.00"
                  />
                </div>
                {/* per */}
                <span className="w-10 text-center text-xs text-zinc-500 ml-2 shrink-0 font-sans">
                  {form.unit_id ? selectedUnitLabel : ""}
                </span>
                {/* Value */}
                <span className="w-28 text-right text-sm tabular-nums text-zinc-800 font-mono">
                  {openingValue > 0
                    ? openingValue.toLocaleString("en-IN", { minimumFractionDigits: 2 })
                    : ""}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Side selection panels */}
        {activePanel === "group" && (
          <ListSidePanel
            title="List of Groups"
            items={stockGroups.map(g => ({ id: String(g.sg_id), label: g.name }))}
            selected={form.group_id}
            onSelect={val => { setVal("group_id", val); setActivePanel(null); }}
            onClose={() => setActivePanel(null)}
            showPrimary
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
            showPrimary
            primaryLabel="Not Applicable"
            showCreate
            onCreateNew={() => navigate("/master/create/unit")}
          />
        )}
        {activePanel === "gst_applicable" && (
          <ListSidePanel
            title="GST Applicability"
            items={GST_APPLICABILITY_OPTIONS}
            selected={form.gst_applicable}
            onSelect={val => {
              setForm(f => ({
                ...f,
                gst_applicable: val || "Not Applicable",
                // Reset child state if not applicable
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
              }));
              setActivePanel(null);
            }}
            onClose={() => setActivePanel(null)}
          />
        )}
        {activePanel === "hsn_sac_details" && (
          <ListSidePanel
            title="HSN/SAC Details"
            items={HSN_SAC_DETAILS_OPTIONS}
            selected={form.hsn_sac_details}
            onSelect={val => { setVal("hsn_sac_details", val || "as_per_company"); setActivePanel(null); }}
            onClose={() => setActivePanel(null)}
          />
        )}
        {activePanel === "hsn_classification" && (
          <ListSidePanel
            title="GST Classifications"
            items={gstClassifications.map(c => ({ id: String(c.gc_id), label: c.name }))}
            selected={form.hsn_classification_id}
            onSelect={val => {
              setVal("hsn_classification_id", val);
              setActivePanel(null);
            }}
            onClose={() => setActivePanel(null)}
            showCreate
            onCreateNew={() => navigate("/master/create/gst-classification")}
          />
        )}
        {activePanel === "gst_rate_details" && (
          <ListSidePanel
            title="GST Rate Details"
            items={GST_RATE_DETAILS_OPTIONS}
            selected={form.gst_rate_details}
            onSelect={val => { setVal("gst_rate_details", val || "as_per_company"); setActivePanel(null); }}
            onClose={() => setActivePanel(null)}
          />
        )}
        {activePanel === "rate_classification" && (
          <ListSidePanel
            title="GST Classifications"
            items={gstClassifications.map(c => ({ id: String(c.gc_id), label: c.name }))}
            selected={form.rate_classification_id}
            onSelect={val => {
              setVal("rate_classification_id", val);
              setActivePanel(null);
            }}
            onClose={() => setActivePanel(null)}
            showCreate
            onCreateNew={() => navigate("/master/create/gst-classification")}
          />
        )}
        {activePanel === "taxability_type" && (
          <ListSidePanel
            title="Taxability Type"
            items={TAXABILITY_TYPE_OPTIONS}
            selected={form.taxability_type}
            onSelect={val => { setVal("taxability_type", val || "Taxable"); setActivePanel(null); }}
            onClose={() => setActivePanel(null)}
          />
        )}
        {activePanel === "type_of_supply" && (
          <ListSidePanel
            title="Type of Supply"
            items={TYPE_OF_SUPPLY_OPTIONS}
            selected={form.type_of_supply}
            onSelect={val => { setVal("type_of_supply", val || "Goods"); setActivePanel(null); }}
            onClose={() => setActivePanel(null)}
          />
        )}
        {activePanel === "maintain_in_batches" && (
          <ListSidePanel
            title="Maintain in batches"
            items={YES_NO_OPTIONS}
            selected={form.maintain_in_batches}
            onSelect={val => {
              setForm(f => ({
                ...f,
                maintain_in_batches: val || "No",
                track_date_of_manufacturing: val !== "Yes" ? "No" : f.track_date_of_manufacturing,
                use_expiry_dates: val !== "Yes" ? "No" : f.use_expiry_dates,
                track_batches: val === "Yes",
                track_expiry: val === "Yes" && f.use_expiry_dates === "Yes",
                allocations: val !== "Yes" ? [] : f.allocations,
              }));
              setActivePanel(null);
            }}
            onClose={() => setActivePanel(null)}
          />
        )}
        {activePanel === "track_date_of_manufacturing" && (
          <ListSidePanel
            title="Track date of manufacturing"
            items={YES_NO_OPTIONS}
            selected={form.track_date_of_manufacturing}
            onSelect={val => { setVal("track_date_of_manufacturing", val || "No"); setActivePanel(null); }}
            onClose={() => setActivePanel(null)}
          />
        )}
        {activePanel === "use_expiry_dates" && (
          <ListSidePanel
            title="Use expiry dates"
            items={YES_NO_OPTIONS}
            selected={form.use_expiry_dates}
            onSelect={val => {
              setForm(f => ({
                ...f,
                use_expiry_dates: val || "No",
                track_expiry: val === "Yes"
              }));
              setActivePanel(null);
            }}
            onClose={() => setActivePanel(null)}
          />
        )}
        {activePanel === "enable_cost_tracking" && (
          <ListSidePanel
            title="Enable cost tracking"
            items={YES_NO_OPTIONS}
            selected={form.enable_cost_tracking}
            onSelect={val => { setVal("enable_cost_tracking", val || "No"); setActivePanel(null); }}
            onClose={() => setActivePanel(null)}
          />
        )}
        {activePanel === "set_alter_statutory" && (
          <ListSidePanel
            title="Set/Alter other Statutory details"
            items={YES_NO_OPTIONS}
            selected={form.set_alter_statutory}
            onSelect={val => {
              setVal("set_alter_statutory", val || "No");
              if (val === "Yes") {
                setActivePanel(null);
                setShowOtherStatutory(true);
              } else {
                setActivePanel(null);
              }
            }}
            onClose={() => setActivePanel(null)}
          />
        )}
      </div>

      {/* Other Statutory Details modal */}
      {showOtherStatutory && (
        <OtherStatutoryDetails
          stockItemName={form.name}
          unitLabel={selectedUnitLabel}
          onAccept={(data) => {
            setForm(f => ({
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
            }));
            setShowOtherStatutory(false);
          }}
          onClose={() => setShowOtherStatutory(false)}
        />
      )}

      {/* Footer bar */}
      <div className="border-t border-zinc-200 px-4 py-2.5 flex justify-between items-center shrink-0 bg-zinc-50">
        <button
          onClick={() => navigate("/master/create")}
          className="text-xs text-zinc-500 hover:text-zinc-800 transition-colors font-medium font-sans"
        >
          <span className="font-bold">Q</span>: Quit
        </button>
        <button
          onClick={handleSubmit}
          disabled={loading}
          className="text-sm px-6 py-1.5 rounded bg-black text-white hover:bg-zinc-800 disabled:opacity-50 transition-colors font-medium font-sans"
        >
          {loading ? "Saving…" : "Accept"}
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
          onAccept={(allocs) => {
            setForm(f => ({ ...f, allocations: allocs }));
            setShowAllocationModal(false);
          }}
          onClose={() => setShowAllocationModal(false)}
        />
      )}
    </div>
  );
}
