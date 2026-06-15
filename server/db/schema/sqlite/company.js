const { sqliteTable, integer, text } = require('drizzle-orm/sqlite-core');
const { sql } = require('drizzle-orm');

// Mirrors server/company/company.js CREATE TABLE companies (SQLite ground truth).
const companies = sqliteTable('companies', {
  companyId: integer('company_id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  mailingName: text('mailing_name'),
  address1: text('address1'),
  address2: text('address2'),
  state: text('state'),
  country: text('country'),
  pincode: text('pincode'),
  telephone: text('telephone'),
  mobile: text('mobile'),
  fax: text('fax'),
  email: text('email'),
  website: text('website'),
  baseCurrencySymbol: text('base_currency_symbol'),
  formalName: text('formal_name'),
  financialYearBeginningFrom: text('financial_year_beginning_from'),
  booksBeginningFrom: text('books_beginning_from'),
  password: text('password'),
  accessControl: text('access_control'),
  editLog: text('edit_log'),
  // SQLite: TEXT DEFAULT (datetime('now')) storing ISO strings; keep raw TEXT.
  createdAt: text('created_at').default(sql`(datetime('now'))`),
});

module.exports = { companies };
