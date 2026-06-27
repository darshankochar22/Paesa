const { sqliteTable, text, integer } = require('drizzle-orm/sqlite-core');
const { sql } = require('drizzle-orm');

const costCategories = sqliteTable('cost_categories', {
  ccCatId: integer('cc_cat_id').primaryKey({ autoIncrement: true }),
  companyId: integer('company_id').notNull(),
  name: text('name').notNull(),
  alias: text('alias'),
  allocateRevenueItems: integer('allocate_revenue_items').default(1),
  allocateNonRevenueItems: integer('allocate_non_revenue_items').default(0),
  isActive: integer('is_active').default(1),
  isPredefined: integer('is_predefined').default(0),
  createdAt: text('created_at').default(sql`(datetime('now'))`),
  updatedAt: text('updated_at').default(sql`(datetime('now'))`),
});

module.exports = { costCategories };
