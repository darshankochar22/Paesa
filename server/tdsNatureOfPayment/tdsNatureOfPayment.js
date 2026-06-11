const init = async (db) => {
  await db.execute(`
    CREATE TABLE IF NOT EXISTS tds_nature_of_payment (
      tds_id                        INTEGER PRIMARY KEY AUTOINCREMENT,
      company_id                    INTEGER NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
      name                          TEXT NOT NULL,
      section                       TEXT,
      payment_code                  TEXT,
      remittance_code               TEXT,
      rate_individual_with_pan      REAL DEFAULT 0,
      rate_other_with_pan           REAL DEFAULT 0,
      is_zero_rated                 INTEGER DEFAULT 0,
      threshold_limit               REAL DEFAULT 0,
      is_predefined                 INTEGER DEFAULT 0,
      is_active                     INTEGER DEFAULT 1,
      created_at                    TEXT DEFAULT (datetime('now')),
      updated_at                    TEXT DEFAULT (datetime('now'))
    )
  `);

  const pragmaResult = await db.execute(`PRAGMA table_info('tds_nature_of_payment')`);
  const columns = Array.isArray(pragmaResult.rows)
    ? pragmaResult.rows.map((row) => row.name)
    : [];
  const requiredColumns = {
    section:                       "TEXT",
    payment_code:                  "TEXT",
    remittance_code:               "TEXT",
    rate_individual_with_pan:      "REAL DEFAULT 0",
    rate_other_with_pan:           "REAL DEFAULT 0",
    is_zero_rated:                 "INTEGER DEFAULT 0",
    threshold_limit:               "REAL DEFAULT 0",
    is_predefined:                 "INTEGER DEFAULT 0",
    is_active:                     "INTEGER DEFAULT 1",
    created_at:                    "TEXT DEFAULT (datetime('now'))",
    updated_at:                    "TEXT DEFAULT (datetime('now'))",
  };

  for (const [col, def] of Object.entries(requiredColumns)) {
    if (!columns.includes(col)) {
      await db.execute(`ALTER TABLE tds_nature_of_payment ADD COLUMN ${col} ${def}`);
    }
  }
};

module.exports = { init };
