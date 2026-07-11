// Voucher read-view data shapes + formatting helpers — extracted from
// shared.tsx (unchanged); shared.tsx re-exports everything.
export interface VoucherEntry {
  entry_id: number;
  ledger_id: number;
  ledger_name: string;
  type: 'Dr' | 'Cr';
  amount: number;
  amount_forex: number;
  currency: string;
  narration: string | null;
  // Enriched by getById (LEFT JOIN ledger_statutory_details) so tax ledgers show their rate.
  gst_tax_type?: string | null;
  gst_tax_rate?: number | null;
  type_of_duty_tax?: string | null;
}

export interface StockBatch {
  batch_id: number;
  batch_number: string;
  mfg_date?: string | null;
  expiry_date: string;
  quantity: number;
  actual_quantity?: number;
  rate: number;
  godown?: string | null;
}

export interface StockEntry {
  stock_entry_id: number;
  item_name: string;
  description?: string | null;
  quantity: number;
  rate: number;
  amount: number;
  additional_amount: number;
  discount_amount: number;
  hsn_code: string;
  gst_rate: number;
  cgst_amount: number;
  sgst_amount: number;
  igst_amount: number;
  is_source: number;
  godown_name?: string | null;
  unit_symbol?: string | null;
  batches: StockBatch[];
}

export interface PayrollEntry {
  payroll_entry_id: number;
  employee_id: number;
  employee_name: string;
  employee_number: string;
  pay_head_id: number;
  pay_head_name: string;
  amount: number;
}

export interface AttendanceEntry {
  entry_id: number;
  employee_id: number;
  employee_name: string;
  employee_number: string;
  attendance_type_id: number;
  attendance_type_name: string;
  value: number;
  unit?: string | null;
  cur_bal?: number | null;
}

export interface BillReference {
  bill_id: number;
  ledger_id: number;
  bill_name: string;
  bill_type: string;
  amount: number;
  credit_period: string;
  due_date: string;
}

export interface BankDetails {
  transaction_type: string;
  cheque_range: string;
  instrument_number: string;
  instrument_date: string;
  bank_name: string;
  branch: string;
  amount: number;
}

export interface CostCentreEntry {
  cost_centre_id: number;
  amount: number;
}

export interface CashDenomination {
  denomination: string;
  quantity: number;
  amount: number;
}

export interface ReceiptDetails {
  receipt_note_no: string;
  receipt_doc_no: string;
  dispatched_through: string;
  destination: string;
  carrier_name: string;
  bill_of_lading_no: string;
  bill_of_lading_date: string;
  motor_vehicle_no: string;
}

export interface PartyDetails {
  supplier_name: string;
  mailing_name: string;
  address: string;
  state: string;
  country: string;
}

export interface DispatchDetails {
  delivery_note_nos: string;
  dispatch_doc_no: string;
  dispatched_through: string;
  destination: string;
  carrier_name: string;
  bill_of_lading_no: string;
  bill_of_lading_date: string;
  motor_vehicle_no: string;
}

export interface NoteDetails {
  tracking_no: string;
  dispatch_doc_no: string;
  dispatched_through: string;
  destination: string;
  carrier_name: string;
  bill_of_lading_no: string;
  bill_of_lading_date: string;
  motor_vehicle_no: string;
  original_invoice_no: string;
  original_invoice_date: string;
  reason_for_issuing_note: string | null;
}

export interface OrderDetails {
  source_godown_name: string | null;
  order_nos: string | null;
}

export interface Voucher {
  voucher_id: number;
  voucher_type: string;
  voucher_number: string;
  date: string;
  status: string;
  supplier_invoice_no: string | null;
  supplier_invoice_date: string | null;
  reference_number: string | null;
  reference_date: string | null;
  narration: string | null;
  party_name: string | null;
  party_ledger_id: number | null;
  sales_purchase_ledger_id?: number | null;
  sales_purchase_ledger_name?: string | null;
  place_of_supply: string | null;
  // GST registration snapshot captured at save — drives the "GST Registration"
  // header line and per-registration report scoping.
  gst_registration_id?: number | null;
  is_invoice: number;
  is_accounting_voucher: number;
  is_inventory_voucher: number;
  is_order_voucher: number;
  is_cancelled: number;
  is_optional: number;
  is_post_dated: number;
  applicable_upto: string | null;
  created_at: string;
  updated_at: string;
  entries: VoucherEntry[];
  stock_entries: StockEntry[];
  payroll_entries: PayrollEntry[];
  attendance_entries?: AttendanceEntry[];
  bill_references: BillReference[];
  bank_details: BankDetails | null;
  cost_centres: CostCentreEntry[];
  cash_denominations: CashDenomination[];
  receipt_details: ReceiptDetails | null;
  party_details: PartyDetails | null;
  dispatch_details: DispatchDetails | null;
  credit_note_details: NoteDetails | null;
  debit_note_details: NoteDetails | null;
  order_details?: OrderDetails | null;
}

export const formatDate = (d: string | null) => {
  if (!d) return '—';
  const dt = new Date(d);
  return isNaN(dt.getTime())
    ? d
    : dt.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

export const formatDateBox = (d: string | null) => {
  if (!d) return { date: '—', day: '' };
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return { date: d, day: '' };
  return {
    date: dt.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' }),
    day: dt.toLocaleDateString('en-IN', { weekday: 'long' }),
  };
};

export const formatAmount = (n: number | null | undefined) => {
  if (!n) return '';
  return Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

export const formatQty = (n: number | null | undefined) => {
  if (!n) return '';
  return Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};
