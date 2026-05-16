const reportService = require('../services/reportService');

module.exports = {
  trialBalance: async (event, { company_id, fy_id }) => {
    return await reportService.trialBalance(company_id, fy_id);
  },
  balanceSheet: async (event, { company_id, fy_id }) => {
    return await reportService.balanceSheet(company_id, fy_id);
  },
  profitLoss: async (event, { company_id, fy_id }) => {
    return await reportService.profitLoss(company_id, fy_id);
  },
  ledgerReport: async (event, { company_id, fy_id, ledger_id, from_date, to_date }) => {
    return await reportService.ledgerReport(company_id, fy_id, ledger_id, from_date, to_date);
  },
  cashBook: async (event, { company_id, fy_id, from_date, to_date }) => {
    return await reportService.cashBook(company_id, fy_id, from_date, to_date);
  },
  bankBook: async (event, { company_id, fy_id, ledger_id, from_date, to_date }) => {
    return await reportService.bankBook(company_id, fy_id, ledger_id, from_date, to_date);
  },
  daybook: async (event, { company_id, fy_id, from_date, to_date }) => {
    return await reportService.daybook(company_id, fy_id, from_date, to_date);
  },
};