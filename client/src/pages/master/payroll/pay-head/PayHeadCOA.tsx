import { useState, useEffect, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useCompany } from "@/context/CompanyContext";
import type { PayHeadType } from "@/types/entities/Payroll";

export default function PayHeadCOA() {
  const { selectedCompany } = useCompany();
  const navigate = useNavigate();
  const companyId = selectedCompany?.company_id;
  const [payHeads, setPayHeads] = useState<PayHeadType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [openDrawers, setOpenDrawers] = useState<Record<number, boolean>>({});
  const [showChangeView, setShowChangeView] = useState(false);
  const [showUnusedOnly, setShowUnusedOnly] = useState(false);

  useEffect(() => {
    if (!companyId) { setLoading(false); return; }
    let cancelled = false;
    (async () => {
      try {
        setLoading(true); setError(null);
        const res = await window.api.payHead.getAll(companyId);
        if (cancelled) return;
        if (res.success) setPayHeads(res.payHeads ?? []);
        else setError(res.error || "Failed to load.");
      } catch { if (!cancelled) setError("Failed to load."); }
      finally { if (!cancelled) setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [companyId]);

  const filtered = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    let result = payHeads;
    if (q) result = result.filter(p => p.name?.toLowerCase().includes(q) || p.alias?.toLowerCase().includes(q) || p.pay_head_type?.toLowerCase().includes(q) || p.calculation_type?.toLowerCase().includes(q));
    if (showUnusedOnly) result = result.filter(p => !p.is_predefined);
    return result.sort((a, b) => a.name.localeCompare(b.name));
  }, [payHeads, searchQuery, showUnusedOnly]);

  const toggleDrawer = (id: number) => setOpenDrawers(prev => ({ ...prev, [id]: !prev[id] }));

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") { e.preventDefault(); navigate("/master/coa"); }
      if (e.ctrlKey && e.key === "h") { e.preventDefault(); setShowChangeView(p => !p); }
      if (e.ctrlKey && e.key === "j") { e.preventDefault(); setShowUnusedOnly(p => !p); }
      if (e.altKey && e.key.toLowerCase() === "c") { e.preventDefault(); navigate("/master/create/pay-head"); }
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
    { label: "Employees", path: "/master/coa/employee" },
    { label: "Attendance Types", path: "/master/coa/attendance-type" },
    { label: "Payroll Units", path: "/master/coa/payroll-unit" },
    { label: "Salary Structures", path: "/master/coa/salary-structure" },
  ];

  return (
    <div className="flex-1 flex flex-col h-full bg-white select-none text-zinc-800">
      <div className="px-4 py-2 border-b border-zinc-200 bg-zinc-50 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link to="/master/coa" className="text-xs text-zinc-500 hover:text-zinc-800 font-medium">&larr; Back</Link>
          <span className="text-sm font-semibold text-zinc-700">Pay Heads</span>
          {showUnusedOnly && <span className="text-[10px] bg-zinc-100 text-zinc-700 px-1.5 py-0.5 rounded font-medium">Unused Only</span>}
        </div>
        <button onClick={() => navigate("/master/create/pay-head")} className="text-[10px] text-zinc-500 hover:text-zinc-800 border border-zinc-200 rounded px-2 py-0.5 bg-white">+ Create</button>
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
            <input className="flex-1 text-xs outline-none bg-transparent" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search by name, type..." />
            {searchQuery && <button onClick={() => setSearchQuery("")} className="text-[10px] text-zinc-400 hover:text-zinc-600">Clear</button>}
          </div>

          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="p-8 text-center text-xs text-zinc-400">Loading pay heads...</div>
            ) : filtered.length === 0 ? (
              <div className="p-8 text-center text-xs text-zinc-400">No matching pay heads found.</div>
            ) : (
              filtered.map(p => {
                const pId = p.pay_head_id!;
                const isOpen = !!openDrawers[pId];
                const isPredefined = p.is_predefined === 1;
                return (
                  <div key={pId}>
                    <div className="group flex items-center px-4 py-1.5 border-b border-zinc-50 hover:bg-zinc-50/50 cursor-pointer" onClick={() => toggleDrawer(pId)}>
                      <span className="text-zinc-400 text-xs mr-2">{isOpen ? "▼" : "▶"}</span>
                      <span className="flex-1 text-sm font-medium text-zinc-700">{isPredefined ? "◆ " : "◇ "}{p.name}</span>
                      <span className="text-xs text-zinc-400 mr-2">{p.pay_head_type}</span>
                      <button
                        className="text-[10px] text-zinc-400 hover:text-sky-700 opacity-0 group-hover:opacity-100 transition-opacity px-1.5 py-0.5 border border-zinc-200 rounded bg-white"
                        onClick={e => { e.stopPropagation(); navigate("/master/alter/pay-head", { state: { payHeadId: pId } }); }}
                      >Edit</button>
                    </div>
                    {isOpen && (
                      <div className="px-6 py-2 bg-zinc-50/30 border-b border-zinc-100 text-xs grid grid-cols-2 gap-x-6 gap-y-1">
                        <div><span className="text-zinc-400">Name:</span> <span className="font-medium">{p.name}</span></div>
                        <div><span className="text-zinc-400">Alias:</span> <span className="font-medium">{p.alias || "-"}</span></div>
                        <div><span className="text-zinc-400">Pay Head Type:</span> <span className="font-medium">{p.pay_head_type}</span></div>
                        <div><span className="text-zinc-400">Income Type:</span> <span className="font-medium">{p.income_type || "-"}</span></div>
                        <div><span className="text-zinc-400">Under:</span> <span className="font-medium">{p.under_group || "-"}</span></div>
                        <div><span className="text-zinc-400">Calculation:</span> <span className="font-medium">{p.calculation_type}</span></div>
                        <div><span className="text-zinc-400">Affects Net Salary:</span> <span className="font-medium">{p.affects_net_salary ? "Yes" : "No"}</span></div>
                        <div><span className="text-zinc-400">Rounding:</span> <span className="font-medium">{p.rounding_method}</span></div>
                        <div><span className="text-zinc-400">Statutory:</span> <span className="font-medium">{p.statutory_component || "-"}</span></div>
                        <div><span className="text-zinc-400">Predefined:</span> <span className="font-medium">{isPredefined ? "Yes" : "No"}</span></div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div className="w-44 border-l border-zinc-200 flex flex-col bg-zinc-50/30 text-[10px]">
          <button onClick={() => setShowUnusedOnly(p => !p)} className="px-3 py-2 text-left hover:bg-zinc-100 border-b border-zinc-100 font-medium text-zinc-600">Ctrl+J Exception</button>
          <button onClick={() => setShowChangeView(true)} className="px-3 py-2 text-left hover:bg-zinc-100 border-b border-zinc-100 font-medium text-zinc-600">Ctrl+H Change View</button>
          <button onClick={() => navigate("/master/create/pay-head")} className="px-3 py-2 text-left hover:bg-zinc-100 border-b border-zinc-100 font-medium text-zinc-600">Alt+C Create</button>
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
        <span>{filtered.length} pay head(s)</span>
        <span>Startup ERP Payroll Engine</span>
      </div>
    </div>
  );
}
