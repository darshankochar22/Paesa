// Additional numbering details sub-screen rows (issue #143).
export interface NumberingRestartRow {
  applicable_from: string;
  starting_number: number;
  particulars: string;
}
export interface NumberingAffixRow {
  applicable_from: string;
  particulars: string;
}

// Tax classifications set on an allocation row when "Set/Alter Tax Class?" is Yes.
export interface TaxClassifications {
  gst?: string;         // e.g. "Local Sales - Taxable", "Exports - Taxable"
  service_tax?: string; // e.g. "Not Applicable"
  excise?: string;      // e.g. "Undefined"
  tcs?: string;         // Nature of Goods, e.g. "Not Applicable"
}

// One row of "Default Accounting Allocations for all items in Invoice".
export interface ClassAllocationRow {
  id: string;
  ledger_id?: number;
  ledger_name?: string;
  set_alter_tax_class?: "Yes" | "No";    // Set/Alter Tax Class ? — Yes opens Tax classification details
  tax_classifications?: TaxClassifications;
  percentage?: number;                   // Percentage %
  rounding_method?: string;              // Rounding Method
  rounding_limit?: number;               // Rounding Limit
  override_item_default?: "Yes" | "No";  // Override using Item Default ?
}

// One row of "Additional Accounting Entries (e.g. Taxes / Other charges) to be added in Invoice".
export interface ClassAdditionalEntryRow {
  id: string;
  ledger_id?: number;
  ledger_name?: string;
  type_of_calculation?: string;          // Type of Calculation
  value_basis?: number;                  // Value Basis
  rounding_method?: string;              // Rounding Method
  rounding_limit?: number;               // Rounding Limit
  remove_if_zero?: "Yes" | "No";         // Remove if Zero ?
}

// Name of Class rows — a named class per voucher type. The Tally "Voucher Type Class" screen:
// optional group restriction (exclude/include), default per-item accounting allocations, and
// additional accounting entries (taxes / other charges). GST fields power the existing
// GST-ledger-mapping used by invoicing. All persisted as JSON in voucher_type_configs.voucher_classes.
export interface VoucherClassRow {
  id: string;
  name: string;
  use_for_gst_details: "Yes" | "No";
  gst_ledger_ids: number[];
  // "Voucher Type Class" screen
  exclude_groups?: number[];
  include_groups?: number[];
  default_allocations?: ClassAllocationRow[];
  additional_entries?: ClassAdditionalEntryRow[];
}

export interface VoucherTypeConfig {
  config_id?: number;
  voucher_type_id?: number;
  use_effective_dates?: number;
  allow_zero_value_transactions?: number;
  make_voucher_optional?: number;
  allow_narration?: number;
  allow_narration_per_ledger?: number;
  numbering_behaviour?: string;
  set_alter_additional_numbering?: number;
  show_unused_numbers?: number;
  prevent_duplicate_numbers?: number;
  whatsapp_after_save?: number;
  print_after_save?: number;
  // Additional numbering details (issue #143)
  starting_number?: number;
  width_of_numerical_part?: number;
  prefill_with_zero?: number;
  restart_numbering?: NumberingRestartRow[];
  prefix_details?: NumberingAffixRow[];
  suffix_details?: NumberingAffixRow[];
  voucher_classes?: VoucherClassRow[];
}

export interface VoucherTypeType {
  vt_id?: number;
  company_id?: number;
  name: string;
  alias?: string | null;
  short_name?: string;
  category?: string;
  numbering_method?: string;
  is_predefined?: number;
  is_active?: number;
  parent_vt_id?: number | null;
  parent_name?: string;
  created_at?: string;
  updated_at?: string;
  config?: VoucherTypeConfig;
}

export type VoucherTypeCreatePayload = {
  company_id: number;
  name: string;
  alias?: string | null;
  short_name?: string;
  category?: string;
  numbering_method?: string;
  is_active?: number;
  parent_vt_id?: number | null;
} & VoucherTypeConfig;

export type VoucherTypeUpdatePayload = {
  vt_id: number;
  name?: string;
  alias?: string | null;
  short_name?: string;
  category?: string;
  numbering_method?: string;
  is_active?: number;
  parent_vt_id?: number | null;
};

export type VoucherTypeConfigUpdatePayload = {
  voucher_type_id: number;
} & Omit<VoucherTypeConfig, 'config_id' | 'voucher_type_id'>;
