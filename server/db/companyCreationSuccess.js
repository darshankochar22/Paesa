const init = async (db) => {
  await db.execute(`
    CREATE TABLE IF NOT EXISTS company_creation_success (
      id                        INTEGER PRIMARY KEY AUTOINCREMENT,
      company_id                INTEGER NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
      created_successfully      INTEGER DEFAULT 1,
      success_screen_shown      INTEGER DEFAULT 0,
      show_more_features        INTEGER DEFAULT 0,
      show_all_features         INTEGER DEFAULT 0,
      default_features_loaded   INTEGER DEFAULT 1,
      feature_setup_completed   INTEGER DEFAULT 0,
      created_at                TEXT DEFAULT (datetime('now')),
      updated_at                TEXT DEFAULT (datetime('now'))
    )
  `);
};

module.exports = { init };