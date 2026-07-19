import type { FormData } from './types';

export interface CalculatedGstDetails {
  gst_applicable: string;
  hsn_sac: string | null;
  hsn_sac_description: string | null;
  source_of_details: string;
  hsn_classification_id: number | null;
  gst_rate_details: string;
  source_of_gst_rate: string;
  taxability_type: string | null;
  gst_rate: number;
  cgst_rate: number;
  sgst_rate: number;
  igst_rate: number;
  rate_classification_id: number | null;
  type_of_supply: string;
}

export function calculateGstDetails(
  form: FormData,
  gstClassifications: any[],
): CalculatedGstDetails {
  let gst_applicable = form.gst_applicable;
  let hsn_sac: string | null = null;
  let hsn_sac_description: string | null = null;
  let source_of_details = 'As per Company/Stock Group';
  let hsn_classification_id: number | null = null;

  let gst_rate_details = form.gst_rate_details;
  let source_of_gst_rate = 'As per Company/Stock Group';
  let taxability_type: string | null = null;
  let gst_rate = 0;
  let cgst_rate = 0;
  let sgst_rate = 0;
  let igst_rate = 0;
  let rate_classification_id: number | null = null;
  let type_of_supply = form.type_of_supply;

  if (gst_applicable === 'Applicable') {
    if (form.hsn_sac_details === 'specify_here') {
      hsn_sac = form.hsn_sac.trim() || null;
      hsn_sac_description = form.hsn_sac_description.trim() || null;
      source_of_details = 'Specified Here';
    } else if (form.hsn_sac_details === 'use_classification') {
      source_of_details = 'GST Classification';
      hsn_classification_id = Number(form.hsn_classification_id) || null;
      const selectedCls = gstClassifications.find(
        (c) => String(c.gc_id) === form.hsn_classification_id,
      );
      if (selectedCls) {
        hsn_sac = selectedCls.hsn_sac_code || null;
        hsn_sac_description = selectedCls.description || null;
      }
    } else if (form.hsn_sac_details === 'specify_in_voucher') {
      source_of_details = 'Specify in Voucher';
    }

    if (form.gst_rate_details === 'use_classification') {
      source_of_gst_rate = 'GST Classification';
      const selectedCls = gstClassifications.find(
        (c) => String(c.gc_id) === form.rate_classification_id,
      );
      if (selectedCls) {
        rate_classification_id = Number(form.rate_classification_id) || null;
        taxability_type = selectedCls.taxability || null;
        igst_rate = selectedCls.igst_rate ?? 0;
        cgst_rate = selectedCls.cgst_rate ?? 0;
        sgst_rate = selectedCls.sgst_rate ?? 0;
        gst_rate = igst_rate;
      }
    } else if (form.gst_rate_details === 'specify_here') {
      source_of_gst_rate = 'Specified Here';
      // The Taxability dropdown defaults to "Taxable" via a display fallback, so an
      // untouched field is empty here — normalise it so the typed rate isn't discarded.
      const taxability = form.taxability_type || 'Taxable';
      taxability_type = taxability;
      if (taxability === 'Taxable') {
        igst_rate = Number(form.gst_rate) || 0;
        cgst_rate = igst_rate / 2;
        sgst_rate = igst_rate / 2;
        gst_rate = igst_rate;
      }
    } else if (form.gst_rate_details === 'specify_in_voucher') {
      source_of_gst_rate = 'Specify in Voucher';
    }
  } else {
    gst_rate_details = 'as_per_company';
    type_of_supply = 'Goods';
  }

  return {
    gst_applicable,
    hsn_sac,
    hsn_sac_description,
    source_of_details,
    hsn_classification_id,
    gst_rate_details,
    source_of_gst_rate,
    taxability_type,
    gst_rate,
    cgst_rate,
    sgst_rate,
    igst_rate,
    rate_classification_id,
    type_of_supply,
  };
}
