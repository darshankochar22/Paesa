import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useCompany } from "@/context/CompanyContext";
import { FormRow, PageTitleBar, RightActionPanel } from "@/components/ui";
import { loadFormState, saveFormState, clearFormState } from "@/utils/formPersistence";
import type { VoucherTypeCreatePayload } from "@/types/entities/VoucherType";

const inputCls =
  "flex-1 bg-transparent text-sm outline-none px-1.5 py-0.5 border border-transparent hover:border-zinc-200 focus:border-zinc-800 transition-colors bg-white/50 rounded";
const selectCls =
  "bg-transparent text-sm outline-none px-1.5 py-0.5 border border-transparent hover:border-zinc-200 focus:border-zinc-800 transition-colors bg-white/50 rounded w-44";

const CATEGORIES = [
  "Attendance", "Contra", "Credit Note", "Debit Note", "Delivery Note",
  "Job Work In Order", "Job Work Out Order", "Journal", "Material In", "Material Out",
  "Memorandum", "Payment", "Payroll", "Physical Stock", "Purchase", "Purchase Order",
  "Receipt", "Receipt Note", "Rejections In", "Rejections Out", "Reversing Journal",
  "Sales", "Sales Order", "Stock Journal",
];

interface FormData {
  name: string;
  short_name: string;
  category: string;
  is_active: "Yes" | "No";
  numbering_method: "Automatic" | "Manual" | "None";
  parent_vt_id: string;
  use_effective_dates: "Yes" | "No";
  allow_zero_value_transactions: "Yes" | "No";
  make_voucher_optional: "Yes" | "No";
  allow_narration: "Yes" | "No";
  allow_narration_per_ledger: "Yes" | "No";
  print_after_save: "Yes" | "No";
}

const INITIAL: FormData = {
  name: "",
  short_name: "",
  category: "Receipt",
  is_active: "Yes",
  numbering_method: "Automatic",
  parent_vt_id: "",
  use_effective_dates: "No",
  allow_zero_value_transactions: "No",
  make_voucher_optional: "No",
  allow_narration: "Yes",
  allow_narration_per_ledger: "No",
  print_after_save: "No",
};

const toInt = (v: "Yes" | "No") => (v === "Yes" ? 1 : 0);

function YesNoSelect({
  value,
  onChange,
}: {
  value: "Yes" | "No";
  onChange: (v: "Yes" | "No") => void;
}) {
  return (
    <select
      className={selectCls}
      value={value}
      onChange={(e) => onChange(e.target.value as "Yes" | "No")}
    >
      <option>Yes</option>
      <option>No</option>
    </select>
  );
}

function CategoryDropdown({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (
        panelRef.current && !panelRef.current.contains(e.target as Node) &&
        buttonRef.current && !buttonRef.current.contains(e.target as Node)
      ) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") { e.stopPropagation(); setOpen(false); }
    };
    window.addEventListener("keydown", handler, true);
    return () => window.removeEventListener("keydown", handler, true);
  }, [open]);

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex-1 text-left text-sm px-1.5 py-0.5 border border-transparent hover:border-zinc-200 focus:border-zinc-800 focus:outline-none rounded bg-white/50 transition-colors"
      >
        {value || <span className="text-zinc-400">Select...</span>}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" aria-hidden />
          <div
            ref={panelRef}
            className="fixed top-0 right-0 h-full z-50 w-52 bg-white border-l border-zinc-300 shadow-2xl flex flex-col"
          >
            <div className="bg-zinc-700 text-white text-xs font-bold px-3 py-2 tracking-wide uppercase">
              List of Voucher Types
            </div>
            <ul className="flex-1 overflow-y-auto">
              {CATEGORIES.map((cat) => (
                <li
                  key={cat}
                  onClick={() => { onChange(cat); setOpen(false); }}
                  className={`px-3 py-1 text-sm cursor-pointer transition-colors ${
                    cat === value
                      ? "bg-zinc-700 text-white"
                      : "hover:bg-zinc-100 text-zinc-800"
                  }`}
                >
                  {cat}
                </li>
              ))}
            </ul>
          </div>
        </>
      )}
    </>
  );
}

export default function VoucherTypeCreate() {
  const navigate = useNavigate();
  const { selectedCompany } = useCompany();
  const companyId = selectedCompany?.company_id;
  const persistKey = companyId ? `voucherTypeCreate_${companyId}` : null;
  const hasRestored = useRef(false);

  const [form, setForm] = useState<FormData>(
    () => loadFormState<{ form: FormData }>(persistKey ?? "")?.form ?? INITIAL
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [parentVoucherTypes, setParentVoucherTypes] = useState<{ vt_id: number; name: string }[]>([]);

  useEffect(() => {
    if (!companyId) return;
    window.api.voucherType.getAll(companyId).then((res) => {
      if (res.success && res.voucherTypes) {
        setParentVoucherTypes(res.voucherTypes.map(vt => ({ vt_id: vt.vt_id!, name: vt.name })));
      }
    }).catch(() => {});
  }, [companyId]);

  useEffect(() => {
    if (!persistKey) return;
    if (!hasRestored.current) { hasRestored.current = true; return; }
    saveFormState(persistKey, { form });
  }, [persistKey, form]);

  const inheritFromParent = useCallback(async (parentId: number) => {
    const [parentRes, configRes] = await Promise.all([
      window.api.voucherType.getById(parentId),
      window.api.voucherType.getConfig(parentId),
    ]);
    setForm((f) => {
      const updates: Partial<FormData> = {};
      if (parentRes.success && parentRes.voucherType) {
        const p = parentRes.voucherType;
        updates.category = p.category || f.category;
        updates.numbering_method = (p.numbering_method as FormData["numbering_method"]) || f.numbering_method;
      }
      if (configRes.success && configRes.config) {
        const c = configRes.config;
        updates.use_effective_dates = c.use_effective_dates === 1 ? "Yes" : "No";
        updates.allow_zero_value_transactions = c.allow_zero_value_transactions === 1 ? "Yes" : "No";
        updates.make_voucher_optional = c.make_voucher_optional === 1 ? "Yes" : "No";
        updates.allow_narration = c.allow_narration === 1 ? "Yes" : "No";
        updates.allow_narration_per_ledger = c.allow_narration_per_ledger === 1 ? "Yes" : "No";
        updates.print_after_save = c.print_after_save === 1 ? "Yes" : "No";
      }
      return { ...f, ...updates };
    });
  }, []);

  const handleParentChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const val = e.target.value;
      setForm((f) => ({ ...f, parent_vt_id: val }));
      const numVal = val ? Number(val) : null;
      if (numVal) inheritFromParent(numVal);
    },
    [inheritFromParent]
  );

  const setField =
    (key: keyof FormData) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm((f) => ({ ...f, [key]: e.target.value }));

  const setToggle =
    (key: keyof FormData) => (v: "Yes" | "No") =>
      setForm((f) => ({ ...f, [key]: v }));

  const validate = (): string | null => {
    if (!form.name.trim()) return "Voucher type name is required.";
    if (!form.category.trim()) return "Category is required.";
    if (!companyId) return "No company selected.";
    return null;
  };

  const handleSubmit = useCallback(async () => {
    const err = validate();
    if (err) { setError(err); return; }
    setLoading(true);
    setError(null);
    try {
      const payload: VoucherTypeCreatePayload = {
        company_id:                    companyId!,
        name:                          form.name.trim(),
        short_name:                    form.short_name.trim() || undefined,
        category:                      form.category,
        numbering_method:              form.numbering_method,
        is_active:                     toInt(form.is_active),
        parent_vt_id:                  form.parent_vt_id ? Number(form.parent_vt_id) : null,
        use_effective_dates:           toInt(form.use_effective_dates),
        allow_zero_value_transactions: toInt(form.allow_zero_value_transactions),
        make_voucher_optional:         toInt(form.make_voucher_optional),
        allow_narration:               toInt(form.allow_narration),
        allow_narration_per_ledger:    toInt(form.allow_narration_per_ledger),
        print_after_save:              toInt(form.print_after_save),
      };
      const result = await window.api.voucherType.create(payload);

      if (result.success) {
        setSuccess(`Voucher Type "${form.name}" created successfully.`);
        setForm(INITIAL);
        if (persistKey) clearFormState(persistKey);
        hasRestored.current = false;
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
      if (e.key === "Escape") { e.preventDefault(); navigate("/master/create"); }
      if ((e.altKey || e.ctrlKey) && e.key.toLowerCase() === "a") { e.preventDefault(); handleSubmit(); }
      if (e.altKey && e.key.toLowerCase() === "c") { e.preventDefault(); navigate("/master/alter/voucher-type"); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handleSubmit, navigate]);

  const voucherActions = [
    { key: "Alt+A", label: "Accept",     onClick: handleSubmit },
    { key: "Alt+C", label: "Alter Mode", onClick: () => navigate("/master/alter/voucher-type") },
    { key: "Esc",   label: "Quit",       onClick: () => navigate("/master/create") },
  ];

  return (
    <div className="flex-1 flex flex-col h-full bg-white select-none">
      <PageTitleBar title="Voucher Type Creation" subtitle={selectedCompany?.name} />

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
        <div className="flex-1 flex flex-col min-w-0 bg-white overflow-y-auto">
          <div className="p-4 space-y-3 max-w-4xl">

            <FormRow label="Name" required labelWidth="w-40" className="flex items-center min-h-[26px]">
              <input autoFocus className={inputCls} value={form.name} onChange={setField("name")} placeholder="e.g. Cash Payment" />
            </FormRow>
            <FormRow label="(alias)" labelWidth="w-40" className="flex items-center min-h-[26px]">
              <input className={inputCls} value={form.short_name} onChange={setField("short_name")} maxLength={6} />
            </FormRow>

            <div className="grid grid-cols-3 border border-zinc-200 rounded overflow-visible mt-2">

              <div className="p-3 border-r border-zinc-200 space-y-1.5">
                <div className="text-[11px] font-bold text-zinc-500 mb-2 text-center">General</div>

                <FormRow label="Select type of voucher" labelWidth="w-48" className="flex items-center min-h-[26px]">
                  <CategoryDropdown value={form.category} onChange={(v) => setForm((f) => ({ ...f, category: v }))} />
                </FormRow>
                <FormRow label="Abbreviation" labelWidth="w-48" className="flex items-center min-h-[26px]">
                  <input className={inputCls} value={form.short_name} onChange={setField("short_name")} maxLength={6} />
                </FormRow>
                <FormRow label="Parent Voucher Type" labelWidth="w-48" className="flex items-center min-h-[26px]">
                  <select className={selectCls} value={form.parent_vt_id} onChange={handleParentChange}>
                    <option value="">-- None --</option>
                    {parentVoucherTypes.map((p) => (
                      <option key={p.vt_id} value={String(p.vt_id)}>{p.name}</option>
                    ))}
                  </select>
                </FormRow>
                <FormRow label="Activate this Voucher Type" labelWidth="w-48" className="flex items-center min-h-[26px]">
                  <YesNoSelect value={form.is_active} onChange={setToggle("is_active")} />
                </FormRow>
                <FormRow label="Method of voucher numbering" labelWidth="w-48" className="flex items-center min-h-[26px]">
                  <select className={selectCls} value={form.numbering_method} onChange={setField("numbering_method")}>
                    <option>Automatic</option>
                    <option>Manual</option>
                    <option>None</option>
                  </select>
                </FormRow>

                <div className="border-t border-zinc-100 my-1" />

                <FormRow label="Use effective dates for vouchers" labelWidth="w-48" className="flex items-center min-h-[26px]">
                  <YesNoSelect value={form.use_effective_dates} onChange={setToggle("use_effective_dates")} />
                </FormRow>
                <FormRow label="Allow zero-valued transactions" labelWidth="w-48" className="flex items-center min-h-[26px]">
                  <YesNoSelect value={form.allow_zero_value_transactions} onChange={setToggle("allow_zero_value_transactions")} />
                </FormRow>
                <FormRow label="Make this voucher type as 'Optional' by default" labelWidth="w-48" className="flex items-center min-h-[26px]">
                  <YesNoSelect value={form.make_voucher_optional} onChange={setToggle("make_voucher_optional")} />
                </FormRow>
                <FormRow label="Allow narration in voucher" labelWidth="w-48" className="flex items-center min-h-[26px]">
                  <YesNoSelect value={form.allow_narration} onChange={setToggle("allow_narration")} />
                </FormRow>
                <FormRow label="Provide narrations for each ledger in voucher" labelWidth="w-48" className="flex items-center min-h-[26px]">
                  <YesNoSelect value={form.allow_narration_per_ledger} onChange={setToggle("allow_narration_per_ledger")} />
                </FormRow>
              </div>

              <div className="p-3 border-r border-zinc-200 space-y-1.5">
                <div className="text-[11px] font-bold text-zinc-500 mb-2 text-center">Printing</div>
                <FormRow label="Print voucher after saving" labelWidth="w-48" className="flex items-center min-h-[26px]">
                  <YesNoSelect value={form.print_after_save} onChange={setToggle("print_after_save")} />
                </FormRow>
              </div>

              <div className="p-3 space-y-1.5">
                <div className="text-[11px] font-bold text-zinc-500 mb-2 text-center">Name of Class</div>
              </div>

            </div>
          </div>
          <div className="flex-1" />
        </div>

        <RightActionPanel actions={voucherActions} />
      </div>

      <div className="border-t border-zinc-200 p-3 flex justify-between items-center bg-zinc-50">
        <button
          onClick={() => navigate("/master/create")}
          className="text-xs text-zinc-500 hover:text-zinc-800 transition-colors font-medium"
        >
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