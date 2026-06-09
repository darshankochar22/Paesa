const init = async (db) => {
  await db.execute(`
    CREATE TABLE IF NOT EXISTS gst_classifications (
      gc_id                   INTEGER PRIMARY KEY AUTOINCREMENT,
      company_id              INTEGER NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
      name                    TEXT NOT NULL,
      description             TEXT,
      hsn_sac_code            TEXT,
      is_non_gst_goods        INTEGER DEFAULT 0,
      nature_of_transaction   TEXT DEFAULT 'Not Applicable',
      taxability              TEXT DEFAULT 'Unknown',
      is_reverse_charge       INTEGER DEFAULT 0,
      is_ineligible_for_itc   INTEGER DEFAULT 0,
      rate_type               TEXT DEFAULT 'Fixed Rate',
      igst_rate               REAL DEFAULT 0,
      igst_valuation_type     TEXT DEFAULT 'Based on Value',
      cgst_rate               REAL DEFAULT 0,
      cgst_valuation_type     TEXT DEFAULT 'Based on Value',
      sgst_rate               REAL DEFAULT 0,
      sgst_valuation_type     TEXT DEFAULT 'Based on Value',
      cess_rate               REAL DEFAULT 0,
      cess_valuation_type     TEXT DEFAULT 'Based on Value',
      gst_rate                REAL DEFAULT 0,
      gst_rate_details        TEXT,
      valuation_type          TEXT DEFAULT 'Based on Value',
      is_predefined           INTEGER DEFAULT 0,
      is_active               INTEGER DEFAULT 1,
      created_at              TEXT DEFAULT (datetime('now')),
      updated_at              TEXT DEFAULT (datetime('now'))
    )
  `);

  const pragmaResult = await db.execute(`PRAGMA table_info('gst_classifications')`);
  const columns = Array.isArray(pragmaResult.rows)
    ? pragmaResult.rows.map((row) => row.name)
    : [];
  const requiredColumns = {
    description:            "TEXT",
    hsn_sac_code:           "TEXT",
    is_non_gst_goods:       "INTEGER DEFAULT 0",
    nature_of_transaction:  "TEXT DEFAULT 'Not Applicable'",
    taxability:             "TEXT DEFAULT 'Unknown'",
    is_reverse_charge:      "INTEGER DEFAULT 0",
    is_ineligible_for_itc:  "INTEGER DEFAULT 0",
    rate_type:              "TEXT DEFAULT 'Fixed Rate'",
    igst_rate:              "REAL DEFAULT 0",
    igst_valuation_type:    "TEXT DEFAULT 'Based on Value'",
    cgst_rate:              "REAL DEFAULT 0",
    cgst_valuation_type:    "TEXT DEFAULT 'Based on Value'",
    sgst_rate:              "REAL DEFAULT 0",
    sgst_valuation_type:    "TEXT DEFAULT 'Based on Value'",
    cess_rate:              "REAL DEFAULT 0",
    cess_valuation_type:    "TEXT DEFAULT 'Based on Value'",
    gst_rate:               "REAL DEFAULT 0",
    gst_rate_details:       "TEXT",
    valuation_type:         "TEXT DEFAULT 'Based on Value'",
    is_predefined:          "INTEGER DEFAULT 0",
    is_active:              "INTEGER DEFAULT 1",
    created_at:             "TEXT DEFAULT (datetime('now'))",
    updated_at:             "TEXT DEFAULT (datetime('now'))",
  };

  for (const [col, def] of Object.entries(requiredColumns)) {
    if (!columns.includes(col)) {
      await db.execute(`ALTER TABLE gst_classifications ADD COLUMN ${col} ${def}`);
    }
  }
};
module.exports = { init };