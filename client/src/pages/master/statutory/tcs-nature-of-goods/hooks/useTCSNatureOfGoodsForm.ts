import { useState, useEffect, useCallback, useRef } from "react";
import { useCompany } from "@/context/CompanyContext";
import { loadFormState, saveFormState, clearFormState } from "@/utils/formPersistence";
import type { TCSNatureOfGoodsType } from "@/types/entities/TCSNatureOfGoods";

export interface FormData {
  name: string;
  section: string;
  payment_code: string;
  rate_individual_with_pan: string;
  rate_individual_without_pan: string;
  rate_other_with_pan: string;
  rate_other_without_pan: string;
  is_own_status: "No" | "Yes";
  tax_on_receipt_or_realization: "No" | "Yes";
  threshold_level: string;
  is_zero_rated: "No" | "Yes";
}

export const INITIAL_FORM: FormData = {
  name: "",
  section: "",
  payment_code: "",
  rate_individual_with_pan: "0",
  rate_individual_without_pan: "0",
  rate_other_with_pan: "0",
  rate_other_without_pan: "0",
  is_own_status: "No",
  tax_on_receipt_or_realization: "No",
  threshold_level: "0",
  is_zero_rated: "No",
};

interface UseTCSNatureOfGoodsFormOptions {
  mode: "create" | "alter";
}

export function useTCSNatureOfGoodsForm({ mode }: UseTCSNatureOfGoodsFormOptions) {
  const { selectedCompany } = useCompany();
  const companyId = selectedCompany?.company_id;
  const persistKey = companyId ? `tcsNatureOfGoods${mode === "create" ? "Create" : "Alter"}_${companyId}` : null;
  const hasRestored = useRef(false);

  const [tcsList, setTcsList] = useState<TCSNatureOfGoodsType[]>([]);
  const [selectedTcs, setSelectedTcs] = useState<TCSNatureOfGoodsType | null>(() => {
    if (mode === "alter" && persistKey) {
      return loadFormState<any>(persistKey)?.selectedTcs ?? null;
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
    if (mode === "alter" && !selectedTcs) return;
    saveFormState(persistKey, {
      form,
      ...(mode === "alter" ? { selectedTcs } : {}),
    });
  }, [persistKey, form, selectedTcs, mode]);

  const loadTcsList = useCallback(async () => {
    if (!companyId) return;
    const result = await window.api.tcsNatureOfGoods.getAll(companyId);
    if (result.success) {
      setTcsList(result.tcsNatureOfGoodsList ?? []);
    }
  }, [companyId]);

  useEffect(() => {
    if (mode === "alter") {
      loadTcsList();
    }
  }, [loadTcsList, mode]);

  const handleSelectTcs = useCallback(async (t: TCSNatureOfGoodsType) => {
    if (!t.tcs_id) return;
    setLoading(true);
    setError(null);
    try {
      const result = await window.api.tcsNatureOfGoods.getById(t.tcs_id);
      if (!result.success) {
        setError(result.error || "Unable to load selected TCS Nature of Goods.");
        return;
      }
      const record = result.tcsNatureOfGoods;
      setSelectedTcs(record);
      setForm({
        name: record.name ?? "",
        section: record.section ?? "",
        payment_code: record.payment_code ?? "",
        rate_individual_with_pan: String(record.rate_individual_with_pan ?? 0),
        rate_individual_without_pan: String(record.rate_individual_without_pan ?? 0),
        rate_other_with_pan: String(record.rate_other_with_pan ?? 0),
        rate_other_without_pan: String(record.rate_other_without_pan ?? 0),
        is_own_status: record.is_own_status === 1 ? "Yes" : "No",
        tax_on_receipt_or_realization: record.tax_on_receipt_or_realization === "Tax Calculated on Realization" ? "Yes" : "No",
        threshold_level: String(record.threshold_level ?? 0),
        is_zero_rated: record.is_zero_rated === 1 ? "Yes" : "No",
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load selected TCS Nature of Goods.");
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
      ["Individual Rate (Without PAN)", "rate_individual_without_pan"],
      ["Other Rate (With PAN)", "rate_other_with_pan"],
      ["Other Rate (Without PAN)", "rate_other_without_pan"],
      ["Threshold Level", "threshold_level"],
    ] as const) {
      const v = Number(form[key]);
      if (isNaN(v) || v < 0) return `${label} must be a valid non-negative number.`;
      if (key !== "threshold_level" && v > 100) return `${label} must be between 0 and 100.`;
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
        rate_individual_with_pan: isZero ? 0 : (Number(form.rate_individual_with_pan) || 0),
        rate_individual_without_pan: isZero ? 0 : (Number(form.rate_individual_without_pan) || 0),
        rate_other_with_pan: isZero ? 0 : (Number(form.rate_other_with_pan) || 0),
        rate_other_without_pan: isZero ? 0 : (Number(form.rate_other_without_pan) || 0),
        is_own_status: form.is_own_status === "Yes" ? 1 : 0,
        tax_on_receipt_or_realization: form.tax_on_receipt_or_realization === "Yes" ? "Tax Calculated on Realization" : "Tax Calculated on Receipt",
        threshold_level: Number(form.threshold_level) || 0,
        is_zero_rated: isZero ? 1 : 0,
        is_predefined: mode === "create" ? 0 : selectedTcs?.is_predefined ?? 0,
        is_active: mode === "create" ? 1 : selectedTcs?.is_active ?? 1,
      };

      if (mode === "alter" && selectedTcs) {
        data.tcs_id = selectedTcs.tcs_id;
      }

      const result = await (mode === "create"
        ? window.api.tcsNatureOfGoods.create(data)
        : window.api.tcsNatureOfGoods.update(data));

      if (result.success) {
        setSuccess(`TCS Nature of Goods "${form.name}" ${mode === "create" ? "created" : "updated"} successfully.`);
        if (persistKey) clearFormState(persistKey);
        hasRestored.current = false;

        if (mode === "create") {
          setForm(INITIAL_FORM);
          setTimeout(() => setSuccess(null), 2000);
        } else {
          await loadTcsList();
          setTimeout(() => {
            setSuccess(null);
            setSelectedTcs(null);
          }, 1500);
        }
      } else {
        setError(result.error || `Failed to ${mode} TCS Nature of Goods.`);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unexpected error.");
    } finally {
      setLoading(false);
    }
  }, [form, companyId, mode, selectedTcs, persistKey, loadTcsList]);

  const handleDelete = useCallback(async () => {
    if (mode !== "alter" || !selectedTcs) return;
    if (!window.confirm(`Delete TCS Nature of Goods "${selectedTcs.name}"?`)) return;

    setLoading(true);
    setError(null);
    try {
      const result = await window.api.tcsNatureOfGoods.delete(selectedTcs.tcs_id!);
      if (result.success) {
        setSuccess("TCS Nature of Goods deleted successfully.");
        if (persistKey) clearFormState(persistKey);
        hasRestored.current = false;
        await loadTcsList();
        setTimeout(() => {
          setSuccess(null);
          setSelectedTcs(null);
        }, 1500);
      } else {
        setError(result.error || "Failed to delete TCS Nature of Goods.");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unexpected error.");
    } finally {
      setLoading(false);
    }
  }, [selectedTcs, mode, persistKey, loadTcsList]);

  const handleBack = () => {
    setSelectedTcs(null);
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
    tcsList,
    selectedTcs,
    setSelectedTcs,
    setField,
    handleSubmit,
    handleDelete,
    handleSelectTcs,
    handleBack,
  };
}
