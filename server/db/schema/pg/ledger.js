const { pgTable, bigint, text, boolean, numeric, integer, timestamp } = require('drizzle-orm/pg-core');
const { sql } = require('drizzle-orm');

// Mirrors docs/db/modules/ledger.sql (PostgreSQL contract).
// 0/1 flags -> BOOLEAN, money REAL -> NUMERIC(18,2), rate REAL -> NUMERIC(18,4),
// ISO datetime TEXT -> TIMESTAMPTZ, INTEGER PK -> IDENTITY.
const ledgers = pgTable('ledgers', {
  ledgerId: bigint('ledger_id', { mode: 'number' }).primaryKey().generatedByDefaultAsIdentity(),
  // FK -> companies.company_id ON DELETE CASCADE (companies owned by another module).
  companyId: bigint('company_id', { mode: 'number' }).notNull(),
  // FK -> groups.group_id (groups owned by another module).
  groupId: bigint('group_id', { mode: 'number' }),
  name: text('name').notNull(),
  alias: text('alias'),
  ledgerType: text('ledger_type').default('General'),
  nature: text('nature'),
  openingBalance: numeric('opening_balance', { precision: 18, scale: 2 }).default('0'),
  closingBalance: numeric('closing_balance', { precision: 18, scale: 2 }).default('0'),
  isBillWise: boolean('is_bill_wise').default(false),
  maintainInventoryValues: boolean('maintain_inventory_values').default(false),
  mailingName: text('mailing_name'),
  address1: text('address1'),
  address2: text('address2'),
  city: text('city'),
  state: text('state'),
  country: text('country'),
  pincode: text('pincode'),
  phone: text('phone'),
  email: text('email'),
  gstin: text('gstin'),
  pan: text('pan'),
  registrationType: text('registration_type').default('Unregistered'),
  allowCostCentres: boolean('allow_cost_centres').default(false),
  defaultCreditPeriod: integer('default_credit_period').default(0),
  checkCreditDays: integer('check_credit_days').default(0),
  invoiceRounding: boolean('invoice_rounding').default(false),
  roundingMethod: text('rounding_method'),
  roundingLimit: numeric('rounding_limit', { precision: 18, scale: 4 }).default('0'),
  additionalGstDetails: boolean('additional_gst_details').default(false),
  serviceTaxDetails: boolean('service_tax_details').default(false),
  includeAssessableValue: text('include_assessable_value').default('Not Applicable'),
  methodOfCalculation: text('method_of_calculation').default('Based on Value'),
  otherStatutoryDetails: boolean('other_statutory_details').default(false),
  isActive: boolean('is_active').default(true),
  isPredefined: boolean('is_predefined').default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).default(sql`now()`),
  updatedAt: timestamp('updated_at', { withTimezone: true }).default(sql`now()`),
});

// transaction_type, cross_using, company_bank added via ALTER in source init().
const ledgerBankDetails = pgTable('ledger_bank_details', {
  id: bigint('id', { mode: 'number' }).primaryKey().generatedByDefaultAsIdentity(),
  // FK -> ledgers.ledger_id ON DELETE CASCADE.
  ledgerId: bigint('ledger_id', { mode: 'number' }).notNull().references(() => ledgers.ledgerId, { onDelete: 'cascade' }),
  accountHolderName: text('account_holder_name'),
  accountNumber: text('account_number'),
  ifscCode: text('ifsc_code'),
  swiftCode: text('swift_code'),
  bankName: text('bank_name'),
  branchName: text('branch_name'),
  bankConfiguration: text('bank_configuration'),
  chequeBookStartNo: text('cheque_book_start_no'),
  chequeBookEndNo: text('cheque_book_end_no'),
  enableChequePrinting: boolean('enable_cheque_printing').default(false),
  chequePrintingConfiguration: text('cheque_printing_configuration'),
  odLimit: numeric('od_limit', { precision: 18, scale: 2 }).default('0'),
  transactionType: text('transaction_type'),
  crossUsing: text('cross_using').default('A/c Payee'),
  companyBank: text('company_bank'),
});

// include_in_assessable_value_calculation, appropriate_to, method_of_calculation
// added via ALTER in source init().
const ledgerStatutoryDetails = pgTable('ledger_statutory_details', {
  id: bigint('id', { mode: 'number' }).primaryKey().generatedByDefaultAsIdentity(),
  // FK -> ledgers.ledger_id ON DELETE CASCADE.
  ledgerId: bigint('ledger_id', { mode: 'number' }).notNull().references(() => ledgers.ledgerId, { onDelete: 'cascade' }),
  gstApplicability: text('gst_applicability').default('Not Applicable'),
  hsnSacCode: text('hsn_sac_code'),
  hsnSacDescription: text('hsn_sac_description'),
  gstRate: numeric('gst_rate', { precision: 18, scale: 4 }).default('0'),
  cgstRate: numeric('cgst_rate', { precision: 18, scale: 4 }).default('0'),
  sgstRate: numeric('sgst_rate', { precision: 18, scale: 4 }).default('0'),
  igstRate: numeric('igst_rate', { precision: 18, scale: 4 }).default('0'),
  typeOfDutyTax: text('type_of_duty_tax'),
  percentageOfCalculation: numeric('percentage_of_calculation', { precision: 18, scale: 4 }).default('0'),
  statutoryDetails: text('statutory_details'),
  includeInAssessableValueCalculation: text('include_in_assessable_value_calculation').default('Not Applicable'),
  appropriateTo: text('appropriate_to').default('Goods'),
  methodOfCalculation: text('method_of_calculation').default('Based on Quantity'),
});

module.exports = { ledgers, ledgerBankDetails, ledgerStatutoryDetails };
