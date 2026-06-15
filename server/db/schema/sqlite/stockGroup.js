const { sqliteTable, integer, text, real } = require('drizzle-orm/sqlite-core');
const { sql } = require('drizzle-orm');

const stockGroups = sqliteTable('stock_groups', {
  sgId: integer('sg_id').primaryKey({ autoIncrement: true }),
  companyId: integer('company_id').notNull(),
  name: text('name').notNull(),
  alias: text('alias'),
  parentGroupId: integer('parent_group_id').references(() => stockGroups.sgId),
  shouldQuantitiesBeAdded: integer('should_quantities_be_added').default(0),
  hsnSacCode: text('hsn_sac_code'),
  hsnSacDescription: text('hsn_sac_description'),
  gstRate: real('gst_rate').default(0),
  cgstRate: real('cgst_rate').default(0),
  sgstRate: real('sgst_rate').default(0),
  taxabilityType: text('taxability_type').default(sql`NULL`),
  statutoryDetails: text('statutory_details'),
  isPrimary: integer('is_primary').default(0),
  isActive: integer('is_active').default(1),
  isPredefined: integer('is_predefined').default(0),
  createdAt: text('created_at').default(sql`(datetime('now'))`),
  updatedAt: text('updated_at').default(sql`(datetime('now'))`),
});

module.exports = { stockGroups };
