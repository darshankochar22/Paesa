export interface SlabBasedRate {
  greater_than: number;
  up_to: number | null;
  taxability_type: string;
  gst_rate: number;
}

export interface GroupType {
  group_id?: number;
  company_id?: number;
  name: string;
  alias?: string;
  parent_group_id?: number;
  is_primary?: number;
  is_predefined?: number;
  nature?: string;
  set_alter_tds_details?: number;
  set_alter_tcs_details?: number;
  set_alter_other_statutory_details?: number;
  set_alter_service_tax_details?: number;
  hsn_sac_source?: string;
  hsn_sac_description?: string;
  gst_rate_source?: string;
  taxability_type?: string;
  behaves_like_subledger?: number;
  show_net_debit_credit?: number;
  used_for_calculation?: number;
  allocation_method?: string;
  gst_rate?: number;
  cgst_rate?: number;
  sgst_rate?: number;
  igst_rate?: number;
  hsn_sac_code?: string;
  statutory_details?: string;
  hsn_sac_classification_id?: number;
  gst_classification_id?: number;
  slab_based_rates?: string;
  sort_order?: number;
  group_type?: string;
  display_order?: number;
  is_active?: number;
  created_at?: string;
  updated_at?: string;
}
