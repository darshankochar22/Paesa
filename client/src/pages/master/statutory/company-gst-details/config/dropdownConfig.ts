export interface TallyFieldConfig {
  type: 'dropdown' | 'input' | 'yesno';
  title?: string;
  options?: string[];
}

export const TALLY_FIELDS_CONFIG: Record<string, TallyFieldConfig> = {
  hsnSacType: {
    type: 'dropdown',
    title: 'List of Actions',
    options: [
      'Not Defined',
      'Specify Details Here',
      'Use GST Classification',
      'Specify in Voucher',
    ],
  },
  hsnSacCode: {
    type: 'input',
  },
  description: {
    type: 'input',
  },
  gstRateDetails: {
    type: 'dropdown',
    title: 'List of Actions',
    options: [
      'Not Defined',
      'Specify Details Here',
      'Specify Slab-Based Rates',
      'Use GST Classification',
      'Specify in Voucher',
    ],
  },
  gstClassification: {
    type: 'dropdown',
    title: 'List of GST Classifications',
    options: [], // Populated dynamically in UI
  },
  taxabilityType: {
    type: 'dropdown',
    title: 'Taxability Types',
    options: ['Exempt', 'Nil Rated', 'Taxable'],
  },
  gstRate: {
    type: 'input',
  },
  interstateThresholdLimit: {
    type: 'input',
  },
  intrastateThresholdLimit: {
    type: 'input',
  },
  setStateWiseThresholdLimit: {
    type: 'yesno',
    title: 'Set State-wise...',
    options: ['No', 'Yes'],
  },
  thresholdLimitIncludes: {
    type: 'dropdown',
    title: 'List of values',
    options: ['Value of Invoice', 'Value of Taxable & Exempt Goods', 'Value of Taxable Goods'],
  },
  createHSNSummaryFor: {
    type: 'dropdown',
    title: 'Types of Sections',
    options: ['None', 'All Sections', 'All Sections Except B2C'],
  },
  minimumHSNLength: {
    type: 'dropdown',
    title: 'List of Options',
    options: ['4', '6', '8'],
  },
  showGSTAdvances: {
    type: 'yesno',
    title: 'Show GST Advances...',
    options: ['No', 'Yes'],
  },
  updateGSTStatus: {
    type: 'yesno',
    title: 'Update GST Status...',
    options: ['No', 'Yes'],
  },
  gstReturnsConfigured: {
    type: 'yesno',
    title: 'Set/Alter details...',
    options: ['No', 'Yes'],
  },
};
