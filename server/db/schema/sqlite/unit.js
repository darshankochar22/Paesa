const { sqliteTable, integer, text, real } = require('drizzle-orm/sqlite-core');
const { sql } = require('drizzle-orm');

// units — mirrors server/unit/unit.js CREATE TABLE (ground truth).
// Raw SQLite types preserved: 0/1 INTEGER flags kept as integer, conversion_factor REAL,
// created_at/updated_at TEXT DEFAULT (datetime('now')).
const units = sqliteTable('units', {
  unitId: integer('unit_id').primaryKey({ autoIncrement: true }),
  // FK -> companies(company_id) ON DELETE CASCADE
  companyId: integer('company_id').notNull(),
  name: text('name').notNull(),
  symbol: text('symbol').notNull(),
  formalName: text('formal_name'),
  decimalPlaces: integer('decimal_places').default(0),
  unitQuantityCode: text('unit_quantity_code'),
  uqcEffectiveDate: text('uqc_effective_date'),
  unitType: text('unit_type').default('Simple'),
  isSimple: integer('is_simple').default(1),
  isActive: integer('is_active').default(1),
  isPredefined: integer('is_predefined').default(0),
  // self-referential FK to units(unit_id)
  firstUnitId: integer('first_unit_id').references(() => units.unitId),
  secondUnitId: integer('second_unit_id').references(() => units.unitId),
  conversionFactor: real('conversion_factor').default(1),
  createdAt: text('created_at').default(sql`(datetime('now'))`),
  updatedAt: text('updated_at').default(sql`(datetime('now'))`),
});

module.exports = { units };
