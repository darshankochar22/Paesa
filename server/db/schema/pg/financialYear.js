const { pgTable, bigint, text, date, boolean, timestamp } = require('drizzle-orm/pg-core');
const { sql } = require('drizzle-orm');

// financial_years
const financialYears = pgTable('financial_years', {
  fyId: bigint('fy_id', { mode: 'number' })
    .primaryKey()
    .generatedByDefaultAsIdentity(),
  // FK: company_id -> companies(company_id) ON DELETE CASCADE (cross-module, enforced in DB DDL)
  companyId: bigint('company_id', { mode: 'number' }).notNull(),
  startDate: date('start_date').notNull(),
  endDate: date('end_date').notNull(),
  isActive: boolean('is_active').notNull().default(false),
  isClosed: boolean('is_closed').notNull().default(false),
  closingDate: date('closing_date'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().default(sql`now()`),
});

module.exports = { financialYears };
