const init = async (db) => {
  await db.execute(`
    CREATE TABLE IF NOT EXISTS gst_classifications (
      gc_id                   INTEGER PRIMARY KEY AUTOINCREMENT,
      company_id              INTEGER NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
      name                    TEXT NOT NULL,
      nature_of_transaction   TEXT DEFAULT 'Taxable',
      hsn_sac_code            TEXT,
      gst_rate                REAL DEFAULT 0,
      cgst_rate               REAL DEFAULT 0,
      sgst_rate               REAL DEFAULT 0,
      igst_rate               REAL DEFAULT 0,
      cess_rate               REAL DEFAULT 0,
      valuation_type          TEXT DEFAULT 'Based on Value',
      description             TEXT,
      is_predefined           INTEGER DEFAULT 0,
      is_active               INTEGER DEFAULT 1,
      created_at              TEXT DEFAULT (datetime('now')),
      updated_at              TEXT DEFAULT (datetime('now'))
    )
  `);
};

module.exports = { init };