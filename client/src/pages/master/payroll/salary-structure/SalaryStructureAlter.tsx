import { useState, useEffect, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useCompany } from "@/context/CompanyContext";
import { FormRow, PageTitleBar, SearchInput, DataTable } from "@/components/ui";
import type { SalaryStructureType, PayHeadType } from "@/types/entities/Payroll";
import type { EmployeeType } from "@/types/entities/Employee";

const inputCls = "flex-1 bg-transparent text-sm outline-none px-1.5 py-0.5 border border-transparent hover:border-zinc-200 focus:border-zinc-800 transition-colors bg-white/50 rounded";
const selectCls = "bg-transparent text-sm outline-none px-1.5 py-0.5 border border-transparent hover:border-zinc-200 focus:border-zinc-800 transition-colors bg-white/50 rounded";

export default function SalaryStructureAlter() {
  const navigate = useNavigate();
  const location = useLocation();
  const { selectedCompany } = useCompany();
  const companyId = selectedCompany?.company_id;
  const [structures, setStructures] = useState<SalaryStructureType[]>([]);
  const [_employees, setEmployees] = useState<EmployeeType[]>([]);
  const [_payHeads, setPayHeads] = useState<PayHeadType[]>([]);
  const [selected, setSelected] = useState<SalaryStructureType | null>(null);
  const [form, setForm] = useState<{ effective_from: string; amount: number; calculation_mode: string; employee_id: string; pay_head_id: string }>({ effective_from: "", amount: 0, calculation_mode: "Flat Rate", employee_id: "", pay_head_id: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (!companyId) return;
    const [sRes, eRes, pRes] = await Promise.all([window.api.salaryStructure.getAll(companyId), window.api.employee.getAll(companyId), window.api.payHead.getAll(companyId)]);
    if (sRes.success) setStructures(sRes.salaryStructures ?? []);
    if (eRes.success) setEmployees(eRes.employees ?? []);
    if (pRes.success) setPayHeads(pRes.payHeads ?? []);
  }, [companyId]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleSelect = (s: SalaryStructureType) => {
    setSelected(s);
    setForm({ effective_from: s.effective_from || "", amount: s.amount ?? 0, calculation_mode: s.calculation_mode || "Flat Rate", employee_id: s.employee_id ? String(s.employee_id) : "", pay_head_id: s.pay_head_id ? String(s.pay_head_id) : "" });
  };

  useEffect(() => {
    const preSelectId = (location.state as any)?.structureId;
    if (preSelectId && structures.length > 0) {
      const s = structures.find(s => s.structure_id === preSelectId);
      if (s) handleSelect(s);
    }
  }, [location.state, structures]);

  const setField = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setForm(f => ({ ...f, [key]: e.target.value }));
  const setNumber = (key: "amount") => (e: React.ChangeEvent<HTMLInputElement>) => setForm(f => ({ ...f, [key]: e.target.value === "" ? 0 : Number(e.target.value) }));

  const handleSubmit = useCallback(async () => {
    if (!selected) return;
    setLoading(true); setError(null);
    try {
      const res = await window.api.salaryStructure.update({ structure_id: selected.structure_id, employee_id: Number(form.employee_id), effective_from: form.effective_from, pay_head_id: Number(form.pay_head_id), amount: form.amount, calculation_mode: form.calculation_mode });
      if (res.success) { setSuccess("Salary structure updated."); await loadData(); setTimeout(() => { setSuccess(null); setSelected(null); }, 1500); }
      else setError("Failed to update.");
    } catch (e) { setError(e instanceof Error ? e.message : "Error."); }
    finally { setLoading(false); }
  }, [form, selected, loadData]);

  const handleDelete = useCallback(async () => {
    if (!selected) return;
    setLoading(true); setError(null);
    try {
      const res = await window.api.salaryStructure.delete(selected.structure_id!);
      if (res.success) { setSuccess("Structure deleted."); await loadData(); setTimeout(() => { setSuccess(null); setSelected(null); }, 1500); }
      else setError("Failed to delete.");
    } catch (e) { setError(e instanceof Error ? e.message : "Error."); }
    finally { setLoading(false); }
  }, [selected, loadData]);

  const empName = (id?: number) => _employees.find(e => e.employee_id === id)?.name ?? "-";
  const phName = (id?: number) => _payHeads.find(p => p.pay_head_id === id)?.name ?? "-";

  if (!selected) {
  const _selActions: any = []; void _selActions;
    return (
      <div className="flex-1 flex flex-col h-full bg-white select-none">
        <PageTitleBar title="Alter Salary Structure" subtitle="Select Structure to Alter" />
        <div className="flex-1 flex min-h-0">
          <div className="flex-1 flex flex-col min-w-0">
            <SearchInput value="" onChange={() => {}} placeholder="Filter structures..." />
            <div className="flex-1 overflow-y-auto">
              <DataTable columns={[{ key: "employee", label: "Employee", span: "col-span-4", render: (r: SalaryStructureType) => <span className="font-medium">{empName(r.employee_id)}</span> }, { key: "pay_head", label: "Pay Head", span: "col-span-3", render: (r: SalaryStructureType) => <span className="text-zinc-500">{phName(r.pay_head_id)}</span> }, { key: "amount", label: "Amount", span: "col-span-2", render: (r: SalaryStructureType) => <span className="text-zinc-600 text-right">{r.amount}</span> }, { key: "effective", label: "Effective", span: "col-span-3", render: (r: SalaryStructureType) => <span className="text-zinc-400">{r.effective_from}</span> }]} rows={structures} rowKey={(r) => String(r.structure_id)} onRowClick={handleSelect} />
            </div>
          </div>
        </div>
        <div className="border-t p-3 bg-zinc-50"><button onClick={() => navigate("/master/alter")} className="text-xs text-zinc-500">&larr; Back</button></div>
      </div>
    );
  }

  const _editActions: any = []; void _editActions;

  return (
    <div className="flex-1 flex flex-col h-full bg-white select-none">
      <PageTitleBar title="Alter Salary Structure" subtitle={selectedCompany?.name} />
      {error && (<div className="px-3 py-1.5 border-b border-red-200 bg-red-50 text-red-700 text-xs flex justify-between"><span>* {error}</span><button onClick={() => setError(null)} className="text-red-500 font-bold">&times;</button></div>)}
      {success && (<div className="px-3 py-1.5 border-b border-green-200 bg-green-50 text-green-700 text-xs flex justify-between"><span>* {success}</span><button onClick={() => setSuccess(null)} className="text-green-500 font-bold">&times;</button></div>)}
      <div className="flex-1 flex min-h-0">
        <div className="flex-1 flex flex-col min-w-0 bg-white border-r">
          <div className="p-3 space-y-1 max-w-2xl">
            <FormRow label="Employee" required labelWidth="w-56"><select className={selectCls} value={form.employee_id} onChange={setField("employee_id")}><option value="">Select</option>{_employees.map(e => <option key={e.employee_id} value={e.employee_id}>{e.name} ({e.employee_code})</option>)}</select></FormRow>
            <FormRow label="Pay Head" required labelWidth="w-56"><select className={selectCls} value={form.pay_head_id} onChange={setField("pay_head_id")}><option value="">Select</option>{_payHeads.map(p => <option key={p.pay_head_id} value={p.pay_head_id}>{p.name}</option>)}</select></FormRow>
            <FormRow label="Effective From" required labelWidth="w-56"><input type="date" className={inputCls} value={form.effective_from} onChange={setField("effective_from")} /></FormRow>
            <FormRow label="Amount" required labelWidth="w-56"><input type="number" step="0.01" className={`${inputCls} text-right max-w-[120px]`} value={form.amount} onChange={setNumber("amount")} /></FormRow>
            <FormRow label="Calculation Mode" labelWidth="w-56"><select className={selectCls} value={form.calculation_mode} onChange={setField("calculation_mode")}><option value="Flat Rate">Flat Rate</option><option value="As User Defined Value">User Defined</option><option value="As Computed Value">Computed</option><option value="On Attendance">On Attendance</option><option value="On Production">On Production</option></select></FormRow>
          </div>
          <div className="flex-1" />
        </div>
      </div>
      <div className="border-t p-3 flex justify-between bg-zinc-50">
        <div className="flex gap-2"><button onClick={() => setSelected(null)} className="text-xs text-zinc-500">&larr; Back</button><button onClick={handleDelete} disabled={loading} className="text-xs text-red-500 font-medium">Delete</button></div>
        <button onClick={handleSubmit} disabled={loading} className="text-sm px-6 py-1.5 rounded bg-black text-white hover:bg-zinc-800 disabled:opacity-50">{loading ? "Saving..." : "Accept"}</button>
      </div>
    </div>
  );
}
