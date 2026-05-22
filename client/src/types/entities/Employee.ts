export interface EmployeeCategoryType {
  employee_category_id?: number;
  company_id?: number;
  name: string;
  alias?: string;
  allocate_revenue?: number;
  allocate_non_revenue?: number;
  is_active?: number;
  is_predefined?: number;
  created_at?: string;
  updated_at?: string;
}

export interface EmployeeGroupType {
  employee_group_id?: number;
  company_id?: number;
  employee_category_id?: number;
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
  employee_category_id?: number;
  employee_group_id?: number;
  name: string;
  alias?: string;
  employee_code?: string;
  designation?: string;
  department?: string;
  function?: string;
  location?: string;
  date_of_joining?: string;
  date_of_leaving?: string;
  date_of_birth?: string;
  gender?: string;
  blood_group?: string;
  father_name?: string;
  mother_name?: string;
  spouse_name?: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  mobile?: string;
  phone?: string;
  email?: string;
  define_salary_details?: number;
  bank_account_number?: string;
  bank_name?: string;
  bank_branch?: string;
  ifsc_code?: string;
  applicable_tax_regime?: string;
  pan?: string;
  aadhaar?: string;
  uan?: string;
  pf_account_number?: string;
  eps_account_number?: string;
  date_of_joining_pf?: string;
  pran?: string;
  esi_number?: string;
  esi_dispensary_name?: string;
  is_active?: number;
  created_at?: string;
  updated_at?: string;
}
