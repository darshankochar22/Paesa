'use strict';

const {
  round2,
  sumField,
  loadCompanyHeader,
  loadEmployeeBasis,
  isEEDeduction,
  matchLine,
} = require('./payrollReportBasis');

// ---------------------------------------------------------------------------
// Income Tax (TDS on Salary — section 192) statutory reports — Payroll Reports →
// Income Tax. Salary income comes from the active salary-structure basis (monthly
// figures annualised over 12 months, the standard projection when there is no
// payroll-run engine). Professional Tax is a genuine section-16 deduction and is
// carried through; TDS is the tax actually deducted through the IT deduction pay
// head. No tax-slab engine exists, so computed tax liability is never fabricated —
// the report shows the taxable build-up and the tax on record.
// ---------------------------------------------------------------------------
const IT_RE = /income\s*tax|(^|\W)tds(\W|$)|i\.?tax/i;
const PT_RE = /professional\s*tax|(^|\W)p\.?\s?tax(\W|$)|(^|\W)pt(\W|$)/i;

// E-TDS quarter for a date: Q1 Apr-Jun, Q2 Jul-Sep, Q3 Oct-Dec, Q4 Jan-Mar.
const quarterLabel = (dateStr) => {
  const m = Number(String(dateStr || '').substring(5, 7));
  if (m >= 4 && m <= 6) return 'Q1 (Apr - Jun)';
  if (m >= 7 && m <= 9) return 'Q2 (Jul - Sep)';
  if (m >= 10 && m <= 12) return 'Q3 (Oct - Dec)';
  return 'Q4 (Jan - Mar)';
};

const monthsBetween = (from, to) => {
  const a = new Date(from);
  const b = new Date(to);
  if (isNaN(a) || isNaN(b)) return [];
  const out = [];
  const cur = new Date(a.getFullYear(), a.getMonth(), 1);
  while (cur <= b && out.length < 24) {
    out.push(cur.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }));
    cur.setMonth(cur.getMonth() + 1);
  }
  return out;
};

// Per-employee income-tax basis: annualised gross, professional tax, taxable income
// and TDS deducted, plus monthly earnings/deductions for the projection report.
const loadITEmployees = async (company_id) => {
  const emps = await loadEmployeeBasis(company_id);
  const matchIT = matchLine(IT_RE);
  const matchPT = matchLine(PT_RE);
  return emps.map((e) => {
    let tds = 0;
    let pt = 0;
    let deductions = 0;
    for (const l of e.lines) {
      if (!isEEDeduction(l.pay_head_type)) continue;
      deductions += l.amount;
      if (matchIT(l)) tds += l.amount;
      else if (matchPT(l)) pt += l.amount;
    }
    const grossAnnual = round2(e.earnings * 12);
    const ptAnnual = round2(pt * 12);
    return {
      ...e,
      monthly_earnings: round2(e.earnings),
      monthly_deductions: round2(deductions),
      monthly_tds: round2(tds),
      gross_annual: grossAnnual,
      pt_annual: ptAnnual,
      taxable_annual: round2(grossAnnual - ptAnnual),
      tds_annual: round2(tds * 12),
    };
  });
};

const isTaxable = (e) => e.gross_annual > 0 || e.tds_annual > 0 || !!e.pan;
const periodLabel = ({ from, to } = {}) => (from && to ? `${from} to ${to}` : '');

// #228 Computation — per-employee income-tax computation statement.
const getComputation = async (company_id, params = {}) => {
  try {
    const establishment = await loadCompanyHeader(company_id);
    const emps = (await loadITEmployees(company_id)).filter(isTaxable);
    const rows = emps.map((e, i) => ({
      sl: i + 1,
      name: e.name,
      pan: e.pan,
      regime: e.tax_regime,
      gross: e.gross_annual,
      professional_tax: e.pt_annual,
      taxable: e.taxable_annual,
      tds: e.tds_annual,
    }));
    const totals = {
      gross: sumField(rows, 'gross'),
      professional_tax: sumField(rows, 'professional_tax'),
      taxable: sumField(rows, 'taxable'),
      tds: sumField(rows, 'tds'),
    };
    return {
      success: true,
      payload: { establishment, rows, totals, period_label: periodLabel(params) },
    };
  } catch (err) {
    return { success: false, error: err.message };
  }
};

// #229 Salary Projection — the active structure projected across the financial year.
const getSalaryProjection = async (company_id, params = {}) => {
  try {
    const establishment = await loadCompanyHeader(company_id);
    const emps = (await loadITEmployees(company_id)).filter((e) => e.monthly_earnings > 0);
    const rows = emps.map((e, i) => ({
      sl: i + 1,
      name: e.name,
      designation: e.designation,
      monthly_earnings: e.monthly_earnings,
      monthly_deductions: e.monthly_deductions,
      monthly_net: round2(e.monthly_earnings - e.monthly_deductions),
      annual_earnings: e.gross_annual,
      annual_deductions: round2(e.monthly_deductions * 12),
      annual_net: round2((e.monthly_earnings - e.monthly_deductions) * 12),
    }));
    const totals = {
      monthly_earnings: sumField(rows, 'monthly_earnings'),
      annual_earnings: sumField(rows, 'annual_earnings'),
      annual_net: sumField(rows, 'annual_net'),
    };
    return {
      success: true,
      payload: { establishment, rows, totals, period_label: periodLabel(params) },
    };
  } catch (err) {
    return { success: false, error: err.message };
  }
};

// #230 Challan Reconciliation — month-wise TDS-on-salary liability against challans
// deposited. Liability is the real monthly TDS from payroll; the deposited side (BSR
// code, challan number/date, amount) stays blank until a challan is reconciled — not
// fabricated.
const getChallanReconciliation = async (company_id, params = {}) => {
  try {
    const establishment = await loadCompanyHeader(company_id);
    const emps = await loadITEmployees(company_id);
    const monthlyTds = round2(emps.reduce((s, e) => s + e.monthly_tds, 0));
    const months = monthsBetween(params.from, params.to);
    const rows = months.map((m, i) => ({
      sl: i + 1,
      month: m,
      liability: monthlyTds,
      bsr_code: '',
      challan_no: '',
      challan_date: '',
      deposited: 0,
      balance: monthlyTds,
    }));
    const totals = {
      liability: round2(monthlyTds * rows.length),
      deposited: 0,
      balance: round2(monthlyTds * rows.length),
    };
    return {
      success: true,
      payload: { establishment, rows, totals, period_label: periodLabel(params) },
    };
  } catch (err) {
    return { success: false, error: err.message };
  }
};

// #231 E-24Q — the electronic quarterly salary-TDS return, rendered as the deductee
// (Annexure II) upload grid: PAN, employee, amount paid/credited, tax deducted.
const getE24Q = async (company_id, params = {}) => {
  try {
    const establishment = await loadCompanyHeader(company_id);
    const emps = (await loadITEmployees(company_id)).filter(isTaxable);
    const rows = emps.map((e, i) => ({
      sl: i + 1,
      pan: e.pan,
      name: e.name,
      amount_paid: e.gross_annual,
      tax_deducted: e.tds_annual,
      tax_deposited: e.tds_annual,
    }));
    const totals = {
      amount_paid: sumField(rows, 'amount_paid'),
      tax_deducted: sumField(rows, 'tax_deducted'),
      tax_deposited: sumField(rows, 'tax_deposited'),
    };
    return {
      success: true,
      payload: { establishment, rows, totals, period_label: periodLabel(params) },
    };
  } catch (err) {
    return { success: false, error: err.message };
  }
};

// #232 Form 27A — the control/summary sheet that accompanies an e-TDS return:
// deductor identity plus control totals of deductee records, amount paid and TDS.
const getForm27A = async (company_id, params = {}) => {
  try {
    const establishment = await loadCompanyHeader(company_id);
    const emps = (await loadITEmployees(company_id)).filter(isTaxable);
    const control = {
      deductee_records: emps.length,
      total_amount_paid: sumField(emps, 'gross_annual'),
      total_tax_deducted: sumField(emps, 'tds_annual'),
      total_tax_deposited: sumField(emps, 'tds_annual'),
    };
    return {
      success: true,
      payload: { establishment, control, period_label: periodLabel(params) },
    };
  } catch (err) {
    return { success: false, error: err.message };
  }
};

// #233 Form 24Q — the statutory quarterly statement of TDS from salaries (Annexure I:
// deductee-wise breakup of tax deducted for the quarter).
const getForm24Q = async (company_id, params = {}) => {
  try {
    const establishment = await loadCompanyHeader(company_id);
    const emps = (await loadITEmployees(company_id)).filter(isTaxable);
    const rows = emps.map((e, i) => ({
      sl: i + 1,
      pan: e.pan,
      name: e.name,
      amount_paid: e.gross_annual,
      tax_deducted: e.tds_annual,
    }));
    const totals = {
      amount_paid: sumField(rows, 'amount_paid'),
      tax_deducted: sumField(rows, 'tax_deducted'),
    };
    return {
      success: true,
      payload: {
        establishment,
        rows,
        totals,
        quarter: quarterLabel(params.to),
        period_label: periodLabel(params),
      },
    };
  } catch (err) {
    return { success: false, error: err.message };
  }
};

// #234 Annexure I to 24Q — the quarterly deductee-wise break-up of tax deducted
// under section 192. Amount paid and TDS are real; surcharge/cess stay zero (no
// tax-slab engine) and deposit dates blank until reconciled — not fabricated.
const getAnnexureI = async (company_id, params = {}) => {
  try {
    const establishment = await loadCompanyHeader(company_id);
    const emps = (await loadITEmployees(company_id)).filter(isTaxable);
    const rows = emps.map((e, i) => ({
      sl: i + 1,
      pan: e.pan,
      name: e.name,
      section: '192',
      amount_paid: e.gross_annual,
      tds: e.tds_annual,
      surcharge: 0,
      cess: 0,
      total_deducted: e.tds_annual,
      total_deposited: e.tds_annual,
    }));
    const totals = {
      amount_paid: sumField(rows, 'amount_paid'),
      tds: sumField(rows, 'tds'),
      total_deducted: sumField(rows, 'total_deducted'),
      total_deposited: sumField(rows, 'total_deposited'),
    };
    return {
      success: true,
      payload: {
        establishment,
        rows,
        totals,
        quarter: quarterLabel(params.to),
        period_label: periodLabel(params),
      },
    };
  } catch (err) {
    return { success: false, error: err.message };
  }
};

// #235 Annexure II to 24Q — the year-end salary detail (filed with the Q4 return):
// per employee the gross salary, section-16 deductions (Professional Tax), income
// chargeable, Chapter VI-A deductions, taxable income and tax deducted. Chapter VI-A
// and computed tax stay zero shells (no investment-declaration / slab engine).
const getAnnexureII = async (company_id, params = {}) => {
  try {
    const establishment = await loadCompanyHeader(company_id);
    const emps = (await loadITEmployees(company_id)).filter(isTaxable);
    const rows = emps.map((e, i) => ({
      sl: i + 1,
      pan: e.pan,
      name: e.name,
      gross_salary: e.gross_annual,
      deductions_16: e.pt_annual,
      income_chargeable: e.taxable_annual,
      chapter_via: 0,
      taxable_income: e.taxable_annual,
      tax_payable: 0,
      tds: e.tds_annual,
    }));
    const totals = {
      gross_salary: sumField(rows, 'gross_salary'),
      deductions_16: sumField(rows, 'deductions_16'),
      taxable_income: sumField(rows, 'taxable_income'),
      tds: sumField(rows, 'tds'),
    };
    return {
      success: true,
      payload: { establishment, rows, totals, period_label: periodLabel(params) },
    };
  } catch (err) {
    return { success: false, error: err.message };
  }
};

// #236 Form 16 — the section-203 TDS certificate, one per employee. Part A carries the
// deductor/deductee identity and the tax deducted & deposited; Part B is the salary
// build-up to taxable income. Computed tax liability stays a zero shell (no slab engine).
const getForm16 = async (company_id, params = {}) => {
  try {
    const establishment = await loadCompanyHeader(company_id);
    const emps = (await loadITEmployees(company_id)).filter(isTaxable);
    const certificates = emps.map((e, i) => ({
      sl: i + 1,
      pan: e.pan,
      name: e.name,
      designation: e.designation,
      gross_salary: e.gross_annual,
      deductions_16: e.pt_annual,
      income_chargeable: e.taxable_annual,
      chapter_via: 0,
      taxable_income: e.taxable_annual,
      tax_payable: 0,
      tds: e.tds_annual,
    }));
    return {
      success: true,
      payload: { establishment, certificates, period_label: periodLabel(params) },
    };
  } catch (err) {
    return { success: false, error: err.message };
  }
};

module.exports = {
  loadITEmployees,
  getComputation,
  getSalaryProjection,
  getChallanReconciliation,
  getE24Q,
  getForm27A,
  getForm24Q,
  getAnnexureI,
  getAnnexureII,
  getForm16,
};
