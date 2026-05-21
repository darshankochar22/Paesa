import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useCompany } from "@/context/CompanyContext";
import FormRow from "@/components/ui/FormRow";
import type { GodownType } from "@/types/api";

const inputCls = "flex-1 bg-transparent text-sm outline-none px-1 py-0.5 border border-transparent";
const selectCls = "bg-transparent text-sm outline-none px-1 py-0.5 border border-transparent cursor-pointer";

// ── Godown List Panel ────────────────────────────────────────────────────────
function GodownListPanel({
  godowns,
  selected,
  onSelect,
  onClose,
  onCreate,
}: {
  godowns: GodownType[];
  selected: string;
  onSelect: (id: string) => void;
  onClose: () => void;
  onCreate: () => void;
}) {
  return (
    <div className="w-72 border-l flex flex-col shrink-0 bg-white h-full z-10">
      <div className="px-2 py-1 text-sm font-medium flex justify-between items-center select-none border-b">
        <span>List of Godowns</span>
        <div className="flex items-center gap-2">
          <button
            onClick={onCreate}
            className="text-xs text-zinc-500 hover:text-black underline underline-offset-1"
          >
            Create
          </button>
          <button onClick={onClose} className="text-xs hover:underline">&times;</button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto">
        <div
          onClick={() => { onSelect(""); onClose(); }}
          className={[
            "text-sm px-3 py-1 border-b border-zinc-100 cursor-pointer select-none italic",
            selected === "" ? "bg-zinc-800 text-white" : "hover:bg-zinc-50 text-zinc-500",
          ].join(" ")}
        >
          Primary
        </div>
        {godowns
          .filter((g) => g.name.toLowerCase() !== "primary")
          .map((g) => (
            <div
              key={g.godown_id}
              onClick={() => { onSelect(String(g.godown_id)); onClose(); }}
              className={[
                "text-sm px-3 py-1 border-b border-zinc-100 cursor-pointer select-none",
                selected === String(g.godown_id) ? "bg-zinc-800 text-white" : "hover:bg-zinc-50",
              ].join(" ")}
            >
              {g.name}
            </div>
          ))}
        {godowns.filter((g) => g.name.toLowerCase() !== "primary").length === 0 && (
          <div className="text-xs text-zinc-400 px-3 py-2">No godowns yet</div>
        )}
      </div>
    </div>
  );
}

interface FormData {
  name: string;
  alias: string;
  parent_godown_id: string;
  allow_storage_of_materials: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
}

const INITIAL: FormData = {
  name: "",
  alias: "",
  parent_godown_id: "",
  allow_storage_of_materials: "1",
  address: "",
  city: "",
  state: "",
  pincode: "",
};

export default function GodownCreate() {
  const navigate = useNavigate();
  const { selectedCompany } = useCompany();
  const [form, setForm] = useState<FormData>(INITIAL);
  const [godowns, setGodowns] = useState<GodownType[]>([]);
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

  const setField = (key: keyof FormData) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm(f => ({ ...f, [key]: e.target.value }));

  const validate = (): string | null => {
    if (!form.name.trim()) return "Name is required.";
    if (!selectedCompany?.company_id) return "No company selected.";
    if (form.pincode && !/^\d{0,6}$/.test(form.pincode)) {
      return "Pincode must be numeric (max 6 digits).";
    }
    return null;
  };

  const handleSubmit = useCallback(async () => {
    const err = validate();
    if (err) { setError(err); return; }
    setLoading(true); setError(null);
    try {
      const result = await window.api.godown.create({
        company_id: selectedCompany!.company_id,
        name: form.name.trim(),
        alias: form.alias.trim() || undefined,
        parent_godown_id: form.parent_godown_id ? Number(form.parent_godown_id) : undefined,
        allow_storage_of_materials: Number(form.allow_storage_of_materials),
        address: form.address.trim() || undefined,
        city: form.city.trim() || undefined,
        state: form.state.trim() || undefined,
        pincode: form.pincode.trim() || undefined,
      });
      if (result.success) {
        const updated = await window.api.godown.getAll(selectedCompany!.company_id!);
        if (updated.success) setGodowns(updated.godowns ?? []);
        setSuccess(`Godown "${form.name}" created.`);
        setForm(INITIAL);
        setTimeout(() => setSuccess(null), 3000);
      } else {
        setError(result.error || "Failed to create godown.");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unexpected error.");
    } finally {
      setLoading(false);
    }
  }, [form, selectedCompany]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (showPanel) setShowPanel(false);
        else navigate("/master/create");
      }
      if (e.ctrlKey && e.key === "a") { e.preventDefault(); handleSubmit(); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handleSubmit, navigate, showPanel]);

  const selectedGodownLabel = form.parent_godown_id
    ? godowns.find(g => String(g.godown_id) === form.parent_godown_id)?.name ?? "Primary"
    : "Primary";

  return (
    <div className="flex-1 flex flex-col h-full bg-white">
      {/* Title bar */}
      <div className="px-3 py-1 text-sm font-medium flex justify-between items-center select-none">
        <span>Godown Creation</span>
      </div>

      {error && (
        <div className="px-3 py-1 border-b border-red-200 bg-red-50 text-red-700 text-xs flex justify-between items-center">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="text-red-500 hover:text-red-700 text-xs">dismiss</button>
        </div>
      )}
      {success && (
        <div className="px-3 py-1 border-b border-green-200 bg-green-50 text-green-700 text-xs flex justify-between items-center">
          <span>{success}</span>
          <button onClick={() => setSuccess(null)} className="text-green-500 hover:text-green-700 text-xs">dismiss</button>
        </div>
      )}

      <div className="flex-1 flex min-h-0 overflow-x-auto">
        {/* Left Column: General Details */}
        <div className="flex-1 flex flex-col min-w-0 shrink-0 p-2 space-y-0.5">
          <FormRow label="Name" labelWidth="w-48" className="flex items-center min-h-[22px]">
            <input autoFocus className={inputCls} value={form.name} onChange={setField("name")} />
          </FormRow>
          <FormRow label="(alias)" labelWidth="w-48" className="flex items-center min-h-[22px]">
            <input className={inputCls} value={form.alias} onChange={setField("alias")} />
          </FormRow>

          {/* Under */}
          <div
            className="flex items-center min-h-[22px] cursor-pointer hover:bg-zinc-50 text-sm"
            onClick={() => setShowPanel(!showPanel)}
          >
            <span className="w-48 text-zinc-400 shrink-0 py-1">Under</span>
            <span className="text-zinc-600 mr-2 shrink-0">:</span>
            <span className="flex-1 px-1 py-0.5">{selectedGodownLabel}</span>
          </div>

          <FormRow label="Allow Storage of Materials" labelWidth="w-48" className="flex items-center min-h-[22px]">
            <select className={selectCls} value={form.allow_storage_of_materials} onChange={setField("allow_storage_of_materials")}>
              <option value="1">Yes</option>
              <option value="0">No</option>
            </select>
          </FormRow>
          <div className="flex-1" />
        </div>

        {/* Right Column: Address Details */}
        <div className="w-80 border-l flex flex-col p-2 space-y-0.5 shrink-0 bg-zinc-50/30">
          <div className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">Address Details</div>
          
          <FormRow label="Address" labelWidth="w-20" className="flex items-center min-h-[22px]">
            <input className={inputCls} value={form.address} onChange={setField("address")} placeholder="Street/Building" />
          </FormRow>
          <FormRow label="City" labelWidth="w-20" className="flex items-center min-h-[22px]">
            <input className={inputCls} value={form.city} onChange={setField("city")} placeholder="City" />
          </FormRow>
          <FormRow label="State" labelWidth="w-20" className="flex items-center min-h-[22px]">
            <input className={inputCls} value={form.state} onChange={setField("state")} placeholder="State" />
          </FormRow>
          <FormRow label="Pincode" labelWidth="w-20" className="flex items-center min-h-[22px]">
            <input className={inputCls} value={form.pincode} onChange={setField("pincode")} placeholder="6-digit Pincode" maxLength={6} />
          </FormRow>
        </div>

        {/* Under (Parent Godown) Selection Panel */}
        {showPanel && (
          <GodownListPanel
            godowns={godowns}
            selected={form.parent_godown_id}
            onSelect={val => setForm(f => ({ ...f, parent_godown_id: val }))}
            onClose={() => setShowPanel(false)}
            onCreate={() => { setShowPanel(false); navigate("/master/create/godown"); }}
          />
        )}
      </div>

      {/* Footer */}
      <div className="border-t p-2 flex justify-between items-center bg-zinc-50">
        <button onClick={() => navigate("/master/create")} className="text-xs text-zinc-500 hover:text-zinc-800">
          &larr; Back to Masters
        </button>
        <button
          onClick={handleSubmit}
          disabled={loading}
          className="text-sm px-5 py-1 rounded bg-black text-white hover:bg-zinc-800 disabled:opacity-50 transition-colors font-medium"
        >
          {loading ? "Saving..." : "Create"}
        </button>
      </div>
    </div>
  );
}