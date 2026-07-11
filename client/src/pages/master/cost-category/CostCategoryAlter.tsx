import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCompany } from '@/context/CompanyContext';
import { FormRow, PageTitleBar, RightActionPanel, SearchInput, DataTable } from '@/components/ui';
import type { CostCategoryType } from '@/types/api';

const inputCls =
  'flex-1 bg-transparent text-sm outline-none px-1 py-0.5 border border-transparent focus:bg-zinc-100 hover:bg-zinc-50 focus:border-zinc-300 transition-colors';
const selectCls =
  'bg-transparent text-sm outline-none px-1 py-0.5 border border-transparent cursor-pointer focus:bg-zinc-100 hover:bg-zinc-50 focus:border-zinc-300 transition-colors';

function SelectionPanel({
  categories,
  onSelect,
  onCancel,
  onCreate,
}: {
  categories: CostCategoryType[];
  onSelect: (c: CostCategoryType) => void;
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

  const filtered = categories.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      (c.alias && c.alias.toLowerCase().includes(search.toLowerCase())),
  );

  const columns = [
    {
      key: 'name',
      label: 'Name',
      span: 'col-span-5',
      render: (r: CostCategoryType) => (
        <span className="font-bold text-zinc-900 text-xs">{r.name}</span>
      ),
    },
    {
      key: 'alias',
      label: 'Alias',
      span: 'col-span-3',
      render: (r: CostCategoryType) => (
        <span className="text-zinc-500 font-semibold">{r.alias || '—'}</span>
      ),
    },
    {
      key: 'rev',
      label: 'Revenue',
      span: 'col-span-2',
      render: (r: CostCategoryType) => (
        <span className="text-zinc-500 font-semibold">
          {r.allocate_revenue_items ? 'Yes' : 'No'}
        </span>
      ),
    },
    {
      key: 'nonrev',
      label: 'Non-Revenue',
      span: 'col-span-2',
      render: (r: CostCategoryType) => (
        <span className="text-zinc-500 font-semibold">
          {r.allocate_non_revenue_items ? 'Yes' : 'No'}
        </span>
      ),
    },
  ];

  const selectionActions = [
    { key: 'Alt+C', label: 'Create Category', onClick: onCreate },
    { key: 'Esc', label: 'Quit', onClick: onCancel },
  ];

  return (
    <div className="flex-1 flex flex-col h-full bg-white select-none font-mono text-[12px]">
      <PageTitleBar title="Alter Cost Category" subtitle="Select Cost Category to Alter" />
      <div className="p-3 bg-zinc-50 border-b border-zinc-200 shrink-0 font-sans">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search cost categories…"
          autoFocus
        />
      </div>
      <div className="flex-1 flex min-h-0">
        <div className="flex-1 flex flex-col bg-white border-r border-zinc-100">
          <DataTable
            columns={columns}
            rows={filtered}
            rowKey={(r: CostCategoryType) => String(r.cc_cat_id)}
            onRowClick={onSelect}
            emptyMessage="No cost categories found."
          />
        </div>
        <RightActionPanel actions={selectionActions} />
      </div>
      <div className="border-t border-zinc-200 p-3 flex justify-end bg-zinc-50 font-sans">
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
  allocate_revenue_items: string;
  allocate_non_revenue_items: string;
}

export default function CostCategoryAlter() {
  const navigate = useNavigate();
  const { selectedCompany } = useCompany();
  const companyId = selectedCompany?.company_id;

  const [categories, setCategories] = useState<CostCategoryType[]>([]);
  const [selected, setSelected] = useState<CostCategoryType | null>(null);
  const [form, setForm] = useState<FormData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const loadCategories = useCallback(async () => {
    if (!companyId) return;
    const r = await window.api.costCategory.getAll(companyId);
    if (r.success) setCategories(r.costCategories ?? []);
  }, [companyId]);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  const handleSelectCategory = (c: CostCategoryType) => {
    setSelected(c);
    setForm({
      name: c.name,
      alias: c.alias || '',
      allocate_revenue_items: String(c.allocate_revenue_items ?? 1),
      allocate_non_revenue_items: String(c.allocate_non_revenue_items ?? 0),
    });
    setError(null);
    setSuccess(null);
  };

  const setField =
    (key: keyof FormData) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm((f) => (f ? { ...f, [key]: e.target.value } : f));

  const handleSubmit = useCallback(async () => {
    if (!form || !selected) return;
    if (!form.name.trim()) {
      setError('Name is required.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const result = await window.api.costCategory.update({
        cc_cat_id: selected.cc_cat_id,
        company_id: companyId,
        name: form.name.trim(),
        alias: form.alias.trim() || undefined,
        allocate_revenue_items: Number(form.allocate_revenue_items),
        allocate_non_revenue_items: Number(form.allocate_non_revenue_items),
      });
      if (result.success) {
        setSuccess(`Cost Category "${form.name}" updated.`);
        await loadCategories();
        setTimeout(() => {
          setSuccess(null);
          setSelected(null);
          setForm(null);
        }, 1200);
      } else {
        setError(result.error || 'Failed to update.');
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unexpected error.');
    } finally {
      setLoading(false);
    }
  }, [form, selected, companyId, loadCategories]);

  const handleDelete = useCallback(async () => {
    if (!selected) return;
    if (!window.confirm(`Delete cost category "${selected.name}"?`)) return;
    setLoading(true);
    setError(null);
    try {
      const result = await window.api.costCategory.delete(selected.cc_cat_id!);
      if (result.success) {
        setSuccess('Cost Category deleted.');
        await loadCategories();
        setTimeout(() => {
          setSuccess(null);
          setSelected(null);
          setForm(null);
        }, 1200);
      } else {
        setError(result.error || 'Failed to delete.');
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unexpected error.');
    } finally {
      setLoading(false);
    }
  }, [selected, loadCategories]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        if (selected) {
          setSelected(null);
          setForm(null);
        } else navigate('/master/alter');
      }
      if ((e.altKey || e.ctrlKey) && e.key.toLowerCase() === 'a') {
        e.preventDefault();
        if (selected) handleSubmit();
      }
      if (e.altKey && e.key.toLowerCase() === 'd') {
        e.preventDefault();
        if (selected) handleDelete();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [handleSubmit, handleDelete, navigate, selected]);

  if (!selected || !form) {
    return (
      <SelectionPanel
        categories={categories}
        onSelect={handleSelectCategory}
        onCancel={() => navigate('/master/alter')}
        onCreate={() => navigate('/master/create/cost-category')}
      />
    );
  }

  const alterActions = [
    { key: 'Alt+A', label: 'Accept', onClick: handleSubmit },
    { key: 'Alt+D', label: 'Delete', onClick: handleDelete },
    {
      key: 'Esc',
      label: 'Back',
      onClick: () => {
        setSelected(null);
        setForm(null);
      },
    },
  ];

  return (
    <div
      className="flex-1 flex flex-col h-full bg-white select-none relative overflow-hidden"
      data-enter-nav
    >
      <PageTitleBar title="Cost Category Alteration" subtitle={selectedCompany?.name} />

      {error && (
        <div className="px-3 py-1.5 border-b border-red-200 bg-red-50 text-red-700 text-xs flex justify-between items-center shrink-0">
          <span>• {error}</span>
          <button
            onClick={() => setError(null)}
            className="text-red-500 hover:text-red-700 text-xs font-bold font-sans"
          >
            &times;
          </button>
        </div>
      )}
      {success && (
        <div className="px-3 py-1.5 border-b border-green-200 bg-green-50 text-green-700 text-xs flex justify-between items-center shrink-0">
          <span>• {success}</span>
          <button
            onClick={() => setSuccess(null)}
            className="text-green-500 hover:text-green-700 text-xs font-bold font-sans"
          >
            &times;
          </button>
        </div>
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
              <input autoFocus className={inputCls} value={form.name} onChange={setField('name')} />
            </FormRow>
            <FormRow label="(alias)" labelWidth="w-64" className="flex items-center min-h-[26px]">
              <input className={inputCls} value={form.alias} onChange={setField('alias')} />
            </FormRow>
            <div className="border-t border-zinc-100 pt-3 mt-2">
              <div className="text-xs uppercase tracking-widest text-zinc-400 font-bold mb-2 font-sans">
                Allocation Options
              </div>
              <FormRow
                label="Allocate Revenue Items"
                labelWidth="w-64"
                className="flex items-center min-h-[26px]"
              >
                <select
                  className={selectCls}
                  value={form.allocate_revenue_items}
                  onChange={setField('allocate_revenue_items')}
                >
                  <option value="1">Yes</option>
                  <option value="0">No</option>
                </select>
              </FormRow>
              <FormRow
                label="Allocate Non-Revenue Items"
                labelWidth="w-64"
                className="flex items-center min-h-[26px]"
              >
                <select
                  className={selectCls}
                  value={form.allocate_non_revenue_items}
                  onChange={setField('allocate_non_revenue_items')}
                >
                  <option value="1">Yes</option>
                  <option value="0">No</option>
                </select>
              </FormRow>
            </div>
          </div>
          <div className="flex-1" />
        </div>
        <RightActionPanel actions={alterActions} />
      </div>

      <div className="border-t border-zinc-200 p-3 flex justify-between items-center bg-zinc-50 shrink-0">
        <button
          onClick={handleDelete}
          disabled={loading}
          className="text-xs px-4 py-1.5 rounded border border-zinc-300 text-zinc-600 hover:bg-zinc-50 disabled:opacity-50 transition-colors font-medium shadow-sm"
        >
          Delete (Alt+D)
        </button>
        <div className="flex gap-3">
          <button
            onClick={() => {
              setSelected(null);
              setForm(null);
            }}
            className="text-xs px-4 py-1.5 rounded border border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50 shadow-sm transition-colors font-medium"
          >
            Quit
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="text-sm px-6 py-1.5 rounded bg-black text-white hover:bg-zinc-800 disabled:opacity-50 transition-colors font-medium"
          >
            {loading ? 'Saving...' : 'Accept'}
          </button>
        </div>
      </div>
    </div>
  );
}
