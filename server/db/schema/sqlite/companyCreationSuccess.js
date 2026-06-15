const { sqliteTable, integer, text } = require('drizzle-orm/sqlite-core');
const { sql } = require('drizzle-orm');
const { companies } = require('./company');

// Mirrors server/companyCreationSuccess/companyCreationSuccess.js CREATE TABLE
// (SQLite ground truth). The service reads/writes the 0/1 flag columns as raw
// integers (e.g. `current.created_successfully`, `VALUES (?, 1, 0, ...)`), so
// these are kept as raw INTEGER (no { mode: 'boolean' }) to preserve behavior.
// created_at / updated_at hold ISO datetime TEXT (datetime('now')); kept as raw TEXT.
const companyCreationSuccess = sqliteTable('company_creation_success', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  companyId: integer('company_id')
    .notNull()
    .references(() => companies.companyId, { onDelete: 'cascade' }),
  createdSuccessfully: integer('created_successfully').default(1),
  successScreenShown: integer('success_screen_shown').default(0),
  showMoreFeatures: integer('show_more_features').default(0),
  showAllFeatures: integer('show_all_features').default(0),
  defaultFeaturesLoaded: integer('default_features_loaded').default(1),
  featureSetupCompleted: integer('feature_setup_completed').default(0),
  createdAt: text('created_at').default(sql`(datetime('now'))`),
  updatedAt: text('updated_at').default(sql`(datetime('now'))`),
});

module.exports = { companyCreationSuccess };
