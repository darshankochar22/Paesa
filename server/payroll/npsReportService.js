'use strict';

const {
  round2,
  sumField,
  loadCompanyHeader,
  loadEmployeeBasis,
  isEEDeduction,
  isEmployerContribution,
  matchLine,
} = require('./payrollReportBasis');

// ---------------------------------------------------------------------------
// National Pension Scheme (NPS) statutory reports — Payroll Reports → NPS.
// A subscriber is any active employee carrying a PRAN or an NPS contribution on
// the active salary-structure basis. NPS components are matched on the pay-head
// statutory identifiers ("NPS" / "National Pension"), employee deduction vs.
// employer contribution split by pay-head type.
// ---------------------------------------------------------------------------
const NPS_RE = /national\s*pension|(^|\W)nps(\W|$)/i;

const loadNPSSubscribers = async (company_id) => {
  const emps = await loadEmployeeBasis(company_id);
  const match = matchLine(NPS_RE);
  return emps.map((e) => {
    let ee = 0;
    let er = 0;
    for (const l of e.lines) {
      if (!match(l)) continue;
      if (isEEDeduction(l.pay_head_type)) ee += l.amount;
      else if (isEmployerContribution(l.pay_head_type)) er += l.amount;
    }
    return { ...e, nps_ee: round2(ee), nps_er: round2(er) };
  });
};

const isSubscriber = (e) => e.nps_ee > 0 || e.nps_er > 0 || !!e.pran;
const contributes = (e) => e.nps_ee > 0 || e.nps_er > 0;

// #224 Subscriber Contribution Details — employee-wise PRAN + employee/employer NPS.
const getContributionDetails = async (company_id) => {
  try {
    const establishment = await loadCompanyHeader(company_id);
    const subs = (await loadNPSSubscribers(company_id)).filter(isSubscriber);
    const rows = subs.map((e, i) => ({
      sl: i + 1,
      pran: e.pran,
      name: e.name,
      wages: round2(e.earnings),
      ee: round2(e.nps_ee),
      er: round2(e.nps_er),
      total: round2(e.nps_ee + e.nps_er),
    }));
    const totals = {
      wages: sumField(rows, 'wages'),
      ee: sumField(rows, 'ee'),
      er: sumField(rows, 'er'),
      total: sumField(rows, 'total'),
    };
    return { success: true, payload: { establishment, rows, totals } };
  } catch (err) {
    return { success: false, error: err.message };
  }
};

// #225 NPS Summary — headline totals for the scheme.
const getSummary = async (company_id) => {
  try {
    const establishment = await loadCompanyHeader(company_id);
    const subs = (await loadNPSSubscribers(company_id)).filter(isSubscriber);
    const ee = sumField(subs, 'nps_ee');
    const er = sumField(subs, 'nps_er');
    const summary = {
      subscribers: subs.length,
      with_pran: subs.filter((e) => !!e.pran).length,
      without_pran: subs.filter((e) => contributes(e) && !e.pran).length,
      employee_contribution: ee,
      employer_contribution: er,
      total_contribution: round2(ee + er),
    };
    return { success: true, payload: { establishment, summary } };
  } catch (err) {
    return { success: false, error: err.message };
  }
};

// #226 PRAN Not Available — subscribers contributing to NPS but with no PRAN on record.
const getPranNotAvailable = async (company_id) => {
  try {
    const establishment = await loadCompanyHeader(company_id);
    const subs = await loadNPSSubscribers(company_id);
    const rows = subs
      .filter((e) => contributes(e) && !e.pran)
      .map((e, i) => ({
        sl: i + 1,
        name: e.name,
        department: e.department,
        designation: e.designation,
        ee: round2(e.nps_ee),
        er: round2(e.nps_er),
      }));
    return { success: true, payload: { establishment, rows } };
  } catch (err) {
    return { success: false, error: err.message };
  }
};

module.exports = {
  loadNPSSubscribers,
  getContributionDetails,
  getSummary,
  getPranNotAvailable,
};
