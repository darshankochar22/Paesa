export interface FeatureGroupType {
  feature_group_id?: number;
  group_key?: string;
  group_name?: string;
  online_access?: number;
  display_order?: number;
  is_active?: number;
}

export interface FeatureItemType {
  feature_item_id?: number;
  feature_group_id?: number;
  feature_key?: string;
  feature_name?: string;
  description?: string;
  control_type?: string;
  default_value_boolean?: number;
  display_order?: number;
  is_mandatory?: number;
  is_active?: number;
}
