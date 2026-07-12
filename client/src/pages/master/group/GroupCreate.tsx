import { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCompany } from '@/context/CompanyContext';
import { FormRow, PageTitleBar, NotificationBanner, YesNoSelect } from '@/components/ui';
import GroupFlatList from '@/components/GroupFlatList';
import { focusFieldAfter } from '@/hooks/useEnterNavigation';
import type { GroupType } from '@/types/api';
import { TOGGLE_META, getConfig, type StatutoryToggle } from '@/config/statutoryConfig';
import NatureOfPaymentDetailsModal from './NatureOfPaymentDetailsModal';
import NatureOfGoodsDetailsModal from './NatureOfGoodsDetailsModal';
import TDSNatureOfPaymentCreation from './TDSNatureOfPaymentCreation';
import TCSNatureOfGoodsCreation from './TCSNatureOfGoodsCreation';
import StatutorySection from './StatutorySection';

// Thin wrapper over the shared FormRow (same component the Ledger screens use)
// so Group fields render with identical row + input chrome. Data/handlers unchanged.
function Row(props: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
  onClick?: () => void;
  rowRef?: React.Ref<HTMLDivElement>;
  enterClick?: boolean;
}) {
  return <FormRow labelWidth="w-64" className="flex items-start min-h-[32px]" {...props} />;
}

// Boxed input/select styling matching the Ledger creation screen.
const inputCls =
  'flex-1 bg-transparent text-sm outline-none px-1.5 py-0.5 border border-transparent hover:border-zinc-200 focus:border-zinc-800 transition-colors bg-white/50 rounded';
const selectCls =
  'bg-transparent text-sm outline-none px-1.5 py-0.5 border border-transparent hover:border-zinc-200 focus:border-zinc-800 transition-colors bg-white/50 rounded';

const NATURES = ['Assets', 'Liabilities', 'Income', 'Expenses'];
const ALLOC_METHODS = ['Not Applicable', 'Appropriate by Quantity', 'Appropriate by Value'];

const INITIAL_FORM: Partial<GroupType> = {
  name: '',
  alias: '',
  parent_group_id: undefined,
  is_primary: 0,
  nature: 'Assets',
  set_alter_tds_details: 0,
  set_alter_tcs_details: 0,
  set_alter_other_statutory_details: 0,
  set_alter_service_tax_details: 0,
  set_alter_vat_details: 0,
  set_alter_excise_details: 0,
  hsn_sac_source: 'As per Company/Group',
  hsn_sac_code: '',
  hsn_sac_description: '',
  gst_rate_source: 'As per Company/Group',
  gst_rate: 0,
  taxability_type: '',
  hsn_sac_classification_id: undefined,
  gst_classification_id: undefined,
  slab_based_rates: '[]',
  behaves_like_subledger: 0,
  show_net_debit_credit: 0,
  used_for_calculation: 0,
  allocation_method: 'Not Applicable',
};

export default function GroupCreate() {
  const { selectedCompany } = useCompany();
  const navigate = useNavigate();
  const companyId = selectedCompany?.company_id;

  const [flatGroups, setFlatGroups] = useState<GroupType[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showGroupPanel, setShowGroupPanel] = useState(false);
  const [activeFeatureModal, setActiveFeatureModal] = useState<StatutoryToggle | null>(null);
  const [activeFeatureCreateModal, setActiveFeatureCreateModal] = useState<StatutoryToggle | null>(
    null,
  );
  const [gstClassifications, setGstClassifications] = useState<{ gc_id: number; name: string }[]>(
    [],
  );
  const [showClassPanel, setShowClassPanel] = useState<'hsn' | 'gst' | null>(null);

  const [form, setForm] = useState<Partial<GroupType>>(INITIAL_FORM);

  const nameRef = useRef<HTMLInputElement>(null);
  const aliasRef = useRef<HTMLInputElement>(null);
  const natureRef = useRef<HTMLSelectElement>(null);
  const underRowRef = useRef<HTMLDivElement>(null);
  const classAnchorRef = useRef<HTMLElement | null>(null);

  // Escape key handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const anyModal =
        showGroupPanel ||
        showClassPanel !== null ||
        activeFeatureModal !== null ||
        activeFeatureCreateModal !== null;
      if (e.key === 'Escape' && !anyModal) {
        e.preventDefault();
        navigate('/master/create');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showGroupPanel, showClassPanel, activeFeatureModal, activeFeatureCreateModal, navigate]);

  useEffect(() => {
    if (!companyId) return;
    let cancelled = false;
    (async () => {
      try {
        const [allRes] = await Promise.all([window.api.group.getAll(companyId)]);
        if (cancelled) return;
        if (allRes.success && allRes.groups) {
          const allGroups = allRes.groups ?? [];
          setFlatGroups(allGroups);
          const capital = allGroups.find((g: GroupType) => g.name === 'Capital Account');
          if (capital) {
            setForm((f) => ({
              ...f,
              parent_group_id: capital.group_id,
              is_primary: 0,
              nature: capital.nature || 'Liabilities',
            }));
          }
        }
      } catch (e) {
        if (!cancelled) setError('Failed to load groups.');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [companyId]);

  useEffect(() => {
    if (!companyId) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await window.api.gstClassification.getAll(companyId);
        if (!cancelled && res.success && res.gstClassifications) {
          setGstClassifications(
            (res.gstClassifications as any[]).map((c) => ({ gc_id: c.gc_id, name: c.name })),
          );
        }
      } catch {}
    })();
    return () => {
      cancelled = true;
    };
  }, [companyId]);

  const parentGroup = form.parent_group_id
    ? flatGroups.find((g) => g.group_id === form.parent_group_id)
    : null;

  const primaryGroupName = useMemo(() => {
    if (!parentGroup || flatGroups.length === 0) return null;
    let current: GroupType | undefined = parentGroup;
    while (current) {
      if (!current.parent_group_id) return current.name;
      current = flatGroups.find((g) => g.group_id === current!.parent_group_id);
    }
    return null;
  }, [parentGroup, flatGroups]);

  const statutoryConfig = useMemo(
    () => getConfig(primaryGroupName, parentGroup?.name),
    [primaryGroupName, parentGroup?.name],
  );

  const isPrimarySelected = !form.parent_group_id;

  const handleGroupSelect = (group: GroupType) => {
    setForm((f) => ({
      ...f,
      parent_group_id: group.group_id,
      is_primary: 0,
      nature: group.nature || 'Assets',
    }));
    setShowGroupPanel(false);
    focusFieldAfter(underRowRef.current);
  };

  const handleSelectPrimary = () => {
    setForm((f) => ({ ...f, parent_group_id: undefined, is_primary: 1, nature: 'Liabilities' }));
    setShowGroupPanel(false);
    focusFieldAfter(underRowRef.current);
  };

  const setField =
    (key: keyof GroupType) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm((f) => ({ ...f, [key]: e.target.value }));

  const toggleField = (key: keyof GroupType) => () => {
    setForm((f) => ({ ...f, [key]: f[key] ? 0 : 1 }));
  };

  const handleFeatureToggle = (dbKey: keyof GroupType, toggleKey: StatutoryToggle) => {
    setForm((f) => {
      const newVal = f[dbKey] ? 0 : 1;
      if (newVal === 1) setTimeout(() => setActiveFeatureModal(toggleKey), 0);
      return { ...f, [dbKey]: newVal };
    });
  };

  const validate = (): string | null => {
    if (!form.name?.trim()) return 'Name is required.';
    if (!companyId) return 'No company selected.';
    return null;
  };

  const handleSubmit = async () => {
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const payload = {
        company_id: companyId!,
        name: form.name!.trim(),
        alias: form.alias?.trim() || undefined,
        parent_group_id: form.parent_group_id ? Number(form.parent_group_id) : undefined,
        is_primary: form.parent_group_id ? 0 : 1,
        nature: form.nature || undefined,
        set_alter_tds_details: form.set_alter_tds_details ? 1 : 0,
        set_alter_tcs_details: form.set_alter_tcs_details ? 1 : 0,
        set_alter_other_statutory_details: form.set_alter_other_statutory_details ? 1 : 0,
        set_alter_service_tax_details: form.set_alter_service_tax_details ? 1 : 0,
        set_alter_vat_details: form.set_alter_vat_details ? 1 : 0,
        set_alter_excise_details: form.set_alter_excise_details ? 1 : 0,
        hsn_sac_source: form.hsn_sac_source || undefined,
        hsn_sac_code: form.hsn_sac_code || undefined,
        hsn_sac_description: form.hsn_sac_description || undefined,
        gst_rate_source: form.gst_rate_source || undefined,
        gst_rate: form.gst_rate || 0,
        taxability_type: form.taxability_type || undefined,
        hsn_sac_classification_id: form.hsn_sac_classification_id
          ? Number(form.hsn_sac_classification_id)
          : undefined,
        gst_classification_id: form.gst_classification_id
          ? Number(form.gst_classification_id)
          : undefined,
        slab_based_rates: form.slab_based_rates || '[]',
        vat_nature_of_transaction: form.vat_nature_of_transaction || undefined,
        vat_party_entity_type: form.vat_party_entity_type || undefined,
        vat_tax_rate: form.vat_tax_rate ?? 0,
        vat_tax_type: form.vat_tax_type || undefined,
        vat_revised_applicability: form.vat_revised_applicability || undefined,
        excise_tariff_name: form.excise_tariff_name || undefined,
        excise_hsn_code: form.excise_hsn_code || undefined,
        excise_reporting_uom: form.excise_reporting_uom || undefined,
        excise_valuation_type: form.excise_valuation_type || undefined,
        excise_rate: form.excise_rate ?? 0,
        excise_rate_per_unit: form.excise_rate_per_unit ?? 0,
        behaves_like_subledger: form.behaves_like_subledger ? 1 : 0,
        show_net_debit_credit: form.show_net_debit_credit ? 1 : 0,
        used_for_calculation: form.used_for_calculation ? 1 : 0,
        allocation_method: form.allocation_method || 'Not Applicable',
      };

      const res = await window.api.group.create(payload);
      if (res.success) {
        setSuccess(`Group "${form.name}" created.`);
        const capital = flatGroups.find((g) => g.name === 'Capital Account');
        setForm((f) => ({
          ...f,
          name: '',
          alias: '',
          parent_group_id: capital?.group_id,
          is_primary: 0,
          nature: capital?.nature || 'Liabilities',
          set_alter_tds_details: 0,
          set_alter_tcs_details: 0,
          set_alter_other_statutory_details: 0,
          set_alter_service_tax_details: 0,
          set_alter_vat_details: 0,
          set_alter_excise_details: 0,
          hsn_sac_source: 'As per Company/Group',
          hsn_sac_code: '',
          hsn_sac_description: '',
          gst_rate_source: 'As per Company/Group',
          gst_rate: 0,
          taxability_type: '',
          hsn_sac_classification_id: undefined,
          gst_classification_id: undefined,
          slab_based_rates: '[]',
          behaves_like_subledger: 0,
          show_net_debit_credit: 0,
          used_for_calculation: 0,
          allocation_method: 'Not Applicable',
        }));
        const [allRes] = await Promise.all([window.api.group.getAll(companyId!)]);
        if (allRes.success && allRes.groups) setFlatGroups(allRes.groups ?? []);
      } else {
        setError(res.error || 'Failed to create group.');
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unexpected error.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col" data-enter-nav>
      <PageTitleBar
        title="Group Creation"
        subtitle={selectedCompany?.name}
        actions={
          <button
            onClick={() => navigate('/master/create')}
            className="text-zinc-400 hover:text-white text-[11px] transition-colors"
          >
            ← Back
          </button>
        }
      />
      <div className="flex-1 flex">
        <div className="flex-1 p-6 overflow-y-auto">
          {error && (
            <NotificationBanner type="error" message={error} onDismiss={() => setError(null)} />
          )}
          {success && (
            <NotificationBanner
              type="success"
              message={success}
              onDismiss={() => setSuccess(null)}
            />
          )}

          <div className="flex flex-col gap-6 max-w-3xl">
            <div>
              <div className="border rounded overflow-hidden">
                <Row label="Name" required>
                  <input
                    autoFocus
                    ref={nameRef}
                    className={inputCls}
                    value={form.name || ''}
                    onChange={setField('name')}
                    placeholder=""
                    onKeyDown={(e) => {
                      if (e.key !== 'Enter') return;
                      e.preventDefault();
                      aliasRef.current?.focus();
                    }}
                  />
                </Row>
                <Row label="(alias)">
                  <input
                    ref={aliasRef}
                    className={inputCls}
                    value={form.alias || ''}
                    onChange={setField('alias')}
                    placeholder=""
                    onKeyDown={(e) => {
                      if (e.key !== 'Enter') return;
                      e.preventDefault();
                      setShowGroupPanel(true);
                    }}
                  />
                </Row>
                <Row
                  label="Under"
                  onClick={() => setShowGroupPanel(!showGroupPanel)}
                  rowRef={underRowRef}
                  enterClick
                >
                  <span className="text-sm py-1 font-medium text-zinc-800">
                    {parentGroup ? parentGroup.name : '\u2014 Primary \u2014'}
                  </span>
                  {primaryGroupName && primaryGroupName !== parentGroup?.name && (
                    <span className="text-xs text-zinc-400 ml-2 font-normal">
                      (Group: {primaryGroupName})
                    </span>
                  )}
                </Row>
                {isPrimarySelected && (
                  <Row label="Nature of Group" required>
                    <select
                      ref={natureRef}
                      className={selectCls}
                      value={form.nature || 'Liabilities'}
                      onChange={setField('nature')}
                    >
                      {NATURES.map((n) => (
                        <option key={n} value={n}>
                          {n}
                        </option>
                      ))}
                    </select>
                  </Row>
                )}
              </div>
            </div>

            <div className="" />

            <div className="border rounded overflow-hidden">
              <Row label="Group behaves like a sub-ledger">
                <YesNoSelect
                  value={form.behaves_like_subledger}
                  onChange={toggleField('behaves_like_subledger')}
                />
              </Row>
              <Row label="Nett Debit/Credit Balances for Reporting">
                <YesNoSelect
                  value={form.show_net_debit_credit}
                  onChange={toggleField('show_net_debit_credit')}
                />
              </Row>
              <Row label="Used for calculation (for example: taxes, discounts) (for sales invoice entries)">
                <YesNoSelect
                  value={form.used_for_calculation}
                  onChange={toggleField('used_for_calculation')}
                />
              </Row>
              <Row label="Method to allocate when used in purchase invoice">
                <select
                  className={selectCls}
                  value={form.allocation_method || 'Not Applicable'}
                  onChange={setField('allocation_method')}
                >
                  {ALLOC_METHODS.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </Row>
              {statutoryConfig.featureToggles.map((key) => {
                const meta = TOGGLE_META[key];
                const dbKey = meta.dbKey as keyof GroupType;
                const isYes = form[dbKey] as number;
                return (
                  <Row key={key} label={meta.label}>
                    <YesNoSelect value={isYes} onChange={() => handleFeatureToggle(dbKey, key)} />
                  </Row>
                );
              })}
            </div>

            {statutoryConfig.showStatutorySections && (
              <StatutorySection
                form={form}
                setForm={setForm}
                primaryGroupName={primaryGroupName}
                parentGroupName={parentGroup?.name}
                companyId={companyId}
                gstClassifications={gstClassifications}
                onOpenClassPanel={(target) => {
                  classAnchorRef.current = document.activeElement as HTMLElement | null;
                  setShowGroupPanel(false);
                  setShowClassPanel(target);
                }}
              />
            )}

            <div className="flex justify-end gap-3 pt-2">
              <button
                data-enter-accept
                onClick={handleSubmit}
                disabled={loading}
                className="text-sm px-5 py-1.5 rounded bg-black text-white hover:bg-zinc-800 disabled:opacity-50 transition-colors font-medium"
              >
                {loading ? 'Saving...' : 'Create'}
              </button>
            </div>
          </div>
        </div>

        {showGroupPanel && (
          <div className="w-72 border-l border-zinc-200 flex flex-col shrink-0 bg-white">
            <div className="flex items-center justify-between px-3 py-2 border-b border-zinc-200 bg-zinc-50 select-none">
              <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">
                Under Group
              </span>
              <button
                onClick={() => setShowGroupPanel(false)}
                className="text-sm font-bold text-zinc-400 hover:text-zinc-800 transition-colors"
              >
                &times;
              </button>
            </div>
            <div
              className={`flex items-center min-h-[28px] px-3 cursor-pointer text-[13px] select-none border-b ${isPrimarySelected ? 'bg-zinc-100 font-semibold text-black' : 'text-zinc-700 hover:bg-zinc-50'}`}
              onClick={handleSelectPrimary}
            >
              <span className="truncate">Primary</span>
            </div>
            <GroupFlatList
              groups={flatGroups}
              selectedId={form.parent_group_id as number}
              onSelect={handleGroupSelect}
              showHeader={false}
            />
          </div>
        )}

        {showClassPanel && (
          <div
            className="w-72 border-l border-zinc-200 flex flex-col shrink-0 bg-white"
            data-enter-nav-ignore
          >
            <div className="flex items-center justify-between px-3 py-2 border-b border-zinc-200 bg-zinc-50 select-none">
              <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">
                List of Classifications
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setShowClassPanel(null);
                    navigate('/master/create/gst-classification');
                  }}
                  className="text-[11px] px-2 py-0.5 bg-black text-white font-medium"
                >
                  Create
                </button>
                <button
                  onClick={() => setShowClassPanel(null)}
                  className="text-sm font-bold text-zinc-400 hover:text-zinc-800 transition-colors"
                >
                  &times;
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto">
              {gstClassifications.length === 0 ? (
                <div className="px-3 py-6 text-xs text-zinc-400 text-center leading-relaxed">
                  No classifications created yet.
                  <br />
                  Click <strong>Create</strong> to add one.
                </div>
              ) : (
                gstClassifications.map((c) => {
                  const selectedId =
                    showClassPanel === 'hsn'
                      ? Number(form.hsn_sac_classification_id)
                      : Number(form.gst_classification_id);
                  const isSelected = selectedId === c.gc_id;
                  return (
                    <div
                      key={c.gc_id}
                      onClick={() => {
                        if (showClassPanel === 'hsn') {
                          setForm((f) => ({ ...f, hsn_sac_classification_id: c.gc_id }));
                        } else {
                          setForm((f) => ({ ...f, gst_classification_id: c.gc_id }));
                        }
                        setShowClassPanel(null);
                        focusFieldAfter(classAnchorRef.current);
                      }}
                      className={`flex items-center min-h-[28px] px-3 cursor-pointer text-[13px] select-none border-b ${isSelected ? 'bg-zinc-100 font-semibold text-black' : 'text-zinc-700 hover:bg-zinc-50'}`}
                    >
                      <span className="truncate">{c.name}</span>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        <FeatureSubModal
          toggleKey={activeFeatureModal}
          onClose={() => setActiveFeatureModal(null)}
          companyId={companyId}
          onOpenCreateForm={(key) => setActiveFeatureCreateModal(key)}
        />
        <FeatureCreateModal
          toggleKey={activeFeatureCreateModal}
          onClose={() => setActiveFeatureCreateModal(null)}
          companyId={companyId}
        />
      </div>
    </div>
  );
}

/** Renders the appropriate sub-modal for a standalone feature toggle. */
function FeatureSubModal({
  toggleKey,
  onClose,
  companyId,
  onOpenCreateForm,
}: {
  toggleKey: StatutoryToggle | null;
  onClose: () => void;
  companyId: number | undefined;
  onOpenCreateForm: (key: StatutoryToggle) => void;
}) {
  if (toggleKey === 'tds') {
    return (
      <NatureOfPaymentDetailsModal
        isOpen
        onClose={onClose}
        companyId={companyId}
        onOpenCreateForm={() => onOpenCreateForm('tds')}
      />
    );
  }
  if (toggleKey === 'tcs') {
    return (
      <NatureOfGoodsDetailsModal
        isOpen
        onClose={onClose}
        companyId={companyId}
        onOpenCreateForm={() => onOpenCreateForm('tcs')}
      />
    );
  }
  return null;
}

/** Renders the creation-form modal for a standalone feature toggle. */
function FeatureCreateModal({
  toggleKey,
  onClose,
  companyId,
}: {
  toggleKey: StatutoryToggle | null;
  onClose: () => void;
  companyId: number | undefined;
}) {
  if (toggleKey === 'tds') {
    return (
      <TDSNatureOfPaymentCreation
        isOpen
        onClose={onClose}
        companyId={companyId}
        onCreated={() => window.dispatchEvent(new CustomEvent('tds-nature-of-payment-created'))}
      />
    );
  }
  if (toggleKey === 'tcs') {
    return (
      <TCSNatureOfGoodsCreation
        isOpen
        onClose={onClose}
        companyId={companyId}
        onCreated={() => window.dispatchEvent(new CustomEvent('tcs-nature-of-goods-created'))}
      />
    );
  }
  return null;
}
