import type { FormData } from "../types";

export const INITIAL_FORM_STATE: FormData = {
  name: "",
  alias: "",
  group_id: "",
  unit_id: "",
  rate_of_duty: "0",
  has_bom: false,
  bom_name: "",
  opening_quantity: "",
  opening_rate: "",
  gst_applicable: "Not Applicable",
  hsn_sac_details: "as_per_company",
  hsn_sac: "",
  hsn_sac_description: "",
  hsn_classification_id: "",
  gst_rate_details: "as_per_company",
  rate_classification_id: "",
  taxability_type: "",
  gst_rate: "0",
  type_of_supply: "Goods",
  track_batches: false,
  track_expiry: false,
  allocations: [],
  maintain_in_batches: "No",
  track_date_of_manufacturing: "No",
  use_expiry_dates: "No",
  enable_cost_tracking: "No",
  set_alter_statutory: "No",
  excise_applicable: "Not Applicable",
  set_alter_excise_details: "No",
  excise_tariff_name: "",
  excise_tariff_hsn_code: "",
  excise_tariff_uom: "Undefined",
  excise_tariff_valuation_type: "Undefined",
  excise_tariff_rate: "0",
  excise_tariff_rate_per_unit: "0",
  vat_applicable: "Applicable",
  set_alter_vat_details: "No",
};

export const GST_APPLICABILITY_OPTIONS = [
  { id: "Applicable", label: "Applicable" },
  { id: "Not Applicable", label: "Not Applicable" },
];

export const HSN_SAC_DETAILS_OPTIONS = [
  { id: "as_per_company", label: "As per Company/Stock Group" },
  { id: "specify_here", label: "Specify Details Here" },
  { id: "use_classification", label: "Use GST Classification" },
  { id: "specify_in_voucher", label: "Specify in Voucher" },
];

export const GST_RATE_DETAILS_OPTIONS = [
  { id: "as_per_company", label: "As per Company/Stock Group" },
  { id: "specify_here", label: "Specify Details Here" },
  { id: "use_classification", label: "Use GST Classification" },
  { id: "specify_in_voucher", label: "Specify in Voucher" },
];

export const TAXABILITY_TYPE_OPTIONS = [
  { id: "Taxable", label: "Taxable" },
  { id: "Exempt", label: "Exempt" },
  { id: "Nil Rated", label: "Nil Rated" },
  { id: "Non-GST", label: "Non-GST" },
];

export const TYPE_OF_SUPPLY_OPTIONS = [
  { id: "Goods", label: "Goods" },
  { id: "Services", label: "Services" },
  { id: "Capital Goods", label: "Capital Goods" },
];

export const HSN_SAC_DETAILS_LABELS: Record<string, string> = {
  as_per_company: "As per Company/Stock Group",
  specify_here: "Specify Details Here",
  use_classification: "Use GST Classification",
  specify_in_voucher: "Specify in Voucher",
};

export const GST_RATE_DETAILS_LABELS: Record<string, string> = {
  as_per_company: "As per Company/Stock Group",
  specify_here: "Specify Details Here",
  use_classification: "Use GST Classification",
  specify_in_voucher: "Specify in Voucher",
};

export const YES_NO_OPTIONS = [
  { id: "Yes", label: "Yes" },
  { id: "No", label: "No" },
];

export const EXCISE_REPORTING_UOM_OPTIONS = [
  { id: "Undefined", label: "Undefined" },
  { id: "10GMS", label: "10GMS - 10 Grams" },
  { id: "1KKWH", label: "1KKWH - 1000 Kilowatt Hours" },
  { id: "CK",     label: "C/K - Carats" },
  { id: "CM",     label: "CM - Centimetre" },
  { id: "CM3",    label: "CM3 - Cubic Centimetre" },
  { id: "G",      label: "G - Grams" },
  { id: "Gl_FIS", label: "Gl F/S - Gram of Fissile Isotopes" },
  { id: "KG",     label: "KG - Kilograms" },
  { id: "KL",     label: "KL - Kilolitre" },
  { id: "L",      label: "L - Litre" },
  { id: "M",      label: "M - Metre" },
  { id: "M2",     label: "M2 - Square Metre" },
  { id: "M3",     label: "M3 - Cubic Metre" },
  { id: "MM",     label: "MM - Millimetre" },
];

export const EXCISE_VALUATION_TYPE_OPTIONS = [
  { id: "Undefined", label: "Undefined" },
  { id: "Ad Quantum", label: "Ad Quantum" },
  { id: "Ad Valorem", label: "Ad Valorem" },
  { id: "Valorem + Quantum", label: "Valorem + Quantum" },
];
