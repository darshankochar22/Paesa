import { useState, useEffect, useCallback, useRef } from "react";
import { useCompany } from "@/context/CompanyContext";
import { loadFormState, saveFormState, clearFormState } from "@/utils/formPersistence";
import type { GSTClassificationType } from "@/types/entities/GSTClassification";

export interface FormData {
  name: string;
  description: string;
  hsn_sac_code: string;
  is_non_gst_goods: "No" | "Yes";
  nature_of_transaction: string;
  taxability: "Unknown" | "Taxable" | "Exempt" | "Nil Rated";
  is_reverse_charge: "No" | "Yes";
  is_ineligible_for_itc: "No" | "Yes";
  igst_rate: string;
  igst_valuation_type: "Based on Value" | "Based on Quantity";
  cgst_rate: string;
  cgst_valuation_type: "Based on Value" | "Based on Quantity";
  sgst_rate: string;
  sgst_valuation_type: "Based on Value" | "Based on Quantity";
  cess_rate: string;
  cess_valuation_type: "Based on Value" | "Based on Quantity";
}

export const INITIAL_FORM: FormData = {
  name: "",
  description: "",
  hsn_sac_code: "",
  is_non_gst_goods: "No",
  nature_of_transaction: "Not Applicable",
  taxability: "Unknown",
  is_reverse_charge: "No",
  is_ineligible_for_itc: "No",
  igst_rate: "0",
  igst_valuation_type: "Based on Value",
  cgst_rate: "0",
  cgst_valuation_type: "Based on Value",
  sgst_rate: "0",
  sgst_valuation_type: "Based on Value",
  cess_rate: "0",
  cess_valuation_type: "Based on Value",
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

  const handleSelectClass = (c: GSTClassificationType) => {
    setSelectedClass(c);
    setForm({
      name: c.name ?? "",
      description: c.description ?? "",
      hsn_sac_code: c.hsn_sac_code ?? "",
      is_non_gst_goods: c.is_non_gst_goods === 1 ? "Yes" : "No",
      nature_of_transaction: c.nature_of_transaction ?? "Not Applicable",
      taxability: (c.taxability as any) ?? "Unknown",
      is_reverse_charge: c.is_reverse_charge === 1 ? "Yes" : "No",
      is_ineligible_for_itc: c.is_ineligible_for_itc === 1 ? "Yes" : "No",
      igst_rate: String(c.igst_rate ?? 0),
      igst_valuation_type: (c.igst_valuation_type as any) ?? "Based on Value",
      cgst_rate: String(c.cgst_rate ?? 0),
      cgst_valuation_type: (c.cgst_valuation_type as any) ?? "Based on Value",
      sgst_rate: String(c.sgst_rate ?? 0),
      sgst_valuation_type: (c.sgst_valuation_type as any) ?? "Based on Value",
      cess_rate: String(c.cess_rate ?? 0),
      cess_valuation_type: (c.cess_valuation_type as any) ?? "Based on Value",
    });
    setError(null);
    setSuccess(null);
  };

  const handleIGSTChange = (val: string) => {
    const num = Number(val) || 0;
    const half = String(num / 2);
    setForm((f) => ({ ...f, igst_rate: val, cgst_rate: half, sgst_rate: half }));
  };

  const setField = (key: keyof FormData) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const val = e.target.value;
    if (key === "igst_rate") {
      handleIGSTChange(val);
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
    return null;
  };

  const handleSubmit = useCallback(async () => {
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }
    if (mode === "alter" && selectedClass?.is_predefined === 1) {
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
        hsn_sac_code: form.hsn_sac_code.trim() || undefined,
        is_non_gst_goods: form.is_non_gst_goods === "Yes" ? 1 : 0,
        nature_of_transaction: form.nature_of_transaction,
        taxability: form.taxability,
        is_reverse_charge: form.is_reverse_charge === "Yes" ? 1 : 0,
        is_ineligible_for_itc: form.is_ineligible_for_itc === "Yes" ? 1 : 0,
        igst_rate: Number(form.igst_rate) || 0,
        igst_valuation_type: form.igst_valuation_type,
        cgst_rate: Number(form.cgst_rate) || 0,
        cgst_valuation_type: form.cgst_valuation_type,
        sgst_rate: Number(form.sgst_rate) || 0,
        sgst_valuation_type: form.sgst_valuation_type,
        cess_rate: Number(form.cess_rate) || 0,
        cess_valuation_type: form.cess_valuation_type,
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
    if (selectedClass.is_predefined === 1) {
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
    handleSubmit,
    handleDelete,
    handleSelectClass,
    handleBack,
  };
}
