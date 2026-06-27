const { pgTable, bigint, text, boolean, timestamp } = require('drizzle-orm/pg-core');

const costCategories = pgTable('cost_categories', {
  ccCatId: bigint('cc_cat_id', { mode: 'number' }).primaryKey().generatedByDefaultAsIdentity(),
  companyId: bigint('company_id', { mode: 'number' }).notNull(),
  name: text('name').notNull(),
  alias: text('alias'),
  allocateRevenueItems: boolean('allocate_revenue_items').notNull().default(true),
  allocateNonRevenueItems: boolean('allocate_non_revenue_items').notNull().default(false),
  isActive: boolean('is_active').notNull().default(true),
  isPredefined: boolean('is_predefined').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

module.exports = { costCategories };
