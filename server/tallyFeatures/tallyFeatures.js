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
      enable_gst                          INTEGER DEFAULT 0,
      set_alter_company_gst_details       INTEGER DEFAULT 0,
      enable_tds                          INTEGER DEFAULT 0,
      enable_tcs                          INTEGER DEFAULT 0,
      enable_vat                          INTEGER DEFAULT 0,
      enable_excise                       INTEGER DEFAULT 0,
      enable_service_tax                  INTEGER DEFAULT 0,
      enable_browser_access_for_reports   INTEGER DEFAULT 0,
      enable_tally_net_services           INTEGER DEFAULT 0,
      maintain_payroll                    INTEGER DEFAULT 0,
      enable_payroll_statutory            INTEGER DEFAULT 0,
      enable_payment_request_qr           INTEGER DEFAULT 1,
      enable_multiple_addresses           INTEGER DEFAULT 0,
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
  ];

  for (const sql of migrations) {
    try {
      await db.execute(sql);
    } catch (err) {
      // Ignored if column already exists
    }
  }
};

module.exports = { init };
