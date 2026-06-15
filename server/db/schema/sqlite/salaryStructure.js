const { sqliteTable, text, integer, real } = require('drizzle-orm/sqlite-core');
const { sql } = require('drizzle-orm');

// salary_structures
const salaryStructures = sqliteTable('salary_structures', {
  structureId: integer('structure_id').primaryKey({ autoIncrement: true }),
  companyId: integer('company_id').notNull(),
  employeeId: integer('employee_id').notNull(),
  effectiveFrom: text('effective_from').notNull(),
  payHeadId: integer('pay_head_id').notNull(),
  amount: real('amount').default(0),
  calculationMode: text('calculation_mode').default('Flat Rate'),
  isActive: integer('is_active').default(1),
  createdAt: text('created_at').default(sql`(datetime('now'))`),
  updatedAt: text('updated_at').default(sql`(datetime('now'))`),
});

module.exports = {
  salaryStructures,
};
