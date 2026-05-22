import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useCompany } from "@/context/CompanyContext";
import { FormRow, PageTitleBar, RightActionPanel } from "@/components/ui";

const inputCls = "flex-1 bg-transparent text-sm outline-none px-1.5 py-0.5 border border-transparent hover:border-zinc-200 focus:border-zinc-800 transition-colors bg-white/50 rounded ";
const selectCls = "bg-transparent text-sm outline-none px-1.5 py-0.5 border border-transparent hover:border-zinc-200 focus:border-zinc-800 transition-colors bg-white/50 rounded w-44 ";

interface FormData {
  name: string;
  short_name: string;
  category: string;
  default_voucher_class: string;
  affects_inventory: "No" | "Yes";
  affects_accounting: "No" | "Yes";
  affects_gst: "No" | "Yes";
  numbering_method: "Automatic" | "Manual" | "None";
  numbering_prefix: string;
  numbering_suffix: string;
  starts_with: string;
}

const INITIAL: FormData = {
  name: "",
  short_name: "",
  category: "Receipt",
  default_voucher_class: "",
  affects_inventory: "No",
  affects_accounting: "Yes",
  affects_gst: "No",
  numbering_method: "Automatic",
  numbering_prefix: "",
  numbering_suffix: "",
  starts_with: "1",
};

export default function VoucherTypeCreate() {
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
    if (!form.name.trim()) return "Voucher Type name is required.";
    if (!form.category.trim()) return "Category is required.";
    if (!companyId) return "No company selected.";
    const startNum = Number(form.starts_with);
    if (isNaN(startNum) || startNum < 0) return "Starts with must be a positive number.";
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
      const result = await window.api.voucherType.create({
        company_id: companyId!,
        name: form.name.trim(),
        short_name: form.short_name.trim() || undefined,
        category: form.category,
        default_voucher_class: form.default_voucher_class.trim() || undefined,
        affects_inventory: form.affects_inventory === "Yes" ? 1 : 0,
        affects_accounting: form.affects_accounting === "Yes" ? 1 : 0,
        affects_gst: form.affects_gst === "Yes" ? 1 : 0,
        numbering_method: form.numbering_method,
        numbering_prefix: form.numbering_prefix.trim() || undefined,
        numbering_suffix: form.numbering_suffix.trim() || undefined,
        starts_with: Number(form.starts_with) || 1,
      });

      if (result.success) {
        setSuccess(`Voucher Type "${form.name}" created successfully.`);
        setForm(INITIAL);
        setTimeout(() => setSuccess(null), 3000);
      } else {
        setError(result.error || "Failed to create voucher type.");
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
        navigate("/master/alter/voucher-type");
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handleSubmit, navigate]);

  const voucherActions = [
    { key: "Alt+A", label: "Accept", onClick: handleSubmit },
    { key: "Alt+C", label: "Alter Mode", onClick: () => navigate("/master/alter/voucher-type") },
    { key: "Esc", label: "Quit", onClick: () => navigate("/master/create") },
  ];

  const CATEGORIES = ["Receipt", "Payment", "Contra", "Journal", "Sales", "Purchase", "Credit Note", "Debit Note", "Stock Journal", "Delivery Note", "Receipt Note", "Memorandum", "Payroll"];

  return (
    <div className="flex-1 flex flex-col h-full bg-white select-none">
      <PageTitleBar title="Voucher Type Creation" subtitle={selectedCompany?.name} />

      {error && (
        <div className="px-3 py-1.5 border-b border-red-200 bg-red-50 text-red-700 text-xs flex justify-between items-center">
          <span>• {error}</span>
          <button onClick={() => setError(null)} className="text-red-500 hover:text-red-700 text-xs font-bold font-sans">&times;</button>
        </div>
      )}
      {success && (
        <div className="px-3 py-1.5 border-b border-green-200 bg-green-50 text-green-700 text-xs flex justify-between items-center">
          <span>• {success}</span>
          <button onClick={() => setSuccess(null)} className="text-green-500 hover:text-green-700 text-xs font-bold font-sans">&times;</button>
        </div>
      )}

      <div className="flex-1 flex min-h-0">
        <div className="flex-1 flex flex-col min-w-0 bg-white">
          <div className="p-3 space-y-1.5 max-w-2xl">
            <FormRow label="Name" required labelWidth="w-64" className="flex items-center min-h-[26px]">
              <input autoFocus className={inputCls} value={form.name} onChange={setField("name")} placeholder="e.g. Sales (GST)" />
            </FormRow>
            <FormRow label="Short Name" labelWidth="w-64" className="flex items-center min-h-[26px]">
              <input className={inputCls} value={form.short_name} onChange={setField("short_name")} placeholder="e.g. SGST" maxLength={4} />
            </FormRow>
            <FormRow label="Voucher Type Category" required labelWidth="w-64" className="flex items-center min-h-[26px]">
              <select className={selectCls} value={form.category} onChange={setField("category")}>
                {CATEGORIES.map((cat) => (
                  <option key={cat}>{cat}</option>
                ))}
              </select>
            </FormRow>
            <FormRow label="Default Voucher Class" labelWidth="w-64" className="flex items-center min-h-[26px]">
              <input className={inputCls} value={form.default_voucher_class} onChange={setField("default_voucher_class")} placeholder="e.g. Export Class" />
            </FormRow>
            <FormRow label="Method of Voucher Numbering" labelWidth="w-64" className="flex items-center min-h-[26px]">
              <select className={selectCls} value={form.numbering_method} onChange={setField("numbering_method")}>
                <option>Automatic</option>
                <option>Manual</option>
                <option>None</option>
              </select>
            </FormRow>
            <FormRow label="Starts With" labelWidth="w-64" className="flex items-center min-h-[26px]">
              <input className={inputCls} type="number" min="1" value={form.starts_with} onChange={setField("starts_with")} />
            </FormRow>
            <FormRow label="Numbering Prefix (if Auto)" labelWidth="w-64" className="flex items-center min-h-[26px]">
              <input className={inputCls} value={form.numbering_prefix} onChange={setField("numbering_prefix")} placeholder="e.g. GST/" />
            </FormRow>
            <FormRow label="Numbering Suffix (if Auto)" labelWidth="w-64" className="flex items-center min-h-[26px]">
              <input className={inputCls} value={form.numbering_suffix} onChange={setField("numbering_suffix")} placeholder="e.g. /26-27" />
            </FormRow>
            <div className="border-t border-zinc-100 my-2 pt-2 text-[10px] uppercase font-bold text-zinc-400 select-none">Effects & Accounting</div>
            <FormRow label="Affects Inventory" labelWidth="w-64" className="flex items-center min-h-[26px]">
              <select className={selectCls} value={form.affects_inventory} onChange={setField("affects_inventory")}>
                <option>No</option>
                <option>Yes</option>
              </select>
            </FormRow>
            <FormRow label="Affects Accounting" labelWidth="w-64" className="flex items-center min-h-[26px]">
              <select className={selectCls} value={form.affects_accounting} onChange={setField("affects_accounting")}>
                <option>Yes</option>
                <option>No</option>
              </select>
            </FormRow>
            <FormRow label="Affects GST" labelWidth="w-64" className="flex items-center min-h-[26px]">
              <select className={selectCls} value={form.affects_gst} onChange={setField("affects_gst")}>
                <option>No</option>
                <option>Yes</option>
              </select>
            </FormRow>
          </div>
          <div className="flex-1" />
        </div>

        <RightActionPanel actions={voucherActions} />
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
