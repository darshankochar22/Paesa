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
import PayHeadCalculationPanel from '@/components/payroll/PayHeadCalculationPanel';
import IncomeTaxDetailsPopup from '@/components/payroll/IncomeTaxDetailsPopup';
import GratuitySlabPopup, { type GratuitySlab } from '@/components/payroll/GratuitySlabPopup';
import {
  PAY_HEAD_TYPES,
  INCOME_TYPES,
  CALCULATION_TYPES,
  STATUTORY_PAY_TYPES,
  showsIncomeType,
  showsGratuityAndIT,
  showsStatutoryPayType,
  isComputedType,
} from '@/components/payroll/payHeadConfig';
import type {
  PayHeadType,
  PayHeadSlabLineType,
  PayHeadFormulaLineType,
} from '@/types/entities/Payroll';

const inputCls =
  'flex-1 bg-transparent text-sm outline-none px-1.5 py-0.5 border border-transparent hover:border-zinc-200 focus:border-zinc-800 transition-colors bg-white/50 rounded';
const selectCls =
  'bg-transparent text-sm outline-none px-1.5 py-0.5 border border-transparent hover:border-zinc-200 focus:border-zinc-800 transition-colors bg-white/50 rounded w-44';
const trueVal = (v: string) => (v === 'Yes' ? 1 : 0);
const boolVal = (v?: number) => (v ? 'Yes' : 'No');

interface FormData {
  name: string;
  alias: string;
  pay_head_type: string;
  statutory_pay_type: string;
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
  leave_without_pay: string;
  production_type: string;
  opening_balance: number;
  opening_balance_type: string;
  registration_number: string;
  contribute_min_rs2: string;
  it_component: string;
  it_calculation_basis: string;
  it_deduct_tds_across_periods: string;
  gratuity_days_per_month: number;
}

export default function PayHeadAlter() {
  const navigate = useNavigate();
  const location = useLocation();
  const { selectedCompany } = useCompany();
  const companyId = selectedCompany?.company_id;
  const [payHeads, setPayHeads] = useState<PayHeadType[]>([]);
  const [selected, setSelected] = useState<PayHeadType | null>(null);
  const [form, setForm] = useState<FormData | null>(null);
  const [slabs, setSlabs] = useState<PayHeadSlabLineType[]>([]);
  const [formulaLines, setFormulaLines] = useState<PayHeadFormulaLineType[]>([]);
  const [gratuitySlabs, setGratuitySlabs] = useState<GratuitySlab[]>([]);
  const [showITPopup, setShowITPopup] = useState(false);
  const [showGratuityPopup, setShowGratuityPopup] = useState(false);
  const [totalOpeningBalance, setTotalOpeningBalance] = useState<{
    totalDr: number;
    totalCr: number;
    netBalance: number;
    balanceType: string;
  } | null>(null);

  useEffect(() => {
    if (!companyId) return;
    window.api.payHead.getTotalOpeningBalance(companyId).then((res) => {
      if (res.success)
        setTotalOpeningBalance({
          totalDr: res.totalDr,
          totalCr: res.totalCr,
          netBalance: res.netBalance,
          balanceType: res.balanceType,
        });
    });
  }, [companyId, selected]);
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
      alias: ph.alias || '',
      pay_head_type: ph.pay_head_type || 'Earnings for Employees',
      statutory_pay_type: ph.statutory_pay_type || '',
      income_type: ph.income_type || 'Fixed',
      under_group: ph.under_group || 'Direct Expenses',
      affects_net_salary: boolVal(ph.affects_net_salary),
      payslip_display_name: ph.payslip_display_name || '',
      use_for_gratuity: boolVal(ph.use_for_gratuity),
      set_alter_income_tax: boolVal(ph.set_alter_income_tax),
      calculation_type: ph.calculation_type || 'As User Defined Value',
      calculation_period: ph.calculation_period || 'Months',
      percentage_or_amount: ph.percentage_or_amount ?? 0,
      rounding_method: ph.rounding_method || 'Not Applicable',
      rounding_limit: ph.rounding_limit ?? 0,
      compute_method: ph.compute_method || 'On Current Earnings Total',
      leave_without_pay: ph.leave_without_pay || 'Not Applicable',
      production_type: ph.production_type || 'Not Applicable',
      opening_balance: ph.opening_balance ?? 0,
      opening_balance_type: ph.opening_balance_type ?? 'Dr',
      registration_number: ph.registration_number || '',
      contribute_min_rs2: boolVal(ph.contribute_min_rs2),
      it_component: ph.it_component || 'Not Applicable',
      it_calculation_basis: ph.it_calculation_basis || 'On Actual Value',
      it_deduct_tds_across_periods: boolVal(ph.it_deduct_tds_across_periods),
      gratuity_days_per_month: ph.gratuity_days_per_month ?? 0,
    });
    setError(null);
    setSuccess(null);
    setSlabs([]);
    setFormulaLines([]);
    setGratuitySlabs([]);
    if (ph.pay_head_id) {
      const [sRes, fRes, gRes] = await Promise.all([
        window.api.payHead.getSlabs(ph.pay_head_id),
        window.api.payHead.getFormulas(ph.pay_head_id),
        window.api.payHead.getGratuitySlabs(ph.pay_head_id),
      ]);
      if (sRes.success) setSlabs(sRes.slabs ?? []);
      if (fRes.success) setFormulaLines(fRes.formulas ?? []);
      if (gRes.success)
        setGratuitySlabs(
          (gRes.gratuitySlabs ?? []).map((g) => ({
            months_from: g.months_from ?? 0,
            months_to: g.months_to ?? 0,
            eligibility_days: g.eligibility_days ?? 0,
          })),
        );
    }
  };

  useEffect(() => {
    const preSelectId = (location.state as any)?.payHeadId;
    if (preSelectId && payHeads.length > 0) {
      const ph = payHeads.find((p) => p.pay_head_id === preSelectId);
      if (ph) selectHead(ph);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.state, payHeads]);

  const setField =
    (key: keyof FormData) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm((f) => (f ? { ...f, [key]: e.target.value } : null));

  const setNumber = (key: keyof FormData) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) =>
      f ? { ...f, [key]: e.target.value === '' ? 0 : Number(e.target.value) } : null,
    );

  const onCalcType = (v: string) =>
    setForm((f) => {
      if (!f) return null;
      if (v === 'As Per Income Tax Slab')
        return { ...f, calculation_type: v, rounding_method: 'Upward Rounding', rounding_limit: 1 };
      return { ...f, calculation_type: v };
    });

  // Adapter so PayHeadCalculationPanel (per-key change handlers) drives the single `form` object.
  const calcConfig = form
    ? {
        calculation_type: form.calculation_type,
        calculation_period: form.calculation_period,
        percentage_or_amount: form.percentage_or_amount,
        rounding_method: form.rounding_method,
        rounding_limit: form.rounding_limit,
        compute_method: form.compute_method,
        leave_without_pay: form.leave_without_pay,
        production_type: form.production_type,
      }
    : null;

  const handleCalcChange =
    (key: keyof NonNullable<typeof calcConfig>) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      const v = e.target.value;
      if (key === 'calculation_type') return onCalcType(v);
      setForm((f) => (f ? { ...f, [key]: v } : null));
    };

  const handleCalcNumberChange =
    (key: keyof NonNullable<typeof calcConfig>) => (e: React.ChangeEvent<HTMLInputElement>) => {
      const v = e.target.value === '' ? 0 : Number(e.target.value);
      setForm((f) => (f ? { ...f, [key]: v } : null));
    };

  const onStatutoryPayType = (v: string) =>
    setForm((f) => {
      if (!f) return null;
      if (
        [
          'Income Tax',
          'National Pension Scheme (Tier - I)',
          'National Pension Scheme (Tier - II)',
        ].includes(v)
      )
        return {
          ...f,
          statutory_pay_type: v,
          calculation_type: 'As Per Income Tax Slab',
          rounding_method: 'Upward Rounding',
          rounding_limit: 1,
        };
      if (v) return { ...f, statutory_pay_type: v, calculation_type: 'As Computed Value' };
      return { ...f, statutory_pay_type: v };
    });

  const onSetAlterIT = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const v = e.target.value;
    setForm((f) => (f ? { ...f, set_alter_income_tax: v } : null));
    if (v === 'Yes') setShowITPopup(true);
  };

  const onPayHeadTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const v = e.target.value;
    setForm((f) => (f ? { ...f, pay_head_type: v, statutory_pay_type: '' } : null));
    if (v === 'Gratuity') setShowGratuityPopup(true);
  };

  const validate = (): string | null => {
    if (!form?.name.trim()) return 'Name is required.';
    if (!companyId) return 'No company selected.';
    if (form && showsStatutoryPayType(form.pay_head_type) && !form.statutory_pay_type)
      return 'Statutory pay type is required for this pay head type.';
    return null;
  };

  const handleSubmit = useCallback(async () => {
    if (!form || !selected || !selected.pay_head_id) return;
    if (selected.is_predefined) {
      setError('Predefined pay heads cannot be altered.');
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
      const itEnabled = form.set_alter_income_tax === 'Yes';
      const res = await window.api.payHead.update({
        pay_head_id: selected.pay_head_id,
        name: form.name.trim(),
        alias: form.alias.trim() || undefined,
        pay_head_type: form.pay_head_type,
        statutory_pay_type: showsStatutoryPayType(form.pay_head_type)
          ? form.statutory_pay_type
          : undefined,
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
        rounding_limit: form.rounding_limit,
        compute_method: form.compute_method,
        leave_without_pay:
          form.calculation_type === 'On Attendance' ? form.leave_without_pay : undefined,
        production_type:
          form.calculation_type === 'On Production' ? form.production_type : undefined,
        opening_balance: !isComputedType(form.calculation_type) ? form.opening_balance : 0,
        opening_balance_type: !isComputedType(form.calculation_type)
          ? form.opening_balance_type
          : 'Dr',
        registration_number:
          form.statutory_pay_type === 'Professional Tax'
            ? form.registration_number.trim()
            : undefined,
        contribute_min_rs2:
          form.statutory_pay_type === 'EDLI Admin Charges (A/c No. 22)'
            ? trueVal(form.contribute_min_rs2)
            : 0,
        it_component: itEnabled ? form.it_component : undefined,
        it_calculation_basis: itEnabled ? form.it_calculation_basis : undefined,
        it_deduct_tds_across_periods: itEnabled ? trueVal(form.it_deduct_tds_across_periods) : 0,
        gratuity_days_per_month:
          form.pay_head_type === 'Gratuity' ? form.gratuity_days_per_month : 0,
      });
      if (res.success) {
        // Replace-on-save: no updateSlab/updateFormula exists, so delete the existing
        // computed-value rows for this pay head and recreate the current set (no dupes/orphans).
        if (selected.pay_head_id) {
          const phId = selected.pay_head_id;
          const isComputed = form.calculation_type === 'As Computed Value';
          const keepSlabs = isComputed && form.compute_method !== 'On Specified Formula';
          const keepFormulas = isComputed && form.compute_method === 'On Specified Formula';

          const existingSlabs = await window.api.payHead.getSlabs(phId);
          if (existingSlabs.success) {
            for (const s of existingSlabs.slabs ?? []) {
              if (s.slab_line_id) await window.api.payHead.deleteSlab(s.slab_line_id);
            }
          }
          if (keepSlabs) {
            for (const slab of slabs) {
              await window.api.payHead.createSlab({
                pay_head_id: phId,
                effective_from: slab.effective_from,
                amount_gt: slab.amount_gt,
                amount_up_to: slab.amount_up_to,
                slab_type: slab.slab_type,
                value: slab.value,
              });
            }
          }

          const existingFormulas = await window.api.payHead.getFormulas(phId);
          if (existingFormulas.success) {
            for (const fl of existingFormulas.formulas ?? []) {
              if (fl.formula_line_id) await window.api.payHead.deleteFormula(fl.formula_line_id);
            }
          }
          if (keepFormulas) {
            for (let i = 0; i < formulaLines.length; i++) {
              await window.api.payHead.createFormula({
                pay_head_id: phId,
                sequence: i,
                function: formulaLines[i].function,
                pay_head_id_ref: formulaLines[i].pay_head_id_ref,
                operator: formulaLines[i].operator,
              });
            }
          }
        }
        if (form.pay_head_type === 'Gratuity' && selected.pay_head_id) {
          const existing = await window.api.payHead.getGratuitySlabs(selected.pay_head_id);
          if (existing.success) {
            for (const g of existing.gratuitySlabs ?? []) {
              if (g.gratuity_slab_id)
                await window.api.payHead.deleteGratuitySlab(g.gratuity_slab_id);
            }
          }
          for (const gs of gratuitySlabs) {
            await window.api.payHead.createGratuitySlab({
              pay_head_id: selected.pay_head_id,
              months_from: gs.months_from,
              months_to: gs.months_to,
              eligibility_days: gs.eligibility_days,
            });
          }
        }
        setSuccess(`"${form.name}" updated successfully.`);
        await loadData();
        setTimeout(() => {
          setSuccess(null);
          setSelected(null);
          setForm(null);
        }, 1500);
      } else {
        setError(res.error || 'Failed to update pay head.');
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unexpected error.');
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form, selected, loadData, companyId, gratuitySlabs, slabs, formulaLines]);

  const handleDelete = useCallback(async () => {
    if (!selected) return;
    if (selected.is_predefined) {
      setError('Predefined pay heads cannot be deleted.');
      return;
    }

    if (!window.confirm(`Delete "${selected.name}"? This cannot be undone.`)) return;

    setLoading(true);
    setError(null);
    try {
      const res = await window.api.payHead.delete(selected.pay_head_id!);
      if (res.success) {
        setSuccess('Pay head deleted successfully.');
        await loadData();
        setTimeout(() => {
          setSuccess(null);
          setSelected(null);
          setForm(null);
        }, 1500);
      } else {
        setError(res.error || 'Failed to delete pay head.');
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unexpected error.');
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
        navigate('/master/alter');
      }
    },
  });

  if (!selected || !form) {
    const columns = [
      {
        key: 'name',
        label: 'Name',
        span: 'col-span-5',
        render: (r: PayHeadType) => (
          <span className="font-bold text-zinc-950 uppercase flex items-center gap-1.5">
            {r.name}
            {!!r.is_predefined && (
              <span className="text-[9px] font-bold px-1 py-0.2 bg-zinc-100 text-zinc-500 rounded tracking-wider border border-zinc-200">
                PREDEFINED
              </span>
            )}
          </span>
        ),
      },
      {
        key: 'pay_head_type',
        label: 'Type',
        span: 'col-span-4',
        render: (r: PayHeadType) => <span className="text-zinc-500">{r.pay_head_type}</span>,
      },
      {
        key: 'calculation_type',
        label: 'Calculation',
        span: 'col-span-3',
        render: (r: PayHeadType) => <span className="text-zinc-400">{r.calculation_type}</span>,
      },
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
        onCancel={() => navigate('/master/alter')}
        onCreate={() => navigate('/master/create/pay-head')}
        createLabel="Create Pay Head"
        rowKey={(r) => String(r.pay_head_id)}
        emptyMessage="No pay heads found."
      />
    );
  }

  const isPredefined = !!selected.is_predefined;
  const dis = (extra = '') =>
    `${isPredefined ? 'text-zinc-500 cursor-not-allowed bg-zinc-50' : ''} ${extra}`;
  const statutoryList = STATUTORY_PAY_TYPES[form.pay_head_type] || [];
  const showCalc = form.pay_head_type !== 'Not Applicable' && form.pay_head_type !== 'Gratuity';

  const alterActions = [
    ...(isPredefined ? [] : [{ key: 'Alt+A', label: 'Accept', onClick: handleSubmit }]),
    ...(isPredefined ? [] : [{ key: 'Alt+D', label: 'Delete', onClick: handleDelete }]),
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
      <PageTitleBar title={`Alter Pay Head: ${selected.name}`} subtitle={selectedCompany?.name} />

      {error && <AlertBanner type="error" message={error} onDismiss={() => setError(null)} />}
      {success && (
        <AlertBanner type="success" message={success} onDismiss={() => setSuccess(null)} />
      )}

      {isPredefined && (
        <div className="px-3 py-1.5 border-b border-zinc-200 bg-zinc-50 text-zinc-500 text-xs shrink-0 select-none">
          Predefined pay heads cannot be altered or deleted.
        </div>
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
                autoFocus={!isPredefined}
                disabled={isPredefined}
                className={`${inputCls} ${dis()}`}
                value={form.name}
                onChange={setField('name')}
              />
            </FormRow>
            <FormRow label="(alias)" labelWidth="w-44" className="flex items-center min-h-[26px]">
              <input
                disabled={isPredefined}
                className={`${inputCls} ${dis()}`}
                value={form.alias}
                onChange={setField('alias')}
              />
            </FormRow>
          </div>

          <div className="p-3 border-t border-zinc-100 space-y-1.5">
            <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-2">
              Pay Head Information
            </div>
            <FormRow
              label="Pay Head Type"
              labelWidth="w-44"
              className="flex items-center min-h-[26px]"
            >
              <select
                disabled={isPredefined}
                className={`${selectCls} ${dis()}`}
                value={form.pay_head_type}
                onChange={onPayHeadTypeChange}
              >
                {PAY_HEAD_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </FormRow>

            {showsStatutoryPayType(form.pay_head_type) && (
              <FormRow
                label="Statutory Pay Type"
                labelWidth="w-44"
                className="flex items-center min-h-[26px]"
              >
                <select
                  disabled={isPredefined}
                  className={`${selectCls} ${dis()}`}
                  value={form.statutory_pay_type}
                  onChange={(e) => onStatutoryPayType(e.target.value)}
                >
                  <option value="">Select…</option>
                  {statutoryList.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </FormRow>
            )}

            {showsIncomeType(form.pay_head_type) && (
              <FormRow
                label="Income Type"
                labelWidth="w-44"
                className="flex items-center min-h-[26px]"
              >
                <select
                  disabled={isPredefined}
                  className={`${selectCls} ${dis()}`}
                  value={form.income_type}
                  onChange={setField('income_type')}
                >
                  {INCOME_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </FormRow>
            )}

            <FormRow label="Under" labelWidth="w-44" className="flex items-center min-h-[26px]">
              <select
                disabled={isPredefined}
                className={`${selectCls} ${dis()}`}
                value={form.under_group}
                onChange={setField('under_group')}
              >
                <option value="Direct Expenses">Direct Expenses</option>
                <option value="Indirect Expenses">Indirect Expenses</option>
                <option value="Current Liabilities">Current Liabilities</option>
                <option value="Current Assets">Current Assets</option>
                <option value="Loans & Advances (Asset)">Loans &amp; Advances (Asset)</option>
                <option value="Direct Incomes">Direct Incomes</option>
                <option value="Indirect Incomes">Indirect Incomes</option>
              </select>
            </FormRow>

            {form.pay_head_type !== 'Not Applicable' && form.pay_head_type !== 'Gratuity' && (
              <FormRow
                label="Affect Net Salary"
                labelWidth="w-44"
                className="flex items-center min-h-[26px]"
              >
                <select
                  disabled={isPredefined}
                  className={`${selectCls} ${dis()}`}
                  value={form.affects_net_salary}
                  onChange={setField('affects_net_salary')}
                >
                  <option>Yes</option>
                  <option>No</option>
                </select>
              </FormRow>
            )}

            {form.pay_head_type !== 'Not Applicable' && form.pay_head_type !== 'Gratuity' && (
              <FormRow
                label="Payslip Display Name"
                labelWidth="w-44"
                className="flex items-center min-h-[26px]"
              >
                <input
                  disabled={isPredefined}
                  className={`${inputCls} ${dis()}`}
                  value={form.payslip_display_name}
                  onChange={setField('payslip_display_name')}
                />
              </FormRow>
            )}

            {form.statutory_pay_type === 'Professional Tax' && (
              <FormRow
                label="Registration Number"
                labelWidth="w-44"
                className="flex items-center min-h-[26px]"
              >
                <input
                  disabled={isPredefined}
                  className={`${inputCls} ${dis()}`}
                  value={form.registration_number}
                  onChange={setField('registration_number')}
                />
              </FormRow>
            )}

            {form.statutory_pay_type === 'EDLI Admin Charges (A/c No. 22)' && (
              <FormRow
                label="Contribute min of Rs.2/employee"
                labelWidth="w-44"
                className="flex items-center min-h-[26px]"
              >
                <select
                  disabled={isPredefined}
                  className={`${selectCls} ${dis()}`}
                  value={form.contribute_min_rs2}
                  onChange={setField('contribute_min_rs2')}
                >
                  <option>No</option>
                  <option>Yes</option>
                </select>
              </FormRow>
            )}

            {showsGratuityAndIT(form.pay_head_type) && (
              <>
                <FormRow
                  label="Use for Gratuity"
                  labelWidth="w-44"
                  className="flex items-center min-h-[26px]"
                >
                  <select
                    disabled={isPredefined}
                    className={`${selectCls} ${dis()}`}
                    value={form.use_for_gratuity}
                    onChange={setField('use_for_gratuity')}
                  >
                    <option>No</option>
                    <option>Yes</option>
                  </select>
                </FormRow>
                <FormRow
                  label="Set/Alter IT Details"
                  labelWidth="w-44"
                  className="flex items-center min-h-[26px]"
                >
                  <select
                    disabled={isPredefined}
                    className={`${selectCls} ${dis()}`}
                    value={form.set_alter_income_tax}
                    onChange={onSetAlterIT}
                  >
                    <option>No</option>
                    <option>Yes</option>
                  </select>
                </FormRow>
              </>
            )}
          </div>

          {showCalc && calcConfig && (
            <>
              <div className="p-3 border-t border-zinc-100 space-y-1.5">
                <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-2">
                  Calculation Type
                </div>
                <FormRow
                  label="Calculation Type"
                  labelWidth="w-44"
                  className="flex items-center min-h-[26px]"
                >
                  <select
                    disabled={isPredefined}
                    className={`${selectCls} ${dis()}`}
                    value={form.calculation_type}
                    onChange={(e) => onCalcType(e.target.value)}
                  >
                    {CALCULATION_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </FormRow>
              </div>

              {form.calculation_type !== 'As Per Income Tax Slab' &&
                (isPredefined ? (
                  // Predefined heads stay read-only (never computed) — show the simple calc/rounding fields disabled.
                  <div className="p-3 border-t border-zinc-100 space-y-1.5">
                    <FormRow
                      label="Calculation Period"
                      labelWidth="w-44"
                      className="flex items-center min-h-[26px]"
                    >
                      <input
                        disabled
                        className={`${inputCls} ${dis()}`}
                        value={form.calculation_period}
                        readOnly
                      />
                    </FormRow>
                    {(form.calculation_type === 'As User Defined Value' ||
                      form.calculation_type === 'Flat Rate') && (
                      <FormRow
                        label="Value"
                        labelWidth="w-44"
                        className="flex items-center min-h-[26px]"
                      >
                        <input
                          type="number"
                          step="0.01"
                          disabled
                          className={`${inputCls} text-right max-w-[120px] ${dis()}`}
                          value={form.percentage_or_amount}
                          readOnly
                        />
                      </FormRow>
                    )}
                    <FormRow
                      label="Rounding Method"
                      labelWidth="w-44"
                      className="flex items-center min-h-[26px]"
                    >
                      <input
                        disabled
                        className={`${inputCls} ${dis()}`}
                        value={form.rounding_method}
                        readOnly
                      />
                    </FormRow>
                  </div>
                ) : (
                  <PayHeadCalculationPanel
                    config={calcConfig}
                    slabs={slabs}
                    formulaLines={formulaLines}
                    companyId={companyId}
                    onConfigChange={handleCalcChange}
                    onConfigNumberChange={handleCalcNumberChange}
                    onSlabAdd={() =>
                      setSlabs((s) => [
                        ...s,
                        {
                          effective_from: '',
                          amount_gt: 0,
                          amount_up_to: 0,
                          slab_type: 'Percentage',
                          value: 0,
                        },
                      ])
                    }
                    onSlabDelete={(i) => setSlabs((s) => s.filter((_, idx) => idx !== i))}
                    onSlabChange={(i, field, value) =>
                      setSlabs((s) =>
                        s.map((sl, idx) => (idx === i ? { ...sl, [field]: value } : sl)),
                      )
                    }
                    onFormulaAdd={(line) =>
                      setFormulaLines((f) => [...f, { ...line, sequence: f.length }])
                    }
                    onFormulaDelete={(i) => setFormulaLines((f) => f.filter((_, idx) => idx !== i))}
                  />
                ))}

              {!isComputedType(form.calculation_type) && (
                <div className="p-3 border-t border-zinc-100 space-y-1.5">
                  <FormRow
                    label="Opening Balance ( on 1-Apr-26 )"
                    labelWidth="w-44"
                    className="flex items-center min-h-[26px]"
                  >
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        step="0.01"
                        disabled={isPredefined}
                        className={`${inputCls} text-right max-w-[140px] ${dis()}`}
                        value={form.opening_balance}
                        onChange={setNumber('opening_balance')}
                      />
                      <select
                        disabled={isPredefined}
                        className={`bg-transparent text-sm outline-none px-1.5 py-0.5 border border-zinc-200 hover:border-zinc-300 focus:border-zinc-800 transition-colors bg-white/50 rounded w-16 ${dis()}`}
                        value={form.opening_balance_type}
                        onChange={setField('opening_balance_type')}
                      >
                        <option value="Dr">Dr</option>
                        <option value="Cr">Cr</option>
                      </select>
                    </div>
                  </FormRow>
                </div>
              )}
            </>
          )}

          {form.pay_head_type === 'Gratuity' && !isPredefined && (
            <div className="p-3 border-t border-zinc-100">
              <button
                onClick={() => setShowGratuityPopup(true)}
                className="px-2 py-1 text-xs font-semibold bg-white text-zinc-900 border border-zinc-900 hover:bg-zinc-100"
              >
                Edit Gratuity Slab Rates
              </button>
            </div>
          )}

          <div className="flex-1" />
        </div>

        <div className="w-56 border-l border-zinc-200 flex flex-col shrink-0 bg-zinc-50/25 p-3">
          <div className="w-full border border-zinc-200 rounded shrink-0 bg-white">
            <div className="text-center text-[10px] font-bold border-b border-zinc-100 py-1 bg-zinc-50 text-zinc-500 uppercase tracking-wider">
              Total Opening Balance
            </div>
            {(() => {
              const dr = totalOpeningBalance?.totalDr ?? 0;
              const cr = totalOpeningBalance?.totalCr ?? 0;
              const diff = dr - cr;
              return (
                <div className="text-[11px] font-mono tabular-nums text-zinc-800">
                  <div className="flex justify-between px-3 py-1">
                    <span className="text-zinc-500">Dr</span>
                    <span className="font-semibold">{dr.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between px-3 py-1 border-b border-zinc-100">
                    <span className="text-zinc-500">Cr</span>
                    <span className="font-semibold">{cr.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between px-3 py-1.5 font-bold border-t border-zinc-900">
                    <span>Difference</span>
                    <span>
                      {Math.abs(diff).toFixed(2)} {diff >= 0 ? 'Dr' : 'Cr'}
                    </span>
                  </div>
                </div>
              );
            })()}
          </div>
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

      <div data-enter-nav-ignore className="contents">
        <IncomeTaxDetailsPopup
          open={showITPopup}
          value={{
            it_component: form.it_component,
            it_calculation_basis: form.it_calculation_basis,
            it_deduct_tds_across_periods: form.it_deduct_tds_across_periods,
          }}
          onChange={(v) => setForm((f) => (f ? { ...f, ...v } : null))}
          onClose={() => setShowITPopup(false)}
        />

        <GratuitySlabPopup
          open={showGratuityPopup}
          gratuityDaysPerMonth={form.gratuity_days_per_month}
          slabs={gratuitySlabs}
          onDaysChange={(v) => setForm((f) => (f ? { ...f, gratuity_days_per_month: v } : null))}
          onSlabsChange={setGratuitySlabs}
          onClose={() => setShowGratuityPopup(false)}
        />
      </div>
    </div>
  );
}
