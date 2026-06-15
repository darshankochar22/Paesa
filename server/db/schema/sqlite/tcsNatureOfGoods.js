const { sqliteTable, integer, text, real } = require('drizzle-orm/sqlite-core');
const { sql } = require('drizzle-orm');
const { companies } = require('./company');

const tcsNatureOfGoods = sqliteTable('tcs_nature_of_goods', {
  tcsId: integer('tcs_id').primaryKey({ autoIncrement: true }),
  companyId: integer('company_id')
    .notNull()
    .references(() => companies.companyId, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  section: text('section'),
  paymentCode: text('payment_code'),
  rateIndividualWithPan: real('rate_individual_with_pan').default(0),
  rateIndividualWithoutPan: real('rate_individual_without_pan').default(0),
  rateOtherWithPan: real('rate_other_with_pan').default(0),
  rateOtherWithoutPan: real('rate_other_without_pan').default(0),
  isOwnStatus: integer('is_own_status').default(0),
  taxOnReceiptOrRealization: text('tax_on_receipt_or_realization').default('Tax Calculated on Receipt'),
  thresholdLevel: real('threshold_level').default(0),
  isZeroRated: integer('is_zero_rated').default(0),
  isPredefined: integer('is_predefined').default(0),
  isActive: integer('is_active').default(1),
  createdAt: text('created_at').default(sql`(datetime('now'))`),
  updatedAt: text('updated_at').default(sql`(datetime('now'))`),
});

module.exports = { tcsNatureOfGoods };
