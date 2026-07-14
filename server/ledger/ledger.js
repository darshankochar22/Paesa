const init = async (db) => {
  await db.execute(`
    CREATE TABLE IF NOT EXISTS ledgers (
      ledger_id                   INTEGER PRIMARY KEY AUTOINCREMENT,
      company_id                  INTEGER NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
      group_id                    INTEGER REFERENCES groups(group_id),
      name                        TEXT NOT NULL,
      alias                       TEXT,
      ledger_type                 TEXT DEFAULT 'General',
      nature                      TEXT,
      opening_balance             REAL DEFAULT 0,
      closing_balance             REAL DEFAULT 0,
      is_bill_wise                INTEGER DEFAULT 0,
      maintain_inventory_values   INTEGER DEFAULT 0,
      mailing_name                TEXT,
      address1                    TEXT,
      address2                    TEXT,
      city                        TEXT,
      state                       TEXT,
      country                     TEXT,
      pincode                     TEXT,
      phone                       TEXT,
      email                       TEXT,
      gstin                       TEXT,
      pan                         TEXT,
      registration_type           TEXT DEFAULT 'Unregistered',
      allow_cost_centres          INTEGER DEFAULT 0,
      default_credit_period       INTEGER DEFAULT 0,
      check_credit_days           INTEGER DEFAULT 0,
      invoice_rounding            INTEGER DEFAULT 0,
      rounding_method             TEXT,
      rounding_limit              REAL DEFAULT 0,
      additional_gst_details      INTEGER DEFAULT 0,
      service_tax_details         INTEGER DEFAULT 0,
      include_assessable_value    TEXT DEFAULT 'Not Applicable',
      method_of_calculation       TEXT DEFAULT 'Based on Value',
      other_statutory_details     INTEGER DEFAULT 0,
      activate_interest           INTEGER DEFAULT 0,
      interest_include_added      INTEGER DEFAULT 0,
      interest_include_deducted   INTEGER DEFAULT 0,
      interest_rate               REAL DEFAULT 0,
      interest_style              TEXT DEFAULT '30-Day Month',
      interest_balances           TEXT DEFAULT 'All Balances',
      is_active                   INTEGER DEFAULT 1,
      is_predefined               INTEGER DEFAULT 0,
      created_at                  TEXT DEFAULT (datetime('now')),
      updated_at                  TEXT DEFAULT (datetime('now'))
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS ledger_bank_details (
      id                            INTEGER PRIMARY KEY AUTOINCREMENT,
      ledger_id                     INTEGER NOT NULL REFERENCES ledgers(ledger_id) ON DELETE CASCADE,
      account_holder_name           TEXT,
      account_number                TEXT,
      ifsc_code                     TEXT,
      swift_code                    TEXT,
      bank_name                     TEXT,
      branch_name                   TEXT,
      bank_configuration            TEXT,
      cheque_book_start_no          TEXT,
      cheque_book_end_no            TEXT,
      enable_cheque_printing        INTEGER DEFAULT 0,
      cheque_printing_configuration TEXT,
      od_limit                      REAL DEFAULT 0,
      transaction_type              TEXT
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS ledger_statutory_details (
      id                          INTEGER PRIMARY KEY AUTOINCREMENT,
      ledger_id                   INTEGER NOT NULL REFERENCES ledgers(ledger_id) ON DELETE CASCADE,
      gst_applicability           TEXT DEFAULT 'Not Applicable',
      hsn_sac_code                TEXT,
      hsn_sac_description         TEXT,
      gst_rate                    REAL DEFAULT 0,
      cgst_rate                   REAL DEFAULT 0,
      sgst_rate                   REAL DEFAULT 0,
      igst_rate                   REAL DEFAULT 0,
      type_of_duty_tax            TEXT,
      percentage_of_calculation   REAL DEFAULT 0,
      statutory_details           TEXT
    )
  `);

  // F11 "Enable multiple addresses": extra named addresses per party ledger.
  await db.execute(`
    CREATE TABLE IF NOT EXISTS ledger_addresses (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      ledger_id     INTEGER NOT NULL REFERENCES ledgers(ledger_id) ON DELETE CASCADE,
      address_type  TEXT,
      mailing_name  TEXT,
      address1      TEXT,
      address2      TEXT,
      city          TEXT,
      state         TEXT,
      country       TEXT,
      pincode       TEXT,
      phone         TEXT,
      email         TEXT,
      gstin         TEXT,
      is_default    INTEGER DEFAULT 0,
      display_order INTEGER DEFAULT 0
    )
  `);

  try {
    await db.execute(`
      ALTER TABLE ledger_bank_details
      ADD COLUMN transaction_type TEXT
    `);
  } catch (err) {}

  try {
    await db.execute(`
      ALTER TABLE ledger_bank_details
      ADD COLUMN cross_using TEXT DEFAULT 'A/c Payee'
    `);
  } catch (err) {}

  try {
    await db.execute(`
      ALTER TABLE ledger_bank_details
      ADD COLUMN company_bank TEXT
    `);
  } catch (err) {}

  try {
    await db.execute(`
      ALTER TABLE ledger_bank_details
      ADD COLUMN cheque_ranges TEXT
    `);
  } catch (err) {}

  try {
    await db.execute(`ALTER TABLE ledgers ADD COLUMN default_credit_period INTEGER DEFAULT 0`);
  } catch (err) {}

  try {
    await db.execute(`ALTER TABLE ledgers ADD COLUMN check_credit_days INTEGER DEFAULT 0`);
  } catch (err) {}

  try {
    await db.execute(`ALTER TABLE ledgers ADD COLUMN credit_limit REAL DEFAULT 0`);
  } catch (err) {}

  try {
    await db.execute(`ALTER TABLE ledgers ADD COLUMN credit_limit_type TEXT DEFAULT 'Cr'`);
  } catch (err) {}

  try {
    await db.execute(`ALTER TABLE ledgers ADD COLUMN allow_cost_centres INTEGER DEFAULT 0`);
  } catch (err) {}

  try {
    await db.execute(`ALTER TABLE ledgers ADD COLUMN invoice_rounding INTEGER DEFAULT 0`);
  } catch (err) {}
  try {
    await db.execute(`ALTER TABLE ledgers ADD COLUMN rounding_method TEXT`);
  } catch (err) {}
  try {
    await db.execute(`ALTER TABLE ledgers ADD COLUMN rounding_limit REAL DEFAULT 0`);
  } catch (err) {}

  try {
    await db.execute(`ALTER TABLE ledgers ADD COLUMN additional_gst_details INTEGER DEFAULT 0`);
  } catch (err) {}

  try {
    await db.execute(`ALTER TABLE ledgers ADD COLUMN service_tax_details INTEGER DEFAULT 0`);
  } catch (err) {}

  try {
    await db.execute(
      `ALTER TABLE ledgers ADD COLUMN include_assessable_value TEXT DEFAULT 'Not Applicable'`,
    );
  } catch (err) {}

  try {
    await db.execute(
      `ALTER TABLE ledgers ADD COLUMN method_of_calculation TEXT DEFAULT 'Based on Value'`,
    );
  } catch (err) {}

  try {
    await db.execute(`ALTER TABLE ledgers ADD COLUMN other_statutory_details INTEGER DEFAULT 0`);
  } catch (err) {}

  try {
    await db.execute(
      `ALTER TABLE ledger_statutory_details ADD COLUMN include_in_assessable_value_calculation TEXT DEFAULT 'Not Applicable'`,
    );
  } catch (err) {}

  try {
    await db.execute(
      `ALTER TABLE ledger_statutory_details ADD COLUMN appropriate_to TEXT DEFAULT 'Goods'`,
    );
  } catch (err) {}

  try {
    await db.execute(
      `ALTER TABLE ledger_statutory_details ADD COLUMN method_of_calculation TEXT DEFAULT 'Based on Quantity'`,
    );
  } catch (err) {}

  // Other statutory details (TDS / TCS / Service Tax / Excise / VAT)
  try {
    await db.execute(`ALTER TABLE ledgers ADD COLUMN set_alter_tds_details INTEGER DEFAULT 0`);
  } catch (err) {}
  try {
    await db.execute(`ALTER TABLE ledgers ADD COLUMN set_alter_tcs_details INTEGER DEFAULT 0`);
  } catch (err) {}
  try {
    await db.execute(
      `ALTER TABLE ledgers ADD COLUMN set_alter_service_tax_details INTEGER DEFAULT 0`,
    );
  } catch (err) {}
  try {
    await db.execute(`ALTER TABLE ledgers ADD COLUMN set_alter_excise_details INTEGER DEFAULT 0`);
  } catch (err) {}
  try {
    await db.execute(`ALTER TABLE ledgers ADD COLUMN set_alter_vat_details INTEGER DEFAULT 0`);
  } catch (err) {}
  try {
    await db.execute(`ALTER TABLE ledgers ADD COLUMN is_tds_deductable INTEGER DEFAULT 0`);
  } catch (err) {}
  try {
    await db.execute(`ALTER TABLE ledgers ADD COLUMN treat_as_tds_expenses INTEGER DEFAULT 0`);
  } catch (err) {}
  try {
    await db.execute(`ALTER TABLE ledgers ADD COLUMN deductee_type TEXT`);
  } catch (err) {}
  try {
    await db.execute(`ALTER TABLE ledgers ADD COLUMN deduct_tds_in_same_voucher INTEGER DEFAULT 0`);
  } catch (err) {}
  try {
    await db.execute(`ALTER TABLE ledgers ADD COLUMN nature_of_payment TEXT`);
  } catch (err) {}
  try {
    await db.execute(`ALTER TABLE ledgers ADD COLUMN tds_pan_it_no TEXT`);
  } catch (err) {}
  try {
    await db.execute(`ALTER TABLE ledgers ADD COLUMN tds_pan_status TEXT`);
  } catch (err) {}
  try {
    await db.execute(`ALTER TABLE ledgers ADD COLUMN tds_pan_effective_date TEXT`);
  } catch (err) {}
  try {
    await db.execute(`ALTER TABLE ledgers ADD COLUMN tds_name_on_pan TEXT`);
  } catch (err) {}
  try {
    await db.execute(`ALTER TABLE ledgers ADD COLUMN is_tcs_applicable INTEGER DEFAULT 0`);
  } catch (err) {}
  try {
    await db.execute(`ALTER TABLE ledgers ADD COLUMN tcs_buyer_lessee_type TEXT`);
  } catch (err) {}
  try {
    await db.execute(`ALTER TABLE ledgers ADD COLUMN tcs_pan_it_no TEXT`);
  } catch (err) {}
  try {
    await db.execute(`ALTER TABLE ledgers ADD COLUMN tcs_pan_status TEXT`);
  } catch (err) {}
  try {
    await db.execute(`ALTER TABLE ledgers ADD COLUMN tcs_name_on_pan TEXT`);
  } catch (err) {}
  try {
    await db.execute(`ALTER TABLE ledgers ADD COLUMN tcs_nature_of_goods TEXT`);
  } catch (err) {}
  try {
    await db.execute(`ALTER TABLE ledgers ADD COLUMN is_service_tax_applicable TEXT`);
  } catch (err) {}
  try {
    await db.execute(`ALTER TABLE ledgers ADD COLUMN is_tds_applicable TEXT`);
  } catch (err) {}
  try {
    await db.execute(`ALTER TABLE ledgers ADD COLUMN is_excise_applicable TEXT`);
  } catch (err) {}
  try {
    await db.execute(`ALTER TABLE ledgers ADD COLUMN is_vat_cst_applicable TEXT`);
  } catch (err) {}
  try {
    await db.execute(`ALTER TABLE ledgers ADD COLUMN deductee_ref TEXT`);
  } catch (err) {}
  try {
    await db.execute(`ALTER TABLE ledgers ADD COLUMN tax_unique_id_no TEXT`);
  } catch (err) {}

  // Payment Gateway
  try {
    await db.execute(`ALTER TABLE ledgers ADD COLUMN behave_as_payment_gateway INTEGER DEFAULT 0`);
  } catch (err) {}
  try {
    await db.execute(`ALTER TABLE ledgers ADD COLUMN payment_gateway_name TEXT`);
  } catch (err) {}

  // GST additional details
  try {
    await db.execute(`ALTER TABLE ledgers ADD COLUMN place_of_supply TEXT`);
  } catch (err) {}
  try {
    await db.execute(`ALTER TABLE ledgers ADD COLUMN is_party_a_transporter TEXT DEFAULT 'No'`);
  } catch (err) {}
  try {
    await db.execute(`ALTER TABLE ledgers ADD COLUMN transporter_id TEXT`);
  } catch (err) {}

  try {
    await db.execute(
      `ALTER TABLE ledger_statutory_details ADD COLUMN hsn_sac_source TEXT DEFAULT 'As per Company/Group'`,
    );
  } catch (err) {}
  try {
    await db.execute(
      `ALTER TABLE ledger_statutory_details ADD COLUMN gst_rate_source TEXT DEFAULT 'As per Company/Group'`,
    );
  } catch (err) {}
  try {
    await db.execute(`ALTER TABLE ledger_statutory_details ADD COLUMN taxability_type TEXT`);
  } catch (err) {}
  try {
    await db.execute(
      `ALTER TABLE ledger_statutory_details ADD COLUMN type_of_supply TEXT DEFAULT 'Services'`,
    );
  } catch (err) {}
  // Duties & Taxes (#154) per-duty-type sub-fields.
  try {
    await db.execute(`ALTER TABLE ledger_statutory_details ADD COLUMN duty_head TEXT`);
  } catch (err) {}
  try {
    await db.execute(`ALTER TABLE ledger_statutory_details ADD COLUMN gst_tax_type TEXT`);
  } catch (err) {}
  try {
    await db.execute(`ALTER TABLE ledger_statutory_details ADD COLUMN service_tax_head TEXT`);
  } catch (err) {}
  try {
    await db.execute(`ALTER TABLE ledger_statutory_details ADD COLUMN nature_of_goods TEXT`);
  } catch (err) {}
  try {
    await db.execute(`ALTER TABLE ledger_statutory_details ADD COLUMN valuation_type TEXT`);
  } catch (err) {}
  try {
    await db.execute(
      `ALTER TABLE ledger_statutory_details ADD COLUMN rate_per_unit REAL DEFAULT 0`,
    );
  } catch (err) {}
  try {
    await db.execute(
      `ALTER TABLE ledger_statutory_details ADD COLUMN rounding_limit REAL DEFAULT 0`,
    );
  } catch (err) {}

  // Service Tax registration details
  try {
    await db.execute(`ALTER TABLE ledgers ADD COLUMN service_tax_registration_number TEXT`);
  } catch (err) {}
  try {
    await db.execute(`ALTER TABLE ledgers ADD COLUMN type_of_service TEXT DEFAULT 'Undefined'`);
  } catch (err) {}
  try {
    await db.execute(`ALTER TABLE ledgers ADD COLUMN notification_number TEXT`);
  } catch (err) {}
  try {
    await db.execute(`ALTER TABLE ledgers ADD COLUMN notification_serial_number TEXT`);
  } catch (err) {}
  try {
    await db.execute(
      `ALTER TABLE ledgers ADD COLUMN is_party_an_associated_enterprise TEXT DEFAULT 'No'`,
    );
  } catch (err) {}
  try {
    await db.execute(
      `ALTER TABLE ledgers ADD COLUMN does_party_belong_to_non_taxable_territory TEXT DEFAULT 'No'`,
    );
  } catch (err) {}

  // VAT details
  try {
    await db.execute(`ALTER TABLE ledgers ADD COLUMN vat_type_of_dealer TEXT DEFAULT 'Unknown'`);
  } catch (err) {}
  try {
    await db.execute(`ALTER TABLE ledgers ADD COLUMN vat_tin_no TEXT`);
  } catch (err) {}
  try {
    await db.execute(
      `ALTER TABLE ledgers ADD COLUMN sales_purchases_against_form_c TEXT DEFAULT 'No'`,
    );
  } catch (err) {}

  // Detailed Excise & VAT details
  try {
    await db.execute(`ALTER TABLE ledgers ADD COLUMN excise_tariff_name TEXT`);
  } catch (err) {}
  try {
    await db.execute(`ALTER TABLE ledgers ADD COLUMN excise_hsn_code TEXT`);
  } catch (err) {}
  try {
    await db.execute(
      `ALTER TABLE ledgers ADD COLUMN excise_reporting_uom TEXT DEFAULT 'Undefined'`,
    );
  } catch (err) {}
  try {
    await db.execute(
      `ALTER TABLE ledgers ADD COLUMN excise_valuation_type TEXT DEFAULT 'Undefined'`,
    );
  } catch (err) {}
  try {
    await db.execute(`ALTER TABLE ledgers ADD COLUMN excise_rate REAL DEFAULT 0`);
  } catch (err) {}
  try {
    await db.execute(`ALTER TABLE ledgers ADD COLUMN excise_rate_per_unit REAL DEFAULT 0`);
  } catch (err) {}
  try {
    await db.execute(
      `ALTER TABLE ledgers ADD COLUMN vat_nature_of_transaction TEXT DEFAULT 'Undefined'`,
    );
  } catch (err) {}
  try {
    await db.execute(`ALTER TABLE ledgers ADD COLUMN vat_tax_rate REAL DEFAULT 0`);
  } catch (err) {}
  try {
    await db.execute(`ALTER TABLE ledgers ADD COLUMN vat_tax_type TEXT DEFAULT 'Unknown'`);
  } catch (err) {}

  // TDS-specific deductee ref (separate from TCS's deductee_ref/tax_unique_id_no)
  try {
    await db.execute(`ALTER TABLE ledgers ADD COLUMN tds_deductee_ref TEXT`);
  } catch (err) {}
  try {
    await db.execute(`ALTER TABLE ledgers ADD COLUMN tds_tax_unique_id_no TEXT`);
  } catch (err) {}

  try {
    await db.execute(`ALTER TABLE ledgers ADD COLUMN activate_interest INTEGER DEFAULT 0`);
  } catch (err) {}
  try {
    await db.execute(`ALTER TABLE ledgers ADD COLUMN interest_include_added INTEGER DEFAULT 0`);
  } catch (err) {}
  try {
    await db.execute(`ALTER TABLE ledgers ADD COLUMN interest_include_deducted INTEGER DEFAULT 0`);
  } catch (err) {}
  try {
    await db.execute(`ALTER TABLE ledgers ADD COLUMN interest_rate REAL DEFAULT 0`);
  } catch (err) {}
  try {
    await db.execute(`ALTER TABLE ledgers ADD COLUMN interest_style TEXT DEFAULT '30-Day Month'`);
  } catch (err) {}
  try {
    await db.execute(
      `ALTER TABLE ledgers ADD COLUMN interest_balances TEXT DEFAULT 'All Balances'`,
    );
  } catch (err) {}
  try {
    await db.execute(`ALTER TABLE ledgers ADD COLUMN opening_balance_type TEXT DEFAULT 'Dr'`);
  } catch (err) {}
  try {
    await db.execute(
      `ALTER TABLE ledgers ADD COLUMN interest_calculate_on TEXT DEFAULT 'Bill-by-Bill'`,
    );
  } catch (err) {}
  try {
    await db.execute(
      `ALTER TABLE ledgers ADD COLUMN interest_applicable_from TEXT DEFAULT 'Due Date'`,
    );
  } catch (err) {}
  try {
    await db.execute(
      `ALTER TABLE ledgers ADD COLUMN interest_rounding_method TEXT DEFAULT 'No Rounding'`,
    );
  } catch (err) {}
  try {
    await db.execute(`ALTER TABLE ledgers ADD COLUMN interest_rounding_limit REAL DEFAULT 1`);
  } catch (err) {}
  try {
    await db.execute(`ALTER TABLE ledgers ADD COLUMN interest_rate_slabs TEXT`);
  } catch (err) {}

  // MSME (Micro, Small & Medium Enterprises) party registration details.
  // Set via Statutory Reports → MSME Reports → Update Party MSME Details.
  try {
    await db.execute(
      `ALTER TABLE ledgers ADD COLUMN msme_type_of_enterprise TEXT DEFAULT 'Not Applicable'`,
    );
  } catch (err) {}
  try {
    await db.execute(`ALTER TABLE ledgers ADD COLUMN msme_udyam_reg_no TEXT`);
  } catch (err) {}
  try {
    await db.execute(`ALTER TABLE ledgers ADD COLUMN msme_activity_type TEXT DEFAULT 'Unknown'`);
  } catch (err) {}
  try {
    await db.execute(`ALTER TABLE ledgers ADD COLUMN msme_effective_date TEXT`);
  } catch (err) {}
};

module.exports = { init };
