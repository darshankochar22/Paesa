import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useCompany } from "../../../context/CompanyContext";
import type { StockCategoryType } from "../../../types/api";

function Row({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="flex items-center border-b last:border-0 min-h-[32px]">
      <span className="w-56 text-sm text-zinc-400 shrink-0 py-1">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </span>
      <span className="text-zinc-600 mr-2">:</span>
      <div className="flex-1">{children}</div>
    </div>
  );
}

const inputCls = "w-full bg-transparent text-sm outline-none py-1 px-1 rounded-sm placeholder:text-zinc-400";
const selectCls = "w-full bg-transparent text-sm outline-none py-1 px-1 rounded-sm cursor-pointer";

interface FormData {
  name: string;
  description: string;
  parent_category_id: string;
}

const INITIAL: FormData = {
  name: "",
  description: "",
  parent_category_id: "",
};

export default function StockCategoryCreate() {
  const navigate = useNavigate();
  const { selectedCompany } = useCompany();
  const [form, setForm] = useState<FormData>(INITIAL);
  const [categories, setCategories] = useState<StockCategoryType[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    const company_id = selectedCompany?.company_id;
    if (!company_id) return;
    window.api.stockCategory.getAll(company_id).then(r => {
      if (r.success) setCategories(r.stockCategories ?? []);
    });
  }, [selectedCompany]);

  const set = (key: keyof FormData) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm(f => ({ ...f, [key]: e.target.value }));

  const validate = (): string | null => {
    if (!form.name.trim()) return "Name is required.";
    if (!selectedCompany?.company_id) return "No company selected.";
    return null;
  };

  const handleSubmit = useCallback(async () => {
    const validationError = validate();
    if (validationError) { setError(validationError); return; }

    setLoading(true); setError(null);
    try {
      const result = await window.api.stockCategory.create({
        company_id: selectedCompany!.company_id,
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        parent_category_id: form.parent_category_id ? Number(form.parent_category_id) : undefined,
      });

      if (result.success) {
        const updated = await window.api.stockCategory.getAll(selectedCompany!.company_id!);
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

  // Keyboard shortcuts: Ctrl+A to accept, Esc to cancel
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        navigate("/master/stock-category");
      }
      if (e.ctrlKey && e.key === "a") {
        e.preventDefault();
        handleSubmit();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handleSubmit, navigate]);

  return (
    <div className="flex flex-col h-full">

      {/* Header */}
      <div className="px-6 py-3 flex items-center justify-between shrink-0">
        <span className="font-semibold text-base">Create Stock Category</span>
        <span className="text-xs text-zinc-500">Ctrl+A to accept &nbsp;|&nbsp; Esc to cancel</span>
      </div>

      {/* Form */}
      <div className="flex-1 overflow-y-auto px-6 py-4 flex flex-col gap-6">

        <div>
          <div className="text-xs uppercase tracking-widest text-zinc-500 mb-2">General</div>
          <Row label="Name" required>
            <input
              autoFocus
              className={inputCls}
              value={form.name}
              onChange={set("name")}
              placeholder="Category name"
            />
          </Row>
          <Row label="Description">
            <input
              className={inputCls}
              value={form.description}
              onChange={set("description")}
              placeholder="Short description (optional)"
            />
          </Row>
          <Row label="Under">
            <select className={selectCls} value={form.parent_category_id} onChange={set("parent_category_id")}>
              <option value="">Primary</option>
              {categories.map(c => (
                <option key={c.sc_id} value={c.sc_id}>{c.name}</option>
              ))}
            </select>
          </Row>
        </div>

      </div>

      {/* Success */}
      {success && (
        <div className="px-6 py-2 border-t border-green-900 bg-green-950 text-green-400 text-sm shrink-0">
          ✓ {success}
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="px-6 py-2 border-t border-red-900 bg-red-950 text-red-400 text-sm flex justify-between items-center shrink-0">
          <span>⚠ {error}</span>
          <button onClick={() => setError(null)} className="text-xs ml-4 hover:opacity-70">dismiss</button>
        </div>
      )}

      {/* Footer */}
      <div className="px-6 py-3 flex justify-end gap-3 shrink-0">
        <button
          onClick={() => navigate("/master/create")}
          className="text-sm px-4 py-1.5 rounded border text-zinc-600 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={handleSubmit}
          disabled={loading}
          className="text-sm px-5 py-1.5 rounded bg-black text-white hover:bg-zinc-800 disabled:opacity-50 transition-colors font-medium"
        >
          {loading ? "Saving..." : "Accept"}
        </button>
      </div>

    </div>
  );
}