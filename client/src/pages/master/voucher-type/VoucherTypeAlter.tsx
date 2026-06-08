import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useCompany } from "@/context/CompanyContext";
import { PageTitleBar, RightActionPanel, SearchInput, DataTable, FormRow } from "@/components/ui";
import type {
  VoucherTypeType,
  VoucherTypeUpdatePayload,
  VoucherTypeConfigUpdatePayload,
} from "@/types/entities/VoucherType";

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
}

interface ConfigData {
  use_effective_dates: "Yes" | "No";
  allow_zero_value_transactions: "Yes" | "No";
  make_voucher_optional: "Yes" | "No";
  allow_narration: "Yes" | "No";
  allow_narration_per_ledger: "Yes" | "No";
  print_after_save: "Yes" | "No";
}


const toInt = (v: "Yes" | "No") => (v === "Yes" ? 1 : 0);

function YesNoSelect({
  value,
  onChange,
  disabled,
}: {
  value: "Yes" | "No";
  onChange: (v: "Yes" | "No") => void;
  disabled?: boolean;
}) {
  return (
    <select
      className={`${selectCls} ${disabled ? "text-zinc-400 cursor-not-allowed bg-zinc-50" : ""}`}
      value={value}
      disabled={disabled}
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
  disabled,
}: {
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
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

  if (disabled) {
    return (
      <span className={`${inputCls} text-zinc-400 cursor-not-allowed bg-zinc-50`}>
        {value}
      </span>
    );
  }

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


function SelectionPanel({
  voucherTypes,
  onSelect,
  onCancel,
  onCreate,
}: {
  voucherTypes: VoucherTypeType[];
  onSelect: (vt: VoucherTypeType) => void;
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

  const filtered = voucherTypes.filter(
    (vt) =>
      vt.name.toLowerCase().includes(search.toLowerCase()) ||
      (vt.category && vt.category.toLowerCase().includes(search.toLowerCase()))
  );

  const columns = [
    {
      key: "name",
      label: "Voucher Type",
      span: "col-span-6",
      render: (r: VoucherTypeType) => (
        <span className="font-bold text-zinc-950 uppercase flex items-center gap-1.5">
          {r.name}
          {r.is_predefined === 1 && (
            <span className="text-[9px] font-bold px-1.5 py-0.2 bg-zinc-100 text-zinc-500 rounded tracking-wider border border-zinc-200">
              PREDEFINED
            </span>
          )}
        </span>
      ),
    },
    {
      key: "short_name",
      label: "Short Name",
      span: "col-span-3",
      render: (r: VoucherTypeType) => (
        <span className="text-zinc-500 font-semibold uppercase">{r.short_name || "—"}</span>
      ),
    },
    {
      key: "category",
      label: "Category",
      span: "col-span-3",
      render: (r: VoucherTypeType) => (
        <span className="text-zinc-500">{r.category}</span>
      ),
    },
  ];

  const selectionActions = [
    { key: "Alt+C", label: "Create Voucher Type", onClick: onCreate },
    { key: "Esc",   label: "Quit",                onClick: onCancel },
  ];

  return (
    <div className="flex-1 flex flex-col h-full bg-white select-none">
      <PageTitleBar title="Alter Voucher Type" subtitle="Select Voucher Type to Alter" />

      <div className="p-3 bg-zinc-50 border-b border-zinc-200 shrink-0">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search voucher types by name or category…"
          autoFocus
        />
      </div>

      <div className="flex-1 flex min-h-0">
        <div className="flex-1 flex flex-col bg-white border-r border-zinc-100">
          <DataTable
            columns={columns}
            rows={filtered}
            rowKey={(r: VoucherTypeType) => String(r.vt_id)}
            onRowClick={onSelect}
            emptyMessage="No voucher types found."
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

export default function VoucherTypeAlter() {
  const navigate = useNavigate();
  const { selectedCompany } = useCompany();
  const companyId = selectedCompany?.company_id;

  const [voucherTypes, setVoucherTypes] = useState<VoucherTypeType[]>([]);
  const [selectedVT, setSelectedVT] = useState<VoucherTypeType | null>(null);
  const [form, setForm] = useState<FormData | null>(null);
  const [configForm, setConfigForm] = useState<ConfigData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [parentVoucherTypes, setParentVoucherTypes] = useState<{ vt_id: number; name: string }[]>([]);

  const loadVoucherTypes = useCallback(async () => {
    if (!companyId) return;
    const result = await window.api.voucherType.getAll(companyId);
    if (result.success) {
      setVoucherTypes(result.voucherTypes ?? []);
      setParentVoucherTypes((result.voucherTypes ?? []).map(vt => ({ vt_id: vt.vt_id!, name: vt.name })));
    }
  }, [companyId]);

  useEffect(() => { loadVoucherTypes(); }, [loadVoucherTypes]);

  const handleSelectVT = async (vt: VoucherTypeType) => {
    setSelectedVT(vt);
    setForm({
      name:             vt.name ?? "",
      short_name:       vt.short_name ?? "",
      category:         vt.category ?? "Receipt",
      is_active:        vt.is_active === 1 ? "Yes" : "No",
      numbering_method: (vt.numbering_method as FormData["numbering_method"]) ?? "Automatic",
      parent_vt_id:     vt.parent_vt_id ? String(vt.parent_vt_id) : "",
    });

    try {
      const configRes = await window.api.voucherType.getConfig(vt.vt_id!);
      if (configRes.success && configRes.config) {
        const c = configRes.config;
        setConfigForm({
          use_effective_dates:           c.use_effective_dates === 1           ? "Yes" : "No",
          allow_zero_value_transactions: c.allow_zero_value_transactions === 1 ? "Yes" : "No",
          make_voucher_optional:         c.make_voucher_optional === 1         ? "Yes" : "No",
          allow_narration:               c.allow_narration === 1               ? "Yes" : "No",
          allow_narration_per_ledger:    c.allow_narration_per_ledger === 1    ? "Yes" : "No",
          print_after_save:              c.print_after_save === 1              ? "Yes" : "No",
        });
      } else {
        setConfigForm(null);
      }
    } catch {
      setConfigForm(null);
    }

    setError(null);
    setSuccess(null);
  };

  const setField =
    (key: keyof FormData) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm((f) => (f ? { ...f, [key]: e.target.value } : f));

  const handleParentChange = useCallback(
    async (e: React.ChangeEvent<HTMLSelectElement>) => {
      const val = e.target.value;
      setForm((f) => (f ? { ...f, parent_vt_id: val } : f));
      const numVal = val ? Number(val) : null;
      if (!numVal) return;
      const [parentRes, configRes] = await Promise.all([
        window.api.voucherType.getById(numVal),
        window.api.voucherType.getConfig(numVal),
      ]);
      setForm((f) => {
        if (!f) return f;
        const updates: Partial<FormData> = { parent_vt_id: val };
        if (parentRes.success && parentRes.voucherType) {
          updates.category = parentRes.voucherType.category || f.category;
          updates.numbering_method = (parentRes.voucherType.numbering_method as FormData["numbering_method"]) || f.numbering_method;
        }
        return { ...f, ...updates };
      });
      if (configRes.success && configRes.config) {
        const c = configRes.config;
        setConfigForm((cf) =>
          cf ? {
            use_effective_dates: c.use_effective_dates === 1 ? "Yes" : "No",
            allow_zero_value_transactions: c.allow_zero_value_transactions === 1 ? "Yes" : "No",
            make_voucher_optional: c.make_voucher_optional === 1 ? "Yes" : "No",
            allow_narration: c.allow_narration === 1 ? "Yes" : "No",
            allow_narration_per_ledger: c.allow_narration_per_ledger === 1 ? "Yes" : "No",
            print_after_save: c.print_after_save === 1 ? "Yes" : "No",
          } : cf
        );
      }
    },
    []
  );

  const setToggle =
    (key: keyof FormData | keyof ConfigData, target: "form" | "config") =>
    (v: "Yes" | "No") => {
      if (target === "form") setForm((f) => (f ? { ...f, [key]: v } : f));
      else setConfigForm((c) => (c ? { ...c, [key]: v } : c));
    };

  const validate = (): string | null => {
    if (!form?.name.trim()) return "Voucher Type name is required.";
    if (!companyId) return "No company selected.";
    return null;
  };

  const handleSubmit = useCallback(async () => {
    if (!form || !selectedVT) return;
    const err = validate();
    if (err) { setError(err); return; }

    setLoading(true);
    setError(null);
    try {
      if (selectedVT.is_predefined !== 1) {
        const payload: VoucherTypeUpdatePayload = {
          vt_id:            selectedVT.vt_id!,
          name:             form.name.trim(),
          short_name:       form.short_name.trim() || undefined,
          category:         form.category,
          numbering_method: form.numbering_method,
          is_active:        toInt(form.is_active),
          parent_vt_id:     form.parent_vt_id ? Number(form.parent_vt_id) : null,
        };
        const result = await window.api.voucherType.update(payload);
        if (!result.success) {
          setError(result.error || "Failed to update voucher type.");
          return;
        }
      }

      if (configForm) {
        const configPayload: VoucherTypeConfigUpdatePayload = {
          voucher_type_id:               selectedVT.vt_id!,
          use_effective_dates:           toInt(configForm.use_effective_dates),
          allow_zero_value_transactions: toInt(configForm.allow_zero_value_transactions),
          make_voucher_optional:         toInt(configForm.make_voucher_optional),
          allow_narration:               toInt(configForm.allow_narration),
          allow_narration_per_ledger:    toInt(configForm.allow_narration_per_ledger),
          print_after_save:              toInt(configForm.print_after_save),
        };
        const configRes = await window.api.voucherType.updateConfig(configPayload);
        if (!configRes.success) {
          setError(configRes.error || "Failed to update config.");
          return;
        }
      }

      setSuccess(`Voucher Type "${form.name}" updated successfully.`);
      await loadVoucherTypes();
      setTimeout(() => {
        setSuccess(null);
        setSelectedVT(null);
        setForm(null);
        setConfigForm(null);
      }, 1500);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  }, [form, configForm, selectedVT, companyId, loadVoucherTypes]);

  const handleDelete = useCallback(async () => {
    if (!selectedVT) return;
    if (selectedVT.is_predefined === 1) {
      setError("Predefined voucher types cannot be deleted.");
      return;
    }
    if (!window.confirm(`Delete Voucher Type "${selectedVT.name}"?`)) return;

    setLoading(true);
    setError(null);
    try {
      const result = await window.api.voucherType.delete(selectedVT.vt_id!);
      if (result.success) {
        setSuccess("Voucher Type deleted successfully.");
        await loadVoucherTypes();
        setTimeout(() => {
          setSuccess(null);
          setSelectedVT(null);
          setForm(null);
          setConfigForm(null);
        }, 1500);
      } else {
        setError(result.error || "Failed to delete voucher type.");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unexpected error.");
    } finally {
      setLoading(false);
    }
  }, [selectedVT, loadVoucherTypes]);

  const resetSelection = () => {
    setSelectedVT(null);
    setForm(null);
    setConfigForm(null);
    setError(null);
    setSuccess(null);
  };

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        if (selectedVT) resetSelection();
        else navigate("/master/alter");
      }
      if ((e.altKey || e.ctrlKey) && e.key.toLowerCase() === "a") { e.preventDefault(); handleSubmit(); }
      if (e.altKey && e.key.toLowerCase() === "d") { e.preventDefault(); handleDelete(); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handleSubmit, handleDelete, navigate, selectedVT]);

  if (!selectedVT || !form) {
    return (
      <SelectionPanel
        voucherTypes={voucherTypes}
        onSelect={handleSelectVT}
        onCancel={() => navigate("/master/alter")}
        onCreate={() => navigate("/master/create/voucher-type")}
      />
    );
  }

  const isPredefined = selectedVT.is_predefined === 1;

  const alterActions = [
    { key: "Alt+A", label: "Accept", onClick: handleSubmit },
    ...(isPredefined ? [] : [{ key: "Alt+D", label: "Delete", onClick: handleDelete }]),
    { key: "Esc",   label: "Back",   onClick: resetSelection },
  ];

  return (
    <div className="flex-1 flex flex-col h-full bg-white select-none">
      <PageTitleBar
        title={`Voucher Type Alteration: ${selectedVT.name}`}
        subtitle={selectedCompany?.name}
      />

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

      {isPredefined && (
        <div className="px-3 py-1.5 border-b border-zinc-200 bg-zinc-50 text-zinc-500 text-[10px] uppercase font-bold shrink-0 select-none">
          ℹ️ Predefined — identity is locked, configurations below can still be changed.
        </div>
      )}

      <div className="flex-1 flex min-h-0">
        <div className="flex-1 flex flex-col min-w-0 bg-white overflow-y-auto">
          <div className="p-4 space-y-3 max-w-4xl">

            <div className="grid grid-cols-3 border border-zinc-200 rounded overflow-visible">
              <div className="p-3 border-r border-zinc-200 space-y-1.5">
                <div className="text-[11px] font-bold text-zinc-500 mb-2 text-center">General</div>

                <FormRow label="Name" required labelWidth="w-48" className="flex items-center min-h-[26px]">
                  <input
                    autoFocus={!isPredefined}
                    disabled={isPredefined}
                    className={`${inputCls} ${isPredefined ? "text-zinc-400 cursor-not-allowed bg-zinc-50" : ""}`}
                    value={form.name}
                    onChange={setField("name")}
                  />
                </FormRow>
                <FormRow label="Select type of voucher" labelWidth="w-48" className="flex items-center min-h-[26px]">
                  <CategoryDropdown
                    value={form.category}
                    onChange={(v) => setForm((f) => (f ? { ...f, category: v } : f))}
                    disabled={isPredefined}
                  />
                </FormRow>
                <FormRow label="Abbreviation" labelWidth="w-48" className="flex items-center min-h-[26px]">
                  <input
                    disabled={isPredefined}
                    className={`${inputCls} ${isPredefined ? "text-zinc-400 cursor-not-allowed bg-zinc-50" : ""}`}
                    value={form.short_name}
                    onChange={setField("short_name")}
                    maxLength={6}
                  />
                </FormRow>
                <FormRow label="Parent Voucher Type" labelWidth="w-48" className="flex items-center min-h-[26px]">
                  <select
                    disabled={isPredefined}
                    className={`${selectCls} ${isPredefined ? "text-zinc-400 cursor-not-allowed bg-zinc-50" : ""}`}
                    value={form.parent_vt_id}
                    onChange={handleParentChange}
                  >
                    <option value="">-- None --</option>
                    {parentVoucherTypes
                      .filter((p) => String(p.vt_id) !== String(selectedVT.vt_id))
                      .map((p) => (
                        <option key={p.vt_id} value={String(p.vt_id)}>{p.name}</option>
                      ))}
                  </select>
                </FormRow>
                <FormRow label="Activate this Voucher Type" labelWidth="w-48" className="flex items-center min-h-[26px]">
                  <YesNoSelect
                    value={form.is_active}
                    onChange={setToggle("is_active", "form")}
                    disabled={isPredefined}
                  />
                </FormRow>
                <FormRow label="Method of voucher numbering" labelWidth="w-48" className="flex items-center min-h-[26px]">
                  <select
                    disabled={isPredefined}
                    className={`${selectCls} ${isPredefined ? "text-zinc-400 cursor-not-allowed bg-zinc-50" : ""}`}
                    value={form.numbering_method}
                    onChange={setField("numbering_method")}
                  >
                    <option>Automatic</option>
                    <option>Manual</option>
                    <option>None</option>
                  </select>
                </FormRow>

                <div className="border-t border-zinc-100 my-1" />

                {configForm && (
                  <>
                    <FormRow label="Use effective dates for vouchers" labelWidth="w-48" className="flex items-center min-h-[26px]">
                      <YesNoSelect value={configForm.use_effective_dates} onChange={setToggle("use_effective_dates", "config")} />
                    </FormRow>
                    <FormRow label="Allow zero-valued transactions" labelWidth="w-48" className="flex items-center min-h-[26px]">
                      <YesNoSelect value={configForm.allow_zero_value_transactions} onChange={setToggle("allow_zero_value_transactions", "config")} />
                    </FormRow>
                    <FormRow label="Make this voucher type as 'Optional' by default" labelWidth="w-48" className="flex items-center min-h-[26px]">
                      <YesNoSelect value={configForm.make_voucher_optional} onChange={setToggle("make_voucher_optional", "config")} />
                    </FormRow>
                    <FormRow label="Allow narration in voucher" labelWidth="w-48" className="flex items-center min-h-[26px]">
                      <YesNoSelect value={configForm.allow_narration} onChange={setToggle("allow_narration", "config")} />
                    </FormRow>
                    <FormRow label="Provide narrations for each ledger in voucher" labelWidth="w-48" className="flex items-center min-h-[26px]">
                      <YesNoSelect value={configForm.allow_narration_per_ledger} onChange={setToggle("allow_narration_per_ledger", "config")} />
                    </FormRow>
                  </>
                )}
              </div>


              <div className="p-3 border-r border-zinc-200 space-y-1.5">
                <div className="text-[11px] font-bold text-zinc-500 mb-2 text-center">Printing</div>
                {configForm && (
                  <FormRow label="Print voucher after saving" labelWidth="w-48" className="flex items-center min-h-[26px]">
                    <YesNoSelect value={configForm.print_after_save} onChange={setToggle("print_after_save", "config")} />
                  </FormRow>
                )}
              </div>


              <div className="p-3 space-y-1.5">
                <div className="text-[11px] font-bold text-zinc-500 mb-2 text-center">Name of Class</div>
              </div>

            </div>
          </div>
          <div className="flex-1" />
        </div>

        <RightActionPanel actions={alterActions} />
      </div>

      <div className="border-t border-zinc-200 p-3 flex justify-between items-center bg-zinc-50">
        <div className="flex gap-2">
          {!isPredefined && (
            <button
              onClick={handleDelete}
              disabled={loading}
              className="text-xs px-4 py-1.5 rounded border border-red-200 text-red-500 hover:bg-red-50 hover:border-red-300 disabled:opacity-50 transition-colors font-medium font-sans shadow-sm"
            >
              Delete
            </button>
          )}
          <button
            onClick={resetSelection}
            className="text-xs px-4 py-1.5 rounded border border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50 shadow-sm transition-colors font-medium font-sans"
          >
            Back
          </button>
        </div>
        <button
          onClick={handleSubmit}
          disabled={loading}
          className="text-sm px-6 py-1.5 rounded bg-black text-white hover:bg-zinc-800 disabled:opacity-50 transition-colors font-medium font-sans"
        >
          {loading ? "Saving..." : "Accept"}
        </button>
      </div>
    </div>
  );
}