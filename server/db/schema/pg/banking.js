const { pgTable, bigint, text, date, timestamp } = require('drizzle-orm/pg-core');
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

module.exports = { reconciliations };
