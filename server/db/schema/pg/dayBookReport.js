const { pgTable, bigint, integer, text, numeric, boolean, timestamp, date } = require('drizzle-orm/pg-core');
const { sql } = require('drizzle-orm');

const dayBookReports = pgTable('day_book_reports', {
  reportId: bigint('report_id', { mode: 'number' }).primaryKey().generatedByDefaultAsIdentity(),
  companyId: bigint('company_id', { mode: 'number' }).notNull(),
  reportName: text('report_name').default('Day Book'),
  dateFrom: date('date_from'),
  dateTo: date('date_to'),
  selectedCompanyId: bigint('selected_company_id', { mode: 'number' }),
  basisOfValues: text('basis_of_values').default('Default'),
  changeView: text('change_view'),
  exceptionReportsEnabled: boolean('exception_reports_enabled').notNull().default(false),
  savedViewName: text('saved_view_name'),
  filterEnabled: boolean('filter_enabled').notNull().default(false),
  filterDetails: text('filter_details'),
  showProfit: boolean('show_profit').notNull().default(false),
  showColumnar: boolean('show_columnar').notNull().default(false),
  showOptional: boolean('show_optional').notNull().default(false),
  showPostDated: boolean('show_post_dated').notNull().default(false),
  showStatAdjustment: boolean('show_stat_adjustment').notNull().default(false),
  showDetails: boolean('show_details').notNull().default(true),
  showRelatedReports: boolean('show_related_reports').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

const dayBookEntries = pgTable('day_book_entries', {
  entryId: bigint('entry_id', { mode: 'number' }).primaryKey().generatedByDefaultAsIdentity(),
  reportId: bigint('report_id', { mode: 'number' }).notNull().references(() => dayBookReports.reportId, { onDelete: 'cascade' }),
  companyId: bigint('company_id', { mode: 'number' }).notNull(),
  voucherId: bigint('voucher_id', { mode: 'number' }),
  voucherDate: date('voucher_date'),
  particulars: text('particulars'),
  voucherType: text('voucher_type'),
  voucherNumber: text('voucher_number'),
  debitAmount: numeric('debit_amount', { precision: 18, scale: 2 }).notNull().default('0'),
  creditAmount: numeric('credit_amount', { precision: 18, scale: 2 }).notNull().default('0'),
  narration: text('narration'),
  partyLedgerName: text('party_ledger_name'),
  showProfit: boolean('show_profit').notNull().default(false),
  isOptional: boolean('is_optional').notNull().default(false),
  isPostDated: boolean('is_post_dated').notNull().default(false),
  isStatAdjustment: boolean('is_stat_adjustment').notNull().default(false),
  grossProfit: numeric('gross_profit', { precision: 18, scale: 2 }).notNull().default('0'),
  cost: numeric('cost', { precision: 18, scale: 2 }).notNull().default('0'),
  displayOrder: integer('display_order').notNull().default(0),
  isDrillable: boolean('is_drillable').notNull().default(true),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

const dayBookEntryLines = pgTable('day_book_entry_lines', {
  lineId: bigint('line_id', { mode: 'number' }).primaryKey().generatedByDefaultAsIdentity(),
  entryId: bigint('entry_id', { mode: 'number' }).notNull().references(() => dayBookEntries.entryId, { onDelete: 'cascade' }),
  ledgerId: bigint('ledger_id', { mode: 'number' }),
  particulars: text('particulars'),
  debitAmount: numeric('debit_amount', { precision: 18, scale: 2 }).notNull().default('0'),
  creditAmount: numeric('credit_amount', { precision: 18, scale: 2 }).notNull().default('0'),
  lineOrder: integer('line_order').notNull().default(0),
  notes: text('notes'),
});

module.exports = { dayBookReports, dayBookEntries, dayBookEntryLines };
