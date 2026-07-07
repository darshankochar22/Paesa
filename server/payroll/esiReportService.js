'use strict';

const { db } = require('../db/index');
const { sql } = require('drizzle-orm');

// ---------------------------------------------------------------------------
// Employee State Insurance (ESI) statutory reports — Payroll Reports → ESI.
// Establishment header comes from companies + payroll_statutory_details
// (esi_company_code / esi_branch_office). Amounts, where needed, come from the
// same active salary-structure basis the PF reports use (no payroll-run engine).
// ---------------------------------------------------------------------------

const loadEstablishment = async (company_id) => {
  const compRows = await db.all(
    sql`SELECT name, mailing_name, address1, address2 FROM companies
        WHERE company_id = ${company_id} LIMIT 1`,
  );
  const comp = compRows[0] || {};
  const statRows = await db.all(
    sql`SELECT esi_company_code, esi_branch_office FROM payroll_statutory_details
        WHERE company_id = ${company_id} LIMIT 1`,
  );
  const stat = statRows[0] || {};
  return {
    name: comp.mailing_name || comp.name || '',
    address: [comp.address1, comp.address2].filter(Boolean).join(', '),
    esi_code: stat.esi_company_code || '',
    branch_office: stat.esi_branch_office || '',
  };
};

// #218 ESI Form 3 — "Return of Declaration Forms". Lists the insured persons whose
// declaration (Form 1) falls in the period: active employees carrying an ESI number
// whose date of appointment is inside [from, to].
const getESIForm3 = async (company_id, { from, to } = {}) => {
  try {
    const establishment = await loadEstablishment(company_id);
    const rows = await db.all(
      sql`SELECT employee_id, name, father_name, spouse_name, date_of_joining,
                 esi_number, esi_dispensary_name, designation
          FROM employees
          WHERE company_id = ${company_id} AND is_active = 1
            AND esi_number IS NOT NULL AND TRIM(esi_number) != ''
          ORDER BY COALESCE(esi_number, ''), name`,
    );
    const inPeriod = rows.filter((e) => {
      const d = e.date_of_joining || '';
      if (!from || !to) return true;
      return d >= from && d <= to;
    });
    return {
      success: true,
      payload: {
        establishment,
        employees: inPeriod.map((e, i) => ({
          sl: i + 1,
          insurance_number: e.esi_number || '',
          name: e.name,
          father_or_husband: e.father_name || e.spouse_name || '',
          date_of_appointment: e.date_of_joining || '',
          dispensary: e.esi_dispensary_name || '',
          designation: e.designation || '',
          remarks: '',
        })),
      },
    };
  } catch (err) {
    return { success: false, error: err.message };
  }
};

// ---------------------------------------------------------------------------
// Employee-wise ESI contribution basis (shared by Monthly Statement / Form 5 /
// Form 6 / E-Return). ESI amounts come from the same active salary-structure basis
// the PF reports use; components are matched by the pay head's statutory fields.
// ---------------------------------------------------------------------------
const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;
const ESI_RE = /state insurance|(^|\W)esi(\W|$)/i;
const matchesESI = (l) =>
  ESI_RE.test(
    [l.statutory_pay_type, l.statutory_component, l.ph_name]
      .map((s) => String(s || ''))
      .join(' | '),
  );
const isEEDeduction = (t) => /deduction/i.test(t) && !/employer/i.test(t);
const isEREmployer = (t) => /employer/i.test(t) && /contribution/i.test(t);
const isESIMember = (e) => e.ee > 0 || e.er > 0 || !!e.esi_number;

// One record per active employee with ESI wages + employee/employer contributions.
const loadESIEmployees = async (company_id) => {
  const lines = await db.all(
    sql`SELECT e.employee_id, e.name, e.esi_number, e.father_name, e.spouse_name,
               e.date_of_joining, e.date_of_leaving, e.gender, e.esi_dispensary_name,
               ph.name AS ph_name, ph.pay_head_type, ph.statutory_component, ph.statutory_pay_type,
               ss.amount
        FROM employees e
        LEFT JOIN salary_structures ss ON ss.employee_id = e.employee_id AND ss.is_active = 1
        LEFT JOIN pay_heads ph ON ph.pay_head_id = ss.pay_head_id
              AND ph.company_id = ${company_id} AND ph.is_active = 1
        WHERE e.company_id = ${company_id} AND e.is_active = 1
        ORDER BY COALESCE(e.esi_number, ''), e.name`,
  );
  const map = new Map();
  for (const l of lines) {
    if (!map.has(l.employee_id)) {
      map.set(l.employee_id, {
        employee_id: l.employee_id,
        name: l.name,
        esi_number: l.esi_number || '',
        father_or_husband: l.father_name || l.spouse_name || '',
        date_of_joining: l.date_of_joining || '',
        date_of_leaving: l.date_of_leaving || '',
        gender: l.gender || '',
        dispensary: l.esi_dispensary_name || '',
        wages: 0,
        ee: 0,
        er: 0,
      });
    }
    const emp = map.get(l.employee_id);
    if (l.ph_name == null || l.amount == null) continue;
    const amt = Number(l.amount) || 0;
    if (/earning/i.test(String(l.pay_head_type || ''))) emp.wages += amt;
    if (matchesESI(l)) {
      if (isEEDeduction(l.pay_head_type || '')) emp.ee += amt;
      else if (isEREmployer(l.pay_head_type || '')) emp.er += amt;
    }
  }
  return [...map.values()];
};

const sumRows = (rows, keys) => {
  const t = {};
  for (const k of keys) t[k] = round2(rows.reduce((s, r) => s + (Number(r[k]) || 0), 0));
  return t;
};

// #219 ESI Monthly Statement — employee-wise ESI contribution register for the month.
const getESIMonthlyStatement = async (company_id) => {
  try {
    const establishment = await loadEstablishment(company_id);
    const emps = (await loadESIEmployees(company_id)).filter(isESIMember);
    const rows = emps.map((e, i) => ({
      sl: i + 1,
      esi_number: e.esi_number,
      name: e.name,
      wages: round2(e.wages),
      ee: round2(e.ee),
      er: round2(e.er),
      total: round2(e.ee + e.er),
    }));
    const totals = sumRows(rows, ['wages', 'ee', 'er', 'total']);
    return { success: true, payload: { establishment, rows, totals } };
  } catch (err) {
    return { success: false, error: err.message };
  }
};

module.exports = {
  loadEstablishment,
  loadESIEmployees,
  getESIForm3,
  getESIMonthlyStatement,
};
