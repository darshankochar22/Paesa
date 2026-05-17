const init = async (db) => {
  await db.execute(`
    CREATE TABLE IF NOT EXISTS trial_balance_reports (
      report_id             INTEGER PRIMARY KEY AUTOINCREMENT,
      company_id            INTEGER NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
      company_name          TEXT,
      report_date           TEXT,
      period_start          TEXT,
      period_end            TEXT,
      show_closing_balance  INTEGER DEFAULT 1,
      show_debit_credit     INTEGER DEFAULT 1,
      show_groups           INTEGER DEFAULT 1,
      show_grand_total      INTEGER DEFAULT 1,
      detailed_mode         INTEGER DEFAULT 0,
      created_at            TEXT DEFAULT (datetime('now')),
      updated_at            TEXT DEFAULT (datetime('now'))
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS trial_balance_rows (
      row_id          INTEGER PRIMARY KEY AUTOINCREMENT,
      report_id       INTEGER NOT NULL REFERENCES trial_balance_reports(report_id) ON DELETE CASCADE,
      parent_row_id   INTEGER,
      row_type        TEXT DEFAULT 'Ledger',
      particulars     TEXT,
      group_id        INTEGER,
      ledger_id       INTEGER,
      display_order   INTEGER DEFAULT 0,
      opening_debit   REAL DEFAULT 0,
      opening_credit  REAL DEFAULT 0,
      period_debit    REAL DEFAULT 0,
      period_credit   REAL DEFAULT 0,
      closing_debit   REAL DEFAULT 0,
      closing_credit  REAL DEFAULT 0,
      is_drillable    INTEGER DEFAULT 1,
      is_grand_total  INTEGER DEFAULT 0,
      notes           TEXT,
      created_at      TEXT DEFAULT (datetime('now')),
      updated_at      TEXT DEFAULT (datetime('now'))
    )
  `);
};

module.exports = { init };