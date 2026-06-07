export interface StockGroupGstFormData {
  hsn_sac_details: string;
  hsn_sac_code: string;
  hsn_sac_description: string;
  gst_rate_details: string;
  taxability_type: string;
  gst_rate: string;
}

export interface CalculatedStockGroupGst {
  hsn_sac_code: string | null;
  hsn_sac_description: string | null;
  gst_rate: number;
  cgst_rate: number;
  sgst_rate: number;
  taxability_type: string | null;
}

export function calculateStockGroupGstDetails(form: StockGroupGstFormData): CalculatedStockGroupGst {
  const totalGst = parseFloat(form.gst_rate) || 0;
  const halfGst  = parseFloat((totalGst / 2).toFixed(2));
  const taxability = form.taxability_type !== "as_per_company" ? form.taxability_type : null;

  return {
    hsn_sac_code: form.hsn_sac_details === "specify" ? form.hsn_sac_code.trim() || null : null,
    hsn_sac_description: form.hsn_sac_details === "specify" ? form.hsn_sac_description.trim() || null : null,
    gst_rate: form.gst_rate_details === "specify" ? totalGst : 0,
    cgst_rate: form.gst_rate_details === "specify" ? halfGst : 0,
    sgst_rate: form.gst_rate_details === "specify" ? halfGst : 0,
    taxability_type: taxability,
  };
}
