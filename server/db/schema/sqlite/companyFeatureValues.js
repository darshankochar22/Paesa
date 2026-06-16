const { sqliteTable, integer, text, real } = require('drizzle-orm/sqlite-core');
const { sql } = require('drizzle-orm');

const companyFeatureValues = sqliteTable('company_feature_values', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  companyId: integer('company_id').notNull(),
  featureItemId: integer('feature_item_id').notNull(),
  valueBoolean: integer('value_boolean').default(0),
  valueText: text('value_text'),
  valueNumber: real('value_number'),
  valueDate: text('value_date'),
  isEnabled: integer('is_enabled').default(0),
  createdAt: text('created_at').default(sql`(datetime('now'))`),
  updatedAt: text('updated_at').default(sql`(datetime('now'))`),
});

module.exports = { companyFeatureValues };
