const {
  pgTable,
  bigint,
  text,
  boolean,
  numeric,
  integer,
  date,
  timestamp,
} = require('drizzle-orm/pg-core');
const { sql } = require('drizzle-orm');

// Mirrors docs/db/modules/voucher.sql (PostgreSQL contract).
// 0/1 flags -> BOOLEAN, money REAL -> NUMERIC(18,2), qty/rate REAL -> NUMERIC(18,4),
// date-only TEXT -> DATE, ISO datetime TEXT -> TIMESTAMPTZ, INTEGER PK -> IDENTITY.
// In-module FKs (voucher_id, stock_entry_id, entry_id) use .references(); cross-module
// FKs (companies, financial_years, ledgers, employees, pay_heads) are comments only.

// ---------------------------------------------------------------------------
// vouchers  (header)
// ---------------------------------------------------------------------------
const vouchers = pgTable('vouchers', {
  voucherId: bigint('voucher_id', { mode: 'number' }).primaryKey().generatedByDefaultAsIdentity(),
  // FK -> companies.company_id ON DELETE CASCADE (cross-module).
  companyId: bigint('company_id', { mode: 'number' }).notNull(),
  // FK -> financial_years.fy_id ON DELETE CASCADE (cross-module).
  fyId: bigint('fy_id', { mode: 'number' }).notNull(),
  voucherType: text('voucher_type').notNull(),
  voucherNumber: text('voucher_number'),
  date: date('date').notNull(),
  status: text('status').default('Regular'),
  supplierInvoiceNo: text('supplier_invoice_no'),
  supplierInvoiceDate: date('supplier_invoice_date'),
  referenceNumber: text('reference_number'),
  referenceDate: date('reference_date'),
  narration: text('narration'),
  // FK -> ledgers.ledger_id (cross-module).
  partyLedgerId: bigint('party_ledger_id', { mode: 'number' }),
  partyName: text('party_name'),
  placeOfSupply: text('place_of_supply'),
  // GST snapshot (immutable after save) — see server/voucher/voucher.js init() migrations.
  gstRegistrationId: bigint('gst_registration_id', { mode: 'number' }),
  companyState: text('company_state'),
  isInterstate: boolean('is_interstate').default(false),
  isInvoice: boolean('is_invoice').default(false),
  isAccountingVoucher: boolean('is_accounting_voucher').default(true),
  isInventoryVoucher: boolean('is_inventory_voucher').default(false),
  isOrderVoucher: boolean('is_order_voucher').default(false),
  isCancelled: boolean('is_cancelled').default(false),
  isOptional: boolean('is_optional').default(false),
  isPostDated: boolean('is_post_dated').default(false),
  // Reversing Journal: date up to which the (non-posting) entry is applicable.
  applicableUpto: date('applicable_upto'),
  createdAt: timestamp('created_at', { withTimezone: true }).default(sql`now()`),
  updatedAt: timestamp('updated_at', { withTimezone: true }).default(sql`now()`),
});

// ---------------------------------------------------------------------------
// voucher_entries  (accounting Dr/Cr lines)
// ---------------------------------------------------------------------------
const voucherEntries = pgTable('voucher_entries', {
  entryId: bigint('entry_id', { mode: 'number' }).primaryKey().generatedByDefaultAsIdentity(),
  // FK -> vouchers.voucher_id ON DELETE CASCADE.
  voucherId: bigint('voucher_id', { mode: 'number' })
    .notNull()
    .references(() => vouchers.voucherId, { onDelete: 'cascade' }),
  // FK -> ledgers.ledger_id (cross-module).
  ledgerId: bigint('ledger_id', { mode: 'number' }),
  ledgerName: text('ledger_name'),
  type: text('type').notNull(),
  amount: numeric('amount', { precision: 18, scale: 2 }).default('0'),
  amountForex: numeric('amount_forex', { precision: 18, scale: 2 }).default('0'),
  currency: text('currency').default('INR'),
  narration: text('narration'),
});

// ---------------------------------------------------------------------------
// voucher_stock_entries  (inventory lines)
// is_source added via ALTER in source init().
// ---------------------------------------------------------------------------
const voucherStockEntries = pgTable('voucher_stock_entries', {
  stockEntryId: bigint('stock_entry_id', { mode: 'number' })
    .primaryKey()
    .generatedByDefaultAsIdentity(),
  // FK -> vouchers.voucher_id ON DELETE CASCADE.
  voucherId: bigint('voucher_id', { mode: 'number' })
    .notNull()
    .references(() => vouchers.voucherId, { onDelete: 'cascade' }),
  // FK -> stock_items.stock_item_id (INFERRED, cross-module).
  stockItemId: bigint('stock_item_id', { mode: 'number' }),
  itemName: text('item_name'),
  // FK -> godowns.godown_id (INFERRED, cross-module).
  godownId: bigint('godown_id', { mode: 'number' }),
  // FK -> units.unit_id (INFERRED, cross-module).
  unitId: bigint('unit_id', { mode: 'number' }),
  quantity: numeric('quantity', { precision: 18, scale: 4 }).default('0'),
  rate: numeric('rate', { precision: 18, scale: 4 }).default('0'),
  amount: numeric('amount', { precision: 18, scale: 2 }).default('0'),
  additionalAmount: numeric('additional_amount', { precision: 18, scale: 2 }).default('0'),
  discountAmount: numeric('discount_amount', { precision: 18, scale: 2 }).default('0'),
  hsnCode: text('hsn_code'),
  gstRate: numeric('gst_rate', { precision: 18, scale: 4 }).default('0'),
  cgstAmount: numeric('cgst_amount', { precision: 18, scale: 2 }).default('0'),
  sgstAmount: numeric('sgst_amount', { precision: 18, scale: 2 }).default('0'),
  igstAmount: numeric('igst_amount', { precision: 18, scale: 2 }).default('0'),
  isSource: boolean('is_source').default(false),
});

// ---------------------------------------------------------------------------
// voucher_batches  (batch breakdown of a stock line)
// ---------------------------------------------------------------------------
const voucherBatches = pgTable('voucher_batches', {
  batchId: bigint('batch_id', { mode: 'number' }).primaryKey().generatedByDefaultAsIdentity(),
  // FK -> vouchers.voucher_id ON DELETE CASCADE.
  voucherId: bigint('voucher_id', { mode: 'number' })
    .notNull()
    .references(() => vouchers.voucherId, { onDelete: 'cascade' }),
  // FK -> voucher_stock_entries.stock_entry_id ON DELETE CASCADE.
  stockEntryId: bigint('stock_entry_id', { mode: 'number' })
    .notNull()
    .references(() => voucherStockEntries.stockEntryId, { onDelete: 'cascade' }),
  batchNumber: text('batch_number'),
  mfgDate: date('mfg_date'),
  // Free-form: an actual date, or a period like "6 Months" / "2 Yrs" / "9 Days".
  expiryDate: text('expiry_date'),
  quantity: numeric('quantity', { precision: 18, scale: 4 }).default('0'),
  rate: numeric('rate', { precision: 18, scale: 4 }).default('0'),
  godown: text('godown'),
  actualQuantity: numeric('actual_quantity', { precision: 18, scale: 4 }).default('0'),
  discPercent: numeric('disc_percent', { precision: 18, scale: 4 }).default('0'),
  orderNo: text('order_no'),
  dueOn: text('due_on'),
  dueOnDate: text('due_on_date'),
  componentOf: text('component_of'),
  considerAsScrap: text('consider_as_scrap'),
  trackComponents: text('track_components'),
});

// ---------------------------------------------------------------------------
// voucher_item_excise  (per-item excise details — Credit Note excise items)
// ---------------------------------------------------------------------------
const voucherItemExcise = pgTable('voucher_item_excise', {
  itemExciseId: bigint('item_excise_id', { mode: 'number' })
    .primaryKey()
    .generatedByDefaultAsIdentity(),
  // FK -> vouchers.voucher_id ON DELETE CASCADE.
  voucherId: bigint('voucher_id', { mode: 'number' })
    .notNull()
    .references(() => vouchers.voucherId, { onDelete: 'cascade' }),
  // FK -> voucher_stock_entries.stock_entry_id ON DELETE CASCADE.
  stockEntryId: bigint('stock_entry_id', { mode: 'number' })
    .notNull()
    .references(() => voucherStockEntries.stockEntryId, { onDelete: 'cascade' }),
  salesInvoiceNumber: text('sales_invoice_number'),
  salesInvoiceDate: text('sales_invoice_date'),
  exciseSalesInvoice: text('excise_sales_invoice'),
  rateOfDuty: text('rate_of_duty'),
  ratePerUnit: text('rate_per_unit'),
  supplierDutyAmount: text('supplier_duty_amount'),
  mfgrImporterDutyAmount: text('mfgr_importer_duty_amount'),
});

// ---------------------------------------------------------------------------
// voucher_bill_references  (bill-wise allocation)
// due_date added via ALTER in source init().
// ---------------------------------------------------------------------------
const voucherBillReferences = pgTable('voucher_bill_references', {
  billId: bigint('bill_id', { mode: 'number' }).primaryKey().generatedByDefaultAsIdentity(),
  // FK -> vouchers.voucher_id ON DELETE CASCADE.
  voucherId: bigint('voucher_id', { mode: 'number' })
    .notNull()
    .references(() => vouchers.voucherId, { onDelete: 'cascade' }),
  // FK -> ledgers.ledger_id (cross-module).
  ledgerId: bigint('ledger_id', { mode: 'number' }),
  billName: text('bill_name'),
  billType: text('bill_type'),
  amount: numeric('amount', { precision: 18, scale: 2 }).default('0'),
  creditPeriod: text('credit_period'),
  dueDate: date('due_date'),
});

// ---------------------------------------------------------------------------
// voucher_bank_details
// cheque_range added via ALTER in source init().
// ---------------------------------------------------------------------------
const voucherBankDetails = pgTable('voucher_bank_details', {
  bankDetailId: bigint('bank_detail_id', { mode: 'number' })
    .primaryKey()
    .generatedByDefaultAsIdentity(),
  // FK -> vouchers.voucher_id ON DELETE CASCADE.
  voucherId: bigint('voucher_id', { mode: 'number' })
    .notNull()
    .references(() => vouchers.voucherId, { onDelete: 'cascade' }),
  // FK -> ledgers.ledger_id (cross-module).
  ledgerId: bigint('ledger_id', { mode: 'number' }),
  transactionType: text('transaction_type').default('Cheque'),
  chequeRange: text('cheque_range'),
  instrumentNumber: text('instrument_number'),
  instrumentDate: date('instrument_date'),
  bankName: text('bank_name'),
  branch: text('branch'),
  accountNumber: text('account_number'),
  ifscCode: text('ifsc_code'),
  paymentGateway: text('payment_gateway'),
  favouringName: text('favouring_name'),
  transferMode: text('transfer_mode'),
  allocationsJson: text('allocations_json'),
  amount: numeric('amount', { precision: 18, scale: 2 }).default('0'),
});

// ---------------------------------------------------------------------------
// voucher_cost_centres  (cost-centre split of an entry)
// ---------------------------------------------------------------------------
const voucherCostCentres = pgTable('voucher_cost_centres', {
  ccEntryId: bigint('cc_entry_id', { mode: 'number' }).primaryKey().generatedByDefaultAsIdentity(),
  // FK -> vouchers.voucher_id ON DELETE CASCADE.
  voucherId: bigint('voucher_id', { mode: 'number' })
    .notNull()
    .references(() => vouchers.voucherId, { onDelete: 'cascade' }),
  // FK -> voucher_entries.entry_id.
  entryId: bigint('entry_id', { mode: 'number' }).references(() => voucherEntries.entryId),
  // FK -> cost_centres.cost_centre_id (INFERRED, cross-module).
  costCentreId: bigint('cost_centre_id', { mode: 'number' }),
  costCategoryId: bigint('cost_category_id', { mode: 'number' }),
  amount: numeric('amount', { precision: 18, scale: 2 }).default('0'),
});

// ---------------------------------------------------------------------------
// voucher_cash_denominations
// ---------------------------------------------------------------------------
const voucherCashDenominations = pgTable('voucher_cash_denominations', {
  id: bigint('id', { mode: 'number' }).primaryKey().generatedByDefaultAsIdentity(),
  // FK -> vouchers.voucher_id ON DELETE CASCADE.
  voucherId: bigint('voucher_id', { mode: 'number' })
    .notNull()
    .references(() => vouchers.voucherId, { onDelete: 'cascade' }),
  // FK -> ledgers.ledger_id (cross-module).
  ledgerId: bigint('ledger_id', { mode: 'number' }),
  denomination: text('denomination'),
  quantity: integer('quantity').default(0),
  amount: numeric('amount', { precision: 18, scale: 2 }).default('0'),
});

// ---------------------------------------------------------------------------
// voucher_receipt_details
// ---------------------------------------------------------------------------
const voucherReceiptDetails = pgTable('voucher_receipt_details', {
  id: bigint('id', { mode: 'number' }).primaryKey().generatedByDefaultAsIdentity(),
  // FK -> vouchers.voucher_id ON DELETE CASCADE.
  voucherId: bigint('voucher_id', { mode: 'number' })
    .notNull()
    .references(() => vouchers.voucherId, { onDelete: 'cascade' }),
  receiptNoteNo: text('receipt_note_no'),
  receiptDocNo: text('receipt_doc_no'),
  receiptDocDate: text('receipt_doc_date'),
  dispatchedThrough: text('dispatched_through'),
  destination: text('destination'),
  carrierName: text('carrier_name'),
  billOfLadingNo: text('bill_of_lading_no'),
  billOfLadingDate: date('bill_of_lading_date'),
  motorVehicleNo: text('motor_vehicle_no'),
});

// ---------------------------------------------------------------------------
// voucher_party_details
// ---------------------------------------------------------------------------
const voucherPartyDetails = pgTable('voucher_party_details', {
  id: bigint('id', { mode: 'number' }).primaryKey().generatedByDefaultAsIdentity(),
  // FK -> vouchers.voucher_id ON DELETE CASCADE.
  voucherId: bigint('voucher_id', { mode: 'number' })
    .notNull()
    .references(() => vouchers.voucherId, { onDelete: 'cascade' }),
  // Buyer / Supplier (Bill from) side.
  supplierName: text('supplier_name'),
  mailingName: text('mailing_name'),
  address: text('address'),
  addressType: text('address_type'),
  state: text('state'),
  country: text('country'),
  gstRegistrationType: text('gst_registration_type'),
  gstin: text('gstin'),
  // Consignee (Ship to) side.
  consigneeName: text('consignee_name'),
  consigneeMailingName: text('consignee_mailing_name'),
  consigneeAddress: text('consignee_address'),
  consigneeState: text('consignee_state'),
  consigneeCountry: text('consignee_country'),
  consigneeGstRegistrationType: text('consignee_gst_registration_type'),
  consigneeGstin: text('consignee_gstin'),
});

// ---------------------------------------------------------------------------
// voucher_dispatch_details
// All non-key columns also (re)added via ALTER in source init().
// ---------------------------------------------------------------------------
const voucherDispatchDetails = pgTable('voucher_dispatch_details', {
  id: bigint('id', { mode: 'number' }).primaryKey().generatedByDefaultAsIdentity(),
  // FK -> vouchers.voucher_id ON DELETE CASCADE.
  voucherId: bigint('voucher_id', { mode: 'number' })
    .notNull()
    .references(() => vouchers.voucherId, { onDelete: 'cascade' }),
  deliveryNoteNos: text('delivery_note_nos'),
  dispatchDocNo: text('dispatch_doc_no'),
  dispatchedThrough: text('dispatched_through'),
  destination: text('destination'),
  carrierName: text('carrier_name'),
  billOfLadingNo: text('bill_of_lading_no'),
  billOfLadingDate: date('bill_of_lading_date'),
  motorVehicleNo: text('motor_vehicle_no'),
});

// ---------------------------------------------------------------------------
// voucher_credit_note_details
// ---------------------------------------------------------------------------
const voucherCreditNoteDetails = pgTable('voucher_credit_note_details', {
  id: bigint('id', { mode: 'number' }).primaryKey().generatedByDefaultAsIdentity(),
  // FK -> vouchers.voucher_id ON DELETE CASCADE.
  voucherId: bigint('voucher_id', { mode: 'number' })
    .notNull()
    .references(() => vouchers.voucherId, { onDelete: 'cascade' }),
  trackingNo: text('tracking_no'),
  dispatchDocNo: text('dispatch_doc_no'),
  dispatchedThrough: text('dispatched_through'),
  destination: text('destination'),
  carrierName: text('carrier_name'),
  billOfLadingNo: text('bill_of_lading_no'),
  billOfLadingDate: date('bill_of_lading_date'),
  motorVehicleNo: text('motor_vehicle_no'),
  originalInvoiceNo: text('original_invoice_no'),
  originalInvoiceDate: date('original_invoice_date'),
  reasonForIssuingNote: text('reason_for_issuing_note'),
  supplierNoteNo: text('supplier_note_no'),
  supplierNoteDate: date('supplier_note_date'),
  natureOfReturn: text('nature_of_return'),
});

// ---------------------------------------------------------------------------
// voucher_excise_details  (Credit Note — Tax Details → Excise Details)
// ---------------------------------------------------------------------------
const voucherExciseDetails = pgTable('voucher_excise_details', {
  id: bigint('id', { mode: 'number' }).primaryKey().generatedByDefaultAsIdentity(),
  // FK -> vouchers.voucher_id ON DELETE CASCADE.
  voucherId: bigint('voucher_id', { mode: 'number' })
    .notNull()
    .references(() => vouchers.voucherId, { onDelete: 'cascade' }),
  inspectionDocumentNo: text('inspection_document_no'),
  inspectionDocumentDate: text('inspection_document_date'),
});

// ---------------------------------------------------------------------------
// voucher_vat_details  (Sales VAT — Provide VAT details → Additional Details)
// ---------------------------------------------------------------------------
const voucherVatDetails = pgTable('voucher_vat_details', {
  id: bigint('id', { mode: 'number' }).primaryKey().generatedByDefaultAsIdentity(),
  // FK -> vouchers.voucher_id ON DELETE CASCADE.
  voucherId: bigint('voucher_id', { mode: 'number' })
    .notNull()
    .references(() => vouchers.voucherId, { onDelete: 'cascade' }),
  dateTime: text('date_time'),
  pointOfSale: text('point_of_sale'),
});

// ---------------------------------------------------------------------------
// voucher_order_details  (Material In/Out — Order Details + Party's Document Details)
// ---------------------------------------------------------------------------
const voucherOrderDetails = pgTable('voucher_order_details', {
  id: bigint('id', { mode: 'number' }).primaryKey().generatedByDefaultAsIdentity(),
  // FK -> vouchers.voucher_id ON DELETE CASCADE.
  voucherId: bigint('voucher_id', { mode: 'number' })
    .notNull()
    .references(() => vouchers.voucherId, { onDelete: 'cascade' }),
  orderNos: text('order_nos'),
  orderDate: date('order_date'),
  sourceGodownId: bigint('source_godown_id', { mode: 'number' }),
  sourceGodownName: text('source_godown_name'),
  modeTermsOfPayment: text('mode_terms_of_payment'),
  otherReferences: text('other_references'),
  termsOfDelivery: text('terms_of_delivery'),
  challanNos: text('challan_nos'),
  dispatchedThrough: text('dispatched_through'),
  destination: text('destination'),
  carrierName: text('carrier_name'),
  billOfLadingNo: text('bill_of_lading_no'),
  billOfLadingDate: date('bill_of_lading_date'),
  motorVehicleNo: text('motor_vehicle_no'),
});

// ---------------------------------------------------------------------------
// voucher_debit_note_details
// ---------------------------------------------------------------------------
const voucherDebitNoteDetails = pgTable('voucher_debit_note_details', {
  id: bigint('id', { mode: 'number' }).primaryKey().generatedByDefaultAsIdentity(),
  // FK -> vouchers.voucher_id ON DELETE CASCADE.
  voucherId: bigint('voucher_id', { mode: 'number' })
    .notNull()
    .references(() => vouchers.voucherId, { onDelete: 'cascade' }),
  trackingNo: text('tracking_no'),
  dispatchDocNo: text('dispatch_doc_no'),
  dispatchedThrough: text('dispatched_through'),
  destination: text('destination'),
  carrierName: text('carrier_name'),
  billOfLadingNo: text('bill_of_lading_no'),
  billOfLadingDate: date('bill_of_lading_date'),
  motorVehicleNo: text('motor_vehicle_no'),
  originalInvoiceNo: text('original_invoice_no'),
  originalInvoiceDate: date('original_invoice_date'),
  dateTimeOfInvoice: text('date_time_of_invoice'),
  dateTimeOfRemoval: text('date_time_of_removal'),
  reasonForIssuingNote: text('reason_for_issuing_note'),
  supplierNoteNo: text('supplier_note_no'),
  supplierNoteDate: date('supplier_note_date'),
  natureOfReturn: text('nature_of_return'),
});

// ---------------------------------------------------------------------------
// voucher_gst_eway_details  ("Provide GST/e-Way Bill details" — Sales/Credit/Debit Note)
// ---------------------------------------------------------------------------
const voucherGstEwayDetails = pgTable('voucher_gst_eway_details', {
  id: bigint('id', { mode: 'number' }).primaryKey().generatedByDefaultAsIdentity(),
  // FK -> vouchers.voucher_id ON DELETE CASCADE.
  voucherId: bigint('voucher_id', { mode: 'number' })
    .notNull()
    .references(() => vouchers.voucherId, { onDelete: 'cascade' }),
  reasonForIssuingNote: text('reason_for_issuing_note'),
  buyersNoteNo: text('buyers_note_no'),
  buyersNoteDate: date('buyers_note_date'),
  ewayBillNo: text('eway_bill_no'),
  ewayBillDate: date('eway_bill_date'),
  dispatchFrom: text('dispatch_from'),
  shipTo: text('ship_to'),
  transporterName: text('transporter_name'),
  transporterId: text('transporter_id'),
  mode: text('mode'),
  docLadingNo: text('doc_lading_no'),
  docLadingDate: date('doc_lading_date'),
  vehicleNumber: text('vehicle_number'),
  vehicleType: text('vehicle_type'),
});

// ---------------------------------------------------------------------------
// voucher_manufacturer_importer_details  (Purchase excise — Manufacturer / Importer)
// ---------------------------------------------------------------------------
const voucherManufacturerImporterDetails = pgTable('voucher_manufacturer_importer_details', {
  id: bigint('id', { mode: 'number' }).primaryKey().generatedByDefaultAsIdentity(),
  // FK -> vouchers.voucher_id ON DELETE CASCADE.
  voucherId: bigint('voucher_id', { mode: 'number' })
    .notNull()
    .references(() => vouchers.voucherId, { onDelete: 'cascade' }),
  name: text('name'),
  addressType: text('address_type'),
  address: text('address'),
  exciseRegnNo: text('excise_regn_no'),
  importerExporterCode: text('importer_exporter_code'),
  exciseRange: text('excise_range'),
  division: text('division'),
  commissionerate: text('commissionerate'),
  invoiceNo: text('invoice_no'),
  invoiceDate: date('invoice_date'),
});

// ---------------------------------------------------------------------------
// voucher_payroll_entries
// ---------------------------------------------------------------------------
const voucherPayrollEntries = pgTable('voucher_payroll_entries', {
  payrollEntryId: bigint('payroll_entry_id', { mode: 'number' })
    .primaryKey()
    .generatedByDefaultAsIdentity(),
  // FK -> vouchers.voucher_id ON DELETE CASCADE.
  voucherId: bigint('voucher_id', { mode: 'number' })
    .notNull()
    .references(() => vouchers.voucherId, { onDelete: 'cascade' }),
  // FK -> employees.employee_id (cross-module).
  employeeId: bigint('employee_id', { mode: 'number' }),
  // FK -> pay_heads.pay_head_id (cross-module).
  payHeadId: bigint('pay_head_id', { mode: 'number' }),
  amount: numeric('amount', { precision: 18, scale: 2 }).default('0'),
});

module.exports = {
  vouchers,
  voucherEntries,
  voucherStockEntries,
  voucherBatches,
  voucherItemExcise,
  voucherBillReferences,
  voucherBankDetails,
  voucherCostCentres,
  voucherCashDenominations,
  voucherReceiptDetails,
  voucherPartyDetails,
  voucherDispatchDetails,
  voucherCreditNoteDetails,
  voucherDebitNoteDetails,
  voucherExciseDetails,
  voucherVatDetails,
  voucherOrderDetails,
  voucherGstEwayDetails,
  voucherManufacturerImporterDetails,
  voucherPayrollEntries,
};
