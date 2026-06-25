const { ipcMain } = require('electron');

const companyController = require('./company/companyController');
const financialYearController = require("./financialYear/financialYearController"); 
const groupController = require('./group/groupController');
const ledgerController = require('./ledger/ledgerController');
const costCentreController = require('./costCentre/costCentreController');
const unitController = require('./unit/unitController');
const stockGroupController = require('./stockGroup/stockGroupController');
const stockCategoryController = require('./stockCategory/stockCategoryController');
const stockItemController = require('./stockItem/stockItemController');
const godownController = require('./godown/godownController');
const voucherController = require('./voucher/voucherController');
const reportController = require('./report/reportController');
const bankingController = require('./banking/bankingController');
const auditTrailController = require('./auditTrail/auditTrailController');
const currencyController = require('./currency/currencyController');
const voucherTypeController = require('./voucherType/voucherTypeController');
const gstRegistrationController = require('./gstRegistration/gstRegistrationController');
const gstClassificationController = require('./gstClassification/gstClassificationController');
const tcsNatureOfGoodsController = require('./tcsNatureOfGoods/tcsNatureOfGoodsController');
const tdsNatureOfPaymentController = require('./tdsNatureOfPayment/tdsNatureOfPaymentController');
const gstController = require('./gst/gstController');
const employeeCategoryController = require('./employeeCategory/employeeCategoryController');
const employeeGroupController = require('./employeeGroup/employeeGroupController');
const employeeController = require('./employee/employeeController');
const payrollUnitController = require('./payrollUnit/payrollUnitController');
const tallyFeaturesController = require('./tallyFeatures/tallyFeaturesController');
const companyCreationSuccessController = require('./companyCreationSuccess/companyCreationSuccessController');
const featureGroupController = require('./featureGroup/featureGroupController');
const featureItemController = require('./featureItem/featureItemController');
const companyFeatureValuesController = require('./companyFeatureValues/companyFeatureValuesController');
const attendanceTypeController = require('./attendanceType/attendanceTypeController');
const payHeadController = require('./payHead/payHeadController');
const salaryStructureController = require('./salaryStructure/salaryStructureController');
const trialBalanceReportController = require('./trialBalanceReport/trialBalanceReportController');
const balanceSheetReportController = require('./balanceSheetReport/balanceSheetReportController');
const cashFlowReportController = require('./cashFlowReport/cashFlowReportController');
const profitLossReportController = require('./profitLossReport/profitLossReportController');
const dayBookReportController = require('./dayBookReport/dayBookReportController');
const masterController = require("./master/masterController");
const voucherEntryActionsController = require('./voucherEntryActions/voucherEntryActionsController');
const eInvoiceController = require('./eInvoice/eInvoiceController');
const whatsappController = require('./whatsapp/whatsappController');
const physicalStockController = require('./physicalStock/physicalStockController');
const attendanceController = require('./attendance/attendanceController');
const companyGstDetailsController = require('./companyGstDetails/companyGstDetailsController');
const companyTdsDetailsController = require('./companyTdsDetails/companyTdsDetailsController');
const companyTcsDetailsController = require('./companyTcsDetails/companyTcsDetailsController');
const companyPanCinDetailsController = require('./companyPanCinDetails/companyPanCinDetailsController');
const taxUnitController=require('./taxUnits/taxUnitController');
const priceLevelController = require('./priceLevels/priceLevelController');
const priceListController = require('./priceList/priceListController');
const aiController = require('./ai/aiController');
const tallyController = require('./integrations/tally/tallyController');

ipcMain.handle('taxUnits:create',  taxUnitController.create);
ipcMain.handle('taxUnits:getAll',  taxUnitController.getAll);
ipcMain.handle('taxUnits:getById', taxUnitController.getById);
ipcMain.handle('taxUnits:update',  taxUnitController.update);
ipcMain.handle('taxUnits:delete',  taxUnitController.delete);

ipcMain.handle('priceLevels:get',    priceLevelController.get);
ipcMain.handle('priceLevels:save',   priceLevelController.save);
ipcMain.handle('priceLevels:delete', priceLevelController.delete);

ipcMain.handle('priceList:create',  priceListController.create);
ipcMain.handle('priceList:getAll',  priceListController.getAll);
ipcMain.handle('priceList:getById', priceListController.getById);
ipcMain.handle('priceList:update',  priceListController.update);
ipcMain.handle('priceList:delete',  priceListController.delete);

ipcMain.handle('company:create', companyController.create);
ipcMain.handle('company:getAll', companyController.getAll);
ipcMain.handle('company:getById', companyController.getById);
ipcMain.handle('company:update', companyController.update);
ipcMain.handle('company:delete', companyController.delete);
ipcMain.handle('company:verifyPassword', companyController.verifyPassword);

ipcMain.handle('fy:create', financialYearController.create);
ipcMain.handle('fy:getAll', financialYearController.getAll);
ipcMain.handle('fy:getById', financialYearController.getById);
ipcMain.handle('fy:setActive', financialYearController.setActive);
ipcMain.handle('fy:delete', financialYearController.delete);

ipcMain.handle('group:create', groupController.create);
ipcMain.handle('group:getAll', groupController.getAll);
ipcMain.handle('group:getById', groupController.getById);
ipcMain.handle('group:update', groupController.update);
ipcMain.handle('group:delete', groupController.delete);
ipcMain.handle('group:getTree', groupController.getTree);

ipcMain.handle('ledger:create', ledgerController.create);
ipcMain.handle('ledger:getAll', ledgerController.getAll);
ipcMain.handle('ledger:getById', ledgerController.getById);
ipcMain.handle('ledger:update', ledgerController.update);
ipcMain.handle('ledger:delete', ledgerController.delete);
ipcMain.handle('ledger:getByGroup', ledgerController.getByGroup);
ipcMain.handle('ledger:getTotalOpeningBalance', ledgerController.getTotalOpeningBalance);

ipcMain.handle('costCentre:create', costCentreController.create);
ipcMain.handle('costCentre:getAll', costCentreController.getAll);
ipcMain.handle('costCentre:getById', costCentreController.getById);
ipcMain.handle('costCentre:update', costCentreController.update);
ipcMain.handle('costCentre:delete', costCentreController.delete);
ipcMain.handle('costCentre:getTree', costCentreController.getTree);

ipcMain.handle('unit:create', unitController.create);
ipcMain.handle('unit:getAll', unitController.getAll);
ipcMain.handle('unit:getSimpleUnits', unitController.getSimpleUnits);
ipcMain.handle('unit:getById', unitController.getById);
ipcMain.handle('unit:update', unitController.update);
ipcMain.handle('unit:delete', unitController.delete);

ipcMain.handle('stockGroup:create', stockGroupController.create);
ipcMain.handle('stockGroup:getAll', stockGroupController.getAll);
ipcMain.handle('stockGroup:getById', stockGroupController.getById);
ipcMain.handle('stockGroup:update', stockGroupController.update);
ipcMain.handle('stockGroup:delete', stockGroupController.delete);
ipcMain.handle('stockGroup:getTree', stockGroupController.getTree);

ipcMain.handle('stockCategory:create', stockCategoryController.create);
ipcMain.handle('stockCategory:getAll', stockCategoryController.getAll);
ipcMain.handle('stockCategory:getById', stockCategoryController.getById);
ipcMain.handle('stockCategory:update', stockCategoryController.update);
ipcMain.handle('stockCategory:delete', stockCategoryController.delete);

ipcMain.handle('stockItem:create', stockItemController.create);
ipcMain.handle('stockItem:getAll', stockItemController.getAll);
ipcMain.handle('stockItem:getById', stockItemController.getById);
ipcMain.handle('stockItem:update', stockItemController.update);
ipcMain.handle('stockItem:delete', stockItemController.delete);
ipcMain.handle('stockItem:getByGroup', stockItemController.getByGroup);
ipcMain.handle('stockItem:getByCategory', stockItemController.getByCategory);
ipcMain.handle('stockItem:getStockBalances', stockItemController.getStockBalances);

ipcMain.handle('godown:create', godownController.create);
ipcMain.handle('godown:getAll', godownController.getAll);
ipcMain.handle('godown:getById', godownController.getById);
ipcMain.handle('godown:update', godownController.update);
ipcMain.handle('godown:delete', godownController.delete);
ipcMain.handle('godown:getTree', godownController.getTree);

ipcMain.handle('voucher:create', voucherController.create);
ipcMain.handle('voucher:getAll', voucherController.getAll);
ipcMain.handle('voucher:getById', voucherController.getById);
ipcMain.handle('voucher:update', voucherController.update);
ipcMain.handle('voucher:delete', voucherController.delete);
ipcMain.handle('voucher:cancel', voucherController.cancel);
ipcMain.handle('voucher:getDaybook', voucherController.getDaybook);
ipcMain.handle('voucher:getByType', voucherController.getByType);
ipcMain.handle('voucher:getByLedger', voucherController.getByLedger);
ipcMain.handle('voucher:getNextNumber', voucherController.getNextNumber);
ipcMain.handle('voucher:getLedgerBalance', voucherController.getLedgerBalance);
ipcMain.handle('voucher:searchLedgers', voucherController.searchLedgers);
ipcMain.handle('voucher:getPendingBills', voucherController.getPendingBills);

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
ipcMain.handle('report:interestReceivable', reportController.interestReceivable);
ipcMain.handle('report:interestPayable', reportController.interestPayable);
ipcMain.handle('report:ledgerInterest', reportController.ledgerInterest);
ipcMain.handle('report:billWiseInterest', reportController.billWiseInterest);
ipcMain.handle('report:fundsFlow', reportController.fundsFlow);
ipcMain.handle('report:stockSummary', reportController.stockSummary);
ipcMain.handle('report:stockGroupItems', reportController.stockGroupItems);
ipcMain.handle('report:stockItemMonthly', reportController.stockItemMonthly);
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

// Advanced Accounting Reports (Phase 4)
ipcMain.handle('report:costCentreReport', reportController.costCentreReport);
ipcMain.handle('report:budgetVsActual', reportController.budgetVsActual);

// Accounting summaries
ipcMain.handle('report:groupSummary',        reportController.groupSummary);
ipcMain.handle('report:groupSummaryDrilldown', reportController.groupSummaryDrilldown);
ipcMain.handle('report:ledgerMonthlySummary', reportController.ledgerMonthlySummary);
ipcMain.handle('report:statistics',          reportController.statistics);
ipcMain.handle('report:costCategorySummary', reportController.costCategorySummary);

// Inventory summaries
ipcMain.handle('report:stockItemSummary',     reportController.stockItemSummary);
ipcMain.handle('report:stockGroupSummary',    reportController.stockGroupSummary);
ipcMain.handle('report:stockCategorySummary', reportController.stockCategorySummary);

// Payroll Reports
ipcMain.handle('report:payslipReport',    reportController.payslipReport);
ipcMain.handle('report:salaryStatement',  reportController.salaryStatement);
ipcMain.handle('report:salaryRegister',   reportController.salaryRegister);
ipcMain.handle('report:attendanceReport', reportController.attendanceReport);
ipcMain.handle('report:payHeadBreakup',   reportController.payHeadBreakup);
ipcMain.handle('report:pfReport',         reportController.pfReport);
ipcMain.handle('report:esiReport',        reportController.esiReport);
ipcMain.handle('report:professionalTax',  reportController.professionalTax);
ipcMain.handle('report:gratuity',         reportController.gratuity);
ipcMain.handle('report:paymentRegister', reportController.paymentRegister);
ipcMain.handle('report:receiptRegister', reportController.receiptRegister);
ipcMain.handle('report:journalRegister',    reportController.journalRegister);
ipcMain.handle('report:debitNoteRegister',   reportController.debitNoteRegister);
ipcMain.handle('report:creditNoteRegister',  reportController.creditNoteRegister);
ipcMain.handle('report:purchaseRegister',    reportController.purchaseRegister);
ipcMain.handle('report:salesRegister',       reportController.salesRegister);
ipcMain.handle('report:contraRegister',         reportController.contraRegister);
ipcMain.handle('report:contraRegisterVouchers', reportController.contraRegisterVouchers);
ipcMain.handle('report:paymentRegisterVouchers', reportController.paymentRegisterVouchers);
ipcMain.handle('report:receiptRegisterVouchers', reportController.receiptRegisterVouchers);
ipcMain.handle('report:salesRegisterVouchers',      reportController.salesRegisterVouchers);
ipcMain.handle('report:purchaseRegisterVouchers',   reportController.purchaseRegisterVouchers);
ipcMain.handle('report:journalRegisterVouchers',    reportController.journalRegisterVouchers);
ipcMain.handle('report:debitNoteRegisterVouchers',  reportController.debitNoteRegisterVouchers);
ipcMain.handle('report:creditNoteRegisterVouchers', reportController.creditNoteRegisterVouchers);

ipcMain.handle('banking:getUnreconciled', bankingController.getUnreconciled);
ipcMain.handle('banking:reconcile', bankingController.reconcile);
ipcMain.handle('banking:unreconcile', bankingController.unreconcile);
ipcMain.handle('banking:getStatement', bankingController.getStatement);
ipcMain.handle('banking:getSummary', bankingController.getSummary);

ipcMain.handle('auditTrail:getAll', auditTrailController.getAll);
ipcMain.handle('auditTrail:getByEntity', auditTrailController.getByEntity);
ipcMain.handle('auditTrail:verifyChain', auditTrailController.verifyChain);

ipcMain.handle('currency:create', currencyController.create);
ipcMain.handle('currency:getAll', currencyController.getAll);
ipcMain.handle('currency:getById', currencyController.getById);
ipcMain.handle('currency:update', currencyController.update);
ipcMain.handle('currency:delete', currencyController.delete);
ipcMain.handle('currency:setDefault', currencyController.setDefault);

ipcMain.handle('voucherType:create', voucherTypeController.create);
ipcMain.handle('voucherType:getAll', voucherTypeController.getAll);
ipcMain.handle('voucherType:getById', voucherTypeController.getById);
ipcMain.handle('voucherType:update', voucherTypeController.update);
ipcMain.handle('voucherType:delete', voucherTypeController.delete);
ipcMain.handle('voucherType:getConfig', voucherTypeController.getConfig);
ipcMain.handle('voucherType:updateConfig', voucherTypeController.updateConfig);

ipcMain.handle('gstRegistration:create', gstRegistrationController.create);
ipcMain.handle('gstRegistration:getAll', gstRegistrationController.getAll);
ipcMain.handle('gstRegistration:getById', gstRegistrationController.getById);
ipcMain.handle('gstRegistration:update', gstRegistrationController.update);
ipcMain.handle('gstRegistration:delete', gstRegistrationController.delete);

ipcMain.handle('gstClassification:create', gstClassificationController.create);
ipcMain.handle('gstClassification:getAll', gstClassificationController.getAll);
ipcMain.handle('gstClassification:getById', gstClassificationController.getById);
ipcMain.handle('gstClassification:update', gstClassificationController.update);
ipcMain.handle('gstClassification:delete', gstClassificationController.delete);

ipcMain.handle('tcsNatureOfGoods:create', tcsNatureOfGoodsController.create);
ipcMain.handle('tcsNatureOfGoods:getAll', tcsNatureOfGoodsController.getAll);
ipcMain.handle('tcsNatureOfGoods:getById', tcsNatureOfGoodsController.getById);
ipcMain.handle('tcsNatureOfGoods:update', tcsNatureOfGoodsController.update);
ipcMain.handle('tcsNatureOfGoods:delete', tcsNatureOfGoodsController.delete);

ipcMain.handle('tdsNatureOfPayment:create', tdsNatureOfPaymentController.create);
ipcMain.handle('tdsNatureOfPayment:getAll', tdsNatureOfPaymentController.getAll);
ipcMain.handle('tdsNatureOfPayment:getById', tdsNatureOfPaymentController.getById);
ipcMain.handle('tdsNatureOfPayment:update', tdsNatureOfPaymentController.update);
ipcMain.handle('tdsNatureOfPayment:delete', tdsNatureOfPaymentController.delete);

ipcMain.handle('gst:computeTax', gstController.computeTax);
ipcMain.handle('gst:generateGSTR1', gstController.generateGSTR1);
ipcMain.handle('gst:getGSTR1', gstController.getGSTR1);
ipcMain.handle('gst:generateGSTR3B', gstController.generateGSTR3B);
ipcMain.handle('gst:getGSTR3B', gstController.getGSTR3B);
ipcMain.handle('gst:getHSNRates', gstController.getHSNRates);
ipcMain.handle('gst:upsertHSNRate', gstController.upsertHSNRate);
ipcMain.handle('gst:deleteHSNRate', gstController.deleteHSNRate);
ipcMain.handle('gst:getAnnualComputation', gstController.getAnnualComputation);
ipcMain.handle('gst:getGSTR1Reconciliation', gstController.getGSTR1Reconciliation);
ipcMain.handle('gst:getGSTR2BReconciliation', gstController.getGSTR2BReconciliation);
ipcMain.handle('gst:importGSTR2B', gstController.importGSTR2B);
ipcMain.handle('gst:getIMSInwardSupplies', gstController.getIMSInwardSupplies);
ipcMain.handle('gst:getChallanReconciliation', gstController.getChallanReconciliation);

ipcMain.handle('employeeCategory:create', employeeCategoryController.create);
ipcMain.handle('employeeCategory:getAll', employeeCategoryController.getAll);
ipcMain.handle('employeeCategory:getById', employeeCategoryController.getById);
ipcMain.handle('employeeCategory:update', employeeCategoryController.update);
ipcMain.handle('employeeCategory:delete', employeeCategoryController.delete);

ipcMain.handle('employeeGroup:create', employeeGroupController.create);
ipcMain.handle('employeeGroup:getAll', employeeGroupController.getAll);
ipcMain.handle('employeeGroup:getById', employeeGroupController.getById);
ipcMain.handle('employeeGroup:update', employeeGroupController.update);
ipcMain.handle('employeeGroup:delete', employeeGroupController.delete);
ipcMain.handle('employeeGroup:getTree', employeeGroupController.getTree);

ipcMain.handle('employee:create', employeeController.create);
ipcMain.handle('employee:getAll', employeeController.getAll);
ipcMain.handle('employee:getById', employeeController.getById);
ipcMain.handle('employee:update', employeeController.update);
ipcMain.handle('employee:delete', employeeController.delete);
ipcMain.handle('employee:getByGroup', employeeController.getByGroup);

ipcMain.handle('payrollUnit:create', payrollUnitController.create);
ipcMain.handle('payrollUnit:getAll', payrollUnitController.getAll);
ipcMain.handle('payrollUnit:getById', payrollUnitController.getById);
ipcMain.handle('payrollUnit:update', payrollUnitController.update);
ipcMain.handle('payrollUnit:delete', payrollUnitController.delete);

ipcMain.handle('physicalStock:create', physicalStockController.create);
ipcMain.handle('physicalStock:getAll', physicalStockController.getAll);
ipcMain.handle('physicalStock:getById', physicalStockController.getById);
ipcMain.handle('physicalStock:delete', physicalStockController.delete);
ipcMain.handle('physicalStock:getNextNumber', physicalStockController.getNextNumber);

ipcMain.handle('attendance:create', attendanceController.create);
ipcMain.handle('attendance:getAll', attendanceController.getAll);
ipcMain.handle('attendance:getById', attendanceController.getById);
ipcMain.handle('attendance:delete', attendanceController.delete);
ipcMain.handle('attendance:getNextNumber', attendanceController.getNextNumber);

ipcMain.handle('tallyFeatures:get', tallyFeaturesController.get);
ipcMain.handle('tallyFeatures:update', tallyFeaturesController.update);
ipcMain.handle('tallyFeatures:reset', tallyFeaturesController.reset);

ipcMain.handle('companyCreationSuccess:get', companyCreationSuccessController.get);
ipcMain.handle('companyCreationSuccess:update', companyCreationSuccessController.update);

ipcMain.handle('featureGroup:getAll', featureGroupController.getAll);
ipcMain.handle('featureGroup:getById', featureGroupController.getById);

ipcMain.handle('featureItem:getAll', featureItemController.getAll);
ipcMain.handle('featureItem:getById', featureItemController.getById);
ipcMain.handle('featureItem:getByGroup', featureItemController.getByGroup);

ipcMain.handle('companyFeatureValues:get', companyFeatureValuesController.get);
ipcMain.handle('companyFeatureValues:getByGroup', companyFeatureValuesController.getByGroup);
ipcMain.handle('companyFeatureValues:update', companyFeatureValuesController.update);
ipcMain.handle('companyFeatureValues:updateBulk', companyFeatureValuesController.updateBulk);

ipcMain.handle('attendanceType:create', attendanceTypeController.create);
ipcMain.handle('attendanceType:getAll', attendanceTypeController.getAll);
ipcMain.handle('attendanceType:getById', attendanceTypeController.getById);
ipcMain.handle('attendanceType:update', attendanceTypeController.update);
ipcMain.handle('attendanceType:delete', attendanceTypeController.delete);

ipcMain.handle('payHead:create', payHeadController.create);
ipcMain.handle('payHead:getAll', payHeadController.getAll);
ipcMain.handle('payHead:getById', payHeadController.getById);
ipcMain.handle('payHead:update', payHeadController.update);
ipcMain.handle('payHead:delete', payHeadController.delete);
ipcMain.handle('payHead:getSlabs', payHeadController.getSlabs);
ipcMain.handle('payHead:createSlab', payHeadController.createSlab);
ipcMain.handle('payHead:deleteSlab', payHeadController.deleteSlab);
ipcMain.handle('payHead:getFormulas', payHeadController.getFormulas);
ipcMain.handle('payHead:createFormula', payHeadController.createFormula);
ipcMain.handle('payHead:deleteFormula', payHeadController.deleteFormula);

ipcMain.handle('salaryStructure:create', salaryStructureController.create);
ipcMain.handle('salaryStructure:getAll', salaryStructureController.getAll);
ipcMain.handle('salaryStructure:getById', salaryStructureController.getById);
ipcMain.handle('salaryStructure:getByEmployee', salaryStructureController.getByEmployee);
ipcMain.handle('salaryStructure:update', salaryStructureController.update);
ipcMain.handle('salaryStructure:delete', salaryStructureController.delete);
ipcMain.handle('salaryStructure:createBulk', salaryStructureController.createBulk);

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

ipcMain.handle('dayBookReport:create', dayBookReportController.create);
ipcMain.handle('dayBookReport:getAll', dayBookReportController.getAll);
ipcMain.handle('dayBookReport:getById', dayBookReportController.getById);
ipcMain.handle('dayBookReport:delete', dayBookReportController.delete);
ipcMain.handle('master:getMenu', masterController.getMenu);

ipcMain.handle('voucherEntryActions:create', voucherEntryActionsController.create);
ipcMain.handle('voucherEntryActions:getAll', voucherEntryActionsController.getAll);
ipcMain.handle('voucherEntryActions:getByVoucher', voucherEntryActionsController.getByVoucher);
ipcMain.handle('voucherEntryActions:delete', voucherEntryActionsController.delete);

ipcMain.handle('eInvoice:authenticate',    eInvoiceController.authenticate);
ipcMain.handle('eInvoice:getGSTINDetails', eInvoiceController.getGSTINDetails);
ipcMain.handle('eInvoice:generateIRN',     eInvoiceController.generateIRN);
ipcMain.handle('eInvoice:getIRNDetails',   eInvoiceController.getIRNDetails);
ipcMain.handle('eInvoice:cancelIRN',       eInvoiceController.cancelIRN);
ipcMain.handle('eInvoice:saveCredentials', eInvoiceController.saveCredentials);
ipcMain.handle('eInvoice:getCredentials',  eInvoiceController.getCredentials);
ipcMain.handle('eInvoice:getRecords',      eInvoiceController.getRecords);
ipcMain.handle('eInvoice:getRecordByIRN',  eInvoiceController.getRecordByIRN);

ipcMain.handle('whatsapp:saveConfig',          whatsappController.saveConfig);
ipcMain.handle('whatsapp:getConfig',           whatsappController.getConfig);
ipcMain.handle('whatsapp:sendInvoice',         whatsappController.sendInvoice);
ipcMain.handle('whatsapp:sendPaymentReminder', whatsappController.sendPaymentReminder);
ipcMain.handle('whatsapp:sendStatement',       whatsappController.sendStatement);
ipcMain.handle('whatsapp:sendText',            whatsappController.sendText);
ipcMain.handle('whatsapp:getLogs',             whatsappController.getLogs);
ipcMain.handle('whatsapp:verifyWebhook',       whatsappController.verifyWebhook);

ipcMain.handle('companyGstDetails:get', companyGstDetailsController.get);
ipcMain.handle('companyGstDetails:save', companyGstDetailsController.save);

ipcMain.handle('companyTdsDetails:get', companyTdsDetailsController.get);
ipcMain.handle('companyTdsDetails:save', companyTdsDetailsController.save);

ipcMain.handle('companyTcsDetails:get', companyTcsDetailsController.get);
ipcMain.handle('companyTcsDetails:save', companyTcsDetailsController.save);

ipcMain.handle('companyPanCinDetails:get', companyPanCinDetailsController.get);
ipcMain.handle('companyPanCinDetails:save', companyPanCinDetailsController.save);


ipcMain.handle('ai:getKeyStatus', aiController.getKeyStatus);
ipcMain.handle('ai:setKey',       aiController.setKey);
ipcMain.handle('ai:clearKey',     aiController.clearKey);
ipcMain.handle('ai:testKey',      aiController.testKey);
ipcMain.handle('ai:ask',          aiController.ask);

ipcMain.handle('tally:testConnection', tallyController.testConnection);
ipcMain.handle('tally:preview',        tallyController.preview);
ipcMain.handle('tally:importMasters',  tallyController.importMasters);
ipcMain.handle('tally:importVouchers', tallyController.importVouchers);