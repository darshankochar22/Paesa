'use strict';

const { round2, sumField, loadCompanyHeader, loadEmployeeBasis } = require('./payrollReportBasis');

// #227 Gratuity — the Payment of Gratuity Act, 1972 liability per employee.
// Eligibility: 5+ years of continuous service. Payable = (last-drawn gratuity wages /
// 26) * 15 * completed years of service. Gratuity wages come from pay heads flagged
// use_for_gratuity; when none are flagged we fall back to total earnings so the report
// is still meaningful, never fabricated. Completed years are measured from date of
// joining to date of leaving (or today for serving employees).
const MS_PER_YEAR = 365.25 * 24 * 60 * 60 * 1000;

const serviceYears = (from, to) => {
  if (!from) return 0;
  const start = new Date(from);
  const end = to ? new Date(to) : new Date();
  const y = (end - start) / MS_PER_YEAR;
  return y > 0 ? y : 0;
};

const getGratuity = async (company_id) => {
  try {
    const establishment = await loadCompanyHeader(company_id);
    const emps = await loadEmployeeBasis(company_id);
    const rows = emps.map((e, i) => {
      const years = serviceYears(e.date_of_joining, e.date_of_leaving);
      const completed = Math.floor(years);
      const wages = e.gratuity_wages > 0 ? e.gratuity_wages : e.earnings;
      const eligible = years >= 5;
      const payable = eligible ? round2((wages / 26) * 15 * completed) : 0;
      return {
        sl: i + 1,
        employee: e.name,
        designation: e.designation,
        date_of_joining: e.date_of_joining,
        date_of_leaving: e.date_of_leaving,
        years: round2(years),
        completed_years: completed,
        wages: round2(wages),
        eligible,
        payable,
      };
    });
    const totals = { wages: sumField(rows, 'wages'), payable: sumField(rows, 'payable') };
    return { success: true, payload: { establishment, rows, totals } };
  } catch (err) {
    return { success: false, error: err.message };
  }
};

module.exports = { getGratuity };
