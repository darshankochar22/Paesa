const { pgTable, bigint, text, numeric, boolean, timestamp } = require('drizzle-orm/pg-core');
const { sql } = require('drizzle-orm');
const { companies } = require('./company');

const tcsNatureOfGoods = pgTable('tcs_nature_of_goods', {
  tcsId: bigint('tcs_id', { mode: 'number' }).primaryKey().generatedByDefaultAsIdentity(),
  companyId: bigint('company_id', { mode: 'number' })
    .notNull()
    .references(() => companies.companyId, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  section: text('section'),
  paymentCode: text('payment_code'),
  rateIndividualWithPan: numeric('rate_individual_with_pan', { precision: 18, scale: 4 }).notNull().default('0'),
  rateIndividualWithoutPan: numeric('rate_individual_without_pan', { precision: 18, scale: 4 }).notNull().default('0'),
  rateOtherWithPan: numeric('rate_other_with_pan', { precision: 18, scale: 4 }).notNull().default('0'),
  rateOtherWithoutPan: numeric('rate_other_without_pan', { precision: 18, scale: 4 }).notNull().default('0'),
  isOwnStatus: boolean('is_own_status').notNull().default(false),
  taxOnReceiptOrRealization: text('tax_on_receipt_or_realization').notNull().default('Tax Calculated on Receipt'),
  thresholdLevel: numeric('threshold_level', { precision: 18, scale: 2 }).notNull().default('0'),
  isZeroRated: boolean('is_zero_rated').notNull().default(false),
  isPredefined: boolean('is_predefined').notNull().default(false),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().default(sql`now()`),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().default(sql`now()`),
});

module.exports = { tcsNatureOfGoods };
