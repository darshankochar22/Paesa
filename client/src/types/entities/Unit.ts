export interface UnitType {
  unit_id?: number;
  company_id?: number;
  name: string;
  symbol: string;
  formal_name?: string;
  decimal_places?: number;
  unit_quantity_code?: string;
  uqc_effective_date?: string | null;
  unit_type?: string;
  is_simple?: number;
  is_active?: number;
  is_predefined?: number;
  first_unit_id?: number;
  second_unit_id?: number;
  conversion_factor?: number;
  first_unit_symbol?: string;
  first_unit_formal_name?: string;
  second_unit_symbol?: string;
  second_unit_formal_name?: string;
  created_at?: string;
  updated_at?: string;
}
