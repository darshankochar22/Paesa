import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useCompany } from "@/context/CompanyContext";
import { FormRow, PageTitleBar, RightActionPanel, SideSelectionPanel } from "@/components/ui";
import type { GodownType } from "@/types/api";

const inputCls = "flex-1 bg-transparent text-sm outline-none px-1 py-0.5 border border-transparent focus:bg-zinc-100 hover:bg-zinc-50 focus:border-zinc-300 transition-colors";
const selectCls = "bg-transparent text-sm outline-none px-1 py-0.5 border border-transparent cursor-pointer focus:bg-zinc-100 hover:bg-zinc-50 focus:border-zinc-300 transition-colors";

interface FormData {
  name: string;
  alias: string;
  parent_godown_id: string;
  allow_storage_of_materials: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
}

const INITIAL: FormData = {
  name: "",
  alias: "",
  parent_godown_id: "",
  allow_storage_of_materials: "1",
  address: "",
  city: "",
  state: "",
  pincode: "",
};

export default function GodownCreate() {
  const navigate = useNavigate();
  const { selectedCompany } = useCompany();
  const [form, setForm] = useState<FormData>(INITIAL);
  const [godowns, setGodowns] = useState<GodownType[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showPanel, setShowPanel] = useState(false);

  useEffect(() => {
    const company_id = selectedCompany?.company_id;
    if (!company_id) return;
    window.api.godown.getAll(company_id).then(r => {
      if (r.success) setGodowns(r.godowns ?? []);
    });
  }, [selectedCompany]);

  const setField = (key: keyof FormData) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm(f => ({ ...f, [key]: e.target.value }));

  const validate = (): string | null => {
    if (!form.name.trim()) return "Name is required.";
    if (!selectedCompany?.company_id) return "No company selected.";
    if (form.pincode && !/^\d{0,6}$/.test(form.pincode)) {
      return "Pincode must be numeric (max 6 digits).";
    }
    return null;
  };

  const handleSubmit = useCallback(async () => {
    const err = validate();
    if (err) { setError(err); return; }
    setLoading(true); setError(null);
    try {
      const result = await window.api.godown.create({
        company_id: selectedCompany!.company_id,
        name: form.name.trim(),
        alias: form.alias.trim() || undefined,
        parent_godown_id: form.parent_godown_id ? Number(form.parent_godown_id) : undefined,
        allow_storage_of_materials: Number(form.allow_storage_of_materials),
        address: form.address.trim() || undefined,
        city: form.city.trim() || undefined,
        state: form.state.trim() || undefined,
        pincode: form.pincode.trim() || undefined,
      });
      if (result.success) {
        const updated = await window.api.godown.getAll(selectedCompany!.company_id!);
        if (updated.success) setGodowns(updated.godowns ?? []);
        setSuccess(`Godown "${form.name}" created successfully.`);
        setForm(INITIAL);
        setTimeout(() => setSuccess(null), 3000);
      } else {
        setError(result.error || "Failed to create godown.");
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
      if (e.altKey && e.key.toLowerCase() === "g") {
        e.preventDefault();
        setShowPanel(prev => !prev);
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
        navigate("/master/alter/godown");
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handleSubmit, navigate, showPanel]);

  const selectedGodownLabel = form.parent_godown_id
    ? godowns.find(g => String(g.godown_id) === form.parent_godown_id)?.name ?? "Primary"
    : "Primary";

  const godownActions = [
    { key: "Alt+G", label: "Select Godown", onClick: () => setShowPanel(prev => !prev) },
    { key: "Alt+A", label: "Accept", onClick: handleSubmit },
    { key: "Alt+C", label: "Alter Godown", onClick: () => navigate("/master/alter/godown") },
    { key: "Esc", label: "Quit", onClick: () => navigate("/master/create") },
  ];

  return (
    <div className="flex-1 flex flex-col h-full bg-white select-none relative overflow-hidden">
      <PageTitleBar title="Godown Creation" subtitle={selectedCompany?.name} />

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
        {/* Left Column: General & Address Details */}
        <div className="flex-1 flex flex-col min-w-0 bg-white border-r border-zinc-100 p-3 space-y-6 overflow-y-auto">
          <div className="max-w-2xl space-y-1">
            <div className="text-xs uppercase tracking-widest text-zinc-400 font-bold mb-2 font-sans">General</div>
            
            <FormRow label="Name" required labelWidth="w-56" className="flex items-center min-h-[26px]">
              <input autoFocus className={inputCls} value={form.name} onChange={setField("name")} />
            </FormRow>
            
            <FormRow label="(alias)" labelWidth="w-56" className="flex items-center min-h-[26px]">
              <input className={inputCls} value={form.alias} onChange={setField("alias")} />
            </FormRow>

            {/* Under */}
            <div
              className="flex items-center min-h-[26px] cursor-pointer hover:bg-zinc-50 text-sm select-none"
              onClick={() => setShowPanel(v => !v)}
            >
              <span className="w-56 text-zinc-400 shrink-0 py-1 font-sans">Under</span>
              <span className="text-zinc-600 mr-2 shrink-0">:</span>
              <span className="text-sm px-1 py-0.5 font-bold uppercase tracking-wide text-zinc-900">{selectedGodownLabel}</span>
            </div>

            <FormRow label="Allow Storage of Materials" labelWidth="w-56" className="flex items-center min-h-[26px]">
              <select className={selectCls} value={form.allow_storage_of_materials} onChange={setField("allow_storage_of_materials")}>
                <option value="1">Yes</option>
                <option value="0">No</option>
              </select>
            </FormRow>
          </div>

          <div className="max-w-2xl space-y-1 border-t border-zinc-100 pt-4">
            <div className="text-xs uppercase tracking-widest text-zinc-400 font-bold mb-2 font-sans">Address Details</div>

            <FormRow label="Address" labelWidth="w-56" className="flex items-center min-h-[26px]">
              <input className={inputCls} value={form.address} onChange={setField("address")} placeholder="Street/Building" />
            </FormRow>
            
            <FormRow label="City" labelWidth="w-56" className="flex items-center min-h-[26px]">
              <input className={inputCls} value={form.city} onChange={setField("city")} placeholder="City" />
            </FormRow>
            
            <FormRow label="State" labelWidth="w-56" className="flex items-center min-h-[26px]">
              <input className={inputCls} value={form.state} onChange={setField("state")} placeholder="State" />
            </FormRow>
            
            <FormRow label="Pincode" labelWidth="w-56" className="flex items-center min-h-[26px]">
              <input className={inputCls} value={form.pincode} onChange={setField("pincode")} placeholder="6-digit Pincode" maxLength={6} />
            </FormRow>
          </div>
        </div>

        {/* Side Panel for Under */}
        {showPanel && (
          <SideSelectionPanel
            title="List of Godowns"
            items={godowns.filter(g => g.name.toLowerCase() !== "primary").map(g => ({ id: g.godown_id, label: g.name }))}
            selected={form.parent_godown_id}
            onSelect={val => setForm(f => ({ ...f, parent_godown_id: val }))}
            onClose={() => setShowPanel(false)}
            showPrimary
          />
        )}

        <RightActionPanel actions={godownActions} />
      </div>

      {/* Footer */}
      <div className="border-t border-zinc-200 p-3 flex justify-between items-center bg-zinc-50 shrink-0">
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