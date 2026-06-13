import { useState, useEffect, useCallback } from "react";
import type { CompanyTDSDetails } from "@/types/entities/CompanyTDSDetails";

export const DEFAULT_TDS_DETAILS: CompanyTDSDetails = {
  tanRegNumber: "",
  tan: "",
  deductorType: "Company",
  deductorBranch: "",
  setAlterPersonResponsible: false,
  personResponsibleName: "",
  personResponsibleDesignation: "",
  personResponsiblePan: "",
  personResponsiblePhone: "",
  personResponsibleEmail: "",
  ignoreItExemption: false,
  activateTdsForItems: false,
};

interface UseTDSDetailsProps {
  companyId?: number;
  onSaveSuccess?: () => void;
}

export function useTDSDetails({ companyId, onSaveSuccess }: UseTDSDetailsProps) {
  const [form, setForm] = useState<CompanyTDSDetails>(DEFAULT_TDS_DETAILS);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const getLocalStorageKey = useCallback(() => {
    return companyId ? `company_tds_details_${companyId}` : "company_tds_details";
  }, [companyId]);

  // Load details from backend / localStorage
  const loadDetails = useCallback(async () => {
    if (!companyId) return;
    setLoading(true);
    setError(null);
    try {
      let dataLoaded = false;
      if (window.api && window.api.companyTdsDetails) {
        const result = await window.api.companyTdsDetails.get(companyId);
        if (result && result.success && result.exists && result.data) {
          setForm(result.data);
          dataLoaded = true;
        }
      }

      if (!dataLoaded) {
        // Fallback to localStorage
        const localDataRaw = localStorage.getItem(getLocalStorageKey());
        if (localDataRaw) {
          const parsed = JSON.parse(localDataRaw) as CompanyTDSDetails;
          setForm(parsed);
        } else {
          setForm(DEFAULT_TDS_DETAILS);
        }
      }
    } catch (err) {
      console.error("Failed to load TDS details:", err);
      setError("Failed to load saved TDS details.");
    } finally {
      setLoading(false);
    }
  }, [companyId, getLocalStorageKey]);

  useEffect(() => {
    if (companyId) {
      loadDetails();
    }
  }, [companyId, loadDetails]);

  // Set single field
  const setField = (key: keyof CompanyTDSDetails, value: unknown) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  // Field validation
  const validate = (): { isValid: boolean; fieldId?: keyof CompanyTDSDetails; message?: string } => {
    if (!companyId) {
      return { isValid: false, message: "No company selected." };
    }

    if (form.tan && form.tan.trim().length > 0) {
      const trimmed = form.tan.trim();
      if (trimmed.length !== 10) {
        return {
          isValid: false,
          fieldId: "tan",
          message: "Tax deduction and collection Account Number (TAN) must be 10 characters.",
        };
      }
    }

    if (form.setAlterPersonResponsible) {
      if (!form.personResponsibleName || !form.personResponsibleName.trim()) {
        return {
          isValid: false,
          fieldId: "personResponsibleName",
          message: "Person responsible name is required when details are set to Yes.",
        };
      }

      if (form.personResponsiblePan && form.personResponsiblePan.trim().length > 0) {
        const panTrimmed = form.personResponsiblePan.trim();
        if (panTrimmed.length !== 10) {
          return {
            isValid: false,
            fieldId: "personResponsiblePan",
            message: "Person responsible PAN must be 10 characters.",
          };
        }
      }

      if (form.personResponsibleEmail && form.personResponsibleEmail.trim().length > 0) {
        const emailTrimmed = form.personResponsibleEmail.trim();
        if (!emailTrimmed.includes("@") || !emailTrimmed.includes(".")) {
          return {
            isValid: false,
            fieldId: "personResponsibleEmail",
            message: "Person responsible email is invalid.",
          };
        }
      }
    }

    return { isValid: true };
  };

  // Save changes
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
      if (window.api && window.api.companyTdsDetails) {
        const dbResult = await window.api.companyTdsDetails.save({
          ...form,
          company_id: companyId!,
        });

        if (!dbResult.success) {
          throw new Error(dbResult.error || "Database save failed");
        }
      }

      localStorage.setItem(getLocalStorageKey(), JSON.stringify(form));
      setSuccess("Company TDS details updated successfully.");
      onSaveSuccess?.();
      return true;
    } catch (err) {
      console.error("Failed to save TDS details:", err);
      setError(err instanceof Error ? err.message : "Failed to save TDS details.");
      return false;
    } finally {
      setLoading(false);
    }
  };

  return {
    form,
    setForm,
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
