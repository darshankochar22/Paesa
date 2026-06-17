export type StatutoryToggle = "tds" | "tcs" | "serviceTax" | "vat" | "excise";

export interface PrimaryGroupStatutoryConfig {
  /** Show HSN/SAC + GST Rate statutory sections */
  showStatutorySections: boolean;
  /** Standalone toggle rows shown in the feature-toggles section of the form */
  featureToggles: StatutoryToggle[];
  /** Toggles shown inside the "Statutory Details" modal (when showStatutorySections is true) */
  statutoryModalToggles: StatutoryToggle[];
}

export interface StatutoryToggleMeta {
  label: string;
  /** DB column key on GroupType (snake_case for backend payload) */
  dbKey: string;
}

export const TOGGLE_META: Record<StatutoryToggle, StatutoryToggleMeta> = {
  tds:         { label: "Set/Alter TDS details",             dbKey: "set_alter_tds_details" },
  tcs:         { label: "Set/Alter TCS details",             dbKey: "set_alter_tcs_details" },
  serviceTax:  { label: "Set/Alter service tax details",     dbKey: "set_alter_service_tax_details" },
  vat:         { label: "Set/Alter VAT Details",             dbKey: "set_alter_vat_details" },
  excise:      { label: "Set/Alter excise details",          dbKey: "set_alter_excise_details" },
};

/** Maps a primary group name to what statutory fields are applicable for groups created under it. */
export const PRIMARY_GROUP_STATUTORY_CONFIG: Record<string, PrimaryGroupStatutoryConfig> = {
  "Current Assets": {
    showStatutorySections: true,
    featureToggles: [],
    statutoryModalToggles: ["serviceTax", "tds"],
  },
  "Current Liabilities": {
    showStatutorySections: true,
    featureToggles: [],
    statutoryModalToggles: ["serviceTax", "tds"],
  },
  "Fixed Assets": {
    showStatutorySections: true,
    featureToggles: [],
    statutoryModalToggles: ["serviceTax", "tds"],
  },
  "Investments": {
    showStatutorySections: true,
    featureToggles: [],
    statutoryModalToggles: ["serviceTax", "tds"],
  },
  "Loans(Liability)": {
    showStatutorySections: true,
    featureToggles: [],
    statutoryModalToggles: ["serviceTax", "tds"],
  },
  "Misc.Expenses(Asset)": {
    showStatutorySections: true,
    featureToggles: [],
    statutoryModalToggles: ["serviceTax", "tds"],
  },
  "Sales Accounts": {
    showStatutorySections: true,
    featureToggles: [],
    statutoryModalToggles: ["serviceTax", "tcs", "vat", "excise"],
  },
  "Purchase Accounts": {
    showStatutorySections: true,
    featureToggles: [],
    statutoryModalToggles: ["serviceTax", "tds", "vat", "excise"],
  },
  "Direct Expenses": {
    showStatutorySections: true,
    featureToggles: [],
    statutoryModalToggles: ["serviceTax", "tds", "vat", "excise"],
  },
  "Indirect Expenses": {
    showStatutorySections: true,
    featureToggles: [],
    statutoryModalToggles: ["serviceTax", "tds", "vat", "excise"],
  },
  "Branch/Divisions": {
    showStatutorySections: false,
    featureToggles: ["tds", "tcs"],
    statutoryModalToggles: [],
  },
};

/**
 * Default configuration for any primary group not explicitly listed above.
 * Most groups outside the statutory set just offer a standalone TDS toggle.
 */
export const DEFAULT_CONFIG: PrimaryGroupStatutoryConfig = {
  showStatutorySections: false,
  featureToggles: ["tds"],
  statutoryModalToggles: [],
};

/**
 * Config overrides keyed by the direct parent group name.
 * Takes priority over the primary group config when the parent matches exactly.
 */
const PARENT_GROUP_OVERRIDES: Record<string, PrimaryGroupStatutoryConfig> = {
  "Suspense A/c": {
    showStatutorySections: false,
    featureToggles: ["tds"],
    statutoryModalToggles: [],
  },
  "Deposits (Asset)": {
    showStatutorySections: false,
    featureToggles: ["tds"],
    statutoryModalToggles: [],
  },
  "Duties & Taxes": {
    showStatutorySections: false,
    featureToggles: ["tds"],
    statutoryModalToggles: [],
  },
  "Loans & Advances (Asset)": {
    showStatutorySections: true,
    featureToggles: [],
    statutoryModalToggles: ["serviceTax", "tds"],
  },
  "Provisions": {
    showStatutorySections: true,
    featureToggles: [],
    statutoryModalToggles: ["serviceTax", "tds"],
  },
  "Reserves & Surplus": {
    showStatutorySections: false,
    featureToggles: ["tds"],
    statutoryModalToggles: [],
  },
  "Secured Loans": {
    showStatutorySections: true,
    featureToggles: [],
    statutoryModalToggles: ["tds"],
  },
  "Unsecured Loans": {
    showStatutorySections: true,
    featureToggles: [],
    statutoryModalToggles: ["tds"],
  },
};

export function getConfig(
  primaryGroupName: string | null,
  parentGroupName?: string | null,
): PrimaryGroupStatutoryConfig {
  if (parentGroupName && PARENT_GROUP_OVERRIDES[parentGroupName]) {
    return PARENT_GROUP_OVERRIDES[parentGroupName];
  }
  if (!primaryGroupName) return DEFAULT_CONFIG;
  return PRIMARY_GROUP_STATUTORY_CONFIG[primaryGroupName] ?? DEFAULT_CONFIG;
}
