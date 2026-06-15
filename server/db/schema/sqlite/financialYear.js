const { sqliteTable, integer, text } = require('drizzle-orm/sqlite-core');
const { sql } = require('drizzle-orm');

// financial_years
const financialYears = sqliteTable('financial_years', {
  fyId: integer('fy_id').primaryKey({ autoIncrement: true }),
  companyId: integer('company_id').notNull(),
  startDate: text('start_date').notNull(),
  endDate: text('end_date').notNull(),
  isActive: integer('is_active').default(0),
  isClosed: integer('is_closed').default(0),
  closingDate: text('closing_date'),
  createdAt: text('created_at').default(sql`(datetime('now'))`),
});

module.exports = { financialYears };
