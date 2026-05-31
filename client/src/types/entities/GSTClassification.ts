export interface GSTClassificationType {
  gc_id?: number;
  company_id?: number;
  name?: string;
  description?: string;
  hsn_sac_code?: string;
  is_non_gst_goods?: number;           // add
  nature_of_transaction?: string;
  taxability?: string;                  // add
  is_reverse_charge?: number;           // add
  is_ineligible_for_itc?: number;       // add
  igst_rate?: number;
  igst_valuation_type?: string;         // add
  cgst_rate?: number;
  cgst_valuation_type?: string;         // add
  sgst_rate?: number;
  sgst_valuation_type?: string;         // add
  cess_rate?: number;
  cess_valuation_type?: string;         // add
  valuation_type?: string;              // purana — rakhlo backward compat ke liye
  gst_rate?: number;                    // purana — rakhlo
  is_predefined?: number;
  is_active?: number;
}