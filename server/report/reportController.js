const reportService = require('../report/reportService');
const outstandingReportService = require('./outstandingReportService');
const advancedInventoryReportService = require('./advancedInventoryReportService');
const advancedAccountingReportService = require('./advancedAccountingReportService');
const cashFlowReportService = require('./cashFlowReportService');
const fundsFlowReportService = require('./fundsFlowReportService');
const stockSummaryReportService = require('./stockSummaryReportService');
const ratioAnalysisReportService = require('./ratioAnalysisReportService');
const payrollReportService = require('./payrollReportService');
const reportRuntime = require('./reportRuntime');

module.exports = {
  // ── Core Accounting ───────────────────────────────────────────────────────
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
  stockSummary: async (event, { company_id, fy_id, as_on_date, method }) => {
    return await stockSummaryReportService.stockSummary(company_id, fy_id, as_on_date, method);
  },
  ratioAnalysis: async (event, { company_id, fy_id }) => {
    return await ratioAnalysisReportService.ratioAnalysis(company_id, fy_id);
  },

  // ── Dynamic runtime engine ────────────────────────────────────────────────
  run: async (event, { reportId, params }) => {
    return await reportRuntime.runReport(reportId, params);
  },
  getSavedViews: async (event, { company_id }) => {
    return await reportRuntime.getSavedViews(company_id);
  },
  saveView: async (event, payload) => {
    return await reportRuntime.saveView(payload);
  },
  deleteSavedView: async (event, { id }) => {
    return await reportRuntime.deleteSavedView(id);
  },

  // ── Accounting Summaries ──────────────────────────────────────────────────
  groupSummary: async (event, { company_id, fy_id }) => {
    return await reportService.groupSummary(company_id, fy_id);
  },
  statistics: async (event, { company_id, fy_id }) => {
    return await reportService.statistics(company_id, fy_id);
  },
  costCategorySummary: async (event, { company_id, fy_id }) => {
    return await reportService.costCategorySummary(company_id, fy_id);
  },

  // ── Advanced Inventory Reports ────────────────────────────────────────────
  godownSummary: async (event, { company_id, fy_id, as_on_date }) => {
    return await advancedInventoryReportService.godownSummary(company_id, fy_id, as_on_date);
  },
  stockAgeing: async (event, { company_id, fy_id, as_on_date }) => {
    return await advancedInventoryReportService.stockAgeing(company_id, fy_id, as_on_date);
  },
  movementAnalysis: async (event, { company_id, fy_id, as_on_date }) => {
    return await advancedInventoryReportService.movementAnalysis(company_id, fy_id, as_on_date);
  },
  reorderStatus: async (event, { company_id, fy_id }) => {
    return await advancedInventoryReportService.reorderStatus(company_id, fy_id);
  },
  orderOutstanding: async (event, { company_id, fy_id, type }) => {
    return await advancedInventoryReportService.orderOutstanding(company_id, fy_id, type);
  },
  stockItemSummary: async (event, { company_id, fy_id }) => {
    return await reportService.stockItemSummary(company_id, fy_id);
  },
  stockGroupSummary: async (event, { company_id, fy_id }) => {
    return await reportService.stockGroupSummary(company_id, fy_id);
  },
  stockCategorySummary: async (event, { company_id, fy_id }) => {
    return await reportService.stockCategorySummary(company_id, fy_id);
  },

  // ── Advanced Accounting Reports ───────────────────────────────────────────
  costCentreReport: async (event, { company_id, fy_id, as_on_date }) => {
    return await advancedAccountingReportService.costCentreReport(company_id, fy_id, as_on_date);
  },
  budgetVsActual: async (event, { company_id, fy_id }) => {
    return await advancedAccountingReportService.budgetVsActual(company_id, fy_id);
  },

  // ── Payroll Reports ───────────────────────────────────────────────────────
  payslipReport: async (event, { company_id, fy_id }) => {
    return await payrollReportService.payslipReport(company_id, fy_id);
  },
  salaryStatement: async (event, { company_id, fy_id }) => {
    return await payrollReportService.salaryStatement(company_id, fy_id);
  },
  salaryRegister: async (event, { company_id, fy_id }) => {
    return await payrollReportService.salaryRegister(company_id, fy_id);
  },
  attendanceReport: async (event, { company_id, fy_id }) => {
    return await payrollReportService.attendanceReport(company_id, fy_id);
  },
  payHeadBreakup: async (event, { company_id, fy_id }) => {
    return await payrollReportService.payHeadBreakup(company_id, fy_id);
  },
  pfReport: async (event, { company_id, fy_id }) => {
    return await payrollReportService.pfReport(company_id, fy_id);
  },
  esiReport: async (event, { company_id, fy_id }) => {
    return await payrollReportService.esiReport(company_id, fy_id);
  },
  professionalTax: async (event, { company_id, fy_id }) => {
    return await payrollReportService.professionalTax(company_id, fy_id);
  },
  gratuity: async (event, { company_id, fy_id }) => {
    return await payrollReportService.gratuity(company_id, fy_id);
  },
};