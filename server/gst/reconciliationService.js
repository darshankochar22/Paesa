'use strict';

// Barrel — the GST reconciliation service is split into cohesive modules under
// ./reconciliation/ (core classifier, portal reconciliation, return activities,
// return-period drill reports, annual computation, utilities). Consumers keep
// requiring this file; the export surface is unchanged.
const portalRecon = require('./reconciliation/portalRecon');
const returnActivities = require('./reconciliation/returnActivities');
const returnReports = require('./reconciliation/returnReports');
const annual = require('./reconciliation/annual');
const utilities = require('./reconciliation/utilities');

module.exports = {
  getGSTR1Reconciliation: portalRecon.getGSTR1Reconciliation,
  getRegistrationResolution: utilities.getRegistrationResolution,
  getGSTR2AReconciliation: portalRecon.getGSTR2AReconciliation,
  getGSTR2BReconciliation: portalRecon.getGSTR2BReconciliation,
  getGSTR1vs3BComparison: portalRecon.getGSTR1vs3BComparison,
  importGSTR2B: portalRecon.importGSTR2B,
  importGSTR2A: portalRecon.importGSTR2A,
  getIMSInwardSupplies: portalRecon.getIMSInwardSupplies,
  getChallanReconciliation: portalRecon.getChallanReconciliation,
  getReturnActivities: returnActivities.getReturnActivities,
  getReturnStatistics: returnReports.getReturnStatistics,
  getReturnVouchers: returnReports.getReturnVouchers,
  getNotRelevantBreakdown: returnReports.getNotRelevantBreakdown,
  getAnnualComputation: annual.getAnnualComputation,
  getAnnualSectionBreakdown: annual.getAnnualSectionBreakdown,
  getAnnualMonthly: annual.getAnnualMonthly,
  annualCategoryOf: annual.annualCategoryOf,
  getGstRateSetup: utilities.getGstRateSetup,
  getGstRateSetupTree: utilities.getGstRateSetupTree,
  getGstRateSetupStockTree: utilities.getGstRateSetupStockTree,
  validatePartyGstin: utilities.validatePartyGstin,
  createPartiesFromGstin: utilities.createPartiesFromGstin,
  updatePartyGstDetails: utilities.updatePartyGstDetails,
  getGstOpeningAdvances: utilities.getGstOpeningAdvances,
  createGstOpeningAdvance: utilities.createGstOpeningAdvance,
  deleteGstOpeningAdvance: utilities.deleteGstOpeningAdvance,
  getMarkedVouchers: utilities.getMarkedVouchers,
  getGstAdvancesReport: utilities.getGstAdvancesReport,
  getReverseChargeSupplies: utilities.getReverseChargeSupplies,
};
