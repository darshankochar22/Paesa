export interface LedgerType {
  ledger_id?: number;
  company_id?: number;
  group_id?: number;
  name: string;
  alias?: string;
  ledger_type?: string;
  nature?: string;
  opening_balance?: number;
  closing_balance?: number;
  is_bill_wise?: number;
  maintain_inventory_values?: number;
  mailing_name?: string;
  address1?: string;
  address2?: string;
  city?: string;
  state?: string;
  country?: string;
  pincode?: string;
  phone?: string;
  email?: string;
  gstin?: string;
  pan?: string;
  registration_type?: string;
  is_active?: number;
  is_predefined?: number;
  created_at?: string;
  updated_at?: string;

  bank_details?: {
  account_holder_name?: string;
  account_number?: string;
  ifsc_code?: string;
  swift_code?: string;
  bank_name?: string;
  branch_name?: string;
  bank_configuration?: string;
  cheque_book_start_no?: string;
  cheque_book_end_no?: string;
  enable_cheque_printing?: number;
  cheque_printing_configuration?: string;
  od_limit?: number;
  transaction_type?: string;
};

statutory_details?: {
  gst_applicability?: string;
  hsn_sac_code?: string;
  hsn_sac_description?: string;
  gst_rate?: number;
  cgst_rate?: number;
  sgst_rate?: number;
  igst_rate?: number;
  type_of_duty_tax?: string;
  percentage_of_calculation?: number;
  statutory_details?: string;
};
}
