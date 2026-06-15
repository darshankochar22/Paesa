const { pgTable, bigint, text, date, timestamp, numeric, integer, boolean } = require('drizzle-orm/pg-core');
const { sql } = require('drizzle-orm');

// physical_stock_entries
const physicalStockEntries = pgTable('physical_stock_entries', {
  physicalStockEntryId: bigint('physical_stock_entry_id', { mode: 'number' })
    .primaryKey()
    .generatedByDefaultAsIdentity(),
  companyId: bigint('company_id', { mode: 'number' }).notNull(),
  voucherNo: text('voucher_no'),
  voucherDate: date('voucher_date').notNull(),
  referenceNo: text('reference_no'),
  narration: text('narration'),
  isOptional: boolean('is_optional').notNull().default(false),
  isPostDated: boolean('is_post_dated').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().default(sql`now()`),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().default(sql`now()`),
});

// physical_stock_entry_lines
const physicalStockEntryLines = pgTable('physical_stock_entry_lines', {
  lineId: bigint('line_id', { mode: 'number' })
    .primaryKey()
    .generatedByDefaultAsIdentity(),
  physicalStockEntryId: bigint('physical_stock_entry_id', { mode: 'number' })
    .notNull()
    .references(() => physicalStockEntries.physicalStockEntryId, { onDelete: 'cascade' }),
  stockItemId: bigint('stock_item_id', { mode: 'number' }),
  godownId: bigint('godown_id', { mode: 'number' }),
  batchNo: text('batch_no'),
  lotNo: text('lot_no'),
  manufacturingDate: date('manufacturing_date'),
  expiryDate: date('expiry_date'),
  quantity: numeric('quantity', { precision: 18, scale: 4 }).notNull().default('0'),
  rate: numeric('rate', { precision: 18, scale: 4 }).notNull().default('0'),
  amount: numeric('amount', { precision: 18, scale: 2 }).notNull().default('0'),
  lineOrder: integer('line_order').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().default(sql`now()`),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().default(sql`now()`),
});

module.exports = {
  physicalStockEntries,
  physicalStockEntryLines,
};
