import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useCompany } from "@/context/CompanyContext";
import { FormRow, PageTitleBar } from "@/components/ui";
import PayHeadCalculationPanel from "@/components/payroll/PayHeadCalculationPanel";
import type { PayHeadFormulaLineType, PayHeadSlabLineType } from "@/types/entities/Payroll";

const inputCls = "flex-1 bg-transparent text-sm outline-none px-1.5 py-0.5 border border-transparent hover:border-zinc-200 focus:border-zinc-800 transition-colors bg-white/50 rounded";
const selectCls = "bg-transparent text-sm outline-none px-1.5 py-0.5 border border-transparent hover:border-zinc-200 focus:border-zinc-800 transition-colors bg-white/50 rounded";

const PAY_HEAD_TYPES = [
  "Earnings for Employees",
  "Deductions for Employees",
  "Employer Statutory Contributions",
  "Employer Statutory Deductions",
  "Reimbursements",
  "Gratuity",
];

const INCOME_TYPES = ["Fixed", "Variable"];

const CALCULATION_TYPES = [
  "As User Defined Value",
  "As Computed Value",
  "Flat Rate",
  "On Attendance",
  "On Production",
];

export default function PayHeadCreate() {
  const navigate = useNavigate();
  const { selectedCompany } = useCompany();
  const companyId = selectedCompany?.company_id;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [alias, setAlias] = useState("");
  const [pay_head_type, setPayHeadType] = useState("Earnings for Employees");
  const [income_type, setIncomeType] = useState("Fixed");
  const [under_group, setUnderGroup] = useState("Direct Expenses");
  const [affects_net_salary, setAffectsNetSalary] = useState("Yes");
  const [payslip_display_name, setPayslipDisplayName] = useState("");
  const [use_for_gratuity, setUseForGratuity] = useState("No");
  const [set_alter_income_tax, setSetAlterIncomeTax] = useState("No");
  const [calculation_type, setCalculationType] = useState("As User Defined Value");
  const [calculation_period, setCalculationPeriod] = useState("Months");
  const [percentage_or_amount, setPercentageOrAmount] = useState(0);
  const [rounding_method, setRoundingMethod] = useState("Not Applicable");
  const [rounding_limit, setRoundingLimit] = useState(0);
  const [compute_method, setComputeMethod] = useState("On Current Earnings Total");

  const [slabs, setSlabs] = useState<PayHeadSlabLineType[]>([]);
  const [formulaLines, setFormulaLines] = useState<PayHeadFormulaLineType[]>([]);

  const trueVal = (v: string) => v === "Yes" ? 1 : 0;

  const calcConfig = {
    calculation_type,
    calculation_period,
    percentage_or_amount,
    rounding_method,
    rounding_limit,
    compute_method,
  };

  const handleCalcChange = (key: keyof typeof calcConfig) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const v = e.target.value;
    if (key === "calculation_type") setCalculationType(v);
    else if (key === "calculation_period") setCalculationPeriod(v);
    else if (key === "rounding_method") setRoundingMethod(v);
    else if (key === "compute_method") setComputeMethod(v);
  };

  const handleCalcNumberChange = (key: keyof typeof calcConfig) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value === "" ? 0 : Number(e.target.value);
    if (key === "percentage_or_amount") setPercentageOrAmount(v);
    else if (key === "rounding_limit") setRoundingLimit(v);
  };

  const validate = (): string | null => {
    if (!name.trim()) return "Name is required.";
    if (!companyId) return "No company selected.";
    return null;
  };

  const handleSubmit = useCallback(async () => {
    const err = validate();
    if (err) { setError(err); return; }
    setLoading(true); setError(null);
    try {
      const result = await window.api.payHead.create({
        company_id: companyId!,
        name: name.trim(),
        alias: alias.trim() || undefined,
        pay_head_type,
        income_type,
        under_group,
        affects_net_salary: trueVal(affects_net_salary),
        payslip_display_name: payslip_display_name.trim() || undefined,
        use_for_gratuity: trueVal(use_for_gratuity),
        set_alter_income_tax: trueVal(set_alter_income_tax),
        calculation_type,
        calculation_period,
        percentage_or_amount,
        rounding_method,
        rounding_limit,
      });

      if (result.success) {
        const pay_head_id = result.payHead.pay_head_id;
        if (pay_head_id && slabs.length > 0) {
          for (const slab of slabs) {
            await window.api.payHead.createSlab({ pay_head_id, effective_from: slab.effective_from, amount_gt: slab.amount_gt, amount_up_to: slab.amount_up_to, slab_type: slab.slab_type, value: slab.value });
          }
        }
        if (pay_head_id && formulaLines.length > 0) {
          for (let i = 0; i < formulaLines.length; i++) {
            await window.api.payHead.createFormula({ pay_head_id, sequence: i, function: formulaLines[i].function, pay_head_id_ref: formulaLines[i].pay_head_id_ref, operator: formulaLines[i].operator });
          }
        }
        setSuccess(`Pay Head "${name}" created.`);
        setName(""); setAlias(""); setPayslipDisplayName("");
        setSlabs([]); setFormulaLines([]);
        setTimeout(() => setSuccess(null), 3000);
      } else {
        setError(result.error || "Failed to create pay head.");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unexpected error.");
    } finally {
      setLoading(false);
    }
  }, [name, alias, pay_head_type, income_type, under_group, affects_net_salary, payslip_display_name, use_for_gratuity, set_alter_income_tax, calculation_type, calculation_period, percentage_or_amount, rounding_method, rounding_limit, slabs, formulaLines, companyId]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") { e.preventDefault(); navigate("/master/create"); }
      if (e.altKey && e.key.toLowerCase() === "a") { e.preventDefault(); handleSubmit(); }
      if (e.ctrlKey && e.key.toLowerCase() === "a") { e.preventDefault(); handleSubmit(); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handleSubmit, navigate]);

  return (
    <div className="flex-1 flex flex-col h-full bg-white select-none">
      <PageTitleBar title="Pay Head Creation" subtitle={selectedCompany?.name} />

      {error && (
        <div className="px-3 py-1.5 border-b border-red-200 bg-red-50 text-red-700 text-xs flex justify-between items-center">
          <span>* {error}</span>
          <button onClick={() => setError(null)} className="text-red-500 hover:text-red-700 text-xs font-bold">&times;</button>
        </div>
      )}
      {success && (
        <div className="px-3 py-1.5 border-b border-green-200 bg-green-50 text-green-700 text-xs flex justify-between items-center">
          <span>* {success}</span>
          <button onClick={() => setSuccess(null)} className="text-green-500 hover:text-green-700 text-xs font-bold">&times;</button>
        </div>
      )}

      <div className="flex-1 flex min-h-0 overflow-x-auto">
        {/* Left: Basic info */}
        <div className="flex-1 flex flex-col min-w-0 shrink-0 bg-white">
          <div className="p-3 space-y-1">
            <FormRow label="Name" required labelWidth="w-44" className="flex items-center min-h-[26px]">
              <input autoFocus className={inputCls} value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Basic Salary" />
            </FormRow>
            <FormRow label="(alias)" labelWidth="w-44" className="flex items-center min-h-[26px]">
              <input className={inputCls} value={alias} onChange={e => setAlias(e.target.value)} />
            </FormRow>
          </div>

          <div className="p-3 border-t border-zinc-100 space-y-1">
            <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-2">Pay Head Information</div>
            <FormRow label="Pay Head Type" labelWidth="w-44" className="flex items-center min-h-[26px]">
              <select className={selectCls} value={pay_head_type} onChange={e => setPayHeadType(e.target.value)}>
                {PAY_HEAD_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </FormRow>
            <FormRow label="Income Type" labelWidth="w-44" className="flex items-center min-h-[26px]">
              <select className={selectCls} value={income_type} onChange={e => setIncomeType(e.target.value)}>
                {INCOME_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </FormRow>
            <FormRow label="Under" labelWidth="w-44" className="flex items-center min-h-[26px]">
              <select className={selectCls} value={under_group} onChange={e => setUnderGroup(e.target.value)}>
                <option value="Direct Expenses">Direct Expenses</option>
                <option value="Indirect Expenses">Indirect Expenses</option>
                <option value="Current Liabilities">Current Liabilities</option>
                <option value="Current Assets">Current Assets</option>
                <option value="Direct Incomes">Direct Incomes</option>
                <option value="Indirect Incomes">Indirect Incomes</option>
              </select>
            </FormRow>
            <FormRow label="Affect Net Salary" labelWidth="w-44" className="flex items-center min-h-[26px]">
              <select className={selectCls} value={affects_net_salary} onChange={e => setAffectsNetSalary(e.target.value)}>
                <option>Yes</option>
                <option>No</option>
              </select>
            </FormRow>
            <FormRow label="Name to Display in Payslip" labelWidth="w-44" className="flex items-center min-h-[26px]">
              <input className={inputCls} value={payslip_display_name} onChange={e => setPayslipDisplayName(e.target.value)} />
            </FormRow>
            <FormRow label="Use for Gratuity" labelWidth="w-44" className="flex items-center min-h-[26px]">
              <select className={selectCls} value={use_for_gratuity} onChange={e => setUseForGratuity(e.target.value)}>
                <option>No</option>
                <option>Yes</option>
              </select>
            </FormRow>
            <FormRow label="Set/Alter Income Tax Details" labelWidth="w-44" className="flex items-center min-h-[26px]">
              <select className={selectCls} value={set_alter_income_tax} onChange={e => setSetAlterIncomeTax(e.target.value)}>
                <option>No</option>
                <option>Yes</option>
              </select>
            </FormRow>
          </div>

          <div className="p-3 border-t border-zinc-100 space-y-1">
            <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-2">Calculation Type</div>
            <FormRow label="Calculation Type" labelWidth="w-44" className="flex items-center min-h-[26px]">
              <select className={selectCls} value={calculation_type} onChange={e => setCalculationType(e.target.value)}>
                {CALCULATION_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </FormRow>
          </div>

          <PayHeadCalculationPanel
            config={calcConfig}
            slabs={slabs}
            formulaLines={formulaLines}
            companyId={companyId}
            onConfigChange={handleCalcChange}
            onConfigNumberChange={handleCalcNumberChange}
            onSlabAdd={() => setSlabs(s => [...s, { effective_from: "", amount_gt: 0, amount_up_to: 0, slab_type: "Percentage", value: 0 }])}
            onSlabDelete={(i) => setSlabs(s => s.filter((_, idx) => idx !== i))}
            onSlabChange={(i, field, value) => setSlabs(s => s.map((sl, idx) => idx === i ? { ...sl, [field]: value } : sl))}
            onFormulaAdd={(line) => setFormulaLines(f => [...f, { ...line, sequence: f.length }])}
            onFormulaDelete={(i) => setFormulaLines(f => f.filter((_, idx) => idx !== i))}
          />

          <div className="flex-1" />
        </div>

        {/* Total Opening Balance box */}
        <div className="w-56 border-l border-zinc-200 flex flex-col shrink-0 bg-zinc-50/25 p-3">
          <div className="w-full border border-zinc-200 rounded shrink-0 bg-white shadow-sm">
            <div className="text-center text-[10px] font-bold border-b border-zinc-100 py-1 bg-zinc-50 text-zinc-500 uppercase tracking-wider">Total Opening Balance</div>
            <div className="h-14 flex items-center justify-center text-sm font-semibold tabular-nums text-zinc-800">0.00</div>
          </div>
        </div>

      </div>

      <div className="border-t border-zinc-200 p-3 flex justify-between items-center bg-zinc-50">
        <button onClick={() => navigate("/master/create")} className="text-xs text-zinc-500 hover:text-zinc-800 transition-colors font-medium">&larr; Back to Masters</button>
        <button onClick={handleSubmit} disabled={loading} className="text-sm px-6 py-1.5 rounded bg-black text-white hover:bg-zinc-800 disabled:opacity-50 transition-colors font-medium">
          {loading ? "Saving..." : "Create"}
        </button>
      </div>
    </div>
  );
}
