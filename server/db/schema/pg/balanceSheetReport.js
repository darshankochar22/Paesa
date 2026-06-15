const { pgTable, bigint, text, date, numeric, integer, boolean, timestamp } = require('drizzle-orm/pg-core');
const { sql } = require('drizzle-orm');

const balanceSheetReports = pgTable('balance_sheet_reports', {
  reportId: bigint('report_id', { mode: 'number' }).generatedByDefaultAsIdentity().primaryKey(),
  companyId: bigint('company_id', { mode: 'number' }).notNull(),
  reportName: text('report_name').default('Balance Sheet'),
  reportDate: date('report_date'),
  comparisonPeriodStart: date('comparison_period_start'),
  comparisonPeriodEnd: date('comparison_period_end'),
  formatType: text('format_type').default('Vertical'),
  methodOfShowing: text('method_of_showing').default('Net Balance'),
  showVerticalBalanceSheet: boolean('show_vertical_balance_sheet').notNull().default(true),
  showWorkingCapitalFigures: boolean('show_working_capital_figures').notNull().default(false),
  profitOrLossAsLiability: boolean('profit_or_loss_as_liability').notNull().default(true),
  showDetailView: boolean('show_detail_view').notNull().default(false),
  showCondensedView: boolean('show_condensed_view').notNull().default(false),
  showScheduleVi: boolean('show_schedule_vi').notNull().default(false),
  includeClosingStock: boolean('include_closing_stock').notNull().default(true),
  compareQuarterly: boolean('compare_quarterly').notNull().default(false),
  basisOfValues: text('basis_of_values').default('Default'),
  changeView: text('change_view'),
  exceptionReportsEnabled: boolean('exception_reports_enabled').notNull().default(false),
  filterEnabled: boolean('filter_enabled').notNull().default(false),
  savedViewName: text('saved_view_name'),
  filterDetails: text('filter_details'),
  showProfit: boolean('show_profit').notNull().default(true),
  showColumnar: boolean('show_columnar').notNull().default(false),
  showOptional: boolean('show_optional').notNull().default(false),
  showPostDated: boolean('show_post_dated').notNull().default(false),
  showStatAdjustment: boolean('show_stat_adjustment').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().default(sql`now()`),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().default(sql`now()`),
});

const balanceSheetViews = pgTable('balance_sheet_views', {
  viewId: bigint('view_id', { mode: 'number' }).generatedByDefaultAsIdentity().primaryKey(),
  reportId: bigint('report_id', { mode: 'number' }).notNull()
    .references(() => balanceSheetReports.reportId, { onDelete: 'cascade' }),
  companyId: bigint('company_id', { mode: 'number' }).notNull(),
  reportDate: date('report_date'),
  groupName: text('group_name'),
  parentGroupName: text('parent_group_name'),
  openingBalance: numeric('opening_balance', { precision: 18, scale: 2 }).notNull().default('0'),
  side: text('side').notNull().default('Assets'),
  currentPeriodDebit: numeric('current_period_debit', { precision: 18, scale: 2 }).notNull().default('0'),
  currentPeriodCredit: numeric('current_period_credit', { precision: 18, scale: 2 }).notNull().default('0'),
  closingBalance: numeric('closing_balance', { precision: 18, scale: 2 }).notNull().default('0'),
  displayOrder: integer('display_order').notNull().default(0),
  isTotalRow: boolean('is_total_row').notNull().default(false),
  isDrillDownAvailable: boolean('is_drill_down_available').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().default(sql`now()`),
});

module.exports = { balanceSheetReports, balanceSheetViews };
