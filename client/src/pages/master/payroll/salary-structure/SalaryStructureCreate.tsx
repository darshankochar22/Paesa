import { useState, useEffect, useCallback } from 'react';
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
import type { EmployeeType } from '@/types/entities/Employee';
import type { PayHeadType } from '@/types/entities/Payroll';
const inputCls =
  'flex-1 bg-transparent text-sm outline-none px-1.5 py-0.5 border border-transparent hover:border-zinc-200 focus:border-zinc-800 transition-colors bg-white/50 rounded';
const selectCls =
  'bg-transparent text-sm outline-none px-1.5 py-0.5 border border-transparent hover:border-zinc-200 focus:border-zinc-800 transition-colors bg-white/50 rounded w-56';

interface SalaryEntry {
  pay_head_id: number;
  pay_head_name: string;
  amount: number;
  calculation_mode: string;
}

export default function SalaryStructureCreate() {
  const navigate = useNavigate();
  const { selectedCompany } = useCompany();
  const companyId = selectedCompany?.company_id;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [employees, setEmployees] = useState<EmployeeType[]>([]);
  const [_payHeads, setPayHeads] = useState<PayHeadType[]>([]);
  const [employeeId, setEmployeeId] = useState('');
  const [effectiveFrom, setEffectiveFrom] = useState('');
  const [entries, setEntries] = useState<SalaryEntry[]>([]);

  useEffect(() => {
    if (!companyId) return;
    Promise.all([window.api.employee.getAll(companyId), window.api.payHead.getAll(companyId)]).then(
      ([empRes, phRes]) => {
        if (empRes.success) setEmployees(empRes.employees);
        if (phRes.success) {
          setPayHeads(phRes.payHeads);
          setEntries(
            phRes.payHeads.map((ph) => ({
              pay_head_id: ph.pay_head_id!,
              pay_head_name: ph.name,
              amount: 0,
              calculation_mode: ph.calculation_type || 'Flat Rate',
            })),
          );
        }
      },
    );
  }, [companyId]);

  const validate = (): string | null => {
    if (!employeeId) return 'Please select an employee.';
    if (!effectiveFrom) return 'Effective date is required.';
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
      const bulk = entries
        .filter((e) => e.amount > 0)
        .map((e) => ({
          company_id: companyId!,
          employee_id: Number(employeeId),
          effective_from: effectiveFrom,
          pay_head_id: e.pay_head_id,
          amount: e.amount,
          calculation_mode: e.calculation_mode,
        }));

      if (bulk.length === 0) {
        setError('No salary entries with amount > 0.');
        setLoading(false);
        return;
      }

      const result = await window.api.salaryStructure.createBulk(
        companyId!,
        Number(employeeId),
        effectiveFrom,
        bulk,
      );
      if (result.success) {
        setSuccess(`Salary Structure created for employee.`);
        setTimeout(() => setSuccess(null), 3000);
      } else {
        setError('Failed to create salary structure.');
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unexpected error.');
    } finally {
      setLoading(false);
    }
  }, [employeeId, effectiveFrom, entries, companyId]);

  useMasterShortcuts({
    onAccept: handleSubmit,
    onQuit: () => navigate('/master/create'),
    onCreate: () => navigate('/master/alter/salary-structure'),
  });

  const salaryActions = [
    { key: 'Alt+A', label: 'Accept', onClick: handleSubmit },
    {
      key: 'Alt+C',
      label: 'Alter Mode',
      onClick: () => navigate('/master/alter/salary-structure'),
    },
    { key: 'Esc', label: 'Quit', onClick: () => navigate('/master/create') },
  ];

  return (
    <div className="flex-1 flex flex-col h-full bg-white select-none" data-enter-nav>
      <PageTitleBar title="Salary Structure Creation" subtitle={selectedCompany?.name} />

      {error && <AlertBanner type="error" message={error} onDismiss={() => setError(null)} />}
      {success && (
        <AlertBanner type="success" message={success} onDismiss={() => setSuccess(null)} />
      )}

      <div className="flex-1 flex min-h-0">
        <div className="flex-1 flex flex-col min-w-0 bg-white border-r border-zinc-100">
          <div className="p-3 space-y-1.5 max-w-2xl">
            <FormRow
              label="Employee"
              required
              labelWidth="w-56"
              className="flex items-center min-h-[26px]"
            >
              <select
                autoFocus
                className={selectCls}
                value={employeeId}
                onChange={(e) => setEmployeeId(e.target.value)}
              >
                <option value="">Select Employee</option>
                {employees.map((emp) => (
                  <option key={emp.employee_id} value={emp.employee_id}>
                    {emp.name} ({emp.employee_code})
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
                value={effectiveFrom}
                onChange={(e) => setEffectiveFrom(e.target.value)}
              />
            </FormRow>
          </div>

          <div className="border-t border-zinc-200 flex-1 overflow-y-auto">
            <div className="px-3 py-2 bg-zinc-50 border-b border-zinc-200 text-[10px] font-bold text-zinc-400 uppercase tracking-wider grid grid-cols-12 gap-1">
              <span className="col-span-5">Pay Head</span>
              <span className="col-span-3 text-right">Amount</span>
              <span className="col-span-4 text-center">Mode</span>
            </div>
            {entries.map((entry, i) => (
              <div
                key={entry.pay_head_id}
                className="grid grid-cols-12 gap-1 px-2 py-1 border-b border-zinc-100 items-center hover:bg-zinc-50/50"
              >
                <span className="col-span-5 text-sm text-zinc-700 font-medium truncate">
                  {entry.pay_head_name}
                </span>
                <input
                  type="number"
                  step="0.01"
                  className={`${inputCls} col-span-3 text-right`}
                  value={entry.amount}
                  onChange={(ev) =>
                    setEntries((es) =>
                      es.map((en, idx) =>
                        idx === i ? { ...en, amount: Number(ev.target.value) } : en,
                      ),
                    )
                  }
                />
                <select
                  className={`${selectCls} col-span-4 text-xs max-w-[150px] mx-auto`}
                  value={entry.calculation_mode}
                  onChange={(ev) =>
                    setEntries((es) =>
                      es.map((en, idx) =>
                        idx === i ? { ...en, calculation_mode: ev.target.value } : en,
                      ),
                    )
                  }
                >
                  <option value="Flat Rate">Flat Rate</option>
                  <option value="As User Defined Value">User Defined</option>
                  <option value="As Computed Value">Computed</option>
                  <option value="On Attendance">On Attendance</option>
                  <option value="On Production">On Production</option>
                </select>
              </div>
            ))}
          </div>
        </div>

        <RightActionPanel actions={salaryActions} />
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
