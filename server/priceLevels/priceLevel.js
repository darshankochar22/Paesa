// priceLevel.js

const init = async (db) => {
  await db.execute(`
    CREATE TABLE IF NOT EXISTS price_levels (
      price_level_id  INTEGER PRIMARY KEY AUTOINCREMENT,
      company_id      INTEGER NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
      level_index     INTEGER NOT NULL,
      name            TEXT    NOT NULL DEFAULT '',
      is_active       INTEGER DEFAULT 1,
      created_at      TEXT    DEFAULT (datetime('now')),
      updated_at      TEXT    DEFAULT (datetime('now')),
      UNIQUE (company_id, level_index)
    )
  `);
};

module.exports = { init };