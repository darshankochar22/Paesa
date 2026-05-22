import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useCompany } from "@/context/CompanyContext";
import { PageTitleBar, RightActionPanel, SearchInput, DataTable, FormRow } from "@/components/ui";
import type { EmployeeCategoryType } from "@/types/entities/Employee";

const inputCls = "w-full bg-transparent text-sm outline-none py-0.5 px-1.5 border border-transparent hover:border-zinc-200 focus:border-zinc-800 transition-colors bg-white/50 rounded";
const selectCls = "bg-transparent text-sm outline-none px-1.5 py-0.5 border border-transparent hover:border-zinc-200 focus:border-zinc-800 transition-colors bg-white/50 rounded w-24";

interface FormData {
  name: string;
  alias: string;
  allocate_revenue: "No" | "Yes";
  allocate_non_revenue: "No" | "Yes";
}

function SelectionPanel({
  categories,
  onSelect,
  onCancel,
  onCreate,
}: {
  categories: EmployeeCategoryType[];
  onSelect: (c: EmployeeCategoryType) => void;
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

  const filtered = categories.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  const columns = [
    {
      key: "name",
      label: "Category Name",
      span: "col-span-8",
      render: (r: EmployeeCategoryType) => (
        <span className="font-bold text-zinc-950 uppercase flex items-center gap-1.5">
          {r.name}
          {r.is_predefined === 1 && (
            <span className="text-[9px] font-bold px-1 py-0.2 bg-zinc-100 text-zinc-500 rounded tracking-wider border border-zinc-200">
              PREDEFINED
            </span>
          )}
        </span>
      ),
    },
    {
      key: "alias",
      label: "Alias",
      span: "col-span-4",
      render: (r: EmployeeCategoryType) => (
        <span className="text-zinc-500">{r.alias || "—"}</span>
      ),
    },
  ];

  const selectionActions = [
    { key: "Alt+C", label: "Create Category", onClick: onCreate },
    { key: "Esc", label: "Quit", onClick: onCancel },
  ];

  return (
    <div className="flex-1 flex flex-col h-full bg-white select-none">
      <PageTitleBar title="Alter Employee Category" subtitle="Select Category to Alter" />

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
            rowKey={(r: EmployeeCategoryType) => String(r.employee_category_id)}
            onRowClick={onSelect}
            emptyMessage="No employee categories found."
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

export default function EmployeeCategoryAlter() {
  const navigate = useNavigate();
  const { selectedCompany } = useCompany();
  const companyId = selectedCompany?.company_id;

  const [categories, setCategories] = useState<EmployeeCategoryType[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<EmployeeCategoryType | null>(null);
  const [form, setForm] = useState<FormData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const loadCategories = useCallback(async () => {
    if (!companyId) return;
    const result = await window.api.employeeCategory.getAll(companyId);
    if (result.success) {
      setCategories(result.employeeCategories ?? []);
    }
  }, [companyId]);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  const handleSelectCategory = (c: EmployeeCategoryType) => {
    setSelectedCategory(c);
    setForm({
      name: c.name ?? "",
      alias: c.alias ?? "",
      allocate_revenue: c.allocate_revenue === 1 ? "Yes" : "No",
      allocate_non_revenue: c.allocate_non_revenue === 1 ? "Yes" : "No",
    });
    setError(null);
    setSuccess(null);
  };

  const setField = (key: keyof FormData) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => setForm((f) => (f ? { ...f, [key]: e.target.value } : f));

  const validate = (): string | null => {
    if (!form?.name.trim()) return "Name is required.";
    if (!companyId) return "No company selected.";
    return null;
  };

  const handleSubmit = useCallback(async () => {
    if (!form || !selectedCategory) return;
    if (selectedCategory.is_predefined === 1) {
      setError("Predefined categories cannot be altered.");
      return;
    }

    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const result = await window.api.employeeCategory.update({
        employee_category_id: selectedCategory.employee_category_id,
        company_id: companyId,
        name: form.name.trim(),
        alias: form.alias.trim() || undefined,
        allocate_revenue: form.allocate_revenue === "Yes" ? 1 : 0,
        allocate_non_revenue: form.allocate_non_revenue === "Yes" ? 1 : 0,
      });

      if (result.success) {
        setSuccess(`Employee Category "${form.name}" updated successfully.`);
        await loadCategories();
        setTimeout(() => {
          setSuccess(null);
          setSelectedCategory(null);
          setForm(null);
        }, 1500);
      } else {
        setError(result.error || "Failed to update employee category.");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unexpected error.");
    } finally {
      setLoading(false);
    }
  }, [form, selectedCategory, companyId, loadCategories]);

  const handleDelete = useCallback(async () => {
    if (!selectedCategory) return;
    if (selectedCategory.is_predefined === 1) {
      setError("Predefined categories cannot be deleted.");
      return;
    }

    if (!window.confirm(`Delete "${selectedCategory.name}"? This cannot be undone.`)) return;

    setLoading(true);
    setError(null);
    try {
      const result = await window.api.employeeCategory.delete(
        selectedCategory.employee_category_id!
      );
      if (result.success) {
        setSuccess("Employee Category deleted successfully.");
        await loadCategories();
        setTimeout(() => {
          setSuccess(null);
          setSelectedCategory(null);
          setForm(null);
        }, 1500);
      } else {
        setError(result.error || "Failed to delete employee category.");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unexpected error.");
    } finally {
      setLoading(false);
    }
  }, [selectedCategory, loadCategories]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        if (selectedCategory) {
          setSelectedCategory(null);
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
  }, [handleSubmit, handleDelete, navigate, selectedCategory]);

  if (!selectedCategory || !form) {
    return (
      <SelectionPanel
        categories={categories}
        onSelect={handleSelectCategory}
        onCancel={() => navigate("/master/alter")}
        onCreate={() => navigate("/master/create/employee-category")}
      />
    );
  }

  const isPredefined = selectedCategory.is_predefined === 1;

  const alterActions = [
    ...(isPredefined ? [] : [{ key: "Alt+A", label: "Accept", onClick: handleSubmit }]),
    ...(isPredefined ? [] : [{ key: "Alt+D", label: "Delete", onClick: handleDelete }]),
    { key: "Esc", label: "Back", onClick: () => { setSelectedCategory(null); setForm(null); } },
  ];

  return (
    <div className="flex flex-col h-full relative overflow-hidden bg-white select-none">
      <PageTitleBar
        title={`Employee Category Alteration: ${selectedCategory.name}`}
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
          ℹ️ Predefined categories cannot be altered or deleted.
        </div>
      )}

      <div className="flex-1 flex min-h-0">
        <div className="flex-1 overflow-y-auto p-3 space-y-1.5 max-w-2xl bg-white border-r border-zinc-100">
          <FormRow label="Name" required labelWidth="w-56" className="flex items-center min-h-[26px]">
            <input
              autoFocus={!isPredefined}
              disabled={isPredefined}
              className={`${inputCls} ${isPredefined ? "text-zinc-500 cursor-not-allowed bg-zinc-50" : ""}`}
              value={form.name}
              onChange={setField("name")}
            />
          </FormRow>
          <FormRow label="(alias)" labelWidth="w-56" className="flex items-center min-h-[26px]">
            <input
              disabled={isPredefined}
              className={`${inputCls} ${isPredefined ? "text-zinc-500 cursor-not-allowed bg-zinc-50" : ""}`}
              value={form.alias}
              onChange={setField("alias")}
            />
          </FormRow>
          <FormRow label="Allocate Revenue Items" labelWidth="w-56" className="flex items-center min-h-[26px]">
            <select
              disabled={isPredefined}
              className={`${selectCls} ${isPredefined ? "text-zinc-500 cursor-not-allowed bg-zinc-50" : ""}`}
              value={form.allocate_revenue}
              onChange={setField("allocate_revenue")}
            >
              <option>No</option>
              <option>Yes</option>
            </select>
          </FormRow>
          <FormRow label="Allocate Non-Revenue Items" labelWidth="w-56" className="flex items-center min-h-[26px]">
            <select
              disabled={isPredefined}
              className={`${selectCls} ${isPredefined ? "text-zinc-500 cursor-not-allowed bg-zinc-50" : ""}`}
              value={form.allocate_non_revenue}
              onChange={setField("allocate_non_revenue")}
            >
              <option>No</option>
              <option>Yes</option>
            </select>
          </FormRow>
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
        ) : (
          <div />
        )}
        <div className="flex gap-3">
          <button
            onClick={() => {
              setSelectedCategory(null);
              setForm(null);
            }}
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
