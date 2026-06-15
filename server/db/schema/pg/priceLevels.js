const { pgTable, bigint, integer, text, boolean, timestamp, unique } = require('drizzle-orm/pg-core');
const { companies } = require('./company');

// Mirrors docs/db/modules/priceLevels.sql (pg DDL contract).
// 0/1 flag -> BOOLEAN, ISO datetime TEXT -> TIMESTAMPTZ, INTEGER PK -> IDENTITY.
const priceLevels = pgTable(
  'price_levels',
  {
    priceLevelId: bigint('price_level_id', { mode: 'number' })
      .primaryKey()
      .generatedByDefaultAsIdentity(),
    companyId: bigint('company_id', { mode: 'number' })
      .notNull()
      .references(() => companies.companyId, { onDelete: 'cascade' }),
    levelIndex: integer('level_index').notNull(),
    name: text('name').notNull().default(''),
    isActive: boolean('is_active').default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  },
  (table) => ({
    // UNIQUE (company_id, level_index)
    companyLevelUnique: unique('uq_price_levels_company_level').on(table.companyId, table.levelIndex),
  })
);

module.exports = { priceLevels };
