import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useCompany } from "@/context/CompanyContext";
import FormRow from "@/components/ui/FormRow";
import type { StockCategoryType } from "@/types/api";

const inputCls = "flex-1 bg-transparent text-sm outline-none px-1 py-0.5 border border-transparent";

function CategoryListPanel({
  categories,
  selected,
  onSelect,
  onClose,
}: {
  categories: StockCategoryType[];
  selected: string;
  onSelect: (id: string) => void;
  onClose: () => void;
}) {
  return (
    <div className="w-72 border-l flex flex-col shrink-0">
      <div className="px-2 py-1 text-sm font-medium flex justify-between items-center select-none">
        <span>List of Categories</span>
        <button onClick={onClose} className="text-xs hover:underline">&times;</button>
      </div>
      <div className="flex-1 overflow-y-auto">
        <div
          onClick={() => { onSelect(""); onClose(); }}
          className={[
            "text-sm px-3 py-1 border-b border-zinc-100 cursor-pointer select-none italic",
            selected === "" ? "bg-zinc-800 text-white" : "hover:bg-zinc-50 text-zinc-500",
          ].join(" ")}
        >
          Primary
        </div>
        {categories
          .filter((c) => c.name.toLowerCase() !== "primary")
          .map((c) => (
            <div
              key={c.sc_id}
              onClick={() => { onSelect(String(c.sc_id)); onClose(); }}
              className={[
                "text-sm px-3 py-1 border-b border-zinc-100 cursor-pointer select-none",
                selected === String(c.sc_id) ? "bg-zinc-800 text-white" : "hover:bg-zinc-50",
              ].join(" ")}
            >
              {c.name}
            </div>
          ))}
        {categories.filter((c) => c.name.toLowerCase() !== "primary").length === 0 && (
          <div className="text-xs text-zinc-400 px-3 py-2">No categories yet</div>
        )}
      </div>
    </div>
  );
}

interface FormData {
  name: string;
  alias: string;
  parent_category_id: string;
}

const INITIAL: FormData = { name: "", alias: "", parent_category_id: "" };

export default function StockCategoryCreate() {
  const navigate = useNavigate();
  const { selectedCompany } = useCompany();
  const [form, setForm] = useState<FormData>(INITIAL);
  const [categories, setCategories] = useState<StockCategoryType[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showPanel, setShowPanel] = useState(false);

  useEffect(() => {
    const company_id = selectedCompany?.company_id;
    if (!company_id) return;
    window.api.stockCategory.getAll(company_id).then(r => {
      if (r.success) setCategories(r.stockCategories ?? []);
    });
  }, [selectedCompany]);

  const setField = (key: keyof FormData) =>
    (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm(f => ({ ...f, [key]: e.target.value }));

  const handleSubmit = useCallback(async () => {
    if (!form.name.trim()) { setError("Name is required."); return; }
    if (!selectedCompany?.company_id) { setError("No company selected."); return; }
    setLoading(true); setError(null);
    try {
      const result = await window.api.stockCategory.create({
        company_id: selectedCompany.company_id,
        name: form.name.trim(),
        alias: form.alias.trim() || undefined,
        parent_category_id: form.parent_category_id ? Number(form.parent_category_id) : undefined,
      });
      if (result.success) {
        const updated = await window.api.stockCategory.getAll(selectedCompany.company_id!);
        if (updated.success) setCategories(updated.stockCategories ?? []);
        setSuccess(`Stock Category "${form.name}" created.`);
        setForm(INITIAL);
        setTimeout(() => setSuccess(null), 3000);
      } else {
        setError(result.error || "Failed to create stock category.");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unexpected error.");
    } finally {
      setLoading(false);
    }
  }, [form, selectedCompany]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") { if (showPanel) setShowPanel(false); else navigate("/master/create"); }
      if (e.ctrlKey && e.key === "a") { e.preventDefault(); handleSubmit(); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handleSubmit, navigate, showPanel]);

  const selectedLabel = form.parent_category_id
    ? categories.find(c => String(c.sc_id) === form.parent_category_id)?.name ?? "Primary"
    : "Primary";

  return (
    <div className="flex-1 flex flex-col h-full bg-white">
      <div className="px-3 py-1 text-sm font-medium flex justify-between items-center select-none">
        <span>Stock Category Creation</span>
      </div>

      {error && (
        <div className="px-3 py-1 border-b border-red-200 bg-red-50 text-red-700 text-xs flex justify-between items-center">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="text-red-500 hover:text-red-700 text-xs">dismiss</button>
        </div>
      )}
      {success && (
        <div className="px-3 py-1 border-b border-green-200 bg-green-50 text-green-700 text-xs flex justify-between items-center">
          <span>{success}</span>
          <button onClick={() => setSuccess(null)} className="text-green-500 hover:text-green-700 text-xs">dismiss</button>
        </div>
      )}

      <div className="flex-1 flex min-h-0">
        <div className="flex-1 flex flex-col min-w-0">
          <div className="p-2 space-y-0.5">
            <FormRow label="Name" labelWidth="w-32" className="flex items-center min-h-[22px]">
              <input autoFocus className={inputCls} value={form.name} onChange={setField("name")} />
            </FormRow>
            <FormRow label="(alias)" labelWidth="w-32" className="flex items-center min-h-[22px]">
              <input className={inputCls} value={form.alias} onChange={setField("alias")} />
            </FormRow>
            <div
              className="flex items-center min-h-[22px] cursor-pointer hover:bg-zinc-50"
              onClick={() => setShowPanel(v => !v)}
            >
              <span className="w-32 text-sm shrink-0">Under</span>
              <span className="text-zinc-600 mr-2 shrink-0">:</span>
              <span className="text-sm px-1 py-0.5">{selectedLabel}</span>
            </div>
          </div>
          <div className="flex-1" />
        </div>

        {showPanel && (
          <CategoryListPanel
            categories={categories}
            selected={form.parent_category_id}
            onSelect={val => setForm(f => ({ ...f, parent_category_id: val }))}
            onClose={() => setShowPanel(false)}
          />
        )}
      </div>

      <div className="border-t p-2 flex justify-between items-center bg-zinc-50">
        <button onClick={() => navigate("/master/create")} className="text-xs text-zinc-500 hover:text-zinc-800">
          &larr; Back to Masters
        </button>
        <button
          onClick={handleSubmit}
          disabled={loading}
          className="text-sm px-5 py-1 rounded bg-black text-white hover:bg-zinc-800 disabled:opacity-50 transition-colors font-medium"
        >
          {loading ? "Saving..." : "Create"}
        </button>
      </div>
    </div>
  );
}