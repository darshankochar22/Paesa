/**
 * payrollReportService.js
 * Tally-style payroll reporting engine.
 * Derives all figures from salary_structures, attendance_vouchers,
 * attendance_voucher_entries, employees, pay_heads, and financial_years.
 */
const { db } = require('../db/index');
const { sql } = require('drizzle-orm');
const {
  employees,
  salaryStructures,
  payHeads,
  attendanceVouchers,
  attendanceVoucherEntries,
} = require('../db/schema');

/** Fetch all active employees for a company. */
const getEmployees = (company_id) =>
  db.all(sql`SELECT * FROM ${employees} WHERE company_id = ${company_id} AND is_active = 1 ORDER BY name ASC`);

/** Fetch salary structure entries for a company with pay-head info. */
const getSalaryData = (company_id) =>
  db.all(sql`
    SELECT ss.*, e.name AS emp_name, ph.name AS pay_head_name, ph.pay_head_type,
           ph.statutory_component, ph.affects_net_salary, ph.use_for_gratuity,
           e.date_of_joining, e.pf_account_number, e.uan, e.esi_number
    FROM ${salaryStructures} ss
    INNER JOIN ${employees} e ON e.employee_id = ss.employee_id AND e.company_id = ${company_id} AND e.is_active = 1
    INNER JOIN ${payHeads} ph ON ph.pay_head_id = ss.pay_head_id
    WHERE ss.company_id = ${company_id} AND ss.is_active = 1
  `);

// A pay head reduces the employee's net pay (a deduction) when its type names a
// deduction ('Deductions', 'Deductions from Employees', "Employees' Statutory
// Deductions") OR it is flagged as not increasing net salary. The old code only
// matched the exact string 'Deductions from Employees', so the production pay
// heads (type 'Deductions': PF/ESI/PT) were counted as earnings.
const isDeductionHead = (r) =>
  /deduct/i.test(r.pay_head_type || '') || Number(r.affects_net_salary) === 0;

module.exports = {

  /** Payslip — one row per employee showing gross/deductions/net. */
  payslipReport: async (company_id, fy_id) => {
    try {
      const salaryData = await getSalaryData(company_id);

      // Group by employee
      const empMap = {};
      for (const row of salaryData) {
        if (!empMap[row.employee_id]) {
          empMap[row.employee_id] = {
            emp_name: row.emp_name,
            earnings: 0,
            deductions: 0,
            net: 0,
          };
        }
        const entry = empMap[row.employee_id];
        const amt = Number(row.amount) || 0;
        if (isDeductionHead(row)) {
          entry.deductions += amt;
        } else {
          entry.earnings += amt;
        }
      }

      const rows = Object.entries(empMap).map(([emp_id, e], idx) => ({
        id: idx + 1,
        emp_name: e.emp_name,
        gross: e.earnings,
        deductions: e.deductions,
        net: e.earnings - e.deductions,
      }));

      return { success: true, rows };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  /** Salary Statement — per-employee breakdown by pay head components. */
  salaryStatement: async (company_id, fy_id) => {
    try {
      const salaryData = await getSalaryData(company_id);

      const empMap = {};
      for (const row of salaryData) {
        if (!empMap[row.employee_id]) {
          empMap[row.employee_id] = { emp_name: row.emp_name, basic: 0, hra: 0, net: 0, gross: 0, deductions: 0 };
        }
        const e = empMap[row.employee_id];
        const amt = Number(row.amount) || 0;
        const phName = (row.pay_head_name || '').toLowerCase();
        if (phName.includes('basic')) e.basic += amt;
        if (phName.includes('hra') || phName.includes('house rent')) e.hra += amt;
        if (isDeductionHead(row)) {
          e.deductions += amt;
        } else {
          e.gross += amt;
        }
        e.net = e.gross - e.deductions;
      }

      const rows = Object.entries(empMap).map(([, e], idx) => ({ id: idx + 1, ...e }));
      return { success: true, rows };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  /** Salary Register — aggregated monthly totals across all employees. */
  salaryRegister: async (company_id, fy_id) => {
    try {
      const salaryData = await getSalaryData(company_id);

      // We derive totals from salary structures (as a single period register)
      const empMap = {};
      for (const row of salaryData) {
        if (!empMap[row.employee_id]) empMap[row.employee_id] = { gross: 0, deductions: 0 };
        const amt = Number(row.amount) || 0;
        if (isDeductionHead(row)) {
          empMap[row.employee_id].deductions += amt;
        } else {
          empMap[row.employee_id].gross += amt;
        }
      }

      const totalPayout = Object.values(empMap).reduce((s, e) => s + (e.gross - e.deductions), 0);
      const rows = [
        {
          id: 1,
          month: 'Current Structure',
          employees_count: Object.keys(empMap).length,
          total_payout: totalPayout,
        },
      ];
      return { success: true, rows };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  /** Attendance Register — fetched from attendance_voucher_entries. */
  attendanceReport: async (company_id, fy_id) => {
    try {
      const empRows = await getEmployees(company_id);
      const avRows = await db.all(sql`
        SELECT ave.employee_id, SUM(ave.value) AS total_value, at.name AS at_name
        FROM ${attendanceVouchers} av
        INNER JOIN ${attendanceVoucherEntries} ave ON ave.attendance_voucher_id = av.attendance_voucher_id
        LEFT JOIN (SELECT attendance_type_id, name FROM attendance_types WHERE company_id = ${company_id}) at ON at.attendance_type_id = ave.attendance_type_id
        WHERE av.company_id = ${company_id}
        GROUP BY ave.employee_id, ave.attendance_type_id
      `).catch(() => []);

      // Build a map of employee_id -> { present, absent, leave }
      const attMap = {};
      for (const r of avRows) {
        if (!attMap[r.employee_id]) attMap[r.employee_id] = { present: 0, absent: 0, leave: 0 };
        const nm = (r.at_name || '').toLowerCase();
        if (nm.includes('present') || nm.includes('work')) attMap[r.employee_id].present += Number(r.total_value) || 0;
        else if (nm.includes('absent') || nm.includes('lop')) attMap[r.employee_id].absent += Number(r.total_value) || 0;
        else if (nm.includes('leave') || nm.includes('holiday')) attMap[r.employee_id].leave += Number(r.total_value) || 0;
        else attMap[r.employee_id].present += Number(r.total_value) || 0;
      }

      const rows = empRows.map((e, idx) => ({
        id: idx + 1,
        emp_name: e.name,
        present: attMap[e.employee_id]?.present || 0,
        absent: attMap[e.employee_id]?.absent || 0,
        leave: attMap[e.employee_id]?.leave || 0,
      }));
      return { success: true, rows };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  /** Pay Head Breakup — per-employee, per-pay-head listing. */
  payHeadBreakup: async (company_id, fy_id) => {
    try {
      const salaryData = await getSalaryData(company_id);
      const rows = salaryData.map((r, idx) => ({
        id: idx + 1,
        emp_name: r.emp_name,
        pay_head: r.pay_head_name,
        amount: Number(r.amount) || 0,
      }));
      return { success: true, rows };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  /**
   * PF Report — employees with PF deductions.
   * PF statutory_component = 'Provident Fund' or pay_head_type = 'Employees Statutory Deductions'.
   */
  pfReport: async (company_id, fy_id) => {
    try {
      const salaryData = await getSalaryData(company_id);
      const empMap = {};
      for (const r of salaryData) {
        const sc = (r.statutory_component || '').toLowerCase();
        const phn = (r.pay_head_name || '').toLowerCase();
        const isPF = sc.includes('provident') || sc.includes('pf') || phn.includes('pf') || phn.includes('provident fund');
        if (!isPF) continue;
        if (!empMap[r.employee_id]) {
          empMap[r.employee_id] = {
            emp_name: r.emp_name,
            pf_no: r.pf_account_number || r.uan || '—',
            emp_contrib: 0,
            employer_contrib: 0,
          };
        }
        const amt = Number(r.amount) || 0;
        if (isDeductionHead(r)) {
          empMap[r.employee_id].emp_contrib += amt;
        } else {
          empMap[r.employee_id].employer_contrib += amt;
        }
      }
      const rows = Object.values(empMap).map((r, idx) => ({ id: idx + 1, ...r }));
      if (rows.length === 0) {
        // Fallback: show all employees with PF numbers
        const emps = await getEmployees(company_id);
        const withPF = emps.filter(e => e.pf_account_number || e.uan);
        return {
          success: true,
          rows: withPF.map((e, i) => ({
            id: i + 1,
            emp_name: e.name,
            pf_no: e.pf_account_number || e.uan || '—',
            emp_contrib: 0,
            employer_contrib: 0,
          })),
        };
      }
      return { success: true, rows };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  /** ESI Report — employees with ESI deductions. */
  esiReport: async (company_id, fy_id) => {
    try {
      const salaryData = await getSalaryData(company_id);
      const empMap = {};
      for (const r of salaryData) {
        const sc = (r.statutory_component || '').toLowerCase();
        const phn = (r.pay_head_name || '').toLowerCase();
        const isESI = sc.includes('esi') || phn.includes('esi') || phn.includes('employee state insurance');
        if (!isESI) continue;
        if (!empMap[r.employee_id]) {
          empMap[r.employee_id] = {
            emp_name: r.emp_name,
            esi_no: r.esi_number || '—',
            emp_contrib: 0,
            employer_contrib: 0,
          };
        }
        const amt = Number(r.amount) || 0;
        if (isDeductionHead(r)) {
          empMap[r.employee_id].emp_contrib += amt;
        } else {
          empMap[r.employee_id].employer_contrib += amt;
        }
      }
      const rows = Object.values(empMap).map((r, idx) => ({ id: idx + 1, ...r }));
      if (rows.length === 0) {
        const emps = await getEmployees(company_id);
        const withESI = emps.filter(e => e.esi_number);
        return {
          success: true,
          rows: withESI.map((e, i) => ({
            id: i + 1,
            emp_name: e.name,
            esi_no: e.esi_number || '—',
            emp_contrib: 0,
            employer_contrib: 0,
          })),
        };
      }
      return { success: true, rows };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  /** Professional Tax — employees with PT deductions. */
  professionalTax: async (company_id, fy_id) => {
    try {
      const salaryData = await getSalaryData(company_id);
      const empMap = {};
      for (const r of salaryData) {
        const phn = (r.pay_head_name || '').toLowerCase();
        const sc = (r.statutory_component || '').toLowerCase();
        const isPT = phn.includes('professional tax') || phn.includes('pt') || sc.includes('professional tax');
        if (!isPT || !isDeductionHead(r)) continue;
        if (!empMap[r.employee_id]) {
          empMap[r.employee_id] = { emp_name: r.emp_name, amount: 0 };
        }
        empMap[r.employee_id].amount += Number(r.amount) || 0;
      }
      const rows = Object.values(empMap).map((r, idx) => ({ id: idx + 1, ...r }));
      return { success: true, rows };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  /**
   * Multi Pay Slip — one row per employee showing bank details and net pay.
   * Matches TallyPrime's "Multi Pay Slip": Particulars | Employee Number |
   * Account No. | Bank Name | Branch | Amount | E-Mail ID
   */
  paySlip: async (company_id, fy_id) => {
    try {
      const salaryData = await getSalaryData(company_id);
      const empRows = await getEmployees(company_id);

      const empNetMap = {};
      for (const r of salaryData) {
        if (!empNetMap[r.employee_id]) empNetMap[r.employee_id] = { gross: 0, deductions: 0 };
        const amt = Number(r.amount) || 0;
        if (isDeductionHead(r)) empNetMap[r.employee_id].deductions += amt;
        else empNetMap[r.employee_id].gross += amt;
      }

      const rows = empRows.map((e, idx) => {
        const net = empNetMap[e.employee_id] || { gross: 0, deductions: 0 };
        return {
          id: idx + 1,
          employee_id: e.employee_id,
          particulars: e.name,
          emp_number: e.employee_code || '—',
          account_no: e.bank_account_number || '—',
          bank_name: e.bank_name || '—',
          branch: e.bank_branch || '—',
          amount: net.gross - net.deductions,
          email_id: e.email || '—',
        };
      });
      return { success: true, rows };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  /**
   * Pay Slip (individual) — the detailed slip for a single employee, matching
   * TallyPrime's per-employee Pay Slip: employee/header particulars, an Earnings
   * column and a Deductions column listing every pay head, totals for each, the
   * Net Amount, and an attendance summary for the period.
   */
  paySlipDetail: async (company_id, fy_id, employee_id) => {
    try {
      const empId = Number(employee_id);
      const empRows = await getEmployees(company_id);
      const emp = empRows.find((e) => Number(e.employee_id) === empId);
      if (!emp) return { success: false, error: 'Employee not found.' };

      const salaryData = await getSalaryData(company_id);
      const mine = salaryData.filter((r) => Number(r.employee_id) === empId);

      const earnings = [];
      const deductions = [];
      for (const r of mine) {
        const amt = Number(r.amount) || 0;
        const line = { pay_head: r.pay_head_name, amount: amt };
        if (isDeductionHead(r)) deductions.push(line);
        else earnings.push(line);
      }
      const total_earnings = earnings.reduce((s, l) => s + l.amount, 0);
      const total_deductions = deductions.reduce((s, l) => s + l.amount, 0);

      // Attendance summary for the employee over the company's records.
      const avRows = await db.all(sql`
        SELECT SUM(ave.value) AS total_value, at.name AS at_name
        FROM ${attendanceVouchers} av
        INNER JOIN ${attendanceVoucherEntries} ave ON ave.attendance_voucher_id = av.attendance_voucher_id
        LEFT JOIN (SELECT attendance_type_id, name FROM attendance_types WHERE company_id = ${company_id}) at
          ON at.attendance_type_id = ave.attendance_type_id
        WHERE av.company_id = ${company_id} AND ave.employee_id = ${empId}
        GROUP BY ave.attendance_type_id
      `).catch(() => []);
      const attendance = { present: 0, absent: 0, leave: 0 };
      for (const r of avRows) {
        const nm = (r.at_name || '').toLowerCase();
        const val = Number(r.total_value) || 0;
        if (nm.includes('present') || nm.includes('work')) attendance.present += val;
        else if (nm.includes('absent') || nm.includes('lop')) attendance.absent += val;
        else if (nm.includes('leave') || nm.includes('holiday')) attendance.leave += val;
        else attendance.present += val;
      }

      return {
        success: true,
        employee: {
          employee_id: emp.employee_id,
          name: emp.name,
          emp_number: emp.employee_code || '—',
          designation: emp.designation || '—',
          department: emp.department || '—',
          date_of_joining: emp.date_of_joining || '—',
          account_no: emp.bank_account_number || '—',
          bank_name: emp.bank_name || '—',
          branch: emp.bank_branch || '—',
          ifsc_code: emp.ifsc_code || '—',
          pan: emp.pan || '—',
          uan: emp.uan || '—',
          email: emp.email || '—',
        },
        earnings,
        deductions,
        total_earnings,
        total_deductions,
        net_amount: total_earnings - total_deductions,
        attendance,
      };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  /**
   * Pay Sheet — one row per employee: Particulars | Total Earnings | Total Deductions | Net Amount.
   * Matches TallyPrime Pay Sheet column structure exactly.
   */
  paySheet: async (company_id, fy_id) => {
    try {
      const salaryData = await getSalaryData(company_id);
      const empMap = {};
      for (const row of salaryData) {
        if (!empMap[row.employee_id]) {
          empMap[row.employee_id] = { particulars: row.emp_name, total_earnings: 0, total_deductions: 0 };
        }
        const amt = Number(row.amount) || 0;
        if (isDeductionHead(row)) empMap[row.employee_id].total_deductions += amt;
        else empMap[row.employee_id].total_earnings += amt;
      }
      const rows = Object.values(empMap).map((e, idx) => ({
        id: idx + 1,
        particulars: e.particulars,
        total_earnings: e.total_earnings,
        total_deductions: e.total_deductions,
        net_amount: e.total_earnings - e.total_deductions,
      }));
      return { success: true, rows };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  /** Attendance Sheet — per-employee attendance breakdown. */
  attendanceSheet: async (company_id, fy_id) => {
    try {
      const empRows = await getEmployees(company_id);
      const avRows = await db.all(sql`
        SELECT ave.employee_id, SUM(ave.value) AS total_value, at.name AS at_name
        FROM ${attendanceVouchers} av
        INNER JOIN ${attendanceVoucherEntries} ave ON ave.attendance_voucher_id = av.attendance_voucher_id
        LEFT JOIN (SELECT attendance_type_id, name FROM attendance_types WHERE company_id = ${company_id}) at
          ON at.attendance_type_id = ave.attendance_type_id
        WHERE av.company_id = ${company_id}
        GROUP BY ave.employee_id, ave.attendance_type_id
      `).catch(() => []);

      const attMap = {};
      for (const r of avRows) {
        if (!attMap[r.employee_id]) attMap[r.employee_id] = { present: 0, absent: 0, leave: 0 };
        const nm = (r.at_name || '').toLowerCase();
        const val = Number(r.total_value) || 0;
        if (nm.includes('present') || nm.includes('work')) attMap[r.employee_id].present += val;
        else if (nm.includes('absent') || nm.includes('lop')) attMap[r.employee_id].absent += val;
        else if (nm.includes('leave') || nm.includes('holiday')) attMap[r.employee_id].leave += val;
        else attMap[r.employee_id].present += val;
      }

      const rows = empRows.map((e, idx) => {
        const a = attMap[e.employee_id] || { present: 0, absent: 0, leave: 0 };
        return {
          id: idx + 1,
          particulars: e.name,
          present: a.present,
          absent: a.absent,
          leave: a.leave,
          total_days: a.present + a.absent + a.leave,
        };
      });
      return { success: true, rows };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  /** Payment Advice — bank transfer details + net pay per employee. */
  paymentAdvice: async (company_id, fy_id) => {
    try {
      const salaryData = await getSalaryData(company_id);
      const empRows = await getEmployees(company_id);

      const empNetMap = {};
      for (const r of salaryData) {
        if (!empNetMap[r.employee_id]) empNetMap[r.employee_id] = { gross: 0, deductions: 0 };
        const amt = Number(r.amount) || 0;
        if (isDeductionHead(r)) empNetMap[r.employee_id].deductions += amt;
        else empNetMap[r.employee_id].gross += amt;
      }

      const rows = empRows.map((e, idx) => {
        const net = empNetMap[e.employee_id] || { gross: 0, deductions: 0 };
        return {
          id: idx + 1,
          emp_name: e.name,
          bank_name: e.bank_name || '—',
          account_number: e.bank_account_number || '—',
          ifsc_code: e.ifsc_code || '—',
          net_pay: net.gross - net.deductions,
        };
      });
      return { success: true, rows };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  /** Employees Without Email — employees with no email address on record. */
  employeesWithoutEmail: async (company_id, fy_id) => {
    try {
      const empRows = await getEmployees(company_id);
      const filtered = empRows.filter(e => !e.email || e.email.trim() === '');
      const rows = filtered.map((e, idx) => ({
        id: idx + 1,
        emp_name: e.name,
        emp_code: e.employee_code || '—',
        designation: e.designation || '—',
        department: e.department || '—',
      }));
      return { success: true, rows };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  /** Payroll Statement — pay head totals across all employees. */
  payrollStatement: async (company_id, fy_id) => {
    try {
      const salaryData = await getSalaryData(company_id);
      const phMap = {};
      for (const r of salaryData) {
        const key = r.pay_head_id;
        if (!phMap[key]) {
          phMap[key] = {
            pay_head_name: r.pay_head_name,
            pay_type: isDeductionHead(r) ? 'Deduction' : 'Earning',
            total_amount: 0,
          };
        }
        phMap[key].total_amount += Number(r.amount) || 0;
      }
      const rows = Object.values(phMap).map((r, idx) => ({ id: idx + 1, ...r }));
      return { success: true, rows };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  /** Employee Pay Head Breakup — per employee, each pay head listed. */
  employeePayHeadBreakup: async (company_id, fy_id) => {
    try {
      const salaryData = await getSalaryData(company_id);
      const rows = salaryData.map((r, idx) => ({
        id: idx + 1,
        emp_name: r.emp_name,
        pay_head_name: r.pay_head_name,
        pay_type: isDeductionHead(r) ? 'Deduction' : 'Earning',
        amount: Number(r.amount) || 0,
      }));
      return { success: true, rows };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  /** Pay Head Employee Breakup — per pay head, each employee listed. */
  payHeadEmployeeBreakup: async (company_id, fy_id) => {
    try {
      const salaryData = await getSalaryData(company_id);
      const rows = salaryData.map((r, idx) => ({
        id: idx + 1,
        pay_head_name: r.pay_head_name,
        pay_type: isDeductionHead(r) ? 'Deduction' : 'Earning',
        emp_name: r.emp_name,
        amount: Number(r.amount) || 0,
      }));
      return { success: true, rows };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  /** Employee Profile — master details, one row per employee. */
  employeeProfile: async (company_id, fy_id) => {
    try {
      const empRows = await getEmployees(company_id);
      const rows = empRows.map((e, idx) => ({
        id: idx + 1,
        emp_name: e.name,
        emp_code: e.employee_code || '—',
        designation: e.designation || '—',
        department: e.department || '—',
        date_of_joining: e.date_of_joining || '—',
        mobile: e.mobile || '—',
        email: e.email || '—',
        pan: e.pan || '—',
        uan: e.uan || '—',
      }));
      return { success: true, rows };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  /** Employee Head Count — active employees per employee group. */
  employeeHeadCount: async (company_id, fy_id) => {
    try {
      const rows = await db.all(sql`
        SELECT COALESCE(eg.name, 'Primary') AS group_name, COUNT(*) AS head_count
        FROM ${employees} e
        LEFT JOIN employee_groups eg ON eg.employee_group_id = e.employee_group_id
        WHERE e.company_id = ${company_id} AND e.is_active = 1
        GROUP BY e.employee_group_id
        ORDER BY group_name ASC
      `);
      return { success: true, rows: rows.map((r, idx) => ({ id: idx + 1, ...r })) };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  /**
   * Gratuity — estimated gratuity accrued per employee.
   * Formula (Indian Payment of Gratuity Act): 15 days' last drawn salary per year of service.
   * last_drawn_salary = sum of all earnings pay heads.
   * years_of_service = from date_of_joining to today.
   */
  gratuity: async (company_id, fy_id) => {
    try {
      const salaryData = await getSalaryData(company_id);
      const today = new Date();

      const empMap = {};
      for (const r of salaryData) {
        if (!empMap[r.employee_id]) {
          empMap[r.employee_id] = {
            emp_name: r.emp_name,
            date_of_joining: r.date_of_joining,
            monthly_earnings: 0,
          };
        }
        if (!isDeductionHead(r)) {
          empMap[r.employee_id].monthly_earnings += Number(r.amount) || 0;
        }
      }

      const rows = Object.values(empMap).map((e, idx) => {
        let years = 0;
        if (e.date_of_joining) {
          const doj = new Date(e.date_of_joining);
          const msInYear = 1000 * 60 * 60 * 24 * 365.25;
          years = Math.max(0, (today - doj) / msInYear);
        }
        // Gratuity = (monthly_earnings / 26) * 15 * years  (per Indian Act)
        const gratuity = (e.monthly_earnings / 26) * 15 * Math.floor(years);
        return {
          id: idx + 1,
          emp_name: e.emp_name,
          years: years.toFixed(1),
          gratuity,
        };
      });

      return { success: true, rows };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },
};
