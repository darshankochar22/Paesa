import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCompany } from '@/context/CompanyContext';
import {
  FormRow,
  PageTitleBar,
  RightActionPanel,
  SearchInput,
  DataTable,
  NotificationBanner,
  MasterFormFooter,
  inputCls,
} from '@/components/ui';
import CostCentreFlatList from '@/components/CostCentreFlatList';
import { focusFieldAfter } from '@/hooks/useEnterNavigation';
import type { CostCentreType } from '@/types/api';

function SelectionPanel({
  costCentres,
  onSelect,
  onCancel,
  onCreate,
}: {
  costCentres: CostCentreType[];
  onSelect: (cc: CostCentreType) => void;
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

  const filtered = costCentres.filter(
    (cc) =>
      cc.name.toLowerCase().includes(search.toLowerCase()) ||
      (cc.alias && cc.alias.toLowerCase().includes(search.toLowerCase())),
  );

  const columns = [
    {
      key: 'name',
      label: 'Name',
      span: 'col-span-5',
      render: (r: CostCentreType) => (
        <span className="font-semibold text-black text-sm">{r.name}</span>
      ),
    },
    {
      key: 'alias',
      label: 'Alias',
      span: 'col-span-3',
      render: (r: CostCentreType) => <span className="text-zinc-500">{r.alias || '—'}</span>,
    },
    {
      key: 'parent',
      label: 'Under',
      span: 'col-span-4',
      render: (r: CostCentreType) => {
        const parent = costCentres.find((cc) => cc.cc_id === r.parent_id);
        return <span className="text-zinc-500">{parent ? parent.name : 'Primary'}</span>;
      },
    },
  ];

  const selectionActions = [
    { key: 'Alt+C', label: 'Create Cost Centre', onClick: onCreate },
    { key: 'Esc', label: 'Quit', onClick: onCancel },
  ];

  return (
    <div className="flex-1 flex flex-col h-full bg-white select-none">
      <PageTitleBar title="Alter Cost Centre" subtitle="Select Cost Centre to Alter" />

      <div className="p-3 border-b border-zinc-200 shrink-0">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search cost centres by name or alias…"
          autoFocus
        />
      </div>

      <div className="flex-1 flex min-h-0">
        <div className="flex-1 flex flex-col bg-white border-r border-zinc-100">
          <DataTable
            columns={columns}
            rows={filtered}
            rowKey={(r: CostCentreType) => String(r.cc_id)}
            onRowClick={onSelect}
            emptyMessage="No cost centres found."
          />
        </div>
        <RightActionPanel actions={selectionActions} />
      </div>
    </div>
  );
}

export default function CostCentreAlter() {
  const navigate = useNavigate();
  const { selectedCompany } = useCompany();
  const companyId = selectedCompany?.company_id;

  const [costCentres, setCostCentres] = useState<CostCentreType[]>([]);
  const [selectedCC, setSelectedCC] = useState<CostCentreType | null>(null);
  const [form, setForm] = useState<Partial<CostCentreType> | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showCCPanel, setShowCCPanel] = useState(false);

  const nameRef = useRef<HTMLInputElement>(null);
  const aliasRef = useRef<HTMLInputElement>(null);
  const underRowRef = useRef<HTMLDivElement>(null);

  const loadCostCentres = useCallback(async () => {
    if (!companyId) return;
    const ccRes = await window.api.costCentre.getAll(companyId);
    if (ccRes.success) setCostCentres(ccRes.costCentres ?? []);
  }, [companyId]);

  useEffect(() => {
    loadCostCentres();
  }, [loadCostCentres]);

  const handleSelectCC = (cc: CostCentreType) => {
    setSelectedCC(cc);
    setForm({ name: cc.name, alias: cc.alias || '', parent_id: cc.parent_id });
    setError(null);
    setSuccess(null);
  };

  const handleCCSelect = (cc: CostCentreType) => {
    setForm((f) => (f ? { ...f, parent_id: cc.cc_id } : f));
    setShowCCPanel(false);
    focusFieldAfter(underRowRef.current);
  };

  const handleSelectPrimary = () => {
    setForm((f) => (f ? { ...f, parent_id: undefined } : f));
    setShowCCPanel(false);
    focusFieldAfter(underRowRef.current);
  };

  const setField = (key: keyof CostCentreType) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => (f ? { ...f, [key]: e.target.value } : f));

  const validate = (): string | null => {
    if (!form?.name?.trim()) return 'Cost centre name is required.';
    if (!companyId) return 'No company selected.';
    if (selectedCC && form.parent_id === selectedCC.cc_id) {
      return 'Cost centre cannot be parent of itself.';
    }
    return null;
  };

  const handleSubmit = useCallback(async () => {
    if (!form || !selectedCC) return;
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const result = await window.api.costCentre.update({
        cc_id: selectedCC.cc_id,
        company_id: companyId,
        name: form.name!.trim(),
        alias: form.alias?.trim() || undefined,
        parent_id: form.parent_id ? Number(form.parent_id) : null,
      } as any);

      if (result.success) {
        setSuccess(`Cost Centre "${form.name}" updated successfully.`);
        await loadCostCentres();
        setTimeout(() => {
          setSuccess(null);
          setSelectedCC(null);
          setForm(null);
        }, 1200);
      } else {
        setError(result.error || 'Failed to update cost centre.');
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unexpected error.');
    } finally {
      setLoading(false);
    }
  }, [form, selectedCC, companyId, loadCostCentres]);

  const handleDelete = useCallback(async () => {
    if (!selectedCC) return;
    if (!window.confirm(`Delete cost centre "${selectedCC.name}"?`)) return;

    setLoading(true);
    setError(null);
    try {
      const result = await window.api.costCentre.delete(selectedCC.cc_id!);
      if (result.success) {
        setSuccess('Cost Centre deleted successfully.');
        await loadCostCentres();
        setTimeout(() => {
          setSuccess(null);
          setSelectedCC(null);
          setForm(null);
        }, 1200);
      } else {
        setError(result.error || 'Failed to delete cost centre.');
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unexpected error.');
    } finally {
      setLoading(false);
    }
  }, [selectedCC, loadCostCentres]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        if (showCCPanel) {
          setShowCCPanel(false);
        } else if (selectedCC) {
          setSelectedCC(null);
          setForm(null);
        } else {
          navigate('/master/alter');
        }
      }
      if ((e.ctrlKey || e.altKey) && e.key.toLowerCase() === 'a' && selectedCC && !showCCPanel) {
        e.preventDefault();
        handleSubmit();
      }
      if (e.altKey && e.key.toLowerCase() === 'd' && selectedCC && !showCCPanel) {
        e.preventDefault();
        handleDelete();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [handleSubmit, handleDelete, navigate, selectedCC, showCCPanel]);

  if (!selectedCC || !form) {
    return (
      <SelectionPanel
        costCentres={costCentres}
        onSelect={handleSelectCC}
        onCancel={() => navigate('/master/alter')}
        onCreate={() => navigate('/master/create/cost-centre')}
      />
    );
  }

  const parentCC = form.parent_id ? costCentres.find((cc) => cc.cc_id === form.parent_id) : null;
  const eligibleParents = costCentres.filter((cc) => cc.cc_id !== selectedCC.cc_id);

  const alterActions = [
    { key: 'Alt+A', label: 'Accept', onClick: handleSubmit },
    { key: 'Alt+D', label: 'Delete', onClick: handleDelete },
    {
      key: 'Esc',
      label: 'Back',
      onClick: () => {
        setSelectedCC(null);
        setForm(null);
      },
    },
  ];

  return (
    <div
      className="flex-1 flex flex-col h-full bg-white select-none relative overflow-hidden"
      data-enter-nav
    >
      <PageTitleBar title="Cost Centre Alteration" subtitle={selectedCompany?.name} />

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
                  setShowCCPanel(true);
                }}
              />
            </FormRow>
            <FormRow
              label="Under"
              labelWidth="w-64"
              className="flex items-center min-h-[26px]"
              onClick={() => setShowCCPanel(!showCCPanel)}
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

        {showCCPanel && (
          <div
            className="w-72 border-l border-zinc-200 flex flex-col shrink-0 bg-white"
            data-enter-nav-ignore
          >
            <div className="flex items-center justify-between px-3 py-2 border-b border-zinc-200 select-none">
              <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">
                Under Cost Centre
              </span>
              <button
                onClick={() => setShowCCPanel(false)}
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
                costCentres={eligibleParents}
                selectedId={form.parent_id as number}
                onSelect={handleCCSelect}
                showHeader={false}
              />
            </div>
          </div>
        )}

        <RightActionPanel actions={alterActions} />
      </div>

      <MasterFormFooter
        onCancel={() => {
          setSelectedCC(null);
          setForm(null);
        }}
        onSubmit={handleSubmit}
        loading={loading}
      />
    </div>
  );
}
