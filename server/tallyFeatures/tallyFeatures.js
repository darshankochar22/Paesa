const init = async (db) => {
  await db.execute(`
    CREATE TABLE IF NOT EXISTS tally_features (
      tally_feature_id                    INTEGER PRIMARY KEY AUTOINCREMENT,
      company_id                          INTEGER NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
      maintain_accounts                   INTEGER DEFAULT 1,
      enable_bill_wise_entry              INTEGER DEFAULT 0,
      enable_cost_centres                 INTEGER DEFAULT 0,
      enable_interest_calculation         INTEGER DEFAULT 0,
      maintain_inventory                  INTEGER DEFAULT 1,
      integrate_accounts_with_inventory   INTEGER DEFAULT 1,
      enable_multiple_price_levels        INTEGER DEFAULT 0,
      enable_batches                      INTEGER DEFAULT 0,
      maintain_expiry_date_for_batches    INTEGER DEFAULT 0,
      enable_job_order_processing         INTEGER DEFAULT 0,
      enable_cost_tracking                INTEGER DEFAULT 0,
      enable_job_costing                  INTEGER DEFAULT 0,
      use_discount_column_in_invoices     INTEGER DEFAULT 0,
      use_separate_actual_billed_qty      INTEGER DEFAULT 0,
      use_debit_credit_notes              INTEGER DEFAULT 1,
      use_tracking_numbers                INTEGER DEFAULT 1,
      use_rejection_notes                 INTEGER DEFAULT 1,
      enable_gst                          INTEGER DEFAULT 1,
      set_alter_company_gst_details       INTEGER DEFAULT 0,
      enable_tds                          INTEGER DEFAULT 0,
      set_alter_tds_details               INTEGER DEFAULT 0,
      enable_tcs                          INTEGER DEFAULT 0,
      set_alter_tcs_details               INTEGER DEFAULT 0,
      enable_vat                          INTEGER DEFAULT 0,
      enable_excise                       INTEGER DEFAULT 0,
      enable_service_tax                  INTEGER DEFAULT 0,
      enable_browser_access_for_reports   INTEGER DEFAULT 0,
      enable_tally_net_services           INTEGER DEFAULT 0,
      maintain_payroll                    INTEGER DEFAULT 0,
      enable_payroll_statutory            INTEGER DEFAULT 0,
      set_alter_payroll_statutory_details INTEGER DEFAULT 0,
      enable_payment_request_qr           INTEGER DEFAULT 1,
      mark_modified_vouchers              INTEGER DEFAULT 0,
      created_at                          TEXT DEFAULT (datetime('now')),
      updated_at                          TEXT DEFAULT (datetime('now'))
    )
  `);

  // Idempotent column additions so databases created before these flags existed
  // pick them up. Ignored (via catch) when the column is already present.
  const migrations = [
    'ALTER TABLE tally_features ADD COLUMN enable_interest_calculation INTEGER DEFAULT 0',
    'ALTER TABLE tally_features ADD COLUMN enable_job_order_processing INTEGER DEFAULT 0',
    'ALTER TABLE tally_features ADD COLUMN enable_cost_tracking INTEGER DEFAULT 0',
    'ALTER TABLE tally_features ADD COLUMN enable_job_costing INTEGER DEFAULT 0',
    'ALTER TABLE tally_features ADD COLUMN enable_vat INTEGER DEFAULT 0',
    'ALTER TABLE tally_features ADD COLUMN enable_excise INTEGER DEFAULT 0',
    'ALTER TABLE tally_features ADD COLUMN enable_service_tax INTEGER DEFAULT 0',
    'ALTER TABLE tally_features ADD COLUMN maintain_payroll INTEGER DEFAULT 0',
    'ALTER TABLE tally_features ADD COLUMN enable_payroll_statutory INTEGER DEFAULT 0',
    // "Set/Alter Details" momentary sub-flags (TDS/TCS/Payroll) — mirror GST's.
    'ALTER TABLE tally_features ADD COLUMN set_alter_tds_details INTEGER DEFAULT 0',
    'ALTER TABLE tally_features ADD COLUMN set_alter_tcs_details INTEGER DEFAULT 0',
    'ALTER TABLE tally_features ADD COLUMN set_alter_payroll_statutory_details INTEGER DEFAULT 0',
    // Voucher-type availability toggles — DEFAULT 1 so existing DBs keep those
    // vouchers available (turning a flag off hides its voucher types).
    'ALTER TABLE tally_features ADD COLUMN use_debit_credit_notes INTEGER DEFAULT 1',
    'ALTER TABLE tally_features ADD COLUMN use_tracking_numbers INTEGER DEFAULT 1',
    'ALTER TABLE tally_features ADD COLUMN use_rejection_notes INTEGER DEFAULT 1',
  ];

  for (const sql of migrations) {
    try {
      await db.execute(sql);
    } catch (err) {
      // Ignored if column already exists
    }
  }

  // One-time backfill: enable_gst is now a COMPUTATION gate, not just a UI toggle.
  // Databases created before this change stored 0 (the old UI-only default) yet
  // were still computing GST — so flip existing rows to 1 once, keeping their GST
  // computing. Guarded by a marker column: the UPDATE only runs on the same pass
  // that first adds the column, so a user's later deliberate "GST = No" is never
  // re-flipped on subsequent startups.
  try {
    await db.execute(`ALTER TABLE tally_features ADD COLUMN gst_gate_backfilled INTEGER DEFAULT 0`);
    // Column was just created ⇒ first run of this migration ⇒ backfill.
    await db.execute(`UPDATE tally_features SET enable_gst = 1 WHERE enable_gst = 0`);
    await db.execute(`UPDATE tally_features SET gst_gate_backfilled = 1`);
  } catch (err) {
    // Column already exists ⇒ backfill already ran ⇒ do nothing.
  }
};

module.exports = { init };
