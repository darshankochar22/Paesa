import { useState, useEffect, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useCompany } from "@/context/CompanyContext";
import { FormRow, PageTitleBar, RightActionPanel, MasterSelectionPanel, MasterFormFooter, AlertBanner } from "@/components/ui";
import { useMasterShortcuts } from "@/hooks/useMasterShortcuts";
import type { PayHeadType, PayHeadSlabLineType, PayHeadFormulaLineType } from "@/types/entities/Payroll";

const inputCls = "flex-1 bg-transparent text-sm outline-none px-1.5 py-0.5 border border-transparent hover:border-zinc-200 focus:border-zinc-800 transition-colors bg-white/50 rounded";
const selectCls = "bg-transparent text-sm outline-none px-1.5 py-0.5 border border-transparent hover:border-zinc-200 focus:border-zinc-800 transition-colors bg-white/50 rounded w-24";
const trueVal = (v: string) => v === "Yes" ? 1 : 0;
const boolVal = (v?: number) => v ? "Yes" : "No";
const PAY_HEAD_TYPES = ["Earnings for Employees", "Deductions for Employees", "Employer Statutory Contributions", "Employer Statutory Deductions", "Reimbursements", "Gratuity"];

interface FormData {
  name: string;
  alias: string;
  pay_head_type: string;
  income_type: string;
  under_group: string;
  affects_net_salary: string;
  payslip_display_name: string;
  use_for_gratuity: string;
  set_alter_income_tax: string;
  calculation_type: string;
  calculation_period: string;
  percentage_or_amount: number;
  rounding_method: string;
  rounding_limit: number;
  compute_method: string;
}

export default function PayHeadAlter() {
  const navigate = useNavigate();
  const location = useLocation();
  const { selectedCompany } = useCompany();
  const companyId = selectedCompany?.company_id;
  const [payHeads, setPayHeads] = useState<PayHeadType[]>([]);
  const [selected, setSelected] = useState<PayHeadType | null>(null);
  const [form, setForm] = useState<FormData | null>(null);
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

  useEffect(() => {
    loadData();
  }, [loadData]);

  const selectHead = async (ph: PayHeadType) => {
    setSelected(ph);
    setForm({
      name: ph.name,
      alias: ph.alias || "",
      pay_head_type: ph.pay_head_type || "Earnings for Employees",
      income_type: ph.income_type || "Fixed",
      under_group: ph.under_group || "Direct Expenses",
      affects_net_salary: boolVal(ph.affects_net_salary),
      payslip_display_name: ph.payslip_display_name || "",
      use_for_gratuity: boolVal(ph.use_for_gratuity),
      set_alter_income_tax: boolVal(ph.set_alter_income_tax),
      calculation_type: ph.calculation_type || "As User Defined Value",
      calculation_period: ph.calculation_period || "Months",
      percentage_or_amount: ph.percentage_or_amount ?? 0,
      rounding_method: ph.rounding_method || "Not Applicable",
      rounding_limit: ph.rounding_limit ?? 0,
      compute_method: "On Current Earnings Total"
    });
    setError(null);
    setSuccess(null);
    if (ph.pay_head_id) {
      const [sRes, fRes] = await Promise.all([
        window.api.payHead.getSlabs(ph.pay_head_id),
        window.api.payHead.getFormulas(ph.pay_head_id)
      ]);
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

  const setField = (key: keyof FormData) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(f => (f ? { ...f, [key]: e.target.value } : null));

  const setNumber = (key: keyof FormData) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(f => (f ? { ...f, [key]: e.target.value === "" ? 0 : Number(e.target.value) } : null));

  const validate = (): string | null => {
    if (!form?.name.trim()) return "Name is required.";
    if (!companyId) return "No company selected.";
    return null;
  };

  const handleSubmit = useCallback(async () => {
    if (!form || !selected || !selected.pay_head_id) return;
    if (selected.is_predefined) {
      setError("Predefined pay heads cannot be altered.");
      return;
    }

    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await window.api.payHead.update({
        pay_head_id: selected.pay_head_id,
        name: form.name.trim(),
        alias: form.alias.trim() || undefined,
        pay_head_type: form.pay_head_type,
        income_type: form.income_type,
        under_group: form.under_group,
        affects_net_salary: trueVal(form.affects_net_salary),
        payslip_display_name: form.payslip_display_name.trim() || undefined,
        use_for_gratuity: trueVal(form.use_for_gratuity),
        set_alter_income_tax: trueVal(form.set_alter_income_tax),
        calculation_type: form.calculation_type,
        calculation_period: form.calculation_period,
        percentage_or_amount: form.percentage_or_amount,
        rounding_method: form.rounding_method,
        rounding_limit: form.rounding_limit
      });
      if (res.success) {
        setSuccess(`"${form.name}" updated successfully.`);
        await loadData();
        setTimeout(() => {
          setSuccess(null);
          setSelected(null);
          setForm(null);
        }, 1500);
      } else {
        setError(res.error || "Failed to update pay head.");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unexpected error.");
    } finally {
      setLoading(false);
    }
  }, [form, selected, loadData, companyId]);

  const handleDelete = useCallback(async () => {
    if (!selected) return;
    if (selected.is_predefined) {
      setError("Predefined pay heads cannot be deleted.");
      return;
    }

    if (!window.confirm(`Delete "${selected.name}"? This cannot be undone.`)) return;

    setLoading(true);
    setError(null);
    try {
      const res = await window.api.payHead.delete(selected.pay_head_id!);
      if (res.success) {
        setSuccess("Pay head deleted successfully.");
        await loadData();
        setTimeout(() => {
          setSuccess(null);
          setSelected(null);
          setForm(null);
        }, 1500);
      } else {
        setError(res.error || "Failed to delete pay head.");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unexpected error.");
    } finally {
      setLoading(false);
    }
  }, [selected, loadData]);

  useMasterShortcuts({
    onAccept: handleSubmit,
    onDelete: handleDelete,
    onQuit: () => {
      if (selected) {
        setSelected(null);
        setForm(null);
      } else {
        navigate("/master/alter");
      }
    }
  });

  if (!selected || !form) {
    const columns = [
      {
        key: "name",
        label: "Name",
        span: "col-span-5",
        render: (r: PayHeadType) => (
          <span className="font-bold text-zinc-950 uppercase flex items-center gap-1.5">
            {r.name}
            {!!r.is_predefined && (
              <span className="text-[9px] font-bold px-1 py-0.2 bg-zinc-100 text-zinc-500 rounded tracking-wider border border-zinc-200">
                PREDEFINED
              </span>
            )}
          </span>
        )
      },
      {
        key: "pay_head_type",
        label: "Type",
        span: "col-span-4",
        render: (r: PayHeadType) => <span className="text-zinc-500">{r.pay_head_type}</span>
      },
      {
        key: "calculation_type",
        label: "Calculation",
        span: "col-span-3",
        render: (r: PayHeadType) => <span className="text-zinc-400">{r.calculation_type}</span>
      }
    ];

    return (
      <MasterSelectionPanel
        title="Alter Pay Head"
        subtitle="Select Pay Head to Alter"
        searchPlaceholder="Search pay heads by name..."
        items={payHeads}
        filterFn={(ph, search) => ph.name.toLowerCase().includes(search.toLowerCase())}
        columns={columns}
        onSelect={selectHead}
        onCancel={() => navigate("/master/alter")}
        onCreate={() => navigate("/master/create/pay-head")}
        createLabel="Create Pay Head"
        rowKey={(r) => String(r.pay_head_id)}
        emptyMessage="No pay heads found."
      />
    );
  }

  const isPredefined = !!selected.is_predefined;

  const alterActions = [
    ...(isPredefined ? [] : [{ key: "Alt+A", label: "Accept", onClick: handleSubmit }]),
    ...(isPredefined ? [] : [{ key: "Alt+D", label: "Delete", onClick: handleDelete }]),
    { key: "Esc", label: "Back", onClick: () => { setSelected(null); setForm(null); } }
  ];

  return (
    <div className="flex flex-col h-full relative overflow-hidden bg-white select-none">
      <PageTitleBar title={`Alter Pay Head: ${selected.name}`} subtitle={selectedCompany?.name} />

      {error && <AlertBanner type="error" message={error} onDismiss={() => setError(null)} />}
      {success && <AlertBanner type="success" message={success} onDismiss={() => setSuccess(null)} />}

      {isPredefined && (
        <div className="px-3 py-1.5 border-b border-zinc-200 bg-zinc-50 text-zinc-500 text-xs shrink-0 select-none">
          ℹ️ Predefined pay heads cannot be altered or deleted.
        </div>
      )}

      <div className="flex-1 flex min-h-0 overflow-x-auto">
        <div className="flex-1 flex flex-col min-w-0 shrink-0 bg-white border-r border-zinc-100">
          <div className="p-3 space-y-1.5">
            <FormRow label="Name" required labelWidth="w-44" className="flex items-center min-h-[26px]">
              <input
                autoFocus={!isPredefined}
                disabled={isPredefined}
                className={`${inputCls} ${isPredefined ? "text-zinc-500 cursor-not-allowed bg-zinc-50" : ""}`}
                value={form.name}
                onChange={setField("name")}
              />
            </FormRow>
            <FormRow label="(alias)" labelWidth="w-44" className="flex items-center min-h-[26px]">
              <input
                disabled={isPredefined}
                className={`${inputCls} ${isPredefined ? "text-zinc-500 cursor-not-allowed bg-zinc-50" : ""}`}
                value={form.alias}
                onChange={setField("alias")}
              />
            </FormRow>
          </div>

          <div className="p-3 border-t border-zinc-100 space-y-1.5">
            <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-2">Pay Head Information</div>
            <FormRow label="Pay Head Type" labelWidth="w-44" className="flex items-center min-h-[26px]">
              <select
                disabled={isPredefined}
                className={`${selectCls} ${isPredefined ? "text-zinc-500 cursor-not-allowed bg-zinc-50" : ""}`}
                value={form.pay_head_type}
                onChange={setField("pay_head_type")}
              >
                {PAY_HEAD_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </FormRow>
            <FormRow label="Income Type" labelWidth="w-44" className="flex items-center min-h-[26px]">
              <select
                disabled={isPredefined}
                className={`${selectCls} ${isPredefined ? "text-zinc-500 cursor-not-allowed bg-zinc-50" : ""}`}
                value={form.income_type}
                onChange={setField("income_type")}
              >
                <option value="Fixed">Fixed</option>
                <option value="Variable">Variable</option>
              </select>
            </FormRow>
            <FormRow label="Under" labelWidth="w-44" className="flex items-center min-h-[26px]">
              <select
                disabled={isPredefined}
                className={`${selectCls} ${isPredefined ? "text-zinc-500 cursor-not-allowed bg-zinc-50" : ""}`}
                value={form.under_group}
                onChange={setField("under_group")}
              >
                <option value="Direct Expenses">Direct Expenses</option>
                <option value="Indirect Expenses">Indirect Expenses</option>
                <option value="Current Liabilities">Current Liabilities</option>
              </select>
            </FormRow>
            <FormRow label="Affect Net Salary" labelWidth="w-44" className="flex items-center min-h-[26px]">
              <select
                disabled={isPredefined}
                className={`${selectCls} ${isPredefined ? "text-zinc-500 cursor-not-allowed bg-zinc-50" : ""}`}
                value={form.affects_net_salary}
                onChange={setField("affects_net_salary")}
              >
                <option>Yes</option>
                <option>No</option>
              </select>
            </FormRow>
            <FormRow label="Payslip Display Name" labelWidth="w-44" className="flex items-center min-h-[26px]">
              <input
                disabled={isPredefined}
                className={`${inputCls} ${isPredefined ? "text-zinc-500 cursor-not-allowed bg-zinc-50" : ""}`}
                value={form.payslip_display_name}
                onChange={setField("payslip_display_name")}
              />
            </FormRow>
            <FormRow label="Use for Gratuity" labelWidth="w-44" className="flex items-center min-h-[26px]">
              <select
                disabled={isPredefined}
                className={`${selectCls} ${isPredefined ? "text-zinc-500 cursor-not-allowed bg-zinc-50" : ""}`}
                value={form.use_for_gratuity}
                onChange={setField("use_for_gratuity")}
              >
                <option>No</option>
                <option>Yes</option>
              </select>
            </FormRow>
            <FormRow label="Set/Alter IT Details" labelWidth="w-44" className="flex items-center min-h-[26px]">
              <select
                disabled={isPredefined}
                className={`${selectCls} ${isPredefined ? "text-zinc-500 cursor-not-allowed bg-zinc-50" : ""}`}
                value={form.set_alter_income_tax}
                onChange={setField("set_alter_income_tax")}
              >
                <option>No</option>
                <option>Yes</option>
              </select>
            </FormRow>
          </div>

          <div className="p-3 border-t border-zinc-100 space-y-1.5">
            <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-2">Calculation & Rounding</div>
            <FormRow label="Calculation Type" labelWidth="w-44" className="flex items-center min-h-[26px]">
              <select
                disabled={isPredefined}
                className={`${selectCls} ${isPredefined ? "text-zinc-500 cursor-not-allowed bg-zinc-50" : ""}`}
                value={form.calculation_type}
                onChange={setField("calculation_type")}
              >
                <option value="As User Defined Value">As User Defined Value</option>
                <option value="As Computed Value">As Computed Value</option>
                <option value="Flat Rate">Flat Rate</option>
                <option value="On Attendance">On Attendance</option>
                <option value="On Production">On Production</option>
              </select>
            </FormRow>
            <FormRow label="Calculation Period" labelWidth="w-44" className="flex items-center min-h-[26px]">
              <select
                disabled={isPredefined}
                className={`${selectCls} ${isPredefined ? "text-zinc-500 cursor-not-allowed bg-zinc-50" : ""}`}
                value={form.calculation_period}
                onChange={setField("calculation_period")}
              >
                <option value="Months">Months</option>
                <option value="Days">Days</option>
                <option value="Weeks">Weeks</option>
              </select>
            </FormRow>
            <FormRow label="Value" labelWidth="w-44" className="flex items-center min-h-[26px]">
              <input
                type="number"
                step="0.01"
                disabled={isPredefined}
                className={`${inputCls} text-right max-w-[120px] ${isPredefined ? "text-zinc-500 cursor-not-allowed bg-zinc-50" : ""}`}
                value={form.percentage_or_amount}
                onChange={setNumber("percentage_or_amount")}
              />
            </FormRow>
            <FormRow label="Rounding Method" labelWidth="w-44" className="flex items-center min-h-[26px]">
              <select
                disabled={isPredefined}
                className={`${selectCls} ${isPredefined ? "text-zinc-500 cursor-not-allowed bg-zinc-50" : ""}`}
                value={form.rounding_method}
                onChange={setField("rounding_method")}
              >
                <option value="Not Applicable">Not Applicable</option>
                <option value="Normal Rounding">Normal Rounding</option>
                <option value="Downward Rounding">Downward Rounding</option>
                <option value="Upward Rounding">Upward Rounding</option>
              </select>
            </FormRow>
            {form.rounding_method !== "Not Applicable" && (
              <FormRow label="Limit" labelWidth="w-44" className="flex items-center min-h-[26px]">
                <input
                  type="number"
                  step="0.01"
                  disabled={isPredefined}
                  className={`${inputCls} text-right max-w-[120px] ${isPredefined ? "text-zinc-500 cursor-not-allowed bg-zinc-50" : ""}`}
                  value={form.rounding_limit}
                  onChange={setNumber("rounding_limit")}
                />
              </FormRow>
            )}
          </div>
          <div className="flex-1" />
        </div>

        <RightActionPanel actions={alterActions} />
      </div>

      <MasterFormFooter
        onCancel={() => {
          setSelected(null);
          setForm(null);
        }}
        onSubmit={handleSubmit}
        onDelete={!isPredefined ? handleDelete : undefined}
        submitLabel="Accept"
        cancelLabel="Back"
        loading={loading}
        disabled={isPredefined}
      />
    </div>
  );
}
