import { useState, useEffect, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useCompany } from "@/context/CompanyContext";
import type { EmployeeType, EmployeeGroupType } from "@/types/entities/Employee";

export default function EmployeeCOA() {
  const { selectedCompany } = useCompany();
  const navigate = useNavigate();
  const companyId = selectedCompany?.company_id;
  const [employees, setEmployees] = useState<EmployeeType[]>([]);
  const [groups, setGroups] = useState<EmployeeGroupType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showChangeView, setShowChangeView] = useState(false);
  const [showUnusedOnly, setShowUnusedOnly] = useState(false);
  const [expandedNodes, setExpandedNodes] = useState<Record<string, boolean>>({});
  const [activeDetails, setActiveDetails] = useState<{ type: "emp"; id: number } | null>(null);
  const [viewMode, setViewMode] = useState<"tree" | "flat">("tree");

  useEffect(() => {
    if (!companyId) { setLoading(false); return; }
    let cancelled = false;
    (async () => {
      try {
        setLoading(true); setError(null);
        const [eRes, gRes] = await Promise.all([
          window.api.employee.getAll(companyId),
          window.api.employeeGroup.getAll(companyId),
        ]);
        if (cancelled) return;
        if (eRes.success) setEmployees(eRes.employees ?? []);
        else setError(eRes.error || "Failed to load.");
        if (gRes.success) setGroups(gRes.employeeGroups ?? []);
      } catch { if (!cancelled) setError("Failed to load."); }
      finally { if (!cancelled) setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [companyId]);

  const groupName = (id?: number) => groups.find(g => g.employee_group_id === id)?.name ?? "-";

  const filteredEmployees = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    let result = employees;
    if (q) result = result.filter(e => e.name.toLowerCase().includes(q) || e.employee_code?.toLowerCase().includes(q) || e.alias?.toLowerCase().includes(q) || groupName(e.employee_group_id).toLowerCase().includes(q));
    if (showUnusedOnly) result = result.filter(e => !e.employee_code);
    return result;
  }, [employees, searchQuery, showUnusedOnly, groups]);

  const groupedByGroup = useMemo(() => {
    const map: Record<number, EmployeeType[]> = {};
    for (const e of filteredEmployees) {
      const gId = e.employee_group_id || 0;
      if (!map[gId]) map[gId] = [];
      map[gId].push(e);
    }
    return map;
  }, [filteredEmployees]);

  const buildTree = (parentId: number | null): EmployeeGroupType[] => {
    return groups
      .filter(g => (g.parent_group_id ?? null) === parentId)
      .sort((a, b) => a.name.localeCompare(b.name));
  };

  const toggleNode = (id: string) => setExpandedNodes(p => ({ ...p, [id]: !p[id] }));
  const toggleDetails = (id: number) => setActiveDetails(prev => prev?.type === "emp" && prev.id === id ? null : { type: "emp", id });

  const renderGroupTree = (nodes: EmployeeGroupType[], depth: number = 0): React.ReactNode => {
    return nodes.map(group => {
      const nodeId = `g-${group.employee_group_id}`;
      const isExpanded = !!expandedNodes[nodeId];
      const empList = groupedByGroup[group.employee_group_id!] ?? [];
      const children = buildTree(group.employee_group_id ?? null);
      const hasChildren = children.length > 0 || empList.length > 0;

      return (
        <div key={nodeId}>
          <div
            className="group flex items-center px-4 py-1.5 border-b border-zinc-50 hover:bg-zinc-50/50 cursor-pointer"
            style={{ paddingLeft: `${8 + depth * 16}px` }}
          >
            <span className="text-zinc-400 text-xs mr-1 w-4 text-center" onClick={e => { e.stopPropagation(); if (hasChildren) toggleNode(nodeId); }}>
              {hasChildren ? (isExpanded ? "▼" : "▶") : " "}
            </span>
            <span className="text-sm font-semibold text-zinc-600">{group.name}</span>
            <span className="text-xs text-zinc-400 ml-2">{empList.length} employee(s)</span>
          </div>
          {isExpanded && (
            <>
              {empList.map(emp => {
                const eId = emp.employee_id!;
                const isSelected = activeDetails?.type === "emp" && activeDetails.id === eId;
                return (
                  <div key={`e-${eId}`}>
                    <div
                      className={`group flex items-center px-4 py-1 border-b border-zinc-50/50 hover:bg-zinc-50/50 cursor-pointer ${isSelected ? "bg-zinc-100" : ""}`}
                      style={{ paddingLeft: `${32 + depth * 16}px` }}
                      onClick={() => toggleDetails(eId)}
                    >
                      <span className="text-zinc-300 text-xs mr-2">▫</span>
                      <span className="flex-1 text-sm text-zinc-700">{emp.name}</span>
                      <span className="text-xs text-zinc-400 mr-2">{emp.employee_code}</span>
                      <button
                        className="text-[10px] text-zinc-400 hover:text-sky-700 opacity-0 group-hover:opacity-100 transition-opacity px-1.5 py-0.5 border border-zinc-200 rounded bg-white"
                        onClick={e => { e.stopPropagation(); navigate("/master/alter/employee", { state: { employeeId: eId } }); }}
                      >Edit</button>
                    </div>
                    {isSelected && (
                      <div className="px-6 py-2 bg-zinc-50/30 border-b border-zinc-100 text-xs grid grid-cols-3 gap-x-6 gap-y-1" style={{ paddingLeft: `${64 + depth * 16}px` }}>
                        <div><span className="text-zinc-400">Name:</span> <span className="font-medium">{emp.name}</span></div>
                        <div><span className="text-zinc-400">Code:</span> <span className="font-medium">{emp.employee_code || "-"}</span></div>
                        <div><span className="text-zinc-400">Designation:</span> <span className="font-medium">{emp.designation || "-"}</span></div>
                        <div><span className="text-zinc-400">Department:</span> <span className="font-medium">{emp.department || "-"}</span></div>
                        <div><span className="text-zinc-400">DOJ:</span> <span className="font-medium">{emp.date_of_joining || "-"}</span></div>
                        <div><span className="text-zinc-400">Mobile:</span> <span className="font-medium">{emp.mobile || "-"}</span></div>
                        <div><span className="text-zinc-400">E-Mail:</span> <span className="font-medium">{emp.email || "-"}</span></div>
                        <div><span className="text-zinc-400">PAN:</span> <span className="font-medium">{emp.pan || "-"}</span></div>
                        <div><span className="text-zinc-400">Aadhaar:</span> <span className="font-medium">{emp.aadhaar || "-"}</span></div>
                      </div>
                    )}
                  </div>
                );
              })}
              {renderGroupTree(children, depth + 1)}
            </>
          )}
        </div>
      );
    });
  };

  const flatList = useMemo(() => {
    return [...filteredEmployees].sort((a, b) => a.name.localeCompare(b.name));
  }, [filteredEmployees]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") { e.preventDefault(); navigate("/master/coa"); }
      if (e.key === "F5") { e.preventDefault(); setViewMode(v => v === "tree" ? "flat" : "tree"); }
      if (e.ctrlKey && e.key === "h") { e.preventDefault(); setShowChangeView(p => !p); }
      if (e.ctrlKey && e.key === "j") { e.preventDefault(); setShowUnusedOnly(p => !p); }
      if (e.altKey && e.key.toLowerCase() === "c") { e.preventDefault(); navigate("/master/create/employee"); }
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
    { label: "Employee Groups", path: "/master/coa/employee-group" },
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
          <span className="text-sm font-semibold text-zinc-700">Employees</span>
          {showUnusedOnly && <span className="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-medium">Unused Only</span>}
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => { const ids: Record<string, boolean> = {}; groups.forEach(g => { ids[`g-${g.employee_group_id}`] = true; }); setExpandedNodes(ids); }} className="text-[10px] text-zinc-500 hover:text-zinc-800 border border-zinc-200 rounded px-2 py-0.5 bg-white">Expand All</button>
          <button onClick={() => setExpandedNodes({})} className="text-[10px] text-zinc-500 hover:text-zinc-800 border border-zinc-200 rounded px-2 py-0.5 bg-white">Collapse</button>
          <button onClick={() => navigate("/master/create/employee")} className="text-[10px] text-zinc-500 hover:text-zinc-800 border border-zinc-200 rounded px-2 py-0.5 bg-white">+ Create</button>
        </div>
      </div>

      {error && (
        <div className="px-3 py-1 border-b border-red-200 bg-red-50 text-red-700 text-xs flex justify-between items-center">
          <span>{error}</span><button onClick={() => setError(null)} className="text-red-500 font-bold">&times;</button>
        </div>
      )}

      <div className="flex-1 flex overflow-hidden min-h-0">
        <div className="flex-1 flex flex-col min-w-0">
          <div className="px-4 py-1.5 border-b border-zinc-100 flex items-center gap-2">
            <span className="text-xs text-zinc-400 font-medium">Search:</span>
            <input className="flex-1 text-xs outline-none bg-transparent" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search by name, code..." />
            {searchQuery && <button onClick={() => setSearchQuery("")} className="text-[10px] text-zinc-400 hover:text-zinc-600">Clear</button>}
            <span className="text-[10px] text-zinc-300 ml-2">| F5: {viewMode === "tree" ? "Flat" : "Tree"} View</span>
          </div>
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="p-8 text-center text-xs text-zinc-400">Loading employees...</div>
            ) : viewMode === "tree" ? (
              buildTree(null).length === 0 ? <div className="p-8 text-center text-xs text-zinc-400">No employees found.</div> : renderGroupTree(buildTree(null))
            ) : flatList.length === 0 ? (
              <div className="p-8 text-center text-xs text-zinc-400">No employees found.</div>
            ) : (
              <>
                <div className="px-4 py-1.5 border-b border-zinc-100 bg-zinc-50/50 text-[10px] font-bold text-zinc-400 uppercase grid grid-cols-12 gap-1">
                  <span className="col-span-3">Name</span>
                  <span className="col-span-2">Code</span>
                  <span className="col-span-3">Group</span>
                  <span className="col-span-2">Designation</span>
                  <span className="col-span-2">Mobile</span>
                </div>
                {flatList.map(emp => {
                  const eId = emp.employee_id!;
                  const isSelected = activeDetails?.type === "emp" && activeDetails.id === eId;
                  return (
                    <div key={eId}>
                      <div className={`group grid grid-cols-12 gap-1 px-4 py-1 border-b border-zinc-50 hover:bg-zinc-50/50 cursor-pointer text-xs ${isSelected ? "bg-zinc-100" : ""}`} onClick={() => toggleDetails(eId)}>
                        <span className="col-span-3 font-medium text-zinc-700 truncate">{emp.name}</span>
                        <span className="col-span-2 text-zinc-500">{emp.employee_code || "-"}</span>
                        <span className="col-span-3 text-zinc-500">{groupName(emp.employee_group_id)}</span>
                        <span className="col-span-2 text-zinc-500 truncate">{emp.designation || "-"}</span>
                        <span className="col-span-1 text-zinc-500 truncate">{emp.mobile || "-"}</span>
                        <span className="col-span-1 text-right">
                          <button
                            className="text-[10px] text-zinc-400 hover:text-sky-700 opacity-0 group-hover:opacity-100 transition-opacity px-1 py-0 border border-zinc-200 rounded bg-white"
                            onClick={e => { e.stopPropagation(); navigate("/master/alter/employee", { state: { employeeId: eId } }); }}
                          >Edit</button>
                        </span>
                      </div>
                      {isSelected && (
                        <div className="px-6 py-2 bg-zinc-50/30 border-b border-zinc-100 text-xs grid grid-cols-3 gap-x-6 gap-y-1">
                          <div><span className="text-zinc-400">Name:</span> <span className="font-medium">{emp.name}</span></div>
                          <div><span className="text-zinc-400">Code:</span> <span className="font-medium">{emp.employee_code || "-"}</span></div>
                          <div><span className="text-zinc-400">Designation:</span> <span className="font-medium">{emp.designation || "-"}</span></div>
                          <div><span className="text-zinc-400">Department:</span> <span className="font-medium">{emp.department || "-"}</span></div>
                          <div><span className="text-zinc-400">DOJ:</span> <span className="font-medium">{emp.date_of_joining || "-"}</span></div>
                          <div><span className="text-zinc-400">Mobile:</span> <span className="font-medium">{emp.mobile || "-"}</span></div>
                          <div><span className="text-zinc-400">E-Mail:</span> <span className="font-medium">{emp.email || "-"}</span></div>
                          <div><span className="text-zinc-400">PAN:</span> <span className="font-medium">{emp.pan || "-"}</span></div>
                          <div><span className="text-zinc-400">Gender:</span> <span className="font-medium">{emp.gender || "-"}</span></div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </>
            )}
          </div>
        </div>

        <div className="w-44 border-l border-zinc-200 flex flex-col bg-zinc-50/30 text-[10px]">
          <button onClick={() => setViewMode(v => v === "tree" ? "flat" : "tree")} className="px-3 py-2 text-left hover:bg-zinc-100 border-b border-zinc-100 font-medium text-zinc-600">F5 Toggle View</button>
          <button onClick={() => setShowUnusedOnly(p => !p)} className="px-3 py-2 text-left hover:bg-zinc-100 border-b border-zinc-100 font-medium text-zinc-600">Ctrl+J Exception</button>
          <button onClick={() => setShowChangeView(true)} className="px-3 py-2 text-left hover:bg-zinc-100 border-b border-zinc-100 font-medium text-zinc-600">Ctrl+H Change View</button>
          <button onClick={() => navigate("/master/create/employee")} className="px-3 py-2 text-left hover:bg-zinc-100 border-b border-zinc-100 font-medium text-zinc-600">Alt+C Create</button>
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
        <span>{filteredEmployees.length} employee(s) | {viewMode === "tree" ? "Tree View" : "Flat View"}</span>
        <span>Startup ERP Payroll Engine</span>
      </div>
    </div>
  );
}
