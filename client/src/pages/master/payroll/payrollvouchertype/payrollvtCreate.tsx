import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useCompany } from "@/context/CompanyContext";
import { PageTitleBar, RightActionPanel } from "@/components/ui";
import type { VoucherTypeCreatePayload } from "@/types/entities/VoucherType";
import {
  VoucherTypeFormBody,
  INITIAL_FORM,
  INITIAL_CONFIG,
  toInt,
  type VTForm,
  type VTConfig,
} from "../../voucher-type/VoucherTypeFormBody";

// Payroll voucher types are the same as regular voucher types, restricted to
// these three categories.
const PAYROLL_CATEGORIES = ["Attendance", "Payment", "Payroll"];

export default function PayrollvtCreate() {
  const navigate = useNavigate();
  const { selectedCompany } = useCompany();
  const companyId = selectedCompany?.company_id;

  const [form, setForm] = useState<VTForm>({ ...INITIAL_FORM, category: "Attendance" });
  const [config, setConfig] = useState<VTConfig>(INITIAL_CONFIG);
  const [showCategoryPanel, setShowCategoryPanel] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

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
        company_id:                     companyId!,
        name:                           form.name.trim(),
        alias:                          form.alias.trim() || null,
        short_name:                     form.short_name.trim() || undefined,
        category:                       form.category,
        numbering_method:               form.numbering_method,
        is_active:                      toInt(form.is_active),
        use_effective_dates:            toInt(config.use_effective_dates),
        allow_zero_value_transactions:  toInt(config.allow_zero_value_transactions),
        make_voucher_optional:          toInt(config.make_voucher_optional),
        allow_narration:                toInt(config.allow_narration),
        allow_narration_per_ledger:     toInt(config.allow_narration_per_ledger),
        numbering_behaviour:            config.numbering_behaviour,
        set_alter_additional_numbering: toInt(config.set_alter_additional_numbering),
        show_unused_numbers:            toInt(config.show_unused_numbers),
        prevent_duplicate_numbers:      toInt(config.prevent_duplicate_numbers),
        print_after_save:               toInt(config.print_after_save),
        whatsapp_after_save:            toInt(config.whatsapp_after_save),
        starting_number:                config.starting_number,
        width_of_numerical_part:        config.width_of_numerical_part,
        prefill_with_zero:              toInt(config.prefill_with_zero),
        restart_numbering:              config.restart_numbering,
        prefix_details:                 config.prefix_details,
        suffix_details:                 config.suffix_details,
        voucher_classes:                config.voucher_classes,
      };
      const result = await window.api.voucherType.create(payload);

      if (result.success) {
        setSuccess(`Payroll Voucher Type "${form.name}" created successfully.`);
        setForm({ ...INITIAL_FORM, category: "Attendance" });
        setConfig(INITIAL_CONFIG);
        setTimeout(() => setSuccess(null), 3000);
      } else {
        setError(result.error || "Failed to create voucher type.");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  }, [form, config, companyId]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        if (showCategoryPanel) setShowCategoryPanel(false);
        else navigate("/master/create");
      }
      if ((e.altKey || e.ctrlKey) && e.key.toLowerCase() === "a") { e.preventDefault(); handleSubmit(); }
      if (e.altKey && e.key.toLowerCase() === "c") { e.preventDefault(); navigate("/master/alter/payroll-voucher-type"); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handleSubmit, navigate, showCategoryPanel]);

  const voucherActions = [
    { key: "Alt+A", label: "Accept",     onClick: handleSubmit },
    { key: "Alt+C", label: "Alter Mode", onClick: () => navigate("/master/alter/payroll-voucher-type") },
    { key: "Esc",   label: "Quit",       onClick: () => navigate("/master/create") },
  ];

  return (
    <div className="flex-1 flex flex-col h-full bg-white select-none">
      <PageTitleBar title="Payroll Voucher Type Creation" subtitle={selectedCompany?.name} />

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
        <VoucherTypeFormBody
          form={form}
          setForm={setForm}
          config={config}
          setConfig={setConfig}
          showCategoryPanel={showCategoryPanel}
          setShowCategoryPanel={setShowCategoryPanel}
          categories={PAYROLL_CATEGORIES}
          nameAutoFocus
          companyId={companyId}
        />
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
