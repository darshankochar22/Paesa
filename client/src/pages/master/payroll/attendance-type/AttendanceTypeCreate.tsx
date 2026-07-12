import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCompany } from '@/context/CompanyContext';
import {
  FormRow,
  PageTitleBar,
  RightActionPanel,
  MasterFormFooter,
  AlertBanner,
} from '@/components/ui';
import { useMasterShortcuts } from '@/hooks/useMasterShortcuts';
import type { PayrollUnitType } from '@/types/entities/Payroll';
const inputCls =
  'flex-1 bg-transparent text-sm outline-none px-1.5 py-0.5 border border-transparent hover:border-zinc-200 focus:border-zinc-800 transition-colors bg-white/50 rounded';
const selectCls =
  'bg-transparent text-sm outline-none px-1.5 py-0.5 border border-transparent hover:border-zinc-200 focus:border-zinc-800 transition-colors bg-white/50 rounded w-24';

interface FormData {
  name: string;
  alias: string;
  type: string;
  unit_id: string;
  period: string;
  carry_forward: string;
  encashment: string;
  max_days: string;
}

const INITIAL: FormData = {
  name: '',
  alias: '',
  type: 'Attendance / Leave with Pay',
  unit_id: '',
  period: 'Per Day',
  carry_forward: '0',
  encashment: '0',
  max_days: '0',
};

const ATTENDANCE_TYPES = [
  'Attendance / Leave with Pay',
  'Leave without Pay',
  'Production',
  'User Defined Calendar Type',
];

export default function AttendanceTypeCreate() {
  const navigate = useNavigate();
  const { selectedCompany } = useCompany();
  const companyId = selectedCompany?.company_id;
  const [form, setForm] = useState<FormData>(INITIAL);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [units, setUnits] = useState<PayrollUnitType[]>([]);
  const nameRef = useRef<HTMLInputElement>(null);
  const aliasRef = useRef<HTMLInputElement>(null);
  const typeRef = useRef<HTMLSelectElement>(null);
  const unitRef = useRef<HTMLSelectElement>(null);
  const periodRef = useRef<HTMLSelectElement>(null);

  useEffect(() => {
    if (!companyId) return;
    window.api.payrollUnit.getAll(companyId).then((res) => {
      if (res.success) setUnits(res.payrollUnits);
    });
  }, [companyId]);

  const setField =
    (key: keyof FormData) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm((f) => ({ ...f, [key]: e.target.value }));

  const validate = (): string | null => {
    if (!form.name.trim()) return 'Name is required.';
    if (!companyId) return 'No company selected.';
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
      const result = await window.api.attendanceType.create({
        company_id: companyId!,
        name: form.name.trim(),
        alias: form.alias.trim() || undefined,
        type: form.type,
        unit_id: form.unit_id ? Number(form.unit_id) : undefined,
        period: form.period,
        carry_forward: Number(form.carry_forward),
        encashment: Number(form.encashment),
        max_days: Number(form.max_days),
      });
      if (result.success) {
        setSuccess(`Attendance Type "${form.name}" created.`);
        setForm(INITIAL);
        setTimeout(() => setSuccess(null), 3000);
      } else {
        setError(result.error || 'Failed to create attendance type.');
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unexpected error.');
    } finally {
      setLoading(false);
    }
  }, [form, companyId]);

  useMasterShortcuts({
    onAccept: handleSubmit,
    onQuit: () => navigate('/master/create'),
    onCreate: () => navigate('/master/alter/attendance-type'),
  });

  const attendanceActions = [
    { key: 'Alt+A', label: 'Accept', onClick: handleSubmit },
    { key: 'Alt+C', label: 'Alter Mode', onClick: () => navigate('/master/alter/attendance-type') },
    { key: 'Esc', label: 'Quit', onClick: () => navigate('/master/create') },
  ];

  return (
    <div className="flex-1 flex flex-col h-full bg-white select-none" data-enter-nav>
      <PageTitleBar title="Attendance/Production Type Creation" subtitle={selectedCompany?.name} />

      {error && <AlertBanner type="error" message={error} onDismiss={() => setError(null)} />}
      {success && (
        <AlertBanner type="success" message={success} onDismiss={() => setSuccess(null)} />
      )}

      <div className="flex-1 flex min-h-0">
        <div className="flex-1 flex flex-col min-w-0 bg-white border-r border-zinc-100">
          <div className="p-3 space-y-1.5 max-w-2xl">
            <FormRow
              label="Name"
              required
              labelWidth="w-56"
              className="flex items-center min-h-[26px]"
            >
              <input
                autoFocus
                ref={nameRef}
                className={inputCls}
                value={form.name}
                onChange={setField('name')}
                placeholder="e.g. Present"
                onKeyDown={(e) => {
                  if (e.key !== 'Enter') return;
                  e.preventDefault();
                  aliasRef.current?.focus();
                }}
              />
            </FormRow>
            <FormRow label="(alias)" labelWidth="w-56" className="flex items-center min-h-[26px]">
              <input
                ref={aliasRef}
                className={inputCls}
                value={form.alias}
                onChange={setField('alias')}
                onKeyDown={(e) => {
                  if (e.key !== 'Enter') return;
                  e.preventDefault();
                  typeRef.current?.focus();
                }}
              />
            </FormRow>
            <FormRow label="Under" labelWidth="w-56" className="flex items-center min-h-[26px]">
              <span className="text-sm font-semibold text-zinc-800">Primary</span>
            </FormRow>
            <FormRow
              label="Attendance Type"
              labelWidth="w-56"
              className="flex items-center min-h-[26px]"
            >
              <select
                ref={typeRef}
                className={selectCls}
                value={form.type}
                onChange={setField('type')}
                onKeyDown={(e) => {
                  if (e.key !== 'Enter') return;
                  e.preventDefault();
                  (form.type === 'Production' ? unitRef : periodRef).current?.focus();
                }}
              >
                {ATTENDANCE_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </FormRow>
            {/* Production → Unit only; all other types → Period only */}
            {form.type === 'Production' ? (
              <FormRow label="Unit" labelWidth="w-56" className="flex items-center min-h-[26px]">
                <select
                  ref={unitRef}
                  className={selectCls}
                  value={form.unit_id}
                  onChange={setField('unit_id')}
                >
                  <option value="">Select</option>
                  {units.map((u) => (
                    <option key={u.payroll_unit_id} value={u.payroll_unit_id}>
                      {u.name}
                    </option>
                  ))}
                </select>
              </FormRow>
            ) : (
              <FormRow label="Period" labelWidth="w-56" className="flex items-center min-h-[26px]">
                <select
                  ref={periodRef}
                  className={selectCls}
                  value={form.period}
                  onChange={setField('period')}
                >
                  <option value="Per Day">Per Day</option>
                  <option value="Per Month">Per Month</option>
                  <option value="Per Year">Per Year</option>
                  <option value="Per Hour">Per Hour</option>
                </select>
              </FormRow>
            )}
          </div>
          <div className="flex-1" />
        </div>

        <RightActionPanel actions={attendanceActions} />
      </div>

      <MasterFormFooter
        onCancel={() => navigate('/master/create')}
        onSubmit={handleSubmit}
        loading={loading}
      />
    </div>
  );
}
