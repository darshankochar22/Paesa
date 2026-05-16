const init = async (db) => {
  await db.execute(`
    CREATE TABLE IF NOT EXISTS cost_centres (
      cc_id         INTEGER PRIMARY KEY AUTOINCREMENT,
      company_id    INTEGER NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
      name          TEXT NOT NULL,
      alias         TEXT,
      parent_id     INTEGER REFERENCES cost_centres(cc_id),
      category      TEXT DEFAULT 'Primary',
      is_active     INTEGER DEFAULT 1,
      is_predefined INTEGER DEFAULT 0,
      created_at    TEXT DEFAULT (datetime('now')),
      updated_at    TEXT DEFAULT (datetime('now'))
    )
  `);
};

module.exports = { init };