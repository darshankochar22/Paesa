import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useCompany } from "@/context/CompanyContext";
import { PageTitleBar, RightActionPanel, SearchInput, DataTable, FormRow } from "@/components/ui";
import type { VoucherTypeType } from "@/types/entities/VoucherType";

const inputCls = "w-full bg-transparent text-sm outline-none py-0.5 px-1.5 border border-transparent hover:border-zinc-200 focus:border-zinc-800 transition-colors bg-white/50 rounded ";
const selectCls = "bg-transparent text-sm outline-none px-1.5 py-0.5 border border-transparent hover:border-zinc-200 focus:border-zinc-800 transition-colors bg-white/50 rounded w-44 ";

interface ConfigData {
  use_effective_dates: "No" | "Yes";
  allow_zero_value_transactions: "No" | "Yes";
  make_voucher_optional: "No" | "Yes";
  allow_narration: "No" | "Yes";
  allow_narration_per_ledger: "No" | "Yes";
  whatsapp_after_save: "No" | "Yes";
  print_after_save: "No" | "Yes";
  enable_default_accounting_allocation: "No" | "Yes";
  track_additional_cost_for_purchase: "No" | "Yes";
  default_title_to_print: string;
  use_for_pos_invoicing: "No" | "Yes";
  declaration: string;
}

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

  const filtered = voucherTypes.filter((vt) =>
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
    { key: "Esc", label: "Quit", onClick: onCancel },
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

  const loadVoucherTypes = useCallback(async () => {
    if (!companyId) return;
    const result = await window.api.voucherType.getAll(companyId);
    if (result.success) {
      setVoucherTypes(result.voucherTypes ?? []);
    }
  }, [companyId]);

  useEffect(() => {
    loadVoucherTypes();
  }, [loadVoucherTypes]);

  const handleSelectVT = async (vt: VoucherTypeType) => {
    setSelectedVT(vt);
    setForm({
      name: vt.name ?? "",
      short_name: vt.short_name ?? "",
      category: vt.category ?? "Receipt",
      default_voucher_class: vt.default_voucher_class ?? "",
      affects_inventory: vt.affects_inventory === 1 ? "Yes" : "No",
      affects_accounting: vt.affects_accounting === 1 ? "Yes" : "No",
      affects_gst: vt.affects_gst === 1 ? "Yes" : "No",
      numbering_method: (vt.numbering_method as any) ?? "Automatic",
      numbering_prefix: vt.numbering_prefix ?? "",
      numbering_suffix: vt.numbering_suffix ?? "",
      starts_with: String(vt.starts_with ?? 1),
    });

    try {
      const configRes = await window.api.voucherType.getConfig(vt.vt_id!);
      if (configRes.success && configRes.config) {
        const c = configRes.config as any;
        setConfigForm({
          use_effective_dates: c.use_effective_dates === 1 ? "Yes" : "No",
          allow_zero_value_transactions: c.allow_zero_value_transactions === 1 ? "Yes" : "No",
          make_voucher_optional: c.make_voucher_optional === 1 ? "Yes" : "No",
          allow_narration: c.allow_narration === 1 ? "Yes" : "No",
          allow_narration_per_ledger: c.allow_narration_per_ledger === 1 ? "Yes" : "No",
          whatsapp_after_save: c.whatsapp_after_save === 1 ? "Yes" : "No",
          print_after_save: c.print_after_save === 1 ? "Yes" : "No",
          enable_default_accounting_allocation: c.enable_default_accounting_allocation === 1 ? "Yes" : "No",
          track_additional_cost_for_purchase: c.track_additional_cost_for_purchase === 1 ? "Yes" : "No",
          default_title_to_print: c.default_title_to_print ?? "",
          use_for_pos_invoicing: c.use_for_pos_invoicing === 1 ? "Yes" : "No",
          declaration: c.declaration ?? "",
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

  const setField = (key: keyof FormData) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => setForm((f) => (f ? { ...f, [key]: e.target.value } : f));

  const setConfigField = (key: keyof ConfigData) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => setConfigForm((c) => (c ? { ...c, [key]: e.target.value } : c));

  const validate = (): string | null => {
    if (!form?.name.trim()) return "Voucher Type name is required.";
    if (!companyId) return "No company selected.";
    const startNum = Number(form.starts_with);
    if (isNaN(startNum) || startNum < 0) return "Starts with must be a positive number.";
    return null;
  };

  const handleSubmit = useCallback(async () => {
    if (!form || !selectedVT) return;

    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      let mainSuccess = true;
      if (selectedVT.is_predefined !== 1) {
        const result = await window.api.voucherType.update({
          vt_id: selectedVT.vt_id,
          company_id: companyId,
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
        if (!result.success) {
          setError(result.error || "Failed to update voucher type details.");
          mainSuccess = false;
        }
      }

      if (mainSuccess && configForm) {
        const configRes = await window.api.voucherType.updateConfig({
          voucher_type_id: selectedVT.vt_id!,
          use_effective_dates: configForm.use_effective_dates === "Yes" ? 1 : 0,
          allow_zero_value_transactions: configForm.allow_zero_value_transactions === "Yes" ? 1 : 0,
          make_voucher_optional: configForm.make_voucher_optional === "Yes" ? 1 : 0,
          allow_narration: configForm.allow_narration === "Yes" ? 1 : 0,
          allow_narration_per_ledger: configForm.allow_narration_per_ledger === "Yes" ? 1 : 0,
          whatsapp_after_save: configForm.whatsapp_after_save === "Yes" ? 1 : 0,
          print_after_save: configForm.print_after_save === "Yes" ? 1 : 0,
          enable_default_accounting_allocation: configForm.enable_default_accounting_allocation === "Yes" ? 1 : 0,
          track_additional_cost_for_purchase: configForm.track_additional_cost_for_purchase === "Yes" ? 1 : 0,
          default_title_to_print: configForm.default_title_to_print.trim() || undefined,
          use_for_pos_invoicing: configForm.use_for_pos_invoicing === "Yes" ? 1 : 0,
          declaration: configForm.declaration.trim() || undefined,
        });

        if (configRes.success) {
          setSuccess(`Voucher Type "${form.name}" updated successfully.`);
          await loadVoucherTypes();
          setTimeout(() => {
            setSuccess(null);
            setSelectedVT(null);
            setForm(null);
            setConfigForm(null);
          }, 1500);
        } else {
          setError(configRes.error || "Failed to update voucher type configs.");
        }
      }
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

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        if (selectedVT) {
          setSelectedVT(null);
          setForm(null);
          setConfigForm(null);
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
    { key: "Esc", label: "Back", onClick: () => { setSelectedVT(null); setForm(null); setConfigForm(null); } },
  ];

  const CATEGORIES = ["Receipt", "Payment", "Contra", "Journal", "Sales", "Purchase", "Credit Note", "Debit Note", "Stock Journal", "Delivery Note", "Receipt Note", "Memorandum", "Payroll"];

  return (
    <div className="flex flex-col h-full relative overflow-hidden bg-white select-none">
      <PageTitleBar
        title={`Voucher Type Alteration: ${selectedVT.name}`}
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
        <div className="px-3 py-1.5 border-b border-zinc-200 bg-zinc-50 text-zinc-500 text-[10px] uppercase font-bold shrink-0 select-none font-sans">
          ℹ️ Predefined voucher type: Primary identity is locked, but you can alter posting & printing configurations below.
        </div>
      )}

      <div className="flex-1 flex min-h-0">
        <div className="flex-1 overflow-y-auto p-3 space-y-4 bg-white border-r border-zinc-100">
          {/* Section 1: Main Details */}
          <div className="space-y-1.5">
            <div className="text-[10px] uppercase font-bold text-zinc-400 select-none">Identity Options</div>
            <FormRow label="Name" required labelWidth="w-64" className="flex items-center min-h-[26px]">
              <input
                autoFocus={!isPredefined}
                disabled={isPredefined}
                className={`${inputCls} ${isPredefined ? "text-zinc-500 cursor-not-allowed bg-zinc-50" : ""}`}
                value={form.name}
                onChange={setField("name")}
              />
            </FormRow>
            <FormRow label="Short Name" labelWidth="w-64" className="flex items-center min-h-[26px]">
              <input
                disabled={isPredefined}
                className={`${inputCls} ${isPredefined ? "text-zinc-500 cursor-not-allowed bg-zinc-50" : ""}`}
                value={form.short_name}
                onChange={setField("short_name")}
                maxLength={4}
              />
            </FormRow>
            <FormRow label="Voucher Type Category" required labelWidth="w-64" className="flex items-center min-h-[26px]">
              <select
                disabled={isPredefined}
                className={`${selectCls} ${isPredefined ? "text-zinc-500 cursor-not-allowed bg-zinc-50" : ""}`}
                value={form.category}
                onChange={setField("category")}
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat}>{cat}</option>
                ))}
              </select>
            </FormRow>
            <FormRow label="Default Voucher Class" labelWidth="w-64" className="flex items-center min-h-[26px]">
              <input
                disabled={isPredefined}
                className={`${inputCls} ${isPredefined ? "text-zinc-500 cursor-not-allowed bg-zinc-50" : ""}`}
                value={form.default_voucher_class}
                onChange={setField("default_voucher_class")}
              />
            </FormRow>
            <FormRow label="Method of Voucher Numbering" labelWidth="w-64" className="flex items-center min-h-[26px]">
              <select
                disabled={isPredefined}
                className={`${selectCls} ${isPredefined ? "text-zinc-500 cursor-not-allowed bg-zinc-50" : ""}`}
                value={form.numbering_method}
                onChange={setField("numbering_method")}
              >
                <option>Automatic</option>
                <option>Manual</option>
                <option>None</option>
              </select>
            </FormRow>
            <FormRow label="Starts With" labelWidth="w-64" className="flex items-center min-h-[26px]">
              <input
                disabled={isPredefined}
                className={`${inputCls} ${isPredefined ? "text-zinc-500 cursor-not-allowed bg-zinc-50" : ""}`}
                type="number"
                min="1"
                value={form.starts_with}
                onChange={setField("starts_with")}
              />
            </FormRow>
            <FormRow label="Numbering Prefix (if Auto)" labelWidth="w-64" className="flex items-center min-h-[26px]">
              <input
                disabled={isPredefined}
                className={`${inputCls} ${isPredefined ? "text-zinc-500 cursor-not-allowed bg-zinc-50" : ""}`}
                value={form.numbering_prefix}
                onChange={setField("numbering_prefix")}
              />
            </FormRow>
            <FormRow label="Numbering Suffix (if Auto)" labelWidth="w-64" className="flex items-center min-h-[26px]">
              <input
                disabled={isPredefined}
                className={`${inputCls} ${isPredefined ? "text-zinc-500 cursor-not-allowed bg-zinc-50" : ""}`}
                value={form.numbering_suffix}
                onChange={setField("numbering_suffix")}
              />
            </FormRow>
            <div className="border-t border-zinc-100 my-2 pt-2 text-[10px] uppercase font-bold text-zinc-400 select-none">Effects & Accounting</div>
            <FormRow label="Affects Inventory" labelWidth="w-64" className="flex items-center min-h-[26px]">
              <select
                disabled={isPredefined}
                className={`${selectCls} ${isPredefined ? "text-zinc-500 cursor-not-allowed bg-zinc-50" : ""}`}
                value={form.affects_inventory}
                onChange={setField("affects_inventory")}
              >
                <option>No</option>
                <option>Yes</option>
              </select>
            </FormRow>
            <FormRow label="Affects Accounting" labelWidth="w-64" className="flex items-center min-h-[26px]">
              <select
                disabled={isPredefined}
                className={`${selectCls} ${isPredefined ? "text-zinc-500 cursor-not-allowed bg-zinc-50" : ""}`}
                value={form.affects_accounting}
                onChange={setField("affects_accounting")}
              >
                <option>Yes</option>
                <option>No</option>
              </select>
            </FormRow>
            <FormRow label="Affects GST" labelWidth="w-64" className="flex items-center min-h-[26px]">
              <select
                disabled={isPredefined}
                className={`${selectCls} ${isPredefined ? "text-zinc-500 cursor-not-allowed bg-zinc-50" : ""}`}
                value={form.affects_gst}
                onChange={setField("affects_gst")}
              >
                <option>No</option>
                <option>Yes</option>
              </select>
            </FormRow>
          </div>

          {/* Section 2: Config Options */}
          {configForm && (
            <div className="space-y-1.5 border-t border-zinc-200 pt-4">
              <div className="text-[10px] uppercase font-bold text-zinc-400 select-none">Posting & Printing Configurations</div>
              <FormRow label="Allow Zero-Value Transactions" labelWidth="w-64" className="flex items-center min-h-[26px]">
                <select className={selectCls} value={configForm.allow_zero_value_transactions} onChange={setConfigField("allow_zero_value_transactions")}>
                  <option>No</option>
                  <option>Yes</option>
                </select>
              </FormRow>
              <FormRow label="Make Voucher Optional" labelWidth="w-64" className="flex items-center min-h-[26px]">
                <select className={selectCls} value={configForm.make_voucher_optional} onChange={setConfigField("make_voucher_optional")}>
                  <option>No</option>
                  <option>Yes</option>
                </select>
              </FormRow>
              <FormRow label="Use Effective Dates" labelWidth="w-64" className="flex items-center min-h-[26px]">
                <select className={selectCls} value={configForm.use_effective_dates} onChange={setConfigField("use_effective_dates")}>
                  <option>No</option>
                  <option>Yes</option>
                </select>
              </FormRow>
              <FormRow label="Allow Narration" labelWidth="w-64" className="flex items-center min-h-[26px]">
                <select className={selectCls} value={configForm.allow_narration} onChange={setConfigField("allow_narration")}>
                  <option>Yes</option>
                  <option>No</option>
                </select>
              </FormRow>
              <FormRow label="Allow Narration per Ledger" labelWidth="w-64" className="flex items-center min-h-[26px]">
                <select className={selectCls} value={configForm.allow_narration_per_ledger} onChange={setConfigField("allow_narration_per_ledger")}>
                  <option>No</option>
                  <option>Yes</option>
                </select>
              </FormRow>
              <FormRow label="WhatsApp After Save" labelWidth="w-64" className="flex items-center min-h-[26px]">
                <select className={selectCls} value={configForm.whatsapp_after_save} onChange={setConfigField("whatsapp_after_save")}>
                  <option>No</option>
                  <option>Yes</option>
                </select>
              </FormRow>
              <FormRow label="Print After Save" labelWidth="w-64" className="flex items-center min-h-[26px]">
                <select className={selectCls} value={configForm.print_after_save} onChange={setConfigField("print_after_save")}>
                  <option>No</option>
                  <option>Yes</option>
                </select>
              </FormRow>
              <FormRow label="Use for POS Invoicing" labelWidth="w-64" className="flex items-center min-h-[26px]">
                <select className={selectCls} value={configForm.use_for_pos_invoicing} onChange={setConfigField("use_for_pos_invoicing")}>
                  <option>No</option>
                  <option>Yes</option>
                </select>
              </FormRow>
              <FormRow label="Default Title to Print" labelWidth="w-64" className="flex items-center min-h-[26px]">
                <input className={inputCls} value={configForm.default_title_to_print} onChange={setConfigField("default_title_to_print")} />
              </FormRow>
              <FormRow label="Declaration text" labelWidth="w-64" className="flex items-start">
                <textarea rows={3} className="flex-1 bg-transparent text-sm outline-none px-1.5 py-0.5 border border-zinc-200 focus:border-zinc-800 transition-colors bg-white rounded w-full" value={configForm.declaration} onChange={setConfigField("declaration")} />
              </FormRow>
            </div>
          )}
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
              setSelectedVT(null);
              setForm(null);
              setConfigForm(null);
            }}
            className="text-xs px-4 py-1.5 rounded border border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50 shadow-sm transition-colors font-medium font-sans"
          >
            Back
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="text-xs px-5 py-1.5 rounded bg-black text-white hover:bg-zinc-800 disabled:opacity-50 shadow-sm transition-colors font-medium font-sans"
          >
            {loading ? "Saving..." : "Accept"}
          </button>
        </div>
      </div>
    </div>
  );
}
