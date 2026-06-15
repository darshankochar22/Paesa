const { sqliteTable, text, integer, real } = require('drizzle-orm/sqlite-core');
const { sql } = require('drizzle-orm');

const trialBalanceReports = sqliteTable('trial_balance_reports', {
  reportId: integer('report_id').primaryKey({ autoIncrement: true }),
  companyId: integer('company_id').notNull(),
  companyName: text('company_name'),
  reportDate: text('report_date'),
  periodStart: text('period_start'),
  periodEnd: text('period_end'),
  showClosingBalance: integer('show_closing_balance').default(1),
  showDebitCredit: integer('show_debit_credit').default(1),
  showGroups: integer('show_groups').default(1),
  showGrandTotal: integer('show_grand_total').default(1),
  detailedMode: integer('detailed_mode').default(0),
  createdAt: text('created_at').default(sql`(datetime('now'))`),
  updatedAt: text('updated_at').default(sql`(datetime('now'))`),
});

const trialBalanceRows = sqliteTable('trial_balance_rows', {
  rowId: integer('row_id').primaryKey({ autoIncrement: true }),
  reportId: integer('report_id').notNull(),
  parentRowId: integer('parent_row_id'),
  rowType: text('row_type').default('Ledger'),
  particulars: text('particulars'),
  groupId: integer('group_id'),
  ledgerId: integer('ledger_id'),
  displayOrder: integer('display_order').default(0),
  openingDebit: real('opening_debit').default(0),
  openingCredit: real('opening_credit').default(0),
  periodDebit: real('period_debit').default(0),
  periodCredit: real('period_credit').default(0),
  closingDebit: real('closing_debit').default(0),
  closingCredit: real('closing_credit').default(0),
  isDrillable: integer('is_drillable').default(1),
  isGrandTotal: integer('is_grand_total').default(0),
  notes: text('notes'),
  createdAt: text('created_at').default(sql`(datetime('now'))`),
  updatedAt: text('updated_at').default(sql`(datetime('now'))`),
});

module.exports = { trialBalanceReports, trialBalanceRows };
