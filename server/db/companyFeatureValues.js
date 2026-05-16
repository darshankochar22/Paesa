const init = async (db) => {
  await db.execute(`
    CREATE TABLE IF NOT EXISTS company_feature_values (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      company_id      INTEGER NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
      feature_item_id INTEGER NOT NULL REFERENCES feature_items(feature_item_id) ON DELETE CASCADE,
      value_boolean   INTEGER DEFAULT 0,
      value_text      TEXT,
      value_number    REAL,
      value_date      TEXT,
      is_enabled      INTEGER DEFAULT 0,
      created_at      TEXT DEFAULT (datetime('now')),
      updated_at      TEXT DEFAULT (datetime('now'))
    )
  `);
};

module.exports = { init };