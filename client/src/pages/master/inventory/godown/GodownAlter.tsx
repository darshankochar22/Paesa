import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useCompany } from "@/context/CompanyContext";
import FormRow from "@/components/ui/FormRow";
import SideSelectionPanel from "@/components/ui/SideSelectionPanel";
import type { GodownType } from "@/types/api";

const inputCls = "w-full bg-transparent text-sm outline-none py-1 px-1 rounded-sm placeholder:text-zinc-400";

// ── Item selection screen ────────────────────────────────────────────────────
function SelectionPanel({
  godowns,
  onSelect,
  onCancel,
}: {
  godowns: GodownType[];
  onSelect: (g: GodownType) => void;
  onCancel: () => void;
}) {
  const [search, setSearch] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => { inputRef.current?.focus(); }, []);
  const filtered = godowns.filter(g => g.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="flex flex-col h-full">
      <div className="px-6 py-3 flex items-center justify-between shrink-0">
        <span className="font-semibold text-base">Alter Godown</span>
        <span className="text-xs text-zinc-500">Esc to cancel</span>
      </div>
      <div className="px-6 pb-3 shrink-0">
        <div className="text-xs uppercase tracking-widest text-zinc-500 mb-2">Select Godown to Alter</div>
        <input
          ref={inputRef}
          className="w-full text-sm bg-transparent border-b border-zinc-300 outline-none py-1 placeholder:text-zinc-400"
          placeholder="Search godowns..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>
      <div className="flex-1 overflow-y-auto px-6">
        {filtered.length === 0 && <div className="text-sm text-zinc-400 py-4">No godowns found</div>}
        {filtered.map(g => (
          <div
            key={g.godown_id}
            onClick={() => onSelect(g)}
            className="py-2 text-sm text-zinc-700 hover:text-black cursor-pointer border-b border-zinc-100 last:border-0"
          >
            {g.name}
          </div>
        ))}
      </div>
      <div className="px-6 py-3 flex justify-end shrink-0">
        <button onClick={onCancel} className="text-sm px-4 py-1.5 rounded border text-zinc-600 hover:bg-zinc-100 transition-colors">
          Cancel
        </button>
      </div>
    </div>
  );
}

// ── Form data ────────────────────────────────────────────────────────────────
interface FormData {
  name: string; alias: string; parent_godown_id: string;
  allow_storage_of_materials: string;
  address: string; city: string; state: string; pincode: string;
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
      name: g.name ?? "", alias: g.alias ?? "",
      parent_godown_id: g.parent_godown_id ? String(g.parent_godown_id) : "",
      allow_storage_of_materials: String(g.allow_storage_of_materials ?? 1),
      address: g.address ?? "", city: g.city ?? "",
      state: g.state ?? "", pincode: g.pincode ?? "",
    });
    setError(null);
  };

  const set = (key: keyof FormData) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm(f => f ? { ...f, [key]: e.target.value } : f);

  const validate = (): string | null => {
    if (!form?.name.trim()) return "Name is required.";
    if (!selectedCompany?.company_id) return "No company selected.";
    if (form.pincode && !/^\d{0,6}$/.test(form.pincode)) return "Pincode must be numeric (max 6 digits).";
    return null;
  };

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
        allow_storage_of_materials: Number(form.allow_storage_of_materials),
        address: form.address.trim() || null,
        city: form.city.trim() || null,
        state: form.state.trim() || null,
        pincode: form.pincode.trim() || null,
      });
      if (result.success) {
        const updated = await window.api.godown.getAll(selectedCompany!.company_id!);
        if (updated.success) setGodowns(updated.godowns ?? []);
        setSuccess(`Godown "${form.name}" updated.`);
        setTimeout(() => { setSuccess(null); setSelectedGodown(null); setForm(null); }, 2000);
      } else {
        setError(result.error || "Failed to update godown.");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unexpected error.");
    } finally {
      setLoading(false);
    }
  }, [form, selectedGodown, selectedCompany]);

  const handleDelete = useCallback(async () => {
    if (!selectedGodown) return;
    if (!window.confirm(`Delete "${selectedGodown.name}"? This cannot be undone.`)) return;
    setLoading(true); setError(null);
    try {
      const result = await window.api.godown.delete(selectedGodown.godown_id);
      if (result.success) {
        const updated = await window.api.godown.getAll(selectedCompany!.company_id!);
        if (updated.success) setGodowns(updated.godowns ?? []);
        setSelectedGodown(null); setForm(null);
      } else {
        setError(result.error || "Failed to delete godown.");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unexpected error.");
    } finally {
      setLoading(false);
    }
  }, [selectedGodown, selectedCompany]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (showPanel) { setShowPanel(false); return; }
        if (selectedGodown) { setSelectedGodown(null); setForm(null); return; }
        navigate("/master/alter");
      }
      if (e.ctrlKey && e.key === "a") { e.preventDefault(); handleSubmit(); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handleSubmit, navigate, showPanel, selectedGodown]);

  if (!selectedGodown || !form) {
    return (
      <SelectionPanel
        godowns={godowns}
        onSelect={handleSelectGodown}
        onCancel={() => navigate("/master/alter")}
      />
    );
  }

  const parentOptions = godowns.filter(g => String(g.godown_id) !== String(selectedGodown.godown_id));
  const selectedGodownLabel = form.parent_godown_id
    ? godowns.find(g => String(g.godown_id) === form.parent_godown_id)?.name ?? "Primary"
    : "Primary";

  return (
    <div className="flex flex-col h-full relative overflow-hidden">
      <div className="px-6 py-3 flex items-center justify-between shrink-0">
        <span className="font-semibold text-base">Alter Godown</span>
        <span className="text-xs text-zinc-500">Ctrl+A to accept &nbsp;|&nbsp; Esc to go back</span>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-4 flex flex-col gap-6">
        {/* General */}
        <div>
          <div className="text-xs uppercase tracking-widest text-zinc-500 mb-2">General</div>
          <FormRow label="Name" required>
            <input autoFocus className={inputCls} value={form.name} onChange={set("name")} placeholder="Godown / location name" />
          </FormRow>
          <FormRow label="Alias">
            <input className={inputCls} value={form.alias} onChange={set("alias")} placeholder="Short name (optional)" />
          </FormRow>
          <FormRow label="Under">
            <button
              type="button"
              onClick={() => setShowPanel(true)}
              className="w-full text-left text-sm py-1 px-1 bg-transparent outline-none text-zinc-700 hover:text-black transition-colors"
            >
              {selectedGodownLabel}
            </button>
          </FormRow>
          <FormRow label="Allow Storage of Materials">
            <select className="w-full bg-transparent text-sm outline-none py-1 px-1 rounded-sm cursor-pointer" value={form.allow_storage_of_materials} onChange={set("allow_storage_of_materials")}>
              <option value="1">Yes</option>
              <option value="0">No</option>
            </select>
          </FormRow>
        </div>

        {/* Address */}
        <div>
          <div className="text-xs uppercase tracking-widest text-zinc-500 mb-2">Address</div>
          <FormRow label="Address">
            <input className={inputCls} value={form.address} onChange={set("address")} placeholder="Street / building (optional)" />
          </FormRow>
          <FormRow label="City">
            <input className={inputCls} value={form.city} onChange={set("city")} placeholder="City (optional)" />
          </FormRow>
          <FormRow label="State">
            <input className={inputCls} value={form.state} onChange={set("state")} placeholder="State (optional)" />
          </FormRow>
          <FormRow label="Pincode">
            <input className={inputCls} value={form.pincode} onChange={set("pincode")} placeholder="6-digit pincode (optional)" maxLength={6} />
          </FormRow>
        </div>
      </div>

      {success && (
        <div className="px-6 py-2 border-t border-green-900 bg-green-950 text-green-400 text-sm shrink-0">✓ {success}</div>
      )}
      {error && (
        <div className="px-6 py-2 border-t border-red-900 bg-red-950 text-red-400 text-sm flex justify-between items-center shrink-0">
          <span>⚠ {error}</span>
          <button onClick={() => setError(null)} className="text-xs ml-4 hover:opacity-70">dismiss</button>
        </div>
      )}

      <div className="px-6 py-3 flex justify-between items-center shrink-0">
        <button
          onClick={handleDelete}
          disabled={loading}
          className="text-sm px-4 py-1.5 rounded border border-red-300 text-red-500 hover:bg-red-50 disabled:opacity-50 transition-colors"
        >
          Delete
        </button>
        <div className="flex gap-3">
          <button
            onClick={() => { setSelectedGodown(null); setForm(null); }}
            className="text-sm px-4 py-1.5 rounded border text-zinc-600 hover:bg-zinc-100 transition-colors"
          >
            Back
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="text-sm px-5 py-1.5 rounded bg-black text-white hover:bg-zinc-800 disabled:opacity-50 transition-colors font-medium"
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