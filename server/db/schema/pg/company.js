const { pgTable, bigint, text, timestamp } = require('drizzle-orm/pg-core');
const { sql } = require('drizzle-orm');

// Mirrors docs/db/modules/company.sql (PostgreSQL contract).
// Root/tenant table: no outgoing foreign keys.
const companies = pgTable('companies', {
  companyId: bigint('company_id', { mode: 'number' })
    .primaryKey()
    .generatedByDefaultAsIdentity(),
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
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .default(sql`now()`),
});

module.exports = { companies };
