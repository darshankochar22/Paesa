import { useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCompany } from '@/context/CompanyContext';
import { FormRow, PageTitleBar, MasterFormFooter, AlertBanner } from '@/components/ui';
import { useMasterShortcuts } from '@/hooks/useMasterShortcuts';
import { UqcPopup } from '../../inventory/unit/UqcPopup';
const inputCls =
  'flex-1 bg-transparent text-sm outline-none px-1.5 py-0.5 border border-transparent hover:border-zinc-200 focus:border-zinc-800 transition-colors bg-white/50 rounded';
const selectCls =
  'bg-transparent text-sm outline-none px-1.5 py-0.5 border border-transparent hover:border-zinc-200 focus:border-zinc-800 transition-colors bg-white/50 rounded';

interface FormData {
  unit_type: 'Simple' | 'Compound';
  symbol: string;
  formal_name: string;
  uqc: string;
  decimal_places: string;
  first_unit: string;
  conversion: string;
  second_unit: string;
}

const INITIAL: FormData = {
  unit_type: 'Simple',
  symbol: '',
  formal_name: '',
  uqc: 'Not Applicable',
  decimal_places: '0',
  first_unit: '',
  conversion: '',
  second_unit: '',
};

export default function PayrollUnitCreate() {
  const navigate = useNavigate();
  const { selectedCompany } = useCompany();
  const [form, setForm] = useState<FormData>(INITIAL);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showUqc, setShowUqc] = useState(false);
  const uqcAnchorRef = useRef<HTMLButtonElement>(null);
  const symbolRef = useRef<HTMLInputElement>(null);
  const formalNameRef = useRef<HTMLInputElement>(null);
  const firstUnitRef = useRef<HTMLInputElement>(null);
  const conversionRef = useRef<HTMLInputElement>(null);
  const secondUnitRef = useRef<HTMLInputElement>(null);

  const setField =
    (key: keyof FormData) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm((f) => ({ ...f, [key]: e.target.value }));

  const validate = (): string | null => {
    if (!selectedCompany?.company_id) return 'No company selected.';
    if (form.unit_type === 'Compound') {
      if (!form.first_unit.trim()) return 'First unit is required.';
      if (!form.second_unit.trim()) return 'Second unit is required.';
      if (!form.conversion.trim() || Number(form.conversion) <= 0)
        return 'Conversion must be greater than 0.';
    } else {
      if (!form.symbol.trim()) return 'Symbol is required.';
    }
    return null;
  };

  const handleSubmit = useCallback(async () => {
    const err = validate();
    if (err) {
      setError(err);
      return;
    }
    const isCompound = form.unit_type === 'Compound';
    // Tally derives a compound unit's symbol from its parts, e.g. "Box of 30 Pc".
    const derivedSymbol = isCompound
      ? `${form.first_unit.trim()} of ${form.conversion.trim()} ${form.second_unit.trim()}`
      : form.symbol.trim();
    setLoading(true);
    setError(null);
    try {
      const result = await window.api.payrollUnit.create({
        company_id: selectedCompany!.company_id,
        name: derivedSymbol,
        symbol: derivedSymbol,
        formal_name: isCompound ? undefined : form.formal_name.trim() || undefined,
        unit_type: form.unit_type,
        unit_quantity_code: isCompound
          ? null
          : form.uqc === 'Not Applicable'
            ? null
            : form.uqc || null,
        decimal_places: isCompound ? 0 : Number(form.decimal_places) || 0,
        first_unit: isCompound ? form.first_unit.trim() || undefined : undefined,
        conversion: isCompound ? Number(form.conversion) || undefined : undefined,
        second_unit: isCompound ? form.second_unit.trim() || undefined : undefined,
      });
      if (result.success) {
        setSuccess(`Payroll Unit "${derivedSymbol}" created.`);
        setForm(INITIAL);
        setTimeout(() => setSuccess(null), 3000);
      } else {
        setError(result.error || 'Failed to create unit.');
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unexpected error.');
    } finally {
      setLoading(false);
    }
  }, [form, selectedCompany]);

  useMasterShortcuts({
    onAccept: handleSubmit,
    onQuit: () => navigate('/master/create'),
  });

  return (
    <div className="flex-1 flex flex-col h-full bg-white select-none" data-enter-nav>
      <PageTitleBar title="Unit Creation" subtitle={selectedCompany?.name} />

      {error && <AlertBanner type="error" message={error} onDismiss={() => setError(null)} />}
      {success && (
        <AlertBanner type="success" message={success} onDismiss={() => setSuccess(null)} />
      )}

      <div className="flex-1 flex min-h-0">
        <div className="flex-1 flex flex-col min-w-0 bg-white border-r border-zinc-100">
          <div className="p-3 space-y-1 max-w-2xl">
            <FormRow label="Type" labelWidth="w-56" className="flex items-center min-h-[26px]">
              <select className={selectCls} value={form.unit_type} onChange={setField('unit_type')}>
                <option value="Simple">Simple</option>
                <option value="Compound">Compound</option>
              </select>
            </FormRow>
            {form.unit_type === 'Simple' && (
              <>
                <FormRow
                  label="Symbol"
                  required
                  labelWidth="w-56"
                  className="flex items-center min-h-[26px]"
                >
                  <input
                    autoFocus
                    ref={symbolRef}
                    className={inputCls}
                    value={form.symbol}
                    onChange={setField('symbol')}
                    placeholder="e.g. Days"
                    onKeyDown={(e) => {
                      if (e.key !== 'Enter') return;
                      e.preventDefault();
                      formalNameRef.current?.focus();
                    }}
                  />
                </FormRow>
                <FormRow
                  label="Formal Name"
                  labelWidth="w-56"
                  className="flex items-center min-h-[26px]"
                >
                  <input
                    ref={formalNameRef}
                    className={inputCls}
                    value={form.formal_name}
                    onChange={setField('formal_name')}
                    placeholder="e.g. Number of Days"
                    onKeyDown={(e) => {
                      if (e.key !== 'Enter') return;
                      e.preventDefault();
                      setShowUqc(true);
                      uqcAnchorRef.current?.focus();
                    }}
                  />
                </FormRow>
                <FormRow
                  label="Unit Quantity Code (UQC)"
                  labelWidth="w-56"
                  className="flex items-center min-h-[26px] relative"
                >
                  <button
                    ref={uqcAnchorRef}
                    type="button"
                    className="flex-1 text-left text-sm px-1 py-0.5 hover:bg-zinc-50 focus:bg-zinc-100 outline-none transition-colors"
                    onClick={() => setShowUqc((v) => !v)}
                  >
                    ◆ {form.uqc || 'Not Applicable'}
                  </button>
                  {showUqc && (
                    <UqcPopup
                      selected={form.uqc}
                      onSelect={(v) => {
                        setForm((f) => ({ ...f, uqc: v }));
                        setShowUqc(false);
                      }}
                      onClose={() => setShowUqc(false)}
                    />
                  )}
                </FormRow>
                <FormRow
                  label="Number of Decimal Places"
                  labelWidth="w-56"
                  className="flex items-center min-h-[26px]"
                >
                  <select
                    className={selectCls}
                    value={form.decimal_places}
                    onChange={setField('decimal_places')}
                  >
                    {[0, 1, 2, 3, 4].map((n) => (
                      <option key={n} value={n}>
                        {n}
                      </option>
                    ))}
                  </select>
                </FormRow>
              </>
            )}

            {form.unit_type === 'Compound' && (
              <div className="pt-2 mt-2 border-t border-zinc-100 space-y-1">
                <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-2">
                  Compound Unit
                </div>
                <FormRow
                  label="First Unit"
                  labelWidth="w-56"
                  className="flex items-center min-h-[26px]"
                >
                  <input
                    ref={firstUnitRef}
                    className={inputCls}
                    value={form.first_unit}
                    onChange={setField('first_unit')}
                    placeholder="e.g. Hours"
                    onKeyDown={(e) => {
                      if (e.key !== 'Enter') return;
                      e.preventDefault();
                      conversionRef.current?.focus();
                    }}
                  />
                </FormRow>
                <FormRow
                  label="Conversion"
                  labelWidth="w-56"
                  className="flex items-center min-h-[26px]"
                >
                  <input
                    ref={conversionRef}
                    className={inputCls}
                    value={form.conversion}
                    onChange={setField('conversion')}
                    type="number"
                    placeholder="e.g. 60"
                    onKeyDown={(e) => {
                      if (e.key !== 'Enter') return;
                      e.preventDefault();
                      secondUnitRef.current?.focus();
                    }}
                  />
                </FormRow>
                <FormRow
                  label="Second Unit"
                  labelWidth="w-56"
                  className="flex items-center min-h-[26px]"
                >
                  <input
                    ref={secondUnitRef}
                    className={inputCls}
                    value={form.second_unit}
                    onChange={setField('second_unit')}
                    placeholder="e.g. Minutes"
                  />
                </FormRow>
              </div>
            )}
          </div>
          <div className="flex-1" />
        </div>
      </div>

      <MasterFormFooter
        onCancel={() => navigate('/master/create')}
        onSubmit={handleSubmit}
        submitLabel="Create"
        loading={loading}
      />
    </div>
  );
}
