const { sqliteTable, integer, text } = require('drizzle-orm/sqlite-core');
const { sql } = require('drizzle-orm');

const employeeCategories = sqliteTable('employee_categories', {
  employeeCategoryId: integer('employee_category_id').primaryKey({ autoIncrement: true }),
  companyId: integer('company_id').notNull(),
  name: text('name').notNull(),
  alias: text('alias'),
  allocateRevenue: integer('allocate_revenue').default(0),
  allocateNonRevenue: integer('allocate_non_revenue').default(0),
  isActive: integer('is_active').default(1),
  isPredefined: integer('is_predefined').default(0),
  createdAt: text('created_at').default(sql`(datetime('now'))`),
  updatedAt: text('updated_at').default(sql`(datetime('now'))`),
});

module.exports = { employeeCategories };
