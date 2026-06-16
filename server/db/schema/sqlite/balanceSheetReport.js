const { sqliteTable, text, integer, real } = require('drizzle-orm/sqlite-core');
const { sql } = require('drizzle-orm');

const balanceSheetReports = sqliteTable('balance_sheet_reports', {
  reportId: integer('report_id').primaryKey({ autoIncrement: true }),
  companyId: integer('company_id').notNull(),
  reportName: text('report_name').default('Balance Sheet'),
  reportDate: text('report_date'),
  comparisonPeriodStart: text('comparison_period_start'),
  comparisonPeriodEnd: text('comparison_period_end'),
  formatType: text('format_type').default('Vertical'),
  methodOfShowing: text('method_of_showing').default('Net Balance'),
  showVerticalBalanceSheet: integer('show_vertical_balance_sheet').default(1),
  showWorkingCapitalFigures: integer('show_working_capital_figures').default(0),
  profitOrLossAsLiability: integer('profit_or_loss_as_liability').default(1),
  showDetailView: integer('show_detail_view').default(0),
  showCondensedView: integer('show_condensed_view').default(0),
  showScheduleVi: integer('show_schedule_vi').default(0),
  includeClosingStock: integer('include_closing_stock').default(1),
  compareQuarterly: integer('compare_quarterly').default(0),
  basisOfValues: text('basis_of_values').default('Default'),
  changeView: text('change_view'),
  exceptionReportsEnabled: integer('exception_reports_enabled').default(0),
  filterEnabled: integer('filter_enabled').default(0),
  savedViewName: text('saved_view_name'),
  filterDetails: text('filter_details'),
  showProfit: integer('show_profit').default(1),
  showColumnar: integer('show_columnar').default(0),
  showOptional: integer('show_optional').default(0),
  showPostDated: integer('show_post_dated').default(0),
  showStatAdjustment: integer('show_stat_adjustment').default(0),
  createdAt: text('created_at').default(sql`(datetime('now'))`),
  updatedAt: text('updated_at').default(sql`(datetime('now'))`),
});

const balanceSheetViews = sqliteTable('balance_sheet_views', {
  viewId: integer('view_id').primaryKey({ autoIncrement: true }),
  reportId: integer('report_id').notNull(),
  companyId: integer('company_id').notNull(),
  reportDate: text('report_date'),
  groupName: text('group_name'),
  parentGroupName: text('parent_group_name'),
  openingBalance: real('opening_balance').default(0),
  side: text('side').default('Assets'),
  currentPeriodDebit: real('current_period_debit').default(0),
  currentPeriodCredit: real('current_period_credit').default(0),
  closingBalance: real('closing_balance').default(0),
  displayOrder: integer('display_order').default(0),
  isTotalRow: integer('is_total_row').default(0),
  isDrillDownAvailable: integer('is_drill_down_available').default(1),
  createdAt: text('created_at').default(sql`(datetime('now'))`),
});

module.exports = { balanceSheetReports, balanceSheetViews };
