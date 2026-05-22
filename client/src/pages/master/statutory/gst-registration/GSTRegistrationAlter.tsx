import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useCompany } from "@/context/CompanyContext";
import { PageTitleBar, RightActionPanel, SearchInput, DataTable, FormRow } from "@/components/ui";
import { INDIAN_STATES } from "@/constants/states";
import type { GSTRegistrationType } from "@/types/entities/GSTRegistration";

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

function SelectionPanel({
  registrations,
  onSelect,
  onCancel,
  onCreate,
}: {
  registrations: GSTRegistrationType[];
  onSelect: (r: GSTRegistrationType) => void;
  onCancel: () => void;
  onCreate: () => void;
}) {
  const [search, setSearch] = useState("");

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onCancel();
      }
      if (e.altKey && e.key.toLowerCase() === "c") {
        e.preventDefault();
        onCreate();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onCancel, onCreate]);

  const filtered = registrations.filter((r) =>
    (r.gstin && r.gstin.toLowerCase().includes(search.toLowerCase())) ||
    (r.state_id && r.state_id.toLowerCase().includes(search.toLowerCase())) ||
    (r.trade_name && r.trade_name.toLowerCase().includes(search.toLowerCase()))
  );

  const columns = [
    {
      key: "gstin",
      label: "GSTIN",
      span: "col-span-4",
      render: (r: GSTRegistrationType) => (
        <span className="font-bold text-zinc-950 text-sm tracking-wider uppercase">
          {r.gstin}
        </span>
      ),
    },
    {
      key: "state_id",
      label: "State",
      span: "col-span-3",
      render: (r: GSTRegistrationType) => (
        <span className="text-zinc-500 font-semibold uppercase">{r.state_id}</span>
      ),
    },
    {
      key: "trade_name",
      label: "Trade/Legal Name",
      span: "col-span-3",
      render: (r: GSTRegistrationType) => (
        <span className="text-zinc-600 font-medium truncate block">
          {r.trade_name || r.legal_name || "—"}
        </span>
      ),
    },
    {
      key: "registration_type",
      label: "Type",
      span: "col-span-2",
      render: (r: GSTRegistrationType) => (
        <span className="text-zinc-500 text-[10px]">{r.registration_type}</span>
      ),
    },
  ];

  const selectionActions = [
    { key: "Alt+C", label: "Create GST Reg", onClick: onCreate },
    { key: "Esc", label: "Quit", onClick: onCancel },
  ];

  return (
    <div className="flex-1 flex flex-col h-full bg-white select-none font-sans">
      <PageTitleBar title="Alter GST Registration" subtitle="Select GST Registration to Alter" />

      <div className="p-3 bg-zinc-50 border-b border-zinc-200 shrink-0">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search GSTIN by code, state or business name…"
          autoFocus
        />
      </div>

      <div className="flex-1 flex min-h-0">
        <div className="flex-1 flex flex-col bg-white border-r border-zinc-100">
          <DataTable
            columns={columns}
            rows={filtered}
            rowKey={(r: GSTRegistrationType) => String(r.gst_id)}
            onRowClick={onSelect}
            emptyMessage="No GST registrations found."
          />
        </div>
        <RightActionPanel actions={selectionActions} />
      </div>

      <div className="border-t border-zinc-200 p-3 flex justify-end bg-zinc-50">
        <button
          onClick={onCancel}
          className="text-xs px-4 py-1.5 rounded border border-zinc-200 bg-white shadow-sm text-zinc-600 hover:bg-zinc-50 transition-colors font-medium font-sans"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

export default function GSTRegistrationAlter() {
  const navigate = useNavigate();
  const { selectedCompany } = useCompany();
  const companyId = selectedCompany?.company_id;

  const [registrations, setRegistrations] = useState<GSTRegistrationType[]>([]);
  const [selectedReg, setSelectedReg] = useState<GSTRegistrationType | null>(null);
  const [form, setForm] = useState<FormData | null>(null);
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
    setSelectedReg(r);
    setForm({
      registration_type: (r.registration_type as any) ?? "Regular",
      registration_status: (r.registration_status as any) ?? "Active",
      assessee_of_other_territory: r.assessee_of_other_territory === 1 ? "Yes" : "No",
      periodicity_of_gstr1: (r.periodicity_of_gstr1 as any) ?? "Monthly",
      gstin: r.gstin ?? "",
      gst_username: r.gst_username ?? "",
      mode_of_filing: (r.mode_of_filing as any) ?? "Online",
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
    });
    setError(null);
    setSuccess(null);
  };

  const setField = (key: keyof FormData) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => setForm((f) => (f ? { ...f, [key]: e.target.value } : f));

  const validate = (): string | null => {
    if (!form?.gstin.trim()) return "GSTIN is required.";
    const gstinPattern = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
    const upperGSTIN = form.gstin.trim().toUpperCase();
    if (upperGSTIN.length !== 15) {
      return "GSTIN must be exactly 15 characters long.";
    }
    if (!gstinPattern.test(upperGSTIN)) {
      return "Invalid GSTIN format. Expected e.g. 27AAAAA1111A1Z1";
    }
    if (!companyId) return "No company selected.";
    return null;
  };

  const handleSubmit = useCallback(async () => {
    if (!form || !selectedReg) return;

    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const result = await window.api.gstRegistration.update({
        gst_id: selectedReg.gst_id,
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
        is_active: selectedReg.is_active ?? 1,
      });

      if (result.success) {
        setSuccess(`GST Registration "${form.gstin.toUpperCase()}" updated successfully.`);
        await loadRegistrations();
        setTimeout(() => {
          setSuccess(null);
          setSelectedReg(null);
          setForm(null);
        }, 1500);
      } else {
        setError(result.error || "Failed to update GST registration.");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unexpected error.");
    } finally {
      setLoading(false);
    }
  }, [form, selectedReg, companyId, loadRegistrations]);

  const handleDelete = useCallback(async () => {
    if (!selectedReg) return;

    if (!window.confirm(`Delete GST Registration "${selectedReg.gstin}"?`)) return;

    setLoading(true);
    setError(null);
    try {
      const result = await window.api.gstRegistration.delete(selectedReg.gst_id!);
      if (result.success) {
        setSuccess("GST Registration deleted successfully.");
        await loadRegistrations();
        setTimeout(() => {
          setSuccess(null);
          setSelectedReg(null);
          setForm(null);
        }, 1500);
      } else {
        setError(result.error || "Failed to delete GST registration.");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unexpected error.");
    } finally {
      setLoading(false);
    }
  }, [selectedReg, loadRegistrations]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        if (selectedReg) {
          setSelectedReg(null);
          setForm(null);
        } else {
          navigate("/master/alter");
        }
      }
      if (e.altKey && e.key.toLowerCase() === "a") {
        e.preventDefault();
        handleSubmit();
      }
      if (e.ctrlKey && e.key.toLowerCase() === "a") {
        e.preventDefault();
        handleSubmit();
      }
      if (e.altKey && e.key.toLowerCase() === "d") {
        e.preventDefault();
        handleDelete();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handleSubmit, handleDelete, navigate, selectedReg]);

  if (!selectedReg || !form) {
    return (
      <SelectionPanel
        registrations={registrations}
        onSelect={handleSelectReg}
        onCancel={() => navigate("/master/alter")}
        onCreate={() => navigate("/master/create/gst-registration")}
      />
    );
  }

  const alterActions = [
    { key: "Alt+A", label: "Accept", onClick: handleSubmit },
    { key: "Alt+D", label: "Delete", onClick: handleDelete },
    { key: "Esc", label: "Back", onClick: () => { setSelectedReg(null); setForm(null); } },
  ];

  return (
    <div className="flex flex-col h-full relative overflow-hidden bg-white select-none font-sans">
      <PageTitleBar
        title={`GST Registration Alteration: ${selectedReg.gstin}`}
        subtitle={selectedCompany?.name}
      />

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

        <RightActionPanel actions={alterActions} />
      </div>

      <div className="px-3 py-3 border-t border-zinc-200 flex justify-between items-center bg-zinc-50 shrink-0">
        <button
          onClick={handleDelete}
          disabled={loading}
          className="text-xs px-4 py-1.5 rounded border border-red-200 text-red-500 hover:bg-red-50 hover:border-red-300 disabled:opacity-50 transition-colors font-medium font-sans shadow-sm"
        >
          Delete
        </button>
        <div className="flex gap-3">
          <button
            onClick={() => {
              setSelectedReg(null);
              setForm(null);
            }}
            className="text-xs px-4 py-1.5 rounded border border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50 shadow-sm transition-colors font-medium font-sans"
          >
            Back
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="text-xs px-5 py-1.5 rounded bg-black text-white hover:bg-zinc-800 disabled:opacity-50 shadow-sm transition-colors font-medium font-sans"
          >
            {loading ? "Saving..." : "Accept"}
          </button>
        </div>
      </div>
    </div>
  );
}
