const { pgTable, bigint, text, timestamp } = require('drizzle-orm/pg-core');
const { sql } = require('drizzle-orm');

// PostgreSQL contract for the audit_trail table. Column NAMES mirror
// server/db/schema/sqlite/auditTrail.js (parity check asserts identical names;
// types differ by design). Tamper-evident hash chain per company_id.
const auditTrail = pgTable('audit_trail', {
  logId: bigint('log_id', { mode: 'number' })
    .primaryKey()
    .generatedByDefaultAsIdentity(),
  companyId: bigint('company_id', { mode: 'number' }).notNull(),
  entityType: text('entity_type').notNull(),
  entityId: bigint('entity_id', { mode: 'number' }),
  action: text('action').notNull(),
  user: text('user').default('system'),
  beforeSnapshot: text('before_snapshot'),
  afterSnapshot: text('after_snapshot'),
  prevHash: text('prev_hash'),
  rowHash: text('row_hash'),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .default(sql`now()`),
});

module.exports = { auditTrail };
