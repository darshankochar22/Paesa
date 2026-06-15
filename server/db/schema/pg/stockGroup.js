const { pgTable, bigint, text, boolean, numeric, timestamp } = require('drizzle-orm/pg-core');

const stockGroups = pgTable('stock_groups', {
  sgId: bigint('sg_id', { mode: 'number' }).primaryKey().generatedByDefaultAsIdentity(),
  companyId: bigint('company_id', { mode: 'number' }).notNull(),
  name: text('name').notNull(),
  alias: text('alias'),
  parentGroupId: bigint('parent_group_id', { mode: 'number' }).references(() => stockGroups.sgId),
  shouldQuantitiesBeAdded: boolean('should_quantities_be_added').notNull().default(false),
  hsnSacCode: text('hsn_sac_code'),
  hsnSacDescription: text('hsn_sac_description'),
  gstRate: numeric('gst_rate', { precision: 18, scale: 4 }).notNull().default('0'),
  cgstRate: numeric('cgst_rate', { precision: 18, scale: 4 }).notNull().default('0'),
  sgstRate: numeric('sgst_rate', { precision: 18, scale: 4 }).notNull().default('0'),
  taxabilityType: text('taxability_type'),
  statutoryDetails: text('statutory_details'),
  isPrimary: boolean('is_primary').notNull().default(false),
  isActive: boolean('is_active').notNull().default(true),
  isPredefined: boolean('is_predefined').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

module.exports = { stockGroups };
