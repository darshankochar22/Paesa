import { useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCompany } from '@/context/CompanyContext';
import {
  FormRow,
  PageTitleBar,
  RightActionPanel,
  MasterFormFooter,
  AlertBanner,
} from '@/components/ui';
import { useMasterShortcuts } from '@/hooks/useMasterShortcuts';
const inputCls =
  'flex-1 bg-transparent text-sm outline-none px-1.5 py-0.5 border border-transparent hover:border-zinc-200 focus:border-zinc-800 transition-colors bg-white/50 rounded';
const selectCls =
  'bg-transparent text-sm outline-none px-1.5 py-0.5 border border-transparent hover:border-zinc-200 focus:border-zinc-800 transition-colors bg-white/50 rounded w-24';

interface FormData {
  name: string;
  alias: string;
  allocate_revenue: 'No' | 'Yes';
  allocate_non_revenue: 'No' | 'Yes';
}

const INITIAL: FormData = {
  name: '',
  alias: '',
  allocate_revenue: 'No',
  allocate_non_revenue: 'No',
};

export default function EmployeeCategoryCreate() {
  const navigate = useNavigate();
  const { selectedCompany } = useCompany();
  const companyId = selectedCompany?.company_id;
  const [form, setForm] = useState<FormData>(INITIAL);
  const nameRef = useRef<HTMLInputElement>(null);
  const aliasRef = useRef<HTMLInputElement>(null);
  const allocateRevenueRef = useRef<HTMLSelectElement>(null);
  const allocateNonRevenueRef = useRef<HTMLSelectElement>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

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
      const result = await window.api.employeeCategory.create({
        company_id: companyId!,
        name: form.name.trim(),
        alias: form.alias.trim() || undefined,
        allocate_revenue: form.allocate_revenue === 'Yes' ? 1 : 0,
        allocate_non_revenue: form.allocate_non_revenue === 'Yes' ? 1 : 0,
      });

      if (result.success) {
        setSuccess(`Employee Category "${form.name}" created successfully.`);
        setForm(INITIAL);
        setTimeout(() => setSuccess(null), 3000);
      } else {
        setError(result.error || 'Failed to create employee category.');
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  }, [form, companyId]);

  useMasterShortcuts({
    onAccept: handleSubmit,
    onQuit: () => navigate('/master/create'),
    onCreate: () => navigate('/master/alter/employee-category'),
  });

  const categoryActions = [
    { key: 'Alt+A', label: 'Accept', onClick: handleSubmit },
    {
      key: 'Alt+C',
      label: 'Alter Mode',
      onClick: () => navigate('/master/alter/employee-category'),
    },
    { key: 'Esc', label: 'Quit', onClick: () => navigate('/master/create') },
  ];

  return (
    <div className="flex-1 flex flex-col h-full bg-white select-none" data-enter-nav>
      <PageTitleBar title="Employee Category Creation" subtitle={selectedCompany?.name} />

      {error && <AlertBanner type="error" message={error} onDismiss={() => setError(null)} />}
      {success && (
        <AlertBanner type="success" message={success} onDismiss={() => setSuccess(null)} />
      )}

      <div className="flex-1 flex min-h-0">
        <div className="flex-1 flex flex-col min-w-0 bg-white">
          <div className="p-3 space-y-1.5 max-w-2xl">
            <FormRow
              label="Name"
              required
              labelWidth="w-56"
              className="flex items-center min-h-[26px]"
            >
              <input
                autoFocus
                ref={nameRef}
                className={inputCls}
                value={form.name}
                onChange={setField('name')}
                placeholder="e.g. Primary Category"
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
                  allocateRevenueRef.current?.focus();
                }}
              />
            </FormRow>
            <FormRow
              label="Allocate Revenue Items"
              labelWidth="w-56"
              className="flex items-center min-h-[26px]"
            >
              <select
                ref={allocateRevenueRef}
                className={selectCls}
                value={form.allocate_revenue}
                onChange={setField('allocate_revenue')}
                onKeyDown={(e) => {
                  if (e.key !== 'Enter') return;
                  e.preventDefault();
                  allocateNonRevenueRef.current?.focus();
                }}
              >
                <option>No</option>
                <option>Yes</option>
              </select>
            </FormRow>
            <FormRow
              label="Allocate Non-Revenue Items"
              labelWidth="w-56"
              className="flex items-center min-h-[26px]"
            >
              <select
                ref={allocateNonRevenueRef}
                className={selectCls}
                value={form.allocate_non_revenue}
                onChange={setField('allocate_non_revenue')}
                onKeyDown={(e) => {
                  if (e.key !== 'Enter') return;
                  e.preventDefault();
                  handleSubmit();
                }}
              >
                <option>No</option>
                <option>Yes</option>
              </select>
            </FormRow>
          </div>
          <div className="flex-1" />
        </div>

        <RightActionPanel actions={categoryActions} />
      </div>

      <MasterFormFooter
        onCancel={() => navigate('/master/create')}
        onSubmit={handleSubmit}
        loading={loading}
      />
    </div>
  );
}
