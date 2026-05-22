import { useState, useEffect, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useCompany } from "@/context/CompanyContext";
import type { EmployeeGroupType, EmployeeType } from "@/types/entities/Employee";

interface TreeNode extends EmployeeGroupType {
  children?: TreeNode[];
}

export default function EmployeeGroupCOA() {
  const { selectedCompany } = useCompany();
  const navigate = useNavigate();
  const companyId = selectedCompany?.company_id;
  const [groups, setGroups] = useState<EmployeeGroupType[]>([]);
  const [employees, setEmployees] = useState<EmployeeType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showChangeView, setShowChangeView] = useState(false);
  const [showUnusedOnly, setShowUnusedOnly] = useState(false);
  const [expandedNodes, setExpandedNodes] = useState<Record<string, boolean>>({});
  const [activeDetails, setActiveDetails] = useState<{ type: "group"; id: number } | null>(null);

  useEffect(() => {
    if (!companyId) { setLoading(false); return; }
    let cancelled = false;
    (async () => {
      try {
        setLoading(true); setError(null);
        const [gRes, eRes] = await Promise.all([
          window.api.employeeGroup.getAll(companyId),
          window.api.employee.getAll(companyId),
        ]);
        if (cancelled) return;
        if (gRes.success) setGroups(gRes.employeeGroups ?? []);
        else setError(gRes.error || "Failed to load groups.");
        if (eRes.success) setEmployees(eRes.employees ?? []);
      } catch { if (!cancelled) setError("Failed to load."); }
      finally { if (!cancelled) setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [companyId]);

  const buildTree = (parentId: number | null): TreeNode[] => {
    let items = groups.filter(g => (g.parent_group_id ?? null) === parentId);
    const q = searchQuery.toLowerCase().trim();
    if (q) {
      items = items.filter(g => g.name.toLowerCase().includes(q) || g.alias?.toLowerCase().includes(q));
    }
    if (showUnusedOnly) {
      items = items.filter(g => employees.every(e => e.employee_group_id !== g.employee_group_id));
    }
    return items.map(g => ({
      ...g,
      children: buildTree(g.employee_group_id ?? null),
    }));
  };

  const tree = useMemo(() => buildTree(null), [groups, employees, searchQuery, showUnusedOnly]);

  const toggleNode = (id: string) => setExpandedNodes(p => ({ ...p, [id]: !p[id] }));
  const toggleDetails = (id: number) => setActiveDetails(prev => prev?.type === "group" && prev.id === id ? null : { type: "group", id });

  const renderTree = (nodes: TreeNode[], depth: number = 0): React.ReactNode => {
    return nodes.map(node => {
      const nodeId = `g-${node.employee_group_id}`;
      const isExpanded = !!expandedNodes[nodeId];
      const hasChildren = node.children && node.children.length > 0;
      const isSelected = activeDetails?.type === "group" && activeDetails.id === node.employee_group_id;
      const empCount = employees.filter(e => e.employee_group_id === node.employee_group_id).length;

      return (
        <div key={nodeId}>
          <div
            className={`group flex items-center px-4 py-1.5 border-b border-zinc-50 hover:bg-zinc-50/50 cursor-pointer ${isSelected ? "bg-zinc-100" : ""}`}
            style={{ paddingLeft: `${8 + depth * 16}px` }}
          >
            <span className="text-zinc-400 text-xs mr-1 w-4 text-center" onClick={e => { e.stopPropagation(); if (hasChildren) toggleNode(nodeId); }}>
              {hasChildren ? (isExpanded ? "▼" : "▶") : " "}
            </span>
            <span className="flex-1 text-sm font-medium text-zinc-700" onClick={() => toggleDetails(node.employee_group_id!)}>
              {node.is_predefined ? "◆ " : "◇ "}{node.name}
            </span>
            <span className="text-xs text-zinc-400 mr-1">{empCount > 0 ? `${empCount} emp` : ""}</span>
            <button
              className="text-[10px] text-zinc-400 hover:text-sky-700 opacity-0 group-hover:opacity-100 transition-opacity px-1.5 py-0.5 border border-zinc-200 rounded bg-white"
              onClick={e => { e.stopPropagation(); navigate("/master/alter/employee-group", { state: { groupId: node.employee_group_id } }); }}
            >Edit</button>
          </div>
          {isSelected && (
            <div className="px-6 py-2 bg-zinc-50/30 border-b border-zinc-100 text-xs grid grid-cols-2 gap-x-6 gap-y-1" style={{ paddingLeft: `${40 + depth * 16}px` }}>
              <div><span className="text-zinc-400">Name:</span> <span className="font-medium">{node.name}</span></div>
              <div><span className="text-zinc-400">Alias:</span> <span className="font-medium">{node.alias || "-"}</span></div>
              <div><span className="text-zinc-400">Parent:</span> <span className="font-medium">{groups.find(g => g.employee_group_id === node.parent_group_id)?.name ?? "Primary"}</span></div>
              <div><span className="text-zinc-400">Employees:</span> <span className="font-medium">{empCount}</span></div>
              <div><span className="text-zinc-400">Predefined:</span> <span className="font-medium">{node.is_predefined ? "Yes" : "No"}</span></div>
            </div>
          )}
          {isExpanded && hasChildren && renderTree(node.children!, depth + 1)}
        </div>
      );
    });
  };

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") { e.preventDefault(); navigate("/master/coa"); }
      if (e.ctrlKey && e.key === "h") { e.preventDefault(); setShowChangeView(p => !p); }
      if (e.ctrlKey && e.key === "j") { e.preventDefault(); setShowUnusedOnly(p => !p); }
      if (e.altKey && e.key.toLowerCase() === "c") { e.preventDefault(); navigate("/master/create/employee-group"); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [navigate]);

  const changeViewItems = [
    { label: "Ledgers", path: "/master/coa/ledger" },
    { label: "Groups", path: "/master/coa/group" },
    { label: "Stock Groups & Items", path: "/master/coa/stock-group" },
    { label: "Stock Categories", path: "/master/coa/stock-category" },
    { label: "Godowns", path: "/master/coa/godown" },
    { label: "Units of Measure", path: "/master/coa/unit" },
    { label: "Employees", path: "/master/coa/employee" },
    { label: "Attendance Types", path: "/master/coa/attendance-type" },
    { label: "Pay Heads", path: "/master/coa/pay-head" },
    { label: "Payroll Units", path: "/master/coa/payroll-unit" },
    { label: "Salary Structures", path: "/master/coa/salary-structure" },
  ];

  return (
    <div className="flex-1 flex flex-col h-full bg-white select-none text-zinc-800">
      <div className="px-4 py-2 border-b border-zinc-200 bg-zinc-50 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link to="/master/coa" className="text-xs text-zinc-500 hover:text-zinc-800 font-medium">&larr; Back</Link>
          <span className="text-sm font-semibold text-zinc-700">Employee Groups</span>
          {showUnusedOnly && <span className="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-medium">Unused Only</span>}
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => { const allIds: Record<string, boolean> = {}; tree.forEach(n => { allIds[`g-${n.employee_group_id}`] = true; }); setExpandedNodes(allIds); }} className="text-[10px] text-zinc-500 hover:text-zinc-800 border border-zinc-200 rounded px-2 py-0.5 bg-white">Expand All</button>
          <button onClick={() => setExpandedNodes({})} className="text-[10px] text-zinc-500 hover:text-zinc-800 border border-zinc-200 rounded px-2 py-0.5 bg-white">Collapse All</button>
          <button onClick={() => navigate("/master/create/employee-group")} className="text-[10px] text-zinc-500 hover:text-zinc-800 border border-zinc-200 rounded px-2 py-0.5 bg-white">+ Create</button>
        </div>
      </div>

      {error && (
        <div className="px-3 py-1 border-b border-red-200 bg-red-50 text-red-700 text-xs flex justify-between items-center">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="text-red-500 font-bold">&times;</button>
        </div>
      )}

      <div className="flex-1 flex overflow-hidden min-h-0">
        <div className="flex-1 flex flex-col min-w-0">
          <div className="px-4 py-1.5 border-b border-zinc-100 flex items-center gap-2">
            <span className="text-xs text-zinc-400 font-medium">Search:</span>
            <input className="flex-1 text-xs outline-none bg-transparent" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search by name..." />
            {searchQuery && <button onClick={() => setSearchQuery("")} className="text-[10px] text-zinc-400 hover:text-zinc-600">Clear</button>}
          </div>
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="p-8 text-center text-xs text-zinc-400">Loading groups...</div>
            ) : tree.length === 0 ? (
              <div className="p-8 text-center text-xs text-zinc-400">No matching groups found.</div>
            ) : (
              renderTree(tree)
            )}
          </div>
        </div>

        <div className="w-44 border-l border-zinc-200 flex flex-col bg-zinc-50/30 text-[10px]">
          <button onClick={() => setShowUnusedOnly(p => !p)} className="px-3 py-2 text-left hover:bg-zinc-100 border-b border-zinc-100 font-medium text-zinc-600">Ctrl+J Exception</button>
          <button onClick={() => setShowChangeView(true)} className="px-3 py-2 text-left hover:bg-zinc-100 border-b border-zinc-100 font-medium text-zinc-600">Ctrl+H Change View</button>
          <button onClick={() => navigate("/master/create/employee-group")} className="px-3 py-2 text-left hover:bg-zinc-100 border-b border-zinc-100 font-medium text-zinc-600">Alt+C Create</button>
          <div className="flex-1" />
          <button onClick={() => navigate("/master/coa")} className="px-3 py-2 text-left hover:bg-zinc-100 border-t border-zinc-200 font-medium text-zinc-500">Esc Quit</button>
        </div>
      </div>

      {showChangeView && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-xs" onClick={() => setShowChangeView(false)}>
          <div className="bg-white border border-zinc-200 rounded shadow-xl w-80 max-h-96 overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="px-3 py-2 border-b border-zinc-100 bg-zinc-50 text-xs font-bold text-zinc-500 uppercase">Change View</div>
            {changeViewItems.map(item => (
              <button key={item.path} onClick={() => navigate(item.path)} className="block w-full text-left px-3 py-1.5 text-xs hover:bg-zinc-50 border-b border-zinc-50">{item.label}</button>
            ))}
            <button onClick={() => setShowChangeView(false)} className="block w-full text-center px-3 py-1.5 text-xs text-zinc-400 hover:bg-zinc-50">Close</button>
          </div>
        </div>
      )}

      <div className="border-t border-zinc-200 px-4 py-1.5 flex justify-between items-center bg-zinc-50 text-[10px] text-zinc-400">
        <span>{groups.length} group(s)</span>
        <span>Startup ERP Payroll Engine</span>
      </div>
    </div>
  );
}
