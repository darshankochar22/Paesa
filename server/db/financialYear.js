const init = async (db) => {
  await db.execute(`
    CREATE TABLE IF NOT EXISTS financial_years (
      fy_id        INTEGER PRIMARY KEY AUTOINCREMENT,
      company_id   INTEGER NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
      start_date   TEXT NOT NULL,
      end_date     TEXT NOT NULL,
      is_active    INTEGER DEFAULT 0,
      is_closed    INTEGER DEFAULT 0,
      closing_date TEXT,
      created_at   TEXT DEFAULT (datetime('now'))
    )
  `);
};

module.exports = { init };