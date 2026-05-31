import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useCompany } from "@/context/CompanyContext";
import { PageTitleBar, RightActionPanel, SearchInput, DataTable, FormRow } from "@/components/ui";
import type { GSTClassificationType } from "@/types/entities/GSTClassification";

const inputCls = "w-full bg-transparent text-sm outline-none py-0.5 px-1.5 border border-transparent hover:border-zinc-200 focus:border-zinc-800 transition-colors bg-white/50 rounded ";
const selectCls = "bg-transparent text-sm outline-none px-1.5 py-0.5 border border-transparent hover:border-zinc-200 focus:border-zinc-800 transition-colors bg-white/50 rounded w-44 ";
const smallSelectCls = "bg-transparent text-sm outline-none px-1.5 py-0.5 border border-transparent hover:border-zinc-200 focus:border-zinc-800 transition-colors bg-white/50 rounded w-36 ";

const NATURES = [
  "Not Applicable",
  "Sales Taxable", "Sales Exempt", "Sales Nil Rated",
  "Purchase Taxable", "Purchase Exempt", "Purchase Nil Rated",
  "Interstate Sales Taxable", "Interstate Sales Exempt",
  "Interstate Purchase Taxable", "Interstate Purchase Exempt",
  "Exports Taxable", "Exports Exempt",
  "Imports Taxable", "Imports Exempt",
];

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

function SelectionPanel({
  classifications,
  onSelect,
  onCancel,
  onCreate,
}: {
  classifications: GSTClassificationType[];
  onSelect: (c: GSTClassificationType) => void;
  onCancel: () => void;
  onCreate: () => void;
}) {
  const [search, setSearch] = useState("");

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") { e.preventDefault(); onCancel(); }
      if (e.altKey && e.key.toLowerCase() === "c") { e.preventDefault(); onCreate(); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onCancel, onCreate]);

  const filtered = classifications.filter((c) =>
    (c.name && c.name.toLowerCase().includes(search.toLowerCase())) ||
    (c.hsn_sac_code && c.hsn_sac_code.toLowerCase().includes(search.toLowerCase())) ||
    (c.nature_of_transaction && c.nature_of_transaction.toLowerCase().includes(search.toLowerCase()))
  );

  const columns = [
    {
      key: "name",
      label: "Classification Name",
      span: "col-span-5",
      render: (r: GSTClassificationType) => (
        <span className="font-bold text-zinc-950 uppercase flex items-center gap-1.5">
          {r.name}
          {r.is_predefined === 1 && (
            <span className="text-[9px] font-bold px-1.5 py-0.2 bg-zinc-100 text-zinc-500 rounded tracking-wider border border-zinc-200">
              PREDEFINED
            </span>
          )}
        </span>
      ),
    },
    {
      key: "hsn_sac_code",
      label: "HSN/SAC",
      span: "col-span-2",
      render: (r: GSTClassificationType) => (
        <span className="text-zinc-500 font-semibold uppercase">{r.hsn_sac_code || "—"}</span>
      ),
    },
    {
      key: "igst_rate",
      label: "Rate %",
      span: "col-span-2",
      align: "right" as const,
      render: (r: GSTClassificationType) => (
        <span className="text-zinc-700 font-bold">{r.igst_rate ?? 0}%</span>
      ),
    },
    {
      key: "nature_of_transaction",
      label: "Nature",
      span: "col-span-3",
      render: (r: GSTClassificationType) => (
        <span className="text-zinc-500 truncate block">{r.nature_of_transaction || "—"}</span>
      ),
    },
  ];

  const selectionActions = [
    { key: "Alt+C", label: "Create GST Class", onClick: onCreate },
    { key: "Esc", label: "Quit", onClick: onCancel },
  ];

  return (
    <div className="flex-1 flex flex-col h-full bg-white select-none font-sans">
      <PageTitleBar title="Alter GST Classification" subtitle="Select GST Classification to Alter" />
      <div className="p-3 bg-zinc-50 border-b border-zinc-200 shrink-0">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search classifications by name, HSN or transaction nature…"
          autoFocus
        />
      </div>
      <div className="flex-1 flex min-h-0">
        <div className="flex-1 flex flex-col bg-white border-r border-zinc-100">
          <DataTable
            columns={columns}
            rows={filtered}
            rowKey={(r: GSTClassificationType) => String(r.gc_id)}
            onRowClick={onSelect}
            emptyMessage="No GST classifications found."
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

export default function GSTClassificationAlter() {
  const navigate = useNavigate();
  const { selectedCompany } = useCompany();
  const companyId = selectedCompany?.company_id;

  const [classifications, setClassifications] = useState<GSTClassificationType[]>([]);
  const [selectedClass, setSelectedClass] = useState<GSTClassificationType | null>(null);
  const [form, setForm] = useState<FormData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const loadClassifications = useCallback(async () => {
    if (!companyId) return;
    const result = await window.api.gstClassification.getAll(companyId);
    if (result.success) setClassifications(result.gstClassifications ?? []);
  }, [companyId]);

  useEffect(() => { loadClassifications(); }, [loadClassifications]);

  const handleSelectClass = (c: GSTClassificationType) => {
    setSelectedClass(c);
    setForm({
      name: c.name ?? "",
      description: c.description ?? "",
      hsn_sac_code: c.hsn_sac_code ?? "",
      is_non_gst_goods: c.is_non_gst_goods === 1 ? "Yes" : "No",
      nature_of_transaction: c.nature_of_transaction ?? "Not Applicable",
      taxability: (c.taxability as any) ?? "Unknown",
      is_reverse_charge: c.is_reverse_charge === 1 ? "Yes" : "No",
      is_ineligible_for_itc: c.is_ineligible_for_itc === 1 ? "Yes" : "No",
      igst_rate: String(c.igst_rate ?? 0),
      igst_valuation_type: (c.igst_valuation_type as any) ?? "Based on Value",
      cgst_rate: String(c.cgst_rate ?? 0),
      cgst_valuation_type: (c.cgst_valuation_type as any) ?? "Based on Value",
      sgst_rate: String(c.sgst_rate ?? 0),
      sgst_valuation_type: (c.sgst_valuation_type as any) ?? "Based on Value",
      cess_rate: String(c.cess_rate ?? 0),
      cess_valuation_type: (c.cess_valuation_type as any) ?? "Based on Value",
    });
    setError(null);
    setSuccess(null);
  };

  const handleIGSTChange = (val: string) => {
    const num = Number(val) || 0;
    const half = String(num / 2);
    setForm((f) => f ? { ...f, igst_rate: val, cgst_rate: half, sgst_rate: half } : null);
  };

  const setField = (key: keyof FormData) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const val = e.target.value;
    if (key === "igst_rate") handleIGSTChange(val);
    else setForm((f) => f ? { ...f, [key]: val } : null);
  };

  const validate = (): string | null => {
    if (!form?.name.trim()) return "Classification Name is required.";
    if (!companyId) return "No company selected.";
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
    if (!form || !selectedClass) return;
    if (selectedClass.is_predefined === 1) { setError("Predefined GST classifications cannot be altered."); return; }
    const validationError = validate();
    if (validationError) { setError(validationError); return; }
    setLoading(true);
    setError(null);
    try {
      const result = await window.api.gstClassification.update({
        gc_id: selectedClass.gc_id,
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
        is_predefined: selectedClass.is_predefined ?? 0,
        is_active: selectedClass.is_active ?? 1,
      });
      if (result.success) {
        setSuccess(`GST Classification "${form.name}" updated successfully.`);
        await loadClassifications();
        setTimeout(() => { setSuccess(null); setSelectedClass(null); setForm(null); }, 1500);
      } else {
        setError(result.error || "Failed to update GST classification.");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unexpected error.");
    } finally {
      setLoading(false);
    }
  }, [form, selectedClass, companyId, loadClassifications]);

  const handleDelete = useCallback(async () => {
    if (!selectedClass) return;
    if (selectedClass.is_predefined === 1) { setError("Predefined GST classifications cannot be deleted."); return; }
    if (!window.confirm(`Delete GST Classification "${selectedClass.name}"?`)) return;
    setLoading(true);
    setError(null);
    try {
      const result = await window.api.gstClassification.delete(selectedClass.gc_id!);
      if (result.success) {
        setSuccess("GST Classification deleted successfully.");
        await loadClassifications();
        setTimeout(() => { setSuccess(null); setSelectedClass(null); setForm(null); }, 1500);
      } else {
        setError(result.error || "Failed to delete GST classification.");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unexpected error.");
    } finally {
      setLoading(false);
    }
  }, [selectedClass, loadClassifications]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        if (selectedClass) { setSelectedClass(null); setForm(null); }
        else navigate("/master/alter");
      }
      if ((e.altKey || e.ctrlKey) && e.key.toLowerCase() === "a") { e.preventDefault(); handleSubmit(); }
      if (e.altKey && e.key.toLowerCase() === "d") { e.preventDefault(); handleDelete(); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handleSubmit, handleDelete, navigate, selectedClass]);

  if (!selectedClass || !form) {
    return (
      <SelectionPanel
        classifications={classifications}
        onSelect={handleSelectClass}
        onCancel={() => navigate("/master/alter")}
        onCreate={() => navigate("/master/create/gst-classification")}
      />
    );
  }

  const isPredefined = selectedClass.is_predefined === 1;
  const dis = (extra = "") => `${extra} ${isPredefined ? "text-zinc-500 cursor-not-allowed bg-zinc-50" : ""}`.trim();

  const alterActions = [
    ...(isPredefined ? [] : [{ key: "Alt+A", label: "Accept", onClick: handleSubmit }]),
    ...(isPredefined ? [] : [{ key: "Alt+D", label: "Delete", onClick: handleDelete }]),
    { key: "Esc", label: "Back", onClick: () => { setSelectedClass(null); setForm(null); } },
  ];

  return (
    <div className="flex flex-col h-full relative overflow-hidden bg-white select-none font-sans">
      <PageTitleBar
        title={`GST Classification Alteration: ${selectedClass.name}`}
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
      {isPredefined && (
        <div className="px-3 py-1.5 border-b border-zinc-200 bg-zinc-50 text-zinc-500 text-xs shrink-0 select-none">
          ℹ️ Predefined GST classifications cannot be modified or deleted.
        </div>
      )}

      <div className="flex-1 flex min-h-0">
        <div className="flex-1 overflow-y-auto p-3 space-y-4 bg-white border-r border-zinc-100 font-sans">

          {/* HSN/SAC Details */}
          <div className="space-y-1.5">
            <div className="text-[10px] uppercase font-bold text-zinc-400 select-none">HSN / SAC Details</div>

            <FormRow label="Name" required labelWidth="w-64" className="flex items-center min-h-[26px]">
              <input
                autoFocus={!isPredefined}
                disabled={isPredefined}
                className={inputCls + dis()}
                placeholder="e.g. GST 18%"
                value={form.name}
                onChange={setField("name")}
              />
            </FormRow>

            <FormRow label="Description" labelWidth="w-64" className="flex items-start">
              <textarea
                rows={2}
                disabled={isPredefined}
                className={`flex-1 bg-transparent text-sm outline-none px-1.5 py-0.5 border border-zinc-200 focus:border-zinc-800 transition-colors bg-white rounded w-full text-xs ${dis()}`}
                placeholder="Optional notes..."
                value={form.description}
                onChange={setField("description")}
              />
            </FormRow>

            <FormRow label="HSN / SAC" labelWidth="w-64" className="flex items-center min-h-[26px]">
              <input
                disabled={isPredefined}
                className={inputCls + dis()}
                placeholder="e.g. 9984 or 8471"
                value={form.hsn_sac_code}
                onChange={setField("hsn_sac_code")}
              />
            </FormRow>

            <FormRow label="Is non-GST goods" labelWidth="w-64" className="flex items-center min-h-[26px]">
              <select disabled={isPredefined} className={selectCls + dis()} value={form.is_non_gst_goods} onChange={setField("is_non_gst_goods")}>
                <option>No</option>
                <option>Yes</option>
              </select>
            </FormRow>

            <FormRow label="Nature of Transaction" labelWidth="w-64" className="flex items-center min-h-[26px]">
              <select disabled={isPredefined} className={selectCls + dis()} value={form.nature_of_transaction} onChange={setField("nature_of_transaction")}>
                {NATURES.map((n) => <option key={n}>{n}</option>)}
              </select>
            </FormRow>
          </div>

          {/* Tax Details */}
          <div className="space-y-1.5 border-t border-zinc-100 pt-3">
            <div className="text-[10px] uppercase font-bold text-zinc-400 select-none">Tax Details</div>

            <FormRow label="Taxability" labelWidth="w-64" className="flex items-center min-h-[26px]">
              <select disabled={isPredefined} className={selectCls + dis()} value={form.taxability} onChange={setField("taxability")}>
                <option>Unknown</option>
                <option>Taxable</option>
                <option>Exempt</option>
                <option>Nil Rated</option>
              </select>
            </FormRow>

            <FormRow label="Is reverse charge applicable" labelWidth="w-64" className="flex items-center min-h-[26px]">
              <select disabled={isPredefined} className={selectCls + dis()} value={form.is_reverse_charge} onChange={setField("is_reverse_charge")}>
                <option>No</option>
                <option>Yes</option>
              </select>
            </FormRow>

            <FormRow label="Is ineligible for input credit" labelWidth="w-64" className="flex items-center min-h-[26px]">
              <select disabled={isPredefined} className={selectCls + dis()} value={form.is_ineligible_for_itc} onChange={setField("is_ineligible_for_itc")}>
                <option>No</option>
                <option>Yes</option>
              </select>
            </FormRow>

            {/* Tax Table */}
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
                    disabled={isPredefined}
                    className={smallSelectCls + dis()}
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
                      disabled={isPredefined}
                      className={`w-16 bg-transparent text-sm outline-none py-0.5 px-1.5 border border-transparent hover:border-zinc-200 focus:border-zinc-800 transition-colors bg-white/50 rounded ${dis()}`}
                      value={form[rateKey]}
                      onChange={setField(rateKey)}
                    />
                    <span className="text-xs text-zinc-400">%</span>
                  </div>
                </div>
              ))}

              {!isPredefined && (
                <div className="text-[10px] text-zinc-400 italic px-1.5 pt-1 font-sans">
                  Editing Integrated Tax rate auto-fills Central & State Tax as half each.
                </div>
              )}
            </div>
          </div>

        </div>
        <RightActionPanel actions={alterActions} />
      </div>

      <div className="px-3 py-3 border-t border-zinc-200 flex justify-between items-center bg-zinc-50 shrink-0">
        {!isPredefined ? (
          <button
            onClick={handleDelete}
            disabled={loading}
            className="text-xs px-4 py-1.5 rounded border border-red-200 text-red-500 hover:bg-red-50 hover:border-red-300 disabled:opacity-50 transition-colors font-medium font-sans shadow-sm"
          >
            Delete
          </button>
        ) : <div />}
        <div className="flex gap-3">
          <button
            onClick={() => { setSelectedClass(null); setForm(null); }}
            className="text-xs px-4 py-1.5 rounded border border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50 shadow-sm transition-colors font-medium font-sans"
          >
            Back
          </button>
          {!isPredefined && (
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="text-xs px-5 py-1.5 rounded bg-black text-white hover:bg-zinc-800 disabled:opacity-50 shadow-sm transition-colors font-medium font-sans"
            >
              {loading ? "Saving..." : "Accept"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}