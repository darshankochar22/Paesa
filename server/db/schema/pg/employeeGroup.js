const { pgTable, bigint, text, boolean, timestamp } = require('drizzle-orm/pg-core');
const { sql } = require('drizzle-orm');

// PG DDL contract: docs/db/modules/employeeGroup.sql
const employeeGroups = pgTable('employee_groups', {
  employeeGroupId: bigint('employee_group_id', { mode: 'number' })
    .primaryKey()
    .generatedByDefaultAsIdentity(),
  companyId: bigint('company_id', { mode: 'number' })
    .notNull()
    .references(() => require('./company').companies.companyId, { onDelete: 'cascade' }),
  employeeCategoryId: bigint('employee_category_id', { mode: 'number' })
    .references(() => require('./employeeCategory').employeeCategories.employeeCategoryId),
  name: text('name').notNull(),
  alias: text('alias'),
  parentGroupId: bigint('parent_group_id', { mode: 'number' })
    .references(() => employeeGroups.employeeGroupId),
  isActive: boolean('is_active').notNull().default(true),
  isPredefined: boolean('is_predefined').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

module.exports = { employeeGroups };
