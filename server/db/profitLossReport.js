const init = async (db) => {
  await db.execute(`
    CREATE TABLE IF NOT EXISTS profit_loss_reports (
      report_id                     INTEGER PRIMARY KEY AUTOINCREMENT,
      company_id                    INTEGER NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
      report_name                   TEXT DEFAULT 'Profit & Loss A/c',
      report_date                   TEXT,
      period_start                  TEXT,
      period_end                    TEXT,
      format_type                   TEXT DEFAULT 'Vertical',
      compare_with_previous_period  INTEGER DEFAULT 0,
      comparison_period_start       TEXT,
      comparison_period_end         TEXT,
      basis_of_values               TEXT DEFAULT 'Default',
      change_view                   TEXT,
      exception_report_enabled      INTEGER DEFAULT 0,
      saved_view_name               TEXT,
      filter_enabled                INTEGER DEFAULT 0,
      filter_details                TEXT,
      show_detail_view              INTEGER DEFAULT 0,
      show_condensed_view           INTEGER DEFAULT 0,
      show_percentage_of_sales      INTEGER DEFAULT 0,
      show_auto_column              INTEGER DEFAULT 0,
      show_profit                   INTEGER DEFAULT 1,
      show_optional                 INTEGER DEFAULT 0,
      show_post_dated               INTEGER DEFAULT 0,
      show_stat_adjustment          INTEGER DEFAULT 0,
      show_schedule_vi              INTEGER DEFAULT 0,
      created_at                    TEXT DEFAULT (datetime('now')),
      updated_at                    TEXT DEFAULT (datetime('now'))
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS profit_loss_views (
      view_id                   INTEGER PRIMARY KEY AUTOINCREMENT,
      report_id                 INTEGER NOT NULL REFERENCES profit_loss_reports(report_id) ON DELETE CASCADE,
      company_id                INTEGER NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
      report_date               TEXT,
      section                   TEXT DEFAULT 'Income',
      group_name                TEXT,
      parent_group_name         TEXT,
      opening_balance           REAL DEFAULT 0,
      current_period_amount     REAL DEFAULT 0,
      closing_balance           REAL DEFAULT 0,
      display_order             INTEGER DEFAULT 0,
      is_total_row              INTEGER DEFAULT 0,
      is_gross_profit_row       INTEGER DEFAULT 0,
      is_drill_down_available   INTEGER DEFAULT 1,
      created_at                TEXT DEFAULT (datetime('now'))
    )
  `);
};

module.exports = { init };