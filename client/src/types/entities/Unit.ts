export interface UnitType {
  unit_id?: number;
  company_id?: number;
  name: string;
  symbol: string;
  formal_name?: string;
  decimal_places?: number;
  unit_quantity_code?: string;
  unit_type?: string;
  is_simple?: number;
  is_active?: number;
  is_predefined?: number;
  created_at?: string;
  updated_at?: string;
}
