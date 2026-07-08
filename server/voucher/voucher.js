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
      applicable_upto         TEXT,
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
      mfg_date        TEXT,
      expiry_date     TEXT,
      quantity        REAL DEFAULT 0,
      rate            REAL DEFAULT 0,
      godown          TEXT,
      actual_quantity REAL DEFAULT 0,
      disc_percent    REAL DEFAULT 0,
      order_no        TEXT,
      due_on          TEXT,
      component_of    TEXT,
      consider_as_scrap TEXT
    )
  `);

  // Columns added later — ALTER for DBs created before they existed.
  try {
    await db.execute(`ALTER TABLE voucher_batches ADD COLUMN mfg_date TEXT`);
  } catch (err) {}
  try {
    await db.execute(`ALTER TABLE voucher_batches ADD COLUMN godown TEXT`);
  } catch (err) {}
  try {
    await db.execute(`ALTER TABLE voucher_batches ADD COLUMN actual_quantity REAL DEFAULT 0`);
  } catch (err) {}
  try {
    await db.execute(`ALTER TABLE voucher_batches ADD COLUMN disc_percent REAL DEFAULT 0`);
  } catch (err) {}
  try {
    await db.execute(`ALTER TABLE voucher_batches ADD COLUMN order_no TEXT`);
  } catch (err) {}
  try {
    await db.execute(`ALTER TABLE voucher_batches ADD COLUMN due_on TEXT`);
  } catch (err) {}
  try {
    await db.execute(`ALTER TABLE voucher_batches ADD COLUMN component_of TEXT`);
  } catch (err) {}
  try {
    await db.execute(`ALTER TABLE voucher_batches ADD COLUMN consider_as_scrap TEXT`);
  } catch (err) {}
  try {
    await db.execute(`ALTER TABLE voucher_batches ADD COLUMN tracking_no TEXT`);
  } catch (err) {}
  try {
    await db.execute(`ALTER TABLE voucher_batches ADD COLUMN due_on_date TEXT`);
  } catch (err) {}
  try {
    await db.execute(`ALTER TABLE voucher_batches ADD COLUMN track_components TEXT`);
  } catch (err) {}
  try {
    await db.execute(`ALTER TABLE voucher_bank_details ADD COLUMN favouring_name TEXT`);
  } catch (err) {}
  try {
    await db.execute(`ALTER TABLE voucher_bank_details ADD COLUMN transfer_mode TEXT`);
  } catch (err) {}
  try {
    await db.execute(`ALTER TABLE voucher_bank_details ADD COLUMN allocations_json TEXT`);
  } catch (err) {}
  try {
    await db.execute(`ALTER TABLE voucher_receipt_details ADD COLUMN receipt_doc_date TEXT`);
  } catch (err) {}
  try {
    await db.execute(`ALTER TABLE voucher_cost_centres ADD COLUMN cost_category_id INTEGER`);
  } catch (err) {}

  await db.execute(`
    CREATE TABLE IF NOT EXISTS voucher_item_excise (
      item_excise_id            INTEGER PRIMARY KEY AUTOINCREMENT,
      voucher_id                INTEGER NOT NULL REFERENCES vouchers(voucher_id) ON DELETE CASCADE,
      stock_entry_id            INTEGER NOT NULL REFERENCES voucher_stock_entries(stock_entry_id) ON DELETE CASCADE,
      sales_invoice_number      TEXT,
      sales_invoice_date        TEXT,
      excise_sales_invoice      TEXT,
      rate_of_duty              TEXT,
      rate_per_unit             TEXT,
      supplier_duty_amount      TEXT,
      mfgr_importer_duty_amount TEXT
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
      account_number    TEXT,
      ifsc_code         TEXT,
      payment_gateway   TEXT,
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

  await db.execute(`
    CREATE TABLE IF NOT EXISTS voucher_credit_note_details (
      id                      INTEGER PRIMARY KEY AUTOINCREMENT,
      voucher_id              INTEGER NOT NULL REFERENCES vouchers(voucher_id) ON DELETE CASCADE,
      tracking_no             TEXT,
      dispatch_doc_no         TEXT,
      dispatched_through      TEXT,
      destination             TEXT,
      carrier_name            TEXT,
      bill_of_lading_no       TEXT,
      bill_of_lading_date     TEXT,
      motor_vehicle_no        TEXT,
      original_invoice_no     TEXT,
      original_invoice_date   TEXT,
      reason_for_issuing_note TEXT,
      supplier_note_no        TEXT,
      supplier_note_date      TEXT,
      nature_of_return        TEXT
    )
  `);

  // Excise "Tax Details" sub-screen (Credit Note): inspection document no./date.
  await db.execute(`
    CREATE TABLE IF NOT EXISTS voucher_excise_details (
      id                       INTEGER PRIMARY KEY AUTOINCREMENT,
      voucher_id               INTEGER NOT NULL REFERENCES vouchers(voucher_id) ON DELETE CASCADE,
      inspection_document_no   TEXT,
      inspection_document_date TEXT
    )
  `);

  // Columns added later — ALTER for DBs created before they existed.
  try {
    await db.execute(
      `ALTER TABLE voucher_credit_note_details ADD COLUMN reason_for_issuing_note TEXT`,
    );
  } catch (err) {}
  try {
    await db.execute(`ALTER TABLE voucher_credit_note_details ADD COLUMN supplier_note_no TEXT`);
  } catch (err) {}
  try {
    await db.execute(`ALTER TABLE voucher_credit_note_details ADD COLUMN supplier_note_date TEXT`);
  } catch (err) {}
  try {
    await db.execute(`ALTER TABLE voucher_credit_note_details ADD COLUMN nature_of_return TEXT`);
  } catch (err) {}

  await db.execute(`
    CREATE TABLE IF NOT EXISTS voucher_debit_note_details (
      id                      INTEGER PRIMARY KEY AUTOINCREMENT,
      voucher_id              INTEGER NOT NULL REFERENCES vouchers(voucher_id) ON DELETE CASCADE,
      tracking_no             TEXT,
      dispatch_doc_no         TEXT,
      dispatched_through      TEXT,
      destination             TEXT,
      carrier_name            TEXT,
      bill_of_lading_no       TEXT,
      bill_of_lading_date     TEXT,
      motor_vehicle_no        TEXT,
      original_invoice_no     TEXT,
      original_invoice_date   TEXT,
      date_time_of_invoice    TEXT,
      date_time_of_removal    TEXT,
      reason_for_issuing_note TEXT,
      supplier_note_no        TEXT,
      supplier_note_date      TEXT,
      nature_of_return        TEXT
    )
  `);

  try {
    await db.execute(`ALTER TABLE voucher_debit_note_details ADD COLUMN date_time_of_invoice TEXT`);
  } catch (err) {}
  try {
    await db.execute(`ALTER TABLE voucher_debit_note_details ADD COLUMN date_time_of_removal TEXT`);
  } catch (err) {}
  try {
    await db.execute(
      `ALTER TABLE voucher_debit_note_details ADD COLUMN reason_for_issuing_note TEXT`,
    );
  } catch (err) {}
  try {
    await db.execute(`ALTER TABLE voucher_debit_note_details ADD COLUMN supplier_note_no TEXT`);
  } catch (err) {}
  try {
    await db.execute(`ALTER TABLE voucher_debit_note_details ADD COLUMN supplier_note_date TEXT`);
  } catch (err) {}
  try {
    await db.execute(`ALTER TABLE voucher_debit_note_details ADD COLUMN nature_of_return TEXT`);
  } catch (err) {}

  // Purchase (excise) "Manufacturer / Importer Details" popup (after Party Details).
  await db.execute(`
    CREATE TABLE IF NOT EXISTS voucher_manufacturer_importer_details (
      id                     INTEGER PRIMARY KEY AUTOINCREMENT,
      voucher_id             INTEGER NOT NULL REFERENCES vouchers(voucher_id) ON DELETE CASCADE,
      name                   TEXT,
      address_type           TEXT,
      address                TEXT,
      excise_regn_no         TEXT,
      importer_exporter_code TEXT,
      excise_range           TEXT,
      division               TEXT,
      commissionerate        TEXT,
      invoice_no             TEXT,
      invoice_date           TEXT
    )
  `);

  // "Provide GST/e-Way Bill details" Statutory Details (Sales/Credit Note/Debit Note).
  await db.execute(`
    CREATE TABLE IF NOT EXISTS voucher_gst_eway_details (
      id                      INTEGER PRIMARY KEY AUTOINCREMENT,
      voucher_id              INTEGER NOT NULL REFERENCES vouchers(voucher_id) ON DELETE CASCADE,
      reason_for_issuing_note TEXT,
      buyers_note_no          TEXT,
      buyers_note_date        TEXT,
      eway_bill_no            TEXT,
      eway_bill_date          TEXT,
      dispatch_from           TEXT,
      ship_to                 TEXT,
      transporter_name        TEXT,
      transporter_id          TEXT,
      mode                    TEXT,
      doc_lading_no           TEXT,
      doc_lading_date         TEXT,
      vehicle_number          TEXT,
      vehicle_type            TEXT
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS voucher_vat_details (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      voucher_id    INTEGER NOT NULL REFERENCES vouchers(voucher_id) ON DELETE CASCADE,
      date_time     TEXT,
      point_of_sale TEXT
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS voucher_order_details (
      id                    INTEGER PRIMARY KEY AUTOINCREMENT,
      voucher_id            INTEGER NOT NULL REFERENCES vouchers(voucher_id) ON DELETE CASCADE,
      order_nos             TEXT,
      order_date            TEXT,
      source_godown_id      INTEGER,
      source_godown_name    TEXT,
      mode_terms_of_payment TEXT,
      other_references      TEXT,
      terms_of_delivery     TEXT,
      challan_nos           TEXT,
      dispatched_through    TEXT,
      destination           TEXT,
      carrier_name          TEXT,
      bill_of_lading_no     TEXT,
      bill_of_lading_date   TEXT,
      motor_vehicle_no      TEXT
    )
  `);

  try {
    await db.execute(`ALTER TABLE voucher_order_details ADD COLUMN source_godown_id INTEGER`);
  } catch (err) {}
  try {
    await db.execute(`ALTER TABLE voucher_order_details ADD COLUMN source_godown_name TEXT`);
  } catch (err) {}

  // Add new columns to existing tables (fail silently if already exist)
  try {
    await db.execute(`ALTER TABLE voucher_dispatch_details ADD COLUMN delivery_note_nos TEXT`);
  } catch (err) {}
  try {
    await db.execute(`ALTER TABLE voucher_dispatch_details ADD COLUMN dispatch_doc_no TEXT`);
  } catch (err) {}
  try {
    await db.execute(`ALTER TABLE voucher_dispatch_details ADD COLUMN dispatched_through TEXT`);
  } catch (err) {}
  try {
    await db.execute(`ALTER TABLE voucher_dispatch_details ADD COLUMN destination TEXT`);
  } catch (err) {}
  try {
    await db.execute(`ALTER TABLE voucher_dispatch_details ADD COLUMN carrier_name TEXT`);
  } catch (err) {}
  try {
    await db.execute(`ALTER TABLE voucher_dispatch_details ADD COLUMN bill_of_lading_no TEXT`);
  } catch (err) {}
  try {
    await db.execute(`ALTER TABLE voucher_dispatch_details ADD COLUMN bill_of_lading_date TEXT`);
  } catch (err) {}
  try {
    await db.execute(`ALTER TABLE voucher_dispatch_details ADD COLUMN motor_vehicle_no TEXT`);
  } catch (err) {}

  try {
    await db.execute(`ALTER TABLE vouchers ADD COLUMN status TEXT DEFAULT 'Regular'`);
  } catch (err) {}

  try {
    await db.execute(`ALTER TABLE vouchers ADD COLUMN supplier_invoice_no TEXT`);
  } catch (err) {}

  try {
    await db.execute(`ALTER TABLE vouchers ADD COLUMN supplier_invoice_date TEXT`);
  } catch (err) {}

  // Reversing Journal "Applicable Upto" date — ALTER for DBs created before it existed.
  try {
    await db.execute(`ALTER TABLE vouchers ADD COLUMN applicable_upto TEXT`);
  } catch (err) {}

  // Selected Voucher Type Class ("Name of Class") — stored by name on the voucher row.
  try {
    await db.execute(`ALTER TABLE vouchers ADD COLUMN voucher_class TEXT`);
  } catch (err) {}

  // Sales/Purchase ledger on non-accounting inventory vouchers (e.g. Receipt Note's
  // "Purchase ledger") — stored on the voucher row, NOT posted as an accounting entry,
  // so ledger balances are unaffected.
  try {
    await db.execute(`ALTER TABLE vouchers ADD COLUMN sales_purchase_ledger_id INTEGER`);
  } catch (err) {}

  // GST snapshot (immutable after save): the registration/state/interstate-flag captured
  // when the voucher was first saved. Edits validate against THESE, never the company's
  // current default — so changing the default never alters an existing voucher's GST.
  try {
    await db.execute(`ALTER TABLE vouchers ADD COLUMN gst_registration_id INTEGER`);
  } catch (err) {}
  try {
    await db.execute(`ALTER TABLE vouchers ADD COLUMN company_state TEXT`);
  } catch (err) {}
  try {
    await db.execute(`ALTER TABLE vouchers ADD COLUMN is_interstate INTEGER DEFAULT 0`);
  } catch (err) {}
  try {
    await db.execute(`ALTER TABLE vouchers ADD COLUMN supply_type TEXT`);
  } catch (err) {}

  try {
    await db.execute(`ALTER TABLE voucher_bank_details ADD COLUMN cheque_range TEXT`);
  } catch (err) {}

  try {
    await db.execute(`ALTER TABLE voucher_bank_details ADD COLUMN account_number TEXT`);
  } catch (err) {}

  try {
    await db.execute(`ALTER TABLE voucher_bank_details ADD COLUMN ifsc_code TEXT`);
  } catch (err) {}

  try {
    await db.execute(`ALTER TABLE voucher_bank_details ADD COLUMN payment_gateway TEXT`);
  } catch (err) {}

  try {
    await db.execute(`ALTER TABLE voucher_stock_entries ADD COLUMN is_source INTEGER DEFAULT 0`);
  } catch (err) {}

  await db.execute(`
    CREATE TABLE IF NOT EXISTS voucher_payroll_entries (
      payroll_entry_id  INTEGER PRIMARY KEY AUTOINCREMENT,
      voucher_id        INTEGER NOT NULL REFERENCES vouchers(voucher_id) ON DELETE CASCADE,
      employee_id       INTEGER REFERENCES employees(employee_id),
      pay_head_id       INTEGER REFERENCES pay_heads(pay_head_id),
      amount            REAL DEFAULT 0
    )
  `);
};

module.exports = { init };
