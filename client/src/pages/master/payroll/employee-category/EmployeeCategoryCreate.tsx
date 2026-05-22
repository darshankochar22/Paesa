import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useCompany } from "@/context/CompanyContext";
import { FormRow, PageTitleBar, RightActionPanel } from "@/components/ui";

const inputCls = "flex-1 bg-transparent text-sm outline-none px-1.5 py-0.5 border border-transparent hover:border-zinc-200 focus:border-zinc-800 transition-colors bg-white/50 rounded";
const selectCls = "bg-transparent text-sm outline-none px-1.5 py-0.5 border border-transparent hover:border-zinc-200 focus:border-zinc-800 transition-colors bg-white/50 rounded w-24";

interface FormData {
  name: string;
  alias: string;
  allocate_revenue: "No" | "Yes";
  allocate_non_revenue: "No" | "Yes";
}

const INITIAL: FormData = {
  name: "",
  alias: "",
  allocate_revenue: "No",
  allocate_non_revenue: "No",
};

export default function EmployeeCategoryCreate() {
  const navigate = useNavigate();
  const { selectedCompany } = useCompany();
  const [form, setForm] = useState<FormData>(INITIAL);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const companyId = selectedCompany?.company_id;

  const setField = (key: keyof FormData) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const validate = (): string | null => {
    if (!form.name.trim()) return "Name is required.";
    if (!companyId) return "No company selected.";
    return null;
  };

  const handleSubmit = useCallback(async () => {
    const err = validate();
    if (err) {
      setError(err);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const result = await window.api.employeeCategory.create({
        company_id: companyId!,
        name: form.name.trim(),
        alias: form.alias.trim() || undefined,
        allocate_revenue: form.allocate_revenue === "Yes" ? 1 : 0,
        allocate_non_revenue: form.allocate_non_revenue === "Yes" ? 1 : 0,
      });

      if (result.success) {
        setSuccess(`Employee Category "${form.name}" created successfully.`);
        setForm(INITIAL);
        setTimeout(() => setSuccess(null), 3000);
      } else {
        setError(result.error || "Failed to create employee category.");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "An unexpected error occurred.");
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
        navigate("/master/alter/employee-category");
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handleSubmit, navigate]);

  const categoryActions = [
    { key: "Alt+A", label: "Accept", onClick: handleSubmit },
    { key: "Alt+C", label: "Alter Mode", onClick: () => navigate("/master/alter/employee-category") },
    { key: "Esc", label: "Quit", onClick: () => navigate("/master/create") },
  ];

  return (
    <div className="flex-1 flex flex-col h-full bg-white select-none">
      <PageTitleBar title="Employee Category Creation" subtitle={selectedCompany?.name} />

      {error && (
        <div className="px-3 py-1.5 border-b border-red-200 bg-red-50 text-red-700 text-xs flex justify-between items-center font-mono">
          <span>• {error}</span>
          <button onClick={() => setError(null)} className="text-red-500 hover:text-red-700 text-xs font-bold font-sans">&times;</button>
        </div>
      )}
      {success && (
        <div className="px-3 py-1.5 border-b border-green-200 bg-green-50 text-green-700 text-xs flex justify-between items-center font-mono">
          <span>• {success}</span>
          <button onClick={() => setSuccess(null)} className="text-green-500 hover:text-green-700 text-xs font-bold font-sans">&times;</button>
        </div>
      )}

      <div className="flex-1 flex min-h-0">
        <div className="flex-1 flex flex-col min-w-0 bg-white">
          <div className="p-3 space-y-1.5 max-w-2xl">
            <FormRow label="Name" required labelWidth="w-56" className="flex items-center min-h-[26px]">
              <input autoFocus className={inputCls} value={form.name} onChange={setField("name")} placeholder="e.g. Primary Category" />
            </FormRow>
            <FormRow label="(alias)" labelWidth="w-56" className="flex items-center min-h-[26px]">
              <input className={inputCls} value={form.alias} onChange={setField("alias")} />
            </FormRow>
            <FormRow label="Allocate Revenue Items" labelWidth="w-56" className="flex items-center min-h-[26px]">
              <select className={selectCls} value={form.allocate_revenue} onChange={setField("allocate_revenue")}>
                <option>No</option>
                <option>Yes</option>
              </select>
            </FormRow>
            <FormRow label="Allocate Non-Revenue Items" labelWidth="w-56" className="flex items-center min-h-[26px]">
              <select className={selectCls} value={form.allocate_non_revenue} onChange={setField("allocate_non_revenue")}>
                <option>No</option>
                <option>Yes</option>
              </select>
            </FormRow>
          </div>
          <div className="flex-1" />
        </div>

        <RightActionPanel actions={categoryActions} />
      </div>

      <div className="border-t border-zinc-200 p-3 flex justify-between items-center bg-zinc-50">
        <button onClick={() => navigate("/master/create")} className="text-xs text-zinc-500 hover:text-zinc-800 transition-colors font-medium">
          &larr; Back to Masters
        </button>
        <button
          onClick={handleSubmit}
          disabled={loading}
          className="text-sm px-6 py-1.5 rounded bg-black text-white hover:bg-zinc-800 disabled:opacity-50 transition-colors font-medium font-sans"
        >
          {loading ? "Saving..." : "Create"}
        </button>
      </div>
    </div>
  );
}
