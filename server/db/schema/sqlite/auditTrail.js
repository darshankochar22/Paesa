const { sqliteTable, integer, text } = require('drizzle-orm/sqlite-core');
const { sql } = require('drizzle-orm');

// Mirrors server/auditTrail/auditTrail.js CREATE TABLE audit_trail (SQLite ground truth).
// Tamper-evident hash chain per company_id (MCA Rule 11(g)).
const auditTrail = sqliteTable('audit_trail', {
  logId: integer('log_id').primaryKey({ autoIncrement: true }),
  companyId: integer('company_id').notNull(),
  // 'voucher' | 'ledger' | 'group' (free TEXT; not constrained at DDL).
  entityType: text('entity_type').notNull(),
  entityId: integer('entity_id'),
  // 'create' | 'update' | 'delete' | 'cancel'.
  action: text('action').notNull(),
  // App has no auth yet — defaults to 'system'.
  user: text('user').default('system'),
  // JSON; null on create.
  beforeSnapshot: text('before_snapshot'),
  // JSON; null on delete.
  afterSnapshot: text('after_snapshot'),
  prevHash: text('prev_hash'),
  rowHash: text('row_hash'),
  // SQLite: TEXT DEFAULT (datetime('now')) storing ISO strings; keep raw TEXT.
  createdAt: text('created_at').default(sql`(datetime('now'))`),
});

module.exports = { auditTrail };
