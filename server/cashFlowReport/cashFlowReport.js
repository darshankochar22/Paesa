const init = async (db) => {
  await db.execute(`
    CREATE TABLE IF NOT EXISTS cash_flow_reports (
      report_id               INTEGER PRIMARY KEY AUTOINCREMENT,
      company_id              INTEGER NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
      report_name             TEXT DEFAULT 'Cash Flow',
      start_date              TEXT,
      end_date                TEXT,
      grand_total_inflow      REAL DEFAULT 0,
      grand_total_outflow     REAL DEFAULT 0,
      grand_total_nett        REAL DEFAULT 0,
      created_at              TEXT DEFAULT (datetime('now')),
      updated_at              TEXT DEFAULT (datetime('now'))
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS cash_flow_views (
      view_id                 INTEGER PRIMARY KEY AUTOINCREMENT,
      report_id               INTEGER NOT NULL REFERENCES cash_flow_reports(report_id) ON DELETE CASCADE,
      company_id              INTEGER NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
      month_name              TEXT,
      inflow                  REAL DEFAULT 0,
      outflow                 REAL DEFAULT 0,
      nett_flow               REAL DEFAULT 0,
      display_order           INTEGER DEFAULT 0,
      created_at              TEXT DEFAULT (datetime('now'))
    )
  `);
};

module.exports = { init };