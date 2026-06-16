const { pgTable, bigint, text, date, numeric, integer, boolean, timestamp } = require('drizzle-orm/pg-core');
const { sql } = require('drizzle-orm');

const profitLossReports = pgTable('profit_loss_reports', {
  reportId: bigint('report_id', { mode: 'number' }).generatedByDefaultAsIdentity().primaryKey(),
  companyId: bigint('company_id', { mode: 'number' }).notNull(),
  reportName: text('report_name').default('Profit & Loss A/c'),
  reportDate: date('report_date'),
  periodStart: date('period_start'),
  periodEnd: date('period_end'),
  formatType: text('format_type').default('Vertical'),
  compareWithPreviousPeriod: boolean('compare_with_previous_period').notNull().default(false),
  comparisonPeriodStart: date('comparison_period_start'),
  comparisonPeriodEnd: date('comparison_period_end'),
  basisOfValues: text('basis_of_values').default('Default'),
  changeView: text('change_view'),
  exceptionReportEnabled: boolean('exception_report_enabled').notNull().default(false),
  savedViewName: text('saved_view_name'),
  filterEnabled: boolean('filter_enabled').notNull().default(false),
  filterDetails: text('filter_details'),
  showDetailView: boolean('show_detail_view').notNull().default(false),
  showCondensedView: boolean('show_condensed_view').notNull().default(false),
  showPercentageOfSales: boolean('show_percentage_of_sales').notNull().default(false),
  showAutoColumn: boolean('show_auto_column').notNull().default(false),
  showProfit: boolean('show_profit').notNull().default(true),
  showOptional: boolean('show_optional').notNull().default(false),
  showPostDated: boolean('show_post_dated').notNull().default(false),
  showStatAdjustment: boolean('show_stat_adjustment').notNull().default(false),
  showScheduleVi: boolean('show_schedule_vi').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().default(sql`now()`),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().default(sql`now()`),
});

const profitLossViews = pgTable('profit_loss_views', {
  viewId: bigint('view_id', { mode: 'number' }).generatedByDefaultAsIdentity().primaryKey(),
  reportId: bigint('report_id', { mode: 'number' }).notNull()
    .references(() => profitLossReports.reportId, { onDelete: 'cascade' }),
  companyId: bigint('company_id', { mode: 'number' }).notNull(),
  reportDate: date('report_date'),
  section: text('section').default('Income'),
  groupName: text('group_name'),
  parentGroupName: text('parent_group_name'),
  openingBalance: numeric('opening_balance', { precision: 18, scale: 2 }).notNull().default('0'),
  currentPeriodAmount: numeric('current_period_amount', { precision: 18, scale: 2 }).notNull().default('0'),
  closingBalance: numeric('closing_balance', { precision: 18, scale: 2 }).notNull().default('0'),
  displayOrder: integer('display_order').notNull().default(0),
  isTotalRow: boolean('is_total_row').notNull().default(false),
  isGrossProfitRow: boolean('is_gross_profit_row').notNull().default(false),
  isDrillDownAvailable: boolean('is_drill_down_available').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().default(sql`now()`),
});

module.exports = { profitLossReports, profitLossViews };
