import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCompany } from '@/context/CompanyContext';
import {
  FormRow,
  PageTitleBar,
  RightActionPanel,
  NotificationBanner,
  MasterFormFooter,
  inputCls,
} from '@/components/ui';
import CostCentreFlatList from '@/components/CostCentreFlatList';
import { focusFieldAfter } from '@/hooks/useEnterNavigation';
import { useMasterShortcuts } from '@/hooks/useMasterShortcuts';
import type { CostCentreType } from '@/types/api';

interface FormState extends Partial<CostCentreType> {}

const INITIAL_FORM: FormState = {
  name: '',
  alias: '',
  parent_id: undefined,
};

export default function CostCentreCreate() {
  const { selectedCompany } = useCompany();
  const navigate = useNavigate();
  const companyId = selectedCompany?.company_id;

  const [costCentres, setCostCentres] = useState<CostCentreType[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showPanel, setShowPanel] = useState(false);

  const [form, setForm] = useState<FormState>(INITIAL_FORM);

  const nameRef = useRef<HTMLInputElement>(null);
  const aliasRef = useRef<HTMLInputElement>(null);
  const underRowRef = useRef<HTMLDivElement>(null);

  const fetchData = useCallback(async () => {
    if (!companyId) return;
    const ccRes = await window.api.costCentre.getAll(companyId);
    if (ccRes.success && ccRes.costCentres) setCostCentres(ccRes.costCentres);
  }, [companyId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const parentCC = form.parent_id ? costCentres.find((cc) => cc.cc_id === form.parent_id) : null;

  const setField = (key: keyof CostCentreType) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleSubmit = useCallback(async () => {
    if (!form.name?.trim()) {
      setError('Name is required.');
      return;
    }
    if (!companyId) {
      setError('No company selected.');
      return;
    }
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await window.api.costCentre.create({
        company_id: companyId,
        name: form.name.trim(),
        alias: form.alias?.trim() || undefined,
        parent_id: form.parent_id ? Number(form.parent_id) : undefined,
      });
      if (res.success) {
        setSuccess(`Cost Centre "${form.name}" created.`);
        setForm(INITIAL_FORM);
        fetchData();
        nameRef.current?.focus();
      } else {
        setError(res.error || 'Failed to create cost centre.');
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unexpected error.');
    } finally {
      setLoading(false);
    }
  }, [form, companyId, fetchData]);

  useMasterShortcuts({
    onAccept: () => {
      if (!showPanel) handleSubmit();
    },
    onQuit: () => {
      if (showPanel) setShowPanel(false);
      else navigate('/master/create');
    },
    onCreate: () => {
      if (!showPanel) navigate('/master/alter/cost-centre');
    },
  });

  const handleSelectParent = (cc: CostCentreType) => {
    setForm((f) => ({ ...f, parent_id: cc.cc_id }));
    setShowPanel(false);
    focusFieldAfter(underRowRef.current);
  };

  const handleSelectPrimary = () => {
    setForm((f) => ({ ...f, parent_id: undefined }));
    setShowPanel(false);
    focusFieldAfter(underRowRef.current);
  };

  const actions = [
    { key: 'Alt+A', label: 'Accept', onClick: handleSubmit },
    {
      key: 'Alt+C',
      label: 'Alter Cost Centre',
      onClick: () => navigate('/master/alter/cost-centre'),
    },
    { key: 'Esc', label: 'Quit', onClick: () => navigate('/master/create') },
  ];

  return (
    <div
      className="flex-1 flex flex-col h-full bg-white select-none relative overflow-hidden"
      data-enter-nav
    >
      <PageTitleBar title="Cost Centre Creation" subtitle={selectedCompany?.name} />

      {error && (
        <NotificationBanner type="error" message={error} onDismiss={() => setError(null)} />
      )}
      {success && (
        <NotificationBanner type="success" message={success} onDismiss={() => setSuccess(null)} />
      )}

      <div className="flex-1 flex min-h-0">
        <div className="flex-1 flex flex-col min-w-0 bg-white p-3 space-y-1 overflow-y-auto">
          <div className="max-w-2xl space-y-1">
            <FormRow
              label="Name"
              required
              labelWidth="w-64"
              className="flex items-center min-h-[26px]"
            >
              <input
                autoFocus
                ref={nameRef}
                className={inputCls}
                value={form.name || ''}
                onChange={setField('name')}
                onKeyDown={(e) => {
                  if (e.key !== 'Enter') return;
                  e.preventDefault();
                  aliasRef.current?.focus();
                }}
              />
            </FormRow>
            <FormRow label="(alias)" labelWidth="w-64" className="flex items-center min-h-[26px]">
              <input
                ref={aliasRef}
                className={inputCls}
                value={form.alias || ''}
                onChange={setField('alias')}
                onKeyDown={(e) => {
                  if (e.key !== 'Enter') return;
                  e.preventDefault();
                  setShowPanel(true);
                }}
              />
            </FormRow>
            <FormRow
              label="Under"
              labelWidth="w-64"
              className="flex items-center min-h-[26px]"
              onClick={() => setShowPanel(!showPanel)}
              rowRef={underRowRef}
              enterClick
            >
              <span className="text-sm font-semibold text-zinc-800 underline decoration-dotted underline-offset-2 decoration-zinc-400">
                {parentCC ? parentCC.name : '— Primary —'}
              </span>
            </FormRow>
          </div>
          <div className="flex-1" />
        </div>

        {showPanel && (
          <div
            className="w-72 border-l border-zinc-200 flex flex-col shrink-0 bg-white"
            data-enter-nav-ignore
          >
            <div className="flex items-center justify-between px-3 py-2 border-b border-zinc-200 select-none">
              <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">
                Under Cost Centre
              </span>
              <button
                onClick={() => setShowPanel(false)}
                className="text-sm font-bold text-zinc-400 hover:text-black transition-colors"
              >
                &times;
              </button>
            </div>
            <div
              className={`flex items-center min-h-[28px] px-3 cursor-pointer text-[13px] select-none border-b border-zinc-100 ${!form.parent_id ? 'font-bold text-black' : 'text-zinc-700 hover:bg-zinc-50'}`}
              onClick={handleSelectPrimary}
            >
              <span className="truncate">Primary</span>
            </div>
            <div className="flex-1 min-h-0">
              <CostCentreFlatList
                costCentres={costCentres}
                selectedId={form.parent_id as number}
                onSelect={handleSelectParent}
                showHeader={false}
              />
            </div>
          </div>
        )}

        <RightActionPanel actions={actions} />
      </div>

      <MasterFormFooter
        onCancel={() => navigate('/master/create')}
        onSubmit={handleSubmit}
        loading={loading}
      />
    </div>
  );
}
