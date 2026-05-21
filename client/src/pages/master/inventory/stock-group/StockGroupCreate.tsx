import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useCompany } from "@/context/CompanyContext";
import FormRow from "@/components/ui/FormRow";
import type { StockGroupType } from "@/types/api";

// ── Shared style tokens (LedgerCreate style) ──────────────────────────────
const inputCls = "flex-1 bg-transparent text-sm outline-none px-1 py-0.5 border border-transparent";
const selectCls = "bg-transparent text-sm outline-none px-1 py-0.5 border border-transparent";

// ── Group list slide-in panel ────────────────────────────────────────────
function GroupListPanel({
  groups,
  selected,
  onSelect,
  onClose,
  onCreate,
}: {
  groups: StockGroupType[];
  selected: string;
  onSelect: (id: string) => void;
  onClose: () => void;
  onCreate: () => void;
}) {
  return (
    <div className="w-72 border-l flex flex-col shrink-0">
      <div className="px-2 py-1 text-sm font-medium flex justify-between items-center select-none">
        <span>List of Groups</span>
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
        {/* Primary (root) option */}
        <div
          onClick={() => { onSelect(""); onClose(); }}
          className={[
            "text-sm px-3 py-1 border-b border-zinc-100 cursor-pointer select-none italic",
            selected === "" ? "bg-zinc-800 text-white" : "hover:bg-zinc-50 text-zinc-500",
          ].join(" ")}
        >
          Primary
        </div>
        {groups
          .filter((g) => g.name.toLowerCase() !== "primary")
          .map((g) => (
            <div
              key={g.sg_id}
              onClick={() => { onSelect(String(g.sg_id)); onClose(); }}
              className={[
                "text-sm px-3 py-1 border-b border-zinc-100 cursor-pointer select-none",
                selected === String(g.sg_id) ? "bg-zinc-800 text-white" : "hover:bg-zinc-50",
              ].join(" ")}
            >
              {g.name}
            </div>
          ))}
        {groups.filter((g) => g.name.toLowerCase() !== "primary").length === 0 && (
          <div className="text-xs text-zinc-400 px-3 py-2">No groups yet</div>
        )}
      </div>
    </div>
  );
}

interface FormData {
  name: string;
  alias: string;
  parent_group_id: string;
  should_quantities_be_added: string;
}

const INITIAL: FormData = {
  name: "",
  alias: "",
  parent_group_id: "",
  should_quantities_be_added: "1",
};

export default function StockGroupCreate() {
  const navigate = useNavigate();
  const { selectedCompany } = useCompany();
  const [form, setForm] = useState<FormData>(INITIAL);
  const [stockGroups, setStockGroups] = useState<StockGroupType[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showPanel, setShowPanel] = useState(false);

  useEffect(() => {
    const company_id = selectedCompany?.company_id;
    if (!company_id) return;
    window.api.stockGroup.getAll(company_id).then(r => {
      if (r.success) setStockGroups(r.stockGroups ?? []);
    });
  }, [selectedCompany]);

  const setField = (key: keyof FormData) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm(f => ({ ...f, [key]: e.target.value }));

  const validate = (): string | null => {
    if (!form.name.trim()) return "Name is required.";
    if (!selectedCompany?.company_id) return "No company selected.";
    return null;
  };

  const handleSubmit = useCallback(async () => {
    const err = validate();
    if (err) { setError(err); return; }
    setLoading(true); setError(null);
    try {
      const result = await window.api.stockGroup.create({
        company_id: selectedCompany!.company_id,
        name: form.name.trim(),
        alias: form.alias.trim() || undefined,
        parent_group_id: form.parent_group_id ? Number(form.parent_group_id) : undefined,
        should_quantities_be_added: Number(form.should_quantities_be_added),
      });
      if (result.success) {
        const updated = await window.api.stockGroup.getAll(selectedCompany!.company_id!);
        if (updated.success) setStockGroups(updated.stockGroups ?? []);
        setSuccess(`Stock Group "${form.name}" created.`);
        setForm(INITIAL);
        setTimeout(() => setSuccess(null), 3000);
      } else {
        setError(result.error || "Failed to create stock group.");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unexpected error.");
    } finally {
      setLoading(false);
    }
  }, [form, selectedCompany]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") { if (showPanel) setShowPanel(false); else navigate("/master/create"); }
      if (e.ctrlKey && e.key === "a") { e.preventDefault(); handleSubmit(); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handleSubmit, navigate, showPanel]);

  const selectedGroupLabel = form.parent_group_id
    ? stockGroups.find(g => String(g.sg_id) === form.parent_group_id)?.name ?? "Primary"
    : "Primary";

  return (
    <div className="flex-1 flex flex-col h-full bg-white">

      {/* Title bar */}
      <div className="px-3 py-1 text-sm font-medium flex justify-between items-center select-none">
        <span>Stock Group Creation</span>
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

      <div className="flex-1 flex min-h-0">

        {/* Left: form fields */}
        <div className="flex-1 flex flex-col min-w-0">
          <div className="p-2 space-y-0.5">
            <FormRow label="Name" labelWidth="w-56" className="flex items-center min-h-[22px]">
              <input autoFocus className={inputCls} value={form.name} onChange={setField("name")} />
            </FormRow>
            <FormRow label="(alias)" labelWidth="w-56" className="flex items-center min-h-[22px]">
              <input className={inputCls} value={form.alias} onChange={setField("alias")} />
            </FormRow>
            {/* Under — click to open group panel */}
            <div
              className="flex items-center min-h-[22px] cursor-pointer hover:bg-zinc-50"
              onClick={() => setShowPanel(v => !v)}
            >
              <span className="w-56 text-sm shrink-0">Under</span>
              <span className="text-zinc-600 mr-2 shrink-0">:</span>
              <span className="text-sm px-1 py-0.5">{selectedGroupLabel}</span>
            </div>
            <FormRow label="Should Quantities be Added" labelWidth="w-56" className="flex items-center min-h-[22px]">
              <select className={selectCls} value={form.should_quantities_be_added} onChange={setField("should_quantities_be_added")}>
                <option value="1">Yes</option>
                <option value="0">No</option>
              </select>
            </FormRow>
          </div>
          <div className="flex-1" />
        </div>

        {/* Group panel */}
        {showPanel && (
          <GroupListPanel
            groups={stockGroups}
            selected={form.parent_group_id}
            onSelect={val => setForm(f => ({ ...f, parent_group_id: val }))}
            onClose={() => setShowPanel(false)}
            onCreate={() => { setShowPanel(false); navigate("/master/create/stock-group"); }}
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