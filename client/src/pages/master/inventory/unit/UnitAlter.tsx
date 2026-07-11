import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useCompany } from '@/context/CompanyContext';
import { FormRow, PageTitleBar, RightActionPanel, SearchInput, DataTable } from '@/components/ui';
import UnitDropdown from './UnitDropdown';
import type { UnitType } from '@/types/entities/Unit';
import { UqcPopup } from './UqcPopup';

const inputCls =
  'w-full bg-transparent text-sm outline-none py-0.5 px-1 rounded-sm placeholder:text-zinc-400 focus:bg-zinc-100 hover:bg-zinc-50 focus:border-zinc-300 transition-colors';
const selectCls =
  'w-full bg-transparent text-sm outline-none py-0.5 px-1 rounded-sm cursor-pointer focus:bg-zinc-100 hover:bg-zinc-50 focus:border-zinc-300 transition-colors';
const smallInputCls =
  'w-20 bg-transparent text-sm outline-none px-1 py-0.5 border border-transparent focus:bg-zinc-100 hover:bg-zinc-50 focus:border-zinc-300 transition-colors text-center';

function SelectionPanel({
  units,
  onSelect,
  onCancel,
  onCreate,
}: {
  units: UnitType[];
  onSelect: (u: UnitType) => void;
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

  const filtered = units.filter(
    (u) =>
      u.symbol.toLowerCase().includes(search.toLowerCase()) ||
      (u.formal_name && u.formal_name.toLowerCase().includes(search.toLowerCase())),
  );

  const columns = [
    {
      key: 'symbol',
      label: 'Symbol',
      span: 'col-span-4',
      render: (r: UnitType) => (
        <span className="font-bold text-zinc-950 uppercase">{r.symbol}</span>
      ),
    },
    {
      key: 'formal_name',
      label: 'Formal Name',
      span: 'col-span-5',
      render: (r: UnitType) => <span className="text-zinc-600">{r.formal_name || '—'}</span>,
    },
    {
      key: 'unit_type',
      label: 'Type',
      span: 'col-span-3',
      render: (r: UnitType) => (
        <span className="text-zinc-400 uppercase text-[10px]">{r.unit_type || 'Simple'}</span>
      ),
    },
  ];

  const selectionActions = [
    { key: 'Alt+C', label: 'Create Unit', onClick: onCreate },
    { key: 'Esc', label: 'Quit', onClick: onCancel },
  ];

  return (
    <div className="flex-1 flex flex-col h-full bg-white select-none">
      <PageTitleBar title="Alter Unit" subtitle="Select Unit to Alter" />

      <div className="p-3 bg-zinc-50 border-b border-zinc-200 shrink-0">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search units by symbol or name…"
          autoFocus
        />
      </div>

      <div className="flex-1 flex min-h-0">
        <div className="flex-1 flex flex-col bg-white border-r border-zinc-100">
          <DataTable
            columns={columns}
            rows={filtered}
            rowKey={(r: UnitType) => r.unit_id!}
            onRowClick={onSelect}
            emptyMessage="No units found."
          />
        </div>
        <RightActionPanel actions={selectionActions} />
      </div>

      <div className="border-t border-zinc-200 p-3 flex justify-end bg-zinc-50">
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
  unit_type: 'Simple' | 'Compound';
  symbol: string;
  formal_name: string;
  decimal_places: string;
  unit_quantity_code: string;
  first_unit_id: string;
  second_unit_id: string;
  conversion_factor: string;
}

export default function UnitAlter() {
  const navigate = useNavigate();
  const location = useLocation();
  const { selectedCompany } = useCompany();

  const [units, setUnits] = useState<UnitType[]>([]);
  const [simpleUnits, setSimpleUnits] = useState<UnitType[]>([]);
  const [selectedUnit, setSelectedUnit] = useState<UnitType | null>(null);
  const [form, setForm] = useState<FormData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showUqc, setShowUqc] = useState(false);
  const uqcAnchorRef = useRef<HTMLButtonElement>(null);

  const fetchUnitsList = useCallback(async () => {
    const company_id = selectedCompany?.company_id;
    if (!company_id) return;
    try {
      const [allR] = await Promise.all([window.api.unit.getAll(company_id)]);
      if (allR.success) {
        const allUnits = allR.units ?? [];
        setUnits(allUnits);
        // Filter simple units from all units as fallback
        setSimpleUnits(allUnits.filter((u) => u.unit_type === 'Simple' || !!u.is_simple));
      }
      // Try dedicated endpoint if available (more efficient)
      try {
        if (typeof window.api.unit.getSimpleUnits === 'function') {
          const simpleR = await window.api.unit.getSimpleUnits(company_id);
          if (simpleR.success && (simpleR.units ?? []).length > 0) {
            setSimpleUnits(simpleR.units);
          }
        }
      } catch (_) {
        /* ignore */
      }
    } catch (err) {
      console.error(err);
    }
  }, [selectedCompany]);

  useEffect(() => {
    fetchUnitsList();
  }, [fetchUnitsList]);

  const handleSelectUnit = useCallback((u: UnitType) => {
    setSelectedUnit(u);
    setForm({
      unit_type: (u.unit_type as 'Simple' | 'Compound') || 'Simple',
      symbol: u.symbol ?? '',
      formal_name: u.formal_name ?? '',
      decimal_places: String(u.decimal_places ?? 0),
      unit_quantity_code: u.unit_quantity_code ?? '',
      first_unit_id: u.first_unit_id ? String(u.first_unit_id) : '',
      second_unit_id: u.second_unit_id ? String(u.second_unit_id) : '',
      conversion_factor: u.conversion_factor ? String(u.conversion_factor) : '',
    });
    setError(null);
    setSuccess(null);
  }, []);

  // Pre-load from navigation state if unitId is present
  useEffect(() => {
    const passedUnitId = location.state?.unitId;
    if (passedUnitId && units.length > 0) {
      const match = units.find((u) => u.unit_id === passedUnitId);
      if (match) {
        handleSelectUnit(match);
      }
    }
  }, [location.state, units, handleSelectUnit]);

  const set =
    (key: keyof FormData) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm((f) => (f ? { ...f, [key]: e.target.value } : f));

  const setUnitField = (key: keyof FormData) => (val: string) =>
    setForm((f) => (f ? { ...f, [key]: val } : f));

  const validate = (): string | null => {
    if (!form) return 'No form data.';
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

  const handleBack = useCallback(() => {
    setSelectedUnit(null);
    setForm(null);
    if (location.state?.unitId) {
      navigate('/master/coa/unit');
    }
  }, [location.state, navigate]);

  const handleSubmit = useCallback(async () => {
    if (!form || !selectedUnit) return;
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const isCompound = form.unit_type === 'Compound';
      const result = await window.api.unit.update({
        unit_id: selectedUnit.unit_id,
        company_id: selectedCompany!.company_id,
        name: form.symbol.trim(),
        symbol: form.symbol.trim(),
        formal_name: form.formal_name.trim() || form.symbol.trim(),
        unit_type: form.unit_type,
        decimal_places: Number(form.decimal_places) || 0,
        unit_quantity_code: form.unit_quantity_code.trim() || null,
        first_unit_id: isCompound ? Number(form.first_unit_id) : null,
        second_unit_id: isCompound ? Number(form.second_unit_id) : null,
        conversion_factor: isCompound ? Number(form.conversion_factor) : null,
      });

      if (result.success) {
        await fetchUnitsList();
        setSuccess(`Unit "${form.symbol}" updated successfully.`);
        setTimeout(() => {
          setSuccess(null);
          handleBack();
        }, 1500);
      } else {
        setError(result.error || 'Failed to update unit.');
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unexpected error.');
    } finally {
      setLoading(false);
    }
  }, [form, selectedUnit, selectedCompany, fetchUnitsList, handleBack]);

  const handleDelete = useCallback(async () => {
    if (!selectedUnit) return;
    if (!window.confirm(`Delete unit "${selectedUnit.symbol}"? This cannot be undone.`)) return;

    setLoading(true);
    setError(null);
    try {
      const result = await window.api.unit.delete(selectedUnit.unit_id!);
      if (result.success) {
        await fetchUnitsList();
        handleBack();
      } else {
        setError(result.error || 'Failed to delete unit.');
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unexpected error.');
    } finally {
      setLoading(false);
    }
  }, [selectedUnit, fetchUnitsList, handleBack]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        if (selectedUnit) {
          handleBack();
        } else {
          if (location.state?.unitId) {
            navigate('/master/coa/unit');
          } else {
            navigate('/master/alter');
          }
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
  }, [handleSubmit, handleDelete, handleBack, selectedUnit, location.state, navigate]);

  const handleCancelSelection = () => {
    if (location.state?.unitId) {
      navigate('/master/coa/unit');
    } else {
      navigate('/master/alter');
    }
  };

  if (!selectedUnit || !form) {
    return (
      <SelectionPanel
        units={units.filter((u) => !u.is_predefined)}
        onSelect={handleSelectUnit}
        onCancel={handleCancelSelection}
        onCreate={() => navigate('/master/create/unit')}
      />
    );
  }

  const alterActions = [
    { key: 'Alt+A', label: 'Accept', onClick: handleSubmit },
    { key: 'Alt+D', label: 'Delete', onClick: handleDelete },
    { key: 'Esc', label: 'Back', onClick: handleBack },
  ];

  const isCompound = form.unit_type === 'Compound';

  return (
    <div
      className="flex flex-col h-full relative overflow-hidden bg-white select-none"
      data-enter-nav
    >
      <PageTitleBar
        title={`Unit Alteration: ${selectedUnit.symbol}`}
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

      <div className="flex-1 flex min-h-0">
        <div className="flex-1 overflow-y-auto p-3 space-y-4 max-w-2xl bg-white border-r border-zinc-100">
          <div>
            <div className="text-xs uppercase tracking-widest text-zinc-400 font-bold mb-2 font-sans select-none">
              Unit Details
            </div>

            <FormRow label="Type" labelWidth="w-56" className="flex items-center min-h-[26px]">
              <select className={selectCls} value={form.unit_type} onChange={set('unit_type')}>
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
                    className={inputCls}
                    value={form.symbol}
                    onChange={set('symbol')}
                    placeholder="e.g. Kg"
                  />
                </FormRow>

                <FormRow
                  label="Formal Name"
                  labelWidth="w-56"
                  className="flex items-center min-h-[26px]"
                >
                  <input
                    className={inputCls}
                    value={form.formal_name}
                    onChange={set('formal_name')}
                    placeholder="e.g. Kilogram"
                  />
                </FormRow>

                <FormRow
                  label="Number of Decimal Places"
                  labelWidth="w-56"
                  className="flex items-center min-h-[26px]"
                >
                  <select
                    className={selectCls}
                    value={form.decimal_places}
                    onChange={set('decimal_places')}
                  >
                    {[0, 1, 2, 3, 4].map((n) => (
                      <option key={n} value={n}>
                        {n}
                      </option>
                    ))}
                  </select>
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
                    ◆ {form.unit_quantity_code || 'Not Applicable'}
                  </button>
                  {showUqc && (
                    <UqcPopup
                      selected={form.unit_quantity_code || 'Not Applicable'}
                      onSelect={(v) => {
                        setForm((f) =>
                          f ? { ...f, unit_quantity_code: v === 'Not Applicable' ? '' : v } : f,
                        );
                        setShowUqc(false);
                        setTimeout(() => uqcAnchorRef.current?.focus(), 0);
                      }}
                      onClose={() => setShowUqc(false)}
                    />
                  )}
                </FormRow>
              </>
            )}

            {isCompound && (
              <div className="mt-2 space-y-3">
                <div className="text-sm font-bold text-zinc-900">Units with Multiplier Factors</div>

                {simpleUnits.length === 0 ? (
                  <div className="text-xs text-zinc-500 py-2">
                    No simple units found.{' '}
                    <button
                      onClick={() => navigate('/master/create/unit')}
                      className="underline hover:text-black font-medium"
                    >
                      Create a simple unit first
                    </button>
                  </div>
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
                          onChange={set('conversion_factor')}
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
        </div>

        <RightActionPanel actions={alterActions} />
      </div>

      <div className="px-3 py-3 border-t border-zinc-200 flex justify-between items-center bg-zinc-50 shrink-0">
        <button
          onClick={handleDelete}
          disabled={loading}
          className="text-xs px-4 py-1.5 rounded border border-red-200 text-red-500 hover:bg-red-50 hover:border-red-300 disabled:opacity-50 transition-colors font-medium shadow-sm"
        >
          Delete
        </button>
        <div className="flex gap-3">
          <button
            onClick={handleBack}
            className="text-xs px-4 py-1.5 rounded border border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50 shadow-sm transition-colors"
          >
            Back
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading || (isCompound && simpleUnits.length === 0)}
            className="text-xs px-5 py-1.5 rounded bg-black text-white hover:bg-zinc-800 disabled:opacity-50 shadow-sm transition-colors font-medium"
          >
            {loading ? 'Saving…' : 'Accept'}
          </button>
        </div>
      </div>
    </div>
  );
}
