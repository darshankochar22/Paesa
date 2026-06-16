const reportService = require('../report/reportService');
const outstandingReportService = require('./outstandingReportService');
const cashFlowReportService = require('./cashFlowReportService');
const fundsFlowReportService = require('./fundsFlowReportService');
const stockSummaryReportService = require('./stockSummaryReportService');
const ratioAnalysisReportService = require('./ratioAnalysisReportService');

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
  billsReceivable: async (event, { company_id, fy_id }) => {
    return await outstandingReportService.billsReceivable(company_id, fy_id);
  },
  billsPayable: async (event, { company_id, fy_id }) => {
    return await outstandingReportService.billsPayable(company_id, fy_id);
  },
  cashFlow: async (event, { company_id, fy_id, from_date, to_date }) => {
    return await cashFlowReportService.cashFlow(company_id, fy_id, from_date, to_date);
  },
  fundsFlow: async (event, { company_id, fy_id, from_date, to_date }) => {
    return await fundsFlowReportService.fundsFlow(company_id, fy_id, from_date, to_date);
  },
  stockSummary: async (event, { company_id, fy_id, as_on_date }) => {
    return await stockSummaryReportService.stockSummary(company_id, fy_id, as_on_date);
  },
  ratioAnalysis: async (event, { company_id, fy_id }) => {
    return await ratioAnalysisReportService.ratioAnalysis(company_id, fy_id);
  },
};