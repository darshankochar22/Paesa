const { sqliteTable, integer, text, real } = require('drizzle-orm/sqlite-core');
const { sql } = require('drizzle-orm');

// Mirrors server/voucherEntryActions/voucherEntryActions.js CREATE TABLE
// voucher_entry_actions (SQLite ground truth).
const voucherEntryActions = sqliteTable('voucher_entry_actions', {
  actionId: integer('action_id').primaryKey({ autoIncrement: true }),
  // FK -> companies(company_id) ON DELETE CASCADE (owned by company module).
  companyId: integer('company_id').notNull(),
  // FK -> vouchers(voucher_id) ON DELETE CASCADE (owned by vouchers module).
  voucherId: integer('voucher_id'),
  actionType: text('action_type').notNull(),
  // JSON-serialized payload (service JSON.stringify on write, JSON.parse on read); keep raw TEXT.
  actionData: text('action_data'),
  // FK -> ledgers(ledger_id) (owned by ledgers module).
  autofillLedgerId: integer('autofill_ledger_id'),
  // SQLite REAL; service stores the raw number. Keep raw real to preserve behavior.
  autofillAmount: real('autofill_amount'),
  autofillNarration: text('autofill_narration'),
  previousMode: text('previous_mode'),
  newMode: text('new_mode'),
  // JSON-serialized payload (service JSON.stringify on write, JSON.parse on read); keep raw TEXT.
  additionalDetails: text('additional_details'),
  relatedReportType: text('related_report_type'),
  // Polymorphic reference qualified by related_report_type; no single FK target.
  relatedReportId: integer('related_report_id'),
  // SQLite INTEGER DEFAULT 0; service writes 1/0 directly. Keep raw integer.
  isOptional: integer('is_optional').default(0),
  optionalReason: text('optional_reason'),
  performedBy: text('performed_by'),
  // SQLite: TEXT DEFAULT (datetime('now')) storing ISO strings; keep raw TEXT.
  performedAt: text('performed_at').default(sql`(datetime('now'))`),
  // SQLite: TEXT DEFAULT (datetime('now')) storing ISO strings; keep raw TEXT.
  createdAt: text('created_at').default(sql`(datetime('now'))`),
});

module.exports = { voucherEntryActions };
