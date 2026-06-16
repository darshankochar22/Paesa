const { pgTable, bigint, text, numeric, boolean, jsonb, timestamp } = require('drizzle-orm/pg-core');
const { sql } = require('drizzle-orm');

// Mirrors docs/db/modules/voucherEntryActions.sql (PostgreSQL contract).
// FKs (company_id, voucher_id, autofill_ledger_id) reference tables owned by
// other modules (companies, vouchers, ledgers); enforced at the DDL layer,
// kept as plain columns here to avoid cross-module require cycles.
const voucherEntryActions = pgTable('voucher_entry_actions', {
  actionId: bigint('action_id', { mode: 'number' })
    .primaryKey()
    .generatedByDefaultAsIdentity(),
  // FK -> companies(company_id) ON DELETE CASCADE.
  companyId: bigint('company_id', { mode: 'number' }).notNull(),
  // FK -> vouchers(voucher_id) ON DELETE CASCADE.
  voucherId: bigint('voucher_id', { mode: 'number' }),
  actionType: text('action_type').notNull(),
  // JSON-serialized TEXT in SQLite -> JSONB.
  actionData: jsonb('action_data'),
  // FK -> ledgers(ledger_id).
  autofillLedgerId: bigint('autofill_ledger_id', { mode: 'number' }),
  // MONEY: SQLite REAL -> NUMERIC(18,2). Never floating point.
  autofillAmount: numeric('autofill_amount', { precision: 18, scale: 2 }),
  autofillNarration: text('autofill_narration'),
  previousMode: text('previous_mode'),
  newMode: text('new_mode'),
  // JSON-serialized TEXT in SQLite -> JSONB.
  additionalDetails: jsonb('additional_details'),
  relatedReportType: text('related_report_type'),
  // Polymorphic reference qualified by related_report_type; no single FK target.
  relatedReportId: bigint('related_report_id', { mode: 'number' }),
  // SQLite INTEGER DEFAULT 0 (0=false, 1=true) -> BOOLEAN.
  isOptional: boolean('is_optional').notNull().default(false),
  optionalReason: text('optional_reason'),
  performedBy: text('performed_by'),
  // SQLite TEXT DEFAULT datetime('now') (ISO strings) -> TIMESTAMPTZ.
  performedAt: timestamp('performed_at', { withTimezone: true })
    .notNull()
    .default(sql`now()`),
  // SQLite TEXT DEFAULT datetime('now') (ISO strings) -> TIMESTAMPTZ.
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .default(sql`now()`),
});

module.exports = { voucherEntryActions };
