const { sqliteTable, integer, text } = require('drizzle-orm/sqlite-core');
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

module.exports = { reconciliations };
