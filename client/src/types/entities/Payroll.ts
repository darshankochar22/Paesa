export interface PayrollUnitType {
  payroll_unit_id?: number;
  company_id?: number;
  name: string;
  symbol?: string;
  formal_name?: string;
  unit_type?: string;
  decimal_places?: number;
  first_unit?: string;
  conversion?: number;
  second_unit?: string;
  is_active?: number;
  is_predefined?: number;
  created_at?: string;
  updated_at?: string;
}

export interface PayHeadType {
  pay_head_id?: number;
  company_id?: number;
  name: string;
  alias?: string;
  pay_head_type?: string;
  income_type?: string;
  under_group?: string;
  affects_net_salary?: number;
  payslip_display_name?: string;
  use_for_gratuity?: number;
  set_alter_income_tax?: number;
  calculation_type?: string;
  calculation_period?: string;
  rounding_method?: string;
  rounding_limit?: number;
  statutory_component?: string;
  percentage_or_amount?: number;
  statutory_pay_type?: string;
  compute_method?: string;
  registration_number?: string;
  contribute_min_rs2?: number;
  leave_without_pay?: string;
  production_type?: string;
  opening_balance?: number;
  opening_balance_type?: string;
  it_component?: string;
  it_calculation_basis?: string;
  it_deduct_tds_across_periods?: number;
  gratuity_days_per_month?: number;
  is_active?: number;
  is_predefined?: number;
  created_at?: string;
  updated_at?: string;
}

export interface PayHeadGratuitySlabType {
  gratuity_slab_id?: number;
  pay_head_id?: number;
  months_from?: number;
  months_to?: number;
  eligibility_days?: number;
  created_at?: string;
}

export interface PayHeadSlabLineType {
  slab_line_id?: number;
  pay_head_id?: number;
  effective_from?: string;
  amount_gt?: number;
  amount_up_to?: number;
  slab_type?: string;
  value?: number;
  created_at?: string;
}

export interface PayHeadFormulaLineType {
  formula_line_id?: number;
  pay_head_id?: number;
  sequence?: number;
  function?: string;
  pay_head_id_ref?: number;
  operator?: string;
  pay_head_name?: string;
  created_at?: string;
}

export interface SalaryStructureType {
  structure_id?: number;
  company_id?: number;
  employee_id?: number;
  effective_from: string;
  pay_head_id?: number;
  amount?: number;
  calculation_mode?: string;
  is_active?: number;
  created_at?: string;
  updated_at?: string;
}

export interface AttendanceTypeType {
  attendance_type_id?: number;
  company_id?: number;
  name: string;
  alias?: string;
  type?: string;
  unit_id?: number;
  period?: string;
  carry_forward?: number;
  encashment?: number;
  max_days?: number;
  is_active?: number;
  is_predefined?: number;
  created_at?: string;
  updated_at?: string;
}
