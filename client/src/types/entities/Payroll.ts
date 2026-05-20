export interface PayrollUnitType {
  payroll_unit_id?: number;
  company_id?: number;
  name: string;
  symbol?: string;
  unit_type?: string;
  decimal_places?: number;
  is_active?: number;
  is_predefined?: number;
  created_at?: string;
  updated_at?: string;
}

export interface PayHeadType {
  pay_head_id?: number;
  company_id?: number;
  name: string;
  pay_head_type?: string;
  calculation_type?: string;
  affects_net_salary?: number;
  under_group?: string;
  statutory_component?: string;
  percentage_or_amount?: number;
  is_active?: number;
  is_predefined?: number;
  created_at?: string;
  updated_at?: string;
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
  type?: string;
  unit_id?: number;
  is_active?: number;
  is_predefined?: number;
  created_at?: string;
  updated_at?: string;
}
