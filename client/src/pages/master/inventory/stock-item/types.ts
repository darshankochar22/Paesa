export interface FormData {
  name: string;
  alias: string;
  group_id: string;
  unit_id: string;
  rate_of_duty: string;
  has_bom: boolean;
  bom_name: string;
  opening_quantity: string;
  opening_rate: string;

  gst_applicable: string;
  hsn_sac_details: string;
  hsn_sac: string;
  hsn_sac_description: string;
  hsn_classification_id: string;
  gst_rate_details: string;
  rate_classification_id: string;
  taxability_type: string;
  gst_rate: string;
  type_of_supply: string;
}

export type PanelType =
  | "group"
  | "unit"
  | "gst_applicable"
  | "hsn_sac_details"
  | "gst_rate_details"
  | "hsn_classification"
  | "rate_classification"
  | "taxability_type"
  | "type_of_supply"
  | null;
