export interface GSTClassificationType {
  gc_id?: number;
  company_id?: number;
  name?: string;
  description?: string;
  hsn_sac_code?: string;
  is_non_gst_goods?: number;          
  nature_of_transaction?: string;
  taxability?: string;             
  is_reverse_charge?: number;         
  is_ineligible_for_itc?: number;       
  rate_type?: string;
  igst_rate?: number;
  igst_valuation_type?: string;         
  cgst_rate?: number;
  cgst_valuation_type?: string;       
  sgst_rate?: number;
  sgst_valuation_type?: string;
  cess_rate?: number;
  cess_valuation_type?: string;         
  valuation_type?: string;            
  gst_rate?: number;                    
  is_predefined?: number;
  is_active?: number;
}