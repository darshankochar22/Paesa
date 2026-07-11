import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCompany } from '@/context/CompanyContext';
import { PageTitleBar, RightActionPanel, FormRow, MasterFormFooter } from '@/components/ui';
import type { StockGroupType, StockCategoryType, UnitType, GodownType } from '@/types/api';
import type { StockItemType } from '@/types/entities/StockItem';
import BomListModal from './components/BomListModal';
import BomComponentsModal, { type BomEntry } from './components/BomComponentsModal';
import ListSidePanel from './components/ListSidePanel';
import { focusFieldAfter } from '@/hooks/useEnterNavigation';
import GSTStatutoryDetails from './components/GSTStatutoryDetails';
import OpeningBalanceAllocationModal from './components/OpeningBalanceAllocationModal';
import OtherStatutoryDetails from './components/OtherStatutoryDetails';
import type { FormData, PanelType } from './types';
import { INITIAL_FORM_STATE } from './consts';
import { calculateGstDetails } from './utils';
import { useStockItemBom } from './hooks/useStockItemBom';

interface StockItemCreateProps {
  onDone?: () => void;
  onCancel?: () => void;
}

export default function StockItemCreate({ onDone, onCancel }: StockItemCreateProps = {}) {
  const navigate = useNavigate();
  const { selectedCompany } = useCompany();
  const companyId = selectedCompany?.company_id;

  const [form, setForm] = useState<FormData>(INITIAL_FORM_STATE);
  const [stockGroups, setStockGroups] = useState<StockGroupType[]>([]);
  const [stockCategories, setStockCategories] = useState<StockCategoryType[]>([]);
  const [units, setUnits] = useState<UnitType[]>([]);
  const [godowns, setGodowns] = useState<GodownType[]>([]);
  const [stockItems, setStockItems] = useState<StockItemType[]>([]);
  const [gstClassifications, setGstClassifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [activePanel, setActivePanel] = useState<PanelType>(null);
  const [showAllocationModal, setShowAllocationModal] = useState(false);
  const [showOtherStatutory, setShowOtherStatutory] = useState(false);

  const nameRef = useRef<HTMLInputElement>(null);
  const aliasRef = useRef<HTMLInputElement>(null);
  const openingQtyRef = useRef<HTMLInputElement>(null);
  const openingRateRef = useRef<HTMLInputElement>(null);
  const underRef = useRef<HTMLDivElement>(null);
  const categoryRef = useRef<HTMLDivElement>(null);
  const unitRef = useRef<HTMLDivElement>(null);

  const updateFormFields = useCallback((updater: (prev: FormData) => Partial<FormData>) => {
    setForm((f) => ({ ...f, ...updater(f) }));
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

  useEffect(() => {
    const cid = selectedCompany?.company_id;
    if (!cid) return;
    window.api.stockGroup.getAll(cid).then((r) => {
      if (r.success) setStockGroups(r.stockGroups ?? []);
    });
    window.api.stockCategory.getAll(cid).then((r) => {
      if (r.success) setStockCategories(r.stockCategories ?? []);
    });
    window.api.unit.getAll(cid).then((r) => {
      if (r.success) setUnits(r.units ?? []);
    });
    window.api.godown.getAll(cid).then((r) => {
      if (r.success) setGodowns(r.godowns ?? []);
    });
    window.api.stockItem.getAll(cid).then((r) => {
      if (r.success) setStockItems(r.stockItems ?? []);
    });
    window.api.gstClassification.getAll(cid).then((r) => {
      if (r.success) setGstClassifications(r.gstClassifications ?? []);
    });
  }, [selectedCompany]);

  const setVal = useCallback((key: keyof FormData, value: any) => {
    setForm((f) => ({ ...f, [key]: value }));
  }, []);

  const selectedGroupLabel = form.group_id
    ? (stockGroups.find((g) => String(g.sg_id) === form.group_id)?.name ?? 'Primary')
    : 'Primary';

  const selectedCategoryLabel = form.category_id
    ? (stockCategories.find((c) => String(c.sc_id) === form.category_id)?.name ?? 'Not Applicable')
    : 'Not Applicable';

  const selectedUnitLabel = form.unit_id
    ? (units.find((u) => String(u.unit_id) === form.unit_id)?.symbol ?? 'Not Applicable')
    : 'Not Applicable';

  const openingQty = parseFloat(form.opening_quantity) || 0;
  const openingRate = parseFloat(form.opening_rate) || 0;
  const openingValue = openingQty * openingRate;

  const handleQuit = () => {
    if (onCancel) {
      onCancel();
      return;
    }
    navigate('/master/create');
  };

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
        category_id: form.category_id ? Number(form.category_id) : undefined,
        unit_id: form.unit_id ? Number(form.unit_id) : undefined,
        rate_of_duty: Number(form.rate_of_duty) || 0,
        has_bom: form.has_bom,
        bom_name: form.has_bom
          ? (bomsToSave[0]?.bomName || form.bom_name).trim() || undefined
          : undefined,
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
        track_date_of_manufacturing: form.track_date_of_manufacturing === 'Yes' ? 1 : 0,
        enable_cost_tracking: form.enable_cost_tracking === 'Yes' ? 1 : 0,
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
        setTimeout(() => {
          setSuccess(null);
          if (onDone) onDone();
        }, 1500);
      } else {
        setError(result.error || 'Failed to create stock item.');
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unexpected error.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = useCallback(() => {
    if (!form.name.trim()) {
      setError('Name is required.');
      return;
    }
    if (!companyId) {
      setError('No company selected.');
      return;
    }
    if (form.has_bom && boms.length === 0) {
      savePendingRef.current = true;
      setShowBomList(true);
      return;
    }
    if (
      openingQty > 0 &&
      form.allocations.length === 0 &&
      (form.track_batches || godowns.length > 0)
    ) {
      setError('Please allocate the opening balance quantity to godowns/batches.');
      setShowAllocationModal(true);
      return;
    }
    executeSave(boms);
  }, [form, companyId, boms, gstClassifications, openingQty, godowns]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        if (showBomList) {
          setShowBomList(false);
          savePendingRef.current = false;
          return;
        }
        if (showBomComponents) {
          setShowBomComponents(false);
          savePendingRef.current = false;
          return;
        }
        if (activePanel) {
          setActivePanel(null);
          return;
        }
        handleQuit();
        return;
      }
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      if (e.altKey && e.key.toLowerCase() === 'g') {
        e.preventDefault();
        setActivePanel((p) => (p === 'group' ? null : 'group'));
      }
      if (e.altKey && e.key.toLowerCase() === 't') {
        e.preventDefault();
        setActivePanel((p) => (p === 'category' ? null : 'category'));
      }
      if (e.altKey && e.key.toLowerCase() === 'u') {
        e.preventDefault();
        setActivePanel((p) => (p === 'unit' ? null : 'unit'));
      }
      if ((e.altKey || e.ctrlKey) && e.key.toLowerCase() === 'a') {
        e.preventDefault();
        handleSubmit();
      }
      if (e.altKey && e.key.toLowerCase() === 'c') {
        e.preventDefault();
        navigate('/master/alter/stock-item');
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [handleSubmit, activePanel, showBomList, showBomComponents]);

  const inputCls =
    'flex-1 bg-transparent text-sm outline-none px-1.5 py-0.5 border border-transparent hover:border-zinc-200 focus:border-zinc-800 transition-colors bg-white/50 rounded';
  const selectCls =
    'bg-transparent text-sm outline-none px-1.5 py-0.5 border border-transparent hover:border-zinc-200 focus:border-zinc-800 transition-colors bg-white/50 rounded';

  const createActions = [
    {
      key: 'Alt+G',
      label: 'Select Group',
      onClick: () => setActivePanel((p) => (p === 'group' ? null : 'group')),
    },
    {
      key: 'Alt+T',
      label: 'Select Category',
      onClick: () => setActivePanel((p) => (p === 'category' ? null : 'category')),
    },
    {
      key: 'Alt+U',
      label: 'Select Unit',
      onClick: () => setActivePanel((p) => (p === 'unit' ? null : 'unit')),
    },
    { key: 'Alt+A', label: 'Accept', onClick: handleSubmit },
    { key: 'Alt+C', label: 'Alter Item', onClick: () => navigate('/master/alter/stock-item') },
    { key: 'Esc', label: 'Quit', onClick: handleQuit },
  ];

  return (
    <div
      className="flex flex-col h-full bg-white select-none overflow-hidden"
      style={{ fontFamily: 'system-ui, sans-serif' }}
      data-enter-nav
    >
      <PageTitleBar title="Stock Item Creation" subtitle={selectedCompany?.name} />

      {error && (
        <div className="px-3 py-1 border-b border-red-200 bg-red-50 text-red-700 text-xs flex justify-between items-center shrink-0">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="ml-2 font-bold">
            ×
          </button>
        </div>
      )}
      {success && (
        <div className="px-3 py-1 border-b border-green-200 bg-green-50 text-green-700 text-xs flex justify-between items-center shrink-0">
          <span>{success}</span>
          <button onClick={() => setSuccess(null)} className="ml-2 font-bold">
            ×
          </button>
        </div>
      )}

      <div className="flex flex-1 min-h-0 overflow-hidden">
        <div className="flex flex-col flex-1 min-w-0">
          <div className="p-3 space-y-1 border-b border-zinc-100">
            <FormRow label="Name" labelWidth="w-20" className="flex items-center min-h-[26px]">
              <input
                autoFocus
                ref={nameRef}
                className={inputCls}
                value={form.name}
                onChange={(e) => setVal('name', e.target.value)}
                onKeyDown={(e) => {
                  if (e.key !== 'Enter') return;
                  e.preventDefault();
                  aliasRef.current?.focus();
                }}
              />
            </FormRow>
            <FormRow label="(alias)" labelWidth="w-20" className="flex items-center min-h-[26px]">
              <input
                ref={aliasRef}
                className={inputCls}
                value={form.alias}
                onChange={(e) => setVal('alias', e.target.value)}
                onKeyDown={(e) => {
                  if (e.key !== 'Enter') return;
                  e.preventDefault();
                  setActivePanel((p) => (p === 'group' ? null : 'group'));
                }}
              />
            </FormRow>
          </div>

          <div className="flex flex-1 min-h-0 overflow-hidden">
            <div className="flex-1 min-w-0 overflow-y-auto flex flex-col gap-0">
              {/* Under (group) */}
              <div className="p-3 border-b border-zinc-100 bg-zinc-50/20">
                <div
                  ref={underRef}
                  tabIndex={0}
                  data-enter-click
                  className="flex items-center min-h-[26px] cursor-pointer hover:bg-zinc-100/60 focus:bg-zinc-100 outline-none px-2 py-0.5 rounded transition-colors group"
                  onClick={() => setActivePanel((p) => (p === 'group' ? null : 'group'))}
                >
                  <span className="w-20 text-sm shrink-0 font-medium text-zinc-500 group-hover:text-zinc-800">
                    Under
                  </span>
                  <span className="text-zinc-400 mr-2 shrink-0">:</span>
                  <span className="text-sm font-semibold text-zinc-800 underline decoration-dotted underline-offset-2 decoration-zinc-400 group-hover:decoration-zinc-800">
                    {selectedGroupLabel}
                  </span>
                </div>
              </div>

              {/* Category */}
              <div className="p-3 border-b border-zinc-100 bg-zinc-50/20">
                <div
                  ref={categoryRef}
                  tabIndex={0}
                  data-enter-click
                  className="flex items-center min-h-[26px] cursor-pointer hover:bg-zinc-100/60 focus:bg-zinc-100 outline-none px-2 py-0.5 rounded transition-colors group"
                  onClick={() => setActivePanel((p) => (p === 'category' ? null : 'category'))}
                >
                  <span className="w-20 text-sm shrink-0 font-medium text-zinc-500 group-hover:text-zinc-800">
                    Category
                  </span>
                  <span className="text-zinc-400 mr-2 shrink-0">:</span>
                  <span className="text-sm font-semibold text-zinc-800 underline decoration-dotted underline-offset-2 decoration-zinc-400 group-hover:decoration-zinc-800">
                    {selectedCategoryLabel}
                  </span>
                </div>
              </div>

              {/* Units */}
              <div className="p-3 border-b border-zinc-100 bg-zinc-50/20">
                <div
                  ref={unitRef}
                  tabIndex={0}
                  data-enter-click
                  className="flex items-center min-h-[26px] cursor-pointer hover:bg-zinc-100/60 focus:bg-zinc-100 outline-none px-2 py-0.5 rounded transition-colors group"
                  onClick={() => setActivePanel((p) => (p === 'unit' ? null : 'unit'))}
                >
                  <span className="w-20 text-sm shrink-0 font-medium text-zinc-500 group-hover:text-zinc-800">
                    Units
                  </span>
                  <span className="text-zinc-400 mr-2 shrink-0">:</span>
                  <span className="text-sm font-semibold text-zinc-800 underline decoration-dotted underline-offset-2 decoration-zinc-400 group-hover:decoration-zinc-800">
                    {selectedUnitLabel}
                  </span>
                </div>
              </div>

              <div className="p-3 border-b border-zinc-100 space-y-1">
                <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-2">
                  Additional Details
                </div>

                <FormRow
                  label="Maintain in batches"
                  labelWidth="w-52"
                  className="flex items-center min-h-[26px]"
                >
                  <select
                    className={selectCls}
                    value={form.maintain_in_batches}
                    onChange={(e) => {
                      const val = e.target.value;
                      setForm((f) => ({
                        ...f,
                        maintain_in_batches: val,
                        track_date_of_manufacturing:
                          val !== 'Yes' ? 'No' : f.track_date_of_manufacturing,
                        use_expiry_dates: val !== 'Yes' ? 'No' : f.use_expiry_dates,
                        track_batches: val === 'Yes',
                        track_expiry: val === 'Yes' && f.use_expiry_dates === 'Yes',
                        allocations: val !== 'Yes' ? [] : f.allocations,
                      }));
                    }}
                  >
                    <option value="No">No</option>
                    <option value="Yes">Yes</option>
                  </select>
                </FormRow>

                {form.maintain_in_batches === 'Yes' && (
                  <FormRow
                    label="Track date of manufacturing"
                    labelWidth="w-52"
                    className="flex items-center min-h-[26px] pl-4"
                  >
                    <select
                      className={selectCls}
                      value={form.track_date_of_manufacturing}
                      onChange={(e) => setVal('track_date_of_manufacturing', e.target.value)}
                    >
                      <option value="No">No</option>
                      <option value="Yes">Yes</option>
                    </select>
                  </FormRow>
                )}

                {form.maintain_in_batches === 'Yes' && (
                  <FormRow
                    label="Use expiry dates"
                    labelWidth="w-52"
                    className="flex items-center min-h-[26px] pl-4"
                  >
                    <select
                      className={selectCls}
                      value={form.use_expiry_dates}
                      onChange={(e) => {
                        const val = e.target.value;
                        setForm((f) => ({
                          ...f,
                          use_expiry_dates: val,
                          track_expiry: val === 'Yes',
                        }));
                      }}
                    >
                      <option value="No">No</option>
                      <option value="Yes">Yes</option>
                    </select>
                  </FormRow>
                )}

                <FormRow
                  label="Set components (BOM)"
                  labelWidth="w-52"
                  className="flex items-center min-h-[26px]"
                >
                  <div className="flex items-center gap-2">
                    <select
                      className={selectCls}
                      value={form.has_bom ? 'Yes' : 'No'}
                      onChange={handleBomToggle}
                    >
                      <option value="No">No</option>
                      <option value="Yes">Yes</option>
                    </select>
                    {form.has_bom && boms.length > 0 && (
                      <span className="text-xs text-zinc-400">
                        ({boms.length} BOM{boms.length > 1 ? 's' : ''})
                      </span>
                    )}
                  </div>
                </FormRow>

                <FormRow
                  label="Enable cost tracking"
                  labelWidth="w-52"
                  className="flex items-center min-h-[26px]"
                >
                  <select
                    className={selectCls}
                    value={form.enable_cost_tracking}
                    onChange={(e) => setVal('enable_cost_tracking', e.target.value)}
                  >
                    <option value="No">No</option>
                    <option value="Yes">Yes</option>
                  </select>
                </FormRow>
              </div>
            </div>

            <GSTStatutoryDetails
              form={form}
              setVal={setVal}
              setActivePanel={setActivePanel}
              gstClassifications={gstClassifications}
              onOpenOtherStatutory={() => setShowOtherStatutory(true)}
            />
          </div>

          <div className="shrink-0 border-t border-zinc-300">
            <div className="flex items-center px-6 pt-1 pb-0 border-b border-zinc-100">
              <span className="w-32 shrink-0" />
              <span className="w-4 shrink-0" />
              <div className="flex-1 flex items-center justify-end">
                <span className="w-36 text-right text-[10px] uppercase tracking-widest text-zinc-500 font-semibold pr-1 font-sans">
                  Quantity
                </span>
                <span className="w-24 text-right text-[10px] uppercase tracking-widest text-zinc-500 font-semibold ml-4 font-sans">
                  Rate
                </span>
                <span className="w-10 text-center text-[10px] uppercase tracking-widest text-zinc-500 font-semibold ml-2 font-sans">
                  per
                </span>
                <span className="w-28 text-right text-[10px] uppercase tracking-widest text-zinc-500 font-semibold font-sans">
                  Value
                </span>
              </div>
            </div>
            <div className="flex items-center px-6 py-2">
              <span className="w-32 shrink-0 text-sm text-zinc-700 font-sans">Opening Balance</span>
              <span className="w-4 shrink-0 text-zinc-400 text-sm text-center">:</span>
              <div className="flex-1 flex items-center justify-end">
                <div className="w-36 flex items-center justify-end gap-1 border-b border-zinc-400 focus-within:border-zinc-700 pr-1">
                  <input
                    className="w-24 bg-transparent text-sm outline-none py-0.5 text-right tabular-nums font-mono"
                    type="number"
                    min="0"
                    step="0.001"
                    ref={openingQtyRef}
                    value={form.opening_quantity}
                    onChange={(e) => setVal('opening_quantity', e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key !== 'Enter') return;
                      e.preventDefault();
                      openingRateRef.current?.focus();
                    }}
                    placeholder="0"
                  />
                  {form.unit_id && (
                    <span className="text-xs text-zinc-500 shrink-0 font-sans">
                      {selectedUnitLabel}
                    </span>
                  )}
                </div>
                {openingQty > 0 && (form.track_batches || godowns.length > 0) && (
                  <button
                    type="button"
                    onClick={() => setShowAllocationModal(true)}
                    className="ml-2 text-xs px-2 py-0.5 rounded border border-zinc-300 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 font-sans font-medium shrink-0 transition-colors"
                  >
                    {form.allocations.length > 0
                      ? `Allocated (${form.allocations.length})`
                      : 'Allocate'}
                  </button>
                )}
                <div className="w-24 ml-4 border-b border-zinc-400 focus-within:border-zinc-700">
                  <input
                    className="w-full bg-transparent text-sm outline-none py-0.5 text-right tabular-nums pr-1 font-mono"
                    type="number"
                    min="0"
                    step="0.01"
                    ref={openingRateRef}
                    value={form.opening_rate}
                    onChange={(e) => setVal('opening_rate', e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key !== 'Enter') return;
                      e.preventDefault();
                      handleSubmit();
                    }}
                    placeholder="0.00"
                  />
                </div>
                <span className="w-10 text-center text-xs text-zinc-500 ml-2 shrink-0 font-sans">
                  {form.unit_id ? selectedUnitLabel : ''}
                </span>
                <span className="w-28 text-right text-sm tabular-nums text-zinc-800 font-mono">
                  {openingValue > 0
                    ? openingValue.toLocaleString('en-IN', { minimumFractionDigits: 2 })
                    : ''}
                </span>
              </div>
            </div>
          </div>
        </div>

        {activePanel === 'group' && (
          <ListSidePanel
            title="List of Groups"
            items={stockGroups
              .filter((g) => g.name.toLowerCase() !== 'primary')
              .map((g) => ({ id: String(g.sg_id), label: g.name }))}
            selected={form.group_id}
            onSelect={(val) => {
              setVal('group_id', val);
              setActivePanel(null);
              focusFieldAfter(underRef.current);
            }}
            onClose={() => setActivePanel(null)}
            showPrimary
            primaryLabel="Primary"
          />
        )}
        {activePanel === 'category' && (
          <ListSidePanel
            title="List of Categories"
            items={stockCategories.map((c) => ({ id: String(c.sc_id), label: c.name }))}
            selected={form.category_id}
            onSelect={(val) => {
              setVal('category_id', val);
              setActivePanel(null);
              focusFieldAfter(categoryRef.current);
            }}
            onClose={() => setActivePanel(null)}
            showPrimary
            primaryLabel="Not Applicable"
            showCreate
            onCreateNew={() => navigate('/master/create/stock-category')}
          />
        )}
        {activePanel === 'unit' && (
          <ListSidePanel
            title="List of Units"
            items={units.map((u) => ({ id: String(u.unit_id), label: `${u.symbol} (${u.name})` }))}
            selected={form.unit_id}
            onSelect={(val) => {
              setVal('unit_id', val);
              setActivePanel(null);
              focusFieldAfter(unitRef.current);
            }}
            onClose={() => setActivePanel(null)}
            showPrimary
            primaryLabel="Not Applicable"
            showCreate
            onCreateNew={() => navigate('/master/create/unit')}
          />
        )}
        {activePanel === 'hsn_classification' && (
          <ListSidePanel
            title="GST Classifications"
            items={gstClassifications.map((c) => ({ id: String(c.gc_id), label: c.name }))}
            selected={form.hsn_classification_id}
            onSelect={(val) => {
              setVal('hsn_classification_id', val);
              setActivePanel(null);
            }}
            onClose={() => setActivePanel(null)}
            showCreate
            onCreateNew={() => navigate('/master/create/gst-classification')}
          />
        )}
        {activePanel === 'rate_classification' && (
          <ListSidePanel
            title="GST Classifications"
            items={gstClassifications.map((c) => ({ id: String(c.gc_id), label: c.name }))}
            selected={form.rate_classification_id}
            onSelect={(val) => {
              setVal('rate_classification_id', val);
              setActivePanel(null);
            }}
            onClose={() => setActivePanel(null)}
            showCreate
            onCreateNew={() => navigate('/master/create/gst-classification')}
          />
        )}
        <RightActionPanel actions={createActions} />
      </div>

      {showOtherStatutory && (
        <OtherStatutoryDetails
          stockItemName={form.name}
          unitLabel={selectedUnitLabel}
          companyId={companyId}
          onAccept={(data) => {
            setForm((f) => ({
              ...f,
              excise_applicable: data.excise_applicable,
              set_alter_excise_details: data.set_alter_excise_details,
              set_alter_additional_info: data.set_alter_additional_info,
              additional_info_rows: data.additional_info_rows,
              excise_tariff_name: data.excise_tariff_name,
              excise_tariff_hsn_code: data.excise_tariff_hsn_code,
              excise_tariff_uom: data.excise_tariff_uom,
              excise_tariff_valuation_type: data.excise_tariff_valuation_type,
              excise_tariff_rate: data.excise_tariff_rate,
              excise_tariff_rate_per_unit: data.excise_tariff_rate_per_unit,
              vat_applicable: data.vat_applicable,
              set_alter_vat_details: data.set_alter_vat_details,
              vat_tax_rate: data.vat_tax_rate,
              vat_tax_type: data.vat_tax_type,
            }));
            setShowOtherStatutory(false);
          }}
          onClose={() => setShowOtherStatutory(false)}
        />
      )}

      <MasterFormFooter
        onCancel={handleQuit}
        onSubmit={handleSubmit}
        loading={loading}
        cancelLabel="Back to Masters"
        submitLabel="Accept"
      />

      {showBomList && (
        <BomListModal
          stockItemName={form.name}
          existingBoms={boms.map((b) => b.bomName)}
          onSelectBom={handleBomSelect}
          onClose={handleBomListClose}
        />
      )}
      {showBomComponents && (
        <BomComponentsModal
          bomName={currentBomName}
          stockItemName={form.name}
          stockItems={stockItems}
          godowns={godowns}
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
            const totalQty = allocs.reduce((s, a) => s + (parseFloat(a.quantity) || 0), 0);
            const totalVal = allocs.reduce(
              (s, a) => s + (parseFloat(a.quantity) || 0) * (parseFloat(a.rate) || 0),
              0,
            );
            const avgRate = totalQty > 0 ? totalVal / totalQty : 0;
            setForm((f) => ({
              ...f,
              allocations: allocs,
              opening_quantity: totalQty > 0 ? String(totalQty) : f.opening_quantity,
              opening_rate: avgRate > 0 ? String(avgRate) : f.opening_rate,
            }));
            setShowAllocationModal(false);
          }}
          onClose={() => setShowAllocationModal(false)}
        />
      )}
    </div>
  );
}
