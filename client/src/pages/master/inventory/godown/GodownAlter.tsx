import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useCompany } from "@/context/CompanyContext";
import { FormRow, PageTitleBar, RightActionPanel, SearchInput, DataTable, SideSelectionPanel } from "@/components/ui";
import type { GodownType } from "@/types/api";

const inputCls = "w-full bg-transparent text-sm outline-none py-0.5 px-1 rounded-sm placeholder:text-zinc-400 focus:bg-zinc-100 hover:bg-zinc-50 focus:border-zinc-300 transition-colors";
const selectCls = "w-full bg-transparent text-sm outline-none py-0.5 px-1 rounded-sm cursor-pointer focus:bg-zinc-100 hover:bg-zinc-50 focus:border-zinc-300 transition-colors";

function SelectionPanel({
  godowns,
  onSelect,
  onCancel,
  onCreate,
}: {
  godowns: GodownType[];
  onSelect: (g: GodownType) => void;
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

  const filtered = godowns.filter(g =>
    g.name.toLowerCase().includes(search.toLowerCase()) ||
    (g.alias && g.alias.toLowerCase().includes(search.toLowerCase()))
  );

  const columns = [
    { key: "name", label: "Godown Name", span: "col-span-8", render: (r: GodownType) => <span className="font-bold text-zinc-950 uppercase">{r.name}</span> },
    { key: "alias", label: "Alias", span: "col-span-4", render: (r: GodownType) => <span className="text-zinc-500">{r.alias || "—"}</span> },
  ];

  const selectionActions = [
    { key: "Alt+C", label: "Create Godown", onClick: onCreate },
    { key: "Esc", label: "Quit", onClick: onCancel },
  ];

  return (
    <div className="flex-1 flex flex-col h-full bg-white select-none">
      <PageTitleBar title="Alter Godown" subtitle="Select Godown to Alter" />

      <div className="p-3 bg-zinc-50 border-b border-zinc-200 shrink-0">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search godowns by name…"
          autoFocus
        />
      </div>

      <div className="flex-1 flex min-h-0">
        <div className="flex-1 flex flex-col bg-white border-r border-zinc-100">
          <DataTable
            columns={columns}
            rows={filtered}
            rowKey={(r: GodownType) => r.godown_id}
            onRowClick={onSelect}
            emptyMessage="No godowns found."
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
  parent_godown_id: string;
  excise_tax_unit: string;
  allow_storage_of_materials: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
}

export default function GodownAlter() {
  const navigate = useNavigate();
  const { selectedCompany } = useCompany();

  const [godowns, setGodowns] = useState<GodownType[]>([]);
  const [selectedGodown, setSelectedGodown] = useState<GodownType | null>(null);
  const [form, setForm] = useState<FormData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showPanel, setShowPanel] = useState(false);

  useEffect(() => {
    const company_id = selectedCompany?.company_id;
    if (!company_id) return;
    window.api.godown.getAll(company_id).then(r => {
      if (r.success) setGodowns(r.godowns ?? []);
    });
  }, [selectedCompany]);

  const handleSelectGodown = (g: GodownType) => {
    setSelectedGodown(g);
    setForm({
      name: g.name ?? "",
      alias: g.alias ?? "",
      parent_godown_id: g.parent_godown_id ? String(g.parent_godown_id) : "",
      excise_tax_unit: g.excise_tax_unit ?? "Not Applicable",
      allow_storage_of_materials: String(g.allow_storage_of_materials ?? 1),
      address: g.address ?? "",
      city: g.city ?? "",
      state: g.state ?? "",
      pincode: g.pincode ?? "",
    });
    setError(null);
    setSuccess(null);
  };

  const set = (key: keyof FormData) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm(f => f ? { ...f, [key]: e.target.value } : f);

  const validate = (): string | null => {
    if (!form?.name.trim()) return "Name is required.";
    if (!selectedCompany?.company_id) return "No company selected.";
    if (form.pincode && !/^\d{0,6}$/.test(form.pincode)) {
      return "Pincode must be numeric (max 6 digits).";
    }
    return null;
  };

  const handleBack = useCallback(() => {
    setSelectedGodown(null);
    setForm(null);
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!form || !selectedGodown) return;
    const validationError = validate();
    if (validationError) { setError(validationError); return; }

    setLoading(true); setError(null);
    try {
      const result = await window.api.godown.update({
        godown_id: selectedGodown.godown_id,
        company_id: selectedCompany!.company_id,
        name: form.name.trim(),
        alias: form.alias.trim() || null,
        parent_godown_id: form.parent_godown_id ? Number(form.parent_godown_id) : null,
        excise_tax_unit: form.excise_tax_unit.trim() || "Not Applicable",
        allow_storage_of_materials: Number(form.allow_storage_of_materials),
        address: form.address.trim() || null,
        city: form.city.trim() || null,
        state: form.state.trim() || null,
        pincode: form.pincode.trim() || null,
      });

      if (result.success) {
        const updated = await window.api.godown.getAll(selectedCompany!.company_id!);
        if (updated.success) setGodowns(updated.godowns ?? []);
        setSuccess(`Godown "${form.name}" updated successfully.`);
        setTimeout(() => {
          setSuccess(null);
          handleBack();
        }, 1500);
      } else {
        setError(result.error || "Failed to update godown.");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unexpected error.");
    } finally {
      setLoading(false);
    }
  }, [form, selectedGodown, selectedCompany, handleBack]);

  const handleDelete = useCallback(async () => {
    if (!selectedGodown) return;
    if (!window.confirm(`Delete godown "${selectedGodown.name}"? This cannot be undone.`)) return;

    setLoading(true); setError(null);
    try {
      const result = await window.api.godown.delete(selectedGodown.godown_id);
      if (result.success) {
        const updated = await window.api.godown.getAll(selectedCompany!.company_id!);
        if (updated.success) setGodowns(updated.godowns ?? []);
        handleBack();
      } else {
        setError(result.error || "Failed to delete godown.");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unexpected error.");
    } finally {
      setLoading(false);
    }
  }, [selectedGodown, selectedCompany, handleBack]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        if (showPanel) { setShowPanel(false); return; }
        if (selectedGodown) { handleBack(); return; }
        navigate("/master/alter");
      }
      if (e.altKey && e.key.toLowerCase() === "u") {
        e.preventDefault();
        if (selectedGodown) setShowPanel(prev => !prev);
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
  }, [handleSubmit, handleDelete, handleBack, navigate, showPanel, selectedGodown]);

  if (!selectedGodown || !form) {
    return (
      <SelectionPanel
        godowns={godowns.filter(g => !g.is_predefined)}
        onSelect={handleSelectGodown}
        onCancel={() => navigate("/master/alter")}
        onCreate={() => navigate("/master/create/godown")}
      />
    );
  }

  const parentOptions = godowns.filter(g => String(g.godown_id) !== String(selectedGodown.godown_id));
  const selectedGodownLabel = form.parent_godown_id
    ? godowns.find(g => String(g.godown_id) === form.parent_godown_id)?.name ?? "Primary"
    : "Primary";

  const alterActions = [
    { key: "Alt+U", label: "Select Under", onClick: () => setShowPanel(prev => !prev) },
    { key: "Alt+A", label: "Accept", onClick: handleSubmit },
    { key: "Alt+D", label: "Delete", onClick: handleDelete },
    { key: "Esc", label: "Back", onClick: handleBack },
  ];

  return (
    <div className="flex flex-col h-full relative overflow-hidden bg-white select-none">
      <PageTitleBar title={`Godown Alteration: ${selectedGodown.name}`} subtitle={selectedCompany?.name} />

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

      <div className="flex-1 flex min-h-0">
        <div className="flex-1 overflow-y-auto p-3 space-y-6 max-w-2xl bg-white border-r border-zinc-100">
          <div className="space-y-1">
            <div className="text-xs uppercase tracking-widest text-zinc-400 font-bold mb-2 font-sans select-none">General</div>
            
            <FormRow label="Name" required labelWidth="w-56" className="flex items-center min-h-[26px]">
              <input autoFocus className={inputCls} value={form.name} onChange={set("name")} placeholder="Godown name" />
            </FormRow>

            <FormRow label="Alias" labelWidth="w-56" className="flex items-center min-h-[26px]">
              <input className={inputCls} value={form.alias} onChange={set("alias")} placeholder="Alias (optional)" />
            </FormRow>

            <FormRow label="Under" labelWidth="w-56" className="flex items-center min-h-[26px]">
              <button
                type="button"
                onClick={() => setShowPanel(true)}
                className="w-full text-left text-sm py-0.5 px-1 bg-transparent outline-none uppercase font-bold text-zinc-800 tracking-wide hover:text-black transition-colors"
              >
                {selectedGodownLabel}
              </button>
            </FormRow>

            <FormRow label="Excise Tax unit" labelWidth="w-56" className="flex items-center min-h-[26px]">
              <input className={inputCls} value={form.excise_tax_unit} onChange={set("excise_tax_unit")} placeholder="Not Applicable" />
            </FormRow>

            <FormRow label="Allow Storage of Materials" labelWidth="w-56" className="flex items-center min-h-[26px]">
              <select className={selectCls} value={form.allow_storage_of_materials} onChange={set("allow_storage_of_materials")}>
                <option value="1">Yes</option>
                <option value="0">No</option>
              </select>
            </FormRow>
          </div>

          <div className="space-y-1 border-t border-zinc-100 pt-4">
            <div className="text-xs uppercase tracking-widest text-zinc-400 font-bold mb-2 font-sans select-none">Address Details</div>

            <FormRow label="Address" labelWidth="w-56" className="flex items-center min-h-[26px]">
              <input className={inputCls} value={form.address} onChange={set("address")} placeholder="Street/Building (optional)" />
            </FormRow>

            <FormRow label="City" labelWidth="w-56" className="flex items-center min-h-[26px]">
              <input className={inputCls} value={form.city} onChange={set("city")} placeholder="City (optional)" />
            </FormRow>

            <FormRow label="State" labelWidth="w-56" className="flex items-center min-h-[26px]">
              <input className={inputCls} value={form.state} onChange={set("state")} placeholder="State (optional)" />
            </FormRow>

            <FormRow label="Pincode" labelWidth="w-56" className="flex items-center min-h-[26px]">
              <input className={inputCls} value={form.pincode} onChange={set("pincode")} placeholder="6-digit Pincode (optional)" maxLength={6} />
            </FormRow>
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
            onClick={handleBack}
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
        <SideSelectionPanel
          title="List of Godowns"
          items={parentOptions.map(g => ({ id: g.godown_id, label: g.name }))}
          selected={form.parent_godown_id}
          onSelect={val => setForm(f => f ? { ...f, parent_godown_id: val } : f)}
          onClose={() => setShowPanel(false)}
          showPrimary
        />
      )}
    </div>
  );
}