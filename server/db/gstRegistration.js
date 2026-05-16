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
      is_active                     INTEGER DEFAULT 1,
      created_at                    TEXT DEFAULT (datetime('now')),
      updated_at                    TEXT DEFAULT (datetime('now'))
    )
  `);
};

module.exports = { init };