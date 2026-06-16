const { pgTable, bigint, text, boolean, timestamp } = require('drizzle-orm/pg-core');
const { sql } = require('drizzle-orm');

const stockCategories = pgTable('stock_categories', {
  scId: bigint('sc_id', { mode: 'number' }).primaryKey().generatedByDefaultAsIdentity(),
  companyId: bigint('company_id', { mode: 'number' }).notNull(),
  name: text('name').notNull(),
  alias: text('alias'),
  description: text('description'),
  parentCategoryId: bigint('parent_category_id', { mode: 'number' }).references(() => stockCategories.scId),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

module.exports = { stockCategories };
