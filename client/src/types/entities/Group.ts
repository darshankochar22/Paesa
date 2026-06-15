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
  sort_order?: number;
  group_type?: string;
  display_order?: number;
  is_active?: number;
  created_at?: string;
  updated_at?: string;
}
