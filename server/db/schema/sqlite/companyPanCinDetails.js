const { sqliteTable, integer, text } = require('drizzle-orm/sqlite-core');
const { sql } = require('drizzle-orm');
const { companies } = require('./company');

// Source of truth: server/companyPanCinDetails/companyPanCinDetails.js
// CREATE TABLE company_pan_cin_details (
//   company_id INTEGER PRIMARY KEY REFERENCES companies(company_id) ON DELETE CASCADE,
//   pan        TEXT,
//   cin        TEXT,
//   created_at TEXT DEFAULT (datetime('now')),
//   updated_at TEXT DEFAULT (datetime('now'))
// )
const companyPanCinDetails = sqliteTable('company_pan_cin_details', {
  companyId: integer('company_id')
    .primaryKey()
    .references(() => companies.companyId, { onDelete: 'cascade' }),
  pan: text('pan'),
  cin: text('cin'),
  createdAt: text('created_at').default(sql`(datetime('now'))`),
  updatedAt: text('updated_at').default(sql`(datetime('now'))`),
});

module.exports = { companyPanCinDetails };
