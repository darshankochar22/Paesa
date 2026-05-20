export interface GSTClassificationType {
  gc_id?: number;
  company_id?: number;
  name: string;
  nature_of_transaction?: string;
  hsn_sac_code?: string;
  gst_rate?: number;
  cgst_rate?: number;
  sgst_rate?: number;
  igst_rate?: number;
  cess_rate?: number;
  valuation_type?: string;
  description?: string;
  is_predefined?: number;
  is_active?: number;
  created_at?: string;
  updated_at?: string;
}
