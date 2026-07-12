import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCompany } from '@/context/CompanyContext';
import { INDIAN_STATES } from '@/constants/states';
import {
  FormRow,
  PageTitleBar,
  RightActionPanel,
  SearchInput,
  DataTable,
  NotificationBanner,
} from '@/components/ui';
import RightPanel from '@/components/RightPanel.tsx';
import type { TaxUnitType } from '@/types/entities';
import { ExciseDetailsPopup, EMPTY_TARIFF, type Tariff } from './exciseDetailsPopups';

const activeClass =
  'bg-zinc-100 border-zinc-800 text-zinc-950 px-2 py-0.5 outline-none border w-64 font-mono font-bold text-xs uppercase';
const inactiveClass =
  'border-transparent bg-transparent text-zinc-900 px-2 py-0.5 outline-none border hover:border-zinc-200 w-64 font-mono font-bold text-xs uppercase';
const getSelectCls = (isActive: boolean) => `${isActive ? activeClass : inactiveClass}`;
const getInputCls = (isActive: boolean) => `${isActive ? activeClass : inactiveClass}`;

const FIELDS = [
  'name',
  'alias',
  'addressLine1',
  'state',
  'pincode',
  'telephone',
  'registeredFor',
  'setAlterExciseDetails',
];

// "Registered for" — the statutory registration the tax unit is created under.
const REGISTERED_FOR_OPTIONS = ['Excise'];

export default function TaxAlter() {
  const navigate = useNavigate();
  const { selectedCompany } = useCompany();
  const companyId = selectedCompany?.company_id;

  const [taxUnitsList, setTaxUnitsList] = useState<TaxUnitType[]>([]);
  const [selectedTaxUnit, setSelectedTaxUnit] = useState<TaxUnitType | null>(null);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: '',
    alias: '',
    addressLine1: '',
    addressLine2: '',
    addressLine3: '',
    addressLine4: '',
    state: '',
    pincode: '',
    telephone: '',
    setAlterExciseDetails: false,
  });

  // Excise sub-details
  const [registeredFor, setRegisteredFor] = useState('Excise');
  const [registrationType, setRegistrationType] = useState('Importer');
  const [typeOfManufacturer, setTypeOfManufacturer] = useState('Regular');
  const [eccNumber, setEccNumber] = useState('');
  const [setAlterTariff, setSetAlterTariff] = useState(false);
  const [tariff, setTariff] = useState<Tariff>({ ...EMPTY_TARIFF });
  const [setAlterRule11, setSetAlterRule11] = useState(false);
  const [rule11Book, setRule11Book] = useState('');

  const [showExcisePopup, setShowExcisePopup] = useState(false);

  const [activeField, setActiveField] = useState('name');
  const [showAccept, setShowAccept] = useState(false);

  const nameRef = useRef<HTMLInputElement>(null);
  const aliasRef = useRef<HTMLInputElement>(null);
  const addressLine1Ref = useRef<HTMLInputElement>(null);
  const addressLine2Ref = useRef<HTMLInputElement>(null);
  const addressLine3Ref = useRef<HTMLInputElement>(null);
  const addressLine4Ref = useRef<HTMLInputElement>(null);
  const stateRef = useRef<HTMLSelectElement>(null);
  const pincodeRef = useRef<HTMLInputElement>(null);
  const telephoneRef = useRef<HTMLInputElement>(null);
  const registeredForRef = useRef<HTMLSelectElement>(null);
  const setAlterExciseDetailsRef = useRef<HTMLSelectElement>(null);

  const fetchTaxUnits = async () => {
    if (!companyId) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const res = await window.api.taxUnits.getAll(companyId);
      if (res.success) {
        setTaxUnitsList(res.taxUnits || []);
      } else {
        setError(res.error || 'Failed to load tax units');
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to load tax units');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTaxUnits();
  }, [companyId]);

  const set = (field: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const handleExciseToggle = (val: boolean) => {
    setForm((prev) => ({ ...prev, setAlterExciseDetails: val }));
    if (val) setShowExcisePopup(true);
  };

  const handleSelect = (unit: TaxUnitType) => {
    setSelectedTaxUnit(unit);
    setForm({
      name: unit.name || '',
      alias: unit.alias || '',
      addressLine1: unit.address_line1 || '',
      addressLine2: unit.address_line2 || '',
      addressLine3: unit.address_line3 || '',
      addressLine4: unit.address_line4 || '',
      state: unit.state || '',
      pincode: unit.pincode || '',
      telephone: unit.telephone || '',
      setAlterExciseDetails: !!unit.set_alter_excise_details,
    });
    setRegisteredFor(unit.registered_for || 'Excise');
    setRegistrationType(unit.registration_type || 'Importer');
    setTypeOfManufacturer(unit.type_of_manufacturer || 'Regular');
    setEccNumber(unit.ecc_number || '');
    setSetAlterTariff(!!unit.set_alter_excise_tariff);
    setTariff({
      name: unit.tariff_name || '',
      hsn: unit.hsn_code || '',
      uom: unit.reporting_uom || 'Undefined',
      valuationType: unit.valuation_type || 'Undefined',
      rate: unit.tariff_rate != null ? String(unit.tariff_rate) : '',
      ratePerUnit: unit.tariff_rate_per_unit != null ? String(unit.tariff_rate_per_unit) : '',
    });
    setSetAlterRule11(!!unit.set_alter_rule11_book);
    setRule11Book(unit.rule11_book || '');
    setError(null);
    setSuccess(null);
    setActiveField('name');
    setShowAccept(false);
  };

  const handleBack = () => {
    setSelectedTaxUnit(null);
    setError(null);
    setSuccess(null);
    fetchTaxUnits();
  };

  const handleSave = async () => {
    if (!selectedTaxUnit || !selectedTaxUnit.tax_unit_id) return;
    if (!form.name.trim()) {
      setError('Name is required');
      return;
    }

    setSaving(true);
    setError(null);

    const payload: TaxUnitType & { tax_unit_id: number } = {
      tax_unit_id: selectedTaxUnit.tax_unit_id,
      company_id: companyId!,
      name: form.name,
      alias: form.alias || null,
      address_line1: form.addressLine1 || null,
      address_line2: form.addressLine2 || null,
      address_line3: form.addressLine3 || null,
      address_line4: form.addressLine4 || null,
      state: form.state || null,
      pincode: form.pincode || null,
      telephone: form.telephone || null,
      registered_for: registeredFor || 'Excise',
      set_alter_excise_details: form.setAlterExciseDetails ? 1 : 0,
      registration_type: registrationType,
      type_of_manufacturer: registrationType === 'Manufacturer' ? typeOfManufacturer : null,
      ecc_number: eccNumber || null,
      set_alter_excise_tariff: setAlterTariff ? 1 : 0,
      tariff_name: setAlterTariff ? tariff.name || null : null,
      hsn_code: setAlterTariff ? tariff.hsn || null : null,
      reporting_uom: setAlterTariff ? tariff.uom || null : null,
      valuation_type: setAlterTariff ? tariff.valuationType || null : null,
      tariff_rate: setAlterTariff ? Number(tariff.rate) || 0 : 0,
      tariff_rate_per_unit: setAlterTariff ? Number(tariff.ratePerUnit) || 0 : 0,
      set_alter_rule11_book: setAlterRule11 ? 1 : 0,
      rule11_book: setAlterRule11 ? rule11Book || null : null,
    };

    try {
      const result = await window.api.taxUnits.update(payload);

      if (result.success) {
        setSuccess('Tax unit updated successfully!');
        setTimeout(() => {
          handleBack();
        }, 1000);
      } else {
        setError(result.error || 'Failed to update tax unit');
      }
    } catch (err: any) {
      setError(err?.message || 'Something went wrong');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedTaxUnit || !selectedTaxUnit.tax_unit_id) return;
    if (!confirm('Are you sure you want to delete this tax unit?')) return;

    setSaving(true);
    setError(null);

    try {
      const result = await window.api.taxUnits.delete(selectedTaxUnit.tax_unit_id);
      if (result.success) {
        setSuccess('Tax unit deleted successfully!');
        setTimeout(() => {
          handleBack();
        }, 1000);
      } else {
        setError(result.error || 'Failed to delete tax unit');
      }
    } catch (err: any) {
      setError(err?.message || 'Something went wrong');
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    if (showExcisePopup) return;

    if (showAccept) {
      const handler = (e: KeyboardEvent) => {
        const key = e.key.toLowerCase();
        if (key === 'y' || e.key === 'Enter') {
          e.preventDefault();
          setShowAccept(false);
          handleSave();
        } else if (key === 'n' || e.key === 'Escape') {
          e.preventDefault();
          setShowAccept(false);
        }
      };
      window.addEventListener('keydown', handler);
      return () => window.removeEventListener('keydown', handler);
    }

    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        if (selectedTaxUnit) {
          handleBack();
        } else {
          navigate('/master/alter');
        }
        return;
      }

      if (selectedTaxUnit) {
        if ((e.altKey || e.ctrlKey) && e.key.toLowerCase() === 'a') {
          e.preventDefault();
          setShowAccept(true);
          return;
        }
        if (e.altKey && e.key.toLowerCase() === 'd') {
          e.preventDefault();
          handleDelete();
          return;
        }

        // Traversal
        const idx = FIELDS.indexOf(activeField);
        if (idx !== -1) {
          if (e.key === 'Enter' || e.key === 'ArrowDown' || (e.key === 'Tab' && !e.shiftKey)) {
            e.preventDefault();
            if (idx === FIELDS.length - 1) {
              setShowAccept(true);
            } else {
              setActiveField(FIELDS[idx + 1]);
            }
            return;
          }
          if (e.key === 'ArrowUp' || (e.key === 'Tab' && e.shiftKey)) {
            e.preventDefault();
            if (idx > 0) {
              setActiveField(FIELDS[idx - 1]);
            }
            return;
          }

          // Y/N shortcut for yes/no field
          if (activeField === 'setAlterExciseDetails') {
            const key = e.key.toLowerCase();
            if (key === 'y' || key === 'n') {
              e.preventDefault();
              const val = key === 'y';
              handleExciseToggle(val);
              if (!val) {
                setShowAccept(true);
              }
            }
          }
        }
      } else {
        if (e.altKey && e.key.toLowerCase() === 'c') {
          e.preventDefault();
          navigate('/master/create/tax-units');
        }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [
    selectedTaxUnit,
    handleSave,
    handleDelete,
    handleBack,
    activeField,
    showExcisePopup,
    showAccept,
    navigate,
  ]);

  useEffect(() => {
    if (!selectedTaxUnit) return;
    if (showExcisePopup) return;
    const refMap: Record<string, React.RefObject<HTMLInputElement | HTMLSelectElement | null>> = {
      name: nameRef,
      alias: aliasRef,
      addressLine1: addressLine1Ref,
      addressLine2: addressLine2Ref,
      addressLine3: addressLine3Ref,
      addressLine4: addressLine4Ref,
      state: stateRef,
      pincode: pincodeRef,
      telephone: telephoneRef,
      registeredFor: registeredForRef,
      setAlterExciseDetails: setAlterExciseDetailsRef,
    };
    refMap[activeField]?.current?.focus();
  }, [activeField, showExcisePopup, selectedTaxUnit]);

  // If in selection mode
  if (!selectedTaxUnit) {
    const filteredList = taxUnitsList.filter(
      (t) =>
        t.name.toLowerCase().includes(search.toLowerCase()) ||
        (t.alias && t.alias.toLowerCase().includes(search.toLowerCase())) ||
        (t.ecc_number && t.ecc_number.toLowerCase().includes(search.toLowerCase())),
    );

    const columns = [
      {
        key: 'name',
        label: 'Tax Unit Name',
        span: 'col-span-5',
        render: (r: TaxUnitType) => (
          <span className="font-bold text-zinc-950 uppercase">{r.name}</span>
        ),
      },
      {
        key: 'alias',
        label: 'Alias',
        span: 'col-span-3',
        render: (r: TaxUnitType) => (
          <span className="text-zinc-500 font-semibold">{r.alias || '—'}</span>
        ),
      },
      {
        key: 'registration_type',
        label: 'Reg Type',
        span: 'col-span-2',
        render: (r: TaxUnitType) => (
          <span className="text-zinc-500 uppercase">{r.registration_type || '—'}</span>
        ),
      },
      {
        key: 'ecc_number',
        label: 'ECC Number',
        span: 'col-span-2',
        render: (r: TaxUnitType) => (
          <span className="text-zinc-700 font-bold uppercase">{r.ecc_number || '—'}</span>
        ),
      },
    ];

    const actions = [
      {
        key: 'Alt+C',
        label: 'Create Tax Unit',
        onClick: () => navigate('/master/create/tax-units'),
      },
      { key: 'Esc', label: 'Quit', onClick: () => navigate('/master/alter') },
    ];

    return (
      <div className="flex flex-col h-screen w-screen bg-white select-none font-mono text-[11px] text-zinc-950">
        <PageTitleBar title="Alter Tax Unit" subtitle="Select Tax Unit to Alter" />
        <div className="p-3 bg-zinc-50 border-b border-zinc-200 shrink-0">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Search tax units by name, alias, or ECC number…"
            autoFocus
          />
        </div>
        <div className="flex-1 flex min-h-0">
          <div className="flex-1 flex flex-col bg-white border-r border-zinc-300">
            {error && (
              <NotificationBanner type="error" message={error} onDismiss={() => setError(null)} />
            )}
            <DataTable
              columns={columns}
              rows={filteredList}
              rowKey={(r: TaxUnitType) => String(r.tax_unit_id)}
              onRowClick={handleSelect}
              loading={loading}
              emptyMessage="No Tax Units found."
            />
          </div>
          <RightActionPanel actions={actions} />
        </div>
        <div className="border-t border-zinc-200 p-3 flex justify-end bg-zinc-50 font-sans">
          <button
            onClick={() => navigate('/master/alter')}
            className="text-xs px-4 py-1.5 rounded border border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50 shadow-sm"
          >
            Quit
          </button>
        </div>
      </div>
    );
  }

  // If in edit mode
  const alterActions = [
    { key: 'Alt+A', label: 'Accept', onClick: () => setShowAccept(true) },
    { key: 'Alt+D', label: 'Delete', onClick: handleDelete },
    { key: 'Esc', label: 'Quit', onClick: handleBack },
  ];

  return (
    <div
      className="flex flex-col h-screen w-screen bg-zinc-100 font-mono text-[11px] select-none text-zinc-950 relative"
      data-enter-nav
    >
      <PageTitleBar title="Tax Unit Alteration" subtitle={selectedTaxUnit.name} />

      <div className="flex flex-1 min-h-0">
        <div className="flex-1 bg-white border-r border-zinc-300 flex flex-col overflow-y-auto">
          {/* Self-managed Tally-style field walk (window keydown + activeField):
              keep the global enter-nav out of this zone. */}
          <div className="p-6 space-y-1.5 flex-1 max-w-2xl" data-enter-nav-ignore>
            {error && (
              <NotificationBanner type="error" message={error} onDismiss={() => setError(null)} />
            )}
            {success && (
              <NotificationBanner
                type="success"
                message={success}
                onDismiss={() => setSuccess(null)}
              />
            )}

            <FormRow label="Name" labelWidth="w-56">
              <input
                ref={nameRef}
                className={getInputCls(activeField === 'name')}
                value={form.name}
                onChange={set('name')}
                onFocus={() => setActiveField('name')}
              />
            </FormRow>

            <FormRow label="(alias)" labelWidth="w-56">
              <input
                ref={aliasRef}
                className={getInputCls(activeField === 'alias')}
                value={form.alias}
                onChange={set('alias')}
                onFocus={() => setActiveField('alias')}
              />
            </FormRow>

            <div className="py-2" />

            {/* Address — single line, on the same row as its label */}
            <FormRow label="Address" labelWidth="w-56">
              <input
                ref={addressLine1Ref}
                className={`${getInputCls(activeField === 'addressLine1')} normal-case`}
                value={form.addressLine1}
                onChange={set('addressLine1')}
                onFocus={() => setActiveField('addressLine1')}
              />
            </FormRow>

            <div className="py-2" />

            <FormRow label="State" labelWidth="w-56">
              <select
                ref={stateRef}
                className={getSelectCls(activeField === 'state')}
                value={form.state}
                onChange={(e) => setForm((prev) => ({ ...prev, state: e.target.value }))}
                onFocus={() => setActiveField('state')}
              >
                <option value="">Not Applicable</option>
                {INDIAN_STATES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </FormRow>

            <FormRow label="Pincode" labelWidth="w-56">
              <input
                ref={pincodeRef}
                className={getInputCls(activeField === 'pincode')}
                value={form.pincode}
                onChange={set('pincode')}
                onFocus={() => setActiveField('pincode')}
              />
            </FormRow>

            <FormRow label="Telephone" labelWidth="w-56">
              <input
                ref={telephoneRef}
                className={getInputCls(activeField === 'telephone')}
                value={form.telephone}
                onChange={set('telephone')}
                onFocus={() => setActiveField('telephone')}
              />
            </FormRow>

            <div className="py-2" />

            <FormRow label="Registered for" labelWidth="w-56">
              <select
                ref={registeredForRef}
                className={getSelectCls(activeField === 'registeredFor')}
                value={registeredFor}
                onChange={(e) => setRegisteredFor(e.target.value)}
                onFocus={() => setActiveField('registeredFor')}
              >
                {REGISTERED_FOR_OPTIONS.map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </select>
            </FormRow>

            <div className="py-2" />

            <FormRow label="Set/alter excise details" labelWidth="w-56">
              <select
                ref={setAlterExciseDetailsRef}
                className={getSelectCls(activeField === 'setAlterExciseDetails')}
                value={form.setAlterExciseDetails ? 'Yes' : 'No'}
                onChange={(e) => handleExciseToggle(e.target.value === 'Yes')}
                onFocus={() => setActiveField('setAlterExciseDetails')}
              >
                <option value="No">No</option>
                <option value="Yes">Yes</option>
              </select>
            </FormRow>
          </div>

          <div className="border-t border-zinc-200 flex text-xs shrink-0 font-sans">
            <button
              onClick={handleDelete}
              disabled={saving}
              className="py-2 px-4 text-center hover:bg-red-50 text-red-600 border-r border-zinc-200 disabled:opacity-50"
            >
              Delete
            </button>
            <div className="flex-1" />
            <button
              onClick={handleBack}
              disabled={saving}
              className="py-2 px-4 text-center hover:bg-zinc-100 border-l border-r border-zinc-200 disabled:opacity-50"
            >
              Quit (Esc)
            </button>
            <button
              onClick={() => setShowAccept(true)}
              disabled={saving}
              className="py-2 px-6 text-center hover:bg-zinc-100 disabled:opacity-50 font-bold"
            >
              Accept (Alt+A)
            </button>
          </div>
        </div>

        <div className="w-64 flex-shrink-0 bg-zinc-50 border-l border-zinc-300 flex flex-col font-sans">
          <RightPanel />
          <RightActionPanel actions={alterActions} />
        </div>
      </div>

      {showExcisePopup && (
        <ExciseDetailsPopup
          companyId={companyId}
          unitName={form.name}
          registrationType={registrationType}
          setRegistrationType={setRegistrationType}
          typeOfManufacturer={typeOfManufacturer}
          setTypeOfManufacturer={setTypeOfManufacturer}
          eccNumber={eccNumber}
          setEccNumber={setEccNumber}
          setAlterTariff={setAlterTariff}
          setSetAlterTariff={setSetAlterTariff}
          tariff={tariff}
          setTariff={setTariff}
          setAlterRule11={setAlterRule11}
          setSetAlterRule11={setSetAlterRule11}
          rule11Book={rule11Book}
          setRule11Book={setRule11Book}
          onClose={() => setShowExcisePopup(false)}
        />
      )}

      {showAccept && (
        <div
          className="absolute bottom-16 right-72 bg-white border border-zinc-800 w-[165px] shadow-2xl p-3 flex flex-col items-center z-[10000] font-mono text-zinc-950"
          data-enter-nav-ignore
        >
          <h4 className="font-bold text-[11px] mb-3">Accept?</h4>
          <div className="flex items-center gap-3 w-full justify-center">
            <button
              onClick={() => {
                setShowAccept(false);
                handleSave();
              }}
              disabled={saving}
              className="text-[11px] px-3 py-0.5 border border-zinc-300 hover:bg-zinc-100 text-zinc-800 font-bold focus:outline-none min-w-[55px] text-center disabled:opacity-50 transition-colors cursor-pointer"
            >
              Yes
            </button>
            <button
              onClick={() => setShowAccept(false)}
              className="text-[11px] px-3 py-0.5 border border-zinc-300 hover:bg-zinc-100 text-zinc-800 font-bold focus:outline-none min-w-[55px] text-center transition-colors cursor-pointer"
            >
              No
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
