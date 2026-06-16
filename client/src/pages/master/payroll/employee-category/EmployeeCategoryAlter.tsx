import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useCompany } from "@/context/CompanyContext";
import { FormRow, PageTitleBar, RightActionPanel, MasterSelectionPanel, MasterFormFooter, AlertBanner } from "@/components/ui";
import { useMasterShortcuts } from "@/hooks/useMasterShortcuts";
import type { EmployeeCategoryType } from "@/types/entities/Employee";

const inputCls = "w-full bg-transparent text-sm outline-none py-0.5 px-1.5 border border-transparent hover:border-zinc-200 focus:border-zinc-800 transition-colors bg-white/50 rounded";
const selectCls = "bg-transparent text-sm outline-none px-1.5 py-0.5 border border-transparent hover:border-zinc-200 focus:border-zinc-800 transition-colors bg-white/50 rounded w-24";

interface FormData {
  name: string;
  alias: string;
  allocate_revenue: "No" | "Yes";
  allocate_non_revenue: "No" | "Yes";
}

// Selection screen managed dynamically by MasterSelectionPanel

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
      allocate_revenue: !!c.allocate_revenue ? "Yes" : "No",
      allocate_non_revenue: !!c.allocate_non_revenue ? "Yes" : "No",
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
    if (!!selectedCategory.is_predefined) {
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
    if (!!selectedCategory.is_predefined) {
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

  useMasterShortcuts({
    onAccept: handleSubmit,
    onDelete: handleDelete,
    onQuit: () => {
      if (selectedCategory) {
        setSelectedCategory(null);
        setForm(null);
      } else {
        navigate("/master/alter");
      }
    },
  });

  if (!selectedCategory || !form) {
    const columns = [
      {
        key: "name",
        label: "Category Name",
        span: "col-span-8",
        render: (r: EmployeeCategoryType) => (
          <span className="font-bold text-zinc-950 uppercase flex items-center gap-1.5">
            {r.name}
            {!!r.is_predefined && (
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

    return (
      <MasterSelectionPanel
        title="Alter Employee Category"
        subtitle="Select Category to Alter"
        searchPlaceholder="Search categories by name…"
        items={categories}
        filterFn={(c, search) => c.name.toLowerCase().includes(search.toLowerCase())}
        columns={columns}
        onSelect={handleSelectCategory}
        onCancel={() => navigate("/master/alter")}
        onCreate={() => navigate("/master/create/employee-category")}
        createLabel="Create Category"
        rowKey={(r) => String(r.employee_category_id)}
        emptyMessage="No employee categories found."
      />
    );
  }

  const isPredefined = !!selectedCategory.is_predefined;

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

      {error && <AlertBanner type="error" message={error} onDismiss={() => setError(null)} />}
      {success && <AlertBanner type="success" message={success} onDismiss={() => setSuccess(null)} />}

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

      <MasterFormFooter
        onCancel={() => {
          setSelectedCategory(null);
          setForm(null);
        }}
        onSubmit={handleSubmit}
        onDelete={!isPredefined ? handleDelete : undefined}
        submitLabel="Accept"
        cancelLabel="Back"
        loading={loading}
        disabled={isPredefined}
      />
    </div>
  );
}
