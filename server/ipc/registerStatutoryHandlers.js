const { ipcMain } = require('electron');

const gstController = require('../gst/gstController');
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
  ipcMain.handle('gst:getGSTR2AReconciliation', gstController.getGSTR2AReconciliation);
  ipcMain.handle('gst:getGSTR2BReconciliation', gstController.getGSTR2BReconciliation);
  ipcMain.handle('gst:importGSTR2B', gstController.importGSTR2B);
  ipcMain.handle('gst:getIMSInwardSupplies', gstController.getIMSInwardSupplies);
  ipcMain.handle('gst:getChallanReconciliation', gstController.getChallanReconciliation);
  ipcMain.handle('gst:getGstRateSetup', gstController.getGstRateSetup);
  ipcMain.handle('gst:validatePartyGstin', gstController.validatePartyGstin);
  ipcMain.handle('gst:createPartiesFromGstin', gstController.createPartiesFromGstin);
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
