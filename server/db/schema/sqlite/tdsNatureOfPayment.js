const { sqliteTable, integer, text, real } = require('drizzle-orm/sqlite-core');
const { sql } = require('drizzle-orm');
const { companies } = require('./company');

const tdsNatureOfPayment = sqliteTable('tds_nature_of_payment', {
  tdsId: integer('tds_id').primaryKey({ autoIncrement: true }),
  companyId: integer('company_id')
    .notNull()
    .references(() => companies.companyId, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  section: text('section'),
  paymentCode: text('payment_code'),
  remittanceCode: text('remittance_code'),
  rateIndividualWithPan: real('rate_individual_with_pan').default(0),
  rateOtherWithPan: real('rate_other_with_pan').default(0),
  isZeroRated: integer('is_zero_rated').default(0),
  thresholdLimit: real('threshold_limit').default(0),
  isPredefined: integer('is_predefined').default(0),
  isActive: integer('is_active').default(1),
  createdAt: text('created_at').default(sql`(datetime('now'))`),
  updatedAt: text('updated_at').default(sql`(datetime('now'))`),
});

module.exports = { tdsNatureOfPayment };
