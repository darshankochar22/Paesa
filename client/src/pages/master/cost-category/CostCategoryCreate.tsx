import { useState, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useCompany } from "@/context/CompanyContext";
import { FormRow, PageTitleBar, RightActionPanel } from "@/components/ui";
import type { CostCategoryType } from "@/types/api";

const inputCls = "flex-1 bg-transparent text-sm outline-none px-1 py-0.5 border border-transparent focus:bg-zinc-100 hover:bg-zinc-50 focus:border-zinc-300 transition-colors";
const selectCls = "bg-transparent text-sm outline-none px-1 py-0.5 border border-transparent cursor-pointer focus:bg-zinc-100 hover:bg-zinc-50 focus:border-zinc-300 transition-colors";

interface FormData {
  name: string;
  alias: string;
  allocate_revenue_items: string;
  allocate_non_revenue_items: string;
}

const INITIAL: FormData = {
  name: "",
  alias: "",
  allocate_revenue_items: "1",
  allocate_non_revenue_items: "0",
};

export default function CostCategoryCreate() {
  const navigate = useNavigate();
  const { selectedCompany } = useCompany();
  const [form, setForm] = useState<FormData>(INITIAL);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const setField = (key: keyof FormData) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm(f => ({ ...f, [key]: e.target.value }));

  const handleSubmit = useCallback(async () => {
    if (!form.name.trim()) { setError("Name is required."); return; }
    if (!selectedCompany?.company_id) { setError("No company selected."); return; }
    setLoading(true); setError(null);
    try {
      const result = await window.api.costCategory.create({
        company_id: selectedCompany.company_id,
        name: form.name.trim(),
        alias: form.alias.trim() || undefined,
        allocate_revenue_items: Number(form.allocate_revenue_items),
        allocate_non_revenue_items: Number(form.allocate_non_revenue_items),
      });
      if (result.success) {
        setSuccess(`Cost Category "${form.name}" created.`);
        setForm(INITIAL);
        setTimeout(() => setSuccess(null), 3000);
      } else {
        setError(result.error || "Failed to create cost category.");
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
        navigate("/master/create");
      }
      if ((e.altKey || e.ctrlKey) && e.key.toLowerCase() === "a") {
        e.preventDefault();
        handleSubmit();
      }
      if (e.altKey && e.key.toLowerCase() === "c") {
        e.preventDefault();
        navigate("/master/alter/cost-category");
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handleSubmit, navigate]);

  const actions = [
    { key: "Alt+A", label: "Accept", onClick: handleSubmit },
    { key: "Alt+C", label: "Alter Category", onClick: () => navigate("/master/alter/cost-category") },
    { key: "Esc", label: "Quit", onClick: () => navigate("/master/create") },
  ];

  return (
    <div className="flex-1 flex flex-col h-full bg-white select-none relative overflow-hidden">
      <PageTitleBar title="Cost Category Creation" subtitle={selectedCompany?.name} />

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
        <div className="flex-1 flex flex-col min-w-0 bg-white p-3 space-y-1 overflow-y-auto">
          <div className="max-w-2xl space-y-1">
            <FormRow label="Name" required labelWidth="w-64" className="flex items-center min-h-[26px]">
              <input autoFocus className={inputCls} value={form.name} onChange={setField("name")} />
            </FormRow>
            <FormRow label="(alias)" labelWidth="w-64" className="flex items-center min-h-[26px]">
              <input className={inputCls} value={form.alias} onChange={setField("alias")} />
            </FormRow>

            <div className="border-t border-zinc-100 pt-3 mt-2">
              <div className="text-xs uppercase tracking-widest text-zinc-400 font-bold mb-2 font-sans">Allocation Options</div>
              <FormRow label="Allocate Revenue Items" labelWidth="w-64" className="flex items-center min-h-[26px]">
                <select className={selectCls} value={form.allocate_revenue_items} onChange={setField("allocate_revenue_items")}>
                  <option value="1">Yes</option>
                  <option value="0">No</option>
                </select>
              </FormRow>
              <FormRow label="Allocate Non-Revenue Items" labelWidth="w-64" className="flex items-center min-h-[26px]">
                <select className={selectCls} value={form.allocate_non_revenue_items} onChange={setField("allocate_non_revenue_items")}>
                  <option value="1">Yes</option>
                  <option value="0">No</option>
                </select>
              </FormRow>
            </div>
          </div>
          <div className="flex-1" />
        </div>

        <RightActionPanel actions={actions} />
      </div>

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
