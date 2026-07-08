const { ipcMain } = require('electron');

const gstController = require('../gst/gstController');
const tdsReportService = require('../tds/tdsReportService');
const tcsReportService = require('../tcs/tcsReportService');
const payrollStatutoryReportService = require('../payroll/payrollStatutoryReportService');
const msmeReportService = require('../msme/msmeReportService');
const msmePartyService = require('../msme/msmePartyService');
const esiReportService = require('../payroll/esiReportService');
const professionalTaxReportService = require('../payroll/professionalTaxReportService');
const npsReportService = require('../payroll/npsReportService');
const gratuityReportService = require('../payroll/gratuityReportService');
const incomeTaxReportService = require('../payroll/incomeTaxReportService');
const gstRegistrationController = require('../gstRegistration/gstRegistrationController');
const gstClassificationController = require('../gstClassification/gstClassificationController');
const tcsNatureOfGoodsController = require('../tcsNatureOfGoods/tcsNatureOfGoodsController');
const tdsNatureOfPaymentController = require('../tdsNatureOfPayment/tdsNatureOfPaymentController');
const exciseDutyClassificationController = require('../exciseDutyClassification/exciseDutyClassificationController');
const companyGstDetailsController = require('../companyGstDetails/companyGstDetailsController');
const companyTdsDetailsController = require('../companyTdsDetails/companyTdsDetailsController');
const companyTcsDetailsController = require('../companyTcsDetails/companyTcsDetailsController');
const companyPanCinDetailsController = require('../companyPanCinDetails/companyPanCinDetailsController');
const serviceTaxDetailsController = require('../serviceTaxDetails/serviceTaxDetailsController');
const exciseRegistrationDetailsController = require('../exciseRegistrationDetails/exciseRegistrationDetailsController');
const exciseBookController = require('../exciseBook/exciseBookController');
const vatRegistrationDetailsController = require('../vatRegistrationDetails/vatRegistrationDetailsController');
const taxUnitController = require('../taxUnits/taxUnitController');
const merchantProfileController = require('../merchantProfile/merchantProfileController');
const payrollStatutoryDetailsController = require('../payrollStatutoryDetails/payrollStatutoryDetailsController');

function register() {
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
  ipcMain.handle('gst:getRegistrationResolution', gstController.getRegistrationResolution);
  ipcMain.handle('gst:getGSTR2AReconciliation', gstController.getGSTR2AReconciliation);
  ipcMain.handle('gst:getGSTR2BReconciliation', gstController.getGSTR2BReconciliation);
  ipcMain.handle('gst:importGSTR2B', gstController.importGSTR2B);
  ipcMain.handle('gst:importGSTR2A', gstController.importGSTR2A);
  ipcMain.handle('gst:getGSTR1vs3BComparison', gstController.getGSTR1vs3BComparison);
  ipcMain.handle('gst:getIMSInwardSupplies', gstController.getIMSInwardSupplies);
  ipcMain.handle('gst:getChallanReconciliation', gstController.getChallanReconciliation);
  ipcMain.handle('gst:getGstRateSetup', gstController.getGstRateSetup);
  ipcMain.handle('gst:getGstRateSetupTree', gstController.getGstRateSetupTree);
  ipcMain.handle('gst:getGstRateSetupStockTree', gstController.getGstRateSetupStockTree);
  ipcMain.handle('gst:validatePartyGstin', gstController.validatePartyGstin);
  ipcMain.handle('gst:createPartiesFromGstin', gstController.createPartiesFromGstin);
  ipcMain.handle('gst:updatePartyGstDetails', gstController.updatePartyGstDetails);
  ipcMain.handle('gst:getGstOpeningAdvances', gstController.getGstOpeningAdvances);
  ipcMain.handle('gst:createGstOpeningAdvance', gstController.createGstOpeningAdvance);
  ipcMain.handle('gst:deleteGstOpeningAdvance', gstController.deleteGstOpeningAdvance);
  ipcMain.handle('gst:getMarkedVouchers', gstController.getMarkedVouchers);
  ipcMain.handle('gst:getGstAdvancesReport', gstController.getGstAdvancesReport);
  ipcMain.handle('gst:getReverseChargeSupplies', gstController.getReverseChargeSupplies);
  ipcMain.handle('tds:getChallanReconciliation', (event, { company_id, fy_id }) =>
    tdsReportService.getChallanReconciliation(company_id, fy_id),
  );
  ipcMain.handle('tds:getForm26Q', (event, { company_id, fy_id }) =>
    tdsReportService.getForm26Q(company_id, fy_id),
  );
  ipcMain.handle('tds:getForm27Q', (event, { company_id, fy_id }) =>
    tdsReportService.getForm27Q(company_id, fy_id),
  );
  ipcMain.handle('tds:getForm27QDrill', (event, { company_id, fy_id, ...params }) =>
    tdsReportService.getForm27QDrill(company_id, fy_id, params),
  );
  ipcMain.handle('tcs:getChallanReconciliation', (event, { company_id, fy_id }) =>
    tcsReportService.getChallanReconciliation(company_id, fy_id),
  );
  ipcMain.handle('tcs:getForm27EQ', (event, { company_id, fy_id }) =>
    tcsReportService.getForm27EQ(company_id, fy_id),
  );
  ipcMain.handle('tcs:getForm27EQDrill', (event, { company_id, fy_id, ...params }) =>
    tcsReportService.getForm27EQDrill(company_id, fy_id, params),
  );
  ipcMain.handle('tcs:getReturnTransactionBook', (event, { company_id, fy_id }) =>
    tcsReportService.getReturnTransactionBook(company_id, fy_id),
  );
  ipcMain.handle('tcs:getOutstandings', (event, { company_id, fy_id, by }) =>
    tcsReportService.getTcsOutstandings(company_id, fy_id, { by }),
  );
  ipcMain.handle('tcs:getLedgersWithoutPan', (event, { company_id }) =>
    tcsReportService.getLedgersWithoutPan(company_id),
  );
  ipcMain.handle('tcs:getChallanDetailsOfBuyer', (event, { company_id, fy_id }) =>
    tcsReportService.getChallanDetailsOfBuyer(company_id, fy_id),
  );
  ipcMain.handle('payrollStatutory:getSummary', (event, { company_id }) =>
    payrollStatutoryReportService.getStatutorySummary(company_id),
  );
  ipcMain.handle('payrollStatutory:getPayHeadDetails', (event, { company_id, ...params }) =>
    payrollStatutoryReportService.getStatutoryPayHeadDetails(company_id, params),
  );
  ipcMain.handle('payrollStatutory:getPFForm5', (event, { company_id, ...params }) =>
    payrollStatutoryReportService.getPFForm5(company_id, params),
  );
  ipcMain.handle('payrollStatutory:getPFForm10', (event, { company_id, ...params }) =>
    payrollStatutoryReportService.getPFForm10(company_id, params),
  );
  ipcMain.handle('payrollStatutory:getPFForm12A', (event, { company_id, ...params }) =>
    payrollStatutoryReportService.getPFForm12A(company_id, params),
  );
  ipcMain.handle('payrollStatutory:getPFMonthlyStatement', (event, { company_id }) =>
    payrollStatutoryReportService.getPFMonthlyStatement(company_id),
  );
  ipcMain.handle('payrollStatutory:getPFECR', (event, { company_id }) =>
    payrollStatutoryReportService.getPFECR(company_id),
  );
  ipcMain.handle('payrollStatutory:getPFForm6A', (event, { company_id }) =>
    payrollStatutoryReportService.getPFForm6A(company_id),
  );
  ipcMain.handle('payrollStatutory:getPFForm3A', (event, { company_id }) =>
    payrollStatutoryReportService.getPFForm3A(company_id),
  );
  ipcMain.handle('esi:getForm3', (event, { company_id, ...params }) =>
    esiReportService.getESIForm3(company_id, params),
  );
  ipcMain.handle('esi:getMonthlyStatement', (event, { company_id }) =>
    esiReportService.getESIMonthlyStatement(company_id),
  );
  ipcMain.handle('esi:getEReturn', (event, { company_id }) =>
    esiReportService.getESIEReturn(company_id),
  );
  ipcMain.handle('esi:getForm5', (event, { company_id }) =>
    esiReportService.getESIForm5(company_id),
  );
  ipcMain.handle('esi:getForm6', (event, { company_id }) =>
    esiReportService.getESIForm6(company_id),
  );
  ipcMain.handle('payrollStatutory:getProfessionalTax', (event, { company_id }) =>
    professionalTaxReportService.getProfessionalTax(company_id),
  );
  ipcMain.handle('payrollStatutory:getGratuity', (event, { company_id }) =>
    gratuityReportService.getGratuity(company_id),
  );
  ipcMain.handle('nps:getContributionDetails', (event, { company_id }) =>
    npsReportService.getContributionDetails(company_id),
  );
  ipcMain.handle('nps:getSummary', (event, { company_id }) =>
    npsReportService.getSummary(company_id),
  );
  ipcMain.handle('nps:getPranNotAvailable', (event, { company_id }) =>
    npsReportService.getPranNotAvailable(company_id),
  );
  ipcMain.handle('incomeTax:getComputation', (event, { company_id, ...params }) =>
    incomeTaxReportService.getComputation(company_id, params),
  );
  ipcMain.handle('incomeTax:getSalaryProjection', (event, { company_id, ...params }) =>
    incomeTaxReportService.getSalaryProjection(company_id, params),
  );
  ipcMain.handle('incomeTax:getChallanReconciliation', (event, { company_id, ...params }) =>
    incomeTaxReportService.getChallanReconciliation(company_id, params),
  );
  ipcMain.handle('incomeTax:getE24Q', (event, { company_id, ...params }) =>
    incomeTaxReportService.getE24Q(company_id, params),
  );
  ipcMain.handle('incomeTax:getForm27A', (event, { company_id, ...params }) =>
    incomeTaxReportService.getForm27A(company_id, params),
  );
  ipcMain.handle('incomeTax:getForm24Q', (event, { company_id, ...params }) =>
    incomeTaxReportService.getForm24Q(company_id, params),
  );
  ipcMain.handle('tds:getReturnTransactionBook', (event, { company_id, fy_id }) =>
    tdsReportService.getReturnTransactionBook(company_id, fy_id),
  );
  ipcMain.handle('tds:getOutstandings', (event, { company_id, fy_id, by }) =>
    tdsReportService.getTdsOutstandings(company_id, fy_id, { by }),
  );
  ipcMain.handle('tds:getLedgersWithoutPan', (event, { company_id }) =>
    tdsReportService.getLedgersWithoutPan(company_id),
  );
  ipcMain.handle('msme:getForm1', (event, { company_id, fy_id, to_date, group_id }) =>
    msmeReportService.getMsmeForm1(company_id, fy_id, { to_date, group_id }),
  );
  ipcMain.handle('msme:getPartyList', (event, { company_id, group_id, ledger_id }) =>
    msmePartyService.getPartyMsmeList(company_id, { group_id, ledger_id }),
  );
  ipcMain.handle('msme:updateDetails', (event, payload) =>
    msmePartyService.updateMsmeDetails(payload),
  );
  ipcMain.handle('gst:getReturnActivities', gstController.getReturnActivities);
  ipcMain.handle('gst:getReturnStatistics', gstController.getReturnStatistics);
  ipcMain.handle('gst:getReturnVouchers', gstController.getReturnVouchers);
  ipcMain.handle('gst:getNotRelevantBreakdown', gstController.getNotRelevantBreakdown);
  ipcMain.handle('gst:getAnnualSectionBreakdown', gstController.getAnnualSectionBreakdown);
  ipcMain.handle('gst:getAnnualMonthly', gstController.getAnnualMonthly);

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

  ipcMain.handle('exciseDutyClassification:create', exciseDutyClassificationController.create);
  ipcMain.handle('exciseDutyClassification:getAll', exciseDutyClassificationController.getAll);
  ipcMain.handle('exciseDutyClassification:getById', exciseDutyClassificationController.getById);
  ipcMain.handle('exciseDutyClassification:update', exciseDutyClassificationController.update);
  ipcMain.handle('exciseDutyClassification:delete', exciseDutyClassificationController.delete);

  ipcMain.handle('companyGstDetails:get', companyGstDetailsController.get);
  ipcMain.handle('companyGstDetails:save', companyGstDetailsController.save);

  ipcMain.handle('companyTdsDetails:get', companyTdsDetailsController.get);
  ipcMain.handle('companyTdsDetails:save', companyTdsDetailsController.save);

  ipcMain.handle('companyTcsDetails:get', companyTcsDetailsController.get);
  ipcMain.handle('companyTcsDetails:save', companyTcsDetailsController.save);

  ipcMain.handle('companyPanCinDetails:get', companyPanCinDetailsController.get);
  ipcMain.handle('companyPanCinDetails:save', companyPanCinDetailsController.save);

  ipcMain.handle('serviceTaxDetails:get', serviceTaxDetailsController.get);
  ipcMain.handle('serviceTaxDetails:save', serviceTaxDetailsController.save);

  ipcMain.handle('exciseRegistrationDetails:get', exciseRegistrationDetailsController.get);
  ipcMain.handle('exciseRegistrationDetails:save', exciseRegistrationDetailsController.save);

  ipcMain.handle('exciseBook:create', exciseBookController.create);
  ipcMain.handle('exciseBook:getAll', exciseBookController.getAll);
  ipcMain.handle('exciseBook:getById', exciseBookController.getById);
  ipcMain.handle('exciseBook:update', exciseBookController.update);
  ipcMain.handle('exciseBook:delete', exciseBookController.delete);

  ipcMain.handle('vatRegistrationDetails:get', vatRegistrationDetailsController.get);
  ipcMain.handle('vatRegistrationDetails:save', vatRegistrationDetailsController.save);

  ipcMain.handle('taxUnits:create', taxUnitController.create);
  ipcMain.handle('taxUnits:getAll', taxUnitController.getAll);
  ipcMain.handle('taxUnits:getById', taxUnitController.getById);
  ipcMain.handle('taxUnits:update', taxUnitController.update);
  ipcMain.handle('taxUnits:delete', taxUnitController.delete);

  ipcMain.handle('merchantProfile:create', merchantProfileController.create);
  ipcMain.handle('merchantProfile:getAll', merchantProfileController.getAll);
  ipcMain.handle('merchantProfile:getById', merchantProfileController.getById);
  ipcMain.handle('merchantProfile:update', merchantProfileController.update);
  ipcMain.handle('merchantProfile:delete', merchantProfileController.delete);

  ipcMain.handle('payrollStatutoryDetails:get', payrollStatutoryDetailsController.get);
  ipcMain.handle('payrollStatutoryDetails:save', payrollStatutoryDetailsController.save);
}

module.exports = { register };
