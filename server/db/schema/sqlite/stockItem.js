const { sqliteTable, integer, text, real } = require('drizzle-orm/sqlite-core');
const { sql } = require('drizzle-orm');

// SQLite stores created_at/updated_at as TEXT DEFAULT (datetime('now')).
const datetimeNow = sql`(datetime('now'))`;

// stock_items
// NOTE: track_date_of_manufacturing, enable_cost_tracking, excise_*, vat_* are
// added via ALTER TABLE migrations in stockItem.js init() on older DBs; they are
// part of the effective schema and included here.
const stockItems = sqliteTable('stock_items', {
  itemId: integer('item_id').primaryKey({ autoIncrement: true }),
  companyId: integer('company_id').notNull(),

  name: text('name').notNull(),
  alias: text('alias'),

  groupId: integer('group_id'),
  categoryId: integer('category_id'),
  unitId: integer('unit_id'),

  // GST Applicability
  gstApplicable: text('gst_applicable').default('Not Applicable'),

  // HSN/SAC & related details
  hsnSac: text('hsn_sac'),
  sourceOfDetails: text('source_of_details').default('As per Company/Stock Group'),
  hsnSacDescription: text('hsn_sac_description'),

  // legacy split columns kept for backward compat
  hsnCode: text('hsn_code'),
  sacCode: text('sac_code'),

  // GST rate & related details
  gstRateDetails: text('gst_rate_details'),
  sourceOfGstRate: text('source_of_gst_rate').default('As per Company/Stock Group'),
  taxabilityType: text('taxability_type'),
  gstRate: real('gst_rate').default(0),
  cgstRate: real('cgst_rate').default(0),
  sgstRate: real('sgst_rate').default(0),
  igstRate: real('igst_rate').default(0),

  typeOfSupply: text('type_of_supply').default('Goods'),

  rateOfDuty: real('rate_of_duty').default(0),
  statutoryDetails: text('statutory_details'),

  openingQuantity: real('opening_quantity').default(0),
  openingRate: real('opening_rate').default(0),
  openingValue: real('opening_value').default(0),

  reorderLevel: real('reorder_level').default(0),
  reorderQuantity: real('reorder_quantity').default(0),

  trackBatches: integer('track_batches').default(0),
  trackExpiry: integer('track_expiry').default(0),
  trackDateOfManufacturing: integer('track_date_of_manufacturing').default(0),
  enableCostTracking: integer('enable_cost_tracking').default(0),

  hasBom: integer('has_bom').default(0),
  bomName: text('bom_name'),

  exciseApplicable: text('excise_applicable').default('Not Applicable'),
  exciseDetails: text('excise_details'),
  exciseTariffName: text('excise_tariff_name'),
  exciseTariffHsnCode: text('excise_tariff_hsn_code'),
  exciseTariffUom: text('excise_tariff_uom').default('Undefined'),
  exciseTariffValuationType: text('excise_tariff_valuation_type').default('Undefined'),
  exciseTariffRate: real('excise_tariff_rate').default(0),
  exciseTariffRatePerUnit: real('excise_tariff_rate_per_unit').default(0),

  vatApplicable: text('vat_applicable').default('Applicable'),
  vatDetails: text('vat_details'),

  isActive: integer('is_active').default(1),
  createdAt: text('created_at').default(datetimeNow),
  updatedAt: text('updated_at').default(datetimeNow),
});

// stock_item_opening_allocations
const stockItemOpeningAllocations = sqliteTable('stock_item_opening_allocations', {
  allocationId: integer('allocation_id').primaryKey({ autoIncrement: true }),
  itemId: integer('item_id')
    .notNull()
    .references(() => stockItems.itemId, { onDelete: 'cascade' }),
  godownId: integer('godown_id'),
  batchNumber: text('batch_number'),
  mfgDate: text('mfg_date'),
  expiryDate: text('expiry_date'),
  quantity: real('quantity').default(0),
  rate: real('rate').default(0),
  amount: real('amount').default(0),
});

// bom_components — Bill of Materials lines for a manufactured stock item.
// One row per component consumed to produce the parent item (item_id).
const bomComponents = sqliteTable('bom_components', {
  bomId: integer('bom_id').primaryKey({ autoIncrement: true }),
  companyId: integer('company_id').notNull(),
  itemId: integer('item_id')
    .notNull()
    .references(() => stockItems.itemId, { onDelete: 'cascade' }),
  bomName: text('bom_name'),
  componentItemId: integer('component_item_id').notNull(),
  godownId: integer('godown_id'),
  quantity: real('quantity').default(0),
  unitId: integer('unit_id'),
  createdAt: text('created_at').default(datetimeNow),
  updatedAt: text('updated_at').default(datetimeNow),
});

module.exports = {
  stockItems,
  stockItemOpeningAllocations,
  bomComponents,
};
