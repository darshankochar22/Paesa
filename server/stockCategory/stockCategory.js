const init = async (db) => {
  await db.execute(`
    CREATE TABLE IF NOT EXISTS stock_categories (
      sc_id              INTEGER PRIMARY KEY AUTOINCREMENT,
      company_id         INTEGER NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
      name               TEXT NOT NULL,
      alias              TEXT,
      description        TEXT,
      parent_category_id INTEGER REFERENCES stock_categories(sc_id),
      is_active          INTEGER DEFAULT 1,
      created_at         TEXT DEFAULT (datetime('now')),
      updated_at         TEXT DEFAULT (datetime('now'))
    )
  `);
};

module.exports = { init };