export interface EmployeeGroupType {
  employee_group_id?: number;
  company_id?: number;
  name: string;
  alias?: string;
  parent_group_id?: number;
  is_active?: number;
  is_predefined?: number;
  created_at?: string;
  updated_at?: string;
}

export interface EmployeeType {
  employee_id?: number;
  company_id?: number;
  employee_group_id?: number;
  name: string;
  employee_code?: string;
  designation?: string;
  department?: string;
  date_of_joining?: string;
  date_of_leaving?: string;
  mobile?: string;
  email?: string;
  bank_account_number?: string;
  ifsc_code?: string;
  pan?: string;
  aadhaar?: string;
  is_active?: number;
  created_at?: string;
  updated_at?: string;
}
