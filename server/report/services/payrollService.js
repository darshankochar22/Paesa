/**
 * payrollService.js
 *
 * Payroll reports:
 *   14. getPayrollReport -- payslip, salary statement, PF, ESI, attendance, gratuity, etc.
 */
const {
  db, sql,
  normalizeType,
  extractParams,
} = require('./reportHelpers');
const {
  employees,
  payHeads,
  salaryStructures,
  attendanceVouchers,
  attendanceVoucherEntries,
  attendanceTypes,
} = require('../../db/schema');

// A pay head is an employee deduction when its type names a deduction or it is
// flagged as not adding to net salary — not only the exact 'Deductions from
// Employees' string (production pay heads use type 'Deductions').
const isPayrollDeduction = (r) =>
  /deduct/i.test(r.pay_head_type || '') || Number(r.affects_net_salary) === 0;

// ---------------------------------------------------------------------------
// 14. getPayrollReport -- payroll reports
//     reportType: 'payslip' | 'salary_statement' | 'pay_head_breakup' | 'pf' | 'esi' |
//                 'attendance' | 'gratuity' | 'professional_tax'
//     params: { employee_id, month, from_date, to_date }
// ---------------------------------------------------------------------------
const getPayrollReport = async (company_id, fy_id, reportTypeArg = 'payslip', paramsArg = {}) => {
  try {
    const reportType = normalizeType(reportTypeArg, 'payslip', {
      'payslip': 'payslip', 'payroll-summary': 'payslip', 'employee-summary': 'payslip',
      'salary-statement': 'salary_statement', 'pay-sheet': 'salary_statement',
      'salary-register': 'salary_statement', 'attendance-register': 'attendance',
      'attendance-sheet': 'attendance', 'overtime': 'attendance',
      'leave-register': 'attendance', 'leave-encashment': 'attendance',
      'pay-head': 'pay_head_breakup', 'earnings': 'pay_head_breakup', 'deductions': 'pay_head_breakup',
      'employer-contribution': 'pay_head_breakup', 'payroll-statutory': 'pf',
      'provident-fund': 'pf', 'pf-form': 'pf', 'pf-monthly': 'pf', 'pf-e-challan': 'pf',
      'employee-state-insurance': 'esi', 'esi-monthly': 'esi', 'esi-employee': 'esi', 'esi-employer': 'esi',
      'professional-tax': 'professional_tax', 'national-pension': 'pf', 'nps': 'pf',
      'income-tax': 'gratuity', 'form-16': 'gratuity', 'form-12ba': 'gratuity',
      'annexure': 'gratuity', 'form-24q-payroll': 'gratuity', 'e-24q': 'gratuity',
      'tds-variance': 'gratuity', 'tax-regime': 'gratuity', 'investment-declaration': 'gratuity',
      'tax-computation': 'gratuity', 'gratuity': 'gratuity',
      'employee-loan': 'payslip', 'department-wise': 'payslip', 'employee-group': 'payslip',
      'payroll-voucher': 'payslip', 'payroll-cost-centre': 'payslip',
    });
    const params = extractParams(reportTypeArg) || paramsArg;

    // Base salary data join.
    const salaryData = await db.all(
      sql`SELECT
            ss.employee_id,
            e.name AS emp_name,
            e.designation,
            e.department,
            e.date_of_joining,
            e.pf_account_number,
            e.uan,
            e.esi_number,
            ph.pay_head_id,
            ph.name AS pay_head_name,
            ph.pay_head_type,
            ph.statutory_component,
            ph.affects_net_salary,
            ss.amount
          FROM ${salaryStructures} ss
          INNER JOIN ${employees} e ON e.employee_id = ss.employee_id
            AND e.company_id = ${company_id} AND e.is_active = 1
          INNER JOIN ${payHeads} ph ON ph.pay_head_id = ss.pay_head_id
          WHERE ss.company_id = ${company_id} AND ss.is_active = 1`
    );

    // Optional employee filter.
    const filtered = params.employee_id
      ? salaryData.filter(r => r.employee_id === params.employee_id)
      : salaryData;

    let rows;

    switch (reportType) {
      case 'payslip': {
        const empMap = {};
        for (const r of filtered) {
          if (!empMap[r.employee_id]) {
            empMap[r.employee_id] = { emp_name: r.emp_name, designation: r.designation, department: r.department, earnings: 0, deductions: 0 };
          }
          const amt = Number(r.amount) || 0;
          if (isPayrollDeduction(r)) {
            empMap[r.employee_id].deductions += amt;
          } else {
            empMap[r.employee_id].earnings += amt;
          }
        }
        rows = Object.values(empMap).map((e, idx) => ({
          id: idx + 1,
          emp_name: e.emp_name,
          designation: e.designation,
          department: e.department,
          gross: e.earnings,
          deductions: e.deductions,
          net: e.earnings - e.deductions,
        }));
        break;
      }

      case 'salary_statement': {
        const empMap = {};
        for (const r of filtered) {
          if (!empMap[r.employee_id]) {
            empMap[r.employee_id] = { emp_name: r.emp_name, basic: 0, hra: 0, da: 0, other_earnings: 0, deductions: 0, gross: 0, net: 0 };
          }
          const e = empMap[r.employee_id];
          const amt = Number(r.amount) || 0;
          const phName = (r.pay_head_name || '').toLowerCase();
          if (isPayrollDeduction(r)) {
            e.deductions += amt;
          } else {
            e.gross += amt;
            if (phName.includes('basic')) e.basic += amt;
            else if (phName.includes('hra') || phName.includes('house rent')) e.hra += amt;
            else if (phName.includes('da') || phName.includes('dearness')) e.da += amt;
            else e.other_earnings += amt;
          }
          e.net = e.gross - e.deductions;
        }
        rows = Object.values(empMap).map((e, idx) => ({ id: idx + 1, ...e }));
        break;
      }

      case 'pay_head_breakup': {
        rows = filtered.map((r, idx) => ({
          id: idx + 1,
          emp_name: r.emp_name,
          pay_head: r.pay_head_name,
          pay_head_type: r.pay_head_type,
          amount: Number(r.amount) || 0,
        }));
        break;
      }

      case 'pf': {
        const empMap = {};
        for (const r of filtered) {
          const sc = (r.statutory_component || '').toLowerCase();
          const phn = (r.pay_head_name || '').toLowerCase();
          const isPF = sc.includes('provident') || sc.includes('pf') || phn.includes('pf') || phn.includes('provident fund');
          if (!isPF) continue;
          if (!empMap[r.employee_id]) {
            empMap[r.employee_id] = { emp_name: r.emp_name, pf_no: r.pf_account_number || r.uan || 'N/A', emp_contrib: 0, employer_contrib: 0 };
          }
          const amt = Number(r.amount) || 0;
          if (isPayrollDeduction(r)) empMap[r.employee_id].emp_contrib += amt;
          else empMap[r.employee_id].employer_contrib += amt;
        }
        rows = Object.values(empMap).map((r, idx) => ({ id: idx + 1, ...r }));
        break;
      }

      case 'esi': {
        const empMap = {};
        for (const r of filtered) {
          const sc = (r.statutory_component || '').toLowerCase();
          const phn = (r.pay_head_name || '').toLowerCase();
          const isESI = sc.includes('esi') || phn.includes('esi') || phn.includes('employee state insurance');
          if (!isESI) continue;
          if (!empMap[r.employee_id]) {
            empMap[r.employee_id] = { emp_name: r.emp_name, esi_no: r.esi_number || 'N/A', emp_contrib: 0, employer_contrib: 0 };
          }
          const amt = Number(r.amount) || 0;
          if (isPayrollDeduction(r)) empMap[r.employee_id].emp_contrib += amt;
          else empMap[r.employee_id].employer_contrib += amt;
        }
        rows = Object.values(empMap).map((r, idx) => ({ id: idx + 1, ...r }));
        break;
      }

      case 'attendance': {
        const empRows = await db.all(
          sql`SELECT * FROM ${employees} WHERE company_id = ${company_id} AND is_active = 1 ORDER BY name ASC`
        );
        const avRows = await db.all(
          sql`SELECT
                ave.employee_id,
                SUM(ave.value) AS total_value,
                at.name AS at_name
              FROM ${attendanceVouchers} av
              INNER JOIN ${attendanceVoucherEntries} ave ON ave.attendance_voucher_id = av.attendance_voucher_id
              LEFT JOIN ${attendanceTypes} at
                ON at.attendance_type_id = ave.attendance_type_id
              WHERE av.company_id = ${company_id}
              GROUP BY ave.employee_id, ave.attendance_type_id`
        ).catch(() => []);

        const attMap = {};
        for (const r of avRows) {
          if (!attMap[r.employee_id]) attMap[r.employee_id] = { present: 0, absent: 0, leave: 0 };
          const nm = (r.at_name || '').toLowerCase();
          if (nm.includes('present') || nm.includes('work')) attMap[r.employee_id].present += Number(r.total_value) || 0;
          else if (nm.includes('absent') || nm.includes('lop')) attMap[r.employee_id].absent += Number(r.total_value) || 0;
          else if (nm.includes('leave') || nm.includes('holiday')) attMap[r.employee_id].leave += Number(r.total_value) || 0;
          else attMap[r.employee_id].present += Number(r.total_value) || 0;
        }
        rows = empRows.map((e, idx) => ({
          id: idx + 1,
          emp_name: e.name,
          present: attMap[e.employee_id]?.present || 0,
          absent: attMap[e.employee_id]?.absent || 0,
          leave: attMap[e.employee_id]?.leave || 0,
        }));
        break;
      }

      case 'gratuity': {
        const today = new Date();
        const empMap = {};
        for (const r of filtered) {
          if (!empMap[r.employee_id]) {
            empMap[r.employee_id] = { emp_name: r.emp_name, date_of_joining: r.date_of_joining, monthly_earnings: 0 };
          }
          if (!isPayrollDeduction(r)) {
            empMap[r.employee_id].monthly_earnings += Number(r.amount) || 0;
          }
        }
        rows = Object.values(empMap).map((e, idx) => {
          let years = 0;
          if (e.date_of_joining) {
            const doj = new Date(e.date_of_joining);
            years = Math.max(0, (today - doj) / (1000 * 60 * 60 * 24 * 365.25));
          }
          const gratuity = (e.monthly_earnings / 26) * 15 * Math.floor(years);
          return { id: idx + 1, emp_name: e.emp_name, years: years.toFixed(1), gratuity };
        });
        break;
      }

      case 'professional_tax': {
        const empMap = {};
        for (const r of filtered) {
          const phn = (r.pay_head_name || '').toLowerCase();
          const sc = (r.statutory_component || '').toLowerCase();
          const isPT = phn.includes('professional tax') || phn.includes(' pt') || sc.includes('professional tax');
          if (!isPT || !isPayrollDeduction(r)) continue;
          if (!empMap[r.employee_id]) empMap[r.employee_id] = { emp_name: r.emp_name, amount: 0 };
          empMap[r.employee_id].amount += Number(r.amount) || 0;
        }
        rows = Object.values(empMap).map((r, idx) => ({ id: idx + 1, ...r }));
        break;
      }

      default: {
        const rows = await db.all(
          sql`SELECT e.employee_id, e.name AS emp_name, e.employee_code,
                     e.designation, e.department, e.date_of_joining,
                     ph.name AS pay_head_name, ss.amount
              FROM ${employees} e
              LEFT JOIN ${salaryStructures} ss ON ss.employee_id = e.employee_id AND ss.is_active = 1
              LEFT JOIN ${payHeads} ph ON ph.pay_head_id = ss.pay_head_id
              WHERE e.company_id = ${company_id} AND e.is_active = 1
              ORDER BY e.name, ph.name`
        );
        return { success: true, rows: rows || [] };
      }
    }

    return { success: true, rows };
  } catch (err) {
    return { success: false, error: err.message };
  }
};

module.exports = {
  getPayrollReport,
};
