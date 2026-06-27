const trialBalance = require('./services/trailbalanceService');
const groupSummaryDrilldown = require('./services/trailbalanceService');
const ledgerMonthlySummary = require('./services/trailbalanceService');
const balanceSheet = require('./services/balanceSheetService');
const { profitLoss } = require('./services/profitlossService');
const ledgerReport = require('./ledger/ledgerReport');
const { cashBook } = require('./ledger/cashBook');
const bankBook = require('./ledger/bankBook');
const daybook = require('./daybook/daybook');
const { groupSummary } = require('./financial/groupSummary');
const { statistics } = require('./financial/statistics');
const { costCategorySummary } = require('./financial/costCategorySummary');
const { stockItemSummary } = require('./inventory/stockItemSummary');
const { stockQuery } = require('./stockQueryService');
const { stockGroupSummary } = require('./inventory/stockGroupSummary');
const { stockCategorySummary } = require('./inventory/stockCategorySummary');
const { stockGroupAnalysis, stockGroupAnalysisItems } = require('./inventory/stockGroupAnalysis');
const { journalRegister } = require('./registers/journalRegister');
const { debitNoteRegister } = require('./registers/debitNoteRegister');
const { creditNoteRegister } = require('./registers/creditNoteRegister');
const { purchaseRegister } = require('./registers/purchaseRegister');
const { salesRegister } = require('./registers/salesRegister');
const outstandingReportService = require('./outstandingReportService');
const advancedInventoryReportService = require('./advancedInventoryReportService');
const interestReportService = require('./interestReportService');
const advancedAccountingReportService = require('./advancedAccountingReportService');
const cashFlowReportService = require('./cashFlowReportService');
const fundsFlowReportService = require('./fundsFlowReportService');
const stockSummaryReportService = require('./stockSummaryReportService');
const ratioAnalysisReportService = require('./ratioAnalysisReportService');
const payrollReportService = require('./payrollReportService');
const reportRuntime = require('./reportRuntime');
const { contraRegister } = require('./registers/contraRegister');
const { contraRegisterVouchers } = require('./registers/contraRegisterVouchers');
const { salesRegisterVouchers } = require('./registers/salesRegisterVouchers');
const { purchaseRegisterVouchers } = require('./registers/purchaseRegisterVouchers');
const { journalRegisterVouchers } = require('./registers/journalRegisterVouchers');
const { debitNoteRegisterVouchers } = require('./registers/debitNoteRegisterVouchers');
const { creditNoteRegisterVouchers } = require('./registers/creditNoteRegisterVouchers');

const { paymentRegisterVouchers } = require("./registers/paymentRegisterVouchers");
const { receiptRegisterVouchers } = require("./registers/receiptRegisterVouchers");
const { paymentRegister } = require('./registers/paymentRegister');
const { receiptRegister } = require('./registers/receiptRegister');
module.exports = {
  trialBalance: async (event, { company_id, fy_id }) => {
    return await trialBalance.trialBalance(company_id, fy_id);
  },
  balanceSheet: async (event, { company_id, fy_id }) => {
    return await balanceSheet.balanceSheet(company_id, fy_id);
  },
  profitLoss: async (event, { company_id, fy_id }) => {
    return await profitLoss(company_id, fy_id);
  },
  ledgerReport: async (event, { company_id, fy_id, ledger_id, from_date, to_date }) => {
    return await ledgerReport(company_id, fy_id, ledger_id, from_date, to_date);
  },
  cashBook: async (event, { company_id, fy_id, from_date, to_date }) => {
    return await cashBook(company_id, fy_id, from_date, to_date);
  },
  bankBook: async (event, { company_id, fy_id, ledger_id, from_date, to_date }) => {
    return await bankBook(company_id, fy_id, ledger_id, from_date, to_date);
  },
  daybook: async (event, { company_id, fy_id, from_date, to_date }) => {
    return await daybook(company_id, fy_id, from_date, to_date);
  },
  billsReceivable: async (event, { company_id, fy_id }) => {
    return await outstandingReportService.billsReceivable(company_id, fy_id);
  },
  billsPayable: async (event, { company_id, fy_id }) => {
    return await outstandingReportService.billsPayable(company_id, fy_id);
  },
  ledgerOutstandings: async (event, { company_id, fy_id, ledger_id }) => {
    return await outstandingReportService.ledgerOutstandings(company_id, fy_id, ledger_id);
  },
  groupOutstandings: async (event, { company_id, fy_id, group_id }) => {
    return await outstandingReportService.groupOutstandings(company_id, fy_id, group_id);
  },
  interestReceivable: async (event, { company_id, fy_id, params }) => {
    return await interestReportService.interestReceivable(company_id, fy_id, params);
  },
  interestPayable: async (event, { company_id, fy_id, params }) => {
    return await interestReportService.interestPayable(company_id, fy_id, params);
  },
  ledgerInterest: async (event, { company_id, fy_id, params }) => {
    return await interestReportService.ledgerInterest(company_id, fy_id, params);
  },
  billWiseInterest: async (event, { company_id, fy_id, params }) => {
    return await interestReportService.billWiseInterest(company_id, fy_id, params);
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
  stockGroupItems: async (event, { company_id, fy_id, group_id }) => {
    return await stockSummaryReportService.stockGroupItems(company_id, fy_id, group_id);
  },
  stockItemMonthly: async (event, { company_id, fy_id, item_id }) => {
    return await stockSummaryReportService.stockItemMonthly(company_id, fy_id, item_id);
  },
  batchesForItem: async (event, { company_id, item_id }) => {
    return await stockSummaryReportService.batchesForItem(company_id, item_id);
  },
  batchVouchers: async (event, { company_id, fy_id, item_id, batch, from_date, to_date }) => {
    return await stockSummaryReportService.batchVouchers(company_id, fy_id, item_id, batch, from_date, to_date);
  },
  godownItems: async (event, { company_id, fy_id, godown_id, as_on_date }) => {
    return await stockSummaryReportService.godownItems(company_id, fy_id, godown_id, as_on_date);
  },
  godownItemMonthly: async (event, { company_id, fy_id, godown_id, item_id }) => {
    return await stockSummaryReportService.godownItemMonthly(company_id, fy_id, godown_id, item_id);
  },
  godownVouchers: async (event, { company_id, fy_id, godown_id, item_id, from_date, to_date }) => {
    return await stockSummaryReportService.godownVouchers(company_id, fy_id, godown_id, item_id, from_date, to_date);
  },
  stockItemVouchers: async (event, { company_id, fy_id, item_id, from_date, to_date }) => {
    return await stockSummaryReportService.stockItemVouchers(company_id, fy_id, item_id, from_date, to_date);
  },
  stockCategoryItems: async (event, { company_id, fy_id, category_id }) => {
    return await stockSummaryReportService.stockCategoryItems(company_id, fy_id, category_id);
  },
  inventoryRegisterMonthly: async (event, { company_id, fy_id, voucher_type }) => {
    return await stockSummaryReportService.inventoryRegisterMonthly(company_id, fy_id, voucher_type);
  },
  inventoryRegisterVouchers: async (event, { company_id, fy_id, voucher_type, from_date, to_date }) => {
    return await stockSummaryReportService.inventoryRegisterVouchers(company_id, fy_id, voucher_type, from_date, to_date);
  },
  ratioAnalysis: async (event, { company_id, fy_id }) => {
    return await ratioAnalysisReportService.ratioAnalysis(company_id, fy_id);
  },
  contraRegister: async (event, { company_id, fy_id }) => {
  return await contraRegister(company_id, fy_id);
  },
  journalRegister: async (event, { company_id, fy_id, from_date, to_date }) => {
    return await journalRegister(company_id, fy_id, from_date, to_date);
  },
  debitNoteRegister: async (event, { company_id, fy_id, from_date, to_date }) => {
    return await debitNoteRegister(company_id, fy_id, from_date, to_date);
  },
  creditNoteRegister: async (event, { company_id, fy_id, from_date, to_date }) => {
    return await creditNoteRegister(company_id, fy_id, from_date, to_date);
  },
  purchaseRegister: async (event, { company_id, fy_id, from_date, to_date }) => {
    return await purchaseRegister(company_id, fy_id, from_date, to_date);
  },
  salesRegister: async (event, { company_id, fy_id, from_date, to_date }) => {
    return await salesRegister(company_id, fy_id, from_date, to_date);
  },
  contraRegisterVouchers: async (event, { company_id, fy_id, from_date, to_date }) => {
  return await contraRegisterVouchers(company_id, fy_id, from_date, to_date);
  },

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

  groupSummaryDrilldown: async (event, { company_id, fy_id, group_id }) => {
    return await groupSummaryDrilldown.groupSummary(company_id, fy_id, group_id);
  },
  ledgerMonthlySummary: async (event, { company_id, fy_id, ledger_id }) => {
    return await ledgerMonthlySummary.ledgerMonthlySummary(company_id, fy_id, ledger_id);
  },

  groupSummary: async (event, { company_id, fy_id }) => {
    return await groupSummary(company_id, fy_id);
  },
  statistics: async (event, { company_id, fy_id }) => {
    return await statistics(company_id, fy_id);
  },
  costCategorySummary: async (event, { company_id, fy_id }) => {
    return await costCategorySummary(company_id, fy_id);
  },

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
    return await stockItemSummary(company_id, fy_id);
  },
  stockGroupSummary: async (event, { company_id, fy_id }) => {
    return await stockGroupSummary(company_id, fy_id);
  },
  stockCategorySummary: async (event, { company_id, fy_id }) => {
    return await stockCategorySummary(company_id, fy_id);
  },
  stockGroupAnalysis: async (event, { company_id, fy_id }) => {
    return await stockGroupAnalysis(company_id, fy_id);
  },
  stockGroupAnalysisItems: async (event, { company_id, fy_id, group_id }) => {
    return await stockGroupAnalysisItems(company_id, fy_id, group_id);
  },

  costCentreReport: async (event, { company_id, fy_id, as_on_date }) => {
    return await advancedAccountingReportService.costCentreReport(company_id, fy_id, as_on_date);
  },
  budgetVsActual: async (event, { company_id, fy_id }) => {
    return await advancedAccountingReportService.budgetVsActual(company_id, fy_id);
  },

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

  paymentRegister: async (event, { company_id, fy_id }) => {
    return await paymentRegister(company_id, fy_id);
  },
  receiptRegister: async (event, { company_id, fy_id }) => {
    return await receiptRegister(company_id, fy_id);
  },
  paymentRegisterVouchers: async (event, { company_id, fy_id, from_date, to_date }) => {
    return await paymentRegisterVouchers(company_id, fy_id, from_date, to_date);
  },
  receiptRegisterVouchers: async (event, { company_id, fy_id, from_date, to_date }) => {
    return await receiptRegisterVouchers(company_id, fy_id, from_date, to_date);
  },
  salesRegisterVouchers: async (event, { company_id, fy_id, from_date, to_date }) => {
    return await salesRegisterVouchers(company_id, fy_id, from_date, to_date);
  },
  purchaseRegisterVouchers: async (event, { company_id, fy_id, from_date, to_date }) => {
    return await purchaseRegisterVouchers(company_id, fy_id, from_date, to_date);
  },
  journalRegisterVouchers: async (event, { company_id, fy_id, from_date, to_date }) => {
    return await journalRegisterVouchers(company_id, fy_id, from_date, to_date);
  },
  debitNoteRegisterVouchers: async (event, { company_id, fy_id, from_date, to_date }) => {
    return await debitNoteRegisterVouchers(company_id, fy_id, from_date, to_date);
  },
  creditNoteRegisterVouchers: async (event, { company_id, fy_id, from_date, to_date }) => {
    return await creditNoteRegisterVouchers(company_id, fy_id, from_date, to_date);
  },
  stockQuery: async (event, { company_id, fy_id, item_id }) => {
    return await stockQuery(company_id, fy_id, item_id);
  },
};
