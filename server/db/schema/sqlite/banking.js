const { sqliteTable, integer, text, real } = require('drizzle-orm/sqlite-core');
const { sql } = require('drizzle-orm');

// Mirrors server/banking/banking.js CREATE TABLE reconciliations (SQLite ground truth).
const reconciliations = sqliteTable('reconciliations', {
  reconciliationId: integer('reconciliation_id').primaryKey({ autoIncrement: true }),
  // FK -> voucher_entries(entry_id) ON DELETE CASCADE (owned by vouchers module).
  entryId: integer('entry_id').notNull(),
  // FK -> vouchers(voucher_id) ON DELETE CASCADE (owned by vouchers module).
  voucherId: integer('voucher_id').notNull(),
  // FK -> ledgers(ledger_id) ON DELETE CASCADE (owned by ledgers module).
  ledgerId: integer('ledger_id').notNull(),
  reconciledDate: text('reconciled_date'),
  bankDate: text('bank_date'),
  bankReference: text('bank_reference'),
  // SQLite: TEXT DEFAULT (datetime('now')) storing ISO strings; keep raw TEXT.
  reconciledAt: text('reconciled_at').default(sql`(datetime('now'))`),
});

// Mirrors server/banking/banking.js CREATE TABLE bank_statement_imports.
const bankStatementImports = sqliteTable('bank_statement_imports', {
  importId: integer('import_id').primaryKey({ autoIncrement: true }),
  // FK -> companies(company_id) ON DELETE CASCADE (owned by company module).
  companyId: integer('company_id').notNull(),
  // FK -> ledgers(ledger_id) ON DELETE CASCADE — the bank ledger the statement belongs to.
  ledgerId: integer('ledger_id').notNull(),
  fileName: text('file_name'),
  accountNumber: text('account_number'),
  statementFrom: text('statement_from'),
  statementTo: text('statement_to'),
  totalRows: integer('total_rows').default(0),
  // Soft delete: imports with posted vouchers are hidden, not removed, so their
  // lines keep feeding duplicate detection (line_hash) on re-imports.
  isDeleted: integer('is_deleted').default(0),
  importedAt: text('imported_at').default(sql`(datetime('now'))`),
});

// Mirrors server/banking/banking.js CREATE TABLE bank_statement_lines.
const bankStatementLines = sqliteTable('bank_statement_lines', {
  lineId: integer('line_id').primaryKey({ autoIncrement: true }),
  // FK -> bank_statement_imports(import_id) ON DELETE CASCADE.
  importId: integer('import_id').notNull(),
  companyId: integer('company_id').notNull(),
  // The bank ledger (denormalised from the import for direct queries).
  ledgerId: integer('ledger_id').notNull(),
  txnDate: text('txn_date').notNull(),
  narration: text('narration'),
  refNo: text('ref_no'),
  withdrawal: real('withdrawal').default(0),
  deposit: real('deposit').default(0),
  balance: real('balance'),
  // Payment | Receipt | Contra — suggestion first, user's choice after review.
  voucherType: text('voucher_type'),
  contraLedgerId: integer('contra_ledger_id'),
  // account_number | rule | ledger_name | keyword | manual — why this ledger was suggested.
  matchSource: text('match_source'),
  // pending | created | ignored | duplicate.
  status: text('status').default('pending'),
  voucherId: integer('voucher_id'),
  lineHash: text('line_hash'),
});

// Mirrors server/banking/banking.js CREATE TABLE bank_statement_rules.
const bankStatementRules = sqliteTable('bank_statement_rules', {
  ruleId: integer('rule_id').primaryKey({ autoIncrement: true }),
  companyId: integer('company_id').notNull(),
  matchText: text('match_text').notNull(),
  ledgerId: integer('ledger_id').notNull(),
  voucherType: text('voucher_type'),
  hits: integer('hits').default(1),
  updatedAt: text('updated_at').default(sql`(datetime('now'))`),
});

module.exports = { reconciliations, bankStatementImports, bankStatementLines, bankStatementRules };
