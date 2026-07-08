const init = async (db) => {
  await db.execute(`
    CREATE TABLE IF NOT EXISTS company_gst_details (
      company_id                    INTEGER PRIMARY KEY REFERENCES companies(company_id) ON DELETE CASCADE,
      hsn_sac_type                  TEXT DEFAULT 'Not Defined',
      hsn_sac_code                  TEXT,
      description                   TEXT,
      taxability_type               TEXT DEFAULT 'Not Defined',
      gst_rate                      REAL DEFAULT 0,
      interstate_threshold_limit    REAL DEFAULT 50000,
      intrastate_threshold_limit    REAL DEFAULT 50000,
      threshold_limit_includes      TEXT DEFAULT 'Value of Invoice',
      create_hsn_summary_for        TEXT DEFAULT 'All Sections',
      minimum_hsn_length            INTEGER DEFAULT 4,
      show_gst_advances             INTEGER DEFAULT 0,
      update_gst_status             INTEGER DEFAULT 0,
      gst_returns_configured        INTEGER DEFAULT 0,
       effective_date                TEXT DEFAULT '1-Apr-26',
       download_gst_registration     TEXT,
       download_return_type          TEXT DEFAULT 'All Returns',
       set_state_wise_threshold_limit INTEGER DEFAULT 0,
       state_wise_limits             TEXT,
       gst_advances_applicable_from  TEXT,
       exports_under_lut             INTEGER DEFAULT 1,
       created_at                    TEXT DEFAULT (datetime('now')),
       updated_at                    TEXT DEFAULT (datetime('now'))
     )
   `);

  // Migration: add columns if table already exists without them
  try {
    const info = await db.execute('PRAGMA table_info(company_gst_details)');
    const existingColumns = info.rows.map((r) => r.name);
    if (!existingColumns.includes('effective_date')) {
      await db.execute(
        "ALTER TABLE company_gst_details ADD COLUMN effective_date TEXT DEFAULT '1-Apr-26'",
      );
    }
    if (!existingColumns.includes('download_gst_registration')) {
      await db.execute('ALTER TABLE company_gst_details ADD COLUMN download_gst_registration TEXT');
    }
    if (!existingColumns.includes('download_return_type')) {
      await db.execute(
        "ALTER TABLE company_gst_details ADD COLUMN download_return_type TEXT DEFAULT 'All Returns'",
      );
    }
    if (!existingColumns.includes('set_state_wise_threshold_limit')) {
      await db.execute(
        'ALTER TABLE company_gst_details ADD COLUMN set_state_wise_threshold_limit INTEGER DEFAULT 0',
      );
    }
    if (!existingColumns.includes('state_wise_limits')) {
      await db.execute('ALTER TABLE company_gst_details ADD COLUMN state_wise_limits TEXT');
    }
    if (!existingColumns.includes('gst_advances_applicable_from')) {
      await db.execute(
        'ALTER TABLE company_gst_details ADD COLUMN gst_advances_applicable_from TEXT',
      );
    }
    if (!existingColumns.includes('exports_under_lut')) {
      await db.execute(
        'ALTER TABLE company_gst_details ADD COLUMN exports_under_lut INTEGER DEFAULT 1',
      );
    }
  } catch (err) {
    console.error('Failed to run migrations for company_gst_details:', err);
  }
};

module.exports = { init };
