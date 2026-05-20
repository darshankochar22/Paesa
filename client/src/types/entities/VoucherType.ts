export interface VoucherTypeType {
  vt_id?: number;
  company_id?: number;
  name: string;
  short_name?: string;
  category?: string;
  default_voucher_class?: string;
  affects_inventory?: number;
  affects_accounting?: number;
  affects_gst?: number;
  numbering_method?: string;
  numbering_prefix?: string;
  numbering_suffix?: string;
  starts_with?: number;
  is_predefined?: number;
  is_active?: number;
  created_at?: string;
  updated_at?: string;
}
