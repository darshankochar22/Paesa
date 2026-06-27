import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useCompany } from "@/context/CompanyContext";
import { PageTitleBar, RightActionPanel, SearchInput, DataTable } from "@/components/ui";
import CostCentreFlatList from "@/components/CostCentreFlatList";
import type { CostCentreType } from "@/types/api";

function Row({ label, required, children, onClick }: { label: string; required?: boolean; children: React.ReactNode; onClick?: () => void }) {
  return (
    <div className={`flex items-start min-h-[36px] border-b border-zinc-100 last:border-0 ${onClick ? "cursor-pointer hover:bg-zinc-50" : ""}`} onClick={onClick}>
      <span className="w-64 text-[12px] text-zinc-600 shrink-0 py-1.5 pl-3 select-none">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </span>
      <span className="text-zinc-400 mr-2 py-1.5 select-none">:</span>
      <div className="flex-1 py-1">{children}</div>
    </div>
  );
}

const inputCls = "w-full bg-transparent text-[12px] font-bold text-zinc-950 font-mono outline-none py-1 px-1 rounded-sm placeholder:text-zinc-300 border-b border-transparent focus:border-zinc-300 transition-colors";

function SelectionPanel({
  costCentres,
  onSelect,
  onCancel,
  onCreate,
}: {
  costCentres: CostCentreType[];
  onSelect: (cc: CostCentreType) => void;
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

  const filtered = costCentres.filter((cc) =>
    cc.name.toLowerCase().includes(search.toLowerCase()) ||
    (cc.alias && cc.alias.toLowerCase().includes(search.toLowerCase()))
  );

  const columns = [
    {
      key: "name",
      label: "Name",
      span: "col-span-5",
      render: (r: CostCentreType) => (
        <span className="font-bold text-zinc-900 text-xs">{r.name}</span>
      ),
    },
    {
      key: "alias",
      label: "Alias",
      span: "col-span-3",
      render: (r: CostCentreType) => (
        <span className="text-zinc-500 font-semibold">{r.alias || "—"}</span>
      ),
    },
    {
      key: "parent",
      label: "Under",
      span: "col-span-4",
      render: (r: CostCentreType) => {
        const parent = costCentres.find((cc) => cc.cc_id === r.parent_id);
        return (
          <span className="text-zinc-500 font-semibold">{parent ? parent.name : "Primary"}</span>
        );
      },
    },
  ];

  const selectionActions = [
    { key: "Alt+C", label: "Create Cost Centre", onClick: onCreate },
    { key: "Esc", label: "Quit", onClick: onCancel },
  ];

  return (
    <div className="flex-1 flex flex-col h-full bg-white select-none font-mono text-[12px]">
      <PageTitleBar title="Alter Cost Centre" subtitle="Select Cost Centre to Alter" />

      <div className="p-3 bg-zinc-50 border-b border-zinc-200 shrink-0 font-sans">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search cost centres by name or alias…"
          autoFocus
        />
      </div>

      <div className="flex-1 flex min-h-0">
        <div className="flex-1 flex flex-col bg-white border-r border-zinc-100">
          <DataTable
            columns={columns}
            rows={filtered}
            rowKey={(r: CostCentreType) => String(r.cc_id)}
            onRowClick={onSelect}
            emptyMessage="No cost centres found."
          />
        </div>
        <RightActionPanel actions={selectionActions} />
      </div>

      <div className="border-t border-zinc-200 p-3 flex justify-end bg-zinc-50 font-sans">
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

export default function CostCentreAlter() {
  const navigate = useNavigate();
  const { selectedCompany } = useCompany();
  const companyId = selectedCompany?.company_id;

  const [costCentres, setCostCentres] = useState<CostCentreType[]>([]);
  const [selectedCC, setSelectedCC] = useState<CostCentreType | null>(null);
  const [form, setForm] = useState<Partial<CostCentreType> | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showCCPanel, setShowCCPanel] = useState(false);
  const [showAcceptPrompt, setShowAcceptPrompt] = useState(false);

  const nameInputRef = useRef<HTMLInputElement>(null);
  const aliasInputRef = useRef<HTMLInputElement>(null);

  const loadCostCentres = useCallback(async () => {
    if (!companyId) return;
    const ccRes = await window.api.costCentre.getAll(companyId);
    if (ccRes.success) setCostCentres(ccRes.costCentres ?? []);
  }, [companyId]);

  useEffect(() => {
    loadCostCentres();
  }, [loadCostCentres]);

  const handleSelectCC = (cc: CostCentreType) => {
    setSelectedCC(cc);
    setForm({
      name: cc.name,
      alias: cc.alias || "",
      parent_id: cc.parent_id,
    });
    setError(null);
    setSuccess(null);
  };

  const handleCCSelect = (cc: CostCentreType) => {
    setForm((f) => (f ? { ...f, parent_id: cc.cc_id } : f));
    setShowCCPanel(false);
  };

  const handleSelectPrimary = () => {
    setForm((f) => (f ? { ...f, parent_id: undefined } : f));
    setShowCCPanel(false);
  };

  const setField = (key: keyof CostCentreType) => (
    e: React.ChangeEvent<HTMLInputElement>
  ) => setForm((f) => (f ? { ...f, [key]: e.target.value } : f));

  const validate = (): string | null => {
    if (!form?.name?.trim()) return "Cost centre name is required.";
    if (!companyId) return "No company selected.";
    if (selectedCC && form.parent_id === selectedCC.cc_id) {
      return "Cost centre cannot be parent of itself.";
    }
    return null;
  };

  const handleSubmit = useCallback(async () => {
    if (!form || !selectedCC) return;
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const result = await window.api.costCentre.update({
        cc_id: selectedCC.cc_id,
        company_id: companyId,
        name: form.name!.trim(),
        alias: form.alias?.trim() || undefined,
        parent_id: form.parent_id ? Number(form.parent_id) : null,
      } as any);

      if (result.success) {
        setSuccess(`Cost Centre "${form.name}" updated successfully.`);
        await loadCostCentres();
        setTimeout(() => {
          setSuccess(null);
          setSelectedCC(null);
          setForm(null);
        }, 1200);
      } else {
        setError(result.error || "Failed to update cost centre.");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unexpected error.");
    } finally {
      setLoading(false);
    }
  }, [form, selectedCC, companyId, loadCostCentres]);

  const handleDelete = useCallback(async () => {
    if (!selectedCC) return;
    if (!window.confirm(`Delete cost centre "${selectedCC.name}"?`)) return;

    setLoading(true);
    setError(null);
    try {
      const result = await window.api.costCentre.delete(selectedCC.cc_id!);
      if (result.success) {
        setSuccess("Cost Centre deleted successfully.");
        await loadCostCentres();
        setTimeout(() => {
          setSuccess(null);
          setSelectedCC(null);
          setForm(null);
        }, 1200);
      } else {
        setError(result.error || "Failed to delete cost centre.");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unexpected error.");
    } finally {
      setLoading(false);
    }
  }, [selectedCC, loadCostCentres]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        if (showAcceptPrompt) {
          setShowAcceptPrompt(false);
        } else if (showCCPanel) {
          setShowCCPanel(false);
        } else if (selectedCC) {
          setSelectedCC(null);
          setForm(null);
        } else {
          navigate("/master/alter");
        }
      }
      if ((e.ctrlKey || e.altKey) && e.key.toLowerCase() === "a") {
        e.preventDefault();
        if (selectedCC) {
          if (showAcceptPrompt) {
            handleSubmit();
          } else {
            setShowAcceptPrompt(true);
          }
        }
      }
      if (e.altKey && e.key.toLowerCase() === "d") {
        e.preventDefault();
        if (selectedCC) {
          handleDelete();
        }
      }

      if (showAcceptPrompt) {
        const k = e.key.toLowerCase();
        if (k === "y" || e.key === "Enter") {
          e.preventDefault();
          handleSubmit();
        } else if (k === "n") {
          e.preventDefault();
          setShowAcceptPrompt(false);
        }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handleSubmit, handleDelete, navigate, selectedCC, showCCPanel, showAcceptPrompt]);

  const handleFormKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (e.currentTarget === nameInputRef.current) {
        aliasInputRef.current?.focus();
      } else if (e.currentTarget === aliasInputRef.current) {
        setShowCCPanel(true);
      }
    }
  };

  if (!selectedCC || !form) {
    return (
      <SelectionPanel
        costCentres={costCentres}
        onSelect={handleSelectCC}
        onCancel={() => navigate("/master/alter")}
        onCreate={() => navigate("/master/create/cost-centre")}
      />
    );
  }

  const parentCC = form.parent_id
    ? costCentres.find((cc) => cc.cc_id === form.parent_id)
    : null;

  // Filter out self and any descendants from potential parents to prevent loops
  const eligibleParents = costCentres.filter((cc) => cc.cc_id !== selectedCC.cc_id);

  const alterActions = [
    { key: "Alt+A", label: "Accept", onClick: () => setShowAcceptPrompt(true) },
    { key: "Alt+D", label: "Delete", onClick: handleDelete },
    { key: "Esc", label: "Back", onClick: () => { setSelectedCC(null); setForm(null); } },
  ];

  return (
    <div className="flex-1 flex h-full bg-zinc-50 select-none text-zinc-950 font-mono text-[12px]">
      <div className="flex-1 flex flex-col min-h-0 relative p-6">
        <div className="flex items-center gap-4 mb-6 shrink-0">
          <button onClick={() => { setSelectedCC(null); setForm(null); }} className="text-xs text-zinc-500 hover:text-zinc-800 font-sans">
            &larr; Back to Selection
          </button>
          <span className="font-bold text-zinc-700 font-sans text-sm">Alter Cost Centre</span>
        </div>

        {error && (
          <div className="mb-4 p-2 border border-red-200 bg-red-50 text-red-700 text-xs flex justify-between items-center shrink-0 font-sans">
            <span>• {error}</span>
            <button onClick={() => setError(null)} className="text-red-500 hover:text-red-700 font-bold">&times;</button>
          </div>
        )}
        {success && (
          <div className="mb-4 p-2 border border-green-200 bg-green-50 text-green-700 text-xs flex justify-between items-center shrink-0 font-sans">
            <span>• {success}</span>
            <button onClick={() => setSuccess(null)} className="text-green-500 hover:text-green-700 font-bold">&times;</button>
          </div>
        )}

        <div className="flex-1 flex min-h-0 relative">
          <div className="flex-1 flex items-center justify-center p-4">
            <div className="w-[600px] bg-white border border-zinc-300 shadow-md flex flex-col relative overflow-hidden">
              {/* Header banner */}
              <div className="bg-zinc-100 px-3 py-1.5 border-b border-zinc-200 text-center font-bold text-xs uppercase tracking-wider text-zinc-700">
                Cost Centre Alteration
              </div>

              <div className="p-4 flex flex-col gap-1">
                <Row label="Name" required>
                  <input
                    ref={nameInputRef}
                    autoFocus
                    className={inputCls}
                    value={form.name || ""}
                    onChange={setField("name")}
                    onKeyDown={handleFormKeyDown}
                  />
                </Row>
                <Row label="(alias)">
                  <input
                    ref={aliasInputRef}
                    className={inputCls}
                    value={form.alias || ""}
                    onChange={setField("alias")}
                    onKeyDown={handleFormKeyDown}
                  />
                </Row>
                <Row label="Under" onClick={() => setShowCCPanel(true)}>
                  <span className="text-[12px] font-bold text-zinc-950 font-mono py-1 px-1 block cursor-pointer">
                    {parentCC ? parentCC.name : "Primary"}
                  </span>
                </Row>
              </div>

              {/* Accept? Confirmation Overlay */}
              {showAcceptPrompt && (
                <div className="absolute bottom-4 right-4 bg-white border-2 border-zinc-800 p-4 shadow-lg z-50 flex flex-col items-center min-w-[150px] font-sans">
                  <div className="text-xs font-bold text-zinc-800 mb-3">Accept?</div>
                  <div className="flex gap-4">
                    <button
                      onClick={handleSubmit}
                      className="px-4 py-1 bg-zinc-900 text-white text-xs font-bold hover:bg-zinc-800 rounded shadow"
                    >
                      Yes (Y)
                    </button>
                    <button
                      onClick={() => setShowAcceptPrompt(false)}
                      className="px-4 py-1 border border-zinc-300 text-zinc-600 text-xs font-bold hover:bg-zinc-50 rounded"
                    >
                      No (N)
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
          <RightActionPanel actions={alterActions} />
        </div>

        {/* Bottom actions footer */}
        <div className="border-t border-zinc-200 pt-3 flex justify-between bg-zinc-50 shrink-0 font-sans pr-2 pl-2">
          <button
            onClick={handleDelete}
            disabled={loading}
            className="text-xs px-4 py-1.5 rounded border border-red-200 text-red-500 hover:bg-red-50 hover:border-red-300 disabled:opacity-50 transition-colors font-medium shadow-sm"
          >
            Delete (Alt+D)
          </button>
          <div className="flex gap-3">
            <button
              onClick={() => { setSelectedCC(null); setForm(null); }}
              className="text-xs px-4 py-1.5 rounded border border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50 shadow-sm transition-colors font-medium"
            >
              Quit
            </button>
            <button
              onClick={() => setShowAcceptPrompt(true)}
              disabled={loading}
              className="text-xs px-5 py-1.5 rounded bg-black text-white hover:bg-zinc-800 disabled:opacity-50 shadow-sm transition-colors font-medium"
            >
              {loading ? "Saving..." : "Accept"}
            </button>
          </div>
        </div>
      </div>

      {/* Right panel parent selection */}
      {showCCPanel && (
        <div className="w-80 border-l border-zinc-200 flex flex-col shrink-0 bg-white animate-slide-in">
          <div className="flex items-center justify-between px-3 py-2 border-b border-zinc-200 bg-zinc-50 select-none shrink-0 font-sans">
            <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Under Cost Centre</span>
            <button onClick={() => setShowCCPanel(false)} className="text-sm font-bold text-zinc-400 hover:text-zinc-800 transition-colors">&times;</button>
          </div>
          <div
            className={`flex items-center min-h-[28px] px-3 py-1 cursor-pointer text-[12px] select-none border-b ${!form.parent_id ? "bg-zinc-100 font-bold text-black" : "text-zinc-700 hover:bg-zinc-50"}`}
            onClick={handleSelectPrimary}
          >
            <span className="truncate">Primary</span>
          </div>
          <div className="flex-1 min-h-0">
            <CostCentreFlatList
              costCentres={eligibleParents}
              selectedId={form.parent_id as number}
              onSelect={handleCCSelect}
              showHeader={false}
            />
          </div>
        </div>
      )}
    </div>
  );
}