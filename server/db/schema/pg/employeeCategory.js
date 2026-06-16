const { pgTable, bigint, text, boolean, timestamp } = require('drizzle-orm/pg-core');

const employeeCategories = pgTable('employee_categories', {
  employeeCategoryId: bigint('employee_category_id', { mode: 'number' })
    .primaryKey()
    .generatedByDefaultAsIdentity(),
  companyId: bigint('company_id', { mode: 'number' }).notNull(),
  name: text('name').notNull(),
  alias: text('alias'),
  allocateRevenue: boolean('allocate_revenue').notNull().default(false),
  allocateNonRevenue: boolean('allocate_non_revenue').notNull().default(false),
  isActive: boolean('is_active').notNull().default(true),
  isPredefined: boolean('is_predefined').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

module.exports = { employeeCategories };
