import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCompany } from '@/context/CompanyContext';
import { PageTitleBar, RightActionPanel, SearchInput, DataTable, FormRow } from '@/components/ui';
import type { CurrencyType } from '@/types/entities/Currency';

const inputCls =
  'w-full bg-transparent text-sm outline-none py-0.5 px-1.5 border border-transparent hover:border-zinc-200 focus:border-zinc-800 transition-colors bg-white/50 rounded ';
const selectCls =
  'bg-transparent text-sm outline-none px-1.5 py-0.5 border border-transparent hover:border-zinc-200 focus:border-zinc-800 transition-colors bg-white/50 rounded w-24 ';

interface FormData {
  symbol: string;
  formal_name: string;
  iso_code: string;
  decimal_places: string;
  show_amount_in_millions: 'No' | 'Yes';
  suffix_symbol_to_amount: 'No' | 'Yes';
  add_space_between_amount_and_symbol: 'No' | 'Yes';
  word_representing_amount_after_decimal: string;
  decimal_places_in_words: string;
}

function SelectionPanel({
  currencies,
  onSelect,
  onCancel,
  onCreate,
}: {
  currencies: CurrencyType[];
  onSelect: (c: CurrencyType) => void;
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

  const filtered = currencies.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      (c.iso_code && c.iso_code.toLowerCase().includes(search.toLowerCase())),
  );

  const columns = [
    {
      key: 'symbol',
      label: 'Symbol',
      span: 'col-span-2',
      render: (r: CurrencyType) => (
        <span className="font-bold text-zinc-900 text-sm">{r.symbol || '—'}</span>
      ),
    },
    {
      key: 'name',
      label: 'Currency Name',
      span: 'col-span-6',
      render: (r: CurrencyType) => (
        <span className="font-bold text-zinc-950 uppercase flex items-center gap-1.5">
          {r.name}
          {!!r.is_predefined && (
            <span className="text-[9px] font-bold px-1.5 py-0.2 bg-zinc-100 text-zinc-500 rounded tracking-wider border border-zinc-200">
              PREDEFINED
            </span>
          )}
          {!!r.is_default && (
            <span className="text-[9px] font-bold px-1.5 py-0.2 bg-emerald-50 text-emerald-600 rounded tracking-wider border border-emerald-200">
              DEFAULT
            </span>
          )}
        </span>
      ),
    },
    {
      key: 'iso_code',
      label: 'ISO Code',
      span: 'col-span-4',
      render: (r: CurrencyType) => (
        <span className="text-zinc-500 font-semibold uppercase">{r.iso_code}</span>
      ),
    },
  ];

  const selectionActions = [
    { key: 'Alt+C', label: 'Create Currency', onClick: onCreate },
    { key: 'Esc', label: 'Quit', onClick: onCancel },
  ];

  return (
    <div className="flex-1 flex flex-col h-full bg-white select-none">
      <PageTitleBar title="Alter Currency" subtitle="Select Currency to Alter" />

      <div className="p-3 bg-zinc-50 border-b border-zinc-200 shrink-0">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search currencies by name or ISO code…"
          autoFocus
        />
      </div>

      <div className="flex-1 flex min-h-0">
        <div className="flex-1 flex flex-col bg-white border-r border-zinc-100">
          <DataTable
            columns={columns}
            rows={filtered}
            rowKey={(r: CurrencyType) => String(r.currency_id)}
            onRowClick={onSelect}
            emptyMessage="No currencies found."
          />
        </div>
        <RightActionPanel actions={selectionActions} />
      </div>

      <div className="border-t border-zinc-200 p-3 flex justify-end bg-zinc-50">
        <button
          onClick={onCancel}
          className="text-xs px-4 py-1.5 rounded border border-zinc-200 bg-white shadow-sm text-zinc-600 hover:bg-zinc-50 transition-colors font-medium font-sans"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

export default function CurrencyAlter() {
  const navigate = useNavigate();
  const { selectedCompany } = useCompany();
  const companyId = selectedCompany?.company_id;

  const [currencies, setCurrencies] = useState<CurrencyType[]>([]);
  const [selectedCurrency, setSelectedCurrency] = useState<CurrencyType | null>(null);
  const [form, setForm] = useState<FormData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const loadCurrencies = useCallback(async () => {
    if (!companyId) return;
    const result = await window.api.currency.getAll(companyId);
    if (result.success) {
      setCurrencies(result.currencies ?? []);
    }
  }, [companyId]);

  useEffect(() => {
    loadCurrencies();
  }, [loadCurrencies]);

  const handleSelectCurrency = (c: CurrencyType) => {
    setSelectedCurrency(c);
    setForm({
      symbol: c.symbol ?? '',
      formal_name: c.formal_name ?? c.name ?? '',
      iso_code: c.iso_code ?? '',
      decimal_places: String(c.decimal_places ?? 2),
      show_amount_in_millions: !!c.show_amount_in_millions ? 'Yes' : 'No',
      suffix_symbol_to_amount: !!c.suffix_symbol_to_amount ? 'Yes' : 'No',
      add_space_between_amount_and_symbol: !!c.add_space_between_amount_and_symbol ? 'Yes' : 'No',
      word_representing_amount_after_decimal: c.word_representing_amount_after_decimal ?? '',
      decimal_places_in_words: c.decimal_places_in_words ?? '2',
    });
    setError(null);
    setSuccess(null);
  };

  const setField =
    (key: keyof FormData) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm((f) => (f ? { ...f, [key]: e.target.value } : f));

  const validate = (): string | null => {
    if (!form?.symbol.trim()) return 'Symbol is required.';
    if (!form?.formal_name.trim()) return 'Formal name is required.';
    if (!form?.iso_code.trim()) return 'ISO Currency Code is required.';
    if (!companyId) return 'No company selected.';
    const decimals = Number(form.decimal_places);
    if (isNaN(decimals) || decimals < 0 || decimals > 10)
      return 'Number of decimal places must be between 0 and 10.';
    return null;
  };

  const handleSubmit = useCallback(async () => {
    if (!form || !selectedCurrency) return;
    if (!!selectedCurrency.is_predefined) {
      setError('Predefined currencies cannot be altered.');
      return;
    }

    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const result = await window.api.currency.update({
        currency_id: selectedCurrency.currency_id,
        company_id: companyId,
        name: form.formal_name.trim() || form.symbol.trim(),
        formal_name: form.formal_name.trim() || undefined,
        iso_code: form.iso_code.trim().toUpperCase(),
        symbol: form.symbol.trim() || undefined,
        decimal_places: Number(form.decimal_places) || 2,
        decimal_places_in_words: form.decimal_places_in_words.trim() || undefined,
        word_representing_amount_after_decimal:
          form.word_representing_amount_after_decimal.trim() || undefined,
        suffix_symbol_to_amount: form.suffix_symbol_to_amount === 'Yes' ? 1 : 0,
        show_amount_in_millions: form.show_amount_in_millions === 'Yes' ? 1 : 0,
        add_space_between_amount_and_symbol:
          form.add_space_between_amount_and_symbol === 'Yes' ? 1 : 0,
      });

      if (result.success) {
        setSuccess(`Currency "${form.formal_name || form.symbol}" updated successfully.`);
        await loadCurrencies();
        setTimeout(() => {
          setSuccess(null);
          setSelectedCurrency(null);
          setForm(null);
        }, 1500);
      } else {
        setError(result.error || 'Failed to update currency.');
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unexpected error.');
    } finally {
      setLoading(false);
    }
  }, [form, selectedCurrency, companyId, loadCurrencies]);

  const handleDelete = useCallback(async () => {
    if (!selectedCurrency) return;
    if (!!selectedCurrency.is_predefined) {
      setError('Predefined currencies cannot be deleted.');
      return;
    }
    if (!!selectedCurrency.is_default) {
      setError('Default base currency cannot be deleted.');
      return;
    }

    if (!window.confirm(`Delete currency "${selectedCurrency.name}"?`)) return;

    setLoading(true);
    setError(null);
    try {
      const result = await window.api.currency.delete(selectedCurrency.currency_id!);
      if (result.success) {
        setSuccess('Currency deleted successfully.');
        await loadCurrencies();
        setTimeout(() => {
          setSuccess(null);
          setSelectedCurrency(null);
          setForm(null);
        }, 1500);
      } else {
        setError(result.error || 'Failed to delete currency.');
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unexpected error.');
    } finally {
      setLoading(false);
    }
  }, [selectedCurrency, loadCurrencies]);

  const handleMakeDefault = useCallback(async () => {
    if (!selectedCurrency || !companyId) return;
    setLoading(true);
    setError(null);
    try {
      const result = await window.api.currency.setDefault(companyId, selectedCurrency.currency_id!);
      if (result.success) {
        setSuccess(`"${selectedCurrency.name}" set as the default company currency.`);
        await loadCurrencies();
        setTimeout(() => {
          setSuccess(null);
          setSelectedCurrency(null);
          setForm(null);
        }, 1500);
      } else {
        setError(result.error || 'Failed to update default currency.');
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unexpected error.');
    } finally {
      setLoading(false);
    }
  }, [selectedCurrency, companyId, loadCurrencies]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        if (selectedCurrency) {
          setSelectedCurrency(null);
          setForm(null);
        } else {
          navigate('/master/alter');
        }
      }
      if (e.altKey && e.key.toLowerCase() === 'a') {
        e.preventDefault();
        handleSubmit();
      }
      if (e.ctrlKey && e.key.toLowerCase() === 'a') {
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
  }, [handleSubmit, handleDelete, navigate, selectedCurrency]);

  if (!selectedCurrency || !form) {
    return (
      <SelectionPanel
        currencies={currencies}
        onSelect={handleSelectCurrency}
        onCancel={() => navigate('/master/alter')}
        onCreate={() => navigate('/master/create/currency')}
      />
    );
  }

  const isPredefined = !!selectedCurrency.is_predefined;

  const alterActions = [
    ...(isPredefined ? [] : [{ key: 'Alt+A', label: 'Accept', onClick: handleSubmit }]),
    ...(isPredefined ? [] : [{ key: 'Alt+D', label: 'Delete', onClick: handleDelete }]),
    ...(selectedCurrency.is_default !== 1
      ? [{ key: 'Alt+S', label: 'Set Default', onClick: handleMakeDefault }]
      : []),
    {
      key: 'Esc',
      label: 'Back',
      onClick: () => {
        setSelectedCurrency(null);
        setForm(null);
      },
    },
  ];

  return (
    <div
      className="flex flex-col h-full relative overflow-hidden bg-white select-none"
      data-enter-nav
    >
      <PageTitleBar
        title={`Currency Alteration: ${selectedCurrency.name}`}
        subtitle={selectedCompany?.name}
      />

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

      {isPredefined && (
        <div className="px-3 py-1.5 border-b border-zinc-200 bg-zinc-50 text-zinc-500 text-xs shrink-0 select-none">
          ℹ️ Predefined base currencies cannot be edited or deleted.
        </div>
      )}

      <div className="flex-1 flex min-h-0">
        <div className="flex-1 overflow-y-auto p-3 space-y-1.5 max-w-2xl bg-white border-r border-zinc-100">
          <FormRow
            label="Symbol"
            required
            labelWidth="w-72"
            className="flex items-center min-h-[26px]"
          >
            <input
              autoFocus={!isPredefined}
              disabled={isPredefined}
              className={`${inputCls} ${isPredefined ? 'text-zinc-500 cursor-not-allowed bg-zinc-50' : ''}`}
              value={form.symbol}
              onChange={setField('symbol')}
            />
          </FormRow>

          <div className="h-3" />
          <FormRow
            label="Formal name"
            required
            labelWidth="w-72"
            className="flex items-center min-h-[26px]"
          >
            <input
              disabled={isPredefined}
              className={`${inputCls} ${isPredefined ? 'text-zinc-500 cursor-not-allowed bg-zinc-50' : ''}`}
              value={form.formal_name}
              onChange={setField('formal_name')}
            />
          </FormRow>
          <FormRow
            label="ISO Currency Code"
            required
            labelWidth="w-72"
            className="flex items-center min-h-[26px]"
          >
            <input
              disabled={isPredefined}
              className={`${inputCls} ${isPredefined ? 'text-zinc-500 cursor-not-allowed bg-zinc-50' : ''}`}
              value={form.iso_code}
              onChange={setField('iso_code')}
              maxLength={3}
            />
          </FormRow>

          <div className="h-3" />
          <FormRow
            label="Number of decimal places"
            labelWidth="w-72"
            className="flex items-center min-h-[26px]"
          >
            <input
              disabled={isPredefined}
              className={`${inputCls} ${isPredefined ? 'text-zinc-500 cursor-not-allowed bg-zinc-50' : ''}`}
              type="number"
              min="0"
              max="10"
              value={form.decimal_places}
              onChange={setField('decimal_places')}
            />
          </FormRow>
          <FormRow
            label="Show amount in millions"
            labelWidth="w-72"
            className="flex items-center min-h-[26px]"
          >
            <select
              disabled={isPredefined}
              className={`${selectCls} ${isPredefined ? 'text-zinc-500 cursor-not-allowed bg-zinc-50' : ''}`}
              value={form.show_amount_in_millions}
              onChange={setField('show_amount_in_millions')}
            >
              <option>No</option>
              <option>Yes</option>
            </select>
          </FormRow>

          <div className="h-3" />
          <FormRow
            label="Suffix symbol to amount"
            labelWidth="w-72"
            className="flex items-center min-h-[26px]"
          >
            <select
              disabled={isPredefined}
              className={`${selectCls} ${isPredefined ? 'text-zinc-500 cursor-not-allowed bg-zinc-50' : ''}`}
              value={form.suffix_symbol_to_amount}
              onChange={setField('suffix_symbol_to_amount')}
            >
              <option>No</option>
              <option>Yes</option>
            </select>
          </FormRow>
          <FormRow
            label="Add space between amount and symbol"
            labelWidth="w-72"
            className="flex items-center min-h-[26px]"
          >
            <select
              disabled={isPredefined}
              className={`${selectCls} ${isPredefined ? 'text-zinc-500 cursor-not-allowed bg-zinc-50' : ''}`}
              value={form.add_space_between_amount_and_symbol}
              onChange={setField('add_space_between_amount_and_symbol')}
            >
              <option>No</option>
              <option>Yes</option>
            </select>
          </FormRow>

          <div className="h-3" />
          <FormRow
            label="Word representing amount after decimal"
            labelWidth="w-72"
            className="flex items-center min-h-[26px]"
          >
            <input
              disabled={isPredefined}
              className={`${inputCls} ${isPredefined ? 'text-zinc-500 cursor-not-allowed bg-zinc-50' : ''}`}
              value={form.word_representing_amount_after_decimal}
              onChange={setField('word_representing_amount_after_decimal')}
            />
          </FormRow>
          <FormRow
            label="No. of decimal places for amount in words"
            labelWidth="w-72"
            className="flex items-center min-h-[26px]"
          >
            <input
              disabled={isPredefined}
              className={`${inputCls} ${isPredefined ? 'text-zinc-500 cursor-not-allowed bg-zinc-50' : ''}`}
              type="number"
              min="0"
              max="10"
              value={form.decimal_places_in_words}
              onChange={setField('decimal_places_in_words')}
            />
          </FormRow>
        </div>

        <RightActionPanel actions={alterActions} />
      </div>

      <div className="px-3 py-3 border-t border-zinc-200 flex justify-between items-center bg-zinc-50 shrink-0">
        {!isPredefined && selectedCurrency.is_default !== 1 ? (
          <button
            onClick={handleDelete}
            disabled={loading}
            className="text-xs px-4 py-1.5 rounded border border-red-200 text-red-500 hover:bg-red-50 hover:border-red-300 disabled:opacity-50 transition-colors font-medium font-sans shadow-sm"
          >
            Delete
          </button>
        ) : (
          <div />
        )}
        <div className="flex gap-3">
          <button
            onClick={() => {
              setSelectedCurrency(null);
              setForm(null);
            }}
            className="text-xs px-4 py-1.5 rounded border border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50 shadow-sm transition-colors font-medium font-sans"
          >
            Back
          </button>
          {!isPredefined && (
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="text-xs px-5 py-1.5 rounded bg-black text-white hover:bg-zinc-800 disabled:opacity-50 shadow-sm transition-colors font-medium font-sans"
            >
              {loading ? 'Saving...' : 'Accept'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
