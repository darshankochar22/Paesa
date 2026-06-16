const { pgTable, bigint, text, numeric, boolean, timestamp } = require('drizzle-orm/pg-core');
const { sql } = require('drizzle-orm');
const { companies } = require('./company');

const tdsNatureOfPayment = pgTable('tds_nature_of_payment', {
  tdsId: bigint('tds_id', { mode: 'number' }).primaryKey().generatedByDefaultAsIdentity(),
  companyId: bigint('company_id', { mode: 'number' })
    .notNull()
    .references(() => companies.companyId, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  section: text('section'),
  paymentCode: text('payment_code'),
  remittanceCode: text('remittance_code'),
  rateIndividualWithPan: numeric('rate_individual_with_pan', { precision: 18, scale: 4 }).notNull().default('0'),
  rateOtherWithPan: numeric('rate_other_with_pan', { precision: 18, scale: 4 }).notNull().default('0'),
  isZeroRated: boolean('is_zero_rated').notNull().default(false),
  thresholdLimit: numeric('threshold_limit', { precision: 18, scale: 2 }).notNull().default('0'),
  calculateTaxOnExceedingThreshold: boolean('calculate_tax_on_exceeding_threshold').notNull().default(false),
  isPredefined: boolean('is_predefined').notNull().default(false),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().default(sql`now()`),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().default(sql`now()`),
});

module.exports = { tdsNatureOfPayment };
