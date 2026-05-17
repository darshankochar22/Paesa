const init = async (db) => {
  await db.execute(`
    CREATE TABLE IF NOT EXISTS day_book_reports (
      report_id                   INTEGER PRIMARY KEY AUTOINCREMENT,
      company_id                  INTEGER NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
      report_name                 TEXT DEFAULT 'Day Book',
      date_from                   TEXT,
      date_to                     TEXT,
      selected_company_id         INTEGER,
      basis_of_values             TEXT DEFAULT 'Default',
      change_view                 TEXT,
      exception_reports_enabled   INTEGER DEFAULT 0,
      saved_view_name             TEXT,
      filter_enabled              INTEGER DEFAULT 0,
      filter_details              TEXT,
      show_profit                 INTEGER DEFAULT 0,
      show_columnar               INTEGER DEFAULT 0,
      show_optional               INTEGER DEFAULT 0,
      show_post_dated             INTEGER DEFAULT 0,
      show_stat_adjustment        INTEGER DEFAULT 0,
      show_details                INTEGER DEFAULT 1,
      show_related_reports        INTEGER DEFAULT 0,
      created_at                  TEXT DEFAULT (datetime('now')),
      updated_at                  TEXT DEFAULT (datetime('now'))
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS day_book_entries (
      entry_id          INTEGER PRIMARY KEY AUTOINCREMENT,
      report_id         INTEGER NOT NULL REFERENCES day_book_reports(report_id) ON DELETE CASCADE,
      company_id        INTEGER NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
      voucher_id        INTEGER REFERENCES vouchers(voucher_id),
      voucher_date      TEXT,
      particulars       TEXT,
      voucher_type      TEXT,
      voucher_number    TEXT,
      debit_amount      REAL DEFAULT 0,
      credit_amount     REAL DEFAULT 0,
      narration         TEXT,
      party_ledger_name TEXT,
      show_profit       INTEGER DEFAULT 0,
      is_optional       INTEGER DEFAULT 0,
      is_post_dated     INTEGER DEFAULT 0,
      is_stat_adjustment INTEGER DEFAULT 0,
      gross_profit      REAL DEFAULT 0,
      cost              REAL DEFAULT 0,
      display_order     INTEGER DEFAULT 0,
      is_drillable      INTEGER DEFAULT 1,
      notes             TEXT,
      created_at        TEXT DEFAULT (datetime('now')),
      updated_at        TEXT DEFAULT (datetime('now'))
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS day_book_entry_lines (
      line_id       INTEGER PRIMARY KEY AUTOINCREMENT,
      entry_id      INTEGER NOT NULL REFERENCES day_book_entries(entry_id) ON DELETE CASCADE,
      ledger_id     INTEGER REFERENCES ledgers(ledger_id),
      particulars   TEXT,
      debit_amount  REAL DEFAULT 0,
      credit_amount REAL DEFAULT 0,
      line_order    INTEGER DEFAULT 0,
      notes         TEXT
    )
  `);
};

module.exports = { init };