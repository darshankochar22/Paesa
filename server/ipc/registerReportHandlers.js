const { ipcMain } = require('electron');

const reportController = require('../report/reportController');
const trialBalanceReportController = require('../trialBalanceReport/trialBalanceReportController');
const balanceSheetReportController = require('../balanceSheetReport/balanceSheetReportController');
const cashFlowReportController = require('../cashFlowReport/cashFlowReportController');
const profitLossReportController = require('../profitLossReport/profitLossReportController');
const bankingController = require('../banking/bankingController');
const auditTrailController = require('../auditTrail/auditTrailController');

function register() {
  ipcMain.handle('report:trialBalance', reportController.trialBalance);
  ipcMain.handle('report:balanceSheet', reportController.balanceSheet);
  ipcMain.handle('report:profitLoss', reportController.profitLoss);
  ipcMain.handle('report:ledgerReport', reportController.ledgerReport);
  ipcMain.handle('report:cashBook', reportController.cashBook);
  ipcMain.handle('report:bankBook', reportController.bankBook);
  ipcMain.handle('report:daybook', reportController.daybook);
  ipcMain.handle('report:billsReceivable', reportController.billsReceivable);
  ipcMain.handle('report:billsPayable', reportController.billsPayable);
  ipcMain.handle('report:ledgerOutstandings', reportController.ledgerOutstandings);
  ipcMain.handle('report:groupOutstandings', reportController.groupOutstandings);
  ipcMain.handle('report:billVouchers', reportController.billVouchers);
  ipcMain.handle('report:interestReceivable', reportController.interestReceivable);
  ipcMain.handle('report:interestPayable', reportController.interestPayable);
  ipcMain.handle('report:groupInterest', reportController.groupInterest);
  ipcMain.handle('report:ledgerInterest', reportController.ledgerInterest);
  ipcMain.handle('report:billWiseInterest', reportController.billWiseInterest);
  ipcMain.handle('report:fundsFlow', reportController.fundsFlow);
  ipcMain.handle('report:stockSummary', reportController.stockSummary);
  ipcMain.handle('report:stockGroupItems', reportController.stockGroupItems);
  ipcMain.handle('report:stockItemMonthly', reportController.stockItemMonthly);
  ipcMain.handle('report:batchItems', reportController.batchItems);
  ipcMain.handle('report:batchBalances', reportController.batchBalances);
  ipcMain.handle('report:trackingNumbers', reportController.trackingNumbers);
  ipcMain.handle('report:orderNumbers', reportController.orderNumbers);
  ipcMain.handle('report:batchesForItem', reportController.batchesForItem);
  ipcMain.handle('report:batchVouchers', reportController.batchVouchers);
  ipcMain.handle('report:godownItems', reportController.godownItems);
  ipcMain.handle('report:godownItemMonthly', reportController.godownItemMonthly);
  ipcMain.handle('report:godownVouchers', reportController.godownVouchers);
  ipcMain.handle('report:stockItemVouchers', reportController.stockItemVouchers);
  ipcMain.handle('report:stockCategoryItems', reportController.stockCategoryItems);
  ipcMain.handle('report:inventoryRegisterMonthly', reportController.inventoryRegisterMonthly);
  ipcMain.handle('report:inventoryRegisterVouchers', reportController.inventoryRegisterVouchers);
  ipcMain.handle('report:ratioAnalysis', reportController.ratioAnalysis);
  ipcMain.handle('report:run', reportController.run);
  ipcMain.handle('report:getSavedViews', reportController.getSavedViews);
  ipcMain.handle('report:saveView', reportController.saveView);
  ipcMain.handle('report:deleteSavedView', reportController.deleteSavedView);

  // Advanced Inventory Reports (Phase 4)
  ipcMain.handle('report:godownSummary', reportController.godownSummary);
  ipcMain.handle('report:stockAgeing', reportController.stockAgeing);
  ipcMain.handle('report:movementAnalysis', reportController.movementAnalysis);
  ipcMain.handle('report:reorderStatus', reportController.reorderStatus);
  ipcMain.handle('report:orderOutstanding', reportController.orderOutstanding);
  ipcMain.handle('report:billsPending', reportController.billsPending);

  // Advanced Accounting Reports (Phase 4)
  ipcMain.handle('report:costCentreReport', reportController.costCentreReport);
  ipcMain.handle('report:budgetVsActual', reportController.budgetVsActual);

  // Accounting summaries
  ipcMain.handle('report:groupSummary', reportController.groupSummary);
  ipcMain.handle('report:groupSummaryDrilldown', reportController.groupSummaryDrilldown);
  ipcMain.handle('report:ledgerMonthlySummary', reportController.ledgerMonthlySummary);
  ipcMain.handle('report:statistics', reportController.statistics);
  ipcMain.handle('report:statisticsVoucherMonthly', reportController.statisticsVoucherMonthly);
  ipcMain.handle('report:statisticsVoucherDayList', reportController.statisticsVoucherDayList);
  ipcMain.handle('report:costCategorySummary', reportController.costCategorySummary);

  // Inventory summaries
  ipcMain.handle('report:stockItemSummary', reportController.stockItemSummary);
  ipcMain.handle('report:stockGroupSummary', reportController.stockGroupSummary);
  ipcMain.handle('report:stockCategorySummary', reportController.stockCategorySummary);
  ipcMain.handle('report:stockGroupAnalysis', reportController.stockGroupAnalysis);
  ipcMain.handle('report:stockGroupAnalysisItems', reportController.stockGroupAnalysisItems);
  ipcMain.handle('report:stockCategoryAnalysis', reportController.stockCategoryAnalysis);
  ipcMain.handle('report:stockCategoryAnalysisItems', reportController.stockCategoryAnalysisItems);
  ipcMain.handle('report:stockItemAnalysis', reportController.stockItemAnalysis);
  ipcMain.handle('report:stockAgeingAnalysis', reportController.stockAgeingAnalysis);
  ipcMain.handle('report:groupAnalysis', reportController.groupAnalysis);
  ipcMain.handle('report:ledgerAnalysis', reportController.ledgerAnalysis);
  ipcMain.handle('report:groupItemVouchers', reportController.groupItemVouchers);
  ipcMain.handle('report:ledgerItemVouchers', reportController.ledgerItemVouchers);
  ipcMain.handle('report:transferAnalysis', reportController.transferAnalysis);
  ipcMain.handle('report:transferItemVouchers', reportController.transferItemVouchers);
  ipcMain.handle('report:costEstimation', reportController.costEstimation);
  ipcMain.handle('report:itemCostAnalysis', reportController.itemCostAnalysis);
  ipcMain.handle('report:jobWorkAnalysis', reportController.jobWorkAnalysis);

  // Job Work Reports (#124)
  ipcMain.handle('report:jobWorkOrders', reportController.jobWorkOrders);
  ipcMain.handle('report:jobWorkComponents', reportController.jobWorkComponents);
  ipcMain.handle('report:jobWorkOrderVouchers', reportController.jobWorkOrderVouchers);
  ipcMain.handle('report:jobWorkStock', reportController.jobWorkStock);
  ipcMain.handle('report:jobWorkVariance', reportController.jobWorkVariance);
  ipcMain.handle('report:jobWorkAnnexure', reportController.jobWorkAnnexure);
  ipcMain.handle('report:jobWorkAgeing', reportController.jobWorkAgeing);
  ipcMain.handle('report:stockQuery', reportController.stockQuery);

  // Payroll Reports
  ipcMain.handle('report:payslipReport', reportController.payslipReport);
  ipcMain.handle('report:salaryStatement', reportController.salaryStatement);
  ipcMain.handle('report:salaryRegister', reportController.salaryRegister);
  ipcMain.handle('report:attendanceReport', reportController.attendanceReport);
  ipcMain.handle('report:payHeadBreakup', reportController.payHeadBreakup);
  ipcMain.handle('report:pfReport', reportController.pfReport);
  ipcMain.handle('report:esiReport', reportController.esiReport);
  ipcMain.handle('report:professionalTax', reportController.professionalTax);
  ipcMain.handle('report:gratuity', reportController.gratuity);
  ipcMain.handle('report:paySlip', reportController.paySlip);
  ipcMain.handle('report:paySlipDetail', reportController.paySlipDetail);
  ipcMain.handle('report:paySheet', reportController.paySheet);
  ipcMain.handle('report:attendanceSheet', reportController.attendanceSheet);
  ipcMain.handle('report:paymentAdvice', reportController.paymentAdvice);
  ipcMain.handle('report:employeesWithoutEmail', reportController.employeesWithoutEmail);
  ipcMain.handle('report:payrollStatement', reportController.payrollStatement);
  ipcMain.handle('report:employeePayHeadBreakup', reportController.employeePayHeadBreakup);
  ipcMain.handle('report:payHeadEmployeeBreakup', reportController.payHeadEmployeeBreakup);
  ipcMain.handle('report:employeeProfile', reportController.employeeProfile);
  ipcMain.handle('report:employeeHeadCount', reportController.employeeHeadCount);
  ipcMain.handle('report:paymentRegister', reportController.paymentRegister);
  ipcMain.handle('report:receiptRegister', reportController.receiptRegister);
  ipcMain.handle('report:journalRegister', reportController.journalRegister);
  ipcMain.handle('report:debitNoteRegister', reportController.debitNoteRegister);
  ipcMain.handle('report:creditNoteRegister', reportController.creditNoteRegister);
  ipcMain.handle('report:purchaseRegister', reportController.purchaseRegister);
  ipcMain.handle('report:salesRegister', reportController.salesRegister);
  ipcMain.handle('report:contraRegister', reportController.contraRegister);
  ipcMain.handle('report:contraRegisterVouchers', reportController.contraRegisterVouchers);
  ipcMain.handle('report:paymentRegisterVouchers', reportController.paymentRegisterVouchers);
  ipcMain.handle('report:receiptRegisterVouchers', reportController.receiptRegisterVouchers);
  ipcMain.handle('report:salesRegisterVouchers', reportController.salesRegisterVouchers);
  ipcMain.handle('report:purchaseRegisterVouchers', reportController.purchaseRegisterVouchers);
  ipcMain.handle('report:journalRegisterVouchers', reportController.journalRegisterVouchers);
  ipcMain.handle('report:debitNoteRegisterVouchers', reportController.debitNoteRegisterVouchers);
  ipcMain.handle('report:creditNoteRegisterVouchers', reportController.creditNoteRegisterVouchers);

  ipcMain.handle('trialBalanceReport:create', trialBalanceReportController.create);
  ipcMain.handle('trialBalanceReport:getAll', trialBalanceReportController.getAll);
  ipcMain.handle('trialBalanceReport:getById', trialBalanceReportController.getById);
  ipcMain.handle('trialBalanceReport:delete', trialBalanceReportController.delete);

  ipcMain.handle('balanceSheetReport:create', balanceSheetReportController.create);
  ipcMain.handle('balanceSheetReport:getAll', balanceSheetReportController.getAll);
  ipcMain.handle('balanceSheetReport:getById', balanceSheetReportController.getById);
  ipcMain.handle('balanceSheetReport:delete', balanceSheetReportController.delete);

  ipcMain.handle('cashFlowReport:create', cashFlowReportController.create);
  ipcMain.handle('cashFlowReport:getAll', cashFlowReportController.getAll);
  ipcMain.handle('cashFlowReport:getById', cashFlowReportController.getById);
  ipcMain.handle('cashFlowReport:delete', cashFlowReportController.delete);
  ipcMain.handle('report:cashFlow', cashFlowReportController.cashFlow);

  ipcMain.handle('profitLossReport:create', profitLossReportController.create);
  ipcMain.handle('profitLossReport:getAll', profitLossReportController.getAll);
  ipcMain.handle('profitLossReport:getById', profitLossReportController.getById);
  ipcMain.handle('profitLossReport:delete', profitLossReportController.delete);

  ipcMain.handle('banking:getUnreconciled', bankingController.getUnreconciled);
  ipcMain.handle('banking:reconcile', bankingController.reconcile);
  ipcMain.handle('banking:unreconcile', bankingController.unreconcile);
  ipcMain.handle('banking:getStatement', bankingController.getStatement);
  ipcMain.handle('banking:getSummary', bankingController.getSummary);

  ipcMain.handle('auditTrail:getAll', auditTrailController.getAll);
  ipcMain.handle('auditTrail:getByEntity', auditTrailController.getByEntity);
  ipcMain.handle('auditTrail:verifyChain', auditTrailController.verifyChain);
}

module.exports = { register };
