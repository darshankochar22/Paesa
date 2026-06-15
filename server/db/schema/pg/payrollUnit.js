const { pgTable, bigint, text, integer, numeric, boolean, timestamp } = require('drizzle-orm/pg-core');
const { sql } = require('drizzle-orm');

const payrollUnits = pgTable('payroll_units', {
  payrollUnitId: bigint('payroll_unit_id', { mode: 'number' }).primaryKey().generatedByDefaultAsIdentity(),
  companyId: bigint('company_id', { mode: 'number' }).notNull(),
  name: text('name').notNull(),
  symbol: text('symbol'),
  formalName: text('formal_name'),
  unitType: text('unit_type').notNull().default('Simple'),
  decimalPlaces: integer('decimal_places').notNull().default(0),
  firstUnit: text('first_unit'),
  conversion: numeric('conversion', { precision: 18, scale: 4 }),
  secondUnit: text('second_unit'),
  isActive: boolean('is_active').notNull().default(true),
  isPredefined: boolean('is_predefined').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

module.exports = { payrollUnits };
