const { sql } = require('drizzle-orm');
const { sqliteTable, integer, text, real } = require('drizzle-orm/sqlite-core');

const priceLists = sqliteTable('price_lists', {
  priceListId: integer('price_list_id').primaryKey({ autoIncrement: true }),
  companyId: integer('company_id').notNull(),
  stockGroup: text('stock_group').notNull().default('All Items'),
  priceLevel: text('price_level').notNull(),
  applicableFrom: text('applicable_from').notNull(),
  isActive: integer('is_active').default(1),
  createdAt: text('created_at').default(sql`(datetime('now'))`),
  updatedAt: text('updated_at').default(sql`(datetime('now'))`),
});

const priceListLines = sqliteTable('price_list_lines', {
  lineId: integer('line_id').primaryKey({ autoIncrement: true }),
  priceListId: integer('price_list_id')
    .notNull()
    .references(() => priceLists.priceListId, { onDelete: 'cascade' }),
  itemId: integer('item_id'),
  particulars: text('particulars').notNull(),
  qtyFrom: real('qty_from').default(0),
  qtyLessThan: real('qty_less_than').default(0),
  rate: real('rate').default(0),
  discPercent: real('disc_percent').default(0),
  sortOrder: integer('sort_order').default(0),
  createdAt: text('created_at').default(sql`(datetime('now'))`),
  updatedAt: text('updated_at').default(sql`(datetime('now'))`),
});

module.exports = { priceLists, priceListLines };
