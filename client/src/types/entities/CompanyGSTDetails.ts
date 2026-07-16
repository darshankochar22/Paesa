export interface GSTSlabRow {
  greaterThan: number;
  upTo: string; // empty string means "and above" (last row)
  taxabilityType: string; // "Taxable" | "Exempt" | "Nil Rated"
  gstRate: number; // percentage
}

export interface CompanyGSTDetails {
  hsnSacType: string;
  hsnSacCode: string;
  description: string;
  taxabilityType: string;
  gstRate: number;
  /** GST Rate mode: Not Defined | Specify Details Here | Specify Slab-Based Rates | Use GST Classification | Specify in Voucher */
  gstRateDetails?: string;
  /** Slab-wise rate rows — persisted when gstRateDetails === "Specify Slab-Based Rates" */
  slabRates?: GSTSlabRow[];
  interstateThresholdLimit: number;
  intrastateThresholdLimit: number;
  thresholdLimitIncludes: string;
  createHSNSummaryFor: string;
  minimumHSNLength: number;
  showGSTAdvances: boolean;
  updateGSTStatus: boolean;
  gstReturnsConfigured: boolean;
  effectiveDate?: string;
  downloadGSTRegistration?: string;
  downloadReturnType?: string;
  gstClassification?: string;
  setStateWiseThresholdLimit?: boolean;
  stateWiseLimits?: { stateName: string; limit: number }[];
  gstAdvancesApplicableFrom?: string;
}
