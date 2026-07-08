import { useState, useEffect, useCallback } from 'react';
import { useCompany } from '@/context/CompanyContext';
import { INDIAN_STATES } from '@/constants/states';
import type { GSTRegistrationType } from '@/types/entities/GSTRegistration';

export interface FormData {
  registration_type: 'Regular' | 'Composition' | 'Regular - SEZ';
  registration_status: 'Active' | 'Suspended' | 'Inactive';
  assessee_of_other_territory: 'No' | 'Yes';
  periodicity_of_gstr1: 'Monthly' | 'Quarterly';
  gstin: string;
  gst_username: string;
  mode_of_filing: 'Not Applicable' | 'DSC' | 'EVC';
  e_invoice_details: string;
  e_invoice_application: 'No' | 'Yes';
  e_way_bill_applicable: 'No' | 'Yes';
  e_way_bill_applicable_from: string;
  applicable_for_intrastat: 'No' | 'Yes';
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
  composition_tax_calc_basis: 'Taxable, Exempt, & Nil Rated Values' | 'Taxable Value';
}

export const INITIAL_FORM: FormData = {
  registration_type: 'Regular',
  registration_status: 'Active',
  assessee_of_other_territory: 'No',
  periodicity_of_gstr1: 'Monthly',
  gstin: '',
  gst_username: '',
  mode_of_filing: 'Not Applicable',
  e_invoice_details: '',
  e_invoice_application: 'No',
  e_way_bill_applicable: 'No',
  e_way_bill_applicable_from: '',
  applicable_for_intrastat: 'No',
  legal_name: '',
  trade_name: '',
  state_id: INDIAN_STATES[0] || '',
  registration_date: new Date().toISOString().split('T')[0],
  effective_from: new Date().toISOString().split('T')[0],
  address_type: 'Primary',
  goods_dispatched_from: 'Primary',
  e_invoice_applicable_from: '',
  e_invoice_bill_from_place: '',
  composition_tax_rate: '',
  composition_tax_calc_basis: 'Taxable Value',
};

interface UseGSTRegistrationFormOptions {
  mode: 'create' | 'alter';
}

export function useGSTRegistrationForm({ mode }: UseGSTRegistrationFormOptions) {
  const { selectedCompany } = useCompany();
  const companyId = selectedCompany?.company_id;

  const [registrations, setRegistrations] = useState<GSTRegistrationType[]>([]);
  const [selectedReg, setSelectedReg] = useState<GSTRegistrationType | null>(null);

  const [form, setForm] = useState<FormData>(INITIAL_FORM);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

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
    const isYes = (val: any) =>
      val === 1 || val === true || String(val).toLowerCase() === 'yes' || String(val) === '1';
    const formatDate = (val: any) => {
      if (!val) return '';
      if (typeof val === 'string' && val.includes('T')) {
        return val.split('T')[0];
      }
      return val;
    };

    setSelectedReg(r);
    setForm({
      registration_type: (r.registration_type as any) ?? 'Regular',
      registration_status: (r.registration_status as any) ?? 'Active',
      assessee_of_other_territory: isYes(r.assessee_of_other_territory) ? 'Yes' : 'No',
      periodicity_of_gstr1: (r.periodicity_of_gstr1 as any) ?? 'Monthly',
      gstin: r.gstin ?? '',
      gst_username: r.gst_username ?? '',
      mode_of_filing: (r.mode_of_filing as any) ?? 'Not Applicable',
      e_invoice_details: r.e_invoice_details ?? '',
      e_invoice_application: isYes(r.e_invoice_application) ? 'Yes' : 'No',
      e_way_bill_applicable: isYes(r.e_way_bill_applicable) ? 'Yes' : 'No',
      e_way_bill_applicable_from: formatDate(r.e_way_bill_applicable_from),
      applicable_for_intrastat: isYes(r.applicable_for_intrastat) ? 'Yes' : 'No',
      legal_name: r.legal_name ?? '',
      trade_name: r.trade_name ?? '',
      state_id: r.state_id || INDIAN_STATES[0] || '',
      registration_date: formatDate(r.registration_date),
      effective_from: formatDate(r.effective_from),
      address_type: r.address_type ?? 'Primary',
      goods_dispatched_from: r.goods_dispatched_from ?? 'Primary',
      e_invoice_applicable_from: formatDate(r.e_invoice_applicable_from),
      e_invoice_bill_from_place: r.e_invoice_bill_from_place ?? '',
      composition_tax_rate:
        r.composition_tax_rate !== null && r.composition_tax_rate !== undefined
          ? String(r.composition_tax_rate)
          : '',
      composition_tax_calc_basis: (r.composition_tax_calc_basis as any) ?? 'Taxable Value',
    });
    setError(null);
    setSuccess(null);
  };

  const setField =
    (key: keyof FormData) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm((f) => ({ ...f, [key]: e.target.value }));

  const validate = (bypassGstinCheck: boolean = false): string | null => {
    if (!companyId) return 'No company selected.';
    if (!form.gstin.trim()) return 'GSTIN is required.';
    // Accepts standard GSTINs and NIC/GSP sandbox test GSTINs (whose trailing chars are
    // non-standard, e.g. 29AAGCB1286Q000). Keeps the state-code + PAN structure; relaxes
    // the fixed 'Z'/checksum so sandbox seller GSTINs save without a manual override.
    const gstinPattern = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[0-9A-Z]{3}$/;
    const upperGSTIN = form.gstin.trim().toUpperCase();
    if (upperGSTIN.length !== 15) {
      return 'GSTIN must be exactly 15 characters long.';
    }
    if (!gstinPattern.test(upperGSTIN)) {
      if (!bypassGstinCheck) {
        return 'WARNING_INVALID_GSTIN';
      }
    }
    if (!form.state_id) return 'State is required.';
    if (form.registration_type === 'Composition') {
      if (!form.composition_tax_rate.trim()) {
        return 'Tax rate for taxable turnover is required under Composition scheme.';
      }
      if (isNaN(parseFloat(form.composition_tax_rate))) {
        return 'Invalid composition tax rate. Must be a number.';
      }
    }
    return null;
  };

  const handleSubmit = useCallback(
    async (bypassGstinCheck: boolean = false): Promise<string | null> => {
      const validationError = validate(bypassGstinCheck);
      if (validationError) {
        if (validationError === 'WARNING_INVALID_GSTIN') {
          return 'WARNING_INVALID_GSTIN';
        }
        setError(validationError);
        return null;
      }

      setLoading(true);
      setError(null);
      try {
        const data: any = {
          company_id: companyId,
          registration_type: form.registration_type,
          registration_status: form.registration_status,
          assessee_of_other_territory: form.assessee_of_other_territory === 'Yes' ? 1 : 0,
          periodicity_of_gstr1: form.periodicity_of_gstr1,
          gstin: form.gstin.trim().toUpperCase(),
          gst_username: form.gst_username.trim() || undefined,
          mode_of_filing: form.mode_of_filing,
          e_invoice_details: form.e_invoice_details.trim() || undefined,
          e_invoice_application: form.e_invoice_application === 'Yes' ? 1 : 0,
          e_way_bill_applicable: form.e_way_bill_applicable === 'Yes' ? 1 : 0,
          e_way_bill_applicable_from: form.e_way_bill_applicable_from || undefined,
          applicable_for_intrastat: form.applicable_for_intrastat === 'Yes' ? 1 : 0,
          legal_name: form.legal_name.trim() || undefined,
          trade_name: form.trade_name.trim() || undefined,
          state_id: form.state_id,
          registration_date: form.registration_date || undefined,
          effective_from: form.effective_from || undefined,
          address_type: form.address_type,
          goods_dispatched_from: form.goods_dispatched_from,
          e_invoice_applicable_from:
            form.e_invoice_application === 'Yes'
              ? form.e_invoice_applicable_from || undefined
              : undefined,
          e_invoice_bill_from_place:
            form.e_invoice_application === 'Yes'
              ? form.e_invoice_bill_from_place.trim() || undefined
              : undefined,
          composition_tax_rate:
            form.registration_type === 'Composition' ? parseFloat(form.composition_tax_rate) : null,
          composition_tax_calc_basis:
            form.registration_type === 'Composition' ? form.composition_tax_calc_basis : null,
          is_active: mode === 'create' ? 1 : (selectedReg?.is_active ?? 1),
        };

        if (mode === 'alter' && selectedReg) {
          data.gst_id = selectedReg.gst_id;
        }

        const result = await (mode === 'create'
          ? window.api.gstRegistration.create(data)
          : window.api.gstRegistration.update(data));

        if (result.success) {
          setSuccess(
            `GST Registration for "${form.gstin.toUpperCase()}" ${mode === 'create' ? 'created' : 'updated'} successfully.`,
          );

          if (mode === 'create') {
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
        return null;
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Unexpected error.');
        return null;
      } finally {
        setLoading(false);
      }
    },
    [form, companyId, mode, selectedReg, loadRegistrations],
  );

  const handleDelete = useCallback(async () => {
    if (mode !== 'alter' || !selectedReg) return;
    if (!window.confirm(`Delete GST Registration "${selectedReg.gstin}"?`)) return;

    setLoading(true);
    setError(null);
    try {
      const result = await window.api.gstRegistration.delete(selectedReg.gst_id!);
      if (result.success) {
        setSuccess('GST Registration deleted successfully.');
        await loadRegistrations();
        setTimeout(() => {
          setSuccess(null);
          setSelectedReg(null);
        }, 1500);
      } else {
        setError(result.error || 'Failed to delete GST registration.');
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unexpected error.');
    } finally {
      setLoading(false);
    }
  }, [selectedReg, mode, loadRegistrations]);

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
