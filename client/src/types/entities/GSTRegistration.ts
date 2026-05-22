export interface GSTRegistrationType {
  gst_id?: number;
  company_id?: number;
  registration_type?: string;
  registration_status?: string;
  assessee_of_other_territory?: number;
  periodicity_of_gstr1?: string;
  gstin?: string;
  gst_username?: string;
  mode_of_filing?: string;
  e_invoice_details?: string;
  e_invoice_application?: number;
  e_way_bill_applicable?: number;
  e_way_bill_applicable_from?: string;
  applicable_for_intrastat?: number;
  legal_name?: string;
  trade_name?: string;
  state_id?: string;
  registration_date?: string;
  effective_from?: string;
  is_active?: number;
  created_at?: string;
  updated_at?: string;
}
