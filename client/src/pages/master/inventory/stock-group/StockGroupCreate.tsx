import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useCompany } from "@/context/CompanyContext";
import { FormRow, PageTitleBar, RightActionPanel } from "@/components/ui";
import type { StockGroupType } from "@/types/api";
import { loadFormState, saveFormState, clearFormState } from "@/utils/formPersistence";

const inputCls = "flex-1 bg-transparent text-sm outline-none px-1 py-0.5 border border-transparent";
const selectCls = "bg-transparent text-sm outline-none px-1 py-0.5 border border-transparent cursor-pointer";

function GroupListPanel({
  groups,
  selected,
  onSelect,
  onClose,
  onCreate,
}: {
  groups: StockGroupType[];
  selected: string;
  onSelect: (id: string) => void;
  onClose: () => void;
  onCreate: () => void;
}) {
  return (
    <div className="w-72 border-l border-zinc-200 flex flex-col shrink-0 bg-white">
      <div className="px-3 py-2 text-xs font-bold uppercase tracking-wider flex justify-between items-center select-none border-b border-zinc-150">
        <span>List of Groups</span>
        <div className="flex items-center gap-2 font-normal">
          <button
            onClick={onCreate}
            className="text-xs text-zinc-500 hover:text-black underline underline-offset-1"
          >
            Create
          </button>
          <button onClick={onClose} className="text-sm font-bold font-sans hover:text-red-500">&times;</button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto">
        <div
          onClick={() => { onSelect(""); onClose(); }}
          className={[
            "text-xs px-3 py-1.5 border-b border-zinc-100 cursor-pointer select-none italic",
            selected === "" ? "bg-zinc-900 text-white" : "hover:bg-zinc-50 text-zinc-500",
          ].join(" ")}
        >
          Primary
        </div>
        {groups
          .filter((g) => g.name.toLowerCase() !== "primary")
          .map((g) => (
            <div
              key={g.sg_id}
              onClick={() => { onSelect(String(g.sg_id)); onClose(); }}
              className={[
                "text-xs px-3 py-1.5 border-b border-zinc-100 cursor-pointer select-none",
                selected === String(g.sg_id) ? "bg-zinc-900 text-white" : "hover:bg-zinc-50 text-zinc-800",
              ].join(" ")}
            >
              {g.name}
            </div>
          ))}
        {groups.filter((g) => g.name.toLowerCase() !== "primary").length === 0 && (
          <div className="text-xs text-zinc-400 px-3 py-2 italic">No groups yet</div>
        )}
      </div>
    </div>
  );
}

interface FormData {
  name: string;
  alias: string;
  parent_group_id: string;
  should_quantities_be_added: string;
  // HSN/SAC
  hsn_sac_details: string;  
  hsn_sac_code: string;        
  hsn_sac_description: string; 
  // GST
  gst_rate_details: string;   
  taxability_type: string;     
  gst_rate: string;            
}

const INITIAL: FormData = {
  name: "",
  alias: "",
  parent_group_id: "",
  should_quantities_be_added: "0", // Tally default: No
  hsn_sac_details: "as_per_company",
  hsn_sac_code: "",
  hsn_sac_description: "",
  gst_rate_details: "as_per_company",
  taxability_type: "as_per_company",
  gst_rate: "0",
};

function SectionHeader({ title }: { title: string }) {
  return (
    <div className="mt-3 mb-1 text-xs font-semibold text-zinc-600 select-none border-b border-zinc-200 pb-0.5">
      {title}
    </div>
  );
}

function SubSectionLabel({ title }: { title: string }) {
  return (
    <div className="flex items-center min-h-[26px] pl-2">
      <span className="text-sm text-zinc-500 italic">{title}</span>
    </div>
  );
}

export default function StockGroupCreate() {
  const navigate = useNavigate();
  const { selectedCompany } = useCompany();
  const companyId = selectedCompany?.company_id;
  const persistKey = companyId ? `stockGroupCreate_${companyId}` : null;
  const hasRestored = useRef(false);

  const [form, setForm] = useState<FormData>(
    () => loadFormState<any>(persistKey ?? "")?.form ?? INITIAL
  );
  const [stockGroups, setStockGroups] = useState<StockGroupType[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showPanel, setShowPanel] = useState(false);

  useEffect(() => {
    const company_id = selectedCompany?.company_id;
    if (!company_id) return;
    window.api.stockGroup.getAll(company_id).then(r => {
      if (r.success) setStockGroups(r.stockGroups ?? []);
    });
  }, [selectedCompany]);

  useEffect(() => {
    if (!persistKey) return;
    if (!hasRestored.current) { hasRestored.current = true; return; }
    saveFormState(persistKey, { form });
  }, [persistKey, form]);

  const setField = (key: keyof FormData) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm(f => ({ ...f, [key]: e.target.value }));

  const validate = (): string | null => {
    if (!form.name.trim()) return "Name is required.";
    if (!selectedCompany?.company_id) return "No company selected.";
    return null;
  };

  const handleSubmit = useCallback(async () => {
    const err = validate();
    if (err) { setError(err); return; }
    setLoading(true); setError(null);
    try {
      const totalGst = parseFloat(form.gst_rate) || 0;
      const halfGst  = parseFloat((totalGst / 2).toFixed(2));

      const result = await window.api.stockGroup.create({
        company_id:                 selectedCompany!.company_id,
        name:                       form.name.trim(),
        alias:                      form.alias.trim() || null,
        parent_group_id:            form.parent_group_id ? Number(form.parent_group_id) : null,
        should_quantities_be_added: Number(form.should_quantities_be_added),
        // HSN/SAC — null when "as per company"
        hsn_sac_code:               form.hsn_sac_details === "specify" ? form.hsn_sac_code.trim() || null : null,
        hsn_sac_description:        form.hsn_sac_details === "specify" ? form.hsn_sac_description.trim() || null : null,
        // GST — null/0 when "as per company"
        gst_rate:                   form.gst_rate_details === "specify" ? totalGst : 0,
        cgst_rate:                  form.gst_rate_details === "specify" ? halfGst  : 0,
        sgst_rate:                  form.gst_rate_details === "specify" ? halfGst  : 0,
        // taxability_type stored in statutory_details column
        statutory_details:          form.taxability_type !== "as_per_company" ? form.taxability_type : null,
      });

      if (result.success) {
        const updated = await window.api.stockGroup.getAll(selectedCompany!.company_id!);
        if (updated.success) setStockGroups(updated.stockGroups ?? []);
        setSuccess(`Stock Group "${form.name}" created.`);
        setForm(INITIAL);
        if (persistKey) clearFormState(persistKey);
        hasRestored.current = false;
        setTimeout(() => setSuccess(null), 3000);
      } else {
        setError(result.error || "Failed to create stock group.");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unexpected error.");
    } finally {
      setLoading(false);
    }
  }, [form, selectedCompany]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        if (showPanel) setShowPanel(false);
        else navigate("/master/create");
      }
      if (e.altKey && e.key.toLowerCase() === "g") { e.preventDefault(); setShowPanel(prev => !prev); }
      if (e.altKey && e.key.toLowerCase() === "a") { e.preventDefault(); handleSubmit(); }
      if (e.ctrlKey && e.key.toLowerCase() === "a") { e.preventDefault(); handleSubmit(); }
      if (e.altKey && e.key.toLowerCase() === "c") { e.preventDefault(); navigate("/master/alter/stock-group"); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handleSubmit, navigate, showPanel]);

  const selectedGroupLabel = form.parent_group_id
    ? stockGroups.find(g => String(g.sg_id) === form.parent_group_id)?.name ?? "Primary"
    : "Primary";

  const hsnSourceLabel = form.hsn_sac_details === "as_per_company" ? "Not Available" : "Specified Here";
  const gstSourceLabel = form.gst_rate_details === "as_per_company" ? "Not Available" : "Specified Here";

  const groupActions = [
    { key: "Alt+G", label: "Select Group", onClick: () => setShowPanel(prev => !prev) },
    { key: "Alt+A", label: "Accept",       onClick: handleSubmit },
    { key: "Alt+C", label: "Alter Group",  onClick: () => navigate("/master/alter/stock-group") },
    { key: "Esc",   label: "Quit",         onClick: () => navigate("/master/create") },
  ];

  return (
    <div className="flex-1 flex flex-col h-full bg-white select-none">
      <PageTitleBar title="Stock Group Creation" subtitle={selectedCompany?.name} />

      {error && (
        <div className="px-3 py-1.5 border-b border-red-200 bg-red-50 text-red-700 text-xs flex justify-between items-center">
          <span>• {error}</span>
          <button onClick={() => setError(null)} className="text-red-500 hover:text-red-700 font-bold">&times;</button>
        </div>
      )}
      {success && (
        <div className="px-3 py-1.5 border-b border-green-200 bg-green-50 text-green-700 text-xs flex justify-between items-center">
          <span>• {success}</span>
          <button onClick={() => setSuccess(null)} className="text-green-500 hover:text-green-700 font-bold">&times;</button>
        </div>
      )}

      <div className="flex-1 flex min-h-0">
        {/* Form */}
        <div className="flex-1 flex flex-col min-w-0 bg-white overflow-y-auto">
          <div className="p-3 space-y-1 max-w-2xl">

            <FormRow label="Name" labelWidth="w-56" className="flex items-center min-h-[26px]">
              <input autoFocus className={inputCls} value={form.name} onChange={setField("name")} />
            </FormRow>

            <FormRow label="(alias)" labelWidth="w-56" className="flex items-center min-h-[26px]">
              <input className={inputCls} value={form.alias} onChange={setField("alias")} />
            </FormRow>

            {/* Under — opens group panel */}
            <div
              className="flex items-center min-h-[26px] cursor-pointer hover:bg-zinc-50 text-sm"
              onClick={() => setShowPanel(v => !v)}
            >
              <span className="w-56 text-zinc-400 shrink-0 py-1">Under</span>
              <span className="text-zinc-600 mr-2 shrink-0">:</span>
              <span className="text-sm px-1 py-0.5 font-bold uppercase tracking-wide text-zinc-900">
                {selectedGroupLabel}
              </span>
            </div>

            <FormRow label="Should quantities of items be added" labelWidth="w-56" className="flex items-center min-h-[26px]">
              <select className={selectCls} value={form.should_quantities_be_added} onChange={setField("should_quantities_be_added")}>
                <option value="1">Yes</option>
                <option value="0">No</option>
              </select>
            </FormRow>

            {/* ── Statutory Details ── */}
            <SectionHeader title="Statutory Details" />

            <SubSectionLabel title="HSN/SAC & Related Details" />

            <FormRow label="HSN/SAC Details" labelWidth="w-56" className="flex items-center min-h-[26px] pl-4">
              <select className={selectCls} value={form.hsn_sac_details} onChange={setField("hsn_sac_details")}>
                <option value="as_per_company">As per Company/Stock Group</option>
                <option value="specify">Specify Here</option>
              </select>
            </FormRow>

            <FormRow label="Source of details" labelWidth="w-56" className="flex items-center min-h-[26px] pl-4">
              <span className="text-sm text-zinc-400 px-1">{hsnSourceLabel}</span>
            </FormRow>

            {form.hsn_sac_details === "specify" && (
              <>
                <FormRow label="HSN/SAC" labelWidth="w-56" className="flex items-center min-h-[26px] pl-4">
                  <input className={inputCls} value={form.hsn_sac_code} onChange={setField("hsn_sac_code")} />
                </FormRow>
                <FormRow label="Description" labelWidth="w-56" className="flex items-center min-h-[26px] pl-4">
                  <input className={inputCls} value={form.hsn_sac_description} onChange={setField("hsn_sac_description")} />
                </FormRow>
              </>
            )}

            <SubSectionLabel title="GST Rate & Related Details" />

            <FormRow label="GST Rate Details" labelWidth="w-56" className="flex items-center min-h-[26px] pl-4">
              <select className={selectCls} value={form.gst_rate_details} onChange={setField("gst_rate_details")}>
                <option value="as_per_company">As per Company/Stock Group</option>
                <option value="specify">Specify Here</option>
              </select>
            </FormRow>

            <FormRow label="Source of details" labelWidth="w-56" className="flex items-center min-h-[26px] pl-4">
              <span className="text-sm text-zinc-400 px-1">{gstSourceLabel}</span>
            </FormRow>

            <FormRow label="Taxability Type" labelWidth="w-56" className="flex items-center min-h-[26px] pl-4">
              <select className={selectCls} value={form.taxability_type} onChange={setField("taxability_type")}>
                <option value="as_per_company">As per Company/Stock Group</option>
                <option value="Taxable">Taxable</option>
                <option value="Exempt">Exempt</option>
                <option value="Nil Rated">Nil Rated</option>
                <option value="Non-GST">Non-GST</option>
              </select>
            </FormRow>

            <FormRow label="GST Rate" labelWidth="w-56" className="flex items-center min-h-[26px] pl-4">
              <div className="flex items-center gap-1">
                <input
                  className={inputCls}
                  style={{ width: "60px" }}
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  value={form.gst_rate}
                  onChange={setField("gst_rate")}
                />
                <span className="text-sm text-zinc-400">%</span>
              </div>
            </FormRow>

          </div>
          <div className="flex-1" />
        </div>

        {/* Group panel */}
        {showPanel && (
          <GroupListPanel
            groups={stockGroups}
            selected={form.parent_group_id}
            onSelect={val => setForm(f => ({ ...f, parent_group_id: val }))}
            onClose={() => setShowPanel(false)}
            onCreate={() => { setShowPanel(false); navigate("/master/create/stock-group"); }}
          />
        )}

        <RightActionPanel actions={groupActions} />
      </div>

      {/* Footer */}
      <div className="border-t border-zinc-200 p-3 flex justify-between items-center bg-zinc-50">
        <button onClick={() => navigate("/master/create")} className="text-xs text-zinc-500 hover:text-zinc-800 transition-colors font-medium">
          &larr; Back to Masters
        </button>
        <button
          onClick={handleSubmit}
          disabled={loading}
          className="text-sm px-6 py-1.5 rounded bg-black text-white hover:bg-zinc-800 disabled:opacity-50 transition-colors font-medium"
        >
          {loading ? "Saving..." : "Create"}
        </button>
      </div>
    </div>
  );
}