const { db } = require('../db/index');
const { sql, eq } = require('drizzle-orm');
const { tallyFeatures } = require('../db/schema');

// Fetch a single tally_features row in the legacy snake_case shape (or undefined).
const findRow = async (company_id) => {
  const rows = await db.all(
    sql`SELECT * FROM ${tallyFeatures} WHERE ${tallyFeatures.companyId} = ${company_id}`
  );
  return rows[0];
};

const seedDefaultFeatures = async (company_id) => {
  await db.insert(tallyFeatures).values({
    companyId: company_id,
    maintainAccounts: 1,
    enableBillWiseEntry: 0,
    enableCostCentres: 0,
    maintainInventory: 1,
    integrateAccountsWithInventory: 1,
    enableMultiplePriceLevels: 0,
    enableBatches: 0,
    maintainExpiryDateForBatches: 0,
    useDiscountColumnInInvoices: 0,
    useSeparateActualBilledQty: 0,
    enableGst: 0,
    setAlterCompanyGstDetails: 0,
    enableTds: 0,
    enableTcs: 0,
    enableBrowserAccessForReports: 0,
    enableTallyNetServices: 0,
    enablePaymentRequestQr: 0,
    enableMultipleAddresses: 0,
    markModifiedVouchers: 0,
  });
};

module.exports = {
  seedDefaultFeatures,

  get: async (company_id) => {
    try {
      const features = await findRow(company_id);
      if (!features) return { success: false, error: 'Features not found' };
      return { success: true, features };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  update: async (data) => {
    try {
      const current = await findRow(data.company_id);
      if (!current) return { success: false, error: 'Features not found' };

      await db
        .update(tallyFeatures)
        .set({
          maintainAccounts: data.maintain_accounts ?? current.maintain_accounts,
          enableBillWiseEntry: data.enable_bill_wise_entry ?? current.enable_bill_wise_entry,
          enableCostCentres: data.enable_cost_centres ?? current.enable_cost_centres,
          maintainInventory: data.maintain_inventory ?? current.maintain_inventory,
          integrateAccountsWithInventory:
            data.integrate_accounts_with_inventory ?? current.integrate_accounts_with_inventory,
          enableMultiplePriceLevels:
            data.enable_multiple_price_levels ?? current.enable_multiple_price_levels,
          enableBatches: data.enable_batches ?? current.enable_batches,
          maintainExpiryDateForBatches:
            data.maintain_expiry_date_for_batches ?? current.maintain_expiry_date_for_batches,
          useDiscountColumnInInvoices:
            data.use_discount_column_in_invoices ?? current.use_discount_column_in_invoices,
          useSeparateActualBilledQty:
            data.use_separate_actual_billed_qty ?? current.use_separate_actual_billed_qty,
          enableGst: data.enable_gst ?? current.enable_gst,
          setAlterCompanyGstDetails:
            data.set_alter_company_gst_details ?? current.set_alter_company_gst_details,
          enableTds: data.enable_tds ?? current.enable_tds,
          enableTcs: data.enable_tcs ?? current.enable_tcs,
          enableBrowserAccessForReports:
            data.enable_browser_access_for_reports ?? current.enable_browser_access_for_reports,
          enableTallyNetServices:
            data.enable_tally_net_services ?? current.enable_tally_net_services,
          enablePaymentRequestQr:
            data.enable_payment_request_qr ?? current.enable_payment_request_qr,
          enableMultipleAddresses:
            data.enable_multiple_addresses ?? current.enable_multiple_addresses,
          markModifiedVouchers: data.mark_modified_vouchers ?? current.mark_modified_vouchers,
          updatedAt: sql`datetime('now')`,
        })
        .where(eq(tallyFeatures.companyId, data.company_id));

      const updated = await findRow(data.company_id);
      return { success: true, features: updated };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  reset: async (company_id) => {
    try {
      const current = await findRow(company_id);
      if (!current) return { success: false, error: 'Features not found' };

      await db
        .update(tallyFeatures)
        .set({
          maintainAccounts: 1,
          enableBillWiseEntry: 0,
          enableCostCentres: 0,
          maintainInventory: 1,
          integrateAccountsWithInventory: 1,
          enableMultiplePriceLevels: 0,
          enableBatches: 0,
          maintainExpiryDateForBatches: 0,
          useDiscountColumnInInvoices: 0,
          useSeparateActualBilledQty: 0,
          enableGst: 0,
          setAlterCompanyGstDetails: 0,
          enableTds: 0,
          enableTcs: 0,
          enableBrowserAccessForReports: 0,
          enableTallyNetServices: 0,
          enablePaymentRequestQr: 0,
          enableMultipleAddresses: 0,
          markModifiedVouchers: 0,
          updatedAt: sql`datetime('now')`,
        })
        .where(eq(tallyFeatures.companyId, company_id));

      const updated = await findRow(company_id);
      return { success: true, features: updated };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },
};
