const { pgTable, bigint, text, boolean, timestamp } = require('drizzle-orm/pg-core');
const { sql } = require('drizzle-orm');

const godowns = pgTable('godowns', {
  godownId: bigint('godown_id', { mode: 'number' }).primaryKey().generatedByDefaultAsIdentity(),
  companyId: bigint('company_id', { mode: 'number' }).notNull(),
  name: text('name').notNull(),
  alias: text('alias'),
  parentGodownId: bigint('parent_godown_id', { mode: 'number' }).references(() => godowns.godownId),
  address: text('address'),
  city: text('city'),
  state: text('state'),
  pincode: text('pincode'),
  isPrimary: boolean('is_primary').notNull().default(false),
  isMainLocation: boolean('is_main_location').notNull().default(false),
  allowStorageOfMaterials: boolean('allow_storage_of_materials').notNull().default(true),
  isActive: boolean('is_active').notNull().default(true),
  isPredefined: boolean('is_predefined').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

module.exports = { godowns };
