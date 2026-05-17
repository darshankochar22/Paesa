const init = async (db) => {
  await db.execute(`
    CREATE TABLE IF NOT EXISTS pay_heads (
      pay_head_id           INTEGER PRIMARY KEY AUTOINCREMENT,
      company_id            INTEGER NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
      name                  TEXT NOT NULL,
      pay_head_type         TEXT DEFAULT 'Earnings',
      calculation_type      TEXT DEFAULT 'Flat Rate',
      affects_net_salary    INTEGER DEFAULT 1,
      under_group           TEXT,
      statutory_component   TEXT,
      percentage_or_amount  REAL DEFAULT 0,
      is_active             INTEGER DEFAULT 1,
      is_predefined         INTEGER DEFAULT 0,
      created_at            TEXT DEFAULT (datetime('now')),
      updated_at            TEXT DEFAULT (datetime('now'))
    )
  `);
};

module.exports = { init };