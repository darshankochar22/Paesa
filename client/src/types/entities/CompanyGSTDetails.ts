export interface CompanyGSTDetails {
  hsnSacType: string;
  hsnSacCode: string;
  description: string;
  taxabilityType: string;
  gstRate: number;
  interstateThresholdLimit: number;
  intrastateThresholdLimit: number;
  thresholdLimitIncludes: string;
  createHSNSummaryFor: string;
  minimumHSNLength: number;
  showGSTAdvances: boolean;
  updateGSTStatus: boolean;
  gstReturnsConfigured: boolean;
}
