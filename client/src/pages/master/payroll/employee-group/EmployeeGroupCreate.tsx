import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useCompany } from "@/context/CompanyContext";
import { FormRow, PageTitleBar } from "@/components/ui";
import type { EmployeeGroupType } from "@/types/entities/Employee";

const inputCls = "flex-1 bg-transparent text-sm outline-none px-1.5 py-0.5 border border-transparent hover:border-zinc-200 focus:border-zinc-800 transition-colors bg-white/50 rounded";

interface FormData {
  name: string;
  alias: string;
  parent_group_id: number | null;
}

const INITIAL: FormData = { name: "", alias: "", parent_group_id: null };

export default function EmployeeGroupCreate() {
  const navigate = useNavigate();
  const { selectedCompany } = useCompany();
  const [form, setForm] = useState<FormData>(INITIAL);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [groups, setGroups] = useState<EmployeeGroupType[]>([]);
  const [showGroupPanel, setShowGroupPanel] = useState(false);
  const [selectedParent, setSelectedParent] = useState<EmployeeGroupType | null>(null);
  const companyId = selectedCompany?.company_id;

  useEffect(() => {
    if (!companyId) return;
    window.api.employeeGroup.getAll(companyId).then((res) => {
      if (res.success) {
        setGroups(res.employeeGroups);
        const primary = res.employeeGroups.find((g: EmployeeGroupType) => g.name === "Primary");
        if (primary) { setSelectedParent(primary); setForm(f => ({ ...f, parent_group_id: primary.employee_group_id || null })); }
      }
    });
  }, [companyId]);

  const setField = (key: keyof FormData) =>
    (e: React.ChangeEvent<HTMLInputElement>) => setForm(f => ({ ...f, [key]: e.target.value }));

  const validate = (): string | null => {
    if (!form.name.trim()) return "Name is required.";
    if (!companyId) return "No company selected.";
    return null;
  };

  const handleSubmit = useCallback(async () => {
    const err = validate();
    if (err) { setError(err); return; }
    setLoading(true); setError(null);
    try {
      const result = await window.api.employeeGroup.create({
        company_id: companyId!,
        name: form.name.trim(),
        alias: form.alias.trim() || undefined,
        parent_group_id: form.parent_group_id || undefined,
      });
      if (result.success) {
        setSuccess(`Employee Group "${form.name}" created.`);
        setForm(INITIAL);
        setTimeout(() => setSuccess(null), 3000);
      } else {
        setError(result.error || "Failed to create employee group.");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unexpected error.");
    } finally {
      setLoading(false);
    }
  }, [form, companyId]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !showGroupPanel) {
        e.preventDefault();
        navigate("/master/create");
      }
      if (e.altKey && e.key.toLowerCase() === "a") { e.preventDefault(); handleSubmit(); }
      if (e.altKey && e.key.toLowerCase() === "g" && !showGroupPanel) { e.preventDefault(); setShowGroupPanel(p => !p); }
      if (e.ctrlKey && e.key.toLowerCase() === "a") { e.preventDefault(); handleSubmit(); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handleSubmit, showGroupPanel, navigate]);

  const buildTree = (parentId: number | null): (EmployeeGroupType & { children?: EmployeeGroupType[] })[] => {
    return groups
      .filter(g => g.parent_group_id === parentId)
      .map(g => ({ ...g, children: buildTree(g.employee_group_id || null) }));
  };

  const renderTree = (nodes: (EmployeeGroupType & { children?: EmployeeGroupType[] })[], depth: number = 0) => {
    return nodes.map(node => (
      <div key={node.employee_group_id}>
        <button
          className={`w-full text-left px-2 py-1 text-sm hover:bg-zinc-100 rounded transition-colors ${node.employee_group_id === selectedParent?.employee_group_id ? "bg-zinc-200 font-semibold" : ""}`}
          style={{ paddingLeft: `${8 + depth * 16}px` }}
          onClick={() => {
            setSelectedParent(node);
            setForm(f => ({ ...f, parent_group_id: node.employee_group_id || null }));
            setShowGroupPanel(false);
          }}
        >
          {node.is_predefined ? "◆ " : "◇ "}{node.name}
        </button>
        {node.children && node.children.length > 0 && renderTree(node.children, depth + 1)}
      </div>
    ));
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-white select-none">
      <PageTitleBar title="Employee Group Creation" subtitle={selectedCompany?.name} />

      {error && (
        <div className="px-3 py-1.5 border-b border-red-200 bg-red-50 text-red-700 text-xs flex justify-between items-center">
          <span>* {error}</span>
          <button onClick={() => setError(null)} className="text-red-500 hover:text-red-700 text-xs font-bold">&times;</button>
        </div>
      )}
      {success && (
        <div className="px-3 py-1.5 border-b border-green-200 bg-green-50 text-green-700 text-xs flex justify-between items-center">
          <span>* {success}</span>
          <button onClick={() => setSuccess(null)} className="text-green-500 hover:text-green-700 text-xs font-bold">&times;</button>
        </div>
      )}

      <div className="flex-1 flex min-h-0">
        <div className="flex-1 flex flex-col min-w-0 bg-white border-r border-zinc-100">
          <div className="p-3 space-y-1 max-w-2xl">
            <FormRow label="Name" required labelWidth="w-56" className="flex items-center min-h-[26px]">
              <input autoFocus className={inputCls} value={form.name} onChange={setField("name")} placeholder="e.g. Management" />
            </FormRow>
            <FormRow label="(alias)" labelWidth="w-56" className="flex items-center min-h-[26px]">
              <input className={inputCls} value={form.alias} onChange={setField("alias")} />
            </FormRow>
          </div>

          <div className="p-3 border-t border-zinc-100 bg-zinc-50/20">
            <div className="flex items-center min-h-[26px] cursor-pointer hover:bg-zinc-100/60 px-2 py-0.5 rounded transition-colors" onClick={() => setShowGroupPanel(!showGroupPanel)}>
              <span className="w-20 text-sm shrink-0 font-medium text-zinc-500">Under</span>
              <span className="text-zinc-400 mr-2 shrink-0">:</span>
              <span className="text-sm font-semibold text-zinc-800 underline decoration-dotted">{selectedParent?.name || "-"}</span>
            </div>
          </div>
          <div className="flex-1" />
        </div>

        {showGroupPanel && (
          <div className="w-72 border-l border-zinc-200 flex flex-col shrink-0 bg-white">
            <div className="px-3 py-2 border-b border-zinc-200 bg-zinc-50 text-xs font-bold text-zinc-500 uppercase tracking-wider flex justify-between items-center">
              <span>List of Employee Groups</span>
              <button onClick={() => setShowGroupPanel(false)} className="text-sm font-bold text-zinc-400 hover:text-zinc-800">&times;</button>
            </div>
            <div className="flex-1 overflow-y-auto">{renderTree(buildTree(null))}</div>
          </div>
        )}

      </div>

      <div className="border-t border-zinc-200 p-3 flex justify-between items-center bg-zinc-50">
        <button onClick={() => navigate("/master/create")} className="text-xs text-zinc-500 hover:text-zinc-800 transition-colors font-medium">&larr; Back to Masters</button>
        <button onClick={handleSubmit} disabled={loading} className="text-sm px-6 py-1.5 rounded bg-black text-white hover:bg-zinc-800 disabled:opacity-50 transition-colors font-medium">
          {loading ? "Saving..." : "Create"}
        </button>
      </div>
    </div>
  );
}
