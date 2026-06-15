const { sqliteTable, integer, text, real } = require('drizzle-orm/sqlite-core');
const { sql } = require('drizzle-orm');

// SQLite stores created_at/updated_at as TEXT DEFAULT (datetime('now')).
const datetimeNow = sql`(datetime('now'))`;

// physical_stock_entries
const physicalStockEntries = sqliteTable('physical_stock_entries', {
  physicalStockEntryId: integer('physical_stock_entry_id').primaryKey({ autoIncrement: true }),
  companyId: integer('company_id').notNull(),
  voucherNo: text('voucher_no'),
  voucherDate: text('voucher_date').notNull(),
  referenceNo: text('reference_no'),
  narration: text('narration'),
  isOptional: integer('is_optional').default(0),
  isPostDated: integer('is_post_dated').default(0),
  createdAt: text('created_at').default(datetimeNow),
  updatedAt: text('updated_at').default(datetimeNow),
});

// physical_stock_entry_lines
const physicalStockEntryLines = sqliteTable('physical_stock_entry_lines', {
  lineId: integer('line_id').primaryKey({ autoIncrement: true }),
  physicalStockEntryId: integer('physical_stock_entry_id').notNull(),
  stockItemId: integer('stock_item_id'),
  godownId: integer('godown_id'),
  batchNo: text('batch_no'),
  lotNo: text('lot_no'),
  manufacturingDate: text('manufacturing_date'),
  expiryDate: text('expiry_date'),
  quantity: real('quantity').default(0),
  rate: real('rate').default(0),
  amount: real('amount').default(0),
  lineOrder: integer('line_order').default(0),
  createdAt: text('created_at').default(datetimeNow),
  updatedAt: text('updated_at').default(datetimeNow),
});

module.exports = {
  physicalStockEntries,
  physicalStockEntryLines,
};
