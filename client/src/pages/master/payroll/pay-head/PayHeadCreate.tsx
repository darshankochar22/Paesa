import { useState, useCallback, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCompany } from '@/context/CompanyContext';
import {
  FormRow,
  PageTitleBar,
  RightActionPanel,
  MasterFormFooter,
  AlertBanner,
} from '@/components/ui';
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
import type { PayHeadFormulaLineType, PayHeadSlabLineType } from '@/types/entities/Payroll';
import { useMasterShortcuts } from '@/hooks/useMasterShortcuts';

const inputCls =
  'flex-1 bg-transparent text-sm outline-none px-1.5 py-0.5 border border-transparent hover:border-zinc-200 focus:border-zinc-800 transition-colors bg-white/50 rounded';
const selectCls =
  'bg-transparent text-sm outline-none px-1.5 py-0.5 border border-transparent hover:border-zinc-200 focus:border-zinc-800 transition-colors bg-white/50 rounded w-44';

export default function PayHeadCreate() {
  const navigate = useNavigate();
  const { selectedCompany } = useCompany();
  const companyId = selectedCompany?.company_id;
  const nameRef = useRef<HTMLInputElement>(null);
  const aliasRef = useRef<HTMLInputElement>(null);
  const payHeadTypeRef = useRef<HTMLSelectElement>(null);
  const payslipDisplayNameRef = useRef<HTMLInputElement>(null);
  const registrationNumberRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [alias, setAlias] = useState('');
  const [pay_head_type, setPayHeadType] = useState('Earnings for Employees');
  const [statutory_pay_type, setStatutoryPayType] = useState('');
  const [income_type, setIncomeType] = useState('Fixed');
  const [under_group, setUnderGroup] = useState('Direct Expenses');
  const [affects_net_salary, setAffectsNetSalary] = useState('Yes');
  const [payslip_display_name, setPayslipDisplayName] = useState('');
  const [use_for_gratuity, setUseForGratuity] = useState('No');
  const [set_alter_income_tax, setSetAlterIncomeTax] = useState('No');
  const [calculation_type, setCalculationType] = useState('As User Defined Value');
  const [calculation_period, setCalculationPeriod] = useState('Months');
  const [percentage_or_amount, setPercentageOrAmount] = useState(0);
  const [rounding_method, setRoundingMethod] = useState('Not Applicable');
  const [rounding_limit, setRoundingLimit] = useState(0);
  const [compute_method, setComputeMethod] = useState('On Current Earnings Total');
  const [leave_without_pay, setLeaveWithoutPay] = useState('Not Applicable');
  const [production_type, setProductionType] = useState('Not Applicable');
  const [opening_balance, setOpeningBalance] = useState(0);
  const [opening_balance_type, setOpeningBalanceType] = useState('Dr');
  const [totalOpeningBalance, setTotalOpeningBalance] = useState<{
    totalDr: number;
    totalCr: number;
    netBalance: number;
    balanceType: string;
  } | null>(null);
  const [registration_number, setRegistrationNumber] = useState('');
  const [contribute_min_rs2, setContributeMinRs2] = useState('No');

  // Income Tax Details popup state
  const [showITPopup, setShowITPopup] = useState(false);
  const [it_component, setItComponent] = useState('Not Applicable');
  const [it_calculation_basis, setItCalculationBasis] = useState('On Actual Value');
  const [it_deduct_tds_across_periods, setItDeductTds] = useState('No');

  // Gratuity popup state
  const [showGratuityPopup, setShowGratuityPopup] = useState(false);
  const [gratuity_days_per_month, setGratuityDaysPerMonth] = useState(0);
  const [gratuitySlabs, setGratuitySlabs] = useState<GratuitySlab[]>([]);

  const [slabs, setSlabs] = useState<PayHeadSlabLineType[]>([]);
  const [formulaLines, setFormulaLines] = useState<PayHeadFormulaLineType[]>([]);

  const loadTotalOpeningBalance = useCallback(() => {
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
  }, [companyId]);

  useEffect(() => {
    loadTotalOpeningBalance();
  }, [loadTotalOpeningBalance]);

  const trueVal = (v: string) => (v === 'Yes' ? 1 : 0);

  // As Per Income Tax Slab auto-config (Upward Rounding, Limit 1).
  const applyCalcType = (v: string) => {
    setCalculationType(v);
    if (v === 'As Per Income Tax Slab') {
      setRoundingMethod('Upward Rounding');
      setRoundingLimit(1);
    }
  };

  // Choosing a statutory pay type auto-sets the calculation type per Tally.
  const applyStatutoryPayType = (v: string) => {
    setStatutoryPayType(v);
    if (
      [
        'Income Tax',
        'National Pension Scheme (Tier - I)',
        'National Pension Scheme (Tier - II)',
      ].includes(v)
    ) {
      applyCalcType('As Per Income Tax Slab');
    } else if (v) {
      setCalculationType('As Computed Value');
    }
  };

  const calcConfig = {
    calculation_type,
    calculation_period,
    percentage_or_amount,
    rounding_method,
    rounding_limit,
    compute_method,
    leave_without_pay,
    production_type,
  };

  const handleCalcChange =
    (key: keyof typeof calcConfig) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      const v = e.target.value;
      if (key === 'calculation_type') applyCalcType(v);
      else if (key === 'calculation_period') setCalculationPeriod(v);
      else if (key === 'rounding_method') setRoundingMethod(v);
      else if (key === 'compute_method') setComputeMethod(v);
      else if (key === 'leave_without_pay') setLeaveWithoutPay(v);
      else if (key === 'production_type') setProductionType(v);
    };

  const handleCalcNumberChange =
    (key: keyof typeof calcConfig) => (e: React.ChangeEvent<HTMLInputElement>) => {
      const v = e.target.value === '' ? 0 : Number(e.target.value);
      if (key === 'percentage_or_amount') setPercentageOrAmount(v);
      else if (key === 'rounding_limit') setRoundingLimit(v);
    };

  const onSetAlterIT = (v: string) => {
    setSetAlterIncomeTax(v);
    if (v === 'Yes') setShowITPopup(true);
  };

  const onPayHeadTypeChange = (v: string) => {
    setPayHeadType(v);
    setStatutoryPayType('');
    if (v === 'Gratuity') setShowGratuityPopup(true);
  };

  const validate = (): string | null => {
    if (!name.trim()) return 'Name is required.';
    if (!companyId) return 'No company selected.';
    if (showsStatutoryPayType(pay_head_type) && !statutory_pay_type)
      return 'Statutory pay type is required for this pay head type.';
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
      const itEnabled = set_alter_income_tax === 'Yes';
      const result = await window.api.payHead.create({
        company_id: companyId!,
        name: name.trim(),
        alias: alias.trim() || undefined,
        pay_head_type,
        statutory_pay_type: showsStatutoryPayType(pay_head_type) ? statutory_pay_type : undefined,
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
        compute_method,
        leave_without_pay: calculation_type === 'On Attendance' ? leave_without_pay : undefined,
        production_type: calculation_type === 'On Production' ? production_type : undefined,
        opening_balance: !isComputedType(calculation_type) ? opening_balance : 0,
        opening_balance_type: !isComputedType(calculation_type) ? opening_balance_type : 'Dr',
        registration_number:
          statutory_pay_type === 'Professional Tax' ? registration_number.trim() : undefined,
        contribute_min_rs2:
          statutory_pay_type === 'EDLI Admin Charges (A/c No. 22)'
            ? trueVal(contribute_min_rs2)
            : 0,
        it_component: itEnabled ? it_component : undefined,
        it_calculation_basis: itEnabled ? it_calculation_basis : undefined,
        it_deduct_tds_across_periods: itEnabled ? trueVal(it_deduct_tds_across_periods) : 0,
        gratuity_days_per_month: pay_head_type === 'Gratuity' ? gratuity_days_per_month : 0,
      });

      if (result.success) {
        const pay_head_id = result.payHead.pay_head_id;
        if (pay_head_id && slabs.length > 0) {
          for (const slab of slabs) {
            await window.api.payHead.createSlab({
              pay_head_id,
              effective_from: slab.effective_from,
              amount_gt: slab.amount_gt,
              amount_up_to: slab.amount_up_to,
              slab_type: slab.slab_type,
              value: slab.value,
            });
          }
        }
        if (pay_head_id && formulaLines.length > 0) {
          for (let i = 0; i < formulaLines.length; i++) {
            await window.api.payHead.createFormula({
              pay_head_id,
              sequence: i,
              function: formulaLines[i].function,
              pay_head_id_ref: formulaLines[i].pay_head_id_ref,
              operator: formulaLines[i].operator,
            });
          }
        }
        if (pay_head_id && pay_head_type === 'Gratuity' && gratuitySlabs.length > 0) {
          for (const gs of gratuitySlabs) {
            await window.api.payHead.createGratuitySlab({
              pay_head_id,
              months_from: gs.months_from,
              months_to: gs.months_to,
              eligibility_days: gs.eligibility_days,
            });
          }
        }
        setSuccess(`Pay Head "${name}" created.`);
        setName('');
        setAlias('');
        setPayslipDisplayName('');
        setSlabs([]);
        setFormulaLines([]);
        setGratuitySlabs([]);
        setOpeningBalance(0);
        setOpeningBalanceType('Dr');
        loadTotalOpeningBalance();
        setTimeout(() => setSuccess(null), 3000);
      } else {
        setError(result.error || 'Failed to create pay head.');
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unexpected error.');
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    name,
    alias,
    pay_head_type,
    statutory_pay_type,
    income_type,
    under_group,
    affects_net_salary,
    payslip_display_name,
    use_for_gratuity,
    set_alter_income_tax,
    calculation_type,
    calculation_period,
    percentage_or_amount,
    rounding_method,
    rounding_limit,
    compute_method,
    leave_without_pay,
    production_type,
    opening_balance,
    opening_balance_type,
    registration_number,
    contribute_min_rs2,
    it_component,
    it_calculation_basis,
    it_deduct_tds_across_periods,
    gratuity_days_per_month,
    gratuitySlabs,
    slabs,
    formulaLines,
    companyId,
    loadTotalOpeningBalance,
  ]);

  useMasterShortcuts({
    onAccept: handleSubmit,
    onQuit: () => navigate('/master/create'),
    onCreate: () => navigate('/master/alter/pay-head'),
  });

  const payHeadActions = [
    { key: 'Alt+A', label: 'Accept', onClick: handleSubmit },
    { key: 'Alt+C', label: 'Alter Mode', onClick: () => navigate('/master/alter/pay-head') },
    { key: 'Esc', label: 'Quit', onClick: () => navigate('/master/create') },
  ];

  const statutoryList = STATUTORY_PAY_TYPES[pay_head_type] || [];
  const showCalc = pay_head_type !== 'Not Applicable' && pay_head_type !== 'Gratuity';

  return (
    <div className="flex-1 flex flex-col h-full bg-white select-none" data-enter-nav>
      <PageTitleBar title="Pay Head Creation" subtitle={selectedCompany?.name} />

      {error && <AlertBanner type="error" message={error} onDismiss={() => setError(null)} />}
      {success && (
        <AlertBanner type="success" message={success} onDismiss={() => setSuccess(null)} />
      )}

      <div className="flex-1 flex min-h-0 overflow-x-auto">
        <div className="flex-1 flex flex-col min-w-0 shrink-0 bg-white">
          <div className="p-3 space-y-1.5">
            <FormRow
              label="Name"
              required
              labelWidth="w-44"
              className="flex items-center min-h-[26px]"
            >
              <input
                autoFocus
                ref={nameRef}
                className={inputCls}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Basic Salary"
                onKeyDown={(e) => {
                  if (e.key !== 'Enter') return;
                  e.preventDefault();
                  aliasRef.current?.focus();
                }}
              />
            </FormRow>
            <FormRow label="(alias)" labelWidth="w-44" className="flex items-center min-h-[26px]">
              <input
                ref={aliasRef}
                className={inputCls}
                value={alias}
                onChange={(e) => setAlias(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key !== 'Enter') return;
                  e.preventDefault();
                  payHeadTypeRef.current?.focus();
                }}
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
                ref={payHeadTypeRef}
                className={selectCls}
                value={pay_head_type}
                onChange={(e) => onPayHeadTypeChange(e.target.value)}
              >
                {PAY_HEAD_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </FormRow>

            {showsStatutoryPayType(pay_head_type) && (
              <FormRow
                label="Statutory Pay Type"
                labelWidth="w-44"
                className="flex items-center min-h-[26px]"
              >
                <select
                  className={selectCls}
                  value={statutory_pay_type}
                  onChange={(e) => applyStatutoryPayType(e.target.value)}
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

            {showsIncomeType(pay_head_type) && (
              <FormRow
                label="Income Type"
                labelWidth="w-44"
                className="flex items-center min-h-[26px]"
              >
                <select
                  className={selectCls}
                  value={income_type}
                  onChange={(e) => setIncomeType(e.target.value)}
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
                className={selectCls}
                value={under_group}
                onChange={(e) => setUnderGroup(e.target.value)}
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

            {pay_head_type !== 'Not Applicable' && pay_head_type !== 'Gratuity' && (
              <FormRow
                label="Affect Net Salary"
                labelWidth="w-44"
                className="flex items-center min-h-[26px]"
              >
                <select
                  className={selectCls}
                  value={affects_net_salary}
                  onChange={(e) => setAffectsNetSalary(e.target.value)}
                >
                  <option>Yes</option>
                  <option>No</option>
                </select>
              </FormRow>
            )}

            {pay_head_type !== 'Not Applicable' && pay_head_type !== 'Gratuity' && (
              <FormRow
                label="Name to Display in Payslip"
                labelWidth="w-44"
                className="flex items-center min-h-[26px]"
              >
                <input
                  ref={payslipDisplayNameRef}
                  className={inputCls}
                  value={payslip_display_name}
                  onChange={(e) => setPayslipDisplayName(e.target.value)}
                />
              </FormRow>
            )}

            {statutory_pay_type === 'Professional Tax' && (
              <FormRow
                label="Registration Number"
                labelWidth="w-44"
                className="flex items-center min-h-[26px]"
              >
                <input
                  ref={registrationNumberRef}
                  className={inputCls}
                  value={registration_number}
                  onChange={(e) => setRegistrationNumber(e.target.value)}
                />
              </FormRow>
            )}

            {statutory_pay_type === 'EDLI Admin Charges (A/c No. 22)' && (
              <FormRow
                label="Contribute min of Rs.2/employee"
                labelWidth="w-44"
                className="flex items-center min-h-[26px]"
              >
                <select
                  className={selectCls}
                  value={contribute_min_rs2}
                  onChange={(e) => setContributeMinRs2(e.target.value)}
                >
                  <option>No</option>
                  <option>Yes</option>
                </select>
              </FormRow>
            )}

            {showsGratuityAndIT(pay_head_type) && (
              <>
                <FormRow
                  label="Use for Gratuity"
                  labelWidth="w-44"
                  className="flex items-center min-h-[26px]"
                >
                  <select
                    className={selectCls}
                    value={use_for_gratuity}
                    onChange={(e) => setUseForGratuity(e.target.value)}
                  >
                    <option>No</option>
                    <option>Yes</option>
                  </select>
                </FormRow>
                <FormRow
                  label="Set/Alter Income Tax Details"
                  labelWidth="w-44"
                  className="flex items-center min-h-[26px]"
                >
                  <select
                    className={selectCls}
                    value={set_alter_income_tax}
                    onChange={(e) => onSetAlterIT(e.target.value)}
                  >
                    <option>No</option>
                    <option>Yes</option>
                  </select>
                </FormRow>
              </>
            )}
          </div>

          {showCalc && (
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
                    className={selectCls}
                    value={calculation_type}
                    onChange={(e) => applyCalcType(e.target.value)}
                  >
                    {CALCULATION_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </FormRow>
              </div>

              {calculation_type !== 'As Per Income Tax Slab' && (
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
              )}

              {!isComputedType(calculation_type) && (
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
                        className={`${inputCls} text-right max-w-[140px]`}
                        value={opening_balance}
                        onChange={(e) =>
                          setOpeningBalance(e.target.value === '' ? 0 : Number(e.target.value))
                        }
                      />
                      <select
                        className="bg-transparent text-sm outline-none px-1.5 py-0.5 border border-zinc-200 hover:border-zinc-300 focus:border-zinc-800 transition-colors bg-white/50 rounded w-16"
                        value={opening_balance_type}
                        onChange={(e) => setOpeningBalanceType(e.target.value)}
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

          {pay_head_type === 'Gratuity' && (
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
              // Live preview: current entry's Dr/Cr folded into the saved totals.
              const entryDr = opening_balance_type === 'Dr' ? Math.abs(opening_balance) : 0;
              const entryCr = opening_balance_type === 'Cr' ? Math.abs(opening_balance) : 0;
              const dr = (totalOpeningBalance?.totalDr ?? 0) + entryDr;
              const cr = (totalOpeningBalance?.totalCr ?? 0) + entryCr;
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

        <RightActionPanel actions={payHeadActions} />
      </div>

      <MasterFormFooter
        onCancel={() => navigate('/master/create')}
        onSubmit={handleSubmit}
        loading={loading}
      />

      <div data-enter-nav-ignore className="contents">
        <IncomeTaxDetailsPopup
          open={showITPopup}
          value={{ it_component, it_calculation_basis, it_deduct_tds_across_periods }}
          onChange={(v) => {
            setItComponent(v.it_component);
            setItCalculationBasis(v.it_calculation_basis);
            setItDeductTds(v.it_deduct_tds_across_periods);
          }}
          onClose={() => setShowITPopup(false)}
        />

        <GratuitySlabPopup
          open={showGratuityPopup}
          gratuityDaysPerMonth={gratuity_days_per_month}
          slabs={gratuitySlabs}
          onDaysChange={setGratuityDaysPerMonth}
          onSlabsChange={setGratuitySlabs}
          onClose={() => setShowGratuityPopup(false)}
        />
      </div>
    </div>
  );
}
