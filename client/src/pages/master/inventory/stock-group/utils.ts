import type { GroupType } from "@/types/api";

export const STOCK_GROUP_AS_PER = "As per Company/Stock Group";

/** Statutory sub-form shape — reuses the Group statutory fields so the shared
 *  StatutorySection component can be driven directly. */
export type StockGroupStatutory = Partial<GroupType>;

export function initialStockGroupStatutory(): StockGroupStatutory {
  return {
    hsn_sac_source: STOCK_GROUP_AS_PER,
    hsn_sac_code: "",
    hsn_sac_description: "",
    hsn_sac_classification_id: undefined,
    gst_rate_source: STOCK_GROUP_AS_PER,
    gst_classification_id: undefined,
    slab_based_rates: "[]",
    taxability_type: "",
    gst_rate: 0,
  };
}

/** Build the persistence payload (derived DB columns + full statutory_details JSON)
 *  from the statutory sub-form. */
export function buildStockGroupGstPayload(stat: StockGroupStatutory) {
  const specifyHsn = stat.hsn_sac_source === "Specify Details Here";
  const specifyRate = stat.gst_rate_source === "Specify Details Here";
  const slabRate = stat.gst_rate_source === "Specify Slab-Based Rates";
  const totalGst = specifyRate ? Number(stat.gst_rate) || 0 : 0;
  const half = parseFloat((totalGst / 2).toFixed(2));
  return {
    hsn_sac_code: specifyHsn ? (stat.hsn_sac_code?.trim() || null) : null,
    hsn_sac_description: specifyHsn ? (stat.hsn_sac_description?.trim() || null) : null,
    gst_rate: totalGst,
    cgst_rate: half,
    sgst_rate: half,
    taxability_type: (specifyRate || slabRate) ? (stat.taxability_type || null) : null,
    statutory_details: JSON.stringify({
      hsn_sac_source: stat.hsn_sac_source ?? STOCK_GROUP_AS_PER,
      hsn_sac_code: stat.hsn_sac_code ?? "",
      hsn_sac_description: stat.hsn_sac_description ?? "",
      hsn_sac_classification_id: stat.hsn_sac_classification_id ?? null,
      gst_rate_source: stat.gst_rate_source ?? STOCK_GROUP_AS_PER,
      gst_classification_id: stat.gst_classification_id ?? null,
      slab_based_rates: stat.slab_based_rates ?? "[]",
      taxability_type: stat.taxability_type ?? "",
      gst_rate: Number(stat.gst_rate) || 0,
    }),
  };
}

/** Reconstruct the statutory sub-form from a saved stock group row (for Alter). */
export function parseStockGroupStatutory(row: {
  statutory_details?: string | null;
  hsn_sac_code?: string | null;
  hsn_sac_description?: string | null;
  gst_rate?: number | null;
  taxability_type?: string | null;
}): StockGroupStatutory {
  if (row.statutory_details) {
    try {
      const d = JSON.parse(row.statutory_details);
      return {
        hsn_sac_source: d.hsn_sac_source ?? STOCK_GROUP_AS_PER,
        hsn_sac_code: d.hsn_sac_code ?? "",
        hsn_sac_description: d.hsn_sac_description ?? "",
        hsn_sac_classification_id: d.hsn_sac_classification_id ?? undefined,
        gst_rate_source: d.gst_rate_source ?? STOCK_GROUP_AS_PER,
        gst_classification_id: d.gst_classification_id ?? undefined,
        slab_based_rates: d.slab_based_rates ?? "[]",
        taxability_type: d.taxability_type ?? "",
        gst_rate: Number(d.gst_rate) || 0,
      };
    } catch { /* fall through to legacy reconstruction */ }
  }
  const init = initialStockGroupStatutory();
  if (row.hsn_sac_code) {
    init.hsn_sac_source = "Specify Details Here";
    init.hsn_sac_code = row.hsn_sac_code;
    init.hsn_sac_description = row.hsn_sac_description ?? "";
  }
  if (row.gst_rate) {
    init.gst_rate_source = "Specify Details Here";
    init.gst_rate = Number(row.gst_rate) || 0;
    init.taxability_type = row.taxability_type ?? "";
  }
  return init;
}

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
