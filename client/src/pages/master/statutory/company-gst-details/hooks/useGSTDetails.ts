import { useState, useEffect, useCallback } from "react";
import type { CompanyGSTDetails } from "@/types/entities/CompanyGSTDetails";

// ── Valid option sets ─────────────────────────────────────────────────────────
// Used to strip stale / legacy values loaded from localStorage or DB.

const VALID_HSN_SAC_TYPES = new Set([
  "Not Defined", "Specify Details Here", "Use GST Classification", "Specify in Voucher",
]);
const VALID_GST_RATE_DETAILS = new Set([
  "Not Defined", "Specify Details Here", "Specify Slab-Based Rates", "Use GST Classification", "Specify in Voucher"
]);
const VALID_TAXABILITY_TYPES = new Set([
  "Not Defined", "Taxable", "Exempt", "Nil Rated", "Non GST",
]);
const VALID_THRESHOLD_INCLUDES = new Set([
  "Value of Invoice", "Value of Taxable & Exempt Goods", "Value of Taxable Goods",
]);
const VALID_HSN_SUMMARY_FOR = new Set(["None", "All Sections", "All Sections Except B2C"]);
const VALID_MIN_HSN_LENGTHS = new Set([4, 6, 8]);

export const DEFAULT_GST_DETAILS: CompanyGSTDetails = {
  hsnSacType: "Not Defined",
  hsnSacCode: "",
  description: "",
  taxabilityType: "Not Defined",
  gstRate: 0,
  interstateThresholdLimit: 50000,
  intrastateThresholdLimit: 50000,
  thresholdLimitIncludes: "Value of Invoice",
  createHSNSummaryFor: "All Sections",
  minimumHSNLength: 4,
  showGSTAdvances: false,
  updateGSTStatus: true,
  gstReturnsConfigured: false,
  effectiveDate: "1-Apr-26",
  downloadGSTRegistration: "",
  downloadReturnType: "All Returns",
  gstClassification: "",
  setStateWiseThresholdLimit: false,
  gstAdvancesApplicableFrom: "",
};

/** Strip any field values that no longer match valid option sets. */
function sanitizeForm(raw: Partial<CompanyGSTDetails>): CompanyGSTDetails {
  const base = { ...DEFAULT_GST_DETAILS, ...raw };
  const isTrue = (val: any) => val === true || val === 1 || String(val) === "true" || String(val) === "1";

  return {
    ...base,
    hsnSacType: VALID_HSN_SAC_TYPES.has(base.hsnSacType ?? "")
      ? base.hsnSacType!
      : DEFAULT_GST_DETAILS.hsnSacType,
    taxabilityType: VALID_TAXABILITY_TYPES.has(base.taxabilityType ?? "")
      ? base.taxabilityType!
      : DEFAULT_GST_DETAILS.taxabilityType,
    thresholdLimitIncludes: VALID_THRESHOLD_INCLUDES.has(base.thresholdLimitIncludes ?? "")
      ? base.thresholdLimitIncludes!
      : DEFAULT_GST_DETAILS.thresholdLimitIncludes,
    createHSNSummaryFor: VALID_HSN_SUMMARY_FOR.has(base.createHSNSummaryFor ?? "")
      ? base.createHSNSummaryFor!
      : DEFAULT_GST_DETAILS.createHSNSummaryFor,
    minimumHSNLength: VALID_MIN_HSN_LENGTHS.has(Number(base.minimumHSNLength))
      ? Number(base.minimumHSNLength)
      : DEFAULT_GST_DETAILS.minimumHSNLength,
    gstRate: isNaN(Number(base.gstRate)) ? 0 : Number(base.gstRate),
    interstateThresholdLimit: isNaN(Number(base.interstateThresholdLimit))
      ? 50000
      : Number(base.interstateThresholdLimit),
    intrastateThresholdLimit: isNaN(Number(base.intrastateThresholdLimit))
      ? 50000
      : Number(base.intrastateThresholdLimit),
    setStateWiseThresholdLimit: isTrue(base.setStateWiseThresholdLimit),
    showGSTAdvances: isTrue(base.showGSTAdvances),
    updateGSTStatus: isTrue(base.updateGSTStatus),
    gstReturnsConfigured: isTrue(base.gstReturnsConfigured),
    stateWiseLimits: Array.isArray(base.stateWiseLimits) ? base.stateWiseLimits : [],
    gstAdvancesApplicableFrom: base.gstAdvancesApplicableFrom && typeof base.gstAdvancesApplicableFrom === "string" && base.gstAdvancesApplicableFrom.includes("T")
      ? base.gstAdvancesApplicableFrom.split("T")[0]
      : base.gstAdvancesApplicableFrom || "",
    effectiveDate: base.effectiveDate || "1-Apr-26",
    downloadGSTRegistration: base.downloadGSTRegistration || "",
    downloadReturnType: base.downloadReturnType || "All Returns",
  };
}

/** Sanitize the gstRateDetails string — reject any old/stale values. */
function sanitizeGstRateDetails(val: string | undefined): string {
  if (!val || !VALID_GST_RATE_DETAILS.has(val)) return "Not Defined";
  return val;
}


interface UseGSTDetailsProps {
  companyId?: number;
  isOpen: boolean;
  onSaveSuccess?: () => void;
}

export function useGSTDetails({ companyId, isOpen, onSaveSuccess }: UseGSTDetailsProps) {
  const [form, setForm] = useState<CompanyGSTDetails>(DEFAULT_GST_DETAILS);
  const [gstRateDetails, setGstRateDetails] = useState<string>("Not Defined");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [hasGSTRegistrations, setHasGSTRegistrations] = useState(false);

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
      const localDataRaw = localStorage.getItem(getLocalStorageKey());
      let localParsed: any = null;
      if (localDataRaw) {
        try {
          localParsed = JSON.parse(localDataRaw);
        } catch (e) {}
      }

      if (result.success && result.data) {
        // Use backend data (whether exists or not - it includes defaults)
        const dbData = result.data;
        const raw: CompanyGSTDetails = {
          ...dbData,
          gstClassification: localParsed?.gstClassification || "",
        };
        setForm(sanitizeForm(raw));

        // Resolve gstRateDetails — prefer localStorage hint if values still match DB
        const localRateDetails = sanitizeGstRateDetails(localParsed?.gstRateDetails);
        if (
          localParsed &&
          localParsed.taxabilityType === dbData.taxabilityType &&
          localParsed.gstRate === dbData.gstRate &&
          localRateDetails !== "Not Defined"
        ) {
          setGstRateDetails(localRateDetails);
        } else {
          setGstRateDetails(
            dbData.taxabilityType === "Not Defined" || !dbData.taxabilityType
              ? "Not Defined"
              : "Specify Details Here"
          );
        }
      } else {
        // 2. Fallback to localStorage
        if (localParsed) {
          setForm(sanitizeForm(localParsed));
          setGstRateDetails(sanitizeGstRateDetails(localParsed.gstRateDetails));
        } else {
          setForm(DEFAULT_GST_DETAILS);
          setGstRateDetails("Not Defined");
        }
      }
      
      // 3. Check for existing GST registrations
      const regResult = await window.api.gstRegistration.getAll(companyId);
      if (regResult.success && regResult.gstRegistrations && regResult.gstRegistrations.length > 0) {
        setHasGSTRegistrations(true);
      } else {
        setHasGSTRegistrations(false);
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

    if (gstRateDetails === "Specify Details Here" && form.taxabilityType === "Taxable") {
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

      // Also persist to localStorage as backup, including the UI state hint
      const storageObj = {
        ...finalForm,
        gstRateDetails,
      };
      localStorage.setItem(getLocalStorageKey(), JSON.stringify(storageObj));

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
    hasGSTRegistrations,
  };
}
