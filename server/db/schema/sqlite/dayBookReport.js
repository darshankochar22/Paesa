const { sqliteTable, text, integer, real } = require('drizzle-orm/sqlite-core');

const dayBookReports = sqliteTable('day_book_reports', {
  reportId: integer('report_id').primaryKey({ autoIncrement: true }),
  companyId: integer('company_id').notNull(),
  reportName: text('report_name').default('Day Book'),
  dateFrom: text('date_from'),
  dateTo: text('date_to'),
  selectedCompanyId: integer('selected_company_id'),
  basisOfValues: text('basis_of_values').default('Default'),
  changeView: text('change_view'),
  exceptionReportsEnabled: integer('exception_reports_enabled').default(0),
  savedViewName: text('saved_view_name'),
  filterEnabled: integer('filter_enabled').default(0),
  filterDetails: text('filter_details'),
  showProfit: integer('show_profit').default(0),
  showColumnar: integer('show_columnar').default(0),
  showOptional: integer('show_optional').default(0),
  showPostDated: integer('show_post_dated').default(0),
  showStatAdjustment: integer('show_stat_adjustment').default(0),
  showDetails: integer('show_details').default(1),
  showRelatedReports: integer('show_related_reports').default(0),
  createdAt: text('created_at').default("datetime('now')"),
  updatedAt: text('updated_at').default("datetime('now')"),
});

const dayBookEntries = sqliteTable('day_book_entries', {
  entryId: integer('entry_id').primaryKey({ autoIncrement: true }),
  reportId: integer('report_id').notNull(),
  companyId: integer('company_id').notNull(),
  voucherId: integer('voucher_id'),
  voucherDate: text('voucher_date'),
  particulars: text('particulars'),
  voucherType: text('voucher_type'),
  voucherNumber: text('voucher_number'),
  debitAmount: real('debit_amount').default(0),
  creditAmount: real('credit_amount').default(0),
  narration: text('narration'),
  partyLedgerName: text('party_ledger_name'),
  showProfit: integer('show_profit').default(0),
  isOptional: integer('is_optional').default(0),
  isPostDated: integer('is_post_dated').default(0),
  isStatAdjustment: integer('is_stat_adjustment').default(0),
  grossProfit: real('gross_profit').default(0),
  cost: real('cost').default(0),
  displayOrder: integer('display_order').default(0),
  isDrillable: integer('is_drillable').default(1),
  notes: text('notes'),
  createdAt: text('created_at').default("datetime('now')"),
  updatedAt: text('updated_at').default("datetime('now')"),
});

const dayBookEntryLines = sqliteTable('day_book_entry_lines', {
  lineId: integer('line_id').primaryKey({ autoIncrement: true }),
  entryId: integer('entry_id').notNull(),
  ledgerId: integer('ledger_id'),
  particulars: text('particulars'),
  debitAmount: real('debit_amount').default(0),
  creditAmount: real('credit_amount').default(0),
  lineOrder: integer('line_order').default(0),
  notes: text('notes'),
});

module.exports = { dayBookReports, dayBookEntries, dayBookEntryLines };
