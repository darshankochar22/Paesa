const { pgTable, bigint, text, timestamp } = require('drizzle-orm/pg-core');
const { sql } = require('drizzle-orm');
const { companies } = require('./company');

// Source of truth: docs/db/modules/companyPanCinDetails.sql
// company_id   BIGINT      NOT NULL PRIMARY KEY (explicit, not identity)
//              FK -> companies(company_id) ON DELETE CASCADE
// pan          TEXT (nullable)
// cin          TEXT (nullable)
// created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
// updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
const companyPanCinDetails = pgTable('company_pan_cin_details', {
  companyId: bigint('company_id', { mode: 'number' })
    .primaryKey()
    .notNull()
    .references(() => companies.companyId, { onDelete: 'cascade' }),
  pan: text('pan'),
  cin: text('cin'),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .default(sql`now()`),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .default(sql`now()`),
});

module.exports = { companyPanCinDetails };
