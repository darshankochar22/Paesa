export interface TDSNatureOfPaymentType {
  tds_id?: number;
  company_id?: number;
  name?: string;
  section?: string;
  payment_code?: string;
  remittance_code?: string;
  rate_individual_with_pan?: number;
  rate_other_with_pan?: number;
  is_zero_rated?: number;
  threshold_limit?: number;
  calculate_tax_on_exceeding_threshold?: number;
  is_predefined?: number;
  is_active?: number;
  created_at?: string;
  updated_at?: string;
}
