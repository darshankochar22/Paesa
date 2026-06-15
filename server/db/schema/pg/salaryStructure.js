const {
  pgTable,
  bigint,
  text,
  numeric,
  boolean,
  date,
  timestamp,
} = require('drizzle-orm/pg-core');
const { sql } = require('drizzle-orm');

// salary_structures
const salaryStructures = pgTable('salary_structures', {
  structureId: bigint('structure_id', { mode: 'number' }).primaryKey().generatedByDefaultAsIdentity(),
  companyId: bigint('company_id', { mode: 'number' }).notNull(),
  employeeId: bigint('employee_id', { mode: 'number' }).notNull(),
  effectiveFrom: date('effective_from').notNull(),
  payHeadId: bigint('pay_head_id', { mode: 'number' }).notNull(),
  amount: numeric('amount', { precision: 18, scale: 2 }).notNull().default('0'),
  calculationMode: text('calculation_mode').notNull().default('Flat Rate'),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().default(sql`now()`),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().default(sql`now()`),
});

module.exports = {
  salaryStructures,
};
