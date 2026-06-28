const { sqliteTable, text, integer } = require('drizzle-orm/sqlite-core');
const { sql } = require('drizzle-orm');

const godowns = sqliteTable('godowns', {
  godownId: integer('godown_id').primaryKey({ autoIncrement: true }),
  companyId: integer('company_id').notNull(),
  name: text('name').notNull(),
  alias: text('alias'),
  parentGodownId: integer('parent_godown_id').references(() => godowns.godownId),
  address: text('address'),
  city: text('city'),
  state: text('state'),
  pincode: text('pincode'),
  exciseTaxUnit: text('excise_tax_unit').default('Not Applicable'),
  isPrimary: integer('is_primary').default(0),
  isMainLocation: integer('is_main_location').default(0),
  allowStorageOfMaterials: integer('allow_storage_of_materials').default(1),
  isActive: integer('is_active').default(1),
  isPredefined: integer('is_predefined').default(0),
  createdAt: text('created_at').default(sql`(datetime('now'))`),
  updatedAt: text('updated_at').default(sql`(datetime('now'))`),
});

module.exports = { godowns };
