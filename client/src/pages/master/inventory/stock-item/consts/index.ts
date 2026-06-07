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
  { id: "specify_here", label: "Specific Details Here" },
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
  specify_here: "Specific Details Here",
  use_classification: "Use GST Classification",
  specify_in_voucher: "Specify in Voucher",
};
