const { pgTable, bigint, boolean, timestamp } = require('drizzle-orm/pg-core');
const { companies } = require('./company');

// One row per company holding Tally-style "F11" feature toggles.
// SQLite INTEGER 0/1 flags -> BOOLEAN (per docs/db/modules/tallyFeatures.sql).
const tallyFeatures = pgTable('tally_features', {
  tallyFeatureId: bigint('tally_feature_id', { mode: 'number' })
    .primaryKey()
    .generatedByDefaultAsIdentity(),
  companyId: bigint('company_id', { mode: 'number' })
    .notNull()
    .references(() => companies.companyId, { onDelete: 'cascade' }),
  maintainAccounts: boolean('maintain_accounts').notNull().default(true),
  enableBillWiseEntry: boolean('enable_bill_wise_entry').notNull().default(false),
  enableCostCentres: boolean('enable_cost_centres').notNull().default(false),
  maintainInventory: boolean('maintain_inventory').notNull().default(true),
  integrateAccountsWithInventory: boolean('integrate_accounts_with_inventory').notNull().default(true),
  enableMultiplePriceLevels: boolean('enable_multiple_price_levels').notNull().default(false),
  enableBatches: boolean('enable_batches').notNull().default(false),
  maintainExpiryDateForBatches: boolean('maintain_expiry_date_for_batches').notNull().default(false),
  useDiscountColumnInInvoices: boolean('use_discount_column_in_invoices').notNull().default(false),
  useSeparateActualBilledQty: boolean('use_separate_actual_billed_qty').notNull().default(false),
  enableGst: boolean('enable_gst').notNull().default(false),
  setAlterCompanyGstDetails: boolean('set_alter_company_gst_details').notNull().default(false),
  enableTds: boolean('enable_tds').notNull().default(false),
  enableTcs: boolean('enable_tcs').notNull().default(false),
  enableBrowserAccessForReports: boolean('enable_browser_access_for_reports').notNull().default(false),
  enableTallyNetServices: boolean('enable_tally_net_services').notNull().default(false),
  enablePaymentRequestQr: boolean('enable_payment_request_qr').notNull().default(false),
  enableMultipleAddresses: boolean('enable_multiple_addresses').notNull().default(false),
  markModifiedVouchers: boolean('mark_modified_vouchers').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

module.exports = { tallyFeatures };
