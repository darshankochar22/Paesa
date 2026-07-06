'use strict';

const { db } = require('../db/index');
const { sql } = require('drizzle-orm');

// ---------------------------------------------------------------------------
// Payroll Statutory reports (#206) — Summary + Pay Head Details drill.
// Amounts come from ACTIVE salary structures joined to pay heads (the same basis
// Pay Sheet uses — there is no payroll-run engine yet). "Paid" stays 0 until
// statutory payment vouchers are tracked — honest blank, like Tally's empty EDU.
// ---------------------------------------------------------------------------

// Category rows shown per statutory component (fixed Tally taxonomy).
const SUMMARY_TAXONOMY = [
  {
    component: 'Provident Fund',
    key: 'pf',
    rows: [
      "Employees' Statutory Deductions",
      "Employer's Statutory Contributions",
      "Employer's Other Charges",
    ],
  },
  {
    component: 'Employee State Insurance',
    key: 'esi',
    rows: ["Employees' Statutory Deductions", "Employer's Statutory Contributions"],
  },
  {
    component: 'National Pension Scheme',
    key: 'nps',
    rows: ["Employees' Statutory Deductions", "Employer's Statutory Contributions"],
  },
  { component: 'Professional Tax', key: 'pt', rows: ["Employees' Statutory Deductions"] },
  { component: 'Income Tax', key: 'it', rows: ["Employees' Statutory Deductions"] },
];

// Component match — checks statutory_pay_type, statutory_component and the pay head
// name against the component's aliases (short codes like 'PF'/'PT'/'TDS' included).
const COMPONENT_RE = {
  pf: /provident|(^|\W)pf(\W|$)|eps account|voluntary pf/i,
  esi: /state insurance|(^|\W)esi(\W|$)/i,
  nps: /national pension|(^|\W)nps(\W|$)/i,
  pt: /professional tax|(^|\W)pt(\W|$)/i,
  it: /income tax|(^|\W)tds(\W|$)|(^|\W)it(\W|$)/i,
};

const matchesComponent = (ph, key) => {
  const re = COMPONENT_RE[key];
  if (!re) return false;
  const hay = [ph.statutory_pay_type, ph.statutory_component, ph.name]
    .map((s) => String(s || ''))
    .join(' | ');
  // NPS strings also contain "Pension" — keep PF from swallowing them.
  if (key === 'pf' && COMPONENT_RE.nps.test(hay)) return false;
  return re.test(hay);
};

// Pay-head-type match per summary row — tolerates the short seeded variants
// ('Deductions', 'Employer Statutory Contributions') beside the full Tally names.
const matchesRowType = (ph, rowLabel) => {
  const t = String(ph.pay_head_type || '').toLowerCase();
  if (/other charges/.test(rowLabel.toLowerCase())) return /other charges/.test(t);
  if (/employer/.test(rowLabel.toLowerCase())) return /employer/.test(t) && /contribution/.test(t);
  // Employees' Statutory Deductions row — any deduction-side pay head.
  return /deduction/.test(t) && !/employer/.test(t);
};

const loadPayHeadAmounts = async (company_id) => {
  // One row per pay head with its summed active salary-structure amount.
  return db.all(
    sql`SELECT ph.pay_head_id, ph.name, ph.pay_head_type, ph.statutory_component,
               ph.statutory_pay_type,
               COALESCE(SUM(CASE WHEN ss.is_active = 1 THEN ss.amount ELSE 0 END), 0) AS amount
        FROM pay_heads ph
        LEFT JOIN salary_structures ss ON ss.pay_head_id = ph.pay_head_id
        LEFT JOIN employees e ON e.employee_id = ss.employee_id AND e.is_active = 1
        WHERE ph.company_id = ${company_id} AND ph.is_active = 1
        GROUP BY ph.pay_head_id`,
  );
};

// Payroll Statutory Summary — sections × (Payable, Paid).
const getStatutorySummary = async (company_id) => {
  try {
    const heads = await loadPayHeadAmounts(company_id);
    const sections = SUMMARY_TAXONOMY.map((sec) => ({
      component: sec.component,
      key: sec.key,
      rows: sec.rows.map((label) => {
        const payable = heads
          .filter((ph) => matchesComponent(ph, sec.key) && matchesRowType(ph, label))
          .reduce((s, ph) => s + (Number(ph.amount) || 0), 0);
        return { label, payable, paid: 0 };
      }),
    }));
    const grand_total = sections.flatMap((s) => s.rows).reduce((s, r) => s + r.payable, 0);
    return { success: true, payload: { sections, grand_total } };
  } catch (err) {
    return { success: false, error: err.message };
  }
};

// Pay Head Details — the pay heads behind one summary row (component optional so the
// screen can also show a bare pay-head-type filter, exactly like Tally's header).
const getStatutoryPayHeadDetails = async (company_id, { component, row_label } = {}) => {
  try {
    const heads = await loadPayHeadAmounts(company_id);
    const rows = heads
      .filter(
        (ph) =>
          (!component || matchesComponent(ph, component)) &&
          (!row_label || matchesRowType(ph, row_label)),
      )
      .map((ph) => ({
        pay_head_id: ph.pay_head_id,
        name: ph.name,
        gross: Number(ph.amount) || 0,
        payable: Number(ph.amount) || 0,
        paid: 0,
      }))
      .sort((a, b) => a.name.localeCompare(b.name)); // zero rows stay — Tally lists the heads regardless
    return { success: true, payload: { rows } };
  } catch (err) {
    return { success: false, error: err.message };
  }
};

module.exports = { getStatutorySummary, getStatutoryPayHeadDetails };
