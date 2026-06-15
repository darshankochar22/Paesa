const { sqliteTable, integer, text } = require('drizzle-orm/sqlite-core');
const { sql } = require('drizzle-orm');

// SQLite CREATE TABLE ground truth: server/employeeGroup/employeeGroup.js
const employeeGroups = sqliteTable('employee_groups', {
  employeeGroupId: integer('employee_group_id').primaryKey({ autoIncrement: true }),
  companyId: integer('company_id')
    .notNull()
    .references(() => require('./company').companies.companyId, { onDelete: 'cascade' }),
  employeeCategoryId: integer('employee_category_id')
    .references(() => require('./employeeCategory').employeeCategories.employeeCategoryId),
  name: text('name').notNull(),
  alias: text('alias'),
  parentGroupId: integer('parent_group_id')
    .references(() => employeeGroups.employeeGroupId),
  isActive: integer('is_active').default(1),
  isPredefined: integer('is_predefined').default(0),
  createdAt: text('created_at').default(sql`(datetime('now'))`),
  updatedAt: text('updated_at').default(sql`(datetime('now'))`),
});

module.exports = { employeeGroups };
