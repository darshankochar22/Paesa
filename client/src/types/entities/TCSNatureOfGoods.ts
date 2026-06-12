export interface TCSNatureOfGoodsType {
  tcs_id?: number;
  company_id?: number;
  name?: string;
  section?: string;
  payment_code?: string;
  rate_individual_with_pan?: number;
  rate_individual_without_pan?: number;
  rate_other_with_pan?: number;
  rate_other_without_pan?: number;
  is_own_status?: number;
  tax_on_receipt_or_realization?: string;
  threshold_level?: number;
  is_predefined?: number;
  is_active?: number;
  created_at?: string;
  updated_at?: string;
}
