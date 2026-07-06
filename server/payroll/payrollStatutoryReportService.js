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

// ---------------------------------------------------------------------------
// PF Form 5 (#207) & Form 10 (#208) — the EPF monthly returns of employees
// JOINING the fund / LEAVING service during a period. Statutory print documents;
// header pulls the establishment name/address + PF code from company masters.
// ---------------------------------------------------------------------------

const loadEstablishment = async (company_id) => {
  const compRows = await db.all(
    sql`SELECT name, mailing_name, address1, address2 FROM companies
        WHERE company_id = ${company_id} LIMIT 1`,
  );
  const comp = compRows[0] || {};
  const statRows = await db.all(
    sql`SELECT pf_company_code, pf_account_group_code FROM payroll_statutory_details
        WHERE company_id = ${company_id} LIMIT 1`,
  );
  const stat = statRows[0] || {};
  return {
    name: comp.mailing_name || comp.name || '',
    address: [comp.address1, comp.address2].filter(Boolean).join(', '),
    pf_code: [stat.pf_company_code, stat.pf_account_group_code].filter(Boolean).join(' / '),
  };
};

// Form 5 — employees whose PF date-of-joining (fallback: date of joining) falls in
// the period. Previous-service/remarks stay blank (scheme-certificate data isn't kept).
const getPFForm5 = async (company_id, { from, to } = {}) => {
  try {
    const establishment = await loadEstablishment(company_id);
    const rows = await db.all(
      sql`SELECT employee_id, name, father_name, spouse_name, date_of_birth, gender,
                 pf_account_number, date_of_joining, date_of_joining_pf
          FROM employees
          WHERE company_id = ${company_id} AND is_active = 1
          ORDER BY COALESCE(pf_account_number, ''), name`,
    );
    const inPeriod = rows.filter((e) => {
      const d = e.date_of_joining_pf || e.date_of_joining || '';
      if (!from || !to) return !!d;
      return d >= from && d <= to;
    });
    return {
      success: true,
      payload: {
        establishment,
        employees: inPeriod.map((e) => ({
          account_no: e.pf_account_number || '',
          name: e.name,
          father_or_husband: e.father_name || e.spouse_name || '',
          date_of_birth: e.date_of_birth || '',
          sex: e.gender || '',
          date_of_joining_fund: e.date_of_joining_pf || e.date_of_joining || '',
          previous_service: '',
          remarks: '',
        })),
      },
    };
  } catch (err) {
    return { success: false, error: err.message };
  }
};

// Form 10 — members whose date of leaving falls in the period. Reason for leaving
// isn't tracked on the employee master yet — stays blank on the form.
const getPFForm10 = async (company_id, { from, to } = {}) => {
  try {
    const establishment = await loadEstablishment(company_id);
    const rows = await db.all(
      sql`SELECT employee_id, name, father_name, spouse_name, pf_account_number,
                 date_of_leaving
          FROM employees
          WHERE company_id = ${company_id}
            AND date_of_leaving IS NOT NULL AND TRIM(date_of_leaving) != ''
          ORDER BY COALESCE(pf_account_number, ''), name`,
    );
    const inPeriod = rows.filter((e) => {
      if (!from || !to) return true;
      return e.date_of_leaving >= from && e.date_of_leaving <= to;
    });
    return {
      success: true,
      payload: {
        establishment,
        employees: inPeriod.map((e) => ({
          account_no: e.pf_account_number || '',
          name: e.name,
          father_or_husband: e.father_name || e.spouse_name || '',
          date_of_leaving: e.date_of_leaving || '',
          reason: '',
          remarks: '',
        })),
      },
    };
  } catch (err) {
    return { success: false, error: err.message };
  }
};

// ---------------------------------------------------------------------------
// PF Form 12A (#209) — the EPF monthly "Statement of Contribution". Reuses the
// SAME PF buckets as the Summary (#206) so the figures tie out; member movement
// ties to Form 5 joiners / Form 10 leavers. Remittance/challan details aren't
// tracked yet — left blank, honest (like Tally's empty EDU preview).
// ---------------------------------------------------------------------------
const getPFForm12A = async (company_id, { from, to } = {}) => {
  try {
    const establishment = await loadEstablishment(company_id);

    // PF contribution buckets — identical basis to the Summary's Provident Fund rows.
    const heads = await loadPayHeadAmounts(company_id);
    const pfHeads = heads.filter((ph) => matchesComponent(ph, 'pf'));
    const bucket = (label) =>
      pfHeads
        .filter((ph) => matchesRowType(ph, label))
        .reduce((s, ph) => s + (Number(ph.amount) || 0), 0);
    const employee_share = bucket("Employees' Statutory Deductions");
    const employer_share = bucket("Employer's Statutory Contributions");
    const other_charges = bucket("Employer's Other Charges");

    // Per (employee, pay head) lines across ACTIVE structures — PF membership and
    // wages are derived in JS with the same matcher the summary uses.
    const lines = await db.all(
      sql`SELECT ss.employee_id, ph.name, ph.pay_head_type, ph.statutory_component,
                 ph.statutory_pay_type, ss.amount
          FROM salary_structures ss
          JOIN pay_heads ph ON ph.pay_head_id = ss.pay_head_id
          JOIN employees e ON e.employee_id = ss.employee_id AND e.is_active = 1
          WHERE ph.company_id = ${company_id} AND ph.is_active = 1 AND ss.is_active = 1`,
    );
    const pfMembers = new Set(
      lines.filter((l) => matchesComponent(l, 'pf')).map((l) => l.employee_id),
    );
    const wages = lines
      .filter((l) => pfMembers.has(l.employee_id) && /earning/i.test(String(l.pay_head_type || '')))
      .reduce((s, l) => s + (Number(l.amount) || 0), 0);

    // Member movement — joiners (Form 5 basis) and leavers (Form 10 basis) in period.
    const inPeriod = (d) => (d ? (!from || !to ? true : d >= from && d <= to) : false);
    const activeEmps = await db.all(
      sql`SELECT date_of_joining, date_of_joining_pf FROM employees
          WHERE company_id = ${company_id} AND is_active = 1`,
    );
    const leaverEmps = await db.all(
      sql`SELECT date_of_leaving FROM employees
          WHERE company_id = ${company_id}
            AND date_of_leaving IS NOT NULL AND TRIM(date_of_leaving) != ''`,
    );
    const added = activeEmps.filter((e) =>
      inPeriod(e.date_of_joining_pf || e.date_of_joining),
    ).length;
    const left = leaverEmps.filter((e) => inPeriod(e.date_of_leaving)).length;
    const closing = pfMembers.size;
    const opening = Math.max(0, closing - added + left);

    return {
      success: true,
      payload: {
        establishment,
        statutory_rate: '12%',
        wages,
        members: { opening, added, left, closing },
        accounts: [
          {
            account: 'A/c No. 1',
            label: "Provident Fund — Employees' Share",
            amount: employee_share,
          },
          {
            account: 'A/c No. 1',
            label: "Provident Fund — Employer's Share",
            amount: employer_share,
          },
          {
            account: 'A/c No. 2, 10, 21 & 22',
            label: "Employer's Other Charges (Pension / Admin / EDLI)",
            amount: other_charges,
          },
        ],
        total: employee_share + employer_share + other_charges,
      },
    };
  } catch (err) {
    return { success: false, error: err.message };
  }
};

module.exports = {
  getStatutorySummary,
  getStatutoryPayHeadDetails,
  getPFForm5,
  getPFForm10,
  getPFForm12A,
};
