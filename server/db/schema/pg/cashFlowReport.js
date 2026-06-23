const { pgTable, bigint, text, date, numeric, integer, timestamp } = require('drizzle-orm/pg-core');
const { sql } = require('drizzle-orm');

const cashFlowReports = pgTable('cash_flow_reports', {
  reportId: bigint('report_id', { mode: 'number' }).generatedByDefaultAsIdentity().primaryKey(),
  companyId: bigint('company_id', { mode: 'number' }).notNull(),
  reportName: text('report_name').default('Cash Flow'),
  startDate: date('start_date'),
  endDate: date('end_date'),
  grandTotalInflow: numeric('grand_total_inflow', { precision: 18, scale: 2 }).notNull().default('0'),
  grandTotalOutflow: numeric('grand_total_outflow', { precision: 18, scale: 2 }).notNull().default('0'),
  grandTotalNett: numeric('grand_total_nett', { precision: 18, scale: 2 }).notNull().default('0'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().default(sql`now()`),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().default(sql`now()`),
});

const cashFlowViews = pgTable('cash_flow_views', {
  viewId: bigint('view_id', { mode: 'number' }).generatedByDefaultAsIdentity().primaryKey(),
  reportId: bigint('report_id', { mode: 'number' }).notNull()
    .references(() => cashFlowReports.reportId, { onDelete: 'cascade' }),
  companyId: bigint('company_id', { mode: 'number' }).notNull(),
  monthName: text('month_name'),
  inflow: numeric('inflow', { precision: 18, scale: 2 }).notNull().default('0'),
  outflow: numeric('outflow', { precision: 18, scale: 2 }).notNull().default('0'),
  nettFlow: numeric('nett_flow', { precision: 18, scale: 2 }).notNull().default('0'),
  displayOrder: integer('display_order').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().default(sql`now()`),
});

module.exports = { cashFlowReports, cashFlowViews };