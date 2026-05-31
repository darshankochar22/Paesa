import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useCompany } from "@/context/CompanyContext";
import { PageTitleBar, RightActionPanel, FormRow } from "@/components/ui";
import { loadFormState, saveFormState, clearFormState } from "@/utils/formPersistence";

const inputCls = "w-full bg-transparent text-sm outline-none py-0.5 px-1.5 border border-transparent hover:border-zinc-200 focus:border-zinc-800 transition-colors bg-white/50 rounded ";
const selectCls = "bg-transparent text-sm outline-none px-1.5 py-0.5 border border-transparent hover:border-zinc-200 focus:border-zinc-800 transition-colors bg-white/50 rounded w-44 ";

interface FormData {
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

const INITIAL_FORM: FormData = {
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

const NATURES = [
  "Not Applicable",
  "Sales Taxable", "Sales Exempt", "Sales Nil Rated",
  "Purchase Taxable", "Purchase Exempt", "Purchase Nil Rated",
  "Interstate Sales Taxable", "Interstate Sales Exempt",
  "Interstate Purchase Taxable", "Interstate Purchase Exempt",
  "Exports Taxable", "Exports Exempt",
  "Imports Taxable", "Imports Exempt",
];

export default function GSTClassificationCreate() {
  const navigate = useNavigate();
  const { selectedCompany } = useCompany();
  const companyId = selectedCompany?.company_id;
  const persistKey = companyId ? `gstClassificationCreate_${companyId}` : null;
  const hasRestored = useRef(false);

  const [form, setForm] = useState<FormData>(
    () => loadFormState<any>(persistKey ?? "")?.form ?? INITIAL_FORM
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (!persistKey) return;
    if (!hasRestored.current) { hasRestored.current = true; return; }
    saveFormState(persistKey, { form });
  }, [persistKey, form]);

  const handleIGSTChange = (val: string) => {
    const num = Number(val) || 0;
    const half = String(num / 2);
    setForm((f) => ({ ...f, igst_rate: val, cgst_rate: half, sgst_rate: half }));
  };

  const setField = (key: keyof FormData) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const val = e.target.value;
    if (key === "igst_rate") handleIGSTChange(val);
    else setForm((f) => ({ ...f, [key]: val }));
  };

  const validate = (): string | null => {
    if (!companyId) return "No company selected.";
    if (!form.name.trim()) return "Classification Name is required.";
    for (const [label, key] of [
      ["IGST", "igst_rate"], ["CGST", "cgst_rate"],
      ["SGST", "sgst_rate"], ["Cess", "cess_rate"],
    ] as const) {
      const v = Number((form as any)[key]);
      if (isNaN(v) || v < 0 || v > 100) return `${label} Rate must be between 0 and 100.`;
    }
    return null;
  };

  const handleSubmit = useCallback(async () => {
    const validationError = validate();
    if (validationError) { setError(validationError); return; }
    setLoading(true);
    setError(null);
    try {
      const data = {
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
        is_predefined: 0,
        is_active: 1,
      };
      const result = await window.api.gstClassification.create(data);
      if (result.success) {
        setSuccess(`GST Classification "${form.name}" created successfully.`);
        setForm(INITIAL_FORM);
        if (persistKey) clearFormState(persistKey);
        hasRestored.current = false;
        setTimeout(() => setSuccess(null), 2000);
      } else {
        setError(result.error || "Failed to create GST classification.");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unexpected error.");
    } finally {
      setLoading(false);
    }
  }, [form, companyId]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") { e.preventDefault(); navigate("/master/create"); }
      if ((e.altKey || e.ctrlKey) && e.key.toLowerCase() === "a") { e.preventDefault(); handleSubmit(); }
      if (e.altKey && e.key.toLowerCase() === "c") { e.preventDefault(); navigate("/master/alter/gst-classification"); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handleSubmit, navigate]);

  const actions = [
    { key: "Alt+A", label: "Accept", onClick: handleSubmit },
    { key: "Alt+C", label: "Alter Mode", onClick: () => navigate("/master/alter/gst-classification") },
    { key: "Esc", label: "Quit", onClick: () => navigate("/master/create") },
  ];

  const smallSelectCls = "bg-transparent text-sm outline-none px-1.5 py-0.5 border border-transparent hover:border-zinc-200 focus:border-zinc-800 transition-colors bg-white/50 rounded w-36 ";

  return (
    <div className="flex flex-col h-full relative overflow-hidden bg-white select-none">
      <PageTitleBar title="Create GST Classification" subtitle={selectedCompany?.name} />

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

        {/* Form — no max-w cap, takes remaining space */}
        <div className="flex-1 overflow-y-auto p-3 space-y-4 bg-white border-r border-zinc-100 font-sans">

          {/* HSN/SAC Details */}
          <div className="space-y-1.5">
            <div className="text-[10px] uppercase font-bold text-zinc-400 select-none">HSN / SAC Details</div>

            <FormRow label="Name" required labelWidth="w-64" className="flex items-center min-h-[26px]">
              <input
                autoFocus
                className={inputCls}
                placeholder="e.g. GST 18%"
                value={form.name}
                onChange={setField("name")}
              />
            </FormRow>

            <FormRow label="Description" labelWidth="w-64" className="flex items-start">
              <textarea
                rows={2}
                className="flex-1 bg-transparent text-sm outline-none px-1.5 py-0.5 border border-zinc-200 focus:border-zinc-800 transition-colors bg-white rounded w-full text-xs"
                placeholder="Optional notes..."
                value={form.description}
                onChange={setField("description")}
              />
            </FormRow>

            <FormRow label="HSN / SAC" labelWidth="w-64" className="flex items-center min-h-[26px]">
              <input
                className={inputCls}
                placeholder="e.g. 9984 or 8471"
                value={form.hsn_sac_code}
                onChange={setField("hsn_sac_code")}
              />
            </FormRow>

            <FormRow label="Is non-GST goods" labelWidth="w-64" className="flex items-center min-h-[26px]">
              <select className={selectCls} value={form.is_non_gst_goods} onChange={setField("is_non_gst_goods")}>
                <option>No</option>
                <option>Yes</option>
              </select>
            </FormRow>

            <FormRow label="Nature of Transaction" labelWidth="w-64" className="flex items-center min-h-[26px]">
              <select className={selectCls} value={form.nature_of_transaction} onChange={setField("nature_of_transaction")}>
                {NATURES.map((n) => <option key={n}>{n}</option>)}
              </select>
            </FormRow>
          </div>

          {/* Tax Details */}
          <div className="space-y-1.5 border-t border-zinc-100 pt-3">
            <div className="text-[10px] uppercase font-bold text-zinc-400 select-none">Tax Details</div>

            <FormRow label="Taxability" labelWidth="w-64" className="flex items-center min-h-[26px]">
              <select className={selectCls} value={form.taxability} onChange={setField("taxability")}>
                <option>Unknown</option>
                <option>Taxable</option>
                <option>Exempt</option>
                <option>Nil Rated</option>
              </select>
            </FormRow>

            <FormRow label="Is reverse charge applicable" labelWidth="w-64" className="flex items-center min-h-[26px]">
              <select className={selectCls} value={form.is_reverse_charge} onChange={setField("is_reverse_charge")}>
                <option>No</option>
                <option>Yes</option>
              </select>
            </FormRow>

            <FormRow label="Is ineligible for input credit" labelWidth="w-64" className="flex items-center min-h-[26px]">
              <select className={selectCls} value={form.is_ineligible_for_itc} onChange={setField("is_ineligible_for_itc")}>
                <option>No</option>
                <option>Yes</option>
              </select>
            </FormRow>

            {/* Tax Type Table */}
            <div className="mt-2">
              <div className="grid grid-cols-3 text-[10px] uppercase font-bold text-zinc-400 px-1.5 pb-1 border-b border-zinc-100">
                <span>Tax Type</span>
                <span>Valuation Type</span>
                <span>Rate</span>
              </div>

              {(
                [
                  { label: "Integrated Tax", rateKey: "igst_rate", valKey: "igst_valuation_type" },
                  { label: "Central Tax",    rateKey: "cgst_rate", valKey: "cgst_valuation_type" },
                  { label: "State Tax",      rateKey: "sgst_rate", valKey: "sgst_valuation_type" },
                  { label: "Cess",           rateKey: "cess_rate", valKey: "cess_valuation_type" },
                ] as const
              ).map(({ label, rateKey, valKey }) => (
                <div key={label} className="grid grid-cols-3 items-center min-h-[26px] border-b border-zinc-50 hover:bg-zinc-50/50">
                  <span className="text-xs text-zinc-600 px-1.5">{label}</span>
                  <select
                    className={smallSelectCls}
                    value={form[valKey]}
                    onChange={setField(valKey)}
                  >
                    <option>Based on Value</option>
                    <option>Based on Quantity</option>
                  </select>
                  <div className="flex items-center gap-1 px-1.5">
                    <input
                      type="number"
                      min="0" max="100" step="0.01"
                      className="w-16 bg-transparent text-sm outline-none py-0.5 px-1.5 border border-transparent hover:border-zinc-200 focus:border-zinc-800 transition-colors bg-white/50 rounded"
                      value={form[rateKey]}
                      onChange={setField(rateKey)}
                    />
                    <span className="text-xs text-zinc-400">%</span>
                  </div>
                </div>
              ))}

              <div className="text-[10px] text-zinc-400 italic px-1.5 pt-1 font-sans">
                Editing Integrated Tax rate auto-fills Central & State Tax as half each.
              </div>
            </div>
          </div>

        </div>

        {/* Right Panel — full height, no shrink */}
        <RightActionPanel actions={actions} className="h-full" />
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