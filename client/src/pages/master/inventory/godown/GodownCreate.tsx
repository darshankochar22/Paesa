import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCompany } from '@/context/CompanyContext';
import {
  FormRow,
  PageTitleBar,
  RightActionPanel,
  SideSelectionPanel,
  NotificationBanner,
  MasterFormFooter,
  inputCls,
} from '@/components/ui';
import { focusFieldAfter } from '@/hooks/useEnterNavigation';
import TaxUnitSidePanel from './TaxUnitSidePanel';
import type { GodownType } from '@/types/api';
import type { TaxUnitType } from '@/types/entities/TaxUnit';

interface FormData {
  name: string;
  alias: string;
  parent_godown_id: string;
  excise_tax_unit: string;
  allow_storage_of_materials: string;
}

const INITIAL: FormData = {
  name: '',
  alias: '',
  parent_godown_id: '',
  excise_tax_unit: 'Not Applicable',
  allow_storage_of_materials: '1',
};

export default function GodownCreate() {
  const navigate = useNavigate();
  const { selectedCompany } = useCompany();
  const companyId = selectedCompany?.company_id;

  const [form, setForm] = useState<FormData>(INITIAL);
  const [godowns, setGodowns] = useState<GodownType[]>([]);
  const [taxUnits, setTaxUnits] = useState<TaxUnitType[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showGodownPanel, setShowGodownPanel] = useState(false);
  const [showTaxUnitPanel, setShowTaxUnitPanel] = useState(false);

  const nameRef = useRef<HTMLInputElement>(null);
  const aliasRef = useRef<HTMLInputElement>(null);
  const underRef = useRef<HTMLDivElement>(null);
  const taxUnitRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!companyId) return;
    window.api.godown.getAll(companyId).then((r) => {
      if (r.success) setGodowns(r.godowns ?? []);
    });
    (window.api as any).taxUnits.getAll(companyId).then((r: any) => {
      if (r.success) setTaxUnits(r.taxUnits ?? []);
    });
  }, [companyId]);

  const setField =
    (key: keyof FormData) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm((f) => ({ ...f, [key]: e.target.value }));

  const validate = (): string | null => {
    if (!form.name.trim()) return 'Name is required.';
    if (!companyId) return 'No company selected.';
    return null;
  };

  const handleSubmit = useCallback(async () => {
    const err = validate();
    if (err) {
      setError(err);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const result = await window.api.godown.create({
        company_id: companyId!,
        name: form.name.trim(),
        alias: form.alias.trim() || undefined,
        parent_godown_id: form.parent_godown_id ? Number(form.parent_godown_id) : undefined,
        allow_storage_of_materials: Number(form.allow_storage_of_materials),
        excise_tax_unit: form.excise_tax_unit || 'Not Applicable',
      });
      if (result.success) {
        const updated = await window.api.godown.getAll(companyId!);
        if (updated.success) setGodowns(updated.godowns ?? []);
        setSuccess(`Godown "${form.name}" created successfully.`);
        setForm(INITIAL);
        setTimeout(() => setSuccess(null), 3000);
      } else {
        setError(result.error || 'Failed to create godown.');
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unexpected error.');
    } finally {
      setLoading(false);
    }
  }, [form, companyId]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (showTaxUnitPanel) {
        if (e.key === 'Escape') {
          e.preventDefault();
          setShowTaxUnitPanel(false);
        }
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        if (showGodownPanel) setShowGodownPanel(false);
        else navigate('/master/create');
      }
      if (e.altKey && e.key.toLowerCase() === 'g') {
        e.preventDefault();
        setShowGodownPanel((prev) => !prev);
      }
      if (e.altKey && e.key.toLowerCase() === 'a') {
        e.preventDefault();
        handleSubmit();
      }
      if (e.ctrlKey && e.key.toLowerCase() === 'a') {
        e.preventDefault();
        handleSubmit();
      }
      if (e.altKey && e.key.toLowerCase() === 'c') {
        e.preventDefault();
        navigate('/master/alter/godown');
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [handleSubmit, navigate, showGodownPanel, showTaxUnitPanel]);

  const selectedGodownLabel = form.parent_godown_id
    ? (godowns.find((g) => String(g.godown_id) === form.parent_godown_id)?.name ?? 'Primary')
    : 'Primary';

  const godownActions = [
    { key: 'Alt+G', label: 'Select Godown', onClick: () => setShowGodownPanel((prev) => !prev) },
    { key: 'Alt+A', label: 'Accept', onClick: handleSubmit },
    { key: 'Alt+C', label: 'Alter Godown', onClick: () => navigate('/master/alter/godown') },
    { key: 'Esc', label: 'Quit', onClick: () => navigate('/master/create') },
  ];

  return (
    <div
      className="flex-1 flex flex-col h-full bg-white select-none relative overflow-hidden"
      data-enter-nav
    >
      <PageTitleBar title="Godown Creation" subtitle={selectedCompany?.name} />

      {error && (
        <NotificationBanner type="error" message={error} onDismiss={() => setError(null)} />
      )}
      {success && (
        <NotificationBanner type="success" message={success} onDismiss={() => setSuccess(null)} />
      )}

      <div className="flex-1 flex min-h-0">
        <div className="flex-1 flex flex-col min-w-0 bg-white border-r border-zinc-100 p-3 overflow-y-auto">
          <div className="max-w-2xl space-y-1">
            <FormRow
              label="Name"
              required
              labelWidth="w-56"
              className="flex items-center min-h-[26px]"
            >
              <input
                ref={nameRef}
                autoFocus
                className={inputCls}
                value={form.name}
                onChange={setField('name')}
                onKeyDown={(e) => {
                  if (e.key !== 'Enter') return;
                  e.preventDefault();
                  aliasRef.current?.focus();
                }}
              />
            </FormRow>

            <FormRow label="(alias)" labelWidth="w-56" className="flex items-center min-h-[26px]">
              <input
                ref={aliasRef}
                className={inputCls}
                value={form.alias}
                onChange={setField('alias')}
                onKeyDown={(e) => {
                  if (e.key !== 'Enter') return;
                  e.preventDefault();
                  setShowGodownPanel(true);
                }}
              />
            </FormRow>

            <FormRow
              label="Under"
              labelWidth="w-56"
              className="flex items-center min-h-[26px]"
              onClick={() => setShowGodownPanel((v) => !v)}
              rowRef={underRef}
              enterClick
            >
              <span className="text-sm font-semibold text-zinc-800 underline decoration-dotted underline-offset-2 decoration-zinc-400">
                {selectedGodownLabel}
              </span>
            </FormRow>

            {/* Excise Tax Unit — opens side panel */}
            <FormRow
              label="Excise Tax unit"
              labelWidth="w-56"
              className="flex items-center min-h-[26px]"
            >
              <div
                ref={taxUnitRef}
                tabIndex={0}
                data-enter-click
                className="flex-1 text-left text-sm px-1 py-0.5 cursor-pointer border border-transparent hover:border-zinc-200 focus:border-zinc-800 outline-none transition-colors font-semibold"
                onClick={() => setShowTaxUnitPanel((v) => !v)}
              >
                {form.excise_tax_unit || 'Not Applicable'}
              </div>
            </FormRow>
          </div>
        </div>

        {/* Tax Unit side panel */}
        {showTaxUnitPanel && (
          <TaxUnitSidePanel
            taxUnits={taxUnits}
            selected={form.excise_tax_unit}
            onSelect={(name) => {
              setForm((f) => ({ ...f, excise_tax_unit: name }));
              setShowTaxUnitPanel(false);
              focusFieldAfter(taxUnitRef.current);
            }}
            onCreate={() => navigate('/master/create/tax-units')}
            onClose={() => setShowTaxUnitPanel(false)}
          />
        )}

        {/* Godown Under panel */}
        {showGodownPanel && (
          <SideSelectionPanel
            title="List of Godowns"
            items={godowns
              .filter((g) => g.name.toLowerCase() !== 'primary')
              .map((g) => ({ id: g.godown_id, label: g.name }))}
            selected={form.parent_godown_id}
            onSelect={(val) => {
              setForm((f) => ({ ...f, parent_godown_id: val }));
              focusFieldAfter(underRef.current);
            }}
            onClose={() => setShowGodownPanel(false)}
            showPrimary
            keyboard
          />
        )}

        <RightActionPanel actions={godownActions} />
      </div>

      <MasterFormFooter
        onCancel={() => navigate('/master/create')}
        onSubmit={handleSubmit}
        loading={loading}
      />
    </div>
  );
}
