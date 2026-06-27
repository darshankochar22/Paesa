export interface VoucherTypeConfig {
  config_id?: number;
  voucher_type_id?: number;
  use_effective_dates?: number;
  allow_zero_value_transactions?: number;
  make_voucher_optional?: number;
  allow_narration?: number;
  allow_narration_per_ledger?: number;
  numbering_behaviour?: string;
  set_alter_additional_numbering?: number;
  show_unused_numbers?: number;
  prevent_duplicate_numbers?: number;
  whatsapp_after_save?: number;
  print_after_save?: number;
}

export interface VoucherTypeType {
  vt_id?: number;
  company_id?: number;
  name: string;
  alias?: string | null;
  short_name?: string;
  category?: string;
  numbering_method?: string;
  is_predefined?: number;
  is_active?: number;
  parent_vt_id?: number | null;
  parent_name?: string;
  created_at?: string;
  updated_at?: string;
  config?: VoucherTypeConfig;
}

export type VoucherTypeCreatePayload = {
  company_id: number;
  name: string;
  alias?: string | null;
  short_name?: string;
  category?: string;
  numbering_method?: string;
  is_active?: number;
  parent_vt_id?: number | null;
} & VoucherTypeConfig;

export type VoucherTypeUpdatePayload = {
  vt_id: number;
  name?: string;
  alias?: string | null;
  short_name?: string;
  category?: string;
  numbering_method?: string;
  is_active?: number;
  parent_vt_id?: number | null;
};

export type VoucherTypeConfigUpdatePayload = {
  voucher_type_id: number;
} & Omit<VoucherTypeConfig, 'config_id' | 'voucher_type_id'>;
