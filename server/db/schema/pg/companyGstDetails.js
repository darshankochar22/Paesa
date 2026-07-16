const {
  pgTable,
  bigint,
  text,
  numeric,
  integer,
  boolean,
  jsonb,
  timestamp,
} = require('drizzle-orm/pg-core');
const { sql } = require('drizzle-orm');
const { companies } = require('./company');

// Follows docs/db/modules/companyGstDetails.sql.
// company_id is a plain BIGINT PK (NOT identity) AND a FK to companies(company_id) ON DELETE CASCADE.
const companyGstDetails = pgTable('company_gst_details', {
  companyId: bigint('company_id', { mode: 'number' })
    .primaryKey()
    .references(() => companies.companyId, { onDelete: 'cascade' }),
  hsnSacType: text('hsn_sac_type').default('Not Defined'),
  hsnSacCode: text('hsn_sac_code'),
  description: text('description'),
  taxabilityType: text('taxability_type').default('Not Defined'),
  gstRate: numeric('gst_rate', { precision: 18, scale: 4 }).default('0'),
  gstRateDetails: text('gst_rate_details').default('Not Defined'),
  gstClassification: text('gst_classification'),
  slabRates: jsonb('slab_rates'),
  interstateThresholdLimit: numeric('interstate_threshold_limit', {
    precision: 18,
    scale: 2,
  }).default('50000'),
  intrastateThresholdLimit: numeric('intrastate_threshold_limit', {
    precision: 18,
    scale: 2,
  }).default('50000'),
  thresholdLimitIncludes: text('threshold_limit_includes').default('Value of Invoice'),
  createHsnSummaryFor: text('create_hsn_summary_for').default('All Sections'),
  minimumHsnLength: integer('minimum_hsn_length').default(4),
  showGstAdvances: boolean('show_gst_advances').default(false),
  updateGstStatus: boolean('update_gst_status').default(false),
  gstReturnsConfigured: boolean('gst_returns_configured').default(false),
  effectiveDate: text('effective_date').default('1-Apr-26'),
  downloadGstRegistration: text('download_gst_registration'),
  downloadReturnType: text('download_return_type').default('All Returns'),
  setStateWiseThresholdLimit: boolean('set_state_wise_threshold_limit').default(false),
  stateWiseLimits: jsonb('state_wise_limits'),
  gstAdvancesApplicableFrom: text('gst_advances_applicable_from'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

module.exports = { companyGstDetails };
