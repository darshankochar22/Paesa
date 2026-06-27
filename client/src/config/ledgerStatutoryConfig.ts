/**
 * Configures which sub-sections are visible inside the
 * "Set/Alter other Statutory details" modal on Ledger Create / Alter.
 *
 * Different under-groups (or parent groups) show different subsets of the
 * available statutory detail sub-modals (TDS / TCS / Service Tax / Excise / VAT).
 *
 * Resolution: `getOtherStatutoryConfig(groupLineage)` returns the set of
 * sub-section keys to render. The decision is driven by the group's primary
 * group name (computed in `useLedgerForm` -> `groupLineage.primaryGroupName`).
 *
 * Each sub-section is built from a small set of reusable modal sub-components
 * defined in `client/src/pages/master/ledger/components/statutory/`.
 */

export type OtherStatutorySectionKey =
  | "tds"
  | "tcs"
  | "serviceTax"
  | "excise"
  | "vat";

export interface OtherStatutoryConfig {
  /** Which sub-sections appear inside the modal for this group. */
  sections: OtherStatutorySectionKey[];
  /** Tally-style label shown on the "Under" group inheritance hint. */
  label?: string;
}

/**
 * By primary group name. Order in the array determines render order.
 * If a primary group is not listed here, the DEFAULT config is used.
 */
const BY_PRIMARY_GROUP: Record<string, OtherStatutoryConfig> = {
  // Capital Account → only TDS
  "Capital Account": { sections: ["tds"] },

  // Loans (Liability) → only TDS
  "Loans (Liability)": { sections: ["tds"] },
  "Secured Loans": { sections: ["tds"] },
  "Unsecured Loans": { sections: ["tds"] },
  "Loans & Advances (Asset)": { sections: ["tds"] },

  // Investments → only TDS
  "Investments": { sections: ["tds"] },

  // Current Assets / Liabilities → TDS + Service Tax
  "Current Assets": { sections: ["serviceTax", "tds"] },
  "Current Liabilities": { sections: ["serviceTax", "tds"] },
  "Provisions": { sections: ["serviceTax", "tds"] },

  // Fixed Assets → TDS + Service Tax + Excise + VAT
  "Fixed Assets": { sections: ["serviceTax", "tds", "excise", "vat"] },

  // Branch / Divisions → TDS + TCS
  "Branch/Divisions": { sections: ["tds", "tcs"] },

  // Sundry Debtors / Creditors → TDS + TCS
  "Sundry Debtors": { sections: ["tds", "tcs"] },
  "Sundry Creditors": { sections: ["tds", "tcs"] },

  // Sales Accounts → TCS + Service Tax + Excise + VAT
  "Sales Accounts": { sections: ["serviceTax", "tcs", "excise", "vat"] },

  // Purchase Accounts → TDS + Service Tax + Excise + VAT
  "Purchase Accounts": { sections: ["serviceTax", "tds", "excise", "vat"] },

  // Expenses (direct + indirect) → TDS + Service Tax + Excise + VAT
  "Direct Expenses": { sections: ["serviceTax", "tds", "excise", "vat"] },
  "Indirect Expenses": { sections: ["serviceTax", "tds", "excise", "vat"] },

  // Incomes → TDS + TCS + Service Tax + Excise + VAT
  "Direct Incomes": { sections: ["serviceTax", "tds", "tcs", "excise", "vat"] },
  "Indirect Incomes": { sections: ["serviceTax", "tds", "tcs", "excise", "vat"] },

  // Duties & Taxes — keep the modal hidden (this group is itself a tax group
  // and uses the duty-tax section in the right column instead).
  "Duties & Taxes": { sections: [] },

  // Cash-in-Hand — simple cash ledger, no TDS/TCS statutory section.
  "Cash-in-Hand": { sections: [] },

  // Suspense A/c → only TDS
  "Suspense A/c": { sections: ["tds"] },
};

const DEFAULT_CONFIG: OtherStatutoryConfig = {
  // Most unmapped groups just expose TDS (matches the existing "Set/Alter TDS details"
  // standalone feature toggle behaviour).
  sections: ["tds"],
};

// Case-insensitive lookup — seeded group names vary in casing
// (e.g. "Cash-in-hand" vs the "Cash-in-Hand" key).
const BY_PRIMARY_GROUP_LC: Record<string, OtherStatutoryConfig> = Object.fromEntries(
  Object.entries(BY_PRIMARY_GROUP).map(([k, v]) => [k.toLowerCase(), v]),
);

export function getOtherStatutoryConfig(
  primaryGroupName: string | null | undefined,
  immediateGroupName?: string | null,
): OtherStatutoryConfig {
  // Prefer the immediate (under) group — e.g. a Cash-in-hand ledger lives under
  // the "Current Assets" primary group but must use its own (empty) config.
  const immediate = immediateGroupName && BY_PRIMARY_GROUP_LC[immediateGroupName.toLowerCase()];
  if (immediate) return immediate;
  if (!primaryGroupName) return DEFAULT_CONFIG;
  return BY_PRIMARY_GROUP_LC[primaryGroupName.toLowerCase()] ?? DEFAULT_CONFIG;
}

/* ── Section metadata shared by the Tier-1 toggle modal and the Tier-2 detail modals ── */

export interface OtherStatutorySectionMeta {
  label: string;
  /** Headline rendered in the Tier-2 detail modal title bar. */
  detailTitle: string;
  /** True for sections that have an "Is applicable" Yes/No row in the Tier-1 modal. */
  showYesNoInTier1: boolean;
}

export const SECTION_META: Record<OtherStatutorySectionKey, OtherStatutorySectionMeta> = {
  tds: {
    label: "TDS",
    detailTitle: "TDS Details",
    showYesNoInTier1: true,
  },
  tcs: {
    label: "TCS",
    detailTitle: "TCS Details",
    showYesNoInTier1: true,
  },
  serviceTax: {
    label: "Service Tax",
    detailTitle: "Service Tax Details",
    showYesNoInTier1: false,
  },
  excise: {
    label: "Excise",
    detailTitle: "Excise Details",
    showYesNoInTier1: false,
  },
  vat: {
    label: "VAT",
    detailTitle: "VAT Details",
    showYesNoInTier1: false,
  },
};
