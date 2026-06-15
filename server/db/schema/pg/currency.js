const { pgTable, bigint, text, integer, boolean, timestamp } = require('drizzle-orm/pg-core');
const { sql } = require('drizzle-orm');

const currencies = pgTable('currencies', {
  currencyId: bigint('currency_id', { mode: 'number' }).primaryKey().generatedByDefaultAsIdentity(),
  companyId: bigint('company_id', { mode: 'number' }).notNull(),
  name: text('name').notNull(),
  formalName: text('formal_name'),
  isoCode: text('iso_code').notNull(),
  symbol: text('symbol'),
  decimalPlaces: integer('decimal_places').notNull().default(2),
  decimalSymbol: text('decimal_symbol').notNull().default('.'),
  decimalPlacesInWords: text('decimal_places_in_words'),
  suffixSymbolToAmount: boolean('suffix_symbol_to_amount').notNull().default(false),
  showAmountInMillions: boolean('show_amount_in_millions').notNull().default(false),
  wordRepresentingAmountAfterDecimal: text('word_representing_amount_after_decimal'),
  addSpaceBetweenAmountAndSymbol: boolean('add_space_between_amount_and_symbol').notNull().default(false),
  isActive: boolean('is_active').notNull().default(true),
  isDefault: boolean('is_default').notNull().default(false),
  isPredefined: boolean('is_predefined').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

module.exports = { currencies };
