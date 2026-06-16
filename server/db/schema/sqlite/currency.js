const { sqliteTable, integer, text } = require('drizzle-orm/sqlite-core');
const { sql } = require('drizzle-orm');

const currencies = sqliteTable('currencies', {
  currencyId: integer('currency_id').primaryKey({ autoIncrement: true }),
  companyId: integer('company_id').notNull(),
  name: text('name').notNull(),
  formalName: text('formal_name'),
  isoCode: text('iso_code').notNull(),
  symbol: text('symbol'),
  decimalPlaces: integer('decimal_places').default(2),
  decimalSymbol: text('decimal_symbol').default('.'),
  decimalPlacesInWords: text('decimal_places_in_words'),
  suffixSymbolToAmount: integer('suffix_symbol_to_amount').default(0),
  showAmountInMillions: integer('show_amount_in_millions').default(0),
  wordRepresentingAmountAfterDecimal: text('word_representing_amount_after_decimal'),
  addSpaceBetweenAmountAndSymbol: integer('add_space_between_amount_and_symbol').default(0),
  isActive: integer('is_active').default(1),
  isDefault: integer('is_default').default(0),
  isPredefined: integer('is_predefined').default(0),
  createdAt: text('created_at').default(sql`(datetime('now'))`),
  updatedAt: text('updated_at').default(sql`(datetime('now'))`),
});

module.exports = { currencies };
