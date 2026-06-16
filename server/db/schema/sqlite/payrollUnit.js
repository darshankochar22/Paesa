const { sqliteTable, integer, text, real } = require('drizzle-orm/sqlite-core');
const { sql } = require('drizzle-orm');

const payrollUnits = sqliteTable('payroll_units', {
  payrollUnitId: integer('payroll_unit_id').primaryKey({ autoIncrement: true }),
  companyId: integer('company_id').notNull(),
  name: text('name').notNull(),
  symbol: text('symbol'),
  formalName: text('formal_name'),
  unitType: text('unit_type').default('Simple'),
  decimalPlaces: integer('decimal_places').default(0),
  firstUnit: text('first_unit'),
  conversion: real('conversion'),
  secondUnit: text('second_unit'),
  isActive: integer('is_active').default(1),
  isPredefined: integer('is_predefined').default(0),
  createdAt: text('created_at').default(sql`(datetime('now'))`),
  updatedAt: text('updated_at').default(sql`(datetime('now'))`),
});

module.exports = { payrollUnits };
