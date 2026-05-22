import { useState, useEffect, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useCompany } from "@/context/CompanyContext";
import { FormRow, PageTitleBar, SearchInput, DataTable } from "@/components/ui";
import type { PayHeadType, PayHeadSlabLineType, PayHeadFormulaLineType } from "@/types/entities/Payroll";

const inputCls = "flex-1 bg-transparent text-sm outline-none px-1.5 py-0.5 border border-transparent hover:border-zinc-200 focus:border-zinc-800 transition-colors bg-white/50 rounded";
const selectCls = "bg-transparent text-sm outline-none px-1.5 py-0.5 border border-transparent hover:border-zinc-200 focus:border-zinc-800 transition-colors bg-white/50 rounded";
const trueVal = (v: string) => v === "Yes" ? 1 : 0;
const boolVal = (v?: number) => v ? "Yes" : "No";
const PAY_HEAD_TYPES = ["Earnings for Employees", "Deductions for Employees", "Employer Statutory Contributions", "Employer Statutory Deductions", "Reimbursements", "Gratuity"];

interface FormData {
  name: string; alias: string; pay_head_type: string; income_type: string; under_group: string;
  affects_net_salary: string; payslip_display_name: string; use_for_gratuity: string; set_alter_income_tax: string;
  calculation_type: string; calculation_period: string; percentage_or_amount: number;
  rounding_method: string; rounding_limit: number; compute_method: string;
}

export default function PayHeadAlter() {
  const navigate = useNavigate();
  const location = useLocation();
  const { selectedCompany } = useCompany();
  const companyId = selectedCompany?.company_id;
  const [payHeads, setPayHeads] = useState<PayHeadType[]>([]);
  const [selected, setSelected] = useState<PayHeadType | null>(null);
  const [form, setForm] = useState<FormData>({ name: "", alias: "", pay_head_type: "Earnings for Employees", income_type: "Fixed", under_group: "Direct Expenses", affects_net_salary: "Yes", payslip_display_name: "", use_for_gratuity: "No", set_alter_income_tax: "No", calculation_type: "As User Defined Value", calculation_period: "Months", percentage_or_amount: 0, rounding_method: "Not Applicable", rounding_limit: 0, compute_method: "On Current Earnings Total" });
  const [_slabs, setSlabs] = useState<PayHeadSlabLineType[]>([]);
  const [_formulaLines, setFormulaLines] = useState<PayHeadFormulaLineType[]>([]);
  void _slabs; void _formulaLines;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (!companyId) return;
    const res = await window.api.payHead.getAll(companyId);
    if (res.success) setPayHeads(res.payHeads ?? []);
  }, [companyId]);

  useEffect(() => { loadData(); }, [loadData]);

  const selectHead = async (ph: PayHeadType) => {
    setSelected(ph);
    setForm({ name: ph.name, alias: ph.alias || "", pay_head_type: ph.pay_head_type || "Earnings for Employees", income_type: ph.income_type || "Fixed", under_group: ph.under_group || "Direct Expenses", affects_net_salary: boolVal(ph.affects_net_salary), payslip_display_name: ph.payslip_display_name || "", use_for_gratuity: boolVal(ph.use_for_gratuity), set_alter_income_tax: boolVal(ph.set_alter_income_tax), calculation_type: ph.calculation_type || "As User Defined Value", calculation_period: ph.calculation_period || "Months", percentage_or_amount: ph.percentage_or_amount ?? 0, rounding_method: ph.rounding_method || "Not Applicable", rounding_limit: ph.rounding_limit ?? 0, compute_method: "On Current Earnings Total" });
    if (ph.pay_head_id) {
      const [sRes, fRes] = await Promise.all([window.api.payHead.getSlabs(ph.pay_head_id), window.api.payHead.getFormulas(ph.pay_head_id)]);
      if (sRes.success) setSlabs(sRes.slabs ?? []);
      if (fRes.success) setFormulaLines(fRes.formulas ?? []);
    }
  };

  useEffect(() => {
    const preSelectId = (location.state as any)?.payHeadId;
    if (preSelectId && payHeads.length > 0) {
      const ph = payHeads.find(p => p.pay_head_id === preSelectId);
      if (ph) selectHead(ph);
    }
  }, [location.state, payHeads]);

  const setField = (key: keyof FormData) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setForm(f => ({ ...f, [key]: e.target.value }));
  const setNumber = (key: keyof FormData) => (e: React.ChangeEvent<HTMLInputElement>) => setForm(f => ({ ...f, [key]: e.target.value === "" ? 0 : Number(e.target.value) }));

  const handleSubmit = useCallback(async () => {
    if (!selected || !selected.pay_head_id) return;
    setLoading(true); setError(null);
    try {
      const res = await window.api.payHead.update({ pay_head_id: selected.pay_head_id, name: form.name.trim(), alias: form.alias.trim() || undefined, pay_head_type: form.pay_head_type, income_type: form.income_type, under_group: form.under_group, affects_net_salary: trueVal(form.affects_net_salary), payslip_display_name: form.payslip_display_name.trim() || undefined, use_for_gratuity: trueVal(form.use_for_gratuity), set_alter_income_tax: trueVal(form.set_alter_income_tax), calculation_type: form.calculation_type, calculation_period: form.calculation_period, percentage_or_amount: form.percentage_or_amount, rounding_method: form.rounding_method, rounding_limit: form.rounding_limit });
      if (res.success) { setSuccess(`"${form.name}" updated.`); await loadData(); setTimeout(() => { setSuccess(null); setSelected(null); }, 1500); }
      else setError(res.error || "Failed.");
    } catch (e) { setError(e instanceof Error ? e.message : "Error."); }
    finally { setLoading(false); }
  }, [form, selected, loadData]);

  const handleDelete = useCallback(async () => {
    if (!selected || selected.is_predefined) { setError("Cannot delete predefined pay head."); return; }
    setLoading(true); setError(null);
    try {
      const res = await window.api.payHead.delete(selected.pay_head_id!);
      if (res.success) { setSuccess("Pay Head deleted."); await loadData(); setTimeout(() => { setSuccess(null); setSelected(null); }, 1500); }
      else setError(res.error || "Failed.");
    } catch (e) { setError(e instanceof Error ? e.message : "Error."); }
    finally { setLoading(false); }
  }, [selected, loadData]);

  const selectableHeads = payHeads.filter(p => !p.is_predefined);

  if (!selected) {
  const _selActions: any = []; void _selActions;
    return (
      <div className="flex-1 flex flex-col h-full bg-white select-none">
        <PageTitleBar title="Alter Pay Head" subtitle="Select Pay Head to Alter" />
        <div className="flex-1 flex min-h-0">
          <div className="flex-1 flex flex-col min-w-0">
            <SearchInput value="" onChange={() => {}} placeholder="Filter pay heads..." />
            <div className="flex-1 overflow-y-auto">
              <DataTable columns={[{ key: "name", label: "Name", span: "col-span-4", render: (r: PayHeadType) => <span className="font-medium">{r.name}</span> }, { key: "pay_head_type", label: "Type", span: "col-span-4", render: (r: PayHeadType) => <span className="text-zinc-500">{r.pay_head_type}</span> }, { key: "calculation_type", label: "Calculation", span: "col-span-4", render: (r: PayHeadType) => <span className="text-zinc-400">{r.calculation_type}</span> }]} rows={selectableHeads} rowKey={(r) => String(r.pay_head_id)} onRowClick={selectHead} />
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
      <PageTitleBar title="Alter Pay Head" subtitle={selectedCompany?.name} />
      {error && (<div className="px-3 py-1.5 border-b border-red-200 bg-red-50 text-red-700 text-xs flex justify-between"><span>* {error}</span><button onClick={() => setError(null)} className="text-red-500 font-bold">&times;</button></div>)}
      {success && (<div className="px-3 py-1.5 border-b border-green-200 bg-green-50 text-green-700 text-xs flex justify-between"><span>* {success}</span><button onClick={() => setSuccess(null)} className="text-green-500 font-bold">&times;</button></div>)}
      <div className="flex-1 flex min-h-0 overflow-x-auto">
        <div className="flex-1 flex flex-col min-w-0 shrink-0 bg-white">
          <div className="p-3 space-y-1">
            <FormRow label="Name" required labelWidth="w-44"><input className={inputCls} value={form.name} onChange={setField("name")} /></FormRow>
            <FormRow label="(alias)" labelWidth="w-44"><input className={inputCls} value={form.alias} onChange={setField("alias")} /></FormRow>
          </div>
          <div className="p-3 border-t border-zinc-100 space-y-1">
            <div className="text-[10px] font-bold text-zinc-400 uppercase mb-2">Pay Head Information</div>
            <FormRow label="Pay Head Type" labelWidth="w-44"><select className={selectCls} value={form.pay_head_type} onChange={setField("pay_head_type")}>{PAY_HEAD_TYPES.map(t => <option key={t} value={t}>{t}</option>)}</select></FormRow>
            <FormRow label="Income Type" labelWidth="w-44"><select className={selectCls} value={form.income_type} onChange={setField("income_type")}><option value="Fixed">Fixed</option><option value="Variable">Variable</option></select></FormRow>
            <FormRow label="Under" labelWidth="w-44"><select className={selectCls} value={form.under_group} onChange={setField("under_group")}><option value="Direct Expenses">Direct Expenses</option><option value="Indirect Expenses">Indirect Expenses</option><option value="Current Liabilities">Current Liabilities</option></select></FormRow>
            <FormRow label="Affect Net Salary" labelWidth="w-44"><select className={selectCls} value={form.affects_net_salary} onChange={setField("affects_net_salary")}><option>Yes</option><option>No</option></select></FormRow>
            <FormRow label="Payslip Display Name" labelWidth="w-44"><input className={inputCls} value={form.payslip_display_name} onChange={setField("payslip_display_name")} /></FormRow>
            <FormRow label="Use for Gratuity" labelWidth="w-44"><select className={selectCls} value={form.use_for_gratuity} onChange={setField("use_for_gratuity")}><option>No</option><option>Yes</option></select></FormRow>
            <FormRow label="Set/Alter IT Details" labelWidth="w-44"><select className={selectCls} value={form.set_alter_income_tax} onChange={setField("set_alter_income_tax")}><option>No</option><option>Yes</option></select></FormRow>
          </div>
          <div className="p-3 border-t border-zinc-100 space-y-1">
            <div className="text-[10px] font-bold text-zinc-400 uppercase mb-2">Calculation & Rounding</div>
            <FormRow label="Calculation Type" labelWidth="w-44"><select className={selectCls} value={form.calculation_type} onChange={setField("calculation_type")}><option value="As User Defined Value">As User Defined Value</option><option value="As Computed Value">As Computed Value</option><option value="Flat Rate">Flat Rate</option><option value="On Attendance">On Attendance</option><option value="On Production">On Production</option></select></FormRow>
            <FormRow label="Calculation Period" labelWidth="w-44"><select className={selectCls} value={form.calculation_period} onChange={setField("calculation_period")}><option value="Months">Months</option><option value="Days">Days</option><option value="Weeks">Weeks</option></select></FormRow>
            <FormRow label="Value" labelWidth="w-44"><input type="number" step="0.01" className={`${inputCls} text-right max-w-[120px]`} value={form.percentage_or_amount} onChange={setNumber("percentage_or_amount")} /></FormRow>
            <FormRow label="Rounding Method" labelWidth="w-44"><select className={selectCls} value={form.rounding_method} onChange={setField("rounding_method")}><option value="Not Applicable">Not Applicable</option><option value="Normal Rounding">Normal Rounding</option><option value="Downward Rounding">Downward Rounding</option><option value="Upward Rounding">Upward Rounding</option></select></FormRow>
            {form.rounding_method !== "Not Applicable" && <FormRow label="Limit" labelWidth="w-44"><input type="number" step="0.01" className={`${inputCls} text-right max-w-[120px]`} value={form.rounding_limit} onChange={setNumber("rounding_limit")} /></FormRow>}
          </div>
          <div className="flex-1" />
        </div>
      </div>
      <div className="border-t p-3 flex justify-between bg-zinc-50">
        <div className="flex gap-2"><button onClick={() => setSelected(null)} className="text-xs text-zinc-500">&larr; Back</button>{!selected?.is_predefined && <button onClick={handleDelete} disabled={loading} className="text-xs text-red-500 font-medium">Delete</button>}</div>
        <button onClick={handleSubmit} disabled={loading} className="text-sm px-6 py-1.5 rounded bg-black text-white hover:bg-zinc-800 disabled:opacity-50">{loading ? "Saving..." : "Accept"}</button>
      </div>
    </div>
  );
}
