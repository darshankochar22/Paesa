const { sqliteTable, text, integer, real } = require('drizzle-orm/sqlite-core');
const { sql } = require('drizzle-orm');

const vouchers = sqliteTable('vouchers', {
  voucherId: integer('voucher_id').primaryKey({ autoIncrement: true }),
  companyId: integer('company_id').notNull(),
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
  partyLedgerId: integer('party_ledger_id'),
  partyName: text('party_name'),
  placeOfSupply: text('place_of_supply'),
  // GST snapshot (immutable after save) — see voucher.js init() migrations.
  gstRegistrationId: integer('gst_registration_id'),
  companyState: text('company_state'),
  isInterstate: integer('is_interstate').default(0),
  // Export/SEZ supply nature snapshot: EXPWP|EXPWOP|SEZWP|SEZWOP (null = domestic B2B/B2C).
  supplyType: text('supply_type'),
  isInvoice: integer('is_invoice').default(0),
  isAccountingVoucher: integer('is_accounting_voucher').default(1),
  isInventoryVoucher: integer('is_inventory_voucher').default(0),
  isOrderVoucher: integer('is_order_voucher').default(0),
  isCancelled: integer('is_cancelled').default(0),
  isOptional: integer('is_optional').default(0),
  isPostDated: integer('is_post_dated').default(0),
  // Reversing Journal: date up to which the (non-posting) entry is applicable.
  applicableUpto: text('applicable_upto'),
  // Selected Voucher Type Class ("Name of Class") name, if any.
  voucherClass: text('voucher_class'),
  // Sales/Purchase ledger on non-accounting inventory vouchers (Receipt Note etc.) —
  // informational only, never posted to voucher_entries.
  salesPurchaseLedgerId: integer('sales_purchase_ledger_id'),
  createdAt: text('created_at').default(sql`(datetime('now'))`),
  updatedAt: text('updated_at').default(sql`(datetime('now'))`),
});

// ---------------------------------------------------------------------------
// voucher_entries  (accounting Dr/Cr lines)
// ---------------------------------------------------------------------------
const voucherEntries = sqliteTable('voucher_entries', {
  entryId: integer('entry_id').primaryKey({ autoIncrement: true }),
  // FK -> vouchers(voucher_id) ON DELETE CASCADE.
  voucherId: integer('voucher_id')
    .notNull()
    .references(() => vouchers.voucherId),
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
  voucherId: integer('voucher_id')
    .notNull()
    .references(() => vouchers.voucherId),
  stockItemId: integer('stock_item_id'),
  itemName: text('item_name'),
  // Free-text line description shown inline under the item (e.g. a colour/spec
  // like "80 Red") — distinct from the linked stock item's master name.
  description: text('description'),
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
  voucherId: integer('voucher_id')
    .notNull()
    .references(() => vouchers.voucherId),
  // FK -> voucher_stock_entries(stock_entry_id) ON DELETE CASCADE.
  stockEntryId: integer('stock_entry_id')
    .notNull()
    .references(() => voucherStockEntries.stockEntryId),
  batchNumber: text('batch_number'),
  trackingNo: text('tracking_no'),
  mfgDate: text('mfg_date'),
  expiryDate: text('expiry_date'),
  quantity: real('quantity').default(0),
  rate: real('rate').default(0),
  godown: text('godown'),
  actualQuantity: real('actual_quantity').default(0),
  discPercent: real('disc_percent').default(0),
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
const voucherItemExcise = sqliteTable('voucher_item_excise', {
  itemExciseId: integer('item_excise_id').primaryKey({ autoIncrement: true }),
  // FK -> vouchers(voucher_id) ON DELETE CASCADE.
  voucherId: integer('voucher_id')
    .notNull()
    .references(() => vouchers.voucherId),
  // FK -> voucher_stock_entries(stock_entry_id) ON DELETE CASCADE.
  stockEntryId: integer('stock_entry_id')
    .notNull()
    .references(() => voucherStockEntries.stockEntryId),
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
const voucherBillReferences = sqliteTable('voucher_bill_references', {
  billId: integer('bill_id').primaryKey({ autoIncrement: true }),
  // FK -> vouchers(voucher_id) ON DELETE CASCADE.
  voucherId: integer('voucher_id')
    .notNull()
    .references(() => vouchers.voucherId),
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
  voucherId: integer('voucher_id')
    .notNull()
    .references(() => vouchers.voucherId),
  // FK -> ledgers(ledger_id) (cross-module).
  ledgerId: integer('ledger_id'),
  transactionType: text('transaction_type').default('Cheque'),
  chequeRange: text('cheque_range'),
  instrumentNumber: text('instrument_number'),
  instrumentDate: text('instrument_date'),
  bankName: text('bank_name'),
  branch: text('branch'),
  accountNumber: text('account_number'),
  ifscCode: text('ifsc_code'),
  paymentGateway: text('payment_gateway'),
  amount: real('amount').default(0),
  favouringName: text('favouring_name'),
  transferMode: text('transfer_mode'),
  allocationsJson: text('allocations_json'),
});

// ---------------------------------------------------------------------------
// voucher_cost_centres  (cost-centre split of an entry)
// ---------------------------------------------------------------------------
const voucherCostCentres = sqliteTable('voucher_cost_centres', {
  ccEntryId: integer('cc_entry_id').primaryKey({ autoIncrement: true }),
  // FK -> vouchers(voucher_id) ON DELETE CASCADE.
  voucherId: integer('voucher_id')
    .notNull()
    .references(() => vouchers.voucherId),
  // FK -> voucher_entries(entry_id).
  entryId: integer('entry_id').references(() => voucherEntries.entryId),
  costCentreId: integer('cost_centre_id'),
  costCategoryId: integer('cost_category_id'),
  amount: real('amount').default(0),
});

// ---------------------------------------------------------------------------
// voucher_cash_denominations
// ---------------------------------------------------------------------------
const voucherCashDenominations = sqliteTable('voucher_cash_denominations', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  // FK -> vouchers(voucher_id) ON DELETE CASCADE.
  voucherId: integer('voucher_id')
    .notNull()
    .references(() => vouchers.voucherId),
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
  voucherId: integer('voucher_id')
    .notNull()
    .references(() => vouchers.voucherId),
  receiptNoteNo: text('receipt_note_no'),
  receiptDocNo: text('receipt_doc_no'),
  receiptDocDate: text('receipt_doc_date'),
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
  voucherId: integer('voucher_id')
    .notNull()
    .references(() => vouchers.voucherId),
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
const voucherDispatchDetails = sqliteTable('voucher_dispatch_details', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  // FK -> vouchers(voucher_id) ON DELETE CASCADE.
  voucherId: integer('voucher_id')
    .notNull()
    .references(() => vouchers.voucherId),
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
  voucherId: integer('voucher_id')
    .notNull()
    .references(() => vouchers.voucherId),
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
  reasonForIssuingNote: text('reason_for_issuing_note'),
  supplierNoteNo: text('supplier_note_no'),
  supplierNoteDate: text('supplier_note_date'),
  natureOfReturn: text('nature_of_return'),
});

// ---------------------------------------------------------------------------
// voucher_excise_details  (Credit Note — Tax Details → Excise Details)
// ---------------------------------------------------------------------------
const voucherExciseDetails = sqliteTable('voucher_excise_details', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  // FK -> vouchers(voucher_id) ON DELETE CASCADE.
  voucherId: integer('voucher_id')
    .notNull()
    .references(() => vouchers.voucherId),
  inspectionDocumentNo: text('inspection_document_no'),
  inspectionDocumentDate: text('inspection_document_date'),
});

// ---------------------------------------------------------------------------
// voucher_vat_details  (Sales VAT — Provide VAT details → Additional Details)
// ---------------------------------------------------------------------------
const voucherVatDetails = sqliteTable('voucher_vat_details', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  // FK -> vouchers(voucher_id) ON DELETE CASCADE.
  voucherId: integer('voucher_id')
    .notNull()
    .references(() => vouchers.voucherId),
  dateTime: text('date_time'),
  pointOfSale: text('point_of_sale'),
});

// ---------------------------------------------------------------------------
// voucher_order_details  (Material In/Out — Order Details + Party's Document Details)
// ---------------------------------------------------------------------------
const voucherOrderDetails = sqliteTable('voucher_order_details', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  // FK -> vouchers(voucher_id) ON DELETE CASCADE.
  voucherId: integer('voucher_id')
    .notNull()
    .references(() => vouchers.voucherId),
  orderNos: text('order_nos'),
  orderDate: text('order_date'),
  sourceGodownId: integer('source_godown_id'),
  sourceGodownName: text('source_godown_name'),
  modeTermsOfPayment: text('mode_terms_of_payment'),
  otherReferences: text('other_references'),
  termsOfDelivery: text('terms_of_delivery'),
  challanNos: text('challan_nos'),
  dispatchedThrough: text('dispatched_through'),
  destination: text('destination'),
  carrierName: text('carrier_name'),
  billOfLadingNo: text('bill_of_lading_no'),
  billOfLadingDate: text('bill_of_lading_date'),
  motorVehicleNo: text('motor_vehicle_no'),
});

// ---------------------------------------------------------------------------
// voucher_debit_note_details
// ---------------------------------------------------------------------------
const voucherDebitNoteDetails = sqliteTable('voucher_debit_note_details', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  // FK -> vouchers(voucher_id) ON DELETE CASCADE.
  voucherId: integer('voucher_id')
    .notNull()
    .references(() => vouchers.voucherId),
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
  dateTimeOfInvoice: text('date_time_of_invoice'),
  dateTimeOfRemoval: text('date_time_of_removal'),
  reasonForIssuingNote: text('reason_for_issuing_note'),
  supplierNoteNo: text('supplier_note_no'),
  supplierNoteDate: text('supplier_note_date'),
  natureOfReturn: text('nature_of_return'),
});

// ---------------------------------------------------------------------------
// voucher_gst_eway_details
// "Provide GST/e-Way Bill details" → Statutory Details popup shared by
// Sales / Credit Note / Debit Note (Additional Details, e-Way Bill, Place of
// Party, Transport Details, Part B).
// ---------------------------------------------------------------------------
const voucherGstEwayDetails = sqliteTable('voucher_gst_eway_details', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  // FK -> vouchers(voucher_id) ON DELETE CASCADE.
  voucherId: integer('voucher_id')
    .notNull()
    .references(() => vouchers.voucherId),
  // Additional Details (Credit/Debit Note only).
  reasonForIssuingNote: text('reason_for_issuing_note'),
  buyersNoteNo: text('buyers_note_no'),
  buyersNoteDate: text('buyers_note_date'),
  // e-Way Bill Details.
  ewayBillNo: text('eway_bill_no'),
  ewayBillDate: text('eway_bill_date'),
  // Place of Party.
  dispatchFrom: text('dispatch_from'),
  shipTo: text('ship_to'),
  // Transport Details.
  transporterName: text('transporter_name'),
  transporterId: text('transporter_id'),
  // Part B Details.
  mode: text('mode'),
  docLadingNo: text('doc_lading_no'),
  docLadingDate: text('doc_lading_date'),
  vehicleNumber: text('vehicle_number'),
  vehicleType: text('vehicle_type'),
});

// ---------------------------------------------------------------------------
// voucher_manufacturer_importer_details
// Purchase (excise) — "Manufacturer / Importer Details" popup shown after Party
// Details.
// ---------------------------------------------------------------------------
const voucherManufacturerImporterDetails = sqliteTable('voucher_manufacturer_importer_details', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  // FK -> vouchers(voucher_id) ON DELETE CASCADE.
  voucherId: integer('voucher_id')
    .notNull()
    .references(() => vouchers.voucherId),
  name: text('name'),
  addressType: text('address_type'),
  address: text('address'),
  exciseRegnNo: text('excise_regn_no'),
  importerExporterCode: text('importer_exporter_code'),
  exciseRange: text('excise_range'),
  division: text('division'),
  commissionerate: text('commissionerate'),
  invoiceNo: text('invoice_no'),
  invoiceDate: text('invoice_date'),
});

// ---------------------------------------------------------------------------
// voucher_payroll_entries
// ---------------------------------------------------------------------------
const voucherPayrollEntries = sqliteTable('voucher_payroll_entries', {
  payrollEntryId: integer('payroll_entry_id').primaryKey({ autoIncrement: true }),
  // FK -> vouchers(voucher_id) ON DELETE CASCADE.
  voucherId: integer('voucher_id')
    .notNull()
    .references(() => vouchers.voucherId),
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
