import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCompany } from '@/context/CompanyContext';
import { INDIAN_STATES } from '@/constants/states';
import {
  FormRow,
  PageTitleBar,
  RightActionPanel,
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

export default function TaxCreate() {
  const navigate = useNavigate();
  const { selectedCompany } = useCompany();
  const companyId = selectedCompany?.company_id;

  const [form, setForm] = useState({
    name: '',
    alias: '',
    address: '',
    state: '',
    pincode: '',
    telephone: '',
    setAlterExciseDetails: false,
  });
  const [registeredFor, setRegisteredFor] = useState('Excise');

  // Excise sub-details (saved with the tax unit)
  const [registrationType, setRegistrationType] = useState('Importer');
  const [typeOfManufacturer, setTypeOfManufacturer] = useState('Regular');
  const [eccNumber, setEccNumber] = useState('');
  const [setAlterTariff, setSetAlterTariff] = useState(false);
  const [tariff, setTariff] = useState<Tariff>({ ...EMPTY_TARIFF });
  const [setAlterRule11, setSetAlterRule11] = useState(false);
  const [rule11Book, setRule11Book] = useState('');

  const [showExcisePopup, setShowExcisePopup] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = (field: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const handleExciseToggle = (val: boolean) => {
    setForm((prev) => ({ ...prev, setAlterExciseDetails: val }));
    if (val) setShowExcisePopup(true);
  };

  const resetForm = () => {
    setForm({
      name: '',
      alias: '',
      address: '',
      state: '',
      pincode: '',
      telephone: '',
      setAlterExciseDetails: false,
    });
    setRegisteredFor('Excise');
    setRegistrationType('Importer');
    setTypeOfManufacturer('Regular');
    setEccNumber('');
    setSetAlterTariff(false);
    setTariff({ ...EMPTY_TARIFF });
    setSetAlterRule11(false);
    setRule11Book('');
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      setError('Name is required');
      return;
    }
    if (!companyId) {
      setError('No company selected');
      return;
    }
    setSaving(true);
    setError(null);

    const payload: TaxUnitType = {
      company_id: companyId,
      name: form.name,
      alias: form.alias || undefined,
      address_line1: form.address || undefined,
      state: form.state || undefined,
      pincode: form.pincode || undefined,
      telephone: form.telephone || undefined,
      registered_for: registeredFor || 'Excise',
      set_alter_excise_details: form.setAlterExciseDetails ? 1 : 0,
      registration_type: registrationType,
      type_of_manufacturer: registrationType === 'Manufacturer' ? typeOfManufacturer : undefined,
      ecc_number: eccNumber || undefined,
      set_alter_excise_tariff: setAlterTariff ? 1 : 0,
      tariff_name: setAlterTariff ? tariff.name || undefined : undefined,
      hsn_code: setAlterTariff ? tariff.hsn || undefined : undefined,
      reporting_uom: setAlterTariff ? tariff.uom || undefined : undefined,
      valuation_type: setAlterTariff ? tariff.valuationType || undefined : undefined,
      tariff_rate: setAlterTariff ? Number(tariff.rate) || 0 : undefined,
      tariff_rate_per_unit: setAlterTariff ? Number(tariff.ratePerUnit) || 0 : undefined,
      set_alter_rule11_book: setAlterRule11 ? 1 : 0,
      rule11_book: setAlterRule11 ? rule11Book || undefined : undefined,
    };

    try {
      const result = await window.api.taxUnits.create(payload);
      if (result.success) resetForm();
      else setError(result.error || 'Failed to save tax unit');
    } catch (err: any) {
      setError(err?.message || 'Something went wrong');
    } finally {
      setSaving(false);
    }
  };

  const handleQuit = () => navigate('/master/create');

  useEffect(() => {
    if (showExcisePopup) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        handleQuit();
      }
      if ((e.altKey || e.ctrlKey) && e.key.toLowerCase() === 'a') {
        e.preventDefault();
        handleSave();
      }
      if (e.altKey && e.key.toLowerCase() === 'c') {
        e.preventDefault();
        navigate('/master/alter/tax-units');
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [handleSave, navigate, showExcisePopup]);

  const actions = [
    { key: 'Alt+A', label: saving ? 'Saving...' : 'Accept', onClick: handleSave },
    { key: 'Alt+C', label: 'Alter Mode', onClick: () => navigate('/master/alter/tax-units') },
    { key: 'Esc', label: 'Quit', onClick: handleQuit },
  ];

  return (
    <div className="flex-1 flex flex-col h-full bg-white select-none relative" data-enter-nav>
      <PageTitleBar title="Tax Unit Creation" subtitle={selectedCompany?.name} />

      {error && (
        <NotificationBanner type="error" message={error} onDismiss={() => setError(null)} />
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
              <input className={inputCls} value={form.address} onChange={set('address')} />
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

        <RightActionPanel actions={actions} />
      </div>

      <MasterFormFooter onCancel={handleQuit} onSubmit={handleSave} loading={saving} />

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
