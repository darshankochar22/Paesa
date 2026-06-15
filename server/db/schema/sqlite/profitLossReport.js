const { sqliteTable, text, integer, real } = require('drizzle-orm/sqlite-core');
const { sql } = require('drizzle-orm');

const profitLossReports = sqliteTable('profit_loss_reports', {
  reportId: integer('report_id').primaryKey({ autoIncrement: true }),
  companyId: integer('company_id').notNull(),
  reportName: text('report_name').default('Profit & Loss A/c'),
  reportDate: text('report_date'),
  periodStart: text('period_start'),
  periodEnd: text('period_end'),
  formatType: text('format_type').default('Vertical'),
  compareWithPreviousPeriod: integer('compare_with_previous_period').default(0),
  comparisonPeriodStart: text('comparison_period_start'),
  comparisonPeriodEnd: text('comparison_period_end'),
  basisOfValues: text('basis_of_values').default('Default'),
  changeView: text('change_view'),
  exceptionReportEnabled: integer('exception_report_enabled').default(0),
  savedViewName: text('saved_view_name'),
  filterEnabled: integer('filter_enabled').default(0),
  filterDetails: text('filter_details'),
  showDetailView: integer('show_detail_view').default(0),
  showCondensedView: integer('show_condensed_view').default(0),
  showPercentageOfSales: integer('show_percentage_of_sales').default(0),
  showAutoColumn: integer('show_auto_column').default(0),
  showProfit: integer('show_profit').default(1),
  showOptional: integer('show_optional').default(0),
  showPostDated: integer('show_post_dated').default(0),
  showStatAdjustment: integer('show_stat_adjustment').default(0),
  showScheduleVi: integer('show_schedule_vi').default(0),
  createdAt: text('created_at').default(sql`(datetime('now'))`),
  updatedAt: text('updated_at').default(sql`(datetime('now'))`),
});

const profitLossViews = sqliteTable('profit_loss_views', {
  viewId: integer('view_id').primaryKey({ autoIncrement: true }),
  reportId: integer('report_id').notNull(),
  companyId: integer('company_id').notNull(),
  reportDate: text('report_date'),
  section: text('section').default('Income'),
  groupName: text('group_name'),
  parentGroupName: text('parent_group_name'),
  openingBalance: real('opening_balance').default(0),
  currentPeriodAmount: real('current_period_amount').default(0),
  closingBalance: real('closing_balance').default(0),
  displayOrder: integer('display_order').default(0),
  isTotalRow: integer('is_total_row').default(0),
  isGrossProfitRow: integer('is_gross_profit_row').default(0),
  isDrillDownAvailable: integer('is_drill_down_available').default(1),
  createdAt: text('created_at').default(sql`(datetime('now'))`),
});

module.exports = { profitLossReports, profitLossViews };
