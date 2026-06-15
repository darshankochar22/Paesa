const { sqliteTable, integer, text } = require('drizzle-orm/sqlite-core');
const { sql } = require('drizzle-orm');

// SQLite stores created_at/updated_at as TEXT DEFAULT (datetime('now')).
const datetimeNow = sql`(datetime('now'))`;

// tax_units
// Boolean-ish flags (set_alter_*, is_active) are stored/read as raw 0/1 INTEGER
// by the service layer (e.g. `... ? 1 : 0`, `is_active = 1`) -> keep raw integer.
const taxUnits = sqliteTable('tax_units', {
  taxUnitId: integer('tax_unit_id').primaryKey({ autoIncrement: true }),
  companyId: integer('company_id').notNull(),
  name: text('name').notNull(),
  alias: text('alias'),
  addressLine1: text('address_line1'),
  addressLine2: text('address_line2'),
  addressLine3: text('address_line3'),
  addressLine4: text('address_line4'),
  state: text('state'),
  pincode: text('pincode'),
  telephone: text('telephone'),
  registeredFor: text('registered_for').default('Excise'),
  setAlterExciseDetails: integer('set_alter_excise_details').default(0),
  registrationType: text('registration_type').default('Importer'),
  eccNumber: text('ecc_number'),
  setAlterExciseTariff: integer('set_alter_excise_tariff').default(0),
  setAlterRule11Book: integer('set_alter_rule11_book').default(0),
  sortOrder: integer('sort_order').default(0),
  isActive: integer('is_active').default(1),
  createdAt: text('created_at').default(datetimeNow),
  updatedAt: text('updated_at').default(datetimeNow),
});

module.exports = {
  taxUnits,
};
