const { sqliteTable, text, integer, real } = require('drizzle-orm/sqlite-core');
const { sql } = require('drizzle-orm');

const cashFlowReports = sqliteTable('cash_flow_reports', {
  reportId: integer('report_id').primaryKey({ autoIncrement: true }),
  companyId: integer('company_id').notNull(),
  reportName: text('report_name').default('Cash Flow'),
  startDate: text('start_date'),
  endDate: text('end_date'),
  grandTotalInflow: real('grand_total_inflow').default(0),
  grandTotalOutflow: real('grand_total_outflow').default(0),
  grandTotalNett: real('grand_total_nett').default(0),
  createdAt: text('created_at').default(sql`(datetime('now'))`),
  updatedAt: text('updated_at').default(sql`(datetime('now'))`),
});

const cashFlowViews = sqliteTable('cash_flow_views', {
  viewId: integer('view_id').primaryKey({ autoIncrement: true }),
  reportId: integer('report_id').notNull(),
  companyId: integer('company_id').notNull(),
  monthName: text('month_name'),
  inflow: real('inflow').default(0),
  outflow: real('outflow').default(0),
  nettFlow: real('nett_flow').default(0),
  displayOrder: integer('display_order').default(0),
  createdAt: text('created_at').default(sql`(datetime('now'))`),
});

module.exports = { cashFlowReports, cashFlowViews };