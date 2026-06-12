const init = async (db) => {
  await db.execute(`
    CREATE TABLE IF NOT EXISTS company_gst_details (
      company_id                    INTEGER PRIMARY KEY REFERENCES companies(company_id) ON DELETE CASCADE,
      hsn_sac_type                  TEXT DEFAULT 'Not Defined',
      hsn_sac_code                  TEXT,
      description                   TEXT,
      taxability_type               TEXT DEFAULT 'Taxable',
      gst_rate                      REAL DEFAULT 0,
      interstate_threshold_limit    REAL DEFAULT 50000,
      intrastate_threshold_limit    REAL DEFAULT 50000,
      threshold_limit_includes      TEXT DEFAULT 'Value of Invoice',
      create_hsn_summary_for        TEXT DEFAULT 'All Sections',
      minimum_hsn_length            INTEGER DEFAULT 4,
      show_gst_advances             INTEGER DEFAULT 0,
      update_gst_status             INTEGER DEFAULT 0,
      gst_returns_configured        INTEGER DEFAULT 0,
      created_at                    TEXT DEFAULT (datetime('now')),
      updated_at                    TEXT DEFAULT (datetime('now'))
    )
  `);
};

module.exports = { init };
