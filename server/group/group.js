const init = async (db) => {
  await db.execute(`
    CREATE TABLE IF NOT EXISTS groups (
      group_id                  INTEGER PRIMARY KEY AUTOINCREMENT,
      company_id                INTEGER NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
      name                      TEXT NOT NULL,
      alias                     TEXT,
      parent_group_id           INTEGER REFERENCES groups(group_id),
      is_primary                INTEGER DEFAULT 0,
      is_predefined             INTEGER DEFAULT 0,
      nature                    TEXT,
      set_alter_tds_details    INTEGER DEFAULT 0,
      set_alter_tcs_details    INTEGER DEFAULT 0,
      set_alter_other_statutory_details INTEGER DEFAULT 0,
      hsn_sac_source           TEXT,
      hsn_sac_description      TEXT,
      gst_rate_source          TEXT,
      taxability_type          TEXT,
      behaves_like_subledger    INTEGER DEFAULT 0,
      show_net_debit_credit     INTEGER DEFAULT 0,
      used_for_calculation      INTEGER DEFAULT 0,
      allocation_method         TEXT DEFAULT 'Average Cost',
      gst_rate                  REAL,
      cgst_rate                 REAL,
      sgst_rate                 REAL,
      igst_rate                 REAL,
      hsn_sac_code              TEXT,
      statutory_details         TEXT,
      sort_order                INTEGER DEFAULT 0,
      group_type                TEXT,
      display_order             INTEGER DEFAULT 0,
      is_active                 INTEGER DEFAULT 1,
      created_at                TEXT DEFAULT (datetime('now')),
      updated_at                TEXT DEFAULT (datetime('now'))
    )
  `);

  // Migrations for additional statutory-detail fields used by group creation
  // for Current Assets / Current Liabilities (and the other statutory groups).
  const pragmaResult = await db.execute("PRAGMA table_info('groups')");
  const colNames = new Set(
    Array.isArray(pragmaResult.rows)
      ? pragmaResult.rows.map((row) => row.name)
      : []
  );
  const addCol = async (name, def) => {
    if (!colNames.has(name)) {
      await db.execute(`ALTER TABLE groups ADD COLUMN ${name} ${def}`);
    }
  };
  await addCol("set_alter_tds_details", "INTEGER DEFAULT 0");
  await addCol("set_alter_tcs_details", "INTEGER DEFAULT 0");
  await addCol("set_alter_other_statutory_details", "INTEGER DEFAULT 0");
  await addCol("hsn_sac_source", "TEXT");
  await addCol("hsn_sac_description", "TEXT");
  await addCol("gst_rate_source", "TEXT");
  await addCol("taxability_type", "TEXT");
  await addCol("set_alter_service_tax_details", "INTEGER DEFAULT 0");
  await addCol("hsn_sac_classification_id", "INTEGER");
  await addCol("gst_classification_id", "INTEGER");
  await addCol("slab_based_rates", "TEXT");
};

module.exports = { init };