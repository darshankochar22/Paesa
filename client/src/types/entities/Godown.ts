export interface GodownType {
  godown_id?: number;
  company_id?: number;
  name: string;
  alias?: string;
  parent_godown_id?: number;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  is_primary?: number;
  is_main_location?: number;
  allow_storage_of_materials?: number;
  is_active?: number;
  is_predefined?: number;
  created_at?: string;
  updated_at?: string;
}
