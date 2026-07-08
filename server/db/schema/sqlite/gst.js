const { sqliteTable, integer, text, real } = require('drizzle-orm/sqlite-core');
const { sql } = require('drizzle-orm');

// Mirrors server/gst/gst.js CREATE TABLE statements (SQLite ground truth).
// FKs reference tables owned by other modules (companies, vouchers,
// voucher_entries, financial_years); kept as plain columns to avoid
// cross-module require cycles. Raw SQLite types preserved to keep behavior.

// 1. gst_hsn_rates — company-level, effective-dated HSN/SAC GST rate overrides.
const gstHsnRates = sqliteTable('gst_hsn_rates', {
  rateId: integer('rate_id').primaryKey({ autoIncrement: true }),
  // FK -> companies(company_id) ON DELETE CASCADE.
  companyId: integer('company_id').notNull(),
  hsnCode: text('hsn_code').notNull(),
  effectiveFrom: text('effective_from').notNull(),
  effectiveTo: text('effective_to'),
  taxability: text('taxability').default('Taxable'),
  gstRate: real('gst_rate').default(0),
  cgstRate: real('cgst_rate').default(0),
  sgstRate: real('sgst_rate').default(0),
  igstRate: real('igst_rate').default(0),
  cessRate: real('cess_rate').default(0),
  typeOfSupply: text('type_of_supply').default('Goods'),
  // SQLite: TEXT DEFAULT (datetime('now')) storing ISO strings; keep raw TEXT.
  createdAt: text('created_at').default(sql`(datetime('now'))`),
});

// 2. gst_voucher_tax_lines — per-voucher GST audit/breakdown lines.
const gstVoucherTaxLines = sqliteTable('gst_voucher_tax_lines', {
  taxLineId: integer('tax_line_id').primaryKey({ autoIncrement: true }),
  // FK -> vouchers(voucher_id) ON DELETE CASCADE.
  voucherId: integer('voucher_id').notNull(),
  // FK -> voucher_entries(entry_id) ON DELETE SET NULL.
  entryId: integer('entry_id'),
  hsnCode: text('hsn_code'),
  description: text('description'),
  quantity: real('quantity').default(0),
  unit: text('unit'),
  assessableValue: real('assessable_value').default(0),
  taxType: text('tax_type'),
  rate: real('rate').default(0),
  amount: real('amount').default(0),
  // SQLite INTEGER 0/1 flag; keep raw INTEGER to preserve behavior.
  isInterState: integer('is_inter_state').default(0),
  partyGstin: text('party_gstin'),
  partyState: text('party_state'),
  // Inferred FK -> gst_classifications (no FK in source; column only).
  gstClassificationId: integer('gst_classification_id'),
  createdAt: text('created_at').default(sql`(datetime('now'))`),
});

// 3. gstr1_exports — snapshot of a generated GSTR-1 return.
const gstr1Exports = sqliteTable('gstr1_exports', {
  exportId: integer('export_id').primaryKey({ autoIncrement: true }),
  // FK -> companies(company_id) ON DELETE CASCADE.
  companyId: integer('company_id').notNull(),
  // FK -> financial_years(fy_id) ON DELETE CASCADE.
  fyId: integer('fy_id').notNull(),
  returnPeriod: text('return_period').notNull(),
  filedDate: text('filed_date'),
  status: text('status').default('Draft'),
  b2bJson: text('b2b_json'),
  b2clJson: text('b2cl_json'),
  b2csJson: text('b2cs_json'),
  cdnrJson: text('cdnr_json'),
  hsnJson: text('hsn_json'),
  errorsJson: text('errors_json'),
  fullPayloadJson: text('full_payload_json'),
  createdAt: text('created_at').default(sql`(datetime('now'))`),
});

// 4. gstr2b_imports — snapshot of an imported GSTR-2B return payload.
const gstr2bImports = sqliteTable('gstr2b_imports', {
  importId: integer('import_id').primaryKey({ autoIncrement: true }),
  // FK -> companies(company_id) ON DELETE CASCADE.
  companyId: integer('company_id').notNull(),
  // FK -> financial_years(fy_id) ON DELETE CASCADE.
  fyId: integer('fy_id').notNull(),
  returnPeriod: text('return_period').notNull(),
  payloadJson: text('payload_json'),
  createdAt: text('created_at').default(sql`(datetime('now'))`),
});

// 5. gst_credit_ledger — persistent electronic credit ledger. One row per
// (company, registration, return period, tax head); closing carries to the next period's
// opening, across financial years. Rebuilt from the monthly GSTR-3B figures.
const gstCreditLedger = sqliteTable('gst_credit_ledger', {
  ledgerId: integer('ledger_id').primaryKey({ autoIncrement: true }),
  companyId: integer('company_id').notNull(),
  gstRegistrationId: integer('gst_registration_id'),
  returnPeriod: text('return_period').notNull(), // MMYYYY
  head: text('head').notNull(), // IGST | CGST | SGST | CESS
  opening: real('opening').default(0),
  credit: real('credit').default(0),
  liability: real('liability').default(0),
  utilized: real('utilized').default(0),
  closing: real('closing').default(0),
  updatedAt: text('updated_at').default(sql`(datetime('now'))`),
});

module.exports = { gstHsnRates, gstVoucherTaxLines, gstr1Exports, gstr2bImports, gstCreditLedger };
