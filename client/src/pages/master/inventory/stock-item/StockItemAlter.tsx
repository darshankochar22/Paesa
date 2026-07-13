import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCompany } from '@/context/CompanyContext';
import { isFeatureEnabled } from '@/lib/companyFeatures';
import {
  PageTitleBar,
  RightActionPanel,
  SearchInput,
  DataTable,
  FormRow,
  MasterFormFooter,
  NotificationBanner,
  inputCls,
  selectCls,
} from '@/components/ui';
import type {
  StockGroupType,
  StockCategoryType,
  UnitType,
  StockItemType,
  GodownType,
} from '@/types/api';
import BomListModal from './components/BomListModal';
import BomComponentsModal, { type BomEntry } from './components/BomComponentsModal';
import ListSidePanel from './components/ListSidePanel';
import { focusFieldAfter } from '@/hooks/useEnterNavigation';
import GSTStatutoryDetails from './components/GSTStatutoryDetails';
import OpeningBalanceAllocationModal from './components/OpeningBalanceAllocationModal';
import OtherStatutoryDetails from './components/OtherStatutoryDetails';
import type { FormData, PanelType } from './types';
import { calculateGstDetails } from './utils';
import { useStockItemBom } from './hooks/useStockItemBom';

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
  const [search, setSearch] = useState('');

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onCancel();
      }
      if (e.altKey && e.key.toLowerCase() === 'c') {
        e.preventDefault();
        onCreate();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onCancel, onCreate]);

  const filtered = items.filter(
    (i) =>
      i.name.toLowerCase().includes(search.toLowerCase()) ||
      (i.alias && i.alias.toLowerCase().includes(search.toLowerCase())),
  );

  const columns = [
    {
      key: 'name',
      label: 'Item Name',
      span: 'col-span-8',
      render: (r: StockItemType) => (
        <span className="font-bold text-zinc-950 uppercase">{r.name}</span>
      ),
    },
    {
      key: 'alias',
      label: 'Alias',
      span: 'col-span-4',
      render: (r: StockItemType) => <span className="text-zinc-500">{r.alias || '—'}</span>,
    },
  ];

  const selectionActions = [
    { key: 'Alt+C', label: 'Create Item', onClick: onCreate },
    { key: 'Esc', label: 'Quit', onClick: onCancel },
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

export default function StockItemAlter({
  initialItemId,
  onDone,
  onCancel,
}: StockItemAlterProps = {}) {
  const navigate = useNavigate();
  const { selectedCompany, features } = useCompany();
  const companyId = selectedCompany?.company_id;

  const [stockItems, setStockItems] = useState<StockItemType[]>([]);
  const [stockGroups, setStockGroups] = useState<StockGroupType[]>([]);
  const [stockCategories, setStockCategories] = useState<StockCategoryType[]>([]);
  const [units, setUnits] = useState<UnitType[]>([]);
  const [godowns, setGodowns] = useState<GodownType[]>([]);
  const [gstClassifications, setGstClassifications] = useState<any[]>([]);
  const [selectedItem, setSelectedItem] = useState<StockItemType | null>(null);
  const [form, setForm] = useState<FormData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showPanel, setShowPanel] = useState<PanelType>(null);
  const [showAllocationModal, setShowAllocationModal] = useState(false);
  const [showOtherStatutory, setShowOtherStatutory] = useState(false);

  const underRef = useRef<HTMLDivElement>(null);
  const categoryRef = useRef<HTMLDivElement>(null);
  const unitRef = useRef<HTMLDivElement>(null);
  const hsnClassRef = useRef<HTMLSpanElement>(null);
  const rateClassRef = useRef<HTMLSpanElement>(null);

  const updateFormFields = useCallback((updater: (prev: FormData) => Partial<FormData>) => {
    setForm((f) => (f ? { ...f, ...updater(f) } : null));
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

  const handleSelectItem = useCallback(async (item: any) => {
    setLoading(true);
    setError(null);
    try {
      const res = await window.api.stockItem.getById(item.item_id);
      if (res.success && res.item) {
        const fullItem = res.item;
        setSelectedItem(fullItem);
        setForm({
          name: fullItem.name ?? '',
          alias: fullItem.alias ?? '',
          group_id: fullItem.group_id ? String(fullItem.group_id) : '',
          category_id: fullItem.category_id ? String(fullItem.category_id) : '',
          unit_id: fullItem.unit_id ? String(fullItem.unit_id) : '',
          rate_of_duty: String(fullItem.rate_of_duty ?? 0),
          has_bom: Boolean(fullItem.has_bom),
          bom_name: fullItem.bom_name ?? '',
          opening_quantity: String(fullItem.opening_quantity ?? 0),
          opening_rate: String(fullItem.opening_rate ?? 0),
          gst_applicable: fullItem.gst_applicable ?? 'Not Applicable',
          hsn_sac_details:
            fullItem.hsn_sac_details ??
            (fullItem.source_of_details === 'Specified Here'
              ? 'specify_here'
              : fullItem.source_of_details === 'GST Classification'
                ? 'use_classification'
                : fullItem.source_of_details === 'Specify in Voucher'
                  ? 'specify_in_voucher'
                  : 'as_per_company'),
          hsn_sac: fullItem.hsn_sac ?? '',
          hsn_sac_description: fullItem.hsn_sac_description ?? '',
          hsn_classification_id: fullItem.hsn_classification_id
            ? String(fullItem.hsn_classification_id)
            : '',
          gst_rate_details:
            fullItem.gst_rate_details ??
            (fullItem.source_of_gst_rate === 'GST Classification'
              ? 'use_classification'
              : fullItem.source_of_gst_rate === 'Specified Here'
                ? 'specify_here'
                : fullItem.source_of_gst_rate === 'Specify in Voucher'
                  ? 'specify_in_voucher'
                  : 'as_per_company'),
          rate_classification_id: fullItem.rate_classification_id
            ? String(fullItem.rate_classification_id)
            : '',
          taxability_type: fullItem.taxability_type ?? '',
          gst_rate: String(fullItem.gst_rate ?? 0),
          type_of_supply: fullItem.type_of_supply ?? 'Goods',
          track_batches: Boolean(fullItem.track_batches),
          track_expiry: Boolean(fullItem.track_expiry),
          allocations: (fullItem.allocations ?? []).map((a: any) => ({
            allocation_id: a.allocation_id,
            godown_id: String(a.godown_id ?? ''),
            batch_number: a.batch_number ?? '',
            mfg_date: a.mfg_date ?? '',
            expiry_date: a.expiry_date ?? '',
            quantity: String(a.quantity ?? 0),
            rate: String(a.rate ?? 0),
          })),
          maintain_in_batches: fullItem.track_batches ? 'Yes' : 'No',
          track_date_of_manufacturing: fullItem.track_date_of_manufacturing ? 'Yes' : 'No',
          use_expiry_dates: fullItem.track_expiry ? 'Yes' : 'No',
          enable_cost_tracking: fullItem.enable_cost_tracking ? 'Yes' : 'No',
          set_alter_statutory: fullItem.excise_applicable || fullItem.vat_applicable ? 'Yes' : 'No',
          excise_applicable: fullItem.excise_applicable ?? 'Not Applicable',
          set_alter_excise_details: fullItem.excise_details === 'Yes' ? 'Yes' : 'No',
          excise_tariff_name: fullItem.excise_tariff_name ?? '',
          excise_tariff_hsn_code: fullItem.excise_tariff_hsn_code ?? '',
          excise_tariff_uom: fullItem.excise_tariff_uom ?? 'Undefined',
          excise_tariff_valuation_type: fullItem.excise_tariff_valuation_type ?? 'Undefined',
          excise_tariff_rate: String(fullItem.excise_tariff_rate ?? 0),
          excise_tariff_rate_per_unit: String(fullItem.excise_tariff_rate_per_unit ?? 0),
          vat_applicable: fullItem.vat_applicable ?? 'Applicable',
          set_alter_vat_details: fullItem.vat_details === 'Yes' ? 'Yes' : 'No',
          vat_tax_rate: '',
          vat_tax_type: 'Unknown',
        });
        setBoms([]);
        setShowBomList(false);
        setShowBomComponents(false);
      } else {
        setError(res.error || 'Failed to load stock item details.');
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unexpected error.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const company_id = selectedCompany?.company_id;
    if (!company_id) return;
    window.api.stockItem.getAll(company_id).then((r) => {
      if (r.success) {
        setStockItems(r.stockItems ?? []);
        if (initialItemId) {
          const found = (r.stockItems ?? []).find(
            (i: StockItemType) => i.item_id === initialItemId,
          );
          if (found) handleSelectItem(found);
        }
      }
    });
    window.api.stockGroup.getAll(company_id).then((r) => {
      if (r.success) setStockGroups(r.stockGroups ?? []);
    });
    window.api.stockCategory.getAll(company_id).then((r) => {
      if (r.success) setStockCategories(r.stockCategories ?? []);
    });
    window.api.unit.getAll(company_id).then((r) => {
      if (r.success) setUnits(r.units ?? []);
    });
    window.api.godown.getAll(company_id).then((r) => {
      if (r.success) setGodowns(r.godowns ?? []);
    });
    window.api.gstClassification.getAll(company_id).then((r) => {
      if (r.success) setGstClassifications(r.gstClassifications ?? []);
    });
  }, [selectedCompany]);

  const setVal = useCallback((key: keyof FormData, value: any) => {
    setForm((f) => (f ? { ...f, [key]: value } : null));
  }, []);

  const selectedGroupLabel = form?.group_id
    ? (stockGroups.find((g) => String(g.sg_id) === form.group_id)?.name ?? 'Primary')
    : 'Primary';

  const selectedCategoryLabel = form?.category_id
    ? (stockCategories.find((c) => String(c.sc_id) === form.category_id)?.name ?? 'Not Applicable')
    : 'Not Applicable';

  const selectedUnitLabel = form?.unit_id
    ? (units.find((u) => String(u.unit_id) === form.unit_id)?.symbol ?? 'Not Applicable')
    : 'Not Applicable';

  const openingQty = parseFloat(form?.opening_quantity ?? '0') || 0;
  const openingRate = parseFloat(form?.opening_rate ?? '0') || 0;
  const openingValue = openingQty * openingRate;

  const handleBack = useCallback(() => {
    if (onDone) {
      onDone();
      return;
    }
    setSelectedItem(null);
    setForm(null);
  }, [onDone]);

  const executeSave = async (bomsToSave: BomEntry[] = boms) => {
    if (!form || !selectedItem) return;
    if (!selectedCompany?.company_id) {
      setError('No company selected.');
      return;
    }
    setLoading(true);
    setError(null);

    const gst = calculateGstDetails(form, gstClassifications);

    try {
      const result = await window.api.stockItem.update({
        item_id: selectedItem.item_id,
        company_id: selectedCompany.company_id,
        name: form.name.trim(),
        alias: form.alias.trim() || null,
        group_id: form.group_id ? Number(form.group_id) : null,
        category_id: form.category_id ? Number(form.category_id) : null,
        unit_id: form.unit_id ? Number(form.unit_id) : null,
        rate_of_duty: Number(form.rate_of_duty) || 0,
        has_bom: form.has_bom,
        bom_name: form.has_bom ? (bomsToSave[0]?.bomName || form.bom_name).trim() || null : null,
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
        const updated = await window.api.stockItem.getAll(selectedCompany.company_id);
        if (updated.success) setStockItems(updated.stockItems ?? []);
        setSuccess(`Stock Item "${form.name}" updated successfully.`);
        setTimeout(() => {
          setSuccess(null);
          handleBack();
        }, 1500);
      } else {
        setError(result.error || 'Failed to update stock item.');
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unexpected error.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = useCallback(() => {
    if (!form || !selectedItem) return;
    if (!form.name.trim()) {
      setError('Name is required.');
      return;
    }
    if (!selectedCompany?.company_id) {
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
  }, [form, selectedItem, selectedCompany, boms, gstClassifications, openingQty, godowns]);

  const handleDelete = useCallback(async () => {
    if (!selectedItem) return;
    if (!window.confirm(`Delete stock item "${selectedItem.name}"? This cannot be undone.`)) return;
    setLoading(true);
    setError(null);
    try {
      const result = await window.api.stockItem.delete(selectedItem.item_id);
      if (result.success) {
        const updated = await window.api.stockItem.getAll(selectedCompany!.company_id!);
        if (updated.success) setStockItems(updated.stockItems ?? []);
        handleBack();
      } else {
        setError(result.error || 'Failed to delete stock item.');
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unexpected error.');
    } finally {
      setLoading(false);
    }
  }, [selectedItem, selectedCompany, handleBack]);

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
        if (showPanel) {
          setShowPanel(null);
          return;
        }
        if (selectedItem) {
          handleBack();
          return;
        }
        if (onCancel) {
          onCancel();
          return;
        }
        navigate('/master/alter');
      }
      if (e.altKey && e.key.toLowerCase() === 'g') {
        e.preventDefault();
        if (selectedItem) setShowPanel((p) => (p === 'group' ? null : 'group'));
      }
      if (e.altKey && e.key.toLowerCase() === 't') {
        e.preventDefault();
        if (selectedItem) setShowPanel((p) => (p === 'category' ? null : 'category'));
      }
      if (e.altKey && e.key.toLowerCase() === 'u') {
        e.preventDefault();
        if (selectedItem) setShowPanel((p) => (p === 'unit' ? null : 'unit'));
      }
      if ((e.altKey || e.ctrlKey) && e.key.toLowerCase() === 'a') {
        e.preventDefault();
        handleSubmit();
      }
      if (e.altKey && e.key.toLowerCase() === 'd') {
        e.preventDefault();
        handleDelete();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [
    handleSubmit,
    handleDelete,
    handleBack,
    navigate,
    showPanel,
    selectedItem,
    showBomList,
    showBomComponents,
    onCancel,
  ]);

  if (!selectedItem || !form) {
    return (
      <SelectionPanel
        items={stockItems}
        onSelect={handleSelectItem}
        onCancel={onCancel ?? (() => navigate('/master/alter'))}
        onCreate={() => navigate('/master/create/stock-item')}
      />
    );
  }

  const alterActions = [
    {
      key: 'Alt+G',
      label: 'Select Group',
      onClick: () => setShowPanel((p) => (p === 'group' ? null : 'group')),
    },
    {
      key: 'Alt+T',
      label: 'Select Category',
      onClick: () => setShowPanel((p) => (p === 'category' ? null : 'category')),
    },
    {
      key: 'Alt+U',
      label: 'Select Unit',
      onClick: () => setShowPanel((p) => (p === 'unit' ? null : 'unit')),
    },
    { key: 'Alt+A', label: 'Accept', onClick: handleSubmit },
    { key: 'Alt+D', label: 'Delete', onClick: handleDelete },
    { key: 'Esc', label: 'Back', onClick: handleBack },
  ];

  return (
    <div className="flex flex-col h-full bg-white select-none overflow-hidden" data-enter-nav>
      <PageTitleBar
        title={`Stock Item Alteration: ${selectedItem.name}`}
        subtitle={selectedCompany?.name}
      />

      {error && (
        <NotificationBanner type="error" message={error} onDismiss={() => setError(null)} />
      )}
      {success && (
        <NotificationBanner type="success" message={success} onDismiss={() => setSuccess(null)} />
      )}

      <div className="flex flex-1 min-h-0 overflow-hidden">
        <div className="flex flex-col flex-1 min-w-0 min-h-0 overflow-hidden">
          <div className="p-3 space-y-1 border-b border-zinc-100">
            <FormRow label="Name" labelWidth="w-20" className="flex items-center min-h-[26px]">
              <input
                autoFocus
                className={inputCls}
                value={form.name}
                onChange={(e) => setVal('name', e.target.value)}
              />
            </FormRow>
            <FormRow label="(alias)" labelWidth="w-20" className="flex items-center min-h-[26px]">
              <input
                className={inputCls}
                value={form.alias}
                onChange={(e) => setVal('alias', e.target.value)}
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
                  onClick={() => setShowPanel((p) => (p === 'group' ? null : 'group'))}
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
                  onClick={() => setShowPanel((p) => (p === 'category' ? null : 'category'))}
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
                  onClick={() => setShowPanel((p) => (p === 'unit' ? null : 'unit'))}
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

                {isFeatureEnabled(features, 'enable_batches') && (
                  <>
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
                          setForm((f) =>
                            f
                              ? {
                                  ...f,
                                  maintain_in_batches: val,
                                  track_date_of_manufacturing:
                                    val !== 'Yes' ? 'No' : f.track_date_of_manufacturing,
                                  use_expiry_dates: val !== 'Yes' ? 'No' : f.use_expiry_dates,
                                  track_batches: val === 'Yes',
                                  track_expiry: val === 'Yes' && f.use_expiry_dates === 'Yes',
                                  allocations: val !== 'Yes' ? [] : f.allocations,
                                }
                              : null,
                          );
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

                    {form.maintain_in_batches === 'Yes' &&
                      isFeatureEnabled(features, 'maintain_expiry_date_for_batches') && (
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
                              setForm((f) =>
                                f
                                  ? { ...f, use_expiry_dates: val, track_expiry: val === 'Yes' }
                                  : null,
                              );
                            }}
                          >
                            <option value="No">No</option>
                            <option value="Yes">Yes</option>
                          </select>
                        </FormRow>
                      )}
                  </>
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

                {isFeatureEnabled(features, 'enable_cost_tracking') && (
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
                )}
              </div>
            </div>

            <GSTStatutoryDetails
              form={form}
              setVal={setVal}
              setActivePanel={setShowPanel}
              gstClassifications={gstClassifications}
              onOpenOtherStatutory={() => setShowOtherStatutory(true)}
              hsnClassRef={hsnClassRef}
              rateClassRef={rateClassRef}
            />
          </div>

          <div className="shrink-0 border-t border-zinc-200">
            <div className="flex items-center px-6 pt-1.5 pb-0.5 border-b border-zinc-100 font-sans">
              <span className="w-32 shrink-0" />
              <span className="w-4 shrink-0" />
              <div className="flex-1 flex items-center justify-end">
                <span className="w-32 text-right text-[10px] uppercase tracking-widest text-zinc-400 font-semibold">
                  Quantity
                </span>
                <span className="w-28 text-right text-[10px] uppercase tracking-widest text-zinc-400 font-semibold ml-4">
                  Rate
                </span>
                <span className="w-16 text-center text-[10px] uppercase tracking-widest text-zinc-400 font-semibold ml-2">
                  per
                </span>
                <span className="w-36 text-right text-[10px] uppercase tracking-widest text-zinc-400 font-semibold">
                  Value
                </span>
              </div>
            </div>
            <div className="flex items-center px-6 py-2">
              <span className="w-32 text-sm text-zinc-700 shrink-0 font-sans">Opening Balance</span>
              <span className="w-4 text-zinc-400 shrink-0 text-center">:</span>
              <div className="flex-1 flex items-center justify-end">
                <div className="w-32 flex items-center gap-1 border-b border-zinc-300 focus-within:border-zinc-600">
                  <input
                    className="w-20 bg-transparent text-sm outline-none py-0.5 text-right tabular-nums font-mono"
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.opening_quantity}
                    onChange={(e) => setVal('opening_quantity', e.target.value)}
                    placeholder="0"
                  />
                  <span className="text-sm text-zinc-600 shrink-0 font-sans">
                    {form.unit_id ? selectedUnitLabel : ''}
                  </span>
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
                <div className="w-28 ml-4 border-b border-zinc-300 focus-within:border-zinc-600">
                  <input
                    className="w-full bg-transparent text-sm outline-none py-0.5 text-right tabular-nums pr-1 font-mono"
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.opening_rate}
                    onChange={(e) => setVal('opening_rate', e.target.value)}
                    placeholder="0.00"
                  />
                </div>
                <span className="w-16 text-center text-sm text-zinc-600 ml-2 shrink-0 font-sans">
                  {form.unit_id ? selectedUnitLabel : ''}
                </span>
                <span className="w-36 text-right text-sm font-mono text-zinc-800 tabular-nums">
                  {openingValue > 0
                    ? openingValue.toLocaleString('en-IN', { minimumFractionDigits: 2 })
                    : ''}
                </span>
              </div>
            </div>
          </div>
        </div>

        {showPanel === 'group' && (
          <ListSidePanel
            title="List of Groups"
            items={stockGroups
              .filter((g) => g.name.toLowerCase() !== 'primary')
              .map((g) => ({ id: String(g.sg_id), label: g.name }))}
            selected={form.group_id}
            onSelect={(val) => {
              setVal('group_id', val);
              setShowPanel(null);
              focusFieldAfter(underRef.current);
            }}
            onClose={() => setShowPanel(null)}
            showPrimary
            primaryLabel="Primary"
          />
        )}
        {showPanel === 'category' && (
          <ListSidePanel
            title="List of Categories"
            items={stockCategories.map((c) => ({ id: String(c.sc_id), label: c.name }))}
            selected={form.category_id}
            onSelect={(val) => {
              setVal('category_id', val);
              setShowPanel(null);
              focusFieldAfter(categoryRef.current);
            }}
            onClose={() => setShowPanel(null)}
            showPrimary
            primaryLabel="Not Applicable"
            showCreate
            onCreateNew={() => navigate('/master/create/stock-category')}
          />
        )}
        {showPanel === 'unit' && (
          <ListSidePanel
            title="List of Units"
            items={units.map((u) => ({ id: String(u.unit_id), label: `${u.symbol} (${u.name})` }))}
            selected={form.unit_id}
            onSelect={(val) => {
              setVal('unit_id', val);
              setShowPanel(null);
              focusFieldAfter(unitRef.current);
            }}
            onClose={() => setShowPanel(null)}
            showPrimary
            primaryLabel="Not Applicable"
            showCreate
            onCreateNew={() => navigate('/master/create/unit')}
          />
        )}
        {showPanel === 'hsn_classification' && (
          <ListSidePanel
            title="GST Classifications"
            items={gstClassifications.map((c) => ({ id: String(c.gc_id), label: c.name }))}
            selected={form.hsn_classification_id}
            onSelect={(val) => {
              setVal('hsn_classification_id', val);
              setShowPanel(null);
              focusFieldAfter(hsnClassRef.current);
            }}
            onClose={() => setShowPanel(null)}
            showCreate
            onCreateNew={() => navigate('/master/create/gst-classification')}
          />
        )}
        {showPanel === 'rate_classification' && (
          <ListSidePanel
            title="GST Classifications"
            items={gstClassifications.map((c) => ({ id: String(c.gc_id), label: c.name }))}
            selected={form.rate_classification_id}
            onSelect={(val) => {
              setVal('rate_classification_id', val);
              setShowPanel(null);
              focusFieldAfter(rateClassRef.current);
            }}
            onClose={() => setShowPanel(null)}
            showCreate
            onCreateNew={() => navigate('/master/create/gst-classification')}
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
            setForm((f) =>
              f
                ? {
                    ...f,
                    allocations: allocs,
                    opening_quantity: totalQty > 0 ? String(totalQty) : f.opening_quantity,
                    opening_rate: avgRate > 0 ? String(avgRate) : f.opening_rate,
                  }
                : null,
            );
            setShowAllocationModal(false);
          }}
          onClose={() => setShowAllocationModal(false)}
        />
      )}
      {showOtherStatutory && (
        <OtherStatutoryDetails
          stockItemName={form.name}
          unitLabel={selectedUnitLabel}
          companyId={companyId}
          initialData={{
            excise_applicable: form.excise_applicable,
            set_alter_excise_details: form.set_alter_excise_details,
            set_alter_additional_info: (form as any).set_alter_additional_info,
            additional_info_rows: (form as any).additional_info_rows ?? [],
            excise_tariff_name: form.excise_tariff_name,
            excise_tariff_hsn_code: form.excise_tariff_hsn_code,
            excise_tariff_uom: form.excise_tariff_uom,
            excise_tariff_valuation_type: form.excise_tariff_valuation_type,
            excise_tariff_rate: form.excise_tariff_rate,
            excise_tariff_rate_per_unit: form.excise_tariff_rate_per_unit,
            vat_applicable: form.vat_applicable,
            set_alter_vat_details: form.set_alter_vat_details,
            vat_tax_rate: form.vat_tax_rate,
            vat_tax_type: form.vat_tax_type,
          }}
          onAccept={(data) => {
            setForm((f) =>
              f
                ? {
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
                  }
                : null,
            );
            setShowOtherStatutory(false);
          }}
          onClose={() => setShowOtherStatutory(false)}
        />
      )}
    </div>
  );
}
