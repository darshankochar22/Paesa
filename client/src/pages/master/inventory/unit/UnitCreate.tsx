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
import UnitDropdown from './UnitDropdown';
import type { UnitType } from '@/types/entities/Unit';
import { UqcPopup } from './UqcPopup';

const inputCls =
  'flex-1 bg-transparent text-sm outline-none px-1 py-0.5 border border-transparent hover:border-zinc-200 focus:border-zinc-800 transition-colors';
const selectCls =
  'bg-transparent text-sm outline-none px-1 py-0.5 border border-transparent cursor-pointer hover:border-zinc-200 focus:border-zinc-800 transition-colors';
const smallInputCls =
  'w-20 bg-transparent text-sm outline-none px-1 py-0.5 border border-transparent hover:border-zinc-200 focus:border-zinc-800 transition-colors text-center';

interface FormData {
  unit_type: 'Simple' | 'Compound';
  symbol: string;
  formal_name: string;
  uqc: string;
  decimal_places: string;
  first_unit_id: string;
  second_unit_id: string;
  conversion_factor: string;
}

const INITIAL: FormData = {
  unit_type: 'Simple',
  symbol: '',
  formal_name: '',
  uqc: 'Not Applicable',
  decimal_places: '0',
  first_unit_id: '',
  second_unit_id: '',
  conversion_factor: '',
};

export default function UnitCreate() {
  const navigate = useNavigate();
  const { selectedCompany } = useCompany();
  const companyId = selectedCompany?.company_id;
  const [form, setForm] = useState<FormData>(INITIAL);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [simpleUnits, setSimpleUnits] = useState<UnitType[]>([]);
  const [unitsLoading, setUnitsLoading] = useState(false);
  const [showUqc, setShowUqc] = useState(false);
  const uqcAnchorRef = useRef<HTMLButtonElement>(null);
  const symbolRef = useRef<HTMLInputElement>(null);
  const formalNameRef = useRef<HTMLInputElement>(null);
  const decimalRef = useRef<HTMLSelectElement>(null);

  useEffect(() => {
    if (!companyId) return;
    const fetchSimpleUnits = async () => {
      setUnitsLoading(true);
      try {
        let units: UnitType[] = [];
        if (typeof window.api.unit.getSimpleUnits === 'function') {
          const r = await window.api.unit.getSimpleUnits(companyId);
          if (r.success) units = r.units ?? [];
        }
        if (units.length === 0) {
          const r = await window.api.unit.getAll(companyId);
          if (r.success) {
            units = (r.units ?? []).filter((u) => u.unit_type === 'Simple' || !!u.is_simple);
          }
        }
        setSimpleUnits(units);
      } catch (e) {
        console.error('Failed to fetch simple units', e);
      } finally {
        setUnitsLoading(false);
      }
    };
    fetchSimpleUnits();
  }, [companyId]);

  const setField =
    (key: keyof FormData) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm((f) => ({ ...f, [key]: e.target.value }));

  const setUnitField = (key: keyof FormData) => (val: string) =>
    setForm((f) => ({ ...f, [key]: val }));

  const validate = (): string | null => {
    if (!selectedCompany?.company_id) return 'No company selected.';
    if (form.unit_type === 'Simple') {
      if (!form.symbol.trim()) return 'Symbol is required.';
    } else {
      if (!form.first_unit_id) return 'First unit is required.';
      if (!form.second_unit_id) return 'Second unit is required.';
      if (!form.conversion_factor.trim() || Number(form.conversion_factor) <= 0)
        return 'Conversion factor must be greater than 0.';
      if (form.first_unit_id === form.second_unit_id)
        return 'First and second unit cannot be the same.';
    }
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
      let result;
      if (form.unit_type === 'Compound') {
        result = await window.api.unit.create({
          company_id: selectedCompany!.company_id,
          unit_type: 'Compound',
          first_unit_id: Number(form.first_unit_id),
          second_unit_id: Number(form.second_unit_id),
          conversion_factor: Number(form.conversion_factor),
        });
      } else {
        result = await window.api.unit.create({
          company_id: selectedCompany!.company_id,
          name: form.symbol.trim(),
          symbol: form.symbol.trim(),
          formal_name: form.formal_name.trim() || form.symbol.trim(),
          unit_type: form.unit_type,
          decimal_places: Number(form.decimal_places) || 0,
          unit_quantity_code: form.uqc === 'Not Applicable' ? null : form.uqc || null,
        });
      }
      if (result.success) {
        setSuccess(`Unit "${result.unit.symbol}" created successfully.`);
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
        navigate('/master/alter/unit');
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [handleSubmit, navigate]);

  const unitActions = [
    { key: 'Alt+A', label: 'Accept', onClick: handleSubmit },
    { key: 'Alt+C', label: 'Alter Unit', onClick: () => navigate('/master/alter/unit') },
    { key: 'Esc', label: 'Quit', onClick: () => navigate('/master/create') },
  ];

  const isCompound = form.unit_type === 'Compound';

  return (
    <div className="flex-1 flex flex-col h-full bg-white select-none" data-enter-nav>
      <PageTitleBar title="Unit Creation" subtitle={selectedCompany?.name} />

      {error && (
        <NotificationBanner type="error" message={error} onDismiss={() => setError(null)} />
      )}
      {success && (
        <NotificationBanner type="success" message={success} onDismiss={() => setSuccess(null)} />
      )}

      <div className="flex-1 flex min-h-0">
        {/* Left: form fields */}
        <div className="flex-1 flex flex-col min-w-0 bg-white border-r border-zinc-100">
          <div className="p-3 space-y-1 max-w-2xl">
            <FormRow label="Type" labelWidth="w-56" className="flex items-center min-h-[26px]">
              <select className={selectCls} value={form.unit_type} onChange={setField('unit_type')}>
                <option value="Simple">Simple</option>
                <option value="Compound">Compound</option>
              </select>
            </FormRow>

            {!isCompound && (
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
                    placeholder="e.g. Kg"
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
                    placeholder="e.g. Kilogram"
                    onKeyDown={(e) => {
                      if (e.key !== 'Enter') return;
                      e.preventDefault();
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
                    className="flex-1 text-left text-sm px-1 py-0.5 border border-transparent hover:border-zinc-200 focus:border-zinc-800 outline-none transition-colors"
                    onClick={() => setShowUqc((v) => !v)}
                    onKeyDown={(e) => {
                      if (e.key !== 'Enter') return;
                      e.preventDefault();
                      setShowUqc(true);
                    }}
                  >
                    ◆ {form.uqc || 'Not Applicable'}
                  </button>
                  {showUqc && (
                    <UqcPopup
                      selected={form.uqc}
                      onSelect={(v) => {
                        setForm((f) => ({ ...f, uqc: v }));
                        setShowUqc(false);
                        setTimeout(() => decimalRef.current?.focus(), 0);
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
                    ref={decimalRef}
                    className={selectCls}
                    value={form.decimal_places}
                    onChange={setField('decimal_places')}
                    onKeyDown={(e) => {
                      if (e.key !== 'Enter') return;
                      e.preventDefault();
                      handleSubmit();
                    }}
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

            {isCompound && (
              <div className="mt-2 space-y-3">
                <div className="text-sm font-bold text-zinc-900">Units with Multiplier Factors</div>

                {unitsLoading ? (
                  <div className="text-xs text-zinc-400 py-2">Loading simple units…</div>
                ) : (
                  <div className="flex items-start gap-6 mt-1">
                    {/* First unit */}
                    <div className="flex flex-col gap-1">
                      <span className="text-xs text-zinc-700 italic font-medium">First unit</span>
                      <UnitDropdown
                        value={form.first_unit_id}
                        onChange={setUnitField('first_unit_id')}
                        units={simpleUnits}
                        onCreate={() => navigate('/master/create/unit')}
                        placeholder="Select…"
                      />
                    </div>

                    {/* Conversion */}
                    <div className="flex flex-col gap-1">
                      <span className="text-xs text-zinc-700 italic font-medium">Conversion</span>
                      <div className="flex items-center gap-1">
                        <span className="text-sm text-zinc-800">of</span>
                        <input
                          type="number"
                          min="1"
                          step="any"
                          className={smallInputCls}
                          value={form.conversion_factor}
                          onChange={setField('conversion_factor')}
                          placeholder=""
                        />
                      </div>
                    </div>

                    {/* Second unit */}
                    <div className="flex flex-col gap-1">
                      <span className="text-xs text-zinc-700 italic font-medium">Second unit</span>
                      <UnitDropdown
                        value={form.second_unit_id}
                        onChange={setUnitField('second_unit_id')}
                        units={simpleUnits}
                        onCreate={() => navigate('/master/create/unit')}
                        placeholder="Select…"
                      />
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
          <div className="flex-1" />
        </div>

        <RightActionPanel actions={unitActions} />
      </div>

      {/* Footer */}
      <MasterFormFooter
        onCancel={() => navigate('/master/create')}
        onSubmit={handleSubmit}
        loading={loading}
        disabled={isCompound && simpleUnits.length === 0}
      />
    </div>
  );
}
