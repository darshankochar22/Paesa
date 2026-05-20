export interface StockCategoryType {
  sc_id?: number;
  company_id?: number;
  name: string;
  alias?: string;     
  description?: string;
  parent_category_id?: number;
  is_active?: number;
  created_at?: string;
  updated_at?: string;
}
