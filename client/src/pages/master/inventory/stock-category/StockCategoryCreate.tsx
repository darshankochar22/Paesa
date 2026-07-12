import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCompany } from '@/context/CompanyContext';
import {
  FormRow,
  PageTitleBar,
  RightActionPanel,
  NotificationBanner,
  MasterFormFooter,
} from '@/components/ui';
import { focusFieldAfter } from '@/hooks/useEnterNavigation';
import type { StockCategoryType } from '@/types/api';
const inputCls = 'flex-1 bg-transparent text-sm outline-none px-1 py-0.5 border border-transparent';

function CategoryListPanel({
  categories,
  selected,
  onSelect,
  onClose,
}: {
  categories: StockCategoryType[];
  selected: string;
  onSelect: (id: string) => void;
  onClose: () => void;
}) {
  const [search, setSearch] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const filtered = categories.filter(
    (c) =>
      c.name.toLowerCase() !== 'primary' && c.name.toLowerCase().includes(search.toLowerCase()),
  );
  const optionsList = [
    { id: '', label: 'Primary' },
    ...filtered.map((c) => ({ id: String(c.sc_id), label: c.name })),
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
        {filtered.length === 0 && (
          <div className="text-xs text-zinc-400 px-3 py-2 italic">No categories yet</div>
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

const INITIAL: FormData = { name: '', alias: '', parent_category_id: '' };

export default function StockCategoryCreate() {
  const navigate = useNavigate();
  const { selectedCompany } = useCompany();
  const [form, setForm] = useState<FormData>(INITIAL);
  const [categories, setCategories] = useState<StockCategoryType[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showPanel, setShowPanel] = useState(false);
  const nameRef = useRef<HTMLInputElement>(null);
  const aliasRef = useRef<HTMLInputElement>(null);
  const underRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const company_id = selectedCompany?.company_id;
    if (!company_id) return;
    window.api.stockCategory.getAll(company_id).then((r) => {
      if (r.success) setCategories(r.stockCategories ?? []);
    });
  }, [selectedCompany]);

  const setField = (key: keyof FormData) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleSubmit = useCallback(async () => {
    if (!form.name.trim()) {
      setError('Name is required.');
      return;
    }
    if (!selectedCompany?.company_id) {
      setError('No company selected.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const result = await window.api.stockCategory.create({
        company_id: selectedCompany.company_id,
        name: form.name.trim(),
        alias: form.alias.trim() || undefined,
        parent_category_id: form.parent_category_id ? Number(form.parent_category_id) : undefined,
      });
      if (result.success) {
        const updated = await window.api.stockCategory.getAll(selectedCompany.company_id!);
        if (updated.success) setCategories(updated.stockCategories ?? []);
        setSuccess(`Stock Category "${form.name}" created.`);
        setForm(INITIAL);
        setTimeout(() => setSuccess(null), 3000);
      } else {
        setError(result.error || 'Failed to create stock category.');
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unexpected error.');
    } finally {
      setLoading(false);
    }
  }, [form, selectedCompany]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        if (showPanel) setShowPanel(false);
        else navigate('/master/create');
      }
      if (e.altKey && e.key.toLowerCase() === 'u') {
        e.preventDefault();
        setShowPanel((prev) => !prev);
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
        navigate('/master/alter/stock-category');
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [handleSubmit, navigate, showPanel]);

  const selectedLabel = form.parent_category_id
    ? (categories.find((c) => String(c.sc_id) === form.parent_category_id)?.name ?? 'Primary')
    : 'Primary';

  const categoryActions = [
    { key: 'Alt+U', label: 'Select Parent', onClick: () => setShowPanel((prev) => !prev) },
    { key: 'Alt+A', label: 'Accept', onClick: handleSubmit },
    {
      key: 'Alt+C',
      label: 'Alter Category',
      onClick: () => navigate('/master/alter/stock-category'),
    },
    { key: 'Esc', label: 'Quit', onClick: () => navigate('/master/create') },
  ];

  return (
    <div className="flex-1 flex flex-col h-full bg-white select-none" data-enter-nav>
      <PageTitleBar title="Stock Category Creation" subtitle={selectedCompany?.name} />

      {error && (
        <NotificationBanner type="error" message={error} onDismiss={() => setError(null)} />
      )}
      {success && (
        <NotificationBanner type="success" message={success} onDismiss={() => setSuccess(null)} />
      )}

      <div className="flex-1 flex min-h-0">
        <div className="flex-1 flex flex-col min-w-0 bg-white">
          <div className="p-3 space-y-1 max-w-2xl">
            <FormRow label="Name" labelWidth="w-48" className="flex items-center min-h-[26px]">
              <input
                autoFocus
                ref={nameRef}
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
            <FormRow label="(alias)" labelWidth="w-48" className="flex items-center min-h-[26px]">
              <input
                ref={aliasRef}
                className={inputCls}
                value={form.alias}
                onChange={setField('alias')}
                onKeyDown={(e) => {
                  if (e.key !== 'Enter') return;
                  e.preventDefault();
                  setShowPanel(true);
                }}
              />
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
            onSelect={(val) => {
              setForm((f) => ({ ...f, parent_category_id: val }));
              focusFieldAfter(underRef.current);
            }}
            onClose={() => setShowPanel(false)}
          />
        )}

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
