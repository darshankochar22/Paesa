import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCompany } from '@/context/CompanyContext';
import { FormRow, PageTitleBar, RightActionPanel } from '@/components/ui';
const inputCls =
  'flex-1 bg-transparent text-sm outline-none px-1.5 py-0.5 border border-transparent hover:border-zinc-200 focus:border-zinc-800 transition-colors bg-white/50 rounded ';
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

const INITIAL: FormData = {
  symbol: '',
  formal_name: '',
  iso_code: '',
  decimal_places: '2',
  show_amount_in_millions: 'No',
  suffix_symbol_to_amount: 'No',
  add_space_between_amount_and_symbol: 'No',
  word_representing_amount_after_decimal: '',
  decimal_places_in_words: '2',
};

export default function CurrencyCreate() {
  const navigate = useNavigate();
  const { selectedCompany } = useCompany();
  const companyId = selectedCompany?.company_id;
  const [form, setForm] = useState<FormData>(INITIAL);
  const symbolRef = useRef<HTMLInputElement>(null);
  const formalNameRef = useRef<HTMLInputElement>(null);
  const isoCodeRef = useRef<HTMLInputElement>(null);
  const decimalPlacesRef = useRef<HTMLInputElement>(null);
  const showMillionsRef = useRef<HTMLSelectElement>(null);
  const suffixSymbolRef = useRef<HTMLSelectElement>(null);
  const addSpaceRef = useRef<HTMLSelectElement>(null);
  const wordAfterDecimalRef = useRef<HTMLInputElement>(null);
  const decimalPlacesWordsRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const setField =
    (key: keyof FormData) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm((f) => ({ ...f, [key]: e.target.value }));

  const validate = (): string | null => {
    if (!form.symbol.trim()) return 'Symbol is required.';
    if (!form.formal_name.trim()) return 'Formal name is required.';
    if (!form.iso_code.trim()) return 'ISO Currency Code is required.';
    if (!companyId) return 'No company selected.';
    const decimals = Number(form.decimal_places);
    if (isNaN(decimals) || decimals < 0 || decimals > 10)
      return 'Number of decimal places must be between 0 and 10.';
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
      const result = await window.api.currency.create({
        company_id: companyId!,
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
        setSuccess(`Currency "${form.formal_name || form.symbol}" created successfully.`);
        setForm(INITIAL);
        setTimeout(() => setSuccess(null), 3000);
      } else {
        setError(result.error || 'Failed to create currency.');
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  }, [form, companyId]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        navigate('/master/create');
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
        navigate('/master/alter/currency');
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [handleSubmit, navigate]);

  const currencyActions = [
    { key: 'Alt+A', label: 'Accept', onClick: handleSubmit },
    { key: 'Alt+C', label: 'Alter Mode', onClick: () => navigate('/master/alter/currency') },
    { key: 'Esc', label: 'Quit', onClick: () => navigate('/master/create') },
  ];

  return (
    <div className="flex-1 flex flex-col h-full bg-white select-none" data-enter-nav>
      <PageTitleBar title="Currency Creation" subtitle={selectedCompany?.name} />

      {error && (
        <div className="px-3 py-1.5 border-b border-red-200 bg-red-50 text-red-700 text-xs flex justify-between items-center">
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
        <div className="px-3 py-1.5 border-b border-green-200 bg-green-50 text-green-700 text-xs flex justify-between items-center">
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
        <div className="flex-1 flex flex-col min-w-0 bg-white">
          <div className="p-3 space-y-1.5 max-w-2xl">
            <FormRow
              label="Symbol"
              required
              labelWidth="w-72"
              className="flex items-center min-h-[26px]"
            >
              <input
                autoFocus
                ref={symbolRef}
                className={inputCls}
                value={form.symbol}
                onChange={setField('symbol')}
                placeholder="e.g. ₹"
                onKeyDown={(e) => {
                  if (e.key !== 'Enter') return;
                  e.preventDefault();
                  formalNameRef.current?.focus();
                }}
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
                ref={formalNameRef}
                className={inputCls}
                value={form.formal_name}
                onChange={setField('formal_name')}
                placeholder="e.g. Indian Rupee"
                onKeyDown={(e) => {
                  if (e.key !== 'Enter') return;
                  e.preventDefault();
                  isoCodeRef.current?.focus();
                }}
              />
            </FormRow>
            <FormRow
              label="ISO Currency Code"
              required
              labelWidth="w-72"
              className="flex items-center min-h-[26px]"
            >
              <input
                ref={isoCodeRef}
                className={inputCls}
                value={form.iso_code}
                onChange={setField('iso_code')}
                placeholder="e.g. INR"
                maxLength={3}
                onKeyDown={(e) => {
                  if (e.key !== 'Enter') return;
                  e.preventDefault();
                  decimalPlacesRef.current?.focus();
                }}
              />
            </FormRow>

            <div className="h-3" />
            <FormRow
              label="Number of decimal places"
              labelWidth="w-72"
              className="flex items-center min-h-[26px]"
            >
              <input
                ref={decimalPlacesRef}
                className={inputCls}
                type="number"
                min="0"
                max="10"
                value={form.decimal_places}
                onChange={setField('decimal_places')}
                onKeyDown={(e) => {
                  if (e.key !== 'Enter') return;
                  e.preventDefault();
                  showMillionsRef.current?.focus();
                }}
              />
            </FormRow>
            <FormRow
              label="Show amount in millions"
              labelWidth="w-72"
              className="flex items-center min-h-[26px]"
            >
              <select
                ref={showMillionsRef}
                className={selectCls}
                value={form.show_amount_in_millions}
                onChange={setField('show_amount_in_millions')}
                onKeyDown={(e) => {
                  if (e.key !== 'Enter') return;
                  e.preventDefault();
                  suffixSymbolRef.current?.focus();
                }}
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
                ref={suffixSymbolRef}
                className={selectCls}
                value={form.suffix_symbol_to_amount}
                onChange={setField('suffix_symbol_to_amount')}
                onKeyDown={(e) => {
                  if (e.key !== 'Enter') return;
                  e.preventDefault();
                  addSpaceRef.current?.focus();
                }}
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
                ref={addSpaceRef}
                className={selectCls}
                value={form.add_space_between_amount_and_symbol}
                onChange={setField('add_space_between_amount_and_symbol')}
                onKeyDown={(e) => {
                  if (e.key !== 'Enter') return;
                  e.preventDefault();
                  wordAfterDecimalRef.current?.focus();
                }}
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
                ref={wordAfterDecimalRef}
                className={inputCls}
                value={form.word_representing_amount_after_decimal}
                onChange={setField('word_representing_amount_after_decimal')}
                placeholder="e.g. Paise"
                onKeyDown={(e) => {
                  if (e.key !== 'Enter') return;
                  e.preventDefault();
                  decimalPlacesWordsRef.current?.focus();
                }}
              />
            </FormRow>
            <FormRow
              label="No. of decimal places for amount in words"
              labelWidth="w-72"
              className="flex items-center min-h-[26px]"
            >
              <input
                ref={decimalPlacesWordsRef}
                className={inputCls}
                type="number"
                min="0"
                max="10"
                value={form.decimal_places_in_words}
                onChange={setField('decimal_places_in_words')}
                onKeyDown={(e) => {
                  if (e.key !== 'Enter') return;
                  e.preventDefault();
                  handleSubmit();
                }}
              />
            </FormRow>
          </div>
          <div className="flex-1" />
        </div>

        <RightActionPanel actions={currencyActions} />
      </div>

      <div className="border-t border-zinc-200 p-3 flex justify-between items-center bg-zinc-50">
        <button
          onClick={() => navigate('/master/create')}
          className="text-xs text-zinc-500 hover:text-zinc-800 transition-colors font-medium"
        >
          &larr; Back to Masters
        </button>
        <button
          onClick={handleSubmit}
          disabled={loading}
          className="text-sm px-6 py-1.5 rounded bg-black text-white hover:bg-zinc-800 disabled:opacity-50 transition-colors font-medium font-sans"
        >
          {loading ? 'Saving...' : 'Create'}
        </button>
      </div>
    </div>
  );
}
