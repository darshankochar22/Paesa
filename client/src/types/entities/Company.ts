export interface CompanyType {
  company_id?: number;
  name: string;
  mailing_name?: string;
  address1?: string;
  address2?: string;
  state?: string;
  country?: string;
  pincode?: string;
  telephone?: string;
  mobile?: string;
  fax?: string;
  email?: string;
  website?: string;
  base_currency_symbol?: string;
  formal_name?: string;
  financial_year_beginning_from?: string;
  books_beginning_from?: string;
  access_control?: string;
  edit_log?: string;
  // Bug 5: the persisted "current default GST registration" that prefills NEW vouchers.
  current_default_gst_registration_id?: number | null;
  created_at?: string;
}
