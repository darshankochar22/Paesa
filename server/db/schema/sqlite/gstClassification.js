const { sqliteTable, integer, text, real } = require('drizzle-orm/sqlite-core');
const { sql } = require('drizzle-orm');
const { companies } = require('./company');

// Mirrors server/gstClassification/gstClassification.js CREATE TABLE gst_classifications.
// Raw SQLite types preserved: 0/1 flags stay INTEGER, datetime('now') strings stay TEXT
// (the service reads/writes them as raw values), GST rates stay REAL.
const gstClassifications = sqliteTable('gst_classifications', {
  gcId: integer('gc_id').primaryKey({ autoIncrement: true }),
  companyId: integer('company_id').notNull().references(() => companies.companyId, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  description: text('description'),
  hsnSacCode: text('hsn_sac_code'),
  isNonGstGoods: integer('is_non_gst_goods').default(0),
  natureOfTransaction: text('nature_of_transaction').default('Not Applicable'),
  taxability: text('taxability').default('Unknown'),
  isReverseCharge: integer('is_reverse_charge').default(0),
  isIneligibleForItc: integer('is_ineligible_for_itc').default(0),
  rateType: text('rate_type').default('Fixed Rate'),
  igstRate: real('igst_rate').default(0),
  igstValuationType: text('igst_valuation_type').default('Based on Value'),
  cgstRate: real('cgst_rate').default(0),
  cgstValuationType: text('cgst_valuation_type').default('Based on Value'),
  sgstRate: real('sgst_rate').default(0),
  sgstValuationType: text('sgst_valuation_type').default('Based on Value'),
  cessRate: real('cess_rate').default(0),
  cessValuationType: text('cess_valuation_type').default('Based on Value'),
  gstRate: real('gst_rate').default(0),
  gstRateDetails: text('gst_rate_details'),
  valuationType: text('valuation_type').default('Based on Value'),
  isPredefined: integer('is_predefined').default(0),
  isActive: integer('is_active').default(1),
  createdAt: text('created_at').default(sql`(datetime('now'))`),
  updatedAt: text('updated_at').default(sql`(datetime('now'))`),
});

module.exports = { gstClassifications };
