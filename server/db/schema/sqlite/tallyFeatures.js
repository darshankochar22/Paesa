const { sqliteTable, integer, text } = require('drizzle-orm/sqlite-core');
const { sql } = require('drizzle-orm');
const { companies } = require('./company');

// One row per company holding Tally-style "F11" feature toggles.
// Flag columns are raw INTEGER 0/1 (the service reads/writes them as integers),
// so they are kept as raw integers to preserve behavior exactly.
const tallyFeatures = sqliteTable('tally_features', {
  tallyFeatureId: integer('tally_feature_id').primaryKey({ autoIncrement: true }),
  companyId: integer('company_id')
    .notNull()
    .references(() => companies.companyId, { onDelete: 'cascade' }),
  maintainAccounts: integer('maintain_accounts').default(1),
  enableBillWiseEntry: integer('enable_bill_wise_entry').default(0),
  enableCostCentres: integer('enable_cost_centres').default(0),
  enableInterestCalculation: integer('enable_interest_calculation').default(0),
  maintainInventory: integer('maintain_inventory').default(1),
  integrateAccountsWithInventory: integer('integrate_accounts_with_inventory').default(1),
  enableMultiplePriceLevels: integer('enable_multiple_price_levels').default(0),
  enableBatches: integer('enable_batches').default(0),
  maintainExpiryDateForBatches: integer('maintain_expiry_date_for_batches').default(0),
  enableJobOrderProcessing: integer('enable_job_order_processing').default(0),
  enableCostTracking: integer('enable_cost_tracking').default(0),
  enableJobCosting: integer('enable_job_costing').default(0),
  useDiscountColumnInInvoices: integer('use_discount_column_in_invoices').default(0),
  useSeparateActualBilledQty: integer('use_separate_actual_billed_qty').default(0),
  enableGst: integer('enable_gst').default(1),
  setAlterCompanyGstDetails: integer('set_alter_company_gst_details').default(0),
  enableTds: integer('enable_tds').default(0),
  enableTcs: integer('enable_tcs').default(0),
  enableVat: integer('enable_vat').default(0),
  enableExcise: integer('enable_excise').default(0),
  enableServiceTax: integer('enable_service_tax').default(0),
  enableBrowserAccessForReports: integer('enable_browser_access_for_reports').default(0),
  enableTallyNetServices: integer('enable_tally_net_services').default(0),
  maintainPayroll: integer('maintain_payroll').default(0),
  enablePayrollStatutory: integer('enable_payroll_statutory').default(0),
  enablePaymentRequestQr: integer('enable_payment_request_qr').default(1),
  enableMultipleAddresses: integer('enable_multiple_addresses').default(0),
  markModifiedVouchers: integer('mark_modified_vouchers').default(0),
  createdAt: text('created_at').default(sql`(datetime('now'))`),
  updatedAt: text('updated_at').default(sql`(datetime('now'))`),
});

module.exports = { tallyFeatures };
