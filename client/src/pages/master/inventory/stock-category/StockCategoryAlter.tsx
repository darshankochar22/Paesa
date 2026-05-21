import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useCompany } from "@/context/CompanyContext";
import { PageTitleBar, RightActionPanel, SearchInput, DataTable } from "@/components/ui";
import type { StockCategoryType } from "@/types/api";

function Row({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="flex items-center min-h-[26px]">
      <span className="w-56 text-sm text-zinc-400 shrink-0 py-1 font-sans">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </span>
      <span className="text-zinc-600 mr-2 shrink-0">:</span>
      <div className="flex-1 font-mono">{children}</div>
    </div>
  );
}

const inputCls = "w-full bg-transparent text-sm outline-none py-0.5 px-1 rounded-sm placeholder:text-zinc-400 font-mono";

interface SidePanelProps {
  title: string;
  items: { id: string | number; label: string }[];
  selected: string;
  onSelect: (val: string) => void;
  onClose: () => void;
}

function SidePanel({ title, items, selected, onSelect, onClose }: SidePanelProps) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);

  return (
    <div ref={ref} className="absolute top-0 right-0 h-full w-64 bg-white border-l border-zinc-200 shadow-xl z-50 flex flex-col">
      <div className="px-3 py-2 border-b border-zinc-200 flex justify-between items-center shrink-0">
        <span className="text-xs font-bold text-zinc-600 tracking-wide uppercase font-sans">{title}</span>
        <button onClick={onClose} className="text-zinc-400 hover:text-zinc-700 text-sm font-bold">&times;</button>
      </div>
      <div className="flex-1 overflow-y-auto">
        <div
          className={`px-3 py-1.5 text-xs font-mono cursor-pointer border-b border-zinc-100 ${selected === "" ? "bg-zinc-900 text-white" : "text-zinc-700 hover:bg-zinc-50"}`}
          onClick={() => { onSelect(""); onClose(); }}
        >
          Primary
        </div>
        {items.map(item => (
          <div
            key={item.id}
            className={`px-3 py-1.5 text-xs font-mono cursor-pointer border-b border-zinc-100 ${selected === String(item.id) ? "bg-zinc-900 text-white" : "text-zinc-700 hover:bg-zinc-50"}`}
            onClick={() => { onSelect(String(item.id)); onClose(); }}
          >
            {item.label}
          </div>
        ))}
        {items.length === 0 && (
          <div className="px-3 py-2 text-xs text-zinc-400 italic">No categories found</div>
        )}
      </div>
    </div>
  );
}

function SelectionPanel({
  categories,
  onSelect,
  onCancel,
  onCreate,
}: {
  categories: StockCategoryType[];
  onSelect: (c: StockCategoryType) => void;
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

  const filtered = categories.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  const columns = [
    { key: "name", label: "Category Name", span: "col-span-8", render: (r: StockCategoryType) => <span className="font-bold text-zinc-950 uppercase">{r.name}</span> },
    { key: "alias", label: "Alias", span: "col-span-4", render: (r: StockCategoryType) => <span className="text-zinc-500 font-mono">{r.alias || "—"}</span> },
  ];

  const selectionActions = [
    { key: "Alt+C", label: "Create Category", onClick: onCreate },
    { key: "Esc", label: "Quit", onClick: onCancel },
  ];

  return (
    <div className="flex-1 flex flex-col h-full bg-white select-none">
      <PageTitleBar title="Alter Stock Category" subtitle="Select Category to Alter" />

      <div className="p-3 bg-zinc-50 border-b border-zinc-200 shrink-0">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search categories by name…"
          autoFocus
        />
      </div>

      <div className="flex-1 flex min-h-0">
        <div className="flex-1 flex flex-col bg-white border-r border-zinc-100">
          <DataTable
            columns={columns}
            rows={filtered}
            rowKey={(r: StockCategoryType) => r.sc_id}
            onRowClick={onSelect}
            emptyMessage="No stock categories found."
          />
        </div>
        <RightActionPanel actions={selectionActions} />
      </div>

      <div className="border-t border-zinc-200 p-3 flex justify-end bg-zinc-50">
        <button
          onClick={onCancel}
          className="text-xs px-4 py-1.5 rounded border border-zinc-200 bg-white shadow-sm text-zinc-600 hover:bg-zinc-50 transition-colors font-medium"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

interface FormData {
  name: string;
  alias: string;
  description: string;
  parent_category_id: string;
}

export default function StockCategoryAlter() {
  const navigate = useNavigate();
  const { selectedCompany } = useCompany();

  const [categories, setCategories] = useState<StockCategoryType[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<StockCategoryType | null>(null);
  const [form, setForm] = useState<FormData | null>(null);
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

  const handleSelectCategory = (c: StockCategoryType) => {
    setSelectedCategory(c);
    setForm({
      name: c.name ?? "",
      alias: c.alias ?? "",
      description: c.description ?? "",
      parent_category_id: c.parent_category_id ? String(c.parent_category_id) : "",
    });
    setError(null);
    setSuccess(null);
  };

  const set = (key: keyof FormData) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm(f => f ? { ...f, [key]: e.target.value } : f);

  const validate = (): string | null => {
    if (!form?.name.trim()) return "Name is required.";
    if (!selectedCompany?.company_id) return "No company selected.";
    return null;
  };

  const handleSubmit = useCallback(async () => {
    if (!form || !selectedCategory) return;
    const validationError = validate();
    if (validationError) { setError(validationError); return; }

    setLoading(true); setError(null);
    try {
      const result = await window.api.stockCategory.update({
        sc_id: selectedCategory.sc_id,
        name: form.name.trim(),
        description: form.description.trim() || null,
        parent_category_id: form.parent_category_id ? Number(form.parent_category_id) : null,
      });

      if (result.success) {
        const updated = await window.api.stockCategory.getAll(selectedCompany!.company_id!);
        if (updated.success) setCategories(updated.stockCategories ?? []);
        setSuccess(`Stock Category "${form.name}" updated.`);
        setTimeout(() => {
          setSuccess(null);
          setSelectedCategory(null);
          setForm(null);
        }, 1500);
      } else {
        setError(result.error || "Failed to update stock category.");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unexpected error.");
    } finally {
      setLoading(false);
    }
  }, [form, selectedCategory, selectedCompany]);

  const handleDelete = useCallback(async () => {
    if (!selectedCategory) return;
    if (!window.confirm(`Delete "${selectedCategory.name}"? This cannot be undone.`)) return;

    setLoading(true); setError(null);
    try {
      const result = await window.api.stockCategory.delete(selectedCategory.sc_id);
      if (result.success) {
        const updated = await window.api.stockCategory.getAll(selectedCompany!.company_id!);
        if (updated.success) setCategories(updated.stockCategories ?? []);
        setSelectedCategory(null);
        setForm(null);
      } else {
        setError(result.error || "Failed to delete stock category.");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unexpected error.");
    } finally {
      setLoading(false);
    }
  }, [selectedCategory, selectedCompany]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        if (showPanel) { setShowPanel(false); return; }
        if (selectedCategory) { setSelectedCategory(null); setForm(null); return; }
        navigate("/master/alter");
      }
      if (e.altKey && e.key.toLowerCase() === "u") {
        e.preventDefault();
        if (selectedCategory) setShowPanel(prev => !prev);
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
  }, [handleSubmit, handleDelete, navigate, showPanel, selectedCategory]);

  const underOptions = categories.filter(c =>
    selectedCategory ? String(c.sc_id) !== String(selectedCategory.sc_id) : true
  );

  const selectedLabel = form?.parent_category_id
    ? categories.find(c => String(c.sc_id) === form.parent_category_id)?.name ?? "Primary"
    : "Primary";

  if (!selectedCategory || !form) {
    return (
      <SelectionPanel
        categories={categories}
        onSelect={handleSelectCategory}
        onCancel={() => navigate("/master/alter")}
        onCreate={() => navigate("/master/create/stock-category")}
      />
    );
  }

  const alterActions = [
    { key: "Alt+U", label: "Select Under", onClick: () => setShowPanel(prev => !prev) },
    { key: "Alt+A", label: "Accept", onClick: handleSubmit },
    { key: "Alt+D", label: "Delete", onClick: handleDelete },
    { key: "Esc", label: "Back", onClick: () => { setSelectedCategory(null); setForm(null); } },
  ];

  return (
    <div className="flex flex-col h-full relative overflow-hidden bg-white select-none">
      <PageTitleBar title={`Stock Category Alteration: ${selectedCategory.name}`} subtitle={selectedCompany?.name} />

      {error && (
        <div className="px-3 py-1.5 border-b border-red-200 bg-red-50 text-red-700 text-xs flex justify-between items-center font-mono shrink-0">
          <span>• {error}</span>
          <button onClick={() => setError(null)} className="text-red-500 hover:text-red-700 text-xs font-bold font-sans">&times;</button>
        </div>
      )}
      {success && (
        <div className="px-3 py-1.5 border-b border-green-200 bg-green-50 text-green-700 text-xs flex justify-between items-center font-mono shrink-0">
          <span>• {success}</span>
          <button onClick={() => setSuccess(null)} className="text-green-500 hover:text-green-700 text-xs font-bold font-sans">&times;</button>
        </div>
      )}

      <div className="flex-1 flex min-h-0">
        <div className="flex-1 overflow-y-auto p-3 space-y-4 max-w-2xl bg-white border-r border-zinc-100">
          <div>
            <div className="text-xs uppercase tracking-widest text-zinc-400 font-bold mb-2 font-sans select-none">General</div>
            <Row label="Name" required>
              <input autoFocus className={inputCls} value={form.name} onChange={set("name")} placeholder="Category name" />
            </Row>
            <Row label="(alias)">
              <input className={inputCls} value={form.alias} onChange={set("alias")} placeholder="Short name (optional)" />
            </Row>
            <Row label="Description">
              <input className={inputCls} value={form.description} onChange={set("description")} placeholder="Short description (optional)" />
            </Row>
            <Row label="Under">
              <button
                type="button"
                onClick={() => setShowPanel(true)}
                className="w-full text-left text-sm py-0.5 px-1 bg-transparent outline-none uppercase font-bold text-zinc-800 tracking-wide hover:text-black transition-colors"
              >
                {selectedLabel}
              </button>
            </Row>
          </div>
        </div>

        <RightActionPanel actions={alterActions} />
      </div>

      <div className="px-3 py-3 border-t border-zinc-200 flex justify-between items-center bg-zinc-50 shrink-0">
        <button
          onClick={handleDelete}
          disabled={loading}
          className="text-xs px-4 py-1.5 rounded border border-red-200 text-red-500 hover:bg-red-50 hover:border-red-300 disabled:opacity-50 transition-colors font-medium shadow-sm"
        >
          Delete
        </button>
        <div className="flex gap-3">
          <button
            onClick={() => { setSelectedCategory(null); setForm(null); }}
            className="text-xs px-4 py-1.5 rounded border border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50 shadow-sm transition-colors"
          >
            Back
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="text-xs px-5 py-1.5 rounded bg-black text-white hover:bg-zinc-800 disabled:opacity-50 shadow-sm transition-colors font-medium"
          >
            {loading ? "Saving..." : "Accept"}
          </button>
        </div>
      </div>

      {showPanel && (
        <SidePanel
          title="List of Categories"
          items={underOptions.map(c => ({ id: c.sc_id, label: c.name }))}
          selected={form.parent_category_id}
          onSelect={val => setForm(f => f ? { ...f, parent_category_id: val } : f)}
          onClose={() => setShowPanel(false)}
        />
      )}
    </div>
  );
}
