const init = async (db) => {
  await db.execute(`
    CREATE TABLE IF NOT EXISTS tcs_nature_of_goods (
      tcs_id                        INTEGER PRIMARY KEY AUTOINCREMENT,
      company_id                    INTEGER NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
      name                          TEXT NOT NULL,
      section                       TEXT,
      payment_code                  TEXT,
      rate_individual_with_pan      REAL DEFAULT 0,
      rate_individual_without_pan   REAL DEFAULT 0,
      rate_other_with_pan           REAL DEFAULT 0,
      rate_other_without_pan        REAL DEFAULT 0,
      is_own_status                 INTEGER DEFAULT 0,
      tax_on_receipt_or_realization TEXT DEFAULT 'Tax Calculated on Receipt',
      threshold_level               REAL DEFAULT 0,
      is_zero_rated                 INTEGER DEFAULT 0,
      is_predefined                 INTEGER DEFAULT 0,
      is_active                     INTEGER DEFAULT 1,
      created_at                    TEXT DEFAULT (datetime('now')),
      updated_at                    TEXT DEFAULT (datetime('now'))
    )
  `);

  const pragmaResult = await db.execute(`PRAGMA table_info('tcs_nature_of_goods')`);
  const columns = Array.isArray(pragmaResult.rows)
    ? pragmaResult.rows.map((row) => row.name)
    : [];
  const requiredColumns = {
    section:                       "TEXT",
    payment_code:                  "TEXT",
    rate_individual_with_pan:      "REAL DEFAULT 0",
    rate_individual_without_pan:   "REAL DEFAULT 0",
    rate_other_with_pan:           "REAL DEFAULT 0",
    rate_other_without_pan:        "REAL DEFAULT 0",
    is_own_status:                 "INTEGER DEFAULT 0",
    tax_on_receipt_or_realization: "TEXT DEFAULT 'Tax Calculated on Receipt'",
    threshold_level:               "REAL DEFAULT 0",
    is_zero_rated:                 "INTEGER DEFAULT 0",
    is_predefined:                 "INTEGER DEFAULT 0",
    is_active:                     "INTEGER DEFAULT 1",
    created_at:                    "TEXT DEFAULT (datetime('now'))",
    updated_at:                    "TEXT DEFAULT (datetime('now'))",
  };

  for (const [col, def] of Object.entries(requiredColumns)) {
    if (!columns.includes(col)) {
      await db.execute(`ALTER TABLE tcs_nature_of_goods ADD COLUMN ${col} ${def}`);
    }
  }
};

module.exports = { init };
