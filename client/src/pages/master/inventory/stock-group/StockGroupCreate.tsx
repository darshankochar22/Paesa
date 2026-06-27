import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useCompany } from "@/context/CompanyContext";
import { FormRow, PageTitleBar, RightActionPanel } from "@/components/ui";
import type { StockGroupType } from "@/types/api";
import StatutorySection from "@/pages/master/group/StatutorySection";
import {
  initialStockGroupStatutory,
  buildStockGroupGstPayload,
  type StockGroupStatutory,
} from "./utils";

const inputCls = "flex-1 bg-transparent text-sm outline-none px-1 py-0.5 border border-transparent";
const selectCls = "bg-transparent text-sm outline-none px-1 py-0.5 border border-transparent cursor-pointer";

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
    <div className="w-72 border-l border-zinc-200 flex flex-col shrink-0 bg-white">
      <div className="px-3 py-2 text-xs font-bold uppercase tracking-wider flex justify-between items-center select-none border-b border-zinc-150">
        <span>List of Groups</span>
        <div className="flex items-center gap-2 font-normal">
          <button
            onClick={onCreate}
            className="text-xs text-zinc-500 hover:text-black underline underline-offset-1"
          >
            Create
          </button>
          <button onClick={onClose} className="text-sm font-bold font-sans hover:text-red-500">&times;</button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto">
        <div
          onClick={() => { onSelect(""); onClose(); }}
          className={[
            "text-xs px-3 py-1.5 border-b border-zinc-100 cursor-pointer select-none italic",
            selected === "" ? "bg-zinc-900 text-white" : "hover:bg-zinc-50 text-zinc-500",
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
                "text-xs px-3 py-1.5 border-b border-zinc-100 cursor-pointer select-none",
                selected === String(g.sg_id) ? "bg-zinc-900 text-white" : "hover:bg-zinc-50 text-zinc-800",
              ].join(" ")}
            >
              {g.name}
            </div>
          ))}
        {groups.filter((g) => g.name.toLowerCase() !== "primary").length === 0 && (
          <div className="text-xs text-zinc-400 px-3 py-2 italic">No groups yet</div>
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
  should_quantities_be_added: "0", // Tally default: No
};

export default function StockGroupCreate() {
  const navigate = useNavigate();
  const { selectedCompany } = useCompany();

  const [form, setForm] = useState<FormData>(
    INITIAL
  );
  const [stat, setStat] = useState<StockGroupStatutory>(initialStockGroupStatutory());
  const [stockGroups, setStockGroups] = useState<StockGroupType[]>([]);
  const [gstClassifications, setGstClassifications] = useState<{ gc_id: number; name: string }[]>([]);
  const [showClassPanel, setShowClassPanel] = useState<"hsn" | "gst" | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showPanel, setShowPanel] = useState(false);

  const companyId = selectedCompany?.company_id;

  useEffect(() => {
    if (!companyId) return;
    window.api.stockGroup.getAll(companyId).then(r => {
      if (r.success) setStockGroups(r.stockGroups ?? []);
    });
    window.api.gstClassification.getAll(companyId).then((r) => {
      if (r.success && r.gstClassifications) {
        setGstClassifications((r.gstClassifications as any[]).map((c) => ({ gc_id: c.gc_id, name: c.name })));
      }
    });
  }, [companyId]);

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
      const gst = buildStockGroupGstPayload(stat);

      const result = await window.api.stockGroup.create({
        company_id:                 selectedCompany!.company_id,
        name:                       form.name.trim(),
        alias:                      form.alias.trim() || null,
        parent_group_id:            form.parent_group_id ? Number(form.parent_group_id) : null,
        should_quantities_be_added: Number(form.should_quantities_be_added),
        ...gst,
      });

      if (result.success) {
        const updated = await window.api.stockGroup.getAll(selectedCompany!.company_id!);
        if (updated.success) setStockGroups(updated.stockGroups ?? []);
        setSuccess(`Stock Group "${form.name}" created.`);
        setForm(INITIAL);
        setStat(initialStockGroupStatutory());
        setTimeout(() => setSuccess(null), 3000);
      } else {
        setError(result.error || "Failed to create stock group.");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unexpected error.");
    } finally {
      setLoading(false);
    }
  }, [form, stat, selectedCompany]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        if (showClassPanel) setShowClassPanel(null);
        else if (showPanel) setShowPanel(false);
        else navigate("/master/create");
      }
      if (e.altKey && e.key.toLowerCase() === "g") { e.preventDefault(); setShowPanel(prev => !prev); }
      if (e.altKey && e.key.toLowerCase() === "a") { e.preventDefault(); handleSubmit(); }
      if (e.ctrlKey && e.key.toLowerCase() === "a") { e.preventDefault(); handleSubmit(); }
      if (e.altKey && e.key.toLowerCase() === "c") { e.preventDefault(); navigate("/master/alter/stock-group"); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handleSubmit, navigate, showPanel, showClassPanel]);

  const selectedGroupLabel = form.parent_group_id
    ? stockGroups.find(g => String(g.sg_id) === form.parent_group_id)?.name ?? "Primary"
    : "Primary";

  const groupActions = [
    { key: "Alt+G", label: "Select Group", onClick: () => setShowPanel(prev => !prev) },
    { key: "Alt+A", label: "Accept",       onClick: handleSubmit },
    { key: "Alt+C", label: "Alter Group",  onClick: () => navigate("/master/alter/stock-group") },
    { key: "Esc",   label: "Quit",         onClick: () => navigate("/master/create") },
  ];

  return (
    <div className="flex-1 flex flex-col h-full bg-white select-none">
      <PageTitleBar title="Stock Group Creation" subtitle={selectedCompany?.name} />

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
        {/* Form */}
        <div className="flex-1 flex flex-col min-w-0 bg-white overflow-y-auto">
          <div className="p-3 space-y-1 max-w-2xl">

            <FormRow label="Name" labelWidth="w-56" className="flex items-center min-h-[26px]">
              <input autoFocus className={inputCls} value={form.name} onChange={setField("name")} />
            </FormRow>

            <FormRow label="(alias)" labelWidth="w-56" className="flex items-center min-h-[26px]">
              <input className={inputCls} value={form.alias} onChange={setField("alias")} />
            </FormRow>

            {/* Under — opens group panel */}
            <div
              className="flex items-center min-h-[26px] cursor-pointer hover:bg-zinc-50 text-sm"
              onClick={() => setShowPanel(v => !v)}
            >
              <span className="w-56 text-zinc-400 shrink-0 py-1">Under</span>
              <span className="text-zinc-600 mr-2 shrink-0">:</span>
              <span className="text-sm px-1 py-0.5 font-bold uppercase tracking-wide text-zinc-900">
                {selectedGroupLabel}
              </span>
            </div>

            <FormRow label="Should quantities of items be added" labelWidth="w-56" className="flex items-center min-h-[26px]">
              <select className={selectCls} value={form.should_quantities_be_added} onChange={setField("should_quantities_be_added")}>
                <option value="1">Yes</option>
                <option value="0">No</option>
              </select>
            </FormRow>

            {/* ── Statutory Details (shared with Group / Ledger) ── */}
            <div className="mt-3">
              <StatutorySection
                form={stat}
                setForm={setStat}
                primaryGroupName="Primary"
                companyId={companyId}
                gstClassifications={gstClassifications}
                entityWord="Stock Group"
                showOtherStatutory={false}
                onOpenClassPanel={(target) => { setShowPanel(false); setShowClassPanel(target); }}
              />
            </div>

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

        {/* GST classification panel */}
        {showClassPanel && (
          <div className="w-72 border-l border-zinc-200 flex flex-col shrink-0 bg-white">
            <div className="flex items-center justify-between px-3 py-2 border-b border-zinc-200 bg-zinc-50 select-none">
              <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">List of Classifications</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => { setShowClassPanel(null); navigate("/master/create/gst-classification"); }}
                  className="text-[11px] px-2 py-0.5 bg-black text-white font-medium"
                >
                  Create
                </button>
                <button onClick={() => setShowClassPanel(null)} className="text-sm font-bold text-zinc-400 hover:text-zinc-800 transition-colors">&times;</button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto">
              {gstClassifications.length === 0 ? (
                <div className="px-3 py-6 text-xs text-zinc-400 text-center leading-relaxed">
                  No classifications created yet.<br />Click <strong>Create</strong> to add one.
                </div>
              ) : (
                gstClassifications.map((c) => {
                  const selectedId = showClassPanel === "hsn"
                    ? Number(stat.hsn_sac_classification_id)
                    : Number(stat.gst_classification_id);
                  const isSelected = selectedId === c.gc_id;
                  return (
                    <div
                      key={c.gc_id}
                      onClick={() => {
                        if (showClassPanel === "hsn") {
                          setStat((f) => ({ ...f, hsn_sac_classification_id: c.gc_id }));
                        } else {
                          setStat((f) => ({ ...f, gst_classification_id: c.gc_id }));
                        }
                        setShowClassPanel(null);
                      }}
                      className={`flex items-center min-h-[28px] px-3 cursor-pointer text-[13px] select-none border-b ${isSelected ? "bg-zinc-100 font-semibold text-black" : "text-zinc-700 hover:bg-zinc-50"}`}
                    >
                      <span className="truncate">{c.name}</span>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        <RightActionPanel actions={groupActions} />
      </div>

      {/* Footer */}
      <div className="border-t border-zinc-200 p-3 flex justify-between items-center bg-zinc-50">
        <button onClick={() => navigate("/master/create")} className="text-xs text-zinc-500 hover:text-zinc-800 transition-colors font-medium">
          &larr; Back to Masters
        </button>
        <button
          onClick={handleSubmit}
          disabled={loading}
          className="text-sm px-6 py-1.5 rounded bg-black text-white hover:bg-zinc-800 disabled:opacity-50 transition-colors font-medium"
        >
          {loading ? "Saving..." : "Create"}
        </button>
      </div>
    </div>
  );
}