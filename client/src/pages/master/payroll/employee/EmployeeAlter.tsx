import { useState, useEffect, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useCompany } from "@/context/CompanyContext";
import { FormRow, PageTitleBar, SearchInput, DataTable } from "@/components/ui";
import GeneralInfoSection from "@/components/payroll/GeneralInfoSection";
import BankDetailsSection from "@/components/payroll/BankDetailsSection";
import StatutoryDetailsSection from "@/components/payroll/StatutoryDetailsSection";
import type { EmployeeType, EmployeeGroupType } from "@/types/entities/Employee";
import type { GeneralInfoData } from "@/components/payroll/GeneralInfoSection";
import type { BankDetailsData } from "@/components/payroll/BankDetailsSection";
import type { StatutoryDetailsData } from "@/components/payroll/StatutoryDetailsSection";

const inputCls = "flex-1 bg-transparent text-sm outline-none px-1.5 py-0.5 border border-transparent hover:border-zinc-200 focus:border-zinc-800 transition-colors bg-white/50 rounded";
const selectCls = "bg-transparent text-sm outline-none px-1.5 py-0.5 border border-transparent hover:border-zinc-200 focus:border-zinc-800 transition-colors bg-white/50 rounded";

export default function EmployeeAlter() {
  const navigate = useNavigate();
  const location = useLocation();
  const { selectedCompany } = useCompany();
  const companyId = selectedCompany?.company_id;
  const [employees, setEmployees] = useState<EmployeeType[]>([]);
  const [groups, setGroups] = useState<EmployeeGroupType[]>([]);
  const [selected, setSelected] = useState<EmployeeType | null>(null);
  const [base, setBase] = useState<{ name: string; alias: string; date_of_joining: string; define_salary_details: string; employee_group_id: number | null }>({ name: "", alias: "", date_of_joining: "", define_salary_details: "No", employee_group_id: null });
  const [general, setGeneral] = useState<GeneralInfoData>({});
  const [bank, setBank] = useState<BankDetailsData>({});
  const [statutory, setStatutory] = useState<StatutoryDetailsData>({ applicable_tax_regime: "New Tax Regime" });
  const [provideBank, setProvideBank] = useState<"No" | "Yes">("No");
  const [selectedGroup, setSelectedGroup] = useState<EmployeeGroupType | null>(null);
  const [showGroupPanel, setShowGroupPanel] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (!companyId) return;
    const [eRes, gRes] = await Promise.all([window.api.employee.getAll(companyId), window.api.employeeGroup.getAll(companyId)]);
    if (eRes.success) setEmployees(eRes.employees ?? []);
    if (gRes.success) setGroups(gRes.employeeGroups ?? []);
  }, [companyId]);

  useEffect(() => { loadData(); }, [loadData]);

  const selectEmployee = (e: EmployeeType) => {
    setSelected(e);
    setBase({ name: e.name, alias: e.alias || "", date_of_joining: e.date_of_joining || "", define_salary_details: e.define_salary_details ? "Yes" : "No", employee_group_id: e.employee_group_id ?? null });
    setGeneral({ employee_code: e.employee_code, designation: e.designation, function: e.function, location: e.location, gender: e.gender, date_of_birth: e.date_of_birth, blood_group: e.blood_group, father_name: e.father_name, mother_name: e.mother_name, spouse_name: e.spouse_name, address: e.address, city: e.city, state: e.state, pincode: e.pincode, mobile: e.mobile, phone: e.phone, email: e.email });
    setBank({ bank_account_number: e.bank_account_number, bank_name: e.bank_name, bank_branch: e.bank_branch, ifsc_code: e.ifsc_code });
    setProvideBank(e.bank_name ? "Yes" : "No");
    setStatutory({ applicable_tax_regime: e.applicable_tax_regime || "New Tax Regime", pan: e.pan, aadhaar: e.aadhaar, uan: e.uan, pf_account_number: e.pf_account_number, eps_account_number: e.eps_account_number, date_of_joining_pf: e.date_of_joining_pf, pran: e.pran, esi_number: e.esi_number, esi_dispensary_name: e.esi_dispensary_name });
    const g = groups.find(g => g.employee_group_id === e.employee_group_id);
    setSelectedGroup(g || null);
  };

  useEffect(() => {
    const preSelectId = (location.state as any)?.employeeId;
    if (preSelectId && employees.length > 0) {
      const e = employees.find(e => e.employee_id === preSelectId);
      if (e) selectEmployee(e);
    }
  }, [location.state, employees]);

  const setBaseField = (key: keyof typeof base) => (ev: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setBase(f => ({ ...f, [key]: key === "define_salary_details" ? (ev.target.value === "Yes" ? "Yes" : "No") : ev.target.value }));
  const setGenField = (key: keyof GeneralInfoData) => (ev: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setGeneral(f => ({ ...f, [key]: ev.target.value }));
  const setBankField = (key: keyof BankDetailsData) => (ev: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setBank(f => ({ ...f, [key]: ev.target.value }));
  const setStatField = (key: keyof StatutoryDetailsData) => (ev: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setStatutory(f => ({ ...f, [key]: ev.target.value }));

  const handleSubmit = useCallback(async () => {
    if (!selected) return;
    setLoading(true); setError(null);
    try {
      const payload: Partial<EmployeeType> = {
        employee_id: selected.employee_id, name: base.name.trim(), alias: base.alias?.trim() || undefined, employee_group_id: base.employee_group_id ?? undefined, date_of_joining: base.date_of_joining || undefined, define_salary_details: base.define_salary_details === "Yes" ? 1 : 0,
        employee_code: general.employee_code, designation: general.designation, function: general.function, location: general.location,
        gender: general.gender, date_of_birth: general.date_of_birth, blood_group: general.blood_group, father_name: general.father_name, mother_name: general.mother_name, spouse_name: general.spouse_name,
        address: general.address, city: general.city, state: general.state, pincode: general.pincode, mobile: general.mobile, phone: general.phone, email: general.email,
        bank_account_number: provideBank === "Yes" ? bank.bank_account_number : undefined, bank_name: provideBank === "Yes" ? bank.bank_name : undefined, bank_branch: provideBank === "Yes" ? bank.bank_branch : undefined, ifsc_code: provideBank === "Yes" ? bank.ifsc_code : undefined,
        applicable_tax_regime: statutory.applicable_tax_regime, pan: statutory.pan, aadhaar: statutory.aadhaar, uan: statutory.uan, pf_account_number: statutory.pf_account_number, eps_account_number: statutory.eps_account_number, date_of_joining_pf: statutory.date_of_joining_pf, pran: statutory.pran, esi_number: statutory.esi_number, esi_dispensary_name: statutory.esi_dispensary_name,
      };
      const res = await window.api.employee.update(payload);
      if (res.success) { setSuccess(`"${base.name}" updated.`); await loadData(); setTimeout(() => { setSuccess(null); setSelected(null); }, 1500); }
      else setError(res.error || "Failed.");
    } catch (e) { setError(e instanceof Error ? e.message : "Error."); }
    finally { setLoading(false); }
  }, [base, general, bank, statutory, provideBank, selected, loadData]);

  const handleDelete = useCallback(async () => {
    if (!selected) return;
    setLoading(true); setError(null);
    try {
      const res = await window.api.employee.delete(selected.employee_id!);
      if (res.success) { setSuccess("Employee deleted."); await loadData(); setTimeout(() => { setSuccess(null); setSelected(null); }, 1500); }
      else setError(res.error || "Failed.");
    } catch (e) { setError(e instanceof Error ? e.message : "Error."); }
    finally { setLoading(false); }
  }, [selected, loadData]);

  const nameGroup = (id?: number) => groups.find(g => g.employee_group_id === id)?.name ?? "-";

  if (!selected) {
  const _selActions: any = []; void _selActions;
    return (
      <div className="flex-1 flex flex-col h-full bg-white select-none">
        <PageTitleBar title="Alter Employee" subtitle="Select Employee to Alter" />
        <div className="flex-1 flex min-h-0">
          <div className="flex-1 flex flex-col min-w-0">
            <SearchInput value="" onChange={() => {}} placeholder="Filter employees..." />
            <div className="flex-1 overflow-y-auto">
              <DataTable columns={[{ key: "name", label: "Name", span: "col-span-3", render: (r: EmployeeType) => <span className="font-medium">{r.name}</span> }, { key: "code", label: "Code", span: "col-span-2", render: (r: EmployeeType) => <span className="text-zinc-500">{r.employee_code || "-"}</span> }, { key: "group", label: "Group", span: "col-span-3", render: (r: EmployeeType) => <span>{nameGroup(r.employee_group_id)}</span> }, { key: "designation", label: "Designation", span: "col-span-4", render: (r: EmployeeType) => <span className="text-zinc-400">{r.designation || "-"}</span> }]} rows={employees} rowKey={(r) => String(r.employee_id)} onRowClick={selectEmployee} />
            </div>
          </div>
        </div>
        <div className="border-t p-3 bg-zinc-50"><button onClick={() => navigate("/master/alter")} className="text-xs text-zinc-500">&larr; Back</button></div>
      </div>
    );
  }

  const buildTree = (parentId: number | null): (EmployeeGroupType & { children?: EmployeeGroupType[] })[] => groups.filter(g => g.parent_group_id === parentId).map(g => ({ ...g, children: buildTree(g.employee_group_id ?? null) }));
  const renderTree = (nodes: (EmployeeGroupType & { children?: EmployeeGroupType[] })[], depth: number = 0) => nodes.map(node => (
    <div key={node.employee_group_id}>
      <button className="w-full text-left px-2 py-1 text-sm hover:bg-zinc-100 rounded" style={{ paddingLeft: `${8 + depth * 16}px` }}
        onClick={() => { setBase(f => ({ ...f, employee_group_id: node.employee_group_id ?? null })); setSelectedGroup(node); setShowGroupPanel(false); }}>{node.name}</button>
      {node.children?.length > 0 && renderTree(node.children, depth + 1)}
    </div>
  ));

  const _editActions: any = []; void _editActions;

  return (
    <div className="flex-1 flex flex-col h-full bg-white select-none">
      <PageTitleBar title="Alter Employee" subtitle={selectedCompany?.name} />
      {error && (<div className="px-3 py-1.5 border-b border-red-200 bg-red-50 text-red-700 text-xs flex justify-between"><span>* {error}</span><button onClick={() => setError(null)} className="text-red-500 font-bold">&times;</button></div>)}
      {success && (<div className="px-3 py-1.5 border-b border-green-200 bg-green-50 text-green-700 text-xs flex justify-between"><span>* {success}</span><button onClick={() => setSuccess(null)} className="text-green-500 font-bold">&times;</button></div>)}
      <div className="flex-1 flex min-h-0 overflow-x-auto">
        <div className="flex-1 flex flex-col min-w-0 shrink-0 bg-white">
          <div className="p-3 space-y-1">
            <FormRow label="Name" required labelWidth="w-44"><input className={inputCls} value={base.name} onChange={setBaseField("name")} /></FormRow>
            <FormRow label="(alias)" labelWidth="w-44"><input className={inputCls} value={base.alias} onChange={setBaseField("alias")} /></FormRow>
          </div>
          <div className="p-3 border-t border-zinc-100 bg-zinc-50/20">
            <div className="flex items-center min-h-[26px] cursor-pointer hover:bg-zinc-100/60 px-2 py-0.5 rounded" onClick={() => setShowGroupPanel(!showGroupPanel)}>
              <span className="w-20 text-sm shrink-0 font-medium text-zinc-500">Under</span><span className="text-zinc-400 mr-2">:</span>
              <span className="text-sm font-semibold text-zinc-800 underline decoration-dotted">{selectedGroup?.name || "Primary"}</span>
            </div>
          </div>
          <div className="p-3 border-t border-zinc-100 space-y-1">
            <FormRow label="Date of Joining" labelWidth="w-44"><input type="date" className={inputCls} value={base.date_of_joining} onChange={setBaseField("date_of_joining")} /></FormRow>
            <FormRow label="Define Salary Details" labelWidth="w-44"><select className={selectCls} value={base.define_salary_details} onChange={setBaseField("define_salary_details")}><option>No</option><option>Yes</option></select></FormRow>
          </div>
          <div className="flex-1" />
        </div>
        <div className="w-[520px] border-l border-zinc-200 flex flex-col overflow-y-auto shrink-0 bg-zinc-50/25">
          <GeneralInfoSection data={general} onChange={setGenField} />
          <BankDetailsSection data={bank} provideBank={provideBank} onProvideChange={(e) => setProvideBank(e.target.value as "No" | "Yes")} onChange={setBankField} />
          <StatutoryDetailsSection data={statutory} onChange={setStatField} />
        </div>
        {showGroupPanel && (
          <div className="w-72 border-l border-zinc-200 flex flex-col shrink-0 bg-white">
            <div className="px-3 py-2 border-b bg-zinc-50 text-xs font-bold text-zinc-500 uppercase flex justify-between"><span>List of Employee Groups</span><button onClick={() => setShowGroupPanel(false)} className="text-sm font-bold text-zinc-400">&times;</button></div>
            <div className="flex-1 overflow-y-auto">
              <button className="w-full text-left px-3 py-1.5 text-sm hover:bg-zinc-100 font-medium" onClick={() => { setBase(f => ({ ...f, employee_group_id: null })); setSelectedGroup(null); setShowGroupPanel(false); }}>Primary</button>
              {renderTree(buildTree(null))}
            </div>
          </div>
        )}
      </div>
      <div className="border-t p-3 flex justify-between bg-zinc-50">
        <div className="flex gap-2"><button onClick={() => setSelected(null)} className="text-xs text-zinc-500">&larr; Back</button><button onClick={handleDelete} disabled={loading} className="text-xs text-red-500 font-medium">Delete</button></div>
        <button onClick={handleSubmit} disabled={loading} className="text-sm px-6 py-1.5 rounded bg-black text-white hover:bg-zinc-800 disabled:opacity-50">{loading ? "Saving..." : "Accept"}</button>
      </div>
    </div>
  );
}
