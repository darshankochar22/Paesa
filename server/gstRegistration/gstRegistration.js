const init = async (db) => {
  await db.execute(`
    CREATE TABLE IF NOT EXISTS gst_registrations (
      gst_id                        INTEGER PRIMARY KEY AUTOINCREMENT,
      company_id                    INTEGER NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
      registration_type             TEXT DEFAULT 'Regular',
      registration_status           TEXT DEFAULT 'Active',
      assessee_of_other_territory   INTEGER DEFAULT 0,
      periodicity_of_gstr1          TEXT DEFAULT 'Monthly',
      gstin                         TEXT,
      gst_username                  TEXT,
      mode_of_filing                TEXT DEFAULT 'Online',
      e_invoice_details             TEXT,
      e_invoice_application         INTEGER DEFAULT 0,
      e_way_bill_applicable         INTEGER DEFAULT 0,
      e_way_bill_applicable_from    TEXT,
      applicable_for_intrastat      INTEGER DEFAULT 0,
      legal_name                    TEXT,
      trade_name                    TEXT,
      state_id                      TEXT,
      registration_date             TEXT,
      effective_from                TEXT,
      address_type                  TEXT DEFAULT 'Primary',
      goods_dispatched_from         TEXT DEFAULT 'Primary',
      e_invoice_applicable_from     TEXT,
      e_invoice_bill_from_place     TEXT,
      composition_tax_rate          REAL,
      composition_tax_calc_basis    TEXT,
      is_active                     INTEGER DEFAULT 1,
      created_at                    TEXT DEFAULT (datetime('now')),
      updated_at                    TEXT DEFAULT (datetime('now'))
    )
  `);

  const migrations = [
    { col: 'address_type', sql: "ALTER TABLE gst_registrations ADD COLUMN address_type TEXT DEFAULT 'Primary'" },
    { col: 'goods_dispatched_from', sql: "ALTER TABLE gst_registrations ADD COLUMN goods_dispatched_from TEXT DEFAULT 'Primary'" },
    { col: 'e_invoice_applicable_from', sql: "ALTER TABLE gst_registrations ADD COLUMN e_invoice_applicable_from TEXT" },
    { col: 'e_invoice_bill_from_place', sql: "ALTER TABLE gst_registrations ADD COLUMN e_invoice_bill_from_place TEXT" },
    { col: 'composition_tax_rate', sql: "ALTER TABLE gst_registrations ADD COLUMN composition_tax_rate REAL" },
    { col: 'composition_tax_calc_basis', sql: "ALTER TABLE gst_registrations ADD COLUMN composition_tax_calc_basis TEXT" }
  ];

  for (const m of migrations) {
    try {
      await db.execute(m.sql);
    } catch (err) {
      // Ignored if column already exists
    }
  }
};

module.exports = { init };