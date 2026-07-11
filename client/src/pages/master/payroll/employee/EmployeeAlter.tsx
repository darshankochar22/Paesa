import { useState, useEffect, useCallback, useRef } from 'react';
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
import { focusFieldAfter } from '@/hooks/useEnterNavigation';
import GeneralInfoSection from '@/components/payroll/GeneralInfoSection';
import BankDetailsSection from '@/components/payroll/BankDetailsSection';
import StatutoryDetailsSection from '@/components/payroll/StatutoryDetailsSection';
import type { EmployeeType, EmployeeGroupType } from '@/types/entities/Employee';
import type { PayHeadType } from '@/types/entities/Payroll';
import type { GeneralInfoData } from '@/components/payroll/GeneralInfoSection';
import type { BankDetailsData } from '@/components/payroll/BankDetailsSection';
import type { StatutoryDetailsData } from '@/components/payroll/StatutoryDetailsSection';
import SalaryDetailsModal, {
  type SalaryRow,
  fyStartISO,
} from '@/components/payroll/SalaryDetailsModal';

const inputCls =
  'flex-1 bg-transparent text-sm outline-none px-1.5 py-0.5 border border-transparent hover:border-zinc-200 focus:border-zinc-800 transition-colors bg-white/50 rounded';
const selectCls =
  'bg-transparent text-sm outline-none px-1.5 py-0.5 border border-transparent hover:border-zinc-200 focus:border-zinc-800 transition-colors bg-white/50 rounded w-24';

interface BaseFormData {
  name: string;
  alias: string;
  date_of_joining: string;
  define_salary_details: string;
  employee_group_id: number | null;
}

export default function EmployeeAlter() {
  const navigate = useNavigate();
  const location = useLocation();
  const { selectedCompany } = useCompany();
  const companyId = selectedCompany?.company_id;
  const [employees, setEmployees] = useState<EmployeeType[]>([]);
  const [groups, setGroups] = useState<EmployeeGroupType[]>([]);
  const [selected, setSelected] = useState<EmployeeType | null>(null);
  const [base, setBase] = useState<BaseFormData | null>(null);
  const [general, setGeneral] = useState<GeneralInfoData>({});
  const [bank, setBank] = useState<BankDetailsData>({});
  const [statutory, setStatutory] = useState<StatutoryDetailsData>({
    applicable_tax_regime: 'New Tax Regime',
  });
  const [provideBank, setProvideBank] = useState<'No' | 'Yes'>('No');
  const [selectedGroup, setSelectedGroup] = useState<EmployeeGroupType | null>(null);
  const [showGroupPanel, setShowGroupPanel] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [payHeads, setPayHeads] = useState<PayHeadType[]>([]);
  const [showSalaryModal, setShowSalaryModal] = useState(false);
  const [salaryRows, setSalaryRows] = useState<SalaryRow[]>([]);
  const [salaryEffectiveFrom, setSalaryEffectiveFrom] = useState(fyStartISO());
  const underRef = useRef<HTMLDivElement>(null);
  // structure_id of the active salary rows currently in the DB for this employee —
  // soft-deleted on save before re-inserting, so altering replaces instead of duplicating.
  const [existingStructureIds, setExistingStructureIds] = useState<number[]>([]);

  const loadData = useCallback(async () => {
    if (!companyId) return;
    const [eRes, gRes, pRes] = await Promise.all([
      window.api.employee.getAll(companyId),
      window.api.employeeGroup.getAll(companyId),
      window.api.payHead.getAll(companyId),
    ]);
    if (eRes.success) setEmployees(eRes.employees ?? []);
    if (gRes.success) setGroups(gRes.employeeGroups ?? []);
    if (pRes.success) setPayHeads(pRes.payHeads ?? []);
  }, [companyId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const loadSalaryStructure = async (employeeId: number) => {
    setSalaryRows([]);
    setSalaryEffectiveFrom(fyStartISO());
    setExistingStructureIds([]);
    if (!companyId) return;
    const res = await window.api.salaryStructure.getByEmployee(companyId, employeeId);
    if (!res.success || !res.salaryStructures?.length) return;
    // getByEmployee groups active rows by effective_from (DESC) — take the latest group.
    const latest = res.salaryStructures[0];
    const rows: SalaryRow[] = (latest.pay_heads ?? []).map((s: any) => {
      const ph = payHeads.find((p) => p.pay_head_id === s.pay_head_id);
      return {
        pay_head_id: s.pay_head_id,
        pay_head_name: ph?.name ?? '',
        rate: s.amount != null ? String(s.amount) : '',
        per: '',
        pay_head_type: ph?.pay_head_type ?? '',
        calculation_type: s.calculation_mode ?? ph?.calculation_type ?? '',
      };
    });
    setSalaryRows(rows);
    setSalaryEffectiveFrom(latest.effective_from || fyStartISO());
    setExistingStructureIds(
      (latest.pay_heads ?? []).map((s: any) => s.structure_id).filter((id: any) => id != null),
    );
  };

  const selectEmployee = (e: EmployeeType) => {
    setSelected(e);
    if (e.employee_id != null) loadSalaryStructure(e.employee_id);
    setBase({
      name: e.name,
      alias: e.alias || '',
      date_of_joining: e.date_of_joining || '',
      define_salary_details: e.define_salary_details ? 'Yes' : 'No',
      employee_group_id: e.employee_group_id ?? null,
    });
    setGeneral({
      employee_code: e.employee_code,
      designation: e.designation,
      function: e.function,
      location: e.location,
      gender: e.gender,
      date_of_birth: e.date_of_birth,
      blood_group: e.blood_group,
      father_name: e.father_name,
      mother_name: e.mother_name,
      spouse_name: e.spouse_name,
      address: e.address,
      city: e.city,
      state: e.state,
      pincode: e.pincode,
      mobile: e.mobile,
      phone: e.phone,
      email: e.email,
    });
    setBank({
      bank_account_number: e.bank_account_number,
      bank_name: e.bank_name,
      bank_branch: e.bank_branch,
      ifsc_code: e.ifsc_code,
    });
    setProvideBank(e.bank_name ? 'Yes' : 'No');
    setStatutory({
      applicable_tax_regime: e.applicable_tax_regime || 'New Tax Regime',
      pan: e.pan,
      aadhaar: e.aadhaar,
      uan: e.uan,
      pf_account_number: e.pf_account_number,
      eps_account_number: e.eps_account_number,
      date_of_joining_pf: e.date_of_joining_pf,
      pran: e.pran,
      esi_number: e.esi_number,
      esi_dispensary_name: e.esi_dispensary_name,
    });
    const g = groups.find((g) => g.employee_group_id === e.employee_group_id);
    setSelectedGroup(g || null);
    setError(null);
    setSuccess(null);
  };

  useEffect(() => {
    const preSelectId = (location.state as any)?.employeeId;
    if (preSelectId && employees.length > 0) {
      const e = employees.find((e) => e.employee_id === preSelectId);
      if (e) selectEmployee(e);
    }
  }, [location.state, employees]);

  const setBaseField =
    (key: keyof BaseFormData) => (ev: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setBase((f) =>
        f
          ? {
              ...f,
              [key]:
                key === 'define_salary_details'
                  ? ev.target.value === 'Yes'
                    ? 'Yes'
                    : 'No'
                  : ev.target.value,
            }
          : null,
      );

  const setGenField =
    (key: keyof GeneralInfoData) => (ev: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setGeneral((f) => ({ ...f, [key]: ev.target.value }));

  const setBankField =
    (key: keyof BankDetailsData) => (ev: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setBank((f) => ({ ...f, [key]: ev.target.value }));

  const setStatField =
    (key: keyof StatutoryDetailsData) =>
    (ev: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setStatutory((f) => ({ ...f, [key]: ev.target.value }));

  const validate = (): string | null => {
    if (!base?.name.trim()) return 'Name is required.';
    if (!companyId) return 'No company selected.';
    return null;
  };

  const handleSubmit = useCallback(async () => {
    if (!selected || !base) return;
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const payload: Partial<EmployeeType> = {
        employee_id: selected.employee_id,
        name: base.name.trim(),
        alias: base.alias?.trim() || undefined,
        employee_group_id: base.employee_group_id ?? undefined,
        date_of_joining: base.date_of_joining || undefined,
        define_salary_details: base.define_salary_details === 'Yes' ? 1 : 0,
        employee_code: general.employee_code,
        designation: general.designation,
        function: general.function,
        location: general.location,
        gender: general.gender,
        date_of_birth: general.date_of_birth,
        blood_group: general.blood_group,
        father_name: general.father_name,
        mother_name: general.mother_name,
        spouse_name: general.spouse_name,
        address: general.address,
        city: general.city,
        state: general.state,
        pincode: general.pincode,
        mobile: general.mobile,
        phone: general.phone,
        email: general.email,
        bank_account_number: provideBank === 'Yes' ? bank.bank_account_number : undefined,
        bank_name: provideBank === 'Yes' ? bank.bank_name : undefined,
        bank_branch: provideBank === 'Yes' ? bank.bank_branch : undefined,
        ifsc_code: provideBank === 'Yes' ? bank.ifsc_code : undefined,
        applicable_tax_regime: statutory.applicable_tax_regime,
        pan: statutory.pan,
        aadhaar: statutory.aadhaar,
        uan: statutory.uan,
        pf_account_number: statutory.pf_account_number,
        eps_account_number: statutory.eps_account_number,
        date_of_joining_pf: statutory.date_of_joining_pf,
        pran: statutory.pran,
        esi_number: statutory.esi_number,
        esi_dispensary_name: statutory.esi_dispensary_name,
      };
      const res = await window.api.employee.update(payload);
      if (res.success) {
        // Replace-on-save: createBulk only appends, so soft-delete the previously
        // loaded active rows first, then re-insert the current set (no duplicates).
        await Promise.all(existingStructureIds.map((id) => window.api.salaryStructure.delete(id)));
        if (base.define_salary_details === 'Yes' && salaryRows.length > 0) {
          await window.api.salaryStructure.createBulk(
            companyId!,
            selected.employee_id!,
            salaryEffectiveFrom,
            salaryRows.map((r) => ({
              pay_head_id: r.pay_head_id,
              amount: parseFloat(r.rate) || 0,
              calculation_mode: r.calculation_type || 'Flat Rate',
            })),
          );
        }
        setExistingStructureIds([]);
        setSuccess(`"${base.name}" updated successfully.`);
        await loadData();
        setTimeout(() => {
          setSuccess(null);
          setSelected(null);
          setBase(null);
        }, 1500);
      } else {
        setError(res.error || 'Failed to update employee.');
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unexpected error.');
    } finally {
      setLoading(false);
    }
  }, [
    base,
    general,
    bank,
    statutory,
    provideBank,
    selected,
    loadData,
    companyId,
    salaryRows,
    salaryEffectiveFrom,
    existingStructureIds,
  ]);

  const handleDelete = useCallback(async () => {
    if (!selected) return;
    if (!window.confirm(`Delete "${selected.name}"? This cannot be undone.`)) return;

    setLoading(true);
    setError(null);
    try {
      const res = await window.api.employee.delete(selected.employee_id!);
      if (res.success) {
        setSuccess('Employee deleted successfully.');
        await loadData();
        setTimeout(() => {
          setSuccess(null);
          setSelected(null);
          setBase(null);
        }, 1500);
      } else {
        setError(res.error || 'Failed to delete employee.');
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unexpected error.');
    } finally {
      setLoading(false);
    }
  }, [selected, loadData]);

  const nameGroup = (id?: number) => groups.find((g) => g.employee_group_id === id)?.name ?? '-';

  useMasterShortcuts({
    onAccept: handleSubmit,
    onDelete: handleDelete,
    onQuit: () => {
      if (selected) {
        setSelected(null);
        setBase(null);
      } else {
        navigate('/master/alter');
      }
    },
  });

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.altKey && e.key.toLowerCase() === 'g' && !showGroupPanel) {
        e.preventDefault();
        setShowGroupPanel((p) => !p);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [showGroupPanel]);

  if (!selected || !base) {
    const columns = [
      {
        key: 'name',
        label: 'Name',
        span: 'col-span-4',
        render: (r: EmployeeType) => (
          <span className="font-bold text-zinc-950 uppercase">{r.name}</span>
        ),
      },
      {
        key: 'code',
        label: 'Code',
        span: 'col-span-2',
        render: (r: EmployeeType) => (
          <span className="text-zinc-500 font-mono">{r.employee_code || '—'}</span>
        ),
      },
      {
        key: 'group',
        label: 'Group',
        span: 'col-span-3',
        render: (r: EmployeeType) => (
          <span className="text-zinc-600">{nameGroup(r.employee_group_id)}</span>
        ),
      },
      {
        key: 'designation',
        label: 'Designation',
        span: 'col-span-3',
        render: (r: EmployeeType) => <span className="text-zinc-400">{r.designation || '—'}</span>,
      },
    ];

    return (
      <MasterSelectionPanel
        title="Alter Employee"
        subtitle="Select Employee to Alter"
        searchPlaceholder="Search employees by name..."
        items={employees}
        filterFn={(emp, search) => emp.name.toLowerCase().includes(search.toLowerCase())}
        columns={columns}
        onSelect={selectEmployee}
        onCancel={() => navigate('/master/alter')}
        onCreate={() => navigate('/master/create/employee')}
        createLabel="Create Employee"
        rowKey={(r) => String(r.employee_id)}
        emptyMessage="No employees found."
      />
    );
  }

  const buildTree = (
    parentId: number | null,
  ): (EmployeeGroupType & { children?: EmployeeGroupType[] })[] =>
    groups
      .filter((g) => g.parent_group_id === parentId)
      .map((g) => ({ ...g, children: buildTree(g.employee_group_id ?? null) }));

  const renderTree = (
    nodes: (EmployeeGroupType & { children?: EmployeeGroupType[] })[],
    depth: number = 0,
  ) =>
    nodes.map((node) => (
      <div key={node.employee_group_id}>
        <button
          className="w-full text-left px-2 py-1 text-sm hover:bg-zinc-100 rounded transition-colors"
          style={{ paddingLeft: `${8 + depth * 16}px` }}
          onClick={() => {
            setBase((f) =>
              f ? { ...f, employee_group_id: node.employee_group_id ?? null } : null,
            );
            setSelectedGroup(node);
            setShowGroupPanel(false);
            focusFieldAfter(underRef.current);
          }}
        >
          {node.name}
        </button>
        {node.children && node.children.length > 0 && renderTree(node.children, depth + 1)}
      </div>
    ));

  const alterActions = [
    { key: 'Alt+A', label: 'Accept', onClick: handleSubmit },
    { key: 'Alt+D', label: 'Delete', onClick: handleDelete },
    { key: 'Alt+G', label: 'Toggle Groups', onClick: () => setShowGroupPanel((p) => !p) },
    {
      key: 'Esc',
      label: 'Back',
      onClick: () => {
        setSelected(null);
        setBase(null);
      },
    },
  ];

  return (
    <div
      className="flex flex-col h-full relative overflow-hidden bg-white select-none"
      data-enter-nav
    >
      <PageTitleBar title={`Alter Employee: ${selected.name}`} subtitle={selectedCompany?.name} />

      {error && <AlertBanner type="error" message={error} onDismiss={() => setError(null)} />}
      {success && (
        <AlertBanner type="success" message={success} onDismiss={() => setSuccess(null)} />
      )}

      <div className="flex-1 flex min-h-0 overflow-x-auto">
        <div className="flex-1 flex flex-col min-w-0 shrink-0 bg-white border-r border-zinc-100">
          <div className="p-3 space-y-1.5">
            <FormRow
              label="Name"
              required
              labelWidth="w-44"
              className="flex items-center min-h-[26px]"
            >
              <input
                autoFocus
                className={inputCls}
                value={base.name}
                onChange={setBaseField('name')}
              />
            </FormRow>
            <FormRow label="(alias)" labelWidth="w-44" className="flex items-center min-h-[26px]">
              <input className={inputCls} value={base.alias} onChange={setBaseField('alias')} />
            </FormRow>
          </div>

          <div className="p-3 border-t border-zinc-100 bg-zinc-50/20">
            <div
              ref={underRef}
              tabIndex={0}
              data-enter-click
              className="flex items-center min-h-[26px] cursor-pointer hover:bg-zinc-100/60 focus:bg-zinc-100 outline-none px-2 py-0.5 rounded"
              onClick={() => setShowGroupPanel(!showGroupPanel)}
            >
              <span className="w-20 text-sm shrink-0 font-medium text-zinc-500">Under</span>
              <span className="text-zinc-400 mr-2 shrink-0">:</span>
              <span className="text-sm font-semibold text-zinc-800 underline decoration-dotted">
                {selectedGroup?.name || 'Primary'}
              </span>
            </div>
          </div>

          <div className="p-3 border-t border-zinc-100 space-y-1.5">
            <FormRow
              label="Date of Joining"
              labelWidth="w-44"
              className="flex items-center min-h-[26px]"
            >
              <input
                type="date"
                className={inputCls}
                value={base.date_of_joining}
                onChange={setBaseField('date_of_joining')}
              />
            </FormRow>
            <FormRow
              label="Define Salary Details"
              labelWidth="w-44"
              className="flex items-center min-h-[26px]"
            >
              <select
                className={selectCls}
                value={base.define_salary_details}
                onChange={(e) => {
                  const yes = e.target.value === 'Yes';
                  setBase((f) => (f ? { ...f, define_salary_details: yes ? 'Yes' : 'No' } : null));
                  if (yes) setShowSalaryModal(true);
                  else setSalaryRows([]);
                }}
              >
                <option>No</option>
                <option>Yes</option>
              </select>
            </FormRow>
            {base.define_salary_details === 'Yes' && salaryRows.length > 0 && (
              <button
                type="button"
                onClick={() => setShowSalaryModal(true)}
                className="ml-44 text-xs text-zinc-500 underline hover:text-zinc-900"
              >
                {salaryRows.length} pay head{salaryRows.length !== 1 ? 's' : ''} defined — click to
                edit
              </button>
            )}
          </div>
          <div className="flex-1" />
        </div>

        <div className="w-[520px] border-l border-zinc-200 flex flex-col overflow-y-auto shrink-0 bg-zinc-50/25">
          <GeneralInfoSection data={general} onChange={setGenField} />
          <BankDetailsSection
            data={bank}
            provideBank={provideBank}
            onProvideChange={(e) => setProvideBank(e.target.value as 'No' | 'Yes')}
            onChange={setBankField}
          />
          <StatutoryDetailsSection data={statutory} onChange={setStatField} />
        </div>

        {showGroupPanel && (
          <div
            className="w-72 border-l border-zinc-200 flex flex-col shrink-0 bg-white"
            data-enter-nav-ignore
          >
            <div className="px-3 py-2 border-b bg-zinc-50 text-xs font-bold text-zinc-500 uppercase flex justify-between items-center">
              <span>List of Employee Groups</span>
              <button
                onClick={() => setShowGroupPanel(false)}
                className="text-sm font-bold text-zinc-400 hover:text-zinc-800"
              >
                &times;
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              <button
                className="w-full text-left px-3 py-1.5 text-sm hover:bg-zinc-100 font-medium transition-colors"
                onClick={() => {
                  setBase((f) => (f ? { ...f, employee_group_id: null } : null));
                  setSelectedGroup(null);
                  setShowGroupPanel(false);
                  focusFieldAfter(underRef.current);
                }}
              >
                Primary
              </button>
              {renderTree(buildTree(null))}
            </div>
          </div>
        )}

        <RightActionPanel actions={alterActions} />
      </div>

      <MasterFormFooter
        onCancel={() => {
          setSelected(null);
          setBase(null);
        }}
        onSubmit={handleSubmit}
        onDelete={handleDelete}
        submitLabel="Accept"
        cancelLabel="Back"
        loading={loading}
      />

      {showSalaryModal && (
        <div data-enter-nav-ignore className="contents">
          <SalaryDetailsModal
            name={base.name}
            under={selectedGroup?.name || 'Primary'}
            companyId={companyId}
            effectiveFrom={salaryEffectiveFrom}
            initialRows={salaryRows}
            onAccept={(rows, eff) => {
              setSalaryRows(rows);
              setSalaryEffectiveFrom(eff);
              setShowSalaryModal(false);
              setBase((f) =>
                f ? { ...f, define_salary_details: rows.length === 0 ? 'No' : 'Yes' } : null,
              );
            }}
            onClose={() => {
              setShowSalaryModal(false);
              if (salaryRows.length === 0)
                setBase((f) => (f ? { ...f, define_salary_details: 'No' } : null));
            }}
          />
        </div>
      )}
    </div>
  );
}
