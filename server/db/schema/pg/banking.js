const { pgTable, bigint, text, date, timestamp, integer, numeric } = require('drizzle-orm/pg-core');
const { sql } = require('drizzle-orm');

// Mirrors docs/db/modules/banking.sql (PostgreSQL contract).
// FKs (entry_id, voucher_id, ledger_id) reference tables owned by other modules
// (voucher_entries, vouchers, ledgers); enforced at the DDL layer, kept as
// plain columns here to avoid cross-module require cycles.
const reconciliations = pgTable('reconciliations', {
  reconciliationId: bigint('reconciliation_id', { mode: 'number' })
    .primaryKey()
    .generatedByDefaultAsIdentity(),
  // FK -> voucher_entries(entry_id) ON DELETE CASCADE.
  entryId: bigint('entry_id', { mode: 'number' }).notNull(),
  // FK -> vouchers(voucher_id) ON DELETE CASCADE.
  voucherId: bigint('voucher_id', { mode: 'number' }).notNull(),
  // FK -> ledgers(ledger_id) ON DELETE CASCADE.
  ledgerId: bigint('ledger_id', { mode: 'number' }).notNull(),
  reconciledDate: date('reconciled_date'),
  bankDate: date('bank_date'),
  bankReference: text('bank_reference'),
  reconciledAt: timestamp('reconciled_at', { withTimezone: true })
    .notNull()
    .default(sql`now()`),
});

// Mirrors server/banking/banking.js CREATE TABLE bank_statement_imports.
const bankStatementImports = pgTable('bank_statement_imports', {
  importId: bigint('import_id', { mode: 'number' }).primaryKey().generatedByDefaultAsIdentity(),
  // FK -> companies(company_id) ON DELETE CASCADE.
  companyId: bigint('company_id', { mode: 'number' }).notNull(),
  // FK -> ledgers(ledger_id) ON DELETE CASCADE — the bank ledger of the statement.
  ledgerId: bigint('ledger_id', { mode: 'number' }).notNull(),
  fileName: text('file_name'),
  accountNumber: text('account_number'),
  statementFrom: date('statement_from'),
  statementTo: date('statement_to'),
  totalRows: integer('total_rows').default(0),
  // Soft delete: imports with posted vouchers are hidden, not removed, so their
  // lines keep feeding duplicate detection (line_hash) on re-imports.
  isDeleted: integer('is_deleted').default(0),
  importedAt: timestamp('imported_at', { withTimezone: true })
    .notNull()
    .default(sql`now()`),
});

// Mirrors server/banking/banking.js CREATE TABLE bank_statement_lines.
const bankStatementLines = pgTable('bank_statement_lines', {
  lineId: bigint('line_id', { mode: 'number' }).primaryKey().generatedByDefaultAsIdentity(),
  // FK -> bank_statement_imports(import_id) ON DELETE CASCADE.
  importId: bigint('import_id', { mode: 'number' }).notNull(),
  companyId: bigint('company_id', { mode: 'number' }).notNull(),
  ledgerId: bigint('ledger_id', { mode: 'number' }).notNull(),
  txnDate: date('txn_date').notNull(),
  narration: text('narration'),
  refNo: text('ref_no'),
  withdrawal: numeric('withdrawal', { precision: 18, scale: 2 }).default('0'),
  deposit: numeric('deposit', { precision: 18, scale: 2 }).default('0'),
  balance: numeric('balance', { precision: 18, scale: 2 }),
  voucherType: text('voucher_type'),
  contraLedgerId: bigint('contra_ledger_id', { mode: 'number' }),
  matchSource: text('match_source'),
  status: text('status').default('pending'),
  voucherId: bigint('voucher_id', { mode: 'number' }),
  lineHash: text('line_hash'),
});

// Mirrors server/banking/banking.js CREATE TABLE bank_statement_rules.
const bankStatementRules = pgTable('bank_statement_rules', {
  ruleId: bigint('rule_id', { mode: 'number' }).primaryKey().generatedByDefaultAsIdentity(),
  companyId: bigint('company_id', { mode: 'number' }).notNull(),
  matchText: text('match_text').notNull(),
  ledgerId: bigint('ledger_id', { mode: 'number' }).notNull(),
  voucherType: text('voucher_type'),
  hits: integer('hits').default(1),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .default(sql`now()`),
});

module.exports = { reconciliations, bankStatementImports, bankStatementLines, bankStatementRules };
