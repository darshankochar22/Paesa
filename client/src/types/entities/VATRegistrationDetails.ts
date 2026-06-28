// VAT Registration Details — singleton per-company config (Issue #144).
// Lives under Gateway → Statutory Details → VAT Registration Details.

// TallyPrime "List of Taxability" for VAT (issue #144, body screenshot).
export const VAT_TAX_TYPES = ["Unknown", "Exempt", "Tax Free"] as const;
export type VatTaxType = (typeof VAT_TAX_TYPES)[number];

// One row of the optional "Define VAT commodity and tax details as masters" list.
export interface VatCommodity {
  name: string;
  rate: number;
  taxType: VatTaxType;
}

export interface VATRegistrationDetails {
  state: string;
  tin: string;
  interstateSalesTaxNumber: string;
  setAlterTaxRateDetails: number; // 0 / 1 → reveals tax rate + tax type
  taxRate: number;
  taxType: VatTaxType;
  defineVatCommodityAsMasters: number; // 0 / 1 → reveals commodity list
  deactivateFrom: string; // yyyy-mm-dd
  commodities: VatCommodity[];
}

export const DEFAULT_VAT_COMMODITY: VatCommodity = {
  name: "",
  rate: 0,
  taxType: "Unknown",
};

export const DEFAULT_VAT_REGISTRATION_DETAILS: VATRegistrationDetails = {
  state: "",
  tin: "",
  interstateSalesTaxNumber: "",
  setAlterTaxRateDetails: 0,
  taxRate: 0,
  taxType: "Unknown",
  defineVatCommodityAsMasters: 0,
  deactivateFrom: "",
  commodities: [],
};
