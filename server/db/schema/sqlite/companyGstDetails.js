const { sqliteTable, integer, text, real } = require('drizzle-orm/sqlite-core');
const { sql } = require('drizzle-orm');
const { companies } = require('./company');

// Mirrors server/companyGstDetails/companyGstDetails.js CREATE TABLE company_gst_details.
// One row per company; PK == company_id, which is also a FK to companies(company_id).
const companyGstDetails = sqliteTable('company_gst_details', {
  companyId: integer('company_id')
    .primaryKey()
    .references(() => companies.companyId, { onDelete: 'cascade' }),
  hsnSacType: text('hsn_sac_type').default('Not Defined'),
  hsnSacCode: text('hsn_sac_code'),
  description: text('description'),
  taxabilityType: text('taxability_type').default('Not Defined'),
  gstRate: real('gst_rate').default(0),
  interstateThresholdLimit: real('interstate_threshold_limit').default(50000),
  intrastateThresholdLimit: real('intrastate_threshold_limit').default(50000),
  thresholdLimitIncludes: text('threshold_limit_includes').default('Value of Invoice'),
  createHsnSummaryFor: text('create_hsn_summary_for').default('All Sections'),
  minimumHsnLength: integer('minimum_hsn_length').default(4),
  showGstAdvances: integer('show_gst_advances').default(0),
  updateGstStatus: integer('update_gst_status').default(0),
  gstReturnsConfigured: integer('gst_returns_configured').default(0),
  effectiveDate: text('effective_date').default('1-Apr-26'),
  downloadGstRegistration: text('download_gst_registration'),
  downloadReturnType: text('download_return_type').default('All Returns'),
  setStateWiseThresholdLimit: integer('set_state_wise_threshold_limit').default(0),
  stateWiseLimits: text('state_wise_limits'),
  // 1 = company exports/SEZ-supplies under LUT/Bond (zero-rated, no IGST); 0 = with payment
  // of tax (IGST charged, refund route). Drives export supply-type + zero-rating.
  exportsUnderLut: integer('exports_under_lut').default(1),
  gstAdvancesApplicableFrom: text('gst_advances_applicable_from'),
  createdAt: text('created_at').default(sql`(datetime('now'))`),
  updatedAt: text('updated_at').default(sql`(datetime('now'))`),
});

module.exports = { companyGstDetails };
