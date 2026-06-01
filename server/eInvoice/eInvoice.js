const init = async (db) => {
  await db.execute(`
    CREATE TABLE IF NOT EXISTS einvoice_credentials (
      cred_id       INTEGER PRIMARY KEY AUTOINCREMENT,
      company_id    INTEGER NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
      client_id     TEXT NOT NULL,
      client_secret TEXT NOT NULL,
      username      TEXT NOT NULL,
      password      TEXT NOT NULL,
      app_key       TEXT NOT NULL,
      is_sandbox    INTEGER DEFAULT 1,
      created_at    TEXT DEFAULT (datetime('now')),
      updated_at    TEXT DEFAULT (datetime('now'))
    )
  `);
  await db.execute(`
    CREATE TABLE IF NOT EXISTS einvoice_records (
      irn_id          INTEGER PRIMARY KEY AUTOINCREMENT,
      company_id      INTEGER NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
      voucher_id      INTEGER,
      invoice_number  TEXT NOT NULL,
      invoice_date    TEXT NOT NULL,
      buyer_gstin     TEXT,
      irn             TEXT,
      ack_no          TEXT,
      ack_dt          TEXT,
      signed_invoice  TEXT,
      signed_qr_code  TEXT,
      ewb_no          TEXT,
      ewb_dt          TEXT,
      status          TEXT DEFAULT 'PENDING',
      cancel_reason   INTEGER,
      cancel_remarks  TEXT,
      cancelled_at    TEXT,
      raw_response    TEXT,
      created_at      TEXT DEFAULT (datetime('now')),
      updated_at      TEXT DEFAULT (datetime('now'))
    )
  `);
};

module.exports = { init };