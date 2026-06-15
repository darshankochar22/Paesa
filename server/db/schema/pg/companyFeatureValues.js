const { pgTable, bigint, text, boolean, doublePrecision, date, timestamp } = require('drizzle-orm/pg-core');
const { sql } = require('drizzle-orm');

const companyFeatureValues = pgTable('company_feature_values', {
  id: bigint('id', { mode: 'number' }).primaryKey().generatedByDefaultAsIdentity(),
  companyId: bigint('company_id', { mode: 'number' }).notNull(),
  featureItemId: bigint('feature_item_id', { mode: 'number' }).notNull(),
  valueBoolean: boolean('value_boolean').notNull().default(false),
  valueText: text('value_text'),
  valueNumber: doublePrecision('value_number'),
  valueDate: date('value_date'),
  isEnabled: boolean('is_enabled').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

module.exports = { companyFeatureValues };
