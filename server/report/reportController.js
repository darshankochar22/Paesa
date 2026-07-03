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
const { statistics, statisticsVoucherMonthly, statisticsVoucherDayList } = require('./financial/statistics');
const { costCategorySummary } = require('./financial/costCategorySummary');
const { stockItemSummary } = require('./inventory/stockItemSummary');
const { stockQuery } = require('./stockQueryService');
const { stockGroupSummary } = require('./inventory/stockGroupSummary');
const { stockCategorySummary } = require('./inventory/stockCategorySummary');
const { stockGroupAnalysis, stockGroupAnalysisItems } = require('./inventory/stockGroupAnalysis');
const { stockAgeingAnalysis } = require('./inventory/ageingAnalysis');
const { stockCategoryAnalysis, stockCategoryAnalysisItems } = require('./inventory/stockCategoryAnalysis');
const { stockItemAnalysis } = require('./inventory/stockItemAnalysis');
const { groupAnalysis, ledgerAnalysis, groupItemVouchers, ledgerItemVouchers } = require('./inventory/groupAnalysis');
const { transferAnalysis } = require('./inventory/transferAnalysis');
const { costEstimation } = require('./inventory/costEstimation');
const { itemCostAnalysis } = require('./inventory/itemCostAnalysis');
const { jobWorkAnalysis } = require('./inventory/jobWorkAnalysis');
const {
  jobWorkOrders,
  jobWorkComponents,
  jobWorkOrderVouchers,
  jobWorkStock,
  jobWorkVariance,
  jobWorkAnnexure,
} = require('./inventory/jobWork');
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
  profitLoss: async (event, { company_id, fy_id, from_date, to_date }) => {
    return await profitLoss(company_id, fy_id, from_date || null, to_date || null);
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
  billVouchers: async (event, { company_id, fy_id, ledger_id, bill_name }) => {
    return await outstandingReportService.billVouchers(company_id, fy_id, ledger_id, bill_name);
  },
  interestReceivable: async (event, { company_id, fy_id, params }) => {
    return await interestReportService.interestReceivable(company_id, fy_id, params);
  },
  interestPayable: async (event, { company_id, fy_id, params }) => {
    return await interestReportService.interestPayable(company_id, fy_id, params);
  },
  groupInterest: async (event, { company_id, fy_id, params }) => {
    return await interestReportService.groupInterest(company_id, fy_id, params);
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
  batchItems: async (event, { company_id }) => {
    return await stockSummaryReportService.batchItems(company_id);
  },
  batchBalances: async (event, { company_id, item_id }) => {
    return await stockSummaryReportService.batchBalances(company_id, item_id);
  },
  trackingNumbers: async (event, { company_id, item_id }) => {
    return await stockSummaryReportService.trackingNumbers(company_id, item_id);
  },
  orderNumbers: async (event, { company_id, item_id }) => {
    return await stockSummaryReportService.orderNumbers(company_id, item_id);
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
  statisticsVoucherMonthly: async (event, { company_id, fy_id, voucher_type }) => {
    return await statisticsVoucherMonthly(company_id, fy_id, voucher_type);
  },
  statisticsVoucherDayList: async (event, { company_id, fy_id, voucher_type, from_date, to_date }) => {
    return await statisticsVoucherDayList(company_id, fy_id, voucher_type, from_date, to_date);
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
  orderOutstanding: async (event, { company_id, fy_id, type, dimension, selection_id }) => {
    return await advancedInventoryReportService.orderOutstanding(company_id, fy_id, type, dimension, selection_id);
  },
  billsPending: async (event, { company_id, fy_id, type }) => {
    return await advancedInventoryReportService.billsPending(company_id, fy_id, type);
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
  stockCategoryAnalysis: async (event, { company_id, fy_id }) => {
    return await stockCategoryAnalysis(company_id, fy_id);
  },
  stockCategoryAnalysisItems: async (event, { company_id, fy_id, category_id }) => {
    return await stockCategoryAnalysisItems(company_id, fy_id, category_id);
  },
  stockItemAnalysis: async (event, { company_id, fy_id }) => {
    return await stockItemAnalysis(company_id, fy_id);
  },
  stockAgeingAnalysis: async (event, { company_id, fy_id, group_id, as_at, fy_start, periods }) => {
    return await stockAgeingAnalysis(company_id, fy_id, group_id, as_at, fy_start, periods);
  },
  groupAnalysis: async (event, { company_id, fy_id, group_id }) => {
    return await groupAnalysis(company_id, fy_id, group_id);
  },
  ledgerAnalysis: async (event, { company_id, fy_id, ledger_id }) => {
    return await ledgerAnalysis(company_id, fy_id, ledger_id);
  },
  groupItemVouchers: async (event, { company_id, fy_id, group_id, item_id }) => {
    return await groupItemVouchers(company_id, fy_id, group_id, item_id);
  },
  ledgerItemVouchers: async (event, { company_id, fy_id, ledger_id, item_id }) => {
    return await ledgerItemVouchers(company_id, fy_id, ledger_id, item_id);
  },
  transferAnalysis: async (event, { company_id, fy_id, voucher_type }) => {
    return await transferAnalysis(company_id, fy_id, voucher_type);
  },
  costEstimation: async (event, { company_id, fy_id, group_id }) => {
    return await costEstimation(company_id, fy_id, group_id);
  },
  itemCostAnalysis: async (event, { company_id, fy_id, mode, ref_id }) => {
    return await itemCostAnalysis(company_id, fy_id, mode, ref_id);
  },
  jobWorkAnalysis: async (event, { company_id, fy_id, cc_id }) => {
    return await jobWorkAnalysis(company_id, fy_id, cc_id);
  },

  // ── Job Work Reports (#124) ───────────────────────────────────────────────
  jobWorkOrders: async (event, { company_id, fy_id, direction }) => {
    return await jobWorkOrders(company_id, fy_id, direction);
  },
  jobWorkComponents: async (event, { company_id, fy_id, direction }) => {
    return await jobWorkComponents(company_id, fy_id, direction);
  },
  jobWorkOrderVouchers: async (event, { company_id, fy_id, voucher_type, from_date, to_date }) => {
    return await jobWorkOrderVouchers(company_id, fy_id, voucher_type, from_date, to_date);
  },
  jobWorkStock: async (event, { company_id, fy_id, mode }) => {
    return await jobWorkStock(company_id, fy_id, mode);
  },
  jobWorkVariance: async (event, { company_id, fy_id, kind, direction }) => {
    return await jobWorkVariance(company_id, fy_id, kind, direction);
  },
  jobWorkAnnexure: async (event, { company_id, fy_id, annexure, excise_unit_id }) => {
    return await jobWorkAnnexure(company_id, fy_id, annexure, excise_unit_id);
  },
  jobWorkAgeing: async (event, { company_id, fy_id, group_id, as_at, fy_start, direction }) => {
    const opts = direction === 'out'
      ? { inwardTypes: ['Material Out'], outwardTypes: ['Material In'], includeOpening: false }
      : { inwardTypes: ['Material In'], outwardTypes: ['Material Out'], includeOpening: false };
    return await stockAgeingAnalysis(company_id, fy_id, group_id, as_at, fy_start, undefined, opts);
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
  paySlip: async (event, { company_id, fy_id }) => {
    return await payrollReportService.paySlip(company_id, fy_id);
  },
  paySlipDetail: async (event, { company_id, fy_id, employee_id }) => {
    return await payrollReportService.paySlipDetail(company_id, fy_id, employee_id);
  },
  paySheet: async (event, { company_id, fy_id }) => {
    return await payrollReportService.paySheet(company_id, fy_id);
  },
  attendanceSheet: async (event, { company_id, fy_id }) => {
    return await payrollReportService.attendanceSheet(company_id, fy_id);
  },
  paymentAdvice: async (event, { company_id, fy_id }) => {
    return await payrollReportService.paymentAdvice(company_id, fy_id);
  },
  employeesWithoutEmail: async (event, { company_id, fy_id }) => {
    return await payrollReportService.employeesWithoutEmail(company_id, fy_id);
  },
  payrollStatement: async (event, { company_id, fy_id }) => {
    return await payrollReportService.payrollStatement(company_id, fy_id);
  },
  employeePayHeadBreakup: async (event, { company_id, fy_id }) => {
    return await payrollReportService.employeePayHeadBreakup(company_id, fy_id);
  },
  payHeadEmployeeBreakup: async (event, { company_id, fy_id }) => {
    return await payrollReportService.payHeadEmployeeBreakup(company_id, fy_id);
  },
  employeeProfile: async (event, { company_id, fy_id }) => {
    return await payrollReportService.employeeProfile(company_id, fy_id);
  },
  employeeHeadCount: async (event, { company_id, fy_id }) => {
    return await payrollReportService.employeeHeadCount(company_id, fy_id);
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
