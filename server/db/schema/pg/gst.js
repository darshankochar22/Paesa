const { pgTable, bigint, text, date, numeric, boolean, timestamp } = require('drizzle-orm/pg-core');
const { sql } = require('drizzle-orm');

// Mirrors docs/db/modules/gst.sql (PostgreSQL contract).
// FKs reference tables owned by other modules (companies, vouchers,
// voucher_entries, financial_years, gst_classifications); enforced at the DDL
// layer, kept as plain columns here to avoid cross-module require cycles.

// 1. gst_hsn_rates — company-level, effective-dated HSN/SAC GST rate overrides.
const gstHsnRates = pgTable('gst_hsn_rates', {
  rateId: bigint('rate_id', { mode: 'number' })
    .primaryKey()
    .generatedByDefaultAsIdentity(),
  // FK -> companies(company_id) ON DELETE CASCADE.
  companyId: bigint('company_id', { mode: 'number' }).notNull(),
  hsnCode: text('hsn_code').notNull(),
  effectiveFrom: date('effective_from').notNull(),
  effectiveTo: date('effective_to'),
  taxability: text('taxability').notNull().default('Taxable'),
  gstRate: numeric('gst_rate', { precision: 18, scale: 4 }).notNull().default('0'),
  cgstRate: numeric('cgst_rate', { precision: 18, scale: 4 }).notNull().default('0'),
  sgstRate: numeric('sgst_rate', { precision: 18, scale: 4 }).notNull().default('0'),
  igstRate: numeric('igst_rate', { precision: 18, scale: 4 }).notNull().default('0'),
  cessRate: numeric('cess_rate', { precision: 18, scale: 4 }).notNull().default('0'),
  typeOfSupply: text('type_of_supply').notNull().default('Goods'),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .default(sql`now()`),
});

// 2. gst_voucher_tax_lines — per-voucher GST audit/breakdown lines.
const gstVoucherTaxLines = pgTable('gst_voucher_tax_lines', {
  taxLineId: bigint('tax_line_id', { mode: 'number' })
    .primaryKey()
    .generatedByDefaultAsIdentity(),
  // FK -> vouchers(voucher_id) ON DELETE CASCADE.
  voucherId: bigint('voucher_id', { mode: 'number' }).notNull(),
  // FK -> voucher_entries(entry_id) ON DELETE SET NULL.
  entryId: bigint('entry_id', { mode: 'number' }),
  hsnCode: text('hsn_code'),
  description: text('description'),
  quantity: numeric('quantity', { precision: 18, scale: 4 }).notNull().default('0'),
  unit: text('unit'),
  assessableValue: numeric('assessable_value', { precision: 18, scale: 2 }).notNull().default('0'),
  taxType: text('tax_type'),
  rate: numeric('rate', { precision: 18, scale: 4 }).notNull().default('0'),
  amount: numeric('amount', { precision: 18, scale: 2 }).notNull().default('0'),
  isInterState: boolean('is_inter_state').notNull().default(false),
  partyGstin: text('party_gstin'),
  partyState: text('party_state'),
  // Inferred FK -> gst_classifications(gst_classification_id) (no FK in source).
  gstClassificationId: bigint('gst_classification_id', { mode: 'number' }),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .default(sql`now()`),
});

// 3. gstr1_exports — snapshot of a generated GSTR-1 return.
const gstr1Exports = pgTable('gstr1_exports', {
  exportId: bigint('export_id', { mode: 'number' })
    .primaryKey()
    .generatedByDefaultAsIdentity(),
  // FK -> companies(company_id) ON DELETE CASCADE.
  companyId: bigint('company_id', { mode: 'number' }).notNull(),
  // FK -> financial_years(fy_id) ON DELETE CASCADE.
  fyId: bigint('fy_id', { mode: 'number' }).notNull(),
  returnPeriod: text('return_period').notNull(),
  filedDate: date('filed_date'),
  status: text('status').notNull().default('Draft'),
  b2bJson: text('b2b_json'),
  b2clJson: text('b2cl_json'),
  b2csJson: text('b2cs_json'),
  cdnrJson: text('cdnr_json'),
  hsnJson: text('hsn_json'),
  errorsJson: text('errors_json'),
  fullPayloadJson: text('full_payload_json'),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .default(sql`now()`),
});

module.exports = { gstHsnRates, gstVoucherTaxLines, gstr1Exports };
