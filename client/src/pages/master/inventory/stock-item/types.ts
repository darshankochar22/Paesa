export interface AllocationEntry {
  allocation_id?: number;
  godown_id: string;
  batch_number: string;
  mfg_date: string;
  expiry_date: string;
  quantity: string;
  rate: string;
  amount?: number;
}

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

  track_batches: boolean;
  track_expiry: boolean;
  allocations: AllocationEntry[];

  maintain_in_batches: string;
  track_date_of_manufacturing: string;
  use_expiry_dates: string;
  enable_cost_tracking: string;
  set_alter_statutory: string;
  excise_applicable: string;
  set_alter_excise_details: string;
  excise_tariff_name: string;
  excise_tariff_hsn_code: string;
  excise_tariff_uom: string;
  excise_tariff_valuation_type: string;
  excise_tariff_rate: string;
  excise_tariff_rate_per_unit: string;
  vat_applicable: string;
  set_alter_vat_details: string;
  vat_tax_rate: string;
  vat_tax_type: string;
}

export type PanelType =
  | "group"
  | "unit"
  | "hsn_classification"
  | "rate_classification"
  | null;
