import { useState, useEffect } from 'react';
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
  MasterFormFooter,
} from '@/components/ui';
import type { TaxUnitType } from '@/types/entities';
import { ExciseDetailsPopup, EMPTY_TARIFF, type Tariff } from './exciseDetailsPopups';

const inputCls =
  'flex-1 bg-transparent text-sm outline-none px-1 py-0.5 border border-transparent hover:border-zinc-200 focus:border-zinc-800 transition-colors';
const selectCls =
  'bg-transparent text-sm outline-none px-1 py-0.5 border border-transparent cursor-pointer hover:border-zinc-200 focus:border-zinc-800 transition-colors';

const rowCls = 'flex items-center min-h-[26px]';
const LABEL_W = 'w-56';

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
        setTimeout(() => handleBack(), 1000);
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
        setTimeout(() => handleBack(), 1000);
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
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        if (selectedTaxUnit) handleBack();
        else navigate('/master/alter');
        return;
      }
      if (selectedTaxUnit) {
        if ((e.altKey || e.ctrlKey) && e.key.toLowerCase() === 'a') {
          e.preventDefault();
          handleSave();
        }
        if (e.altKey && e.key.toLowerCase() === 'd') {
          e.preventDefault();
          handleDelete();
        }
      } else if (e.altKey && e.key.toLowerCase() === 'c') {
        e.preventDefault();
        navigate('/master/create/tax-units');
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [selectedTaxUnit, handleSave, handleDelete, handleBack, showExcisePopup, navigate]);

  // ── Selection mode ──
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
        render: (r: TaxUnitType) => <span className="font-bold text-black">{r.name}</span>,
      },
      {
        key: 'alias',
        label: 'Alias',
        span: 'col-span-3',
        render: (r: TaxUnitType) => <span className="text-zinc-500">{r.alias || '—'}</span>,
      },
      {
        key: 'registration_type',
        label: 'Reg Type',
        span: 'col-span-2',
        render: (r: TaxUnitType) => (
          <span className="text-zinc-500">{r.registration_type || '—'}</span>
        ),
      },
      {
        key: 'ecc_number',
        label: 'ECC Number',
        span: 'col-span-2',
        render: (r: TaxUnitType) => (
          <span className="text-zinc-700 font-semibold">{r.ecc_number || '—'}</span>
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
      <div className="flex-1 flex flex-col h-full bg-white select-none">
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
          <div className="flex-1 flex flex-col bg-white border-r border-zinc-200">
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
      </div>
    );
  }

  // ── Edit mode ──
  const alterActions = [
    { key: 'Alt+A', label: 'Accept', onClick: handleSave },
    { key: 'Alt+D', label: 'Delete', onClick: handleDelete },
    { key: 'Esc', label: 'Back', onClick: handleBack },
  ];

  return (
    <div className="flex-1 flex flex-col h-full bg-white select-none relative" data-enter-nav>
      <PageTitleBar title="Tax Unit Alteration" subtitle={selectedTaxUnit.name} />

      {error && (
        <NotificationBanner type="error" message={error} onDismiss={() => setError(null)} />
      )}
      {success && (
        <NotificationBanner type="success" message={success} onDismiss={() => setSuccess(null)} />
      )}

      <div className="flex-1 flex min-h-0">
        <div className="flex-1 flex flex-col min-w-0 bg-white overflow-y-auto">
          <div className="p-3 space-y-1 max-w-2xl">
            <FormRow label="Name" labelWidth={LABEL_W} className={rowCls} required>
              <input autoFocus className={inputCls} value={form.name} onChange={set('name')} />
            </FormRow>

            <FormRow label="(alias)" labelWidth={LABEL_W} className={rowCls}>
              <input className={inputCls} value={form.alias} onChange={set('alias')} />
            </FormRow>

            <FormRow label="Address" labelWidth={LABEL_W} className={rowCls}>
              <input
                className={inputCls}
                value={form.addressLine1}
                onChange={set('addressLine1')}
              />
            </FormRow>

            <FormRow label="State" labelWidth={LABEL_W} className={rowCls}>
              <select
                className={selectCls}
                value={form.state}
                onChange={(e) => setForm((prev) => ({ ...prev, state: e.target.value }))}
              >
                <option value="">Not Applicable</option>
                {INDIAN_STATES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </FormRow>

            <FormRow label="Pincode" labelWidth={LABEL_W} className={rowCls}>
              <input className={inputCls} value={form.pincode} onChange={set('pincode')} />
            </FormRow>

            <FormRow label="Telephone" labelWidth={LABEL_W} className={rowCls}>
              <input className={inputCls} value={form.telephone} onChange={set('telephone')} />
            </FormRow>

            <FormRow label="Registered for" labelWidth={LABEL_W} className={rowCls}>
              <select
                className={selectCls}
                value={registeredFor}
                onChange={(e) => setRegisteredFor(e.target.value)}
              >
                {REGISTERED_FOR_OPTIONS.map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </select>
            </FormRow>

            <FormRow label="Set/alter excise details" labelWidth={LABEL_W} className={rowCls}>
              <select
                className={selectCls}
                value={form.setAlterExciseDetails ? 'Yes' : 'No'}
                onChange={(e) => handleExciseToggle(e.target.value === 'Yes')}
              >
                <option value="No">No</option>
                <option value="Yes">Yes</option>
              </select>
            </FormRow>
          </div>
          <div className="flex-1" />
        </div>

        <RightActionPanel actions={alterActions} />
      </div>

      <MasterFormFooter
        onCancel={handleBack}
        onSubmit={handleSave}
        onDelete={handleDelete}
        submitLabel="Accept"
        cancelLabel="Back"
        loading={saving}
      />

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
    </div>
  );
}
