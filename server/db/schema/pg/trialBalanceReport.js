const { pgTable, bigint, text, date, numeric, integer, boolean, timestamp } = require('drizzle-orm/pg-core');
const { sql } = require('drizzle-orm');

const trialBalanceReports = pgTable('trial_balance_reports', {
  reportId: bigint('report_id', { mode: 'number' }).generatedByDefaultAsIdentity().primaryKey(),
  companyId: bigint('company_id', { mode: 'number' }).notNull(),
  companyName: text('company_name'),
  reportDate: date('report_date'),
  periodStart: date('period_start'),
  periodEnd: date('period_end'),
  showClosingBalance: boolean('show_closing_balance').notNull().default(true),
  showDebitCredit: boolean('show_debit_credit').notNull().default(true),
  showGroups: boolean('show_groups').notNull().default(true),
  showGrandTotal: boolean('show_grand_total').notNull().default(true),
  detailedMode: boolean('detailed_mode').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().default(sql`now()`),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().default(sql`now()`),
});

const trialBalanceRows = pgTable('trial_balance_rows', {
  rowId: bigint('row_id', { mode: 'number' }).generatedByDefaultAsIdentity().primaryKey(),
  reportId: bigint('report_id', { mode: 'number' }).notNull()
    .references(() => trialBalanceReports.reportId, { onDelete: 'cascade' }),
  parentRowId: bigint('parent_row_id', { mode: 'number' }),
  rowType: text('row_type').notNull().default('Ledger'),
  particulars: text('particulars'),
  groupId: bigint('group_id', { mode: 'number' }),
  ledgerId: bigint('ledger_id', { mode: 'number' }),
  displayOrder: integer('display_order').notNull().default(0),
  openingDebit: numeric('opening_debit', { precision: 18, scale: 2 }).notNull().default('0'),
  openingCredit: numeric('opening_credit', { precision: 18, scale: 2 }).notNull().default('0'),
  periodDebit: numeric('period_debit', { precision: 18, scale: 2 }).notNull().default('0'),
  periodCredit: numeric('period_credit', { precision: 18, scale: 2 }).notNull().default('0'),
  closingDebit: numeric('closing_debit', { precision: 18, scale: 2 }).notNull().default('0'),
  closingCredit: numeric('closing_credit', { precision: 18, scale: 2 }).notNull().default('0'),
  isDrillable: boolean('is_drillable').notNull().default(true),
  isGrandTotal: boolean('is_grand_total').notNull().default(false),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().default(sql`now()`),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().default(sql`now()`),
});

module.exports = { trialBalanceReports, trialBalanceRows };
