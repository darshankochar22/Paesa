const init = async (db) => {
  await db.execute(`
    CREATE TABLE IF NOT EXISTS cost_categories (
      cc_cat_id     INTEGER PRIMARY KEY AUTOINCREMENT,
      company_id    INTEGER NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
      name          TEXT NOT NULL,
      alias         TEXT,
      allocate_revenue_items     INTEGER DEFAULT 1,
      allocate_non_revenue_items INTEGER DEFAULT 0,
      is_active     INTEGER DEFAULT 1,
      is_predefined INTEGER DEFAULT 0,
      created_at    TEXT DEFAULT (datetime('now')),
      updated_at    TEXT DEFAULT (datetime('now'))
    )
  `);
};

module.exports = { init };
