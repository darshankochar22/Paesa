'use strict';

const {
  round2,
  sumField,
  loadCompanyHeader,
  loadEmployeeBasis,
  isEEDeduction,
  matchLine,
} = require('./payrollReportBasis');

// #223 Professional Tax — employee-wise PT deducted (state-based deduction). PT is a
// deduction pay head whose name/statutory identifiers carry "Professional Tax" (or PT);
// listed per active employee alongside the earnings the slab is applied to.
const PT_RE = /professional\s*tax|(^|\W)p\.?\s?tax(\W|$)|(^|\W)pt(\W|$)/i;

const getProfessionalTax = async (company_id) => {
  try {
    const establishment = await loadCompanyHeader(company_id);
    const emps = await loadEmployeeBasis(company_id);
    const match = matchLine(PT_RE);
    const rows = emps
      .map((e) => {
        let pt = 0;
        for (const l of e.lines) if (isEEDeduction(l.pay_head_type) && match(l)) pt += l.amount;
        return {
          employee: e.name,
          state: e.state,
          designation: e.designation,
          earnings: round2(e.earnings),
          pt: round2(pt),
        };
      })
      .sort(
        (a, b) =>
          (a.state || '').localeCompare(b.state || '') || a.employee.localeCompare(b.employee),
      );
    rows.forEach((r, i) => (r.sl = i + 1));
    const totals = { earnings: sumField(rows, 'earnings'), pt: sumField(rows, 'pt') };
    return { success: true, payload: { establishment, rows, totals } };
  } catch (err) {
    return { success: false, error: err.message };
  }
};

module.exports = { getProfessionalTax };
