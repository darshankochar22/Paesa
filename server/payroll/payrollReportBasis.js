'use strict';

const { db } = require('../db/index');
const { sql } = require('drizzle-orm');

// ---------------------------------------------------------------------------
// Shared basis for the payroll statutory reports (Professional Tax / NPS /
// Gratuity / Income Tax). Amounts come from the active salary-structure basis —
// the same convention PF and ESI reports use (there is no payroll-run engine).
// ---------------------------------------------------------------------------

const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;

const sumField = (rows, key) => round2(rows.reduce((s, r) => s + (Number(r[key]) || 0), 0));

// Company + payroll-statutory header (NPS registration, IT TAN/PAN, responsible person).
const loadCompanyHeader = async (company_id) => {
  const compRows = await db.all(
    sql`SELECT name, mailing_name, address1, address2 FROM companies
        WHERE company_id = ${company_id} LIMIT 1`,
  );
  const comp = compRows[0] || {};
  const statRows = await db.all(
    sql`SELECT nps_corporate_registration_number, nps_corporate_branch_office_number,
               it_tan, it_tan_registration_number, it_circle_or_ward, it_deductor_type,
               it_person_responsible_name, it_designation, it_pan
        FROM payroll_statutory_details WHERE company_id = ${company_id} LIMIT 1`,
  );
  const stat = statRows[0] || {};
  return {
    name: comp.mailing_name || comp.name || '',
    address: [comp.address1, comp.address2].filter(Boolean).join(', '),
    nps_corporate_number: stat.nps_corporate_registration_number || '',
    nps_branch_number: stat.nps_corporate_branch_office_number || '',
    it_tan: stat.it_tan || '',
    it_tan_reg: stat.it_tan_registration_number || '',
    it_circle: stat.it_circle_or_ward || '',
    it_deductor_type: stat.it_deductor_type || '',
    it_pan: stat.it_pan || '',
    responsible_name: stat.it_person_responsible_name || '',
    responsible_designation: stat.it_designation || '',
  };
};

const isEEDeduction = (t) =>
  /deduction/i.test(String(t || '')) && !/employer/i.test(String(t || ''));
const isEmployerContribution = (t) =>
  /employer/i.test(String(t || '')) && /contribution/i.test(String(t || ''));

// True when any of a pay-head line's statutory identifiers matches the pattern.
const matchLine = (re) => (l) =>
  re.test(
    [l.statutory_pay_type, l.statutory_component, l.it_component, l.ph_name]
      .map((s) => String(s || ''))
      .join(' | '),
  );

// One aggregated record per active employee: identity + monthly earnings + the raw
// salary-structure lines (carrying pay-head statutory fields) so each report matches
// exactly the components it needs.
const loadEmployeeBasis = async (company_id) => {
  const lines = await db.all(
    sql`SELECT e.employee_id, e.name, e.pan, e.pran, e.uan, e.state, e.designation,
               e.department, e.date_of_joining, e.date_of_leaving, e.gender,
               e.applicable_tax_regime,
               ph.name AS ph_name, ph.pay_head_type, ph.statutory_component,
               ph.statutory_pay_type, ph.it_component, ph.use_for_gratuity,
               ss.amount
        FROM employees e
        LEFT JOIN salary_structures ss ON ss.employee_id = e.employee_id AND ss.is_active = 1
        LEFT JOIN pay_heads ph ON ph.pay_head_id = ss.pay_head_id
              AND ph.company_id = ${company_id} AND ph.is_active = 1
        WHERE e.company_id = ${company_id} AND e.is_active = 1
        ORDER BY e.name`,
  );
  const map = new Map();
  for (const l of lines) {
    if (!map.has(l.employee_id)) {
      map.set(l.employee_id, {
        employee_id: l.employee_id,
        name: l.name,
        pan: l.pan || '',
        pran: l.pran || '',
        uan: l.uan || '',
        state: l.state || '',
        designation: l.designation || '',
        department: l.department || '',
        date_of_joining: l.date_of_joining || '',
        date_of_leaving: l.date_of_leaving || '',
        gender: l.gender || '',
        tax_regime: l.applicable_tax_regime || '',
        earnings: 0,
        gratuity_wages: 0,
        lines: [],
      });
    }
    const emp = map.get(l.employee_id);
    if (l.ph_name == null || l.amount == null) continue;
    const amt = Number(l.amount) || 0;
    const isEarning = /earning/i.test(String(l.pay_head_type || ''));
    if (isEarning) emp.earnings += amt;
    if (isEarning && Number(l.use_for_gratuity) === 1) emp.gratuity_wages += amt;
    emp.lines.push({
      ph_name: l.ph_name,
      pay_head_type: l.pay_head_type || '',
      statutory_component: l.statutory_component || '',
      statutory_pay_type: l.statutory_pay_type || '',
      it_component: l.it_component || '',
      amount: amt,
    });
  }
  return [...map.values()];
};

module.exports = {
  round2,
  sumField,
  loadCompanyHeader,
  loadEmployeeBasis,
  isEEDeduction,
  isEmployerContribution,
  matchLine,
};
