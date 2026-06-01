const init = async (db) => {
  await db.execute(`
    CREATE TABLE IF NOT EXISTS vouchers (
      voucher_id              INTEGER PRIMARY KEY AUTOINCREMENT,
      company_id              INTEGER NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
      fy_id                   INTEGER NOT NULL REFERENCES financial_years(fy_id) ON DELETE CASCADE,
      voucher_type            TEXT NOT NULL,
      voucher_number          TEXT,
      date                    TEXT NOT NULL,
      status                  TEXT DEFAULT 'Regular',
      supplier_invoice_no     TEXT,
      supplier_invoice_date   TEXT,
      reference_number        TEXT,
      reference_date          TEXT,
      narration               TEXT,
      party_ledger_id         INTEGER REFERENCES ledgers(ledger_id),
      party_name              TEXT,
      place_of_supply         TEXT,
      is_invoice              INTEGER DEFAULT 0,
      is_accounting_voucher   INTEGER DEFAULT 1,
      is_inventory_voucher    INTEGER DEFAULT 0,
      is_order_voucher        INTEGER DEFAULT 0,
      is_cancelled            INTEGER DEFAULT 0,
      is_optional             INTEGER DEFAULT 0,
      is_post_dated           INTEGER DEFAULT 0,
      created_at              TEXT DEFAULT (datetime('now')),
      updated_at              TEXT DEFAULT (datetime('now'))
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS voucher_entries (
      entry_id      INTEGER PRIMARY KEY AUTOINCREMENT,
      voucher_id    INTEGER NOT NULL REFERENCES vouchers(voucher_id) ON DELETE CASCADE,
      ledger_id     INTEGER REFERENCES ledgers(ledger_id),
      ledger_name   TEXT,
      type          TEXT NOT NULL,
      amount        REAL DEFAULT 0,
      amount_forex  REAL DEFAULT 0,
      currency      TEXT DEFAULT 'INR',
      narration     TEXT
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS voucher_stock_entries (
      stock_entry_id    INTEGER PRIMARY KEY AUTOINCREMENT,
      voucher_id        INTEGER NOT NULL REFERENCES vouchers(voucher_id) ON DELETE CASCADE,
      stock_item_id     INTEGER,
      item_name         TEXT,
      godown_id         INTEGER,
      unit_id           INTEGER,
      quantity          REAL DEFAULT 0,
      rate              REAL DEFAULT 0,
      amount            REAL DEFAULT 0,
      additional_amount REAL DEFAULT 0,
      discount_amount   REAL DEFAULT 0,
      hsn_code          TEXT,
      gst_rate          REAL DEFAULT 0,
      cgst_amount       REAL DEFAULT 0,
      sgst_amount       REAL DEFAULT 0,
      igst_amount       REAL DEFAULT 0
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS voucher_batches (
      batch_id        INTEGER PRIMARY KEY AUTOINCREMENT,
      voucher_id      INTEGER NOT NULL REFERENCES vouchers(voucher_id) ON DELETE CASCADE,
      stock_entry_id  INTEGER NOT NULL REFERENCES voucher_stock_entries(stock_entry_id) ON DELETE CASCADE,
      batch_number    TEXT,
      expiry_date     TEXT,
      quantity        REAL DEFAULT 0,
      rate            REAL DEFAULT 0
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS voucher_bill_references (
      bill_id       INTEGER PRIMARY KEY AUTOINCREMENT,
      voucher_id    INTEGER NOT NULL REFERENCES vouchers(voucher_id) ON DELETE CASCADE,
      ledger_id     INTEGER REFERENCES ledgers(ledger_id),
      bill_name     TEXT,
      bill_type     TEXT,
      amount        REAL DEFAULT 0,
      credit_period TEXT,
      due_date      TEXT
    )
  `);

  try {
    await db.execute(`ALTER TABLE voucher_bill_references ADD COLUMN due_date TEXT`);
  } catch (err) {}

  await db.execute(`
    CREATE TABLE IF NOT EXISTS voucher_bank_details (
      bank_detail_id    INTEGER PRIMARY KEY AUTOINCREMENT,
      voucher_id        INTEGER NOT NULL REFERENCES vouchers(voucher_id) ON DELETE CASCADE,
      ledger_id         INTEGER REFERENCES ledgers(ledger_id),
      transaction_type  TEXT DEFAULT 'Cheque',
      cheque_range      TEXT,
      instrument_number TEXT,
      instrument_date   TEXT,
      bank_name         TEXT,
      branch            TEXT,
      amount            REAL DEFAULT 0
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS voucher_cost_centres (
      cc_entry_id     INTEGER PRIMARY KEY AUTOINCREMENT,
      voucher_id      INTEGER NOT NULL REFERENCES vouchers(voucher_id) ON DELETE CASCADE,
      entry_id        INTEGER REFERENCES voucher_entries(entry_id),
      cost_centre_id  INTEGER,
      amount          REAL DEFAULT 0
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS voucher_cash_denominations (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      voucher_id    INTEGER NOT NULL REFERENCES vouchers(voucher_id) ON DELETE CASCADE,
      ledger_id     INTEGER REFERENCES ledgers(ledger_id),
      denomination  TEXT,
      quantity      INTEGER DEFAULT 0,
      amount        REAL DEFAULT 0
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS voucher_receipt_details (
      id                  INTEGER PRIMARY KEY AUTOINCREMENT,
      voucher_id          INTEGER NOT NULL REFERENCES vouchers(voucher_id) ON DELETE CASCADE,
      receipt_note_no     TEXT,
      receipt_doc_no      TEXT,
      dispatched_through  TEXT,
      destination         TEXT,
      carrier_name        TEXT,
      bill_of_lading_no   TEXT,
      bill_of_lading_date TEXT,
      motor_vehicle_no    TEXT
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS voucher_party_details (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      voucher_id      INTEGER NOT NULL REFERENCES vouchers(voucher_id) ON DELETE CASCADE,
      supplier_name   TEXT,
      mailing_name    TEXT,
      address         TEXT,
      state           TEXT,
      country         TEXT
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS voucher_dispatch_details (
      id                      INTEGER PRIMARY KEY AUTOINCREMENT,
      voucher_id              INTEGER NOT NULL REFERENCES vouchers(voucher_id) ON DELETE CASCADE,
      delivery_note_nos       TEXT,
      dispatch_doc_no         TEXT,
      dispatched_through      TEXT,
      destination             TEXT,
      carrier_name            TEXT,
      bill_of_lading_no       TEXT,
      bill_of_lading_date     TEXT,
      motor_vehicle_no        TEXT
    )
  `);

  // Add new columns to existing tables (fail silently if already exist)
  try { await db.execute(`ALTER TABLE voucher_dispatch_details ADD COLUMN delivery_note_nos TEXT`); } catch (err) {}
  try { await db.execute(`ALTER TABLE voucher_dispatch_details ADD COLUMN dispatch_doc_no TEXT`); } catch (err) {}
  try { await db.execute(`ALTER TABLE voucher_dispatch_details ADD COLUMN dispatched_through TEXT`); } catch (err) {}
  try { await db.execute(`ALTER TABLE voucher_dispatch_details ADD COLUMN destination TEXT`); } catch (err) {}
  try { await db.execute(`ALTER TABLE voucher_dispatch_details ADD COLUMN carrier_name TEXT`); } catch (err) {}
  try { await db.execute(`ALTER TABLE voucher_dispatch_details ADD COLUMN bill_of_lading_no TEXT`); } catch (err) {}
  try { await db.execute(`ALTER TABLE voucher_dispatch_details ADD COLUMN bill_of_lading_date TEXT`); } catch (err) {}
  try { await db.execute(`ALTER TABLE voucher_dispatch_details ADD COLUMN motor_vehicle_no TEXT`); } catch (err) {}

  try {
    await db.execute(`ALTER TABLE vouchers ADD COLUMN status TEXT DEFAULT 'Regular'`);
  } catch (err) {}

  try {
    await db.execute(`ALTER TABLE vouchers ADD COLUMN supplier_invoice_no TEXT`);
  } catch (err) {}

  try {
    await db.execute(`ALTER TABLE vouchers ADD COLUMN supplier_invoice_date TEXT`);
  } catch (err) {}

  try {
    await db.execute(`ALTER TABLE voucher_bank_details ADD COLUMN cheque_range TEXT`);
  } catch (err) {}
};

module.exports = { init };