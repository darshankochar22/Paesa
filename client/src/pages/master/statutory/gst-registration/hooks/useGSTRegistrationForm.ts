import { useState, useEffect, useCallback, useRef } from "react";
import { useCompany } from "@/context/CompanyContext";
import { loadFormState, saveFormState, clearFormState } from "@/utils/formPersistence";
import { INDIAN_STATES } from "@/constants/states";
import type { GSTRegistrationType } from "@/types/entities/GSTRegistration";

export interface FormData {
  registration_type: "Regular" | "Composition" | "Regular - SEZ";
  registration_status: "Active" | "Suspended" | "Inactive";
  assessee_of_other_territory: "No" | "Yes";
  periodicity_of_gstr1: "Monthly" | "Quarterly";
  gstin: string;
  gst_username: string;
  mode_of_filing: "Not Applicable" | "DSC" | "EVC";
  e_invoice_details: string;
  e_invoice_application: "No" | "Yes";
  e_way_bill_applicable: "No" | "Yes";
  e_way_bill_applicable_from: string;
  applicable_for_intrastat: "No" | "Yes";
  legal_name: string;
  trade_name: string;
  state_id: string;
  registration_date: string;
  effective_from: string;
  address_type: string;
  goods_dispatched_from: string;
  e_invoice_applicable_from: string;
  e_invoice_bill_from_place: string;
  composition_tax_rate: string;
  composition_tax_calc_basis: "Taxable, Exempt, & Nil Rated Values" | "Taxable Value";
}

export const INITIAL_FORM: FormData = {
  registration_type: "Regular",
  registration_status: "Active",
  assessee_of_other_territory: "No",
  periodicity_of_gstr1: "Monthly",
  gstin: "",
  gst_username: "",
  mode_of_filing: "Not Applicable",
  e_invoice_details: "",
  e_invoice_application: "No",
  e_way_bill_applicable: "No",
  e_way_bill_applicable_from: "",
  applicable_for_intrastat: "No",
  legal_name: "",
  trade_name: "",
  state_id: INDIAN_STATES[0] || "",
  registration_date: new Date().toISOString().split("T")[0],
  effective_from: new Date().toISOString().split("T")[0],
  address_type: "Primary",
  goods_dispatched_from: "Primary",
  e_invoice_applicable_from: "",
  e_invoice_bill_from_place: "",
  composition_tax_rate: "",
  composition_tax_calc_basis: "Taxable Value",
};

interface UseGSTRegistrationFormOptions {
  mode: "create" | "alter";
}

export function useGSTRegistrationForm({ mode }: UseGSTRegistrationFormOptions) {
  const { selectedCompany } = useCompany();
  const companyId = selectedCompany?.company_id;
  const persistKey = companyId ? `gstRegistration${mode === "create" ? "Create" : "Alter"}_${companyId}` : null;
  const hasRestored = useRef(false);

  const [registrations, setRegistrations] = useState<GSTRegistrationType[]>([]);
  const [selectedReg, setSelectedReg] = useState<GSTRegistrationType | null>(() => {
    if (mode === "alter" && persistKey) {
      return loadFormState<any>(persistKey)?.selectedReg ?? null;
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
    if (mode === "alter" && !selectedReg) return;
    saveFormState(persistKey, {
      form,
      ...(mode === "alter" ? { selectedReg } : {}),
    });
  }, [persistKey, form, selectedReg, mode]);

  const loadRegistrations = useCallback(async () => {
    if (!companyId) return;
    const result = await window.api.gstRegistration.getAll(companyId);
    if (result.success) {
      setRegistrations(result.gstRegistrations ?? []);
    }
  }, [companyId]);

  useEffect(() => {
    loadRegistrations();
  }, [loadRegistrations]);

  const handleSelectReg = (r: GSTRegistrationType) => {
    setSelectedReg(r);
    setForm({
      registration_type: (r.registration_type as any) ?? "Regular",
      registration_status: (r.registration_status as any) ?? "Active",
      assessee_of_other_territory: r.assessee_of_other_territory === 1 ? "Yes" : "No",
      periodicity_of_gstr1: (r.periodicity_of_gstr1 as any) ?? "Monthly",
      gstin: r.gstin ?? "",
      gst_username: r.gst_username ?? "",
      mode_of_filing: (r.mode_of_filing as any) ?? "Not Applicable",
      e_invoice_details: r.e_invoice_details ?? "",
      e_invoice_application: r.e_invoice_application === 1 ? "Yes" : "No",
      e_way_bill_applicable: r.e_way_bill_applicable === 1 ? "Yes" : "No",
      e_way_bill_applicable_from: r.e_way_bill_applicable_from ?? "",
      applicable_for_intrastat: r.applicable_for_intrastat === 1 ? "Yes" : "No",
      legal_name: r.legal_name ?? "",
      trade_name: r.trade_name ?? "",
      state_id: r.state_id || INDIAN_STATES[0] || "",
      registration_date: r.registration_date ?? "",
      effective_from: r.effective_from ?? "",
      address_type: r.address_type ?? "Primary",
      goods_dispatched_from: r.goods_dispatched_from ?? "Primary",
      e_invoice_applicable_from: r.e_invoice_applicable_from ?? "",
      e_invoice_bill_from_place: r.e_invoice_bill_from_place ?? "",
      composition_tax_rate: r.composition_tax_rate !== null && r.composition_tax_rate !== undefined ? String(r.composition_tax_rate) : "",
      composition_tax_calc_basis: (r.composition_tax_calc_basis as any) ?? "Taxable Value",
    });
    setError(null);
    setSuccess(null);
  };

  const setField = (key: keyof FormData) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const validate = (): string | null => {
    if (!companyId) return "No company selected.";
    if (!form.gstin.trim()) return "GSTIN is required.";
    const gstinPattern = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
    const upperGSTIN = form.gstin.trim().toUpperCase();
    if (upperGSTIN.length !== 15) {
      return "GSTIN must be exactly 15 characters long.";
    }
    if (!gstinPattern.test(upperGSTIN)) {
      return "Invalid GSTIN format. Expected e.g. 27AAAAA1111A1Z1";
    }
    if (!form.state_id) return "State is required.";
    if (form.registration_type === "Composition") {
      if (!form.composition_tax_rate.trim()) {
        return "Tax rate for taxable turnover is required under Composition scheme.";
      }
      if (isNaN(parseFloat(form.composition_tax_rate))) {
        return "Invalid composition tax rate. Must be a number.";
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

    setLoading(true);
    setError(null);
    try {
      const data: any = {
        company_id: companyId,
        registration_type: form.registration_type,
        registration_status: form.registration_status,
        assessee_of_other_territory: form.assessee_of_other_territory === "Yes" ? 1 : 0,
        periodicity_of_gstr1: form.periodicity_of_gstr1,
        gstin: form.gstin.trim().toUpperCase(),
        gst_username: form.gst_username.trim() || undefined,
        mode_of_filing: form.mode_of_filing,
        e_invoice_details: form.e_invoice_details.trim() || undefined,
        e_invoice_application: form.e_invoice_application === "Yes" ? 1 : 0,
        e_way_bill_applicable: form.e_way_bill_applicable === "Yes" ? 1 : 0,
        e_way_bill_applicable_from: form.e_way_bill_applicable_from || undefined,
        applicable_for_intrastat: form.applicable_for_intrastat === "Yes" ? 1 : 0,
        legal_name: form.legal_name.trim() || undefined,
        trade_name: form.trade_name.trim() || undefined,
        state_id: form.state_id,
        registration_date: form.registration_date || undefined,
        effective_from: form.effective_from || undefined,
        address_type: form.address_type,
        goods_dispatched_from: form.goods_dispatched_from,
        e_invoice_applicable_from: form.e_invoice_application === "Yes" ? (form.e_invoice_applicable_from || undefined) : undefined,
        e_invoice_bill_from_place: form.e_invoice_application === "Yes" ? (form.e_invoice_bill_from_place.trim() || undefined) : undefined,
        composition_tax_rate: form.registration_type === "Composition" ? parseFloat(form.composition_tax_rate) : null,
        composition_tax_calc_basis: form.registration_type === "Composition" ? form.composition_tax_calc_basis : null,
        is_active: mode === "create" ? 1 : selectedReg?.is_active ?? 1,
      };

      if (mode === "alter" && selectedReg) {
        data.gst_id = selectedReg.gst_id;
      }

      const result = await (mode === "create"
        ? window.api.gstRegistration.create(data)
        : window.api.gstRegistration.update(data));

      if (result.success) {
        setSuccess(`GST Registration for "${form.gstin.toUpperCase()}" ${mode === "create" ? "created" : "updated"} successfully.`);
        if (persistKey) clearFormState(persistKey);
        hasRestored.current = false;

        if (mode === "create") {
          setForm({ ...INITIAL_FORM, state_id: form.state_id });
          setTimeout(() => setSuccess(null), 2000);
        } else {
          await loadRegistrations();
          setTimeout(() => {
            setSuccess(null);
            setSelectedReg(null);
          }, 1500);
        }
      } else {
        setError(result.error || `Failed to ${mode} GST registration.`);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unexpected error.");
    } finally {
      setLoading(false);
    }
  }, [form, companyId, mode, selectedReg, persistKey, loadRegistrations]);

  const handleDelete = useCallback(async () => {
    if (mode !== "alter" || !selectedReg) return;
    if (!window.confirm(`Delete GST Registration "${selectedReg.gstin}"?`)) return;

    setLoading(true);
    setError(null);
    try {
      const result = await window.api.gstRegistration.delete(selectedReg.gst_id!);
      if (result.success) {
        setSuccess("GST Registration deleted successfully.");
        if (persistKey) clearFormState(persistKey);
        hasRestored.current = false;
        await loadRegistrations();
        setTimeout(() => {
          setSuccess(null);
          setSelectedReg(null);
        }, 1500);
      } else {
        setError(result.error || "Failed to delete GST registration.");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unexpected error.");
    } finally {
      setLoading(false);
    }
  }, [selectedReg, mode, persistKey, loadRegistrations]);

  const handleBack = () => {
    setSelectedReg(null);
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
    registrations,
    selectedReg,
    setSelectedReg,
    setField,
    validate,
    handleSubmit,
    handleDelete,
    handleSelectReg,
    handleBack,
  };
}
