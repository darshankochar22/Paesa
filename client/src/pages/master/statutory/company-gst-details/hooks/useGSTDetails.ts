import { useState, useEffect, useCallback } from "react";
import type { CompanyGSTDetails } from "@/types/entities/CompanyGSTDetails";

export const DEFAULT_GST_DETAILS: CompanyGSTDetails = {
  hsnSacType: "Not Defined",
  hsnSacCode: "",
  description: "",
  taxabilityType: "Taxable",
  gstRate: 0,
  interstateThresholdLimit: 50000,
  intrastateThresholdLimit: 50000,
  thresholdLimitIncludes: "Value of Invoice",
  createHSNSummaryFor: "All Sections",
  minimumHSNLength: 4,
  showGSTAdvances: false,
  updateGSTStatus: false,
  gstReturnsConfigured: false,
};

interface UseGSTDetailsProps {
  companyId?: number;
  isOpen: boolean;
  onSaveSuccess?: () => void;
}

export function useGSTDetails({ companyId, isOpen, onSaveSuccess }: UseGSTDetailsProps) {
  const [form, setForm] = useState<CompanyGSTDetails>(DEFAULT_GST_DETAILS);
  const [gstRateDetails, setGstRateDetails] = useState<"Not Defined" | "Specified Here">("Not Defined");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const getLocalStorageKey = useCallback(() => {
    return companyId ? `company_gst_details_${companyId}` : "company_gst_details";
  }, [companyId]);

  // Load details from backend / localStorage
  const loadDetails = useCallback(async () => {
    if (!companyId) return;
    setLoading(true);
    setError(null);
    try {
      // 1. Try to load from SQLite backend
      const result = await window.api.companyGstDetails.get(companyId);
      if (result.success && result.exists && result.data) {
        setForm(result.data);
        setGstRateDetails(
          result.data.taxabilityType === "Not Defined" || !result.data.taxabilityType
            ? "Not Defined"
            : "Specified Here"
        );
      } else {
        // 2. Fallback to localStorage
        const localDataRaw = localStorage.getItem(getLocalStorageKey());
        if (localDataRaw) {
          const parsed = JSON.parse(localDataRaw) as CompanyGSTDetails;
          setForm(parsed);
          setGstRateDetails(
            parsed.taxabilityType === "Not Defined" || !parsed.taxabilityType
              ? "Not Defined"
              : "Specified Here"
          );
        } else {
          setForm(DEFAULT_GST_DETAILS);
          setGstRateDetails("Not Defined");
        }
      }
    } catch (err) {
      console.error("Failed to load GST details:", err);
      setError("Failed to load saved GST details.");
    } finally {
      setLoading(false);
    }
  }, [companyId, getLocalStorageKey]);

  useEffect(() => {
    if (isOpen && companyId) {
      loadDetails();
    }
  }, [isOpen, companyId, loadDetails]);

  // Set a single field value
  const setField = (key: keyof CompanyGSTDetails, value: unknown) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  // Field validation
  const validate = (): { isValid: boolean; fieldId?: keyof CompanyGSTDetails; message?: string } => {
    if (!companyId) {
      return { isValid: false, message: "No company selected." };
    }

    if (form.hsnSacCode && form.hsnSacCode.trim().length > 0) {
      const trimmed = form.hsnSacCode.trim();
      if (trimmed.length < 2 || trimmed.length > 8) {
        return {
          isValid: false,
          fieldId: "hsnSacCode",
          message: "HSN/SAC length must be between 2 and 8 characters.",
        };
      }
    }

    if (gstRateDetails === "Specified Here" && form.taxabilityType === "Taxable") {
      const rate = Number(form.gstRate);
      if (isNaN(rate) || rate < 0 || rate > 100) {
        return {
          isValid: false,
          fieldId: "gstRate",
          message: "GST Rate must be between 0 and 100.",
        };
      }
    }

    const interLimit = Number(form.interstateThresholdLimit);
    if (isNaN(interLimit) || interLimit < 0) {
      return {
        isValid: false,
        fieldId: "interstateThresholdLimit",
        message: "Interstate Threshold Limit must be a positive number.",
      };
    }

    const intraLimit = Number(form.intrastateThresholdLimit);
    if (isNaN(intraLimit) || intraLimit < 0) {
      return {
        isValid: false,
        fieldId: "intrastateThresholdLimit",
        message: "Intrastate Threshold Limit must be a positive number.",
      };
    }

    const hsnLen = Number(form.minimumHSNLength);
    if (isNaN(hsnLen) || hsnLen < 2 || hsnLen > 8) {
      return {
        isValid: false,
        fieldId: "minimumHSNLength",
        message: "Minimum length of HSN/SAC must be between 2 and 8.",
      };
    }

    return { isValid: true };
  };

  // Save changes — returns true on success
  const saveDetails = async (): Promise<boolean> => {
    const valResult = validate();
    if (!valResult.isValid) {
      setError(valResult.message || "Validation failed");
      return false;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const finalForm: CompanyGSTDetails = {
        ...form,
        taxabilityType: gstRateDetails === "Not Defined" ? "Not Defined" : form.taxabilityType,
        gstRate: gstRateDetails === "Not Defined" ? 0 : form.gstRate,
      };

      const dbResult = await window.api.companyGstDetails.save({
        ...finalForm,
        company_id: companyId!,
      });

      if (!dbResult.success) {
        throw new Error(dbResult.error || "Database save failed");
      }

      // Also persist to localStorage as backup
      localStorage.setItem(getLocalStorageKey(), JSON.stringify(finalForm));

      setSuccess("Company GST details updated successfully.");
      onSaveSuccess?.();
      return true;
    } catch (err) {
      console.error("Failed to save GST details:", err);
      setError(err instanceof Error ? err.message : "Failed to save GST details.");
      return false;
    } finally {
      setLoading(false);
    }
  };

  return {
    form,
    setForm,
    gstRateDetails,
    setGstRateDetails,
    setField,
    loading,
    error,
    setError,
    success,
    setSuccess,
    validate,
    saveDetails,
    loadDetails,
  };
}
