const { pgTable, bigint, text, boolean, timestamp } = require('drizzle-orm/pg-core');
// Mirrors docs/db/modules/costCentre.sql (pg DDL contract).
// 0/1 flags -> BOOLEAN, ISO datetime TEXT -> TIMESTAMPTZ, INTEGER PK -> IDENTITY.
const costCentres = pgTable('cost_centres', {
  ccId: bigint('cc_id', { mode: 'number' }).primaryKey().generatedByDefaultAsIdentity(),
  companyId: bigint('company_id', { mode: 'number' }).notNull(),
  name: text('name').notNull(),
  alias: text('alias'),
  // self-referential FK to cost_centres(cc_id)
  parentId: bigint('parent_id', { mode: 'number' }).references(() => costCentres.ccId),
  category: text('category').notNull().default('Primary'),
  isActive: boolean('is_active').notNull().default(true),
  isPredefined: boolean('is_predefined').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

module.exports = { costCentres };
