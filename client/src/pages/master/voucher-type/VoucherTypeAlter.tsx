import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useCompany } from "@/context/CompanyContext";
import { PageTitleBar, RightActionPanel, SearchInput, DataTable } from "@/components/ui";
import type {
  VoucherTypeType,
  VoucherTypeUpdatePayload,
  VoucherTypeConfigUpdatePayload,
} from "@/types/entities/VoucherType";
import {
  VoucherTypeFormBody,
  INITIAL_CONFIG,
  toInt,
  fromInt,
  type VTForm,
  type VTConfig,
  type NumberingMethod,
} from "./VoucherTypeFormBody";

// ─── Voucher type picker (DataTable list) ──────────────────────────────────────
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
          {!!r.is_predefined && (
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
      render: (r: VoucherTypeType) => <span className="text-zinc-500">{r.category}</span>,
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
        <SearchInput value={search} onChange={setSearch} placeholder="Search voucher types by name or category…" autoFocus />
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
  const [form, setForm] = useState<VTForm | null>(null);
  const [config, setConfig] = useState<VTConfig | null>(null);
  const [showCategoryPanel, setShowCategoryPanel] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const loadVoucherTypes = useCallback(async () => {
    if (!companyId) return;
    const result = await window.api.voucherType.getAll(companyId);
    if (result.success) setVoucherTypes(result.voucherTypes ?? []);
  }, [companyId]);

  useEffect(() => { loadVoucherTypes(); }, [loadVoucherTypes]);

  const handleSelectVT = async (vt: VoucherTypeType) => {
    setSelectedVT(vt);
    setForm({
      name:             vt.name ?? "",
      alias:            vt.alias ?? "",
      short_name:       vt.short_name ?? "",
      category:         vt.category ?? "Receipt",
      is_active:        fromInt(vt.is_active),
      numbering_method: (vt.numbering_method as NumberingMethod) ?? "Automatic",
    });

    try {
      const configRes = await window.api.voucherType.getConfig(vt.vt_id!);
      if (configRes.success && configRes.config) {
        const c = configRes.config;
        setConfig({
          use_effective_dates:            fromInt(c.use_effective_dates),
          allow_zero_value_transactions:  fromInt(c.allow_zero_value_transactions),
          make_voucher_optional:          fromInt(c.make_voucher_optional),
          allow_narration:                fromInt(c.allow_narration),
          allow_narration_per_ledger:     fromInt(c.allow_narration_per_ledger),
          numbering_behaviour:            (c.numbering_behaviour as VTConfig["numbering_behaviour"]) ?? "Retain Original Voucher No.",
          set_alter_additional_numbering: fromInt(c.set_alter_additional_numbering),
          show_unused_numbers:            fromInt(c.show_unused_numbers),
          prevent_duplicate_numbers:      fromInt(c.prevent_duplicate_numbers),
          print_after_save:               fromInt(c.print_after_save),
          whatsapp_after_save:            fromInt(c.whatsapp_after_save),
        });
      } else {
        setConfig({ ...INITIAL_CONFIG });
      }
    } catch {
      setConfig({ ...INITIAL_CONFIG });
    }

    setError(null);
    setSuccess(null);
  };

  const validate = (): string | null => {
    if (!form?.name.trim()) return "Voucher Type name is required.";
    if (!companyId) return "No company selected.";
    return null;
  };

  const handleSubmit = useCallback(async () => {
    if (!form || !config || !selectedVT) return;
    const err = validate();
    if (err) { setError(err); return; }

    setLoading(true);
    setError(null);
    try {
      if (!selectedVT.is_predefined) {
        const payload: VoucherTypeUpdatePayload = {
          vt_id:            selectedVT.vt_id!,
          name:             form.name.trim(),
          alias:            form.alias.trim() || null,
          short_name:       form.short_name.trim() || undefined,
          category:         form.category,
          numbering_method: form.numbering_method,
          is_active:        toInt(form.is_active),
        };
        const result = await window.api.voucherType.update(payload);
        if (!result.success) { setError(result.error || "Failed to update voucher type."); return; }
      }

      const configPayload: VoucherTypeConfigUpdatePayload = {
        voucher_type_id:                selectedVT.vt_id!,
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
      };
      const configRes = await window.api.voucherType.updateConfig(configPayload);
      if (!configRes.success) { setError(configRes.error || "Failed to update config."); return; }

      setSuccess(`Voucher Type "${form.name}" updated successfully.`);
      await loadVoucherTypes();
      setTimeout(() => { setSuccess(null); resetSelection(); }, 1500);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  }, [form, config, selectedVT, companyId, loadVoucherTypes]);

  const handleDelete = useCallback(async () => {
    if (!selectedVT) return;
    if (!!selectedVT.is_predefined) { setError("Predefined voucher types cannot be deleted."); return; }
    if (!window.confirm(`Delete Voucher Type "${selectedVT.name}"?`)) return;

    setLoading(true);
    setError(null);
    try {
      const result = await window.api.voucherType.delete(selectedVT.vt_id!);
      if (result.success) {
        setSuccess("Voucher Type deleted successfully.");
        await loadVoucherTypes();
        setTimeout(() => { setSuccess(null); resetSelection(); }, 1500);
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
    setConfig(null);
    setShowCategoryPanel(false);
    setError(null);
    setSuccess(null);
  };

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        if (showCategoryPanel) setShowCategoryPanel(false);
        else if (selectedVT) resetSelection();
        else navigate("/master/alter");
      }
      if ((e.altKey || e.ctrlKey) && e.key.toLowerCase() === "a") { e.preventDefault(); handleSubmit(); }
      if (e.altKey && e.key.toLowerCase() === "d") { e.preventDefault(); handleDelete(); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handleSubmit, handleDelete, navigate, selectedVT, showCategoryPanel]);

  if (!selectedVT || !form || !config) {
    return (
      <SelectionPanel
        voucherTypes={voucherTypes}
        onSelect={handleSelectVT}
        onCancel={() => navigate("/master/alter")}
        onCreate={() => navigate("/master/create/voucher-type")}
      />
    );
  }

  const isPredefined = !!selectedVT.is_predefined;

  const alterActions = [
    { key: "Alt+A", label: "Accept", onClick: handleSubmit },
    ...(isPredefined ? [] : [{ key: "Alt+D", label: "Delete", onClick: handleDelete }]),
    { key: "Esc",   label: "Back",   onClick: resetSelection },
  ];

  return (
    <div className="flex-1 flex flex-col h-full bg-white select-none">
      <PageTitleBar title={`Voucher Type Alteration: ${selectedVT.name}`} subtitle={selectedCompany?.name} />

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
          Predefined — identity is locked, configurations below can still be changed.
        </div>
      )}

      <div className="flex-1 flex min-h-0">
        <VoucherTypeFormBody
          form={form}
          setForm={setForm as React.Dispatch<React.SetStateAction<VTForm>>}
          config={config}
          setConfig={setConfig as React.Dispatch<React.SetStateAction<VTConfig>>}
          showCategoryPanel={showCategoryPanel}
          setShowCategoryPanel={setShowCategoryPanel}
          lockIdentity={isPredefined}
          nameAutoFocus={!isPredefined}
        />
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
