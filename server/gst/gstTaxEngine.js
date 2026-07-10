// Barrel — the GST tax engine is split into gstTaxCore.js (state/rate/ledger/
// registration resolution) and gstTaxCompute.js (voucher-level manual + auto
// tax computation). Consumers keep requiring this file; exports are unchanged.
const core = require('./gstTaxCore');
const compute = require('./gstTaxCompute');

module.exports = {
  STATE_CODE_MAP: core.STATE_CODE_MAP,
  resolveStateCode: core.resolveStateCode,
  resolveTaxRate: core.resolveTaxRate,
  resolveTaxLedgerId: core.resolveTaxLedgerId,
  setupStandardTaxLedgers: core.setupStandardTaxLedgers,
  resolveCompanyRegistration: core.resolveCompanyRegistration,
  classifyTaxLedgers: core.classifyTaxLedgers,
  validateAndComputeVoucherGst: compute.validateAndComputeVoucherGst,
  saveManualVoucherTaxLines: compute.saveManualVoucherTaxLines,
  computeVoucherTaxLines: compute.computeVoucherTaxLines,
  saveVoucherTaxLines: compute.saveVoucherTaxLines,
  assertGstSidesExclusive: compute.assertGstSidesExclusive,
  resolveSupplyType: compute.resolveSupplyType,
};
