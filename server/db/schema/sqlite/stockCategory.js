const { sqliteTable, integer, text } = require('drizzle-orm/sqlite-core');
const { sql } = require('drizzle-orm');

const stockCategories = sqliteTable('stock_categories', {
  scId: integer('sc_id').primaryKey({ autoIncrement: true }),
  companyId: integer('company_id').notNull(),
  name: text('name').notNull(),
  alias: text('alias'),
  description: text('description'),
  parentCategoryId: integer('parent_category_id').references(() => stockCategories.scId),
  isActive: integer('is_active').default(1),
  createdAt: text('created_at').default(sql`(datetime('now'))`),
  updatedAt: text('updated_at').default(sql`(datetime('now'))`),
});

module.exports = { stockCategories };
