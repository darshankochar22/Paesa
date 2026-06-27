import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useCompany } from "@/context/CompanyContext";
import type { CostCategoryType } from "@/types/api";

export default function CostCategoryCOA() {
  const { selectedCompany } = useCompany();
  const navigate = useNavigate();
  const [categories, setCategories] = useState<CostCategoryType[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const companyId = selectedCompany?.company_id;

  const loadData = useCallback(async () => {
    if (!companyId) return;
    setLoading(true);
    const r = await window.api.costCategory.getAll(companyId);
    if (r.success) setCategories(r.costCategories ?? []);
    setLoading(false);
  }, [companyId]);

  useEffect(() => { loadData(); }, [loadData]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") { e.preventDefault(); navigate("/master/coa"); }
      if (e.altKey && e.key.toLowerCase() === "c") { e.preventDefault(); navigate("/master/create/cost-category"); }
      if (e.altKey && e.key.toLowerCase() === "a" && selectedId) {
        e.preventDefault();
        navigate("/master/alter/cost-category");
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [navigate, selectedId]);

  const filtered = categories.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    (c.alias && c.alias.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="flex-1 flex flex-col h-full bg-white select-none text-zinc-800 font-mono text-[12px]">
      <div className="px-4 py-2 border-b border-zinc-200 bg-zinc-50 flex items-center justify-between select-none font-sans shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/master/coa")}
            className="text-xs text-zinc-500 hover:text-zinc-800 px-2 py-0.5 border border-zinc-200 rounded bg-white shadow-sm"
          >
            &larr; Back
          </button>
          <span className="font-bold text-sm text-zinc-800">List of Cost Categories</span>
        </div>
        <button
          onClick={() => navigate("/master/create/cost-category")}
          className="text-[11px] font-semibold text-white bg-black hover:bg-zinc-800 px-3 py-1 rounded shadow-sm"
        >
          + Create Cost Category
        </button>
      </div>

      <div className="flex-1 flex overflow-hidden min-h-0 bg-white">
        <div className="flex-1 flex flex-col min-w-0 bg-white h-full border-r border-zinc-100">
          <div className="px-4 py-1.5 border-b border-zinc-200 bg-zinc-50/50 flex items-center gap-2 font-sans shrink-0">
            <span className="text-[10px] font-bold text-zinc-400 select-none">Search:</span>
            <input
              type="text"
              placeholder="Type category name to filter..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="flex-1 bg-white border border-zinc-300 rounded px-2.5 py-1 text-xs text-zinc-850 focus:outline-none focus:border-zinc-500 shadow-inner font-sans"
            />
            {search && (
              <button onClick={() => setSearch("")} className="text-xs text-zinc-400 hover:text-black font-bold px-1.5">Clear</button>
            )}
          </div>

          <div className="flex-1 overflow-y-auto min-h-0 bg-white">
            {loading ? (
              <div className="flex items-center justify-center h-48 text-xs text-zinc-400 font-sans italic">Loading cost categories...</div>
            ) : filtered.length === 0 ? (
              <div className="flex items-center justify-center h-48 text-xs text-zinc-400 font-sans italic">No cost categories found.</div>
            ) : (
              <>
                <div className="grid grid-cols-12 px-3 py-1 border-b border-zinc-200 bg-zinc-100 text-[10px] font-bold uppercase tracking-wider text-zinc-500 font-sans">
                  <span className="col-span-4">Name</span>
                  <span className="col-span-3">Alias</span>
                  <span className="col-span-2 text-center">Revenue</span>
                  <span className="col-span-3 text-center">Non-Revenue</span>
                </div>
                {filtered.map(c => (
                  <div
                    key={c.cc_cat_id}
                    onClick={() => setSelectedId(c.cc_cat_id ?? null)}
                    className={`grid grid-cols-12 px-3 py-1.5 border-b border-zinc-100 cursor-pointer text-[12px] select-none ${
                      selectedId === c.cc_cat_id ? "bg-zinc-100 font-bold text-black" : "text-zinc-800 hover:bg-zinc-50"
                    }`}
                  >
                    <span className="col-span-4 font-semibold truncate">{c.name}</span>
                    <span className="col-span-3 text-zinc-500 truncate">{c.alias || "—"}</span>
                    <span className="col-span-2 text-center text-zinc-500">{c.allocate_revenue_items ? "Yes" : "No"}</span>
                    <span className="col-span-3 text-center text-zinc-500">{c.allocate_non_revenue_items ? "Yes" : "No"}</span>
                  </div>
                ))}
              </>
            )}
          </div>
        </div>

        <div className="w-44 border-l border-zinc-200 bg-zinc-100 flex flex-col gap-1 p-2 shrink-0 select-none text-[11px] font-medium text-zinc-700 font-sans">
          <button
            onClick={() => navigate("/master/create/cost-category")}
            className="flex flex-col items-start w-full px-2 py-1.5 border border-zinc-300 rounded bg-white hover:bg-zinc-50 transition-colors text-left shadow-sm hover:border-zinc-400"
          >
            <span className="font-bold text-zinc-900 text-[10px]">Alt+C</span>
            <span>Create Master</span>
          </button>
          {selectedId && (
            <button
              onClick={() => navigate("/master/alter/cost-category")}
              className="flex flex-col items-start w-full px-2 py-1.5 border border-zinc-300 rounded bg-white hover:bg-zinc-50 transition-colors text-left shadow-sm hover:border-zinc-400"
            >
              <span className="font-bold text-zinc-900 text-[10px]">Alt+A</span>
              <span>Alter Master</span>
            </button>
          )}
          <div className="flex-1" />
          <button
            onClick={() => navigate("/master/coa")}
            className="flex flex-col items-start w-full px-2 py-1.5 border border-zinc-300 rounded bg-zinc-200 hover:bg-zinc-300 text-zinc-800 transition-colors text-left shadow-sm font-semibold mt-auto"
          >
            <span className="font-bold text-zinc-900 text-[10px]">Esc</span>
            <span>Quit</span>
          </button>
        </div>
      </div>

      <div className="border-t border-zinc-200 px-4 py-1.5 flex justify-between items-center bg-zinc-50 text-[10px] text-zinc-400 select-none font-sans shrink-0">
        <span>Total Cost Categories: {categories.length}</span>
        <span>Startup ERP</span>
      </div>
    </div>
  );
}
