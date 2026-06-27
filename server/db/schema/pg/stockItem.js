const { pgTable, bigint, text, numeric, boolean, date, timestamp } = require('drizzle-orm/pg-core');
const { sql } = require('drizzle-orm');

// stock_items
const stockItems = pgTable('stock_items', {
  itemId: bigint('item_id', { mode: 'number' })
    .primaryKey()
    .generatedByDefaultAsIdentity(),

  companyId: bigint('company_id', { mode: 'number' }).notNull(),

  name: text('name').notNull(),
  alias: text('alias'),

  groupId: bigint('group_id', { mode: 'number' }),
  categoryId: bigint('category_id', { mode: 'number' }),
  unitId: bigint('unit_id', { mode: 'number' }),

  // GST Applicability
  gstApplicable: text('gst_applicable').notNull().default('Not Applicable'),

  // HSN/SAC & related details
  hsnSac: text('hsn_sac'),
  sourceOfDetails: text('source_of_details').notNull().default('As per Company/Stock Group'),
  hsnSacDescription: text('hsn_sac_description'),

  // legacy split columns kept for backward compat
  hsnCode: text('hsn_code'),
  sacCode: text('sac_code'),

  // GST rate & related details
  gstRateDetails: text('gst_rate_details'),
  sourceOfGstRate: text('source_of_gst_rate').notNull().default('As per Company/Stock Group'),
  taxabilityType: text('taxability_type'),
  gstRate: numeric('gst_rate', { precision: 18, scale: 4 }).notNull().default('0'),
  cgstRate: numeric('cgst_rate', { precision: 18, scale: 4 }).notNull().default('0'),
  sgstRate: numeric('sgst_rate', { precision: 18, scale: 4 }).notNull().default('0'),
  igstRate: numeric('igst_rate', { precision: 18, scale: 4 }).notNull().default('0'),

  typeOfSupply: text('type_of_supply').notNull().default('Goods'),

  rateOfDuty: numeric('rate_of_duty', { precision: 18, scale: 4 }).notNull().default('0'),
  statutoryDetails: text('statutory_details'),

  openingQuantity: numeric('opening_quantity', { precision: 18, scale: 4 }).notNull().default('0'),
  openingRate: numeric('opening_rate', { precision: 18, scale: 2 }).notNull().default('0'),
  openingValue: numeric('opening_value', { precision: 18, scale: 2 }).notNull().default('0'),

  reorderLevel: numeric('reorder_level', { precision: 18, scale: 4 }).notNull().default('0'),
  reorderQuantity: numeric('reorder_quantity', { precision: 18, scale: 4 }).notNull().default('0'),

  trackBatches: boolean('track_batches').notNull().default(false),
  trackExpiry: boolean('track_expiry').notNull().default(false),
  trackDateOfManufacturing: boolean('track_date_of_manufacturing').notNull().default(false),
  enableCostTracking: boolean('enable_cost_tracking').notNull().default(false),

  hasBom: boolean('has_bom').notNull().default(false),
  bomName: text('bom_name'),

  exciseApplicable: text('excise_applicable').notNull().default('Not Applicable'),
  exciseDetails: text('excise_details'),
  exciseTariffName: text('excise_tariff_name'),
  exciseTariffHsnCode: text('excise_tariff_hsn_code'),
  exciseTariffUom: text('excise_tariff_uom').notNull().default('Undefined'),
  exciseTariffValuationType: text('excise_tariff_valuation_type').notNull().default('Undefined'),
  exciseTariffRate: numeric('excise_tariff_rate', { precision: 18, scale: 4 }).notNull().default('0'),
  exciseTariffRatePerUnit: numeric('excise_tariff_rate_per_unit', { precision: 18, scale: 2 }).notNull().default('0'),

  vatApplicable: text('vat_applicable').notNull().default('Applicable'),
  vatDetails: text('vat_details'),

  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().default(sql`now()`),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().default(sql`now()`),
});

// stock_item_opening_allocations
const stockItemOpeningAllocations = pgTable('stock_item_opening_allocations', {
  allocationId: bigint('allocation_id', { mode: 'number' })
    .primaryKey()
    .generatedByDefaultAsIdentity(),
  itemId: bigint('item_id', { mode: 'number' })
    .notNull()
    .references(() => stockItems.itemId, { onDelete: 'cascade' }),
  godownId: bigint('godown_id', { mode: 'number' }),
  batchNumber: text('batch_number'),
  mfgDate: date('mfg_date'),
  expiryDate: date('expiry_date'),
  quantity: numeric('quantity', { precision: 18, scale: 4 }).notNull().default('0'),
  rate: numeric('rate', { precision: 18, scale: 2 }).notNull().default('0'),
  amount: numeric('amount', { precision: 18, scale: 2 }).notNull().default('0'),
});

// bom_components — Bill of Materials lines for a manufactured stock item.
const bomComponents = pgTable('bom_components', {
  bomId: bigint('bom_id', { mode: 'number' })
    .primaryKey()
    .generatedByDefaultAsIdentity(),
  companyId: bigint('company_id', { mode: 'number' }).notNull(),
  itemId: bigint('item_id', { mode: 'number' })
    .notNull()
    .references(() => stockItems.itemId, { onDelete: 'cascade' }),
  bomName: text('bom_name'),
  componentItemId: bigint('component_item_id', { mode: 'number' }).notNull(),
  godownId: bigint('godown_id', { mode: 'number' }),
  quantity: numeric('quantity', { precision: 18, scale: 4 }).notNull().default('0'),
  unitId: bigint('unit_id', { mode: 'number' }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().default(sql`now()`),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().default(sql`now()`),
});

module.exports = {
  stockItems,
  stockItemOpeningAllocations,
  bomComponents,
};
