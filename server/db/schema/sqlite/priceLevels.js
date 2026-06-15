const { sqliteTable, integer, text, unique } = require('drizzle-orm/sqlite-core');
const { sql } = require('drizzle-orm');
const { companies } = require('./company');

// Mirrors server/priceLevels/priceLevel.js CREATE TABLE price_levels (SQLite ground truth).
// Raw SQLite types preserved: is_active is an INTEGER 0/1 flag (default 1),
// created_at / updated_at are TEXT ISO datetime strings (default datetime('now')).
const priceLevels = sqliteTable(
  'price_levels',
  {
    priceLevelId: integer('price_level_id').primaryKey({ autoIncrement: true }),
    companyId: integer('company_id')
      .notNull()
      .references(() => companies.companyId, { onDelete: 'cascade' }),
    levelIndex: integer('level_index').notNull(),
    name: text('name').notNull().default(''),
    isActive: integer('is_active').default(1),
    createdAt: text('created_at').default(sql`(datetime('now'))`),
    updatedAt: text('updated_at').default(sql`(datetime('now'))`),
  },
  (table) => ({
    // UNIQUE (company_id, level_index)
    companyLevelUnique: unique().on(table.companyId, table.levelIndex),
  })
);

module.exports = { priceLevels };
