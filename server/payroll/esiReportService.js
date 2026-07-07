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

module.exports = {
  loadEstablishment,
  getESIForm3,
};
