const { sql } = require('drizzle-orm');
const {
  pgTable,
  bigint,
  text,
  date,
  boolean,
  timestamp,
  numeric,
  integer,
} = require('drizzle-orm/pg-core');

const priceLists = pgTable('price_lists', {
  priceListId: bigint('price_list_id', { mode: 'number' })
    .primaryKey()
    .generatedByDefaultAsIdentity(),
  companyId: bigint('company_id', { mode: 'number' }).notNull(),
  stockGroup: text('stock_group').notNull().default('All Items'),
  priceLevel: text('price_level').notNull(),
  applicableFrom: date('applicable_from').notNull(),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

const priceListLines = pgTable('price_list_lines', {
  lineId: bigint('line_id', { mode: 'number' })
    .primaryKey()
    .generatedByDefaultAsIdentity(),
  priceListId: bigint('price_list_id', { mode: 'number' })
    .notNull()
    .references(() => priceLists.priceListId, { onDelete: 'cascade' }),
  itemId: bigint('item_id', { mode: 'number' }),
  particulars: text('particulars').notNull(),
  qtyFrom: numeric('qty_from', { precision: 18, scale: 4 }).notNull().default('0'),
  qtyLessThan: numeric('qty_less_than', { precision: 18, scale: 4 }).notNull().default('0'),
  rate: numeric('rate', { precision: 18, scale: 4 }).notNull().default('0'),
  discPercent: numeric('disc_percent', { precision: 18, scale: 4 }).notNull().default('0'),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

module.exports = { priceLists, priceListLines };
