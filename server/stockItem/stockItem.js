const init = async (db) => {

  await db.execute(`
    CREATE TABLE IF NOT EXISTS stock_items (
      item_id INTEGER PRIMARY KEY AUTOINCREMENT,

      company_id INTEGER NOT NULL
        REFERENCES companies(company_id)
        ON DELETE CASCADE,

      name TEXT NOT NULL,
      alias TEXT,

      group_id INTEGER
        REFERENCES stock_groups(sg_id),

      category_id INTEGER
        REFERENCES stock_categories(sc_id),

      unit_id INTEGER
        REFERENCES units(unit_id),

      -- GST Applicability
      gst_applicable TEXT DEFAULT 'Not Applicable',

      -- HSN/SAC & Related Details
      hsn_sac            TEXT,
      source_of_details  TEXT DEFAULT 'As per Company/Stock Group',
      hsn_sac_description TEXT,

      -- legacy split columns kept for backward compat
      hsn_code TEXT,
      sac_code TEXT,

      -- GST Rate & Related Details
      gst_rate_details    TEXT,
      source_of_gst_rate  TEXT DEFAULT 'As per Company/Stock Group',
      taxability_type     TEXT,
      gst_rate            REAL DEFAULT 0,
      cgst_rate           REAL DEFAULT 0,
      sgst_rate           REAL DEFAULT 0,
      igst_rate           REAL DEFAULT 0,

      type_of_supply TEXT DEFAULT 'Goods',

      rate_of_duty REAL DEFAULT 0,
      statutory_details TEXT,

      opening_quantity REAL DEFAULT 0,
      opening_rate     REAL DEFAULT 0,
      opening_value    REAL DEFAULT 0,

      reorder_level    REAL DEFAULT 0,
      reorder_quantity REAL DEFAULT 0,

      track_batches INTEGER DEFAULT 0,
      track_expiry  INTEGER DEFAULT 0,

      has_bom  INTEGER DEFAULT 0,
      bom_name TEXT,

      is_active  INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    )
  `);

  // ── Migrations: add any columns that may be missing in older DBs ──────────
  const info = await db.execute(`PRAGMA table_info(stock_items)`);
  const cols = info.rows.map(col => col.name);

  const migrations = [
    { col: 'has_bom',              sql: `ALTER TABLE stock_items ADD COLUMN has_bom INTEGER DEFAULT 0` },
    { col: 'bom_name',             sql: `ALTER TABLE stock_items ADD COLUMN bom_name TEXT` },
    { col: 'opening_value',        sql: `ALTER TABLE stock_items ADD COLUMN opening_value REAL DEFAULT 0` },
    { col: 'statutory_details',    sql: `ALTER TABLE stock_items ADD COLUMN statutory_details TEXT` },
    { col: 'hsn_sac',              sql: `ALTER TABLE stock_items ADD COLUMN hsn_sac TEXT` },
    { col: 'source_of_details',    sql: `ALTER TABLE stock_items ADD COLUMN source_of_details TEXT DEFAULT 'As per Company/Stock Group'` },
    { col: 'hsn_sac_description',  sql: `ALTER TABLE stock_items ADD COLUMN hsn_sac_description TEXT` },
    { col: 'gst_rate_details',     sql: `ALTER TABLE stock_items ADD COLUMN gst_rate_details TEXT` },
    { col: 'source_of_gst_rate',   sql: `ALTER TABLE stock_items ADD COLUMN source_of_gst_rate TEXT DEFAULT 'As per Company/Stock Group'` },
    { col: 'taxability_type',      sql: `ALTER TABLE stock_items ADD COLUMN taxability_type TEXT` },
  ];

  for (const m of migrations) {
    if (!cols.includes(m.col)) {
      await db.execute(m.sql);
    }
  }
};

module.exports = { init };