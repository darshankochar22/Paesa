const init = async (db) => {
  await db.execute(`
    CREATE TABLE IF NOT EXISTS balance_sheet_reports (
      report_id                       INTEGER PRIMARY KEY AUTOINCREMENT,
      company_id                      INTEGER NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
      report_name                     TEXT DEFAULT 'Balance Sheet',
      report_date                     TEXT,
      comparison_period_start         TEXT,
      comparison_period_end           TEXT,
      format_type                     TEXT DEFAULT 'Vertical',
      method_of_showing               TEXT DEFAULT 'Net Balance',
      show_vertical_balance_sheet     INTEGER DEFAULT 1,
      show_working_capital_figures    INTEGER DEFAULT 0,
      profit_or_loss_as_liability     INTEGER DEFAULT 1,
      show_detail_view                INTEGER DEFAULT 0,
      show_condensed_view             INTEGER DEFAULT 0,
      show_schedule_vi                INTEGER DEFAULT 0,
      include_closing_stock           INTEGER DEFAULT 1,
      compare_quarterly               INTEGER DEFAULT 0,
      basis_of_values                 TEXT DEFAULT 'Default',
      change_view                     TEXT,
      exception_reports_enabled       INTEGER DEFAULT 0,
      filter_enabled                  INTEGER DEFAULT 0,
      saved_view_name                 TEXT,
      filter_details                  TEXT,
      show_profit                     INTEGER DEFAULT 1,
      show_columnar                   INTEGER DEFAULT 0,
      show_optional                   INTEGER DEFAULT 0,
      show_post_dated                 INTEGER DEFAULT 0,
      show_stat_adjustment            INTEGER DEFAULT 0,
      created_at                      TEXT DEFAULT (datetime('now')),
      updated_at                      TEXT DEFAULT (datetime('now'))
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS balance_sheet_views (
      view_id                   INTEGER PRIMARY KEY AUTOINCREMENT,
      report_id                 INTEGER NOT NULL REFERENCES balance_sheet_reports(report_id) ON DELETE CASCADE,
      company_id                INTEGER NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
      report_date               TEXT,
      group_name                TEXT,
      parent_group_name         TEXT,
      opening_balance           REAL DEFAULT 0,
      side                      TEXT DEFAULT 'Assets',
      current_period_debit      REAL DEFAULT 0,
      current_period_credit     REAL DEFAULT 0,
      closing_balance           REAL DEFAULT 0,
      display_order             INTEGER DEFAULT 0,
      is_total_row              INTEGER DEFAULT 0,
      is_drill_down_available   INTEGER DEFAULT 1,
      created_at                TEXT DEFAULT (datetime('now'))
    )
  `);
};

module.exports = { init };