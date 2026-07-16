const { db } = require('../db/index');
const { sql, eq } = require('drizzle-orm');
const { tallyFeatures } = require('../db/schema');
const auditTrailService = require('../auditTrail/auditTrailService');

// Fetch a single tally_features row in the legacy snake_case shape (or undefined).
const findRow = async (company_id) => {
  const rows = await db.all(
    sql`SELECT * FROM ${tallyFeatures} WHERE ${tallyFeatures.companyId} = ${company_id}`,
  );
  return rows[0];
};

const seedDefaultFeatures = async (company_id) => {
  await db.insert(tallyFeatures).values({
    // Default-all-Yes: every real feature flag ON for a new company. The 4
    // "Set/Alter … Details" flags stay 0 — they are momentary triggers (forced
    // to 0 on save; Yes would pop their detail screens on the first Accept).
    companyId: company_id,
    maintainAccounts: 1,
    enableBillWiseEntry: 1,
    enableCostCentres: 1,
    enableInterestCalculation: 1,
    maintainInventory: 1,
    integrateAccountsWithInventory: 1,
    enableMultiplePriceLevels: 1,
    enableBatches: 1,
    maintainExpiryDateForBatches: 1,
    enableJobOrderProcessing: 1,
    enableCostTracking: 1,
    enableJobCosting: 1,
    useDiscountColumnInInvoices: 1,
    useSeparateActualBilledQty: 1,
    useDebitCreditNotes: 1,
    useTrackingNumbers: 1,
    useRejectionNotes: 1,
    enableGst: 1,
    setAlterCompanyGstDetails: 0,
    enableTds: 1,
    setAlterTdsDetails: 0,
    enableTcs: 1,
    setAlterTcsDetails: 0,
    enableVat: 1,
    enableExcise: 1,
    enableServiceTax: 1,
    enableBrowserAccessForReports: 1,
    enableTallyNetServices: 1,
    maintainPayroll: 1,
    enablePayrollStatutory: 1,
    setAlterPayrollStatutoryDetails: 0,
    enablePaymentRequestQr: 1,
    markModifiedVouchers: 1,
  });
};

module.exports = {
  seedDefaultFeatures,

  get: async (company_id) => {
    try {
      let features = await findRow(company_id);
      // Lazy-seed: companies created before feature seeding (or a failed seed)
      // have no row — create defaults on first read instead of erroring, so the
      // frontend always gets a real set of flags (not null).
      if (!features) {
        await seedDefaultFeatures(company_id);
        features = await findRow(company_id);
      }
      if (!features) return { success: false, error: 'Features not found' };
      return { success: true, features };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  update: async (data) => {
    try {
      let current = await findRow(data.company_id);
      // Lazy-seed a missing row so updates from the F11 popup always persist.
      if (!current) {
        await seedDefaultFeatures(data.company_id);
        current = await findRow(data.company_id);
      }
      if (!current) return { success: false, error: 'Features not found' };

      await db
        .update(tallyFeatures)
        .set({
          maintainAccounts: data.maintain_accounts ?? current.maintain_accounts,
          enableBillWiseEntry: data.enable_bill_wise_entry ?? current.enable_bill_wise_entry,
          enableCostCentres: data.enable_cost_centres ?? current.enable_cost_centres,
          enableInterestCalculation:
            data.enable_interest_calculation ?? current.enable_interest_calculation,
          maintainInventory: data.maintain_inventory ?? current.maintain_inventory,
          integrateAccountsWithInventory:
            data.integrate_accounts_with_inventory ?? current.integrate_accounts_with_inventory,
          enableMultiplePriceLevels:
            data.enable_multiple_price_levels ?? current.enable_multiple_price_levels,
          enableBatches: data.enable_batches ?? current.enable_batches,
          maintainExpiryDateForBatches:
            data.maintain_expiry_date_for_batches ?? current.maintain_expiry_date_for_batches,
          enableJobOrderProcessing:
            data.enable_job_order_processing ?? current.enable_job_order_processing,
          enableCostTracking: data.enable_cost_tracking ?? current.enable_cost_tracking,
          enableJobCosting: data.enable_job_costing ?? current.enable_job_costing,
          useDiscountColumnInInvoices:
            data.use_discount_column_in_invoices ?? current.use_discount_column_in_invoices,
          useSeparateActualBilledQty:
            data.use_separate_actual_billed_qty ?? current.use_separate_actual_billed_qty,
          useDebitCreditNotes: data.use_debit_credit_notes ?? current.use_debit_credit_notes,
          useTrackingNumbers: data.use_tracking_numbers ?? current.use_tracking_numbers,
          useRejectionNotes: data.use_rejection_notes ?? current.use_rejection_notes,
          enableGst: data.enable_gst ?? current.enable_gst,
          setAlterCompanyGstDetails:
            data.set_alter_company_gst_details ?? current.set_alter_company_gst_details,
          enableTds: data.enable_tds ?? current.enable_tds,
          setAlterTdsDetails: data.set_alter_tds_details ?? current.set_alter_tds_details,
          enableTcs: data.enable_tcs ?? current.enable_tcs,
          setAlterTcsDetails: data.set_alter_tcs_details ?? current.set_alter_tcs_details,
          enableVat: data.enable_vat ?? current.enable_vat,
          enableExcise: data.enable_excise ?? current.enable_excise,
          enableServiceTax: data.enable_service_tax ?? current.enable_service_tax,
          enableBrowserAccessForReports:
            data.enable_browser_access_for_reports ?? current.enable_browser_access_for_reports,
          enableTallyNetServices:
            data.enable_tally_net_services ?? current.enable_tally_net_services,
          maintainPayroll: data.maintain_payroll ?? current.maintain_payroll,
          enablePayrollStatutory: data.enable_payroll_statutory ?? current.enable_payroll_statutory,
          setAlterPayrollStatutoryDetails:
            data.set_alter_payroll_statutory_details ?? current.set_alter_payroll_statutory_details,
          enablePaymentRequestQr:
            data.enable_payment_request_qr ?? current.enable_payment_request_qr,
          markModifiedVouchers: data.mark_modified_vouchers ?? current.mark_modified_vouchers,
          updatedAt: sql`datetime('now')`,
        })
        .where(eq(tallyFeatures.companyId, data.company_id));

      const updated = await findRow(data.company_id);
      await auditTrailService.record({
        company_id: data.company_id,
        entity_type: 'tally_features',
        entity_id: data.company_id,
        action: 'update',
        before: current,
        after: updated,
      });

      return { success: true, features: updated };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  reset: async (company_id) => {
    try {
      let current = await findRow(company_id);
      if (!current) {
        await seedDefaultFeatures(company_id);
        current = await findRow(company_id);
      }
      if (!current) return { success: false, error: 'Features not found' };

      await db
        .update(tallyFeatures)
        .set({
          // Default-all-Yes: every real feature flag ON. The 4 "Set/Alter …
          // Details" flags stay 0 — they are momentary triggers (forced to 0 on
          // save; Yes would pop their detail screens on Accept).
          maintainAccounts: 1,
          enableBillWiseEntry: 1,
          enableCostCentres: 1,
          enableInterestCalculation: 1,
          maintainInventory: 1,
          integrateAccountsWithInventory: 1,
          enableMultiplePriceLevels: 1,
          enableBatches: 1,
          maintainExpiryDateForBatches: 1,
          enableJobOrderProcessing: 1,
          enableCostTracking: 1,
          enableJobCosting: 1,
          useDiscountColumnInInvoices: 1,
          useSeparateActualBilledQty: 1,
          useDebitCreditNotes: 1,
          useTrackingNumbers: 1,
          useRejectionNotes: 1,
          enableGst: 1,
          setAlterCompanyGstDetails: 0,
          enableTds: 1,
          setAlterTdsDetails: 0,
          enableTcs: 1,
          setAlterTcsDetails: 0,
          enableVat: 1,
          enableExcise: 1,
          enableServiceTax: 1,
          enableBrowserAccessForReports: 1,
          enableTallyNetServices: 1,
          maintainPayroll: 1,
          enablePayrollStatutory: 1,
          setAlterPayrollStatutoryDetails: 0,
          enablePaymentRequestQr: 1,
          markModifiedVouchers: 1,
          updatedAt: sql`datetime('now')`,
        })
        .where(eq(tallyFeatures.companyId, company_id));

      const updated = await findRow(company_id);
      await auditTrailService.record({
        company_id,
        entity_type: 'tally_features',
        entity_id: company_id,
        action: 'reset',
        before: current,
        after: updated,
      });

      return { success: true, features: updated };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },
};
