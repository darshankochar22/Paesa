import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useCompany } from "@/context/CompanyContext";
import { PageTitleBar, RightActionPanel, FormRow } from "@/components/ui";
import { INDIAN_STATES } from "@/constants/states";

const inputCls = "w-full bg-transparent text-sm outline-none py-0.5 px-1.5 border border-transparent hover:border-zinc-200 focus:border-zinc-800 transition-colors bg-white/50 rounded ";
const selectCls = "bg-transparent text-sm outline-none px-1.5 py-0.5 border border-transparent hover:border-zinc-200 focus:border-zinc-800 transition-colors bg-white/50 rounded w-44 ";

interface FormData {
  registration_type: "Regular" | "Composition";
  registration_status: "Active" | "Suspended" | "Inactive";
  assessee_of_other_territory: "No" | "Yes";
  periodicity_of_gstr1: "Monthly" | "Quarterly";
  gstin: string;
  gst_username: string;
  mode_of_filing: "Online" | "Offline";
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
}

const INITIAL_FORM: FormData = {
  registration_type: "Regular",
  registration_status: "Active",
  assessee_of_other_territory: "No",
  periodicity_of_gstr1: "Monthly",
  gstin: "",
  gst_username: "",
  mode_of_filing: "Online",
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
};

export default function GSTRegistrationCreate() {
  const navigate = useNavigate();
  const { selectedCompany } = useCompany();
  const companyId = selectedCompany?.company_id;

  const [form, setForm] = useState<FormData>(INITIAL_FORM);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const setField = (key: keyof FormData) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const validate = (): string | null => {
    if (!companyId) return "No company selected.";
    if (!form.gstin.trim()) return "GSTIN is required.";
    // Basic validation of Indian GSTIN format (15 characters)
    const gstinPattern = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
    const upperGSTIN = form.gstin.trim().toUpperCase();
    if (upperGSTIN.length !== 15) {
      return "GSTIN must be exactly 15 characters long.";
    }
    if (!gstinPattern.test(upperGSTIN)) {
      return "Invalid GSTIN format. Expected e.g. 27AAAAA1111A1Z1";
    }
    if (!form.state_id) return "State is required.";
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
      const data = {
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
        is_active: 1,
      };

      const result = await window.api.gstRegistration.create(data);
      if (result.success) {
        setSuccess(`GST Registration for "${form.gstin.toUpperCase()}" created successfully.`);
        setForm({ ...INITIAL_FORM, state_id: form.state_id });
        setTimeout(() => setSuccess(null), 2000);
      } else {
        setError(result.error || "Failed to create GST registration.");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unexpected error.");
    } finally {
      setLoading(false);
    }
  }, [form, companyId]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        navigate("/master/create");
      }
      if (e.altKey && e.key.toLowerCase() === "a") {
        e.preventDefault();
        handleSubmit();
      }
      if (e.ctrlKey && e.key.toLowerCase() === "a") {
        e.preventDefault();
        handleSubmit();
      }
      if (e.altKey && e.key.toLowerCase() === "c") {
        e.preventDefault();
        navigate("/master/alter/gst-registration");
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handleSubmit, navigate]);

  const actions = [
    { key: "Alt+A", label: "Accept", onClick: handleSubmit },
    { key: "Alt+C", label: "Alter Mode", onClick: () => navigate("/master/alter/gst-registration") },
    { key: "Esc", label: "Quit", onClick: () => navigate("/master/create") },
  ];

  return (
    <div className="flex flex-col h-full relative overflow-hidden bg-white select-none">
      <PageTitleBar title="Create GST Registration" subtitle={selectedCompany?.name} />

      {error && (
        <div className="px-3 py-1.5 border-b border-red-200 bg-red-50 text-red-700 text-xs flex justify-between items-center shrink-0">
          <span>• {error}</span>
          <button onClick={() => setError(null)} className="text-red-500 hover:text-red-700 text-xs font-bold font-sans">&times;</button>
        </div>
      )}
      {success && (
        <div className="px-3 py-1.5 border-b border-green-200 bg-green-50 text-green-700 text-xs flex justify-between items-center shrink-0">
          <span>• {success}</span>
          <button onClick={() => setSuccess(null)} className="text-green-500 hover:text-green-700 text-xs font-bold font-sans">&times;</button>
        </div>
      )}

      <div className="flex-1 flex min-h-0">
        <div className="flex-1 overflow-y-auto p-3 space-y-4 max-w-2xl bg-white border-r border-zinc-100 font-sans">
          
          <div className="space-y-1.5">
            <div className="text-[10px] uppercase font-bold text-zinc-400 select-none">Registration Details</div>
            
            <FormRow label="GSTIN / UIN" required labelWidth="w-64" className="flex items-center min-h-[26px]">
              <input
                autoFocus
                className={inputCls}
                placeholder="e.g. 27AAAAA1111A1Z1"
                value={form.gstin}
                onChange={setField("gstin")}
                maxLength={15}
              />
            </FormRow>

            <FormRow label="State Name" required labelWidth="w-64" className="flex items-center min-h-[26px]">
              <select className={selectCls} value={form.state_id} onChange={setField("state_id")}>
                {INDIAN_STATES.map((state) => (
                  <option key={state} value={state}>
                    {state}
                  </option>
                ))}
              </select>
            </FormRow>

            <FormRow label="Registration Type" required labelWidth="w-64" className="flex items-center min-h-[26px]">
              <select className={selectCls} value={form.registration_type} onChange={setField("registration_type")}>
                <option>Regular</option>
                <option>Composition</option>
              </select>
            </FormRow>

            <FormRow label="Assessee of Other Territory" labelWidth="w-64" className="flex items-center min-h-[26px]">
              <select className={selectCls} value={form.assessee_of_other_territory} onChange={setField("assessee_of_other_territory")}>
                <option>No</option>
                <option>Yes</option>
              </select>
            </FormRow>

            <FormRow label="Periodicity of GSTR1" labelWidth="w-64" className="flex items-center min-h-[26px]">
              <select className={selectCls} value={form.periodicity_of_gstr1} onChange={setField("periodicity_of_gstr1")}>
                <option>Monthly</option>
                <option>Quarterly</option>
              </select>
            </FormRow>

            <FormRow label="GST Registration Status" labelWidth="w-64" className="flex items-center min-h-[26px]">
              <select className={selectCls} value={form.registration_status} onChange={setField("registration_status")}>
                <option>Active</option>
                <option>Suspended</option>
                <option>Inactive</option>
              </select>
            </FormRow>
          </div>

          <div className="space-y-1.5 border-t border-zinc-100 pt-3">
            <div className="text-[10px] uppercase font-bold text-zinc-400 select-none">Legal & Filing Identifiers</div>
            
            <FormRow label="Legal Name of Business" labelWidth="w-64" className="flex items-center min-h-[26px]">
              <input className={inputCls} placeholder="As per PAN card" value={form.legal_name} onChange={setField("legal_name")} />
            </FormRow>

            <FormRow label="Trade Name of Business" labelWidth="w-64" className="flex items-center min-h-[26px]">
              <input className={inputCls} placeholder="Brand or DBA name" value={form.trade_name} onChange={setField("trade_name")} />
            </FormRow>

            <FormRow label="GST Portal Username" labelWidth="w-64" className="flex items-center min-h-[26px]">
              <input className={inputCls} placeholder="Optional portal user ID" value={form.gst_username} onChange={setField("gst_username")} />
            </FormRow>

            <FormRow label="Filing Mode" labelWidth="w-64" className="flex items-center min-h-[26px]">
              <select className={selectCls} value={form.mode_of_filing} onChange={setField("mode_of_filing")}>
                <option>Online</option>
                <option>Offline</option>
              </select>
            </FormRow>
          </div>

          <div className="space-y-1.5 border-t border-zinc-100 pt-3">
            <div className="text-[10px] uppercase font-bold text-zinc-400 select-none">Dates & E-Billing Details</div>

            <FormRow label="Registration Date" labelWidth="w-64" className="flex items-center min-h-[26px]">
              <input type="date" className={inputCls} value={form.registration_date} onChange={setField("registration_date")} />
            </FormRow>

            <FormRow label="Effective From" labelWidth="w-64" className="flex items-center min-h-[26px]">
              <input type="date" className={inputCls} value={form.effective_from} onChange={setField("effective_from")} />
            </FormRow>

            <FormRow label="E-Way Bill Applicable" labelWidth="w-64" className="flex items-center min-h-[26px]">
              <select className={selectCls} value={form.e_way_bill_applicable} onChange={setField("e_way_bill_applicable")}>
                <option>No</option>
                <option>Yes</option>
              </select>
            </FormRow>

            {form.e_way_bill_applicable === "Yes" && (
              <FormRow label="E-Way Bill Applicable From" labelWidth="w-64" className="flex items-center min-h-[26px]">
                <input type="date" className={inputCls} value={form.e_way_bill_applicable_from} onChange={setField("e_way_bill_applicable_from")} />
              </FormRow>
            )}

            <FormRow label="E-Invoice Applicable" labelWidth="w-64" className="flex items-center min-h-[26px]">
              <select className={selectCls} value={form.e_invoice_application} onChange={setField("e_invoice_application")}>
                <option>No</option>
                <option>Yes</option>
              </select>
            </FormRow>

            {form.e_invoice_application === "Yes" && (
              <FormRow label="E-Invoice Billing Details" labelWidth="w-64" className="flex items-start">
                <textarea
                  rows={2}
                  className="flex-1 bg-transparent text-sm outline-none px-1.5 py-0.5 border border-zinc-200 focus:border-zinc-800 transition-colors bg-white rounded w-full text-xs"
                  placeholder="Billing threshold, office address details..."
                  value={form.e_invoice_details}
                  onChange={setField("e_invoice_details")}
                />
              </FormRow>
            )}

            <FormRow label="Applicable for Intrastat" labelWidth="w-64" className="flex items-center min-h-[26px]">
              <select className={selectCls} value={form.applicable_for_intrastat} onChange={setField("applicable_for_intrastat")}>
                <option>No</option>
                <option>Yes</option>
              </select>
            </FormRow>
          </div>
        </div>

        <RightActionPanel actions={actions} />
      </div>

      <div className="px-3 py-3 border-t border-zinc-200 flex justify-end bg-zinc-50 shrink-0">
        <div className="flex gap-3">
          <button
            onClick={() => navigate("/master/create")}
            className="text-xs px-4 py-1.5 rounded border border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50 shadow-sm transition-colors font-medium font-sans"
          >
            Quit
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="text-xs px-5 py-1.5 rounded bg-black text-white hover:bg-zinc-800 disabled:opacity-50 shadow-sm transition-colors font-medium font-sans"
          >
            {loading ? "Creating..." : "Accept"}
          </button>
        </div>
      </div>
    </div>
  );
}
