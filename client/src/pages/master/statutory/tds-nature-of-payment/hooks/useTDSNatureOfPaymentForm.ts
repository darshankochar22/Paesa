import { useState, useEffect, useCallback, useRef } from "react";
import { useCompany } from "@/context/CompanyContext";
import { loadFormState, saveFormState, clearFormState } from "@/utils/formPersistence";
import type { TDSNatureOfPaymentType } from "@/types/entities/TDSNatureOfPayment";

export interface FormData {
  name: string;
  section: string;
  payment_code: string;
  remittance_code: string;
  rate_individual_with_pan: string;
  rate_other_with_pan: string;
  is_zero_rated: "No" | "Yes";
  threshold_limit: string;
}

export const INITIAL_FORM: FormData = {
  name: "",
  section: "",
  payment_code: "",
  remittance_code: "",
  rate_individual_with_pan: "0",
  rate_other_with_pan: "0",
  is_zero_rated: "No",
  threshold_limit: "0",
};

interface UseTDSNatureOfPaymentFormOptions {
  mode: "create" | "alter";
}

export function useTDSNatureOfPaymentForm({ mode }: UseTDSNatureOfPaymentFormOptions) {
  const { selectedCompany } = useCompany();
  const companyId = selectedCompany?.company_id;
  const persistKey = companyId ? `tdsNatureOfPayment${mode === "create" ? "Create" : "Alter"}_${companyId}` : null;
  const hasRestored = useRef(false);

  const [tdsList, setTdsList] = useState<TDSNatureOfPaymentType[]>([]);
  const [selectedTds, setSelectedTds] = useState<TDSNatureOfPaymentType | null>(() => {
    if (mode === "alter" && persistKey) {
      return loadFormState<any>(persistKey)?.selectedTds ?? null;
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
    if (mode === "alter" && !selectedTds) return;
    saveFormState(persistKey, {
      form,
      ...(mode === "alter" ? { selectedTds } : {}),
    });
  }, [persistKey, form, selectedTds, mode]);

  const loadTdsList = useCallback(async () => {
    if (!companyId) return;
    const result = await window.api.tdsNatureOfPayment.getAll(companyId);
    if (result.success) {
      setTdsList(result.tdsNatureOfPaymentList ?? []);
    }
  }, [companyId]);

  useEffect(() => {
    if (mode === "alter") {
      loadTdsList();
    }
  }, [loadTdsList, mode]);

  const handleSelectTds = useCallback(async (t: TDSNatureOfPaymentType) => {
    if (!t.tds_id) return;
    setLoading(true);
    setError(null);
    try {
      const result = await window.api.tdsNatureOfPayment.getById(t.tds_id);
      if (!result.success) {
        setError(result.error || "Unable to load selected TDS Nature of Payment.");
        return;
      }
      const record = result.tdsNatureOfPayment;
      setSelectedTds(record);
      setForm({
        name: record.name ?? "",
        section: record.section ?? "",
        payment_code: record.payment_code ?? "",
        remittance_code: record.remittance_code ?? "",
        rate_individual_with_pan: String(record.rate_individual_with_pan ?? 0),
        rate_other_with_pan: String(record.rate_other_with_pan ?? 0),
        is_zero_rated: !!record.is_zero_rated ? "Yes" : "No",
        threshold_limit: String(record.threshold_limit ?? 0),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load selected TDS Nature of Payment.");
    } finally {
      setLoading(false);
    }
  }, []);

  const setField = (key: keyof FormData) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const val = e.target.value;
    setForm((f) => ({ ...f, [key]: val }));
  };

  const validate = (): string | null => {
    if (!form.name.trim()) return "Name is required.";
    if (!companyId) return "No company selected.";

    for (const [label, key] of [
      ["Individual Rate (With PAN)", "rate_individual_with_pan"],
      ["Other Rate (With PAN)", "rate_other_with_pan"],
      ["Threshold/Exemption Limit", "threshold_limit"],
    ] as const) {
      const v = Number(form[key]);
      if (isNaN(v) || v < 0) return `${label} must be a valid non-negative number.`;
      if (key !== "threshold_limit" && v > 100) return `${label} must be between 0 and 100.`;
    }

    return null;
  };

  const handleSubmit = useCallback(async () => {
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const isZero = form.is_zero_rated === "Yes";
      const data: any = {
        company_id: companyId,
        name: form.name.trim(),
        section: form.section.trim() || undefined,
        payment_code: form.payment_code.trim() || undefined,
        remittance_code: form.remittance_code.trim() || undefined,
        rate_individual_with_pan: isZero ? 0 : (Number(form.rate_individual_with_pan) || 0),
        rate_other_with_pan: isZero ? 0 : (Number(form.rate_other_with_pan) || 0),
        is_zero_rated: isZero ? 1 : 0,
        threshold_limit: Number(form.threshold_limit) || 0,
        is_predefined: mode === "create" ? 0 : selectedTds?.is_predefined ?? 0,
        is_active: mode === "create" ? 1 : selectedTds?.is_active ?? 1,
      };

      if (mode === "alter" && selectedTds) {
        data.tds_id = selectedTds.tds_id;
      }

      const result = await (mode === "create"
        ? window.api.tdsNatureOfPayment.create(data)
        : window.api.tdsNatureOfPayment.update(data));

      if (result.success) {
        setSuccess(`TDS Nature of Payment "${form.name}" ${mode === "create" ? "created" : "updated"} successfully.`);
        if (persistKey) clearFormState(persistKey);
        hasRestored.current = false;

        if (mode === "create") {
          setForm(INITIAL_FORM);
          setTimeout(() => setSuccess(null), 2000);
        } else {
          await loadTdsList();
          setTimeout(() => {
            setSuccess(null);
            setSelectedTds(null);
          }, 1500);
        }
      } else {
        setError(result.error || `Failed to ${mode} TDS Nature of Payment.`);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unexpected error.");
    } finally {
      setLoading(false);
    }
  }, [form, companyId, mode, selectedTds, persistKey, loadTdsList]);

  const handleDelete = useCallback(async () => {
    if (mode !== "alter" || !selectedTds) return;
    if (!window.confirm(`Delete TDS Nature of Payment "${selectedTds.name}"?`)) return;

    setLoading(true);
    setError(null);
    try {
      const result = await window.api.tdsNatureOfPayment.delete(selectedTds.tds_id!);
      if (result.success) {
        setSuccess("TDS Nature of Payment deleted successfully.");
        if (persistKey) clearFormState(persistKey);
        hasRestored.current = false;
        await loadTdsList();
        setTimeout(() => {
          setSuccess(null);
          setSelectedTds(null);
        }, 1500);
      } else {
        setError(result.error || "Failed to delete TDS Nature of Payment.");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unexpected error.");
    } finally {
      setLoading(false);
    }
  }, [selectedTds, mode, persistKey, loadTdsList]);

  const handleBack = () => {
    setSelectedTds(null);
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
    tdsList,
    selectedTds,
    setSelectedTds,
    setField,
    handleSubmit,
    handleDelete,
    handleSelectTds,
    handleBack,
  };
}
