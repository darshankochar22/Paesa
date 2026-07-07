const { pgTable, bigint, text, integer, numeric, boolean, timestamp } = require('drizzle-orm/pg-core');

// units — mirrors docs/db/modules/unit.sql (pg DDL contract).
// INTEGER PK -> IDENTITY, 0/1 flags -> BOOLEAN, conversion_factor -> NUMERIC(18,4),
// created_at/updated_at -> TIMESTAMPTZ DEFAULT now().
const units = pgTable('units', {
  unitId: bigint('unit_id', { mode: 'number' }).primaryKey().generatedByDefaultAsIdentity(),
  // FK -> companies.company_id ON DELETE CASCADE (companies in another module; not referenced here)
  companyId: bigint('company_id', { mode: 'number' }).notNull(),
  name: text('name').notNull(),
  symbol: text('symbol').notNull(),
  formalName: text('formal_name'),
  decimalPlaces: integer('decimal_places').notNull().default(0),
  unitQuantityCode: text('unit_quantity_code'),
  uqcEffectiveDate: text('uqc_effective_date'),
  unitType: text('unit_type').notNull().default('Simple'),
  isSimple: boolean('is_simple').notNull().default(true),
  isActive: boolean('is_active').notNull().default(true),
  isPredefined: boolean('is_predefined').notNull().default(false),
  // self-referential FK to units(unit_id)
  firstUnitId: bigint('first_unit_id', { mode: 'number' }).references(() => units.unitId),
  secondUnitId: bigint('second_unit_id', { mode: 'number' }).references(() => units.unitId),
  conversionFactor: numeric('conversion_factor', { precision: 18, scale: 4 }).default('1'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

module.exports = { units };
