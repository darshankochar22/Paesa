import type { LedgerType } from '@/types/api';
import type { ExciseTariffFormData } from '@/pages/master/inventory/stock-item/components/ExciseTariffDetails';
import type { VATTaxRateFormData } from '../components/statutory/VATTaxRateDetailsModal';

// Ledger form types + empty-state constants — extracted from useLedgerForm.ts
// (unchanged). useLedgerForm re-exports everything, so existing imports from
// the hook keep working.

export const EMPTY_EXCISE_TARIFF_DETAILS: ExciseTariffFormData = {
  tariff_name: '',
  hsn_code: '',
  reporting_uom: 'Undefined',
  valuation_type: 'Undefined',
  rate: '0',
  rate_per_unit: '0',
};

export const EMPTY_VAT_TAX_RATE_DETAILS: VATTaxRateFormData = {
  nature_of_transaction: 'Undefined',
  tax_rate: '0',
  tax_type: 'Unknown',
};

export interface StatutoryDetails {
  gst_applicability?: string;
  hsn_sac_code?: string;
  hsn_sac_description?: string;
  hsn_sac_source?: string;
  gst_rate?: number;
  gst_rate_source?: string;
  taxability_type?: string;
  type_of_supply?: string;
  cgst_rate?: number;
  sgst_rate?: number;
  igst_rate?: number;
  type_of_duty_tax?: string;
  duty_head?: string;
  gst_tax_type?: string;
  service_tax_head?: string;
  nature_of_goods?: string;
  valuation_type?: string;
  rate_per_unit?: number;
  rounding_limit?: number;
  percentage_of_calculation?: number;
  statutory_details?: string;
  additional_gst_details: number;
  service_tax_details: number;
  include_in_assessable_value_calculation?: string;
  appropriate_to?: string;
  method_of_calculation?: string;
}

export interface InterestRateSlab {
  from_date: string;
  to_date: string | null;
  rate: number | string;
}

export interface InterestDetails {
  activate_interest: number;
  calculate_interest_based_on?: string;
  interest_include_added: number;
  interest_include_deducted: number;
  interest_rate: number | string;
  interest_style: string;
  interest_balances: string;
  interest_calculate_on: string;
  interest_applicable_from: string;
  interest_rounding_method: string;
  interest_rounding_limit: number | string;
  interest_rate_slabs: InterestRateSlab[];
}

export const EMPTY_INTEREST: InterestDetails = {
  activate_interest: 0,
  calculate_interest_based_on: 'Voucher Date',
  interest_include_added: 0,
  interest_include_deducted: 0,
  interest_rate: 0,
  interest_style: '30-Day Month',
  interest_balances: 'All Balances',
  interest_calculate_on: 'Bill-by-Bill',
  interest_applicable_from: 'Due Date',
  interest_rounding_method: 'No Rounding',
  interest_rounding_limit: 1,
  interest_rate_slabs: [],
};

// interest_rate_slabs comes back as a JSON string (or already-parsed array)
export const parseRateSlabs = (v: unknown): InterestRateSlab[] => {
  if (!v) return [];
  try {
    const parsed = typeof v === 'string' ? JSON.parse(v) : v;
    return Array.isArray(parsed)
      ? parsed.map((s: any) => ({
          from_date: s.from_date || '',
          to_date: s.to_date ?? null,
          rate: Number(s.rate) || 0,
        }))
      : [];
  } catch {
    return [];
  }
};

/* ── Other Statutory Details (TDS / TCS / Service Tax / Excise / VAT) ────── */

export interface TdsDetails {
  is_tds_deductable: 0 | 1;
  is_tds_applicable: string;
  treat_as_tds_expenses: 0 | 1;
  deductee_type: string;
  deduct_tds_in_same_voucher: 0 | 1;
  nature_of_payment: string;
  tds_pan_it_no: string;
  tds_pan_status: string;
  tds_pan_effective_date: string;
  tds_name_on_pan: string;
  deductee_ref: string;
  tax_unique_id_no: string;
}

export interface TcsDetails {
  is_tcs_applicable: 0 | 1;
  tcs_buyer_lessee_type: string;
  tcs_pan_it_no: string;
  tcs_pan_status: string;
  tcs_name_on_pan: string;
  tcs_nature_of_goods?: string;
  deductee_ref: string;
  tax_unique_id_no: string;
}

export interface ServiceTaxDetails {
  is_service_tax_applicable: string;
  set_alter_service_tax_details: 0 | 1;
}

export interface ExciseDetails {
  is_excise_applicable: string;
  set_alter_excise_details: 0 | 1;
}

export interface VatDetails {
  is_vat_cst_applicable: string;
  set_alter_vat_details: 0 | 1;
}

export interface OtherStatutoryForm {
  tds: TdsDetails;
  tcs: TcsDetails;
  serviceTax: ServiceTaxDetails;
  excise: ExciseDetails;
  vat: VatDetails;
}

export const EMPTY_TDS: TdsDetails = {
  is_tds_deductable: 0,
  is_tds_applicable: 'Undefined',
  treat_as_tds_expenses: 0,
  deductee_type: 'Unknown',
  deduct_tds_in_same_voucher: 0,
  nature_of_payment: 'Undefined',
  tds_pan_it_no: '',
  tds_pan_status: 'Unknown',
  tds_pan_effective_date: '',
  tds_name_on_pan: '',
  deductee_ref: '',
  tax_unique_id_no: '',
};

export const EMPTY_TCS: TcsDetails = {
  is_tcs_applicable: 0,
  tcs_buyer_lessee_type: 'Unknown',
  tcs_pan_it_no: '',
  tcs_pan_status: 'Unknown',
  tcs_name_on_pan: '',
  tcs_nature_of_goods: '',
  deductee_ref: '',
  tax_unique_id_no: '',
};

export const EMPTY_SERVICE_TAX: ServiceTaxDetails = {
  is_service_tax_applicable: 'Undefined',
  set_alter_service_tax_details: 0,
};

export const EMPTY_EXCISE: ExciseDetails = {
  is_excise_applicable: 'Not Applicable',
  set_alter_excise_details: 0,
};

export const EMPTY_VAT: VatDetails = {
  is_vat_cst_applicable: 'Applicable',
  set_alter_vat_details: 0,
};

export const EMPTY_OTHER_STATUTORY: OtherStatutoryForm = {
  tds: { ...EMPTY_TDS },
  tcs: { ...EMPTY_TCS },
  serviceTax: { ...EMPTY_SERVICE_TAX },
  excise: { ...EMPTY_EXCISE },
  vat: { ...EMPTY_VAT },
};

export const EMPTY_STATUTORY: StatutoryDetails = {
  gst_applicability: 'Not Applicable',
  hsn_sac_code: '',
  hsn_sac_description: '',
  hsn_sac_source: 'As per Company/Group',
  gst_rate: 0,
  gst_rate_source: 'As per Company/Group',
  taxability_type: 'Taxable',
  type_of_supply: 'Services',
  cgst_rate: 0,
  sgst_rate: 0,
  igst_rate: 0,
  type_of_duty_tax: '',
  duty_head: '',
  gst_tax_type: '',
  service_tax_head: '',
  nature_of_goods: '',
  valuation_type: '',
  rate_per_unit: 0,
  rounding_limit: 0,
  percentage_of_calculation: 0,
  statutory_details: '',
  additional_gst_details: 0,
  service_tax_details: 0,
  include_in_assessable_value_calculation: 'Not Applicable',
  appropriate_to: 'Goods',
  method_of_calculation: 'Based on Quantity',
};

export const INITIAL_FORM: Partial<LedgerType> = {
  name: '',
  alias: '',
  opening_balance: 0,
  opening_balance_type: 'Dr',
  ledger_type: 'General',
  mailing_name: '',
  address1: '',
  address2: '',
  city: '',
  state: 'Select',
  country: 'India',
  pincode: '',
  phone: '',
  email: '',
  gstin: '',
  pan: '',
  registration_type: 'Unregistered',
  additional_gst_details: 0,
  service_tax_details: 0,
  default_credit_period: 0,
  check_credit_days: 0,
  allow_cost_centres: 0,
  invoice_rounding: 0,
  rounding_method: '',
  rounding_limit: 0,
  include_assessable_value: 'Not Applicable',
  method_of_calculation: 'Based on Value',
  other_statutory_details: 0,
  activate_interest: 0,
  behave_as_payment_gateway: 0,
  payment_gateway_name: '',
  interest_include_added: 0,
  interest_include_deducted: 0,
  interest_rate: 0,
  interest_style: '30-Day Month',
  interest_balances: 'All Balances',
  set_alter_tds_details: 0,
  set_alter_tcs_details: 0,
  set_alter_service_tax_details: 0,
  set_alter_excise_details: 0,
  set_alter_vat_details: 0,
  is_tds_deductable: 0,
  treat_as_tds_expenses: 0,
  deductee_type: 'Unknown',
  deduct_tds_in_same_voucher: 0,
  nature_of_payment: 'Undefined',
  tds_pan_it_no: '',
  tds_pan_status: 'Unknown',
  tds_pan_effective_date: '',
  tds_name_on_pan: '',
  is_tcs_applicable: 0,
  tcs_buyer_lessee_type: 'Unknown',
  tcs_pan_it_no: '',
  tcs_pan_status: 'Unknown',
  tcs_name_on_pan: '',
  is_service_tax_applicable: 'Undefined',
  is_tds_applicable: 'Not Applicable',
  is_excise_applicable: 'Not Applicable',
  is_vat_cst_applicable: 'Applicable',
  deductee_ref: '',
  tax_unique_id_no: '',
};
