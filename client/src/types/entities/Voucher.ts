export interface VoucherEntryType {
  entry_id?: number;
  voucher_id?: number;
  ledger_id?: number;
  ledger_name?: string;
  type: string;
  amount?: number;
  amount_forex?: number;
  currency?: string;
  narration?: string;
}

export interface VoucherRecordType {
  voucher_id?: number;
  company_id?: number;
  fy_id?: number;
  voucher_type: string;
  voucher_number?: string;
  date: string;
  reference_number?: string;
  reference_date?: string;
  narration?: string;
  party_ledger_id?: number;
  party_name?: string;
  place_of_supply?: string;
  is_invoice?: number;
  is_accounting_voucher?: number;
  is_inventory_voucher?: number;
  is_order_voucher?: number;
  is_cancelled?: number;
  is_optional?: number;
  is_post_dated?: number;
  created_at?: string;
  updated_at?: string;
  entries?: VoucherEntryType[];
}
