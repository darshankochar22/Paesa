const { sqliteTable, text, integer, real } = require('drizzle-orm/sqlite-core');
const { sql } = require('drizzle-orm');

// Mirrors server/voucher/voucher.js CREATE TABLE statements (SQLite ground truth).
// Raw SQLite types preserved: 0/1 INTEGER flags kept as integer, money/qty/rate as REAL,
// date / *_date stored as TEXT, created_at / updated_at are TEXT ISO datetime strings.
// In-module FKs (voucher_id, stock_entry_id, entry_id) use .references(); cross-module
// FKs (companies, financial_years, ledgers, employees, pay_heads) are comments only.

// ---------------------------------------------------------------------------
// vouchers  (header)
// ---------------------------------------------------------------------------
const vouchers = sqliteTable('vouchers', {
  voucherId: integer('voucher_id').primaryKey({ autoIncrement: true }),
  // FK -> companies(company_id) ON DELETE CASCADE (cross-module).
  companyId: integer('company_id').notNull(),
  // FK -> financial_years(fy_id) ON DELETE CASCADE (cross-module).
  fyId: integer('fy_id').notNull(),
  voucherType: text('voucher_type').notNull(),
  voucherNumber: text('voucher_number'),
  date: text('date').notNull(),
  status: text('status').default('Regular'),
  supplierInvoiceNo: text('supplier_invoice_no'),
  supplierInvoiceDate: text('supplier_invoice_date'),
  referenceNumber: text('reference_number'),
  referenceDate: text('reference_date'),
  narration: text('narration'),
  // FK -> ledgers(ledger_id) (cross-module).
  partyLedgerId: integer('party_ledger_id'),
  partyName: text('party_name'),
  placeOfSupply: text('place_of_supply'),
  isInvoice: integer('is_invoice').default(0),
  isAccountingVoucher: integer('is_accounting_voucher').default(1),
  isInventoryVoucher: integer('is_inventory_voucher').default(0),
  isOrderVoucher: integer('is_order_voucher').default(0),
  isCancelled: integer('is_cancelled').default(0),
  isOptional: integer('is_optional').default(0),
  isPostDated: integer('is_post_dated').default(0),
  createdAt: text('created_at').default(sql`(datetime('now'))`),
  updatedAt: text('updated_at').default(sql`(datetime('now'))`),
});

// ---------------------------------------------------------------------------
// voucher_entries  (accounting Dr/Cr lines)
// ---------------------------------------------------------------------------
const voucherEntries = sqliteTable('voucher_entries', {
  entryId: integer('entry_id').primaryKey({ autoIncrement: true }),
  // FK -> vouchers(voucher_id) ON DELETE CASCADE.
  voucherId: integer('voucher_id').notNull().references(() => vouchers.voucherId),
  // FK -> ledgers(ledger_id) (cross-module).
  ledgerId: integer('ledger_id'),
  ledgerName: text('ledger_name'),
  type: text('type').notNull(),
  amount: real('amount').default(0),
  amountForex: real('amount_forex').default(0),
  currency: text('currency').default('INR'),
  narration: text('narration'),
});

// ---------------------------------------------------------------------------
// voucher_stock_entries  (inventory lines)
// is_source added via ALTER in source init().
// ---------------------------------------------------------------------------
const voucherStockEntries = sqliteTable('voucher_stock_entries', {
  stockEntryId: integer('stock_entry_id').primaryKey({ autoIncrement: true }),
  // FK -> vouchers(voucher_id) ON DELETE CASCADE.
  voucherId: integer('voucher_id').notNull().references(() => vouchers.voucherId),
  stockItemId: integer('stock_item_id'),
  itemName: text('item_name'),
  godownId: integer('godown_id'),
  unitId: integer('unit_id'),
  quantity: real('quantity').default(0),
  rate: real('rate').default(0),
  amount: real('amount').default(0),
  additionalAmount: real('additional_amount').default(0),
  discountAmount: real('discount_amount').default(0),
  hsnCode: text('hsn_code'),
  gstRate: real('gst_rate').default(0),
  cgstAmount: real('cgst_amount').default(0),
  sgstAmount: real('sgst_amount').default(0),
  igstAmount: real('igst_amount').default(0),
  isSource: integer('is_source').default(0),
});

// ---------------------------------------------------------------------------
// voucher_batches  (batch breakdown of a stock line)
// ---------------------------------------------------------------------------
const voucherBatches = sqliteTable('voucher_batches', {
  batchId: integer('batch_id').primaryKey({ autoIncrement: true }),
  // FK -> vouchers(voucher_id) ON DELETE CASCADE.
  voucherId: integer('voucher_id').notNull().references(() => vouchers.voucherId),
  // FK -> voucher_stock_entries(stock_entry_id) ON DELETE CASCADE.
  stockEntryId: integer('stock_entry_id').notNull().references(() => voucherStockEntries.stockEntryId),
  batchNumber: text('batch_number'),
  expiryDate: text('expiry_date'),
  quantity: real('quantity').default(0),
  rate: real('rate').default(0),
});

// ---------------------------------------------------------------------------
// voucher_bill_references  (bill-wise allocation)
// due_date added via ALTER in source init().
// ---------------------------------------------------------------------------
const voucherBillReferences = sqliteTable('voucher_bill_references', {
  billId: integer('bill_id').primaryKey({ autoIncrement: true }),
  // FK -> vouchers(voucher_id) ON DELETE CASCADE.
  voucherId: integer('voucher_id').notNull().references(() => vouchers.voucherId),
  // FK -> ledgers(ledger_id) (cross-module).
  ledgerId: integer('ledger_id'),
  billName: text('bill_name'),
  billType: text('bill_type'),
  amount: real('amount').default(0),
  creditPeriod: text('credit_period'),
  dueDate: text('due_date'),
});

// ---------------------------------------------------------------------------
// voucher_bank_details
// cheque_range added via ALTER in source init().
// ---------------------------------------------------------------------------
const voucherBankDetails = sqliteTable('voucher_bank_details', {
  bankDetailId: integer('bank_detail_id').primaryKey({ autoIncrement: true }),
  // FK -> vouchers(voucher_id) ON DELETE CASCADE.
  voucherId: integer('voucher_id').notNull().references(() => vouchers.voucherId),
  // FK -> ledgers(ledger_id) (cross-module).
  ledgerId: integer('ledger_id'),
  transactionType: text('transaction_type').default('Cheque'),
  chequeRange: text('cheque_range'),
  instrumentNumber: text('instrument_number'),
  instrumentDate: text('instrument_date'),
  bankName: text('bank_name'),
  branch: text('branch'),
  amount: real('amount').default(0),
});

// ---------------------------------------------------------------------------
// voucher_cost_centres  (cost-centre split of an entry)
// ---------------------------------------------------------------------------
const voucherCostCentres = sqliteTable('voucher_cost_centres', {
  ccEntryId: integer('cc_entry_id').primaryKey({ autoIncrement: true }),
  // FK -> vouchers(voucher_id) ON DELETE CASCADE.
  voucherId: integer('voucher_id').notNull().references(() => vouchers.voucherId),
  // FK -> voucher_entries(entry_id).
  entryId: integer('entry_id').references(() => voucherEntries.entryId),
  costCentreId: integer('cost_centre_id'),
  amount: real('amount').default(0),
});

// ---------------------------------------------------------------------------
// voucher_cash_denominations
// ---------------------------------------------------------------------------
const voucherCashDenominations = sqliteTable('voucher_cash_denominations', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  // FK -> vouchers(voucher_id) ON DELETE CASCADE.
  voucherId: integer('voucher_id').notNull().references(() => vouchers.voucherId),
  // FK -> ledgers(ledger_id) (cross-module).
  ledgerId: integer('ledger_id'),
  denomination: text('denomination'),
  quantity: integer('quantity').default(0),
  amount: real('amount').default(0),
});

// ---------------------------------------------------------------------------
// voucher_receipt_details
// ---------------------------------------------------------------------------
const voucherReceiptDetails = sqliteTable('voucher_receipt_details', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  // FK -> vouchers(voucher_id) ON DELETE CASCADE.
  voucherId: integer('voucher_id').notNull().references(() => vouchers.voucherId),
  receiptNoteNo: text('receipt_note_no'),
  receiptDocNo: text('receipt_doc_no'),
  dispatchedThrough: text('dispatched_through'),
  destination: text('destination'),
  carrierName: text('carrier_name'),
  billOfLadingNo: text('bill_of_lading_no'),
  billOfLadingDate: text('bill_of_lading_date'),
  motorVehicleNo: text('motor_vehicle_no'),
});

// ---------------------------------------------------------------------------
// voucher_party_details
// ---------------------------------------------------------------------------
const voucherPartyDetails = sqliteTable('voucher_party_details', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  // FK -> vouchers(voucher_id) ON DELETE CASCADE.
  voucherId: integer('voucher_id').notNull().references(() => vouchers.voucherId),
  supplierName: text('supplier_name'),
  mailingName: text('mailing_name'),
  address: text('address'),
  state: text('state'),
  country: text('country'),
});

// ---------------------------------------------------------------------------
// voucher_dispatch_details
// All non-key columns also (re)added via ALTER in source init().
// ---------------------------------------------------------------------------
const voucherDispatchDetails = sqliteTable('voucher_dispatch_details', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  // FK -> vouchers(voucher_id) ON DELETE CASCADE.
  voucherId: integer('voucher_id').notNull().references(() => vouchers.voucherId),
  deliveryNoteNos: text('delivery_note_nos'),
  dispatchDocNo: text('dispatch_doc_no'),
  dispatchedThrough: text('dispatched_through'),
  destination: text('destination'),
  carrierName: text('carrier_name'),
  billOfLadingNo: text('bill_of_lading_no'),
  billOfLadingDate: text('bill_of_lading_date'),
  motorVehicleNo: text('motor_vehicle_no'),
});

// ---------------------------------------------------------------------------
// voucher_credit_note_details
// ---------------------------------------------------------------------------
const voucherCreditNoteDetails = sqliteTable('voucher_credit_note_details', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  // FK -> vouchers(voucher_id) ON DELETE CASCADE.
  voucherId: integer('voucher_id').notNull().references(() => vouchers.voucherId),
  trackingNo: text('tracking_no'),
  dispatchDocNo: text('dispatch_doc_no'),
  dispatchedThrough: text('dispatched_through'),
  destination: text('destination'),
  carrierName: text('carrier_name'),
  billOfLadingNo: text('bill_of_lading_no'),
  billOfLadingDate: text('bill_of_lading_date'),
  motorVehicleNo: text('motor_vehicle_no'),
  originalInvoiceNo: text('original_invoice_no'),
  originalInvoiceDate: text('original_invoice_date'),
});

// ---------------------------------------------------------------------------
// voucher_debit_note_details
// ---------------------------------------------------------------------------
const voucherDebitNoteDetails = sqliteTable('voucher_debit_note_details', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  // FK -> vouchers(voucher_id) ON DELETE CASCADE.
  voucherId: integer('voucher_id').notNull().references(() => vouchers.voucherId),
  trackingNo: text('tracking_no'),
  dispatchDocNo: text('dispatch_doc_no'),
  dispatchedThrough: text('dispatched_through'),
  destination: text('destination'),
  carrierName: text('carrier_name'),
  billOfLadingNo: text('bill_of_lading_no'),
  billOfLadingDate: text('bill_of_lading_date'),
  motorVehicleNo: text('motor_vehicle_no'),
  originalInvoiceNo: text('original_invoice_no'),
  originalInvoiceDate: text('original_invoice_date'),
});

// ---------------------------------------------------------------------------
// voucher_payroll_entries
// ---------------------------------------------------------------------------
const voucherPayrollEntries = sqliteTable('voucher_payroll_entries', {
  payrollEntryId: integer('payroll_entry_id').primaryKey({ autoIncrement: true }),
  // FK -> vouchers(voucher_id) ON DELETE CASCADE.
  voucherId: integer('voucher_id').notNull().references(() => vouchers.voucherId),
  // FK -> employees(employee_id) (cross-module).
  employeeId: integer('employee_id'),
  // FK -> pay_heads(pay_head_id) (cross-module).
  payHeadId: integer('pay_head_id'),
  amount: real('amount').default(0),
});

module.exports = {
  vouchers,
  voucherEntries,
  voucherStockEntries,
  voucherBatches,
  voucherBillReferences,
  voucherBankDetails,
  voucherCostCentres,
  voucherCashDenominations,
  voucherReceiptDetails,
  voucherPartyDetails,
  voucherDispatchDetails,
  voucherCreditNoteDetails,
  voucherDebitNoteDetails,
  voucherPayrollEntries,
};
