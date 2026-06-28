import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useCompany } from "@/context/CompanyContext";
import { FormRow, PageTitleBar, RightActionPanel, MasterFormFooter, AlertBanner } from "@/components/ui";
import { useMasterShortcuts } from "@/hooks/useMasterShortcuts";
import GeneralInfoSection from "@/components/payroll/GeneralInfoSection";
import BankDetailsSection from "@/components/payroll/BankDetailsSection";
import StatutoryDetailsSection from "@/components/payroll/StatutoryDetailsSection";
import type { GeneralInfoData } from "@/components/payroll/GeneralInfoSection";
import type { BankDetailsData } from "@/components/payroll/BankDetailsSection";
import type { StatutoryDetailsData } from "@/components/payroll/StatutoryDetailsSection";
import type { EmployeeGroupType, EmployeeType } from "@/types/entities/Employee";
import SalaryDetailsModal, { type SalaryRow, fyStartISO } from "@/components/payroll/SalaryDetailsModal";

const inputCls = "flex-1 bg-transparent text-sm outline-none px-1.5 py-0.5 border border-transparent hover:border-zinc-200 focus:border-zinc-800 transition-colors bg-white/50 rounded";
const selectCls = "bg-transparent text-sm outline-none px-1.5 py-0.5 border border-transparent hover:border-zinc-200 focus:border-zinc-800 transition-colors bg-white/50 rounded w-24";

type BaseForm = Pick<EmployeeType, "name" | "alias" | "date_of_joining" | "define_salary_details" | "employee_group_id">;

const INITIAL_BASE: BaseForm = { name: "", alias: "", date_of_joining: "", define_salary_details: 0, employee_group_id: undefined };

const INITIAL_GENERAL: GeneralInfoData = {};
const INITIAL_BANK: BankDetailsData = {};
const INITIAL_STATUTORY: StatutoryDetailsData = { applicable_tax_regime: "New Tax Regime" };

export default function EmployeeCreate() {
  const navigate = useNavigate();
  const { selectedCompany } = useCompany();
  const companyId = selectedCompany?.company_id;
  const [base, setBase] = useState<BaseForm>(INITIAL_BASE);
  const [general, setGeneral] = useState<GeneralInfoData>(INITIAL_GENERAL);
  const [bank, setBank] = useState<BankDetailsData>(INITIAL_BANK);
  const [statutory, setStatutory] = useState<StatutoryDetailsData>(INITIAL_STATUTORY);
  const [provideBank, setProvideBank] = useState<"No" | "Yes">("No");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [groups, setGroups] = useState<EmployeeGroupType[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<EmployeeGroupType | null>(null);
  const [showGroupPanel, setShowGroupPanel] = useState(false);
  const [showSalaryModal, setShowSalaryModal] = useState(false);
  const [salaryRows, setSalaryRows] = useState<SalaryRow[]>([]);
  const [salaryEffectiveFrom, setSalaryEffectiveFrom] = useState(fyStartISO());

  useEffect(() => {
    if (!companyId) return;
    window.api.employeeGroup.getAll(companyId).then((res) => {
      if (res.success) {
        setGroups(res.employeeGroups);
        const primary = res.employeeGroups.find((g: EmployeeGroupType) => g.name === "Primary");
        if (primary) {
          setSelectedGroup(primary);
          setBase(b => ({ ...b, employee_group_id: primary.employee_group_id }));
        }
      }
    });
  }, [companyId]);

  const setBaseField = (key: keyof BaseForm) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setBase(f => ({ ...f, [key]: key === "define_salary_details" ? (e.target.value === "Yes" ? 1 : 0) : e.target.value }));

  const setGeneralField = (key: keyof GeneralInfoData) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setGeneral(f => ({ ...f, [key]: e.target.value }));

  const setBankField = (key: keyof BankDetailsData) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setBank(f => ({ ...f, [key]: e.target.value }));

  const setStatutoryField = (key: keyof StatutoryDetailsData) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setStatutory(f => ({ ...f, [key]: e.target.value }));

  const validate = (): string | null => {
    if (!base.name.trim()) return "Name is required.";
    if (!companyId) return "No company selected.";
    return null;
  };

  const handleSubmit = useCallback(async () => {
    const err = validate();
    if (err) { setError(err); return; }
    setLoading(true); setError(null);
    try {
      const payload: Partial<EmployeeType> = {
        company_id: companyId!,
        name: base.name.trim(),
        alias: base.alias?.trim() || undefined,
        employee_group_id: base.employee_group_id,
        date_of_joining: base.date_of_joining || undefined,
        define_salary_details: base.define_salary_details,
        employee_code: general.employee_code || undefined,
        designation: general.designation || undefined,
        function: general.function || undefined,
        location: general.location || undefined,
        gender: general.gender || undefined,
        date_of_birth: general.date_of_birth || undefined,
        blood_group: general.blood_group || undefined,
        father_name: general.father_name || undefined,
        mother_name: general.mother_name || undefined,
        spouse_name: general.spouse_name || undefined,
        address: general.address || undefined,
        city: general.city || undefined,
        state: general.state || undefined,
        pincode: general.pincode || undefined,
        mobile: general.mobile || undefined,
        phone: general.phone || undefined,
        email: general.email || undefined,
      };

      if (provideBank === "Yes") {
        payload.bank_account_number = bank.bank_account_number || undefined;
        payload.bank_name = bank.bank_name || undefined;
        payload.bank_branch = bank.bank_branch || undefined;
        payload.ifsc_code = bank.ifsc_code || undefined;
      }

      payload.applicable_tax_regime = statutory.applicable_tax_regime || undefined;
      payload.pan = statutory.pan || undefined;
      payload.aadhaar = statutory.aadhaar || undefined;
      payload.uan = statutory.uan || undefined;
      payload.pf_account_number = statutory.pf_account_number || undefined;
      payload.eps_account_number = statutory.eps_account_number || undefined;
      payload.date_of_joining_pf = statutory.date_of_joining_pf || undefined;
      payload.pran = statutory.pran || undefined;
      payload.esi_number = statutory.esi_number || undefined;
      payload.esi_dispensary_name = statutory.esi_dispensary_name || undefined;

      const result = await window.api.employee.create(payload);
      if (result.success) {
        // Persist the salary structure if salary details were defined.
        const newEmployeeId = result.employee?.employee_id;
        if (base.define_salary_details === 1 && salaryRows.length > 0 && newEmployeeId) {
          await window.api.salaryStructure.createBulk(
            companyId!,
            newEmployeeId,
            salaryEffectiveFrom,
            salaryRows.map((r) => ({
              pay_head_id: r.pay_head_id,
              amount: parseFloat(r.rate) || 0,
              calculation_mode: r.calculation_type || "Flat Rate",
            }))
          );
        }
        setSuccess(`Employee "${base.name}" created.`);
        setBase(INITIAL_BASE);
        setGeneral(INITIAL_GENERAL);
        setBank(INITIAL_BANK);
        setStatutory({ applicable_tax_regime: "New Tax Regime" });
        setProvideBank("No");
        setSalaryRows([]);
        setSalaryEffectiveFrom(fyStartISO());
        setTimeout(() => setSuccess(null), 3000);
      } else {
        setError(result.error || "Failed to create employee.");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unexpected error.");
    } finally {
      setLoading(false);
    }
  }, [base, general, bank, statutory, provideBank, companyId, salaryRows, salaryEffectiveFrom]);

  useMasterShortcuts({
    onAccept: handleSubmit,
    onQuit: () => {
      if (!showGroupPanel) navigate("/master/create");
    },
    onCreate: () => navigate("/master/alter/employee"),
  });

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.altKey && e.key.toLowerCase() === "g" && !showGroupPanel) {
        e.preventDefault();
        setShowGroupPanel(p => !p);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [showGroupPanel]);

  const buildTree = (parentId: number | null): (EmployeeGroupType & { children?: EmployeeGroupType[] })[] => {
    return groups
      .filter(g => g.parent_group_id === parentId)
      .map(g => ({ ...g, children: buildTree(g.employee_group_id || null) }));
  };

  const renderTree = (nodes: (EmployeeGroupType & { children?: EmployeeGroupType[] })[], depth: number = 0) => {
    return nodes.map(node => (
      <div key={node.employee_group_id}>
        <button
          className={`w-full text-left px-2 py-1 text-sm hover:bg-zinc-100 rounded transition-colors ${node.employee_group_id === selectedGroup?.employee_group_id ? "bg-zinc-200 font-semibold" : ""}`}
          style={{ paddingLeft: `${8 + depth * 16}px` }}
          onClick={() => {
            setSelectedGroup(node);
            setBase(f => ({ ...f, employee_group_id: node.employee_group_id }));
            setShowGroupPanel(false);
          }}
        >
          {node.is_predefined ? "◆ " : "◇ "}{node.name}
        </button>
        {node.children && node.children.length > 0 && renderTree(node.children, depth + 1)}
      </div>
    ));
  };

  const employeeActions = [
    { key: "Alt+A", label: "Accept", onClick: handleSubmit },
    { key: "Alt+C", label: "Alter Mode", onClick: () => navigate("/master/alter/employee") },
    { key: "Alt+G", label: "Toggle Groups", onClick: () => setShowGroupPanel(p => !p) },
    { key: "Esc", label: "Quit", onClick: () => navigate("/master/create") },
  ];

  return (
    <div className="flex-1 flex flex-col h-full bg-white select-none">
      <PageTitleBar title="Employee Creation" subtitle={selectedCompany?.name} />

      {error && <AlertBanner type="error" message={error} onDismiss={() => setError(null)} />}
      {success && <AlertBanner type="success" message={success} onDismiss={() => setSuccess(null)} />}

      <div className="flex-1 flex min-h-0 overflow-x-auto">
        {/* Left: Basic info */}
        <div className="flex-1 flex flex-col min-w-0 shrink-0 bg-white">
          <div className="p-3 space-y-1.5">
            <FormRow label="Name" required labelWidth="w-44" className="flex items-center min-h-[26px]">
              <input autoFocus className={inputCls} value={base.name} onChange={setBaseField("name")} />
            </FormRow>
            <FormRow label="(alias)" labelWidth="w-44" className="flex items-center min-h-[26px]">
              <input className={inputCls} value={base.alias || ""} onChange={setBaseField("alias")} />
            </FormRow>
          </div>

          <div className="p-3 border-t border-zinc-100 bg-zinc-50/20">
            <div className="flex items-center min-h-[26px] cursor-pointer hover:bg-zinc-100/60 px-2 py-0.5 rounded" onClick={() => setShowGroupPanel(!showGroupPanel)}>
              <span className="w-20 text-sm shrink-0 font-medium text-zinc-500">Under</span>
              <span className="text-zinc-400 mr-2 shrink-0">:</span>
              <span className="text-sm font-semibold text-zinc-800 underline decoration-dotted">{selectedGroup?.name || "-"}</span>
            </div>
          </div>

          <div className="p-3 border-t border-zinc-100 space-y-1.5">
            <FormRow label="Date of Joining" labelWidth="w-44" className="flex items-center min-h-[26px]">
              <input type="date" className={inputCls} value={base.date_of_joining || ""} onChange={setBaseField("date_of_joining")} />
            </FormRow>
            <FormRow label="Define Salary Details" labelWidth="w-44" className="flex items-center min-h-[26px]">
              <select
                className={selectCls}
                value={base.define_salary_details ? "Yes" : "No"}
                onChange={(e) => {
                  const yes = e.target.value === "Yes";
                  setBase(f => ({ ...f, define_salary_details: yes ? 1 : 0 }));
                  if (yes) setShowSalaryModal(true);
                  else setSalaryRows([]);
                }}
              >
                <option>No</option>
                <option>Yes</option>
              </select>
            </FormRow>
            {base.define_salary_details === 1 && salaryRows.length > 0 && (
              <button
                type="button"
                onClick={() => setShowSalaryModal(true)}
                className="ml-44 text-xs text-zinc-500 underline hover:text-zinc-900"
              >
                {salaryRows.length} pay head{salaryRows.length !== 1 ? "s" : ""} defined — click to edit
              </button>
            )}
          </div>
          <div className="flex-1" />
        </div>

        <div className="w-[520px] border-l border-zinc-200 flex flex-col overflow-y-auto shrink-0 bg-zinc-50/25">
          <GeneralInfoSection data={general} onChange={setGeneralField} />
          <BankDetailsSection data={bank} provideBank={provideBank} onProvideChange={(e) => setProvideBank(e.target.value as "No" | "Yes")} onChange={setBankField} />
          <StatutoryDetailsSection data={statutory} onChange={setStatutoryField} />
        </div>

        {showGroupPanel && (
          <div className="w-72 border-l border-zinc-200 flex flex-col shrink-0 bg-white">
            <div className="px-3 py-2 border-b border-zinc-200 bg-zinc-50 text-xs font-bold text-zinc-500 uppercase tracking-wider flex justify-between items-center">
              <span>List of Employee Groups</span>
              <button onClick={() => setShowGroupPanel(false)} className="text-sm font-bold text-zinc-400 hover:text-zinc-800">&times;</button>
            </div>
            <div className="flex-1 overflow-y-auto">{renderTree(buildTree(null))}</div>
          </div>
        )}

        <RightActionPanel actions={employeeActions} />
      </div>

      <MasterFormFooter
        onCancel={() => navigate("/master/create")}
        onSubmit={handleSubmit}
        submitLabel="Create"
        loading={loading}
      />

      {showSalaryModal && (
        <SalaryDetailsModal
          name={base.name}
          under={selectedGroup?.name || "Primary"}
          companyId={companyId}
          effectiveFrom={salaryEffectiveFrom}
          initialRows={salaryRows}
          onAccept={(rows, eff) => {
            setSalaryRows(rows);
            setSalaryEffectiveFrom(eff);
            setShowSalaryModal(false);
            if (rows.length === 0) setBase(f => ({ ...f, define_salary_details: 0 }));
          }}
          onClose={() => {
            setShowSalaryModal(false);
            if (salaryRows.length === 0) setBase(f => ({ ...f, define_salary_details: 0 }));
          }}
        />
      )}
    </div>
  );
}
