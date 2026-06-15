const { pgTable, bigint, text, numeric, boolean, timestamp } = require('drizzle-orm/pg-core');
const { companies } = require('./company');

// Follows docs/db/modules/gstClassification.sql.
// gc_id is IDENTITY PK. 0/1 flags -> BOOLEAN, GST rates -> NUMERIC(18,4),
// datetime('now') strings -> TIMESTAMPTZ DEFAULT now().
// company_id is an explicit FK to companies(company_id) ON DELETE CASCADE.
const gstClassifications = pgTable('gst_classifications', {
  gcId: bigint('gc_id', { mode: 'number' }).primaryKey().generatedByDefaultAsIdentity(),
  companyId: bigint('company_id', { mode: 'number' }).notNull().references(() => companies.companyId, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  description: text('description'),
  hsnSacCode: text('hsn_sac_code'),
  isNonGstGoods: boolean('is_non_gst_goods').notNull().default(false),
  natureOfTransaction: text('nature_of_transaction').notNull().default('Not Applicable'),
  taxability: text('taxability').notNull().default('Unknown'),
  isReverseCharge: boolean('is_reverse_charge').notNull().default(false),
  isIneligibleForItc: boolean('is_ineligible_for_itc').notNull().default(false),
  rateType: text('rate_type').notNull().default('Fixed Rate'),
  igstRate: numeric('igst_rate', { precision: 18, scale: 4 }).notNull().default('0'),
  igstValuationType: text('igst_valuation_type').notNull().default('Based on Value'),
  cgstRate: numeric('cgst_rate', { precision: 18, scale: 4 }).notNull().default('0'),
  cgstValuationType: text('cgst_valuation_type').notNull().default('Based on Value'),
  sgstRate: numeric('sgst_rate', { precision: 18, scale: 4 }).notNull().default('0'),
  sgstValuationType: text('sgst_valuation_type').notNull().default('Based on Value'),
  cessRate: numeric('cess_rate', { precision: 18, scale: 4 }).notNull().default('0'),
  cessValuationType: text('cess_valuation_type').notNull().default('Based on Value'),
  gstRate: numeric('gst_rate', { precision: 18, scale: 4 }).notNull().default('0'),
  gstRateDetails: text('gst_rate_details'),
  valuationType: text('valuation_type').notNull().default('Based on Value'),
  isPredefined: boolean('is_predefined').notNull().default(false),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

module.exports = { gstClassifications };
