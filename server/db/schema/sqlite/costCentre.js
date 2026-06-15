const { sqliteTable, text, integer } = require('drizzle-orm/sqlite-core');
const { sql } = require('drizzle-orm');

// Mirrors server/costCentre/costCentre.js CREATE TABLE cost_centres (SQLite ground truth).
// Raw SQLite types preserved: is_active / is_predefined are INTEGER 0/1 flags,
// created_at / updated_at are TEXT ISO datetime strings.
const costCentres = sqliteTable('cost_centres', {
  ccId: integer('cc_id').primaryKey({ autoIncrement: true }),
  companyId: integer('company_id').notNull(),
  name: text('name').notNull(),
  alias: text('alias'),
  parentId: integer('parent_id'),
  category: text('category').default('Primary'),
  isActive: integer('is_active').default(1),
  isPredefined: integer('is_predefined').default(0),
  createdAt: text('created_at').default(sql`(datetime('now'))`),
  updatedAt: text('updated_at').default(sql`(datetime('now'))`),
});

module.exports = { costCentres };
