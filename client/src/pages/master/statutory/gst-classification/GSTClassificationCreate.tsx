import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useCompany } from "@/context/CompanyContext";
import { PageTitleBar, RightActionPanel, FormRow } from "@/components/ui";

const inputCls = "w-full bg-transparent text-sm outline-none py-0.5 px-1.5 border border-transparent hover:border-zinc-200 focus:border-zinc-800 transition-colors bg-white/50 rounded ";
const selectCls = "bg-transparent text-sm outline-none px-1.5 py-0.5 border border-transparent hover:border-zinc-200 focus:border-zinc-800 transition-colors bg-white/50 rounded w-44 ";

interface FormData {
  name: string;
  nature_of_transaction: string;
  hsn_sac_code: string;
  gst_rate: string;
  cgst_rate: string;
  sgst_rate: string;
  igst_rate: string;
  cess_rate: string;
  valuation_type: "Based on Value" | "Based on Quantity";
  description: string;
}

const INITIAL_FORM: FormData = {
  name: "",
  nature_of_transaction: "Not Applicable",
  hsn_sac_code: "",
  gst_rate: "0",
  cgst_rate: "0",
  sgst_rate: "0",
  igst_rate: "0",
  cess_rate: "0",
  valuation_type: "Based on Value",
  description: "",
};

export default function GSTClassificationCreate() {
  const navigate = useNavigate();
  const { selectedCompany } = useCompany();
  const companyId = selectedCompany?.company_id;

  const [form, setForm] = useState<FormData>(INITIAL_FORM);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleGSTChange = (val: string) => {
    const num = Number(val) || 0;
    const half = num / 2;
    setForm((f) => ({
      ...f,
      gst_rate: val,
      cgst_rate: String(half),
      sgst_rate: String(half),
      igst_rate: val,
    }));
  };

  const setField = (key: keyof FormData) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const val = e.target.value;
    if (key === "gst_rate") {
      handleGSTChange(val);
    } else {
      setForm((f) => ({ ...f, [key]: val }));
    }
  };

  const validate = (): string | null => {
    if (!companyId) return "No company selected.";
    if (!form.name.trim()) return "Classification Name is required.";
    
    const gst = Number(form.gst_rate);
    const cgst = Number(form.cgst_rate);
    const sgst = Number(form.sgst_rate);
    const igst = Number(form.igst_rate);
    const cess = Number(form.cess_rate);

    if (isNaN(gst) || gst < 0 || gst > 100) return "GST Rate must be between 0 and 100.";
    if (isNaN(cgst) || cgst < 0 || cgst > 100) return "CGST Rate must be between 0 and 100.";
    if (isNaN(sgst) || sgst < 0 || sgst > 100) return "SGST Rate must be between 0 and 100.";
    if (isNaN(igst) || igst < 0 || igst > 100) return "IGST Rate must be between 0 and 100.";
    if (isNaN(cess) || cess < 0 || cess > 100) return "Cess Rate must be between 0 and 100.";
    
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
        name: form.name.trim(),
        nature_of_transaction: form.nature_of_transaction,
        hsn_sac_code: form.hsn_sac_code.trim() || undefined,
        gst_rate: Number(form.gst_rate) || 0,
        cgst_rate: Number(form.cgst_rate) || 0,
        sgst_rate: Number(form.sgst_rate) || 0,
        igst_rate: Number(form.igst_rate) || 0,
        cess_rate: Number(form.cess_rate) || 0,
        valuation_type: form.valuation_type,
        description: form.description.trim() || undefined,
        is_predefined: 0,
        is_active: 1,
      };

      const result = await window.api.gstClassification.create(data);
      if (result.success) {
        setSuccess(`GST Classification "${form.name}" created successfully.`);
        setForm(INITIAL_FORM);
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
        navigate("/master/alter/gst-classification");
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handleSubmit, navigate]);

  const actions = [
    { key: "Alt+A", label: "Accept", onClick: handleSubmit },
    { key: "Alt+C", label: "Alter Mode", onClick: () => navigate("/master/alter/gst-classification") },
    { key: "Esc", label: "Quit", onClick: () => navigate("/master/create") },
  ];

  const NATURES = [
    "Not Applicable",
    "Sales Taxable",
    "Sales Exempt",
    "Sales Nil Rated",
    "Purchase Taxable",
    "Purchase Exempt",
    "Purchase Nil Rated",
    "Interstate Sales Taxable",
    "Interstate Sales Exempt",
    "Interstate Purchase Taxable",
    "Interstate Purchase Exempt",
    "Exports Taxable",
    "Exports Exempt",
    "Imports Taxable",
    "Imports Exempt"
  ];

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
        <div className="flex-1 overflow-y-auto p-3 space-y-4 max-w-2xl bg-white border-r border-zinc-100 font-sans">
          
          <div className="space-y-1.5">
            <div className="text-[10px] uppercase font-bold text-zinc-400 select-none">Classification Identity</div>
            
            <FormRow label="Name" required labelWidth="w-64" className="flex items-center min-h-[26px]">
              <input
                autoFocus
                className={inputCls}
                placeholder="e.g. Standard GST 18%"
                value={form.name}
                onChange={setField("name")}
              />
            </FormRow>

            <FormRow label="HSN / SAC Code" labelWidth="w-64" className="flex items-center min-h-[26px]">
              <input
                className={inputCls}
                placeholder="e.g. 9984 or 8471"
                value={form.hsn_sac_code}
                onChange={setField("hsn_sac_code")}
              />
            </FormRow>

            <FormRow label="Nature of Transaction" labelWidth="w-64" className="flex items-center min-h-[26px]">
              <select className={selectCls} value={form.nature_of_transaction} onChange={setField("nature_of_transaction")}>
                {NATURES.map((n) => (
                  <option key={n}>{n}</option>
                ))}
              </select>
            </FormRow>

            <FormRow label="Valuation Type" labelWidth="w-64" className="flex items-center min-h-[26px]">
              <select className={selectCls} value={form.valuation_type} onChange={setField("valuation_type")}>
                <option>Based on Value</option>
                <option>Based on Quantity</option>
              </select>
            </FormRow>

            <FormRow label="Description" labelWidth="w-64" className="flex items-start">
              <textarea
                rows={2}
                className="flex-1 bg-transparent text-sm outline-none px-1.5 py-0.5 border border-zinc-200 focus:border-zinc-800 transition-colors bg-white rounded w-full text-xs"
                placeholder="Classification notes or descriptions..."
                value={form.description}
                onChange={setField("description")}
              />
            </FormRow>
          </div>

          <div className="space-y-1.5 border-t border-zinc-100 pt-3">
            <div className="text-[10px] uppercase font-bold text-zinc-400 select-none">GST Tax Rates (%)</div>

            <FormRow label="Integrated Tax (IGST) Rate" required labelWidth="w-64" className="flex items-center min-h-[26px]">
              <div className="flex items-center gap-2 w-full">
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  className={`${inputCls} w-24`}
                  value={form.gst_rate}
                  onChange={setField("gst_rate")}
                />
                <span className="text-xs text-zinc-400">%</span>
                <span className="text-[10px] text-zinc-400 italic font-sans pl-2">(Auto-calculates CGST, SGST, IGST)</span>
              </div>
            </FormRow>

            <FormRow label="Central Tax (CGST) Rate" labelWidth="w-64" className="flex items-center min-h-[26px]">
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  className={`${inputCls} w-24`}
                  value={form.cgst_rate}
                  onChange={setField("cgst_rate")}
                />
                <span className="text-xs text-zinc-400">%</span>
              </div>
            </FormRow>

            <FormRow label="State/UT Tax (SGST) Rate" labelWidth="w-64" className="flex items-center min-h-[26px]">
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  className={`${inputCls} w-24`}
                  value={form.sgst_rate}
                  onChange={setField("sgst_rate")}
                />
                <span className="text-xs text-zinc-400">%</span>
              </div>
            </FormRow>

            <FormRow label="Cess Rate" labelWidth="w-64" className="flex items-center min-h-[26px]">
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  className={`${inputCls} w-24`}
                  value={form.cess_rate}
                  onChange={setField("cess_rate")}
                />
                <span className="text-xs text-zinc-400">%</span>
              </div>
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
