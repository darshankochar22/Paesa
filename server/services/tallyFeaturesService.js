const { db } = require('../db/index');

const seedDefaultFeatures = async (company_id) => {
  await db.execute(
    `INSERT INTO tally_features (
      company_id,
      maintain_accounts, enable_bill_wise_entry, enable_cost_centres,
      maintain_inventory, integrate_accounts_with_inventory, enable_multiple_price_levels,
      enable_batches, maintain_expiry_date_for_batches, use_discount_column_in_invoices,
      use_separate_actual_billed_qty, enable_gst, set_alter_company_gst_details,
      enable_tds, enable_tcs, enable_browser_access_for_reports,
      enable_tally_net_services, enable_payment_request_qr,
      enable_multiple_addresses, mark_modified_vouchers
    ) VALUES (?, 1, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0)`,
    [company_id]
  );
};

module.exports = {
  seedDefaultFeatures,

  get: async (company_id) => {
    try {
      const result = await db.execute(
        `SELECT * FROM tally_features WHERE company_id = ?`,
        [company_id]
      );
      if (result.rows.length === 0) return { success: false, error: 'Features not found' };
      return { success: true, features: result.rows[0] };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  update: async (data) => {
    try {
      const existing = await db.execute(
        `SELECT * FROM tally_features WHERE company_id = ?`,
        [data.company_id]
      );
      if (existing.rows.length === 0) return { success: false, error: 'Features not found' };

      const current = existing.rows[0];
      await db.execute(
        `UPDATE tally_features SET
          maintain_accounts = ?,
          enable_bill_wise_entry = ?,
          enable_cost_centres = ?,
          maintain_inventory = ?,
          integrate_accounts_with_inventory = ?,
          enable_multiple_price_levels = ?,
          enable_batches = ?,
          maintain_expiry_date_for_batches = ?,
          use_discount_column_in_invoices = ?,
          use_separate_actual_billed_qty = ?,
          enable_gst = ?,
          set_alter_company_gst_details = ?,
          enable_tds = ?,
          enable_tcs = ?,
          enable_browser_access_for_reports = ?,
          enable_tally_net_services = ?,
          enable_payment_request_qr = ?,
          enable_multiple_addresses = ?,
          mark_modified_vouchers = ?,
          updated_at = datetime('now')
         WHERE company_id = ?`,
        [
          data.maintain_accounts ?? current.maintain_accounts,
          data.enable_bill_wise_entry ?? current.enable_bill_wise_entry,
          data.enable_cost_centres ?? current.enable_cost_centres,
          data.maintain_inventory ?? current.maintain_inventory,
          data.integrate_accounts_with_inventory ?? current.integrate_accounts_with_inventory,
          data.enable_multiple_price_levels ?? current.enable_multiple_price_levels,
          data.enable_batches ?? current.enable_batches,
          data.maintain_expiry_date_for_batches ?? current.maintain_expiry_date_for_batches,
          data.use_discount_column_in_invoices ?? current.use_discount_column_in_invoices,
          data.use_separate_actual_billed_qty ?? current.use_separate_actual_billed_qty,
          data.enable_gst ?? current.enable_gst,
          data.set_alter_company_gst_details ?? current.set_alter_company_gst_details,
          data.enable_tds ?? current.enable_tds,
          data.enable_tcs ?? current.enable_tcs,
          data.enable_browser_access_for_reports ?? current.enable_browser_access_for_reports,
          data.enable_tally_net_services ?? current.enable_tally_net_services,
          data.enable_payment_request_qr ?? current.enable_payment_request_qr,
          data.enable_multiple_addresses ?? current.enable_multiple_addresses,
          data.mark_modified_vouchers ?? current.mark_modified_vouchers,
          data.company_id,
        ]
      );

      const updated = await db.execute(
        `SELECT * FROM tally_features WHERE company_id = ?`,
        [data.company_id]
      );
      return { success: true, features: updated.rows[0] };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  reset: async (company_id) => {
    try {
      const existing = await db.execute(
        `SELECT * FROM tally_features WHERE company_id = ?`,
        [company_id]
      );
      if (existing.rows.length === 0) return { success: false, error: 'Features not found' };

      await db.execute(
        `UPDATE tally_features SET
          maintain_accounts = 1, enable_bill_wise_entry = 0, enable_cost_centres = 0,
          maintain_inventory = 1, integrate_accounts_with_inventory = 1,
          enable_multiple_price_levels = 0, enable_batches = 0,
          maintain_expiry_date_for_batches = 0, use_discount_column_in_invoices = 0,
          use_separate_actual_billed_qty = 0, enable_gst = 0,
          set_alter_company_gst_details = 0, enable_tds = 0, enable_tcs = 0,
          enable_browser_access_for_reports = 0, enable_tally_net_services = 0,
          enable_payment_request_qr = 0, enable_multiple_addresses = 0,
          mark_modified_vouchers = 0, updated_at = datetime('now')
         WHERE company_id = ?`,
        [company_id]
      );

      const updated = await db.execute(
        `SELECT * FROM tally_features WHERE company_id = ?`,
        [company_id]
      );
      return { success: true, features: updated.rows[0] };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },
};