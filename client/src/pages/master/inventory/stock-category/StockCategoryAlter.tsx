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
} from '@/components/ui';
import { focusFieldAfter } from '@/hooks/useEnterNavigation';
import type { StockCategoryType } from '@/types/api';

const inputCls =
  'flex-1 bg-transparent text-sm outline-none px-1 py-0.5 border border-transparent focus:bg-zinc-100 hover:bg-zinc-50 focus:border-zinc-300 transition-colors';

function SelectionPanel({
  categories,
  onSelect,
  onCancel,
  onCreate,
}: {
  categories: StockCategoryType[];
  onSelect: (c: StockCategoryType) => void;
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

  const nameOf = (id?: number) =>
    id ? (categories.find((c) => c.sc_id === id)?.name ?? 'Primary') : 'Primary';

  const filtered = categories.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      (c.alias && c.alias.toLowerCase().includes(search.toLowerCase())),
  );

  const columns = [
    {
      key: 'name',
      label: 'Name',
      span: 'col-span-6',
      render: (r: StockCategoryType) => (
        <span className="font-bold text-zinc-900 text-xs">{r.name}</span>
      ),
    },
    {
      key: 'alias',
      label: 'Alias',
      span: 'col-span-3',
      render: (r: StockCategoryType) => (
        <span className="text-zinc-500 font-semibold">{r.alias || '—'}</span>
      ),
    },
    {
      key: 'under',
      label: 'Under',
      span: 'col-span-3',
      render: (r: StockCategoryType) => (
        <span className="text-zinc-500 font-semibold">{nameOf(r.parent_category_id)}</span>
      ),
    },
  ];

  const selectionActions = [
    { key: 'Alt+C', label: 'Create Category', onClick: onCreate },
    { key: 'Esc', label: 'Quit', onClick: onCancel },
  ];

  return (
    <div className="flex-1 flex flex-col h-full bg-white select-none font-mono text-[12px]">
      <PageTitleBar title="Alter Stock Category" subtitle="Select Stock Category to Alter" />
      <div className="p-3 bg-zinc-50 border-b border-zinc-200 shrink-0 font-sans">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search stock categories…"
          autoFocus
        />
      </div>
      <div className="flex-1 flex min-h-0">
        <div className="flex-1 flex flex-col bg-white border-r border-zinc-100">
          <DataTable
            columns={columns}
            rows={filtered}
            rowKey={(r: StockCategoryType) => String(r.sc_id)}
            onRowClick={onSelect}
            emptyMessage="No stock categories found."
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

function CategoryListPanel({
  categories,
  selected,
  excludeId,
  onSelect,
  onClose,
}: {
  categories: StockCategoryType[];
  selected: string;
  excludeId?: number;
  onSelect: (id: string) => void;
  onClose: () => void;
}) {
  const [search, setSearch] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const options = categories.filter(
    (c) =>
      c.name.toLowerCase() !== 'primary' &&
      c.sc_id !== excludeId &&
      c.name.toLowerCase().includes(search.toLowerCase()),
  );
  const optionsList = [
    { id: '', label: 'Primary' },
    ...options.map((c) => ({ id: String(c.sc_id), label: c.name })),
  ];

  const [focusedIndex, setFocusedIndex] = useState(0);

  useEffect(() => {
    const idx = optionsList.findIndex((o) => o.id === selected);
    setFocusedIndex(idx !== -1 ? idx : 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected, search]);

  useEffect(() => {
    itemRefs.current[focusedIndex]?.scrollIntoView({ block: 'nearest' });
  }, [focusedIndex]);

  return (
    <div
      className="w-72 border-l border-zinc-200 flex flex-col shrink-0 bg-white"
      data-enter-nav-ignore
    >
      <div className="px-3 py-2 text-xs font-bold uppercase tracking-wider flex justify-between items-center select-none border-b border-zinc-150">
        <span>List of Categories</span>
        <button onClick={onClose} className="text-sm font-bold font-sans hover:text-red-500">
          &times;
        </button>
      </div>
      <input
        ref={inputRef}
        data-enter-skip
        className="px-3 py-1.5 text-xs outline-none border-b border-zinc-200 placeholder-zinc-400 bg-zinc-50 focus:bg-white transition-colors"
        placeholder="Search..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Escape') {
            e.preventDefault();
            onClose();
          } else if (e.key === 'ArrowDown') {
            e.preventDefault();
            setFocusedIndex((prev) => (prev + 1) % optionsList.length);
          } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setFocusedIndex((prev) => (prev - 1 + optionsList.length) % optionsList.length);
          } else if (e.key === 'Enter') {
            e.preventDefault();
            const opt = optionsList[focusedIndex];
            if (opt) {
              onSelect(opt.id);
              onClose();
            }
          }
        }}
      />
      <div className="flex-1 overflow-y-auto">
        {optionsList.map((opt, idx) => (
          <div
            key={opt.id || '__primary'}
            ref={(el) => {
              itemRefs.current[idx] = el;
            }}
            onClick={() => {
              onSelect(opt.id);
              onClose();
            }}
            onMouseEnter={() => setFocusedIndex(idx)}
            className={[
              'text-xs px-3 py-1.5 border-b border-zinc-100 cursor-pointer select-none',
              opt.id === '' ? 'italic' : '',
              idx === focusedIndex
                ? 'bg-zinc-900 text-white'
                : selected === opt.id && opt.id !== ''
                  ? 'bg-zinc-200 text-zinc-900 font-semibold'
                  : opt.id === ''
                    ? 'hover:bg-zinc-50 text-zinc-500'
                    : 'hover:bg-zinc-50 text-zinc-800',
            ].join(' ')}
          >
            {opt.label}
          </div>
        ))}
        {options.length === 0 && (
          <div className="text-xs text-zinc-400 px-3 py-2 italic">No other categories</div>
        )}
      </div>
    </div>
  );
}

interface FormData {
  name: string;
  alias: string;
  parent_category_id: string;
}

export default function StockCategoryAlter() {
  const navigate = useNavigate();
  const { selectedCompany } = useCompany();
  const companyId = selectedCompany?.company_id;

  const [categories, setCategories] = useState<StockCategoryType[]>([]);
  const [selected, setSelected] = useState<StockCategoryType | null>(null);
  const [form, setForm] = useState<FormData | null>(null);
  const [showPanel, setShowPanel] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const underRef = useRef<HTMLDivElement>(null);

  const loadCategories = useCallback(async () => {
    if (!companyId) return;
    const r = await window.api.stockCategory.getAll(companyId);
    if (r.success) setCategories(r.stockCategories ?? []);
  }, [companyId]);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  const handleSelectCategory = (c: StockCategoryType) => {
    setSelected(c);
    setForm({
      name: c.name,
      alias: c.alias || '',
      parent_category_id: c.parent_category_id ? String(c.parent_category_id) : '',
    });
    setError(null);
    setSuccess(null);
  };

  const setField = (key: keyof FormData) => (e: React.ChangeEvent<HTMLInputElement>) =>
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
      const result = await window.api.stockCategory.update({
        sc_id: selected.sc_id,
        company_id: companyId,
        name: form.name.trim(),
        alias: form.alias.trim() || undefined,
        parent_category_id: form.parent_category_id ? Number(form.parent_category_id) : undefined,
      });
      if (result.success) {
        setSuccess(`Stock Category "${form.name}" updated.`);
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
    if (!window.confirm(`Delete stock category "${selected.name}"?`)) return;
    setLoading(true);
    setError(null);
    try {
      const result = await window.api.stockCategory.delete(selected.sc_id!);
      if (result.success) {
        setSuccess('Stock Category deleted.');
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
        if (showPanel) {
          setShowPanel(false);
        } else if (selected) {
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
      if (e.altKey && e.key.toLowerCase() === 'u') {
        e.preventDefault();
        if (selected) setShowPanel((p) => !p);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [handleSubmit, handleDelete, navigate, selected, showPanel]);

  if (!selected || !form) {
    return (
      <SelectionPanel
        categories={categories}
        onSelect={handleSelectCategory}
        onCancel={() => navigate('/master/alter')}
        onCreate={() => navigate('/master/create/stock-category')}
      />
    );
  }

  const selectedLabel = form.parent_category_id
    ? (categories.find((c) => String(c.sc_id) === form.parent_category_id)?.name ?? 'Primary')
    : 'Primary';

  const alterActions = [
    { key: 'Alt+U', label: 'Select Parent', onClick: () => setShowPanel((p) => !p) },
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
      <PageTitleBar title="Stock Category Alteration" subtitle={selectedCompany?.name} />

      {error && (
        <NotificationBanner type="error" message={error} onDismiss={() => setError(null)} />
      )}
      {success && (
        <NotificationBanner type="success" message={success} onDismiss={() => setSuccess(null)} />
      )}

      <div className="flex-1 flex min-h-0">
        <div className="flex-1 flex flex-col min-w-0 bg-white p-3 overflow-y-auto">
          <div className="space-y-1 max-w-2xl">
            <FormRow
              label="Name"
              required
              labelWidth="w-48"
              className="flex items-center min-h-[26px]"
            >
              <input autoFocus className={inputCls} value={form.name} onChange={setField('name')} />
            </FormRow>
            <FormRow label="(alias)" labelWidth="w-48" className="flex items-center min-h-[26px]">
              <input className={inputCls} value={form.alias} onChange={setField('alias')} />
            </FormRow>
            <div
              ref={underRef}
              tabIndex={0}
              data-enter-click
              className="flex items-center min-h-[26px] cursor-pointer hover:bg-zinc-50 focus:bg-zinc-100 outline-none select-none text-sm"
              onClick={() => setShowPanel((v) => !v)}
            >
              <span className="w-48 text-zinc-400 shrink-0 py-1 font-sans">Under</span>
              <span className="text-zinc-600 mr-2 shrink-0">:</span>
              <span className="text-sm px-1 py-0.5 font-bold uppercase tracking-wide text-zinc-900">
                {selectedLabel}
              </span>
            </div>
          </div>
          <div className="flex-1" />
        </div>

        {showPanel && (
          <CategoryListPanel
            categories={categories}
            selected={form.parent_category_id}
            excludeId={selected.sc_id}
            onSelect={(val) => {
              setForm((f) => (f ? { ...f, parent_category_id: val } : f));
              focusFieldAfter(underRef.current);
            }}
            onClose={() => setShowPanel(false)}
          />
        )}

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
