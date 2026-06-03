export interface StockGroupType {
  sg_id?: number;
  company_id?: number;
  name: string;
  alias?: string;
  parent_group_id?: number;
  should_quantities_be_added?: number;
  hsn_sac_code?: string;
  hsn_sac_description?: string;
  gst_rate?: number;
  cgst_rate?: number;
  sgst_rate?: number;
  taxability_type?: string;
  statutory_details?: string;
  is_primary?: number;
  is_active?: number;
  is_predefined?: number;
  created_at?: string;
  updated_at?: string;
}

export interface StockGroupTreeNode extends StockGroupType {
  children: StockGroupTreeNode[]; 
}
