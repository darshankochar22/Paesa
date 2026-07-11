import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useCompany } from '@/context/CompanyContext';
import {
  FormRow,
  PageTitleBar,
  RightActionPanel,
  MasterSelectionPanel,
  MasterFormFooter,
  AlertBanner,
} from '@/components/ui';
import { useMasterShortcuts } from '@/hooks/useMasterShortcuts';
import type { SalaryStructureType, PayHeadType } from '@/types/entities/Payroll';
import type { EmployeeType } from '@/types/entities/Employee';

const inputCls =
  'flex-1 bg-transparent text-sm outline-none px-1.5 py-0.5 border border-transparent hover:border-zinc-200 focus:border-zinc-800 transition-colors bg-white/50 rounded';
const selectCls =
  'bg-transparent text-sm outline-none px-1.5 py-0.5 border border-transparent hover:border-zinc-200 focus:border-zinc-800 transition-colors bg-white/50 rounded w-56';

interface FormData {
  effective_from: string;
  amount: number;
  calculation_mode: string;
  employee_id: string;
  pay_head_id: string;
}

export default function SalaryStructureAlter() {
  const navigate = useNavigate();
  const location = useLocation();
  const { selectedCompany } = useCompany();
  const companyId = selectedCompany?.company_id;
  const [structures, setStructures] = useState<SalaryStructureType[]>([]);
  const [_employees, setEmployees] = useState<EmployeeType[]>([]);
  const [_payHeads, setPayHeads] = useState<PayHeadType[]>([]);
  const [selected, setSelected] = useState<SalaryStructureType | null>(null);
  const [form, setForm] = useState<FormData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (!companyId) return;
    const [sRes, eRes, pRes] = await Promise.all([
      window.api.salaryStructure.getAll(companyId),
      window.api.employee.getAll(companyId),
      window.api.payHead.getAll(companyId),
    ]);
    if (sRes.success) setStructures(sRes.salaryStructures ?? []);
    if (eRes.success) setEmployees(eRes.employees ?? []);
    if (pRes.success) setPayHeads(pRes.payHeads ?? []);
  }, [companyId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSelect = (s: SalaryStructureType) => {
    setSelected(s);
    setForm({
      effective_from: s.effective_from || '',
      amount: s.amount ?? 0,
      calculation_mode: s.calculation_mode || 'Flat Rate',
      employee_id: s.employee_id ? String(s.employee_id) : '',
      pay_head_id: s.pay_head_id ? String(s.pay_head_id) : '',
    });
    setError(null);
    setSuccess(null);
  };

  useEffect(() => {
    const preSelectId = (location.state as any)?.structureId;
    if (preSelectId && structures.length > 0) {
      const s = structures.find((s) => s.structure_id === preSelectId);
      if (s) handleSelect(s);
    }
  }, [location.state, structures]);

  const setField =
    (key: keyof FormData) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm((f) => (f ? { ...f, [key]: e.target.value } : null));

  const setNumber = (key: 'amount') => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) =>
      f ? { ...f, [key]: e.target.value === '' ? 0 : Number(e.target.value) } : null,
    );

  const validate = (): string | null => {
    if (!form?.employee_id) return 'Employee is required.';
    if (!form?.pay_head_id) return 'Pay head is required.';
    if (!form?.effective_from) return 'Effective date is required.';
    if (!companyId) return 'No company selected.';
    return null;
  };

  const handleSubmit = useCallback(async () => {
    if (!form || !selected) return;
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await window.api.salaryStructure.update({
        structure_id: selected.structure_id,
        employee_id: Number(form.employee_id),
        effective_from: form.effective_from,
        pay_head_id: Number(form.pay_head_id),
        amount: form.amount,
        calculation_mode: form.calculation_mode,
      });
      if (res.success) {
        setSuccess('Salary structure updated successfully.');
        await loadData();
        setTimeout(() => {
          setSuccess(null);
          setSelected(null);
          setForm(null);
        }, 1500);
      } else {
        setError('Failed to update salary structure.');
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unexpected error.');
    } finally {
      setLoading(false);
    }
  }, [form, selected, loadData, companyId]);

  const handleDelete = useCallback(async () => {
    if (!selected) return;
    if (!window.confirm('Delete this salary structure entry? This cannot be undone.')) return;

    setLoading(true);
    setError(null);
    try {
      const res = await window.api.salaryStructure.delete(selected.structure_id!);
      if (res.success) {
        setSuccess('Salary structure entry deleted successfully.');
        await loadData();
        setTimeout(() => {
          setSuccess(null);
          setSelected(null);
          setForm(null);
        }, 1500);
      } else {
        setError('Failed to delete salary structure.');
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unexpected error.');
    } finally {
      setLoading(false);
    }
  }, [selected, loadData]);

  const empName = (id?: number) => _employees.find((e) => e.employee_id === id)?.name ?? '-';
  const phName = (id?: number) => _payHeads.find((p) => p.pay_head_id === id)?.name ?? '-';

  useMasterShortcuts({
    onAccept: handleSubmit,
    onDelete: handleDelete,
    onQuit: () => {
      if (selected) {
        setSelected(null);
        setForm(null);
      } else {
        navigate('/master/alter');
      }
    },
  });

  if (!selected || !form) {
    const columns = [
      {
        key: 'employee',
        label: 'Employee',
        span: 'col-span-4',
        render: (r: SalaryStructureType) => (
          <span className="font-bold text-zinc-950 uppercase">{empName(r.employee_id)}</span>
        ),
      },
      {
        key: 'pay_head',
        label: 'Pay Head',
        span: 'col-span-3',
        render: (r: SalaryStructureType) => (
          <span className="text-zinc-500">{phName(r.pay_head_id)}</span>
        ),
      },
      {
        key: 'amount',
        label: 'Amount',
        span: 'col-span-2',
        render: (r: SalaryStructureType) => (
          <span className="text-zinc-700 text-right font-semibold">{r.amount.toFixed(2)}</span>
        ),
      },
      {
        key: 'effective',
        label: 'Effective',
        span: 'col-span-3',
        render: (r: SalaryStructureType) => (
          <span className="text-zinc-400">{r.effective_from}</span>
        ),
      },
    ];

    return (
      <MasterSelectionPanel
        title="Alter Salary Structure"
        subtitle="Select Structure to Alter"
        searchPlaceholder="Search structures by employee name..."
        items={structures}
        filterFn={(s, search) =>
          empName(s.employee_id).toLowerCase().includes(search.toLowerCase())
        }
        columns={columns}
        onSelect={handleSelect}
        onCancel={() => navigate('/master/alter')}
        onCreate={() => navigate('/master/create/salary-structure')}
        createLabel="Create Structure"
        rowKey={(r) => String(r.structure_id)}
        emptyMessage="No salary structures found."
      />
    );
  }

  const alterActions = [
    { key: 'Alt+A', label: 'Accept', onClick: handleSubmit },
    { key: 'Alt+D', label: 'Delete', onClick: handleDelete },
    {
      key: 'Esc',
      label: 'Back',
      onClick: () => {
        setSelected(null);
        setForm(null);
      },
    },
  ];

  return (
    <div
      className="flex flex-col h-full relative overflow-hidden bg-white select-none"
      data-enter-nav
    >
      <PageTitleBar title="Alter Salary Structure" subtitle={selectedCompany?.name} />

      {error && <AlertBanner type="error" message={error} onDismiss={() => setError(null)} />}
      {success && (
        <AlertBanner type="success" message={success} onDismiss={() => setSuccess(null)} />
      )}

      <div className="flex-1 flex min-h-0">
        <div className="flex-1 overflow-y-auto p-3 space-y-1.5 max-w-2xl bg-white border-r border-zinc-100">
          <FormRow
            label="Employee"
            required
            labelWidth="w-56"
            className="flex items-center min-h-[26px]"
          >
            <select
              className={selectCls}
              value={form.employee_id}
              onChange={setField('employee_id')}
            >
              <option value="">Select Employee</option>
              {_employees.map((e) => (
                <option key={e.employee_id} value={e.employee_id}>
                  {e.name} ({e.employee_code})
                </option>
              ))}
            </select>
          </FormRow>
          <FormRow
            label="Pay Head"
            required
            labelWidth="w-56"
            className="flex items-center min-h-[26px]"
          >
            <select
              className={selectCls}
              value={form.pay_head_id}
              onChange={setField('pay_head_id')}
            >
              <option value="">Select Pay Head</option>
              {_payHeads.map((p) => (
                <option key={p.pay_head_id} value={p.pay_head_id}>
                  {p.name}
                </option>
              ))}
            </select>
          </FormRow>
          <FormRow
            label="Effective From"
            required
            labelWidth="w-56"
            className="flex items-center min-h-[26px]"
          >
            <input
              type="date"
              className={inputCls}
              value={form.effective_from}
              onChange={setField('effective_from')}
            />
          </FormRow>
          <FormRow
            label="Amount"
            required
            labelWidth="w-56"
            className="flex items-center min-h-[26px]"
          >
            <input
              type="number"
              step="0.01"
              className={`${inputCls} text-right max-w-[120px]`}
              value={form.amount}
              onChange={setNumber('amount')}
            />
          </FormRow>
          <FormRow
            label="Calculation Mode"
            labelWidth="w-56"
            className="flex items-center min-h-[26px]"
          >
            <select
              className={selectCls}
              value={form.calculation_mode}
              onChange={setField('calculation_mode')}
            >
              <option value="Flat Rate">Flat Rate</option>
              <option value="As User Defined Value">User Defined</option>
              <option value="As Computed Value">Computed</option>
              <option value="On Attendance">On Attendance</option>
              <option value="On Production">On Production</option>
            </select>
          </FormRow>
        </div>

        <RightActionPanel actions={alterActions} />
      </div>

      <MasterFormFooter
        onCancel={() => {
          setSelected(null);
          setForm(null);
        }}
        onSubmit={handleSubmit}
        onDelete={handleDelete}
        submitLabel="Accept"
        cancelLabel="Back"
        loading={loading}
      />
    </div>
  );
}
