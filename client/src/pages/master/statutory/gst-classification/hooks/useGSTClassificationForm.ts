import { useState, useEffect, useCallback, useRef } from "react";
import { useCompany } from "@/context/CompanyContext";
import { loadFormState, saveFormState, clearFormState } from "@/utils/formPersistence";
import type { GSTClassificationType } from "@/types/entities/GSTClassification";

export type GSTSlabLine = {
  greater_than: string;
  up_to: string;
  taxability: "Taxable" | "Exempt" | "Nil Rated";
  gst_rate: string;
};

const DEFAULT_GST_SLAB: GSTSlabLine = {
  greater_than: "0",
  up_to: "",
  taxability: "Taxable",
  gst_rate: "0",
};

export interface FormData {
  name: string;
  description: string;
  hsn_sac_details: "Not Defined" | "Specify Details Here";
  hsn_sac_code: string;
  gst_rate_details: "Not Defined" | "Specify Details Here" | "Specify Slab-Based Rates";
  is_non_gst_goods: "No" | "Yes";
  nature_of_transaction: string;
  taxability: "Unknown" | "Taxable" | "Exempt" | "Nil Rated";
  is_reverse_charge: "No" | "Yes";
  is_ineligible_for_itc: "No" | "Yes";
  rate_type: "Fixed Rate" | "Slab Based";
  igst_rate: string;
  igst_valuation_type: "Based on Value" | "Based on Quantity";
  cgst_rate: string;
  cgst_valuation_type: "Based on Value" | "Based on Quantity";
  sgst_rate: string;
  sgst_valuation_type: "Based on Value" | "Based on Quantity";
  cess_rate: string;
  cess_valuation_type: "Based on Value" | "Based on Quantity";
  slabRows: GSTSlabLine[];
}

export const INITIAL_FORM: FormData = {
  name: "",
  description: "",
  hsn_sac_details: "Not Defined",
  hsn_sac_code: "",
  gst_rate_details: "Not Defined",
  is_non_gst_goods: "No",
  nature_of_transaction: "Not Applicable",
  taxability: "Unknown",
  is_reverse_charge: "No",
  is_ineligible_for_itc: "No",
  rate_type: "Fixed Rate",
  igst_rate: "0",
  igst_valuation_type: "Based on Value",
  cgst_rate: "0",
  cgst_valuation_type: "Based on Value",
  sgst_rate: "0",
  sgst_valuation_type: "Based on Value",
  cess_rate: "0",
  cess_valuation_type: "Based on Value",
  slabRows: [DEFAULT_GST_SLAB],
};

export const NATURES = [
  "Not Applicable",
  "Sales Taxable", "Sales Exempt", "Sales Nil Rated",
  "Purchase Taxable", "Purchase Exempt", "Purchase Nil Rated",
  "Interstate Sales Taxable", "Interstate Sales Exempt",
  "Interstate Purchase Taxable", "Interstate Purchase Exempt",
  "Exports Taxable", "Exports Exempt",
  "Imports Taxable", "Imports Exempt",
];

interface UseGSTClassificationFormOptions {
  mode: "create" | "alter";
}

export function useGSTClassificationForm({ mode }: UseGSTClassificationFormOptions) {
  const { selectedCompany } = useCompany();
  const companyId = selectedCompany?.company_id;
  const persistKey = companyId ? `gstClassification${mode === "create" ? "Create" : "Alter"}_${companyId}` : null;
  const hasRestored = useRef(false);

  const [classifications, setClassifications] = useState<GSTClassificationType[]>([]);
  const [selectedClass, setSelectedClass] = useState<GSTClassificationType | null>(() => {
    if (mode === "alter" && persistKey) {
      return loadFormState<any>(persistKey)?.selectedClass ?? null;
    }
    return null;
  });

  const [form, setForm] = useState<FormData>(() => {
    if (persistKey) {
      const saved = loadFormState<any>(persistKey)?.form;
      if (saved) return saved;
    }
    return INITIAL_FORM;
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Auto-save form state to sessionStorage
  useEffect(() => {
    if (!persistKey) return;
    if (!hasRestored.current) {
      hasRestored.current = true;
      return;
    }
    if (mode === "alter" && !selectedClass) return;
    saveFormState(persistKey, {
      form,
      ...(mode === "alter" ? { selectedClass } : {}),
    });
  }, [persistKey, form, selectedClass, mode]);

  const loadClassifications = useCallback(async () => {
    if (!companyId) return;
    const result = await window.api.gstClassification.getAll(companyId);
    if (result.success) {
      setClassifications(result.gstClassifications ?? []);
    }
  }, [companyId]);

  useEffect(() => {
    if (mode === "alter") {
      loadClassifications();
    }
  }, [loadClassifications, mode]);

  const handleSelectClass = useCallback(async (c: GSTClassificationType) => {
    if (!c.gc_id) return;
    setLoading(true);
    setError(null);
    try {
      const result = await window.api.gstClassification.getById(c.gc_id);
      if (!result.success) {
        setError(result.error || "Unable to load selected GST classification.");
        return;
      }
      const classification = result.classification;
      setSelectedClass(classification);
      setForm({
        name: classification.name ?? "",
        description: classification.description ?? "",
        hsn_sac_details: classification.hsn_sac_code ? "Specify Details Here" : "Not Defined",
        hsn_sac_code: classification.hsn_sac_code ?? "",
        gst_rate_details: classification.rate_type === "Slab Based"
          ? "Specify Slab-Based Rates"
          : ((classification.igst_rate ?? 0) > 0 || (classification.taxability && classification.taxability !== "Unknown"))
            ? "Specify Details Here"
            : "Not Defined",
        is_non_gst_goods: !!classification.is_non_gst_goods ? "Yes" : "No",
        slabRows: classification.rate_type === "Slab Based"
          ? (classification.slab_rows && classification.slab_rows.length > 0
              ? classification.slab_rows.map((row) => ({
                  greater_than: row.greater_than ?? "0",
                  up_to: row.up_to ?? "",
                  taxability: (row.taxability === "Taxable" || row.taxability === "Exempt" || row.taxability === "Nil Rated")
                    ? row.taxability
                    : "Taxable",
                  gst_rate: row.gst_rate ?? "0",
                }))
              : [DEFAULT_GST_SLAB])
          : [DEFAULT_GST_SLAB],
        nature_of_transaction: classification.nature_of_transaction ?? "Not Applicable",
        taxability: (classification.taxability as any) ?? "Unknown",
        is_reverse_charge: !!classification.is_reverse_charge ? "Yes" : "No",
        is_ineligible_for_itc: !!classification.is_ineligible_for_itc ? "Yes" : "No",
        rate_type: classification.rate_type === "Slab Based" ? "Slab Based" : "Fixed Rate",
        igst_rate: String(classification.igst_rate ?? 0),
        igst_valuation_type: (classification.igst_valuation_type as any) ?? "Based on Value",
        cgst_rate: String(classification.cgst_rate ?? 0),
        cgst_valuation_type: (classification.cgst_valuation_type as any) ?? "Based on Value",
        sgst_rate: String(classification.sgst_rate ?? 0),
        sgst_valuation_type: (classification.sgst_valuation_type as any) ?? "Based on Value",
        cess_rate: String(classification.cess_rate ?? 0),
        cess_valuation_type: (classification.cess_valuation_type as any) ?? "Based on Value",
      });
    } catch (error) {
      setError(error instanceof Error ? error.message : "Unable to load selected GST classification.");
    } finally {
      setLoading(false);
    }
  }, []);

  const handleIGSTChange = (val: string) => {
    const num = Number(val) || 0;
    const half = String(num / 2);
    setForm((f) => ({ ...f, igst_rate: val, cgst_rate: half, sgst_rate: half }));
  };

  const addSlabRow = useCallback(() => {
    setForm((f) => {
      const lastRow = f.slabRows[f.slabRows.length - 1];
      const nextGreaterThan = lastRow ? (lastRow.up_to || "0") : "0";
      const newRow: GSTSlabLine = {
        greater_than: nextGreaterThan,
        up_to: "",
        taxability: "Taxable",
        gst_rate: "0",
      };
      return { ...f, slabRows: [...f.slabRows, newRow] };
    });
  }, []);

  const updateSlabRow = useCallback((index: number, field: keyof GSTSlabLine, value: string) => {
    setForm((f) => {
      let updatedRows = f.slabRows.map((row, idx) => {
        if (idx === index) {
          const updatedRow = { ...row, [field]: value };
          if (field === "taxability" && (value === "Exempt" || value === "Nil Rated")) {
            updatedRow.gst_rate = "0";
          }
          return updatedRow;
        }
        return row;
      });

      if (field === "up_to") {
        if (index + 1 < updatedRows.length) {
          updatedRows = updatedRows.map((row, idx) => idx === index + 1 ? { ...row, greater_than: value } : row);
        }
      }
      return { ...f, slabRows: updatedRows };
    });
  }, []);

  const removeSlabRow = useCallback((index: number) => {
    setForm((f) => ({ ...f, slabRows: f.slabRows.filter((_, idx) => idx !== index) }));
  }, []);

  const setField = (key: keyof FormData) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    let val = e.target.value;
    if (key === "hsn_sac_code") {
      val = val.replace(/\D/g, "").slice(0, 8);
    }
    if (key === "igst_rate") {
      handleIGSTChange(val);
    } else if (key === "gst_rate_details") {
      const typedVal = val as FormData["gst_rate_details"];
      setForm((f) => ({
        ...f,
        [key]: typedVal,
        rate_type: typedVal === "Specify Slab-Based Rates" ? "Slab Based" : "Fixed Rate",
      }));
    } else if (key === "taxability") {
      const typedVal = val as FormData["taxability"];
      if (typedVal === "Exempt" || typedVal === "Nil Rated") {
        setForm((f) => ({
          ...f,
          [key]: typedVal,
          igst_rate: "0",
          cgst_rate: "0",
          sgst_rate: "0",
        }));
      } else {
        setForm((f) => ({ ...f, [key]: typedVal }));
      }
    } else {
      setForm((f) => ({ ...f, [key]: val }));
    }
  };

  const validate = (): string | null => {
    if (!form.name.trim()) return "Classification Name is required.";
    if (!companyId) return "No company selected.";
    for (const [label, key] of [
      ["IGST", "igst_rate"], ["CGST", "cgst_rate"],
      ["SGST", "sgst_rate"], ["Cess", "cess_rate"],
    ] as const) {
      const v = Number(form[key]);
      if (isNaN(v) || v < 0 || v > 100) return `${label} Rate must be between 0 and 100.`;
    }

    if (form.gst_rate_details === "Specify Slab-Based Rates") {
      for (const [idx, slab] of form.slabRows.entries()) {
        const gtValue = Number(slab.greater_than);
        const upToValue = slab.up_to ? Number(slab.up_to) : null;
        const slabRate = Number(slab.gst_rate);
        if (isNaN(gtValue) || gtValue < 0) return `Slab ${idx + 1}: Greater Than must be a valid non-negative number.`;
        if (slab.up_to && (isNaN(upToValue) || upToValue < 0)) return `Slab ${idx + 1}: Up To must be a valid non-negative number.`;
        if (slab.up_to && upToValue !== null && upToValue < gtValue) return `Slab ${idx + 1}: Up To must be greater than or equal to Greater Than.`;
        if (isNaN(slabRate) || slabRate < 0 || slabRate > 100) return `Slab ${idx + 1}: GST Rate must be between 0 and 100.`;
      }
    }

    if (form.hsn_sac_details === "Specify Details Here") {
      const code = form.hsn_sac_code.trim();
      if (!/^\d{0,8}$/.test(code) || code.length > 8) {
        return "HSN/SAC should be maximum 8 digits long.";
      }
    }

    return null;
  };

  const handleSubmit = useCallback(async () => {
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }
    if (mode === "alter" && !!selectedClass?.is_predefined) {
      setError("Predefined GST classifications cannot be altered.");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const data: any = {
        company_id: companyId,
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        hsn_sac_code: form.hsn_sac_details === "Specify Details Here" ? form.hsn_sac_code.trim() || undefined : undefined,
        is_non_gst_goods: form.is_non_gst_goods === "Yes" ? 1 : 0,
        nature_of_transaction: form.nature_of_transaction,
        taxability: form.gst_rate_details === "Specify Slab-Based Rates"
          ? form.slabRows[0]?.taxability ?? "Unknown"
          : form.taxability,
        is_reverse_charge: form.is_reverse_charge === "Yes" ? 1 : 0,
        is_ineligible_for_itc: form.is_ineligible_for_itc === "Yes" ? 1 : 0,
        rate_type: form.rate_type,
        igst_rate: (form.gst_rate_details === "Specify Slab-Based Rates" || form.taxability === "Exempt" || form.taxability === "Nil Rated") ? 0 : Number(form.igst_rate) || 0,
        igst_valuation_type: form.igst_valuation_type,
        cgst_rate: (form.gst_rate_details === "Specify Slab-Based Rates" || form.taxability === "Exempt" || form.taxability === "Nil Rated") ? 0 : Number(form.cgst_rate) || 0,
        cgst_valuation_type: form.cgst_valuation_type,
        sgst_rate: (form.gst_rate_details === "Specify Slab-Based Rates" || form.taxability === "Exempt" || form.taxability === "Nil Rated") ? 0 : Number(form.sgst_rate) || 0,
        sgst_valuation_type: form.sgst_valuation_type,
        cess_rate: (form.taxability === "Exempt" || form.taxability === "Nil Rated") ? 0 : Number(form.cess_rate) || 0,
        cess_valuation_type: form.cess_valuation_type,
        slab_rows: form.gst_rate_details === "Specify Slab-Based Rates" ? form.slabRows : undefined,
        is_predefined: mode === "create" ? 0 : selectedClass?.is_predefined ?? 0,
        is_active: mode === "create" ? 1 : selectedClass?.is_active ?? 1,
      };

      if (mode === "alter" && selectedClass) {
        data.gc_id = selectedClass.gc_id;
      }

      const result = await (mode === "create"
        ? window.api.gstClassification.create(data)
        : window.api.gstClassification.update(data));

      if (result.success) {
        setSuccess(`GST Classification "${form.name}" ${mode === "create" ? "created" : "updated"} successfully.`);
        if (persistKey) clearFormState(persistKey);
        hasRestored.current = false;

        if (mode === "create") {
          setForm(INITIAL_FORM);
          setTimeout(() => setSuccess(null), 2000);
        } else {
          await loadClassifications();
          setTimeout(() => {
            setSuccess(null);
            setSelectedClass(null);
          }, 1500);
        }
      } else {
        setError(result.error || `Failed to ${mode} GST classification.`);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unexpected error.");
    } finally {
      setLoading(false);
    }
  }, [form, companyId, mode, selectedClass, persistKey, loadClassifications]);

  const handleDelete = useCallback(async () => {
    if (mode !== "alter" || !selectedClass) return;
    if (!!selectedClass.is_predefined) {
      setError("Predefined GST classifications cannot be deleted.");
      return;
    }
    if (!window.confirm(`Delete GST Classification "${selectedClass.name}"?`)) return;

    setLoading(true);
    setError(null);
    try {
      const result = await window.api.gstClassification.delete(selectedClass.gc_id!);
      if (result.success) {
        setSuccess("GST Classification deleted successfully.");
        if (persistKey) clearFormState(persistKey);
        hasRestored.current = false;
        await loadClassifications();
        setTimeout(() => {
          setSuccess(null);
          setSelectedClass(null);
        }, 1500);
      } else {
        setError(result.error || "Failed to delete GST classification.");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unexpected error.");
    } finally {
      setLoading(false);
    }
  }, [selectedClass, mode, persistKey, loadClassifications]);

  const handleBack = () => {
    setSelectedClass(null);
  };

  return {
    form,
    setForm,
    loading,
    saving: loading,
    error,
    setError,
    success,
    setSuccess,
    classifications,
    selectedClass,
    setSelectedClass,
    setField,
    addSlabRow,
    updateSlabRow,
    removeSlabRow,
    handleSubmit,
    handleDelete,
    handleSelectClass,
    handleBack,
  };
}
