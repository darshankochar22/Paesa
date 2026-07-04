const init = async (db) => {
  await db.execute(`
    CREATE TABLE IF NOT EXISTS companies (
      company_id                    INTEGER PRIMARY KEY AUTOINCREMENT,
      name                          TEXT NOT NULL,
      mailing_name                  TEXT,
      address1                      TEXT,
      address2                      TEXT,
      state                         TEXT,
      country                       TEXT,
      pincode                       TEXT,
      telephone                     TEXT,
      mobile                        TEXT,
      fax                           TEXT,
      email                         TEXT,
      website                       TEXT,
      base_currency_symbol          TEXT,
      formal_name                   TEXT,
      financial_year_beginning_from TEXT,
      books_beginning_from          TEXT,
      password                      TEXT,
      access_control                TEXT,
      edit_log                      TEXT,
      created_at                    TEXT DEFAULT (datetime('now'))
    )
  `);

  // ── Migrations: add any columns that may be missing in older DBs ──────────
  const info = await db.execute(`PRAGMA table_info(companies)`);
  const cols = info.rows.map((c) => c.name);

  const migrations = [
    // Mutable pointer to the company's "current default" GST registration, used
    // ONLY to prefill NEW vouchers. Plain INTEGER (cross-module FK to
    // gst_registrations(gst_id)); changing it never alters existing vouchers.
    { col: 'current_default_gst_registration_id', sql: `ALTER TABLE companies ADD COLUMN current_default_gst_registration_id INTEGER` },
  ];

  for (const m of migrations) {
    if (!cols.includes(m.col)) {
      await db.execute(m.sql);
    }
  }
};

module.exports = { init };