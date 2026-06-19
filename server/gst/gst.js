const init = async (db) => {
  // 1. Create gst_hsn_rates table
  await db.execute(`
    CREATE TABLE IF NOT EXISTS gst_hsn_rates (
      rate_id INTEGER PRIMARY KEY AUTOINCREMENT,
      company_id INTEGER NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
      hsn_code TEXT NOT NULL,
      effective_from TEXT NOT NULL,
      effective_to TEXT,
      taxability TEXT DEFAULT 'Taxable',
      gst_rate REAL DEFAULT 0,
      cgst_rate REAL DEFAULT 0,
      sgst_rate REAL DEFAULT 0,
      igst_rate REAL DEFAULT 0,
      cess_rate REAL DEFAULT 0,
      type_of_supply TEXT DEFAULT 'Goods',
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);

  // 2. Create gst_voucher_tax_lines table for computing GSTR-1 audit details
  await db.execute(`
    CREATE TABLE IF NOT EXISTS gst_voucher_tax_lines (
      tax_line_id INTEGER PRIMARY KEY AUTOINCREMENT,
      voucher_id INTEGER NOT NULL REFERENCES vouchers(voucher_id) ON DELETE CASCADE,
      entry_id INTEGER REFERENCES voucher_entries(entry_id) ON DELETE SET NULL,
      hsn_code TEXT,
      description TEXT,
      quantity REAL DEFAULT 0,
      unit TEXT,
      assessable_value REAL DEFAULT 0,
      tax_type TEXT, -- 'CGST' | 'SGST' | 'IGST' | 'CESS'
      rate REAL DEFAULT 0,
      amount REAL DEFAULT 0,
      is_inter_state INTEGER DEFAULT 0,
      party_gstin TEXT,
      party_state TEXT,
      gst_classification_id INTEGER,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);

  // 3. Create gstr1_exports table
  await db.execute(`
    CREATE TABLE IF NOT EXISTS gstr1_exports (
      export_id INTEGER PRIMARY KEY AUTOINCREMENT,
      company_id INTEGER NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
      fy_id INTEGER NOT NULL REFERENCES financial_years(fy_id) ON DELETE CASCADE,
      return_period TEXT NOT NULL, -- "MMYYYY" format e.g. "052026"
      filed_date TEXT,
      status TEXT DEFAULT 'Draft', -- 'Draft' | 'Filed'
      b2b_json TEXT,
      b2cl_json TEXT,
      b2cs_json TEXT,
      cdnr_json TEXT,
      hsn_json TEXT,
      errors_json TEXT,
      full_payload_json TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);

  // 4. Create gstr2b_imports table for reconciliation
  await db.execute(`
    CREATE TABLE IF NOT EXISTS gstr2b_imports (
      import_id INTEGER PRIMARY KEY AUTOINCREMENT,
      company_id INTEGER NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
      fy_id INTEGER NOT NULL REFERENCES financial_years(fy_id) ON DELETE CASCADE,
      return_period TEXT NOT NULL,
      payload_json TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);

  // Migrations: Alter stock_groups to add igst_rate and cess_rate
  try {
    await db.execute(`
      ALTER TABLE stock_groups
      ADD COLUMN igst_rate REAL DEFAULT 0
    `);
  } catch (err) {}

  try {
    await db.execute(`
      ALTER TABLE stock_groups
      ADD COLUMN cess_rate REAL DEFAULT 0
    `);
  } catch (err) {}
};

module.exports = { init };
