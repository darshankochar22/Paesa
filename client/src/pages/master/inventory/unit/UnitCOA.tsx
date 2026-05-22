import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useCompany } from "@/context/CompanyContext";
import type { UnitType, StockItemType } from "@/types/api";

export default function UnitCOA() {
  const navigate = useNavigate();
  const { selectedCompany } = useCompany();
  const companyId = selectedCompany?.company_id;

  // Data States
  const [units, setUnits] = useState<UnitType[]>([]);
  const [stockItems, setStockItems] = useState<StockItemType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // View States
  const [showUnusedOnly, setShowUnusedOnly] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showChangeViewModal, setShowChangeViewModal] = useState(false);
  const [showExceptionModal, setShowExceptionModal] = useState(false);

  // Expand Drawer Details States
  const [openDrawers, setOpenDrawers] = useState<Record<number, boolean>>({});

  useEffect(() => {
    const fetchData = async () => {
      if (!companyId) return;
      setLoading(true);
      setError(null);
      try {
        const [u, si] = await Promise.all([
          window.api.unit.getAll(companyId),
          window.api.stockItem.getAll(companyId),
        ]);
        if (u.success) setUnits(u.units ?? []);
        if (si.success) setStockItems(si.stockItems ?? []);
      } catch (err) {
        setError("Failed to load units.");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [companyId]);

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        navigate("/master/coa");
      }
      if (e.key === "F5" || e.key === "f5") {
        e.preventDefault();
        navigate("/master/coa/godown");
      }
      if ((e.ctrlKey || e.metaKey) && (e.key === "h" || e.key === "H")) {
        e.preventDefault();
        setShowChangeViewModal((prev) => !prev);
      }
      if ((e.ctrlKey || e.metaKey) && (e.key === "j" || e.key === "J")) {
        e.preventDefault();
        setShowExceptionModal((prev) => !prev);
      }
      if (e.altKey && (e.key === "c" || e.key === "C")) {
        e.preventDefault();
        navigate("/master/create/unit");
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [navigate]);

  const handleExpandAll = () => {
    const all: Record<number, boolean> = {};
    units.forEach((u) => {
      if (u.unit_id) all[u.unit_id] = true;
    });
    setOpenDrawers(all);
  };

  const handleCollapseAll = () => {
    setOpenDrawers({});
  };

  // Group Stock Items by unit_id
  const itemsByUnit = useMemo(() => {
    const map: Record<number, StockItemType[]> = {};
    stockItems.forEach((item) => {
      if (item.unit_id) {
        if (!map[item.unit_id]) map[item.unit_id] = [];
        map[item.unit_id].push(item);
      }
    });
    return map;
  }, [stockItems]);

  // Filtered Units list
  const filteredUnits = useMemo(() => {
    let list = units;

    if (showUnusedOnly) {
      list = list.filter((u) => {
        const associatedItems = itemsByUnit[u.unit_id!] ?? [];
        if (associatedItems.length === 0) return true; // Unassociated unit is unused!
        return associatedItems.every((item) => Number(item.opening_quantity ?? 0) === 0);
      });
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (u) =>
          u.symbol.toLowerCase().includes(q) ||
          (u.formal_name && u.formal_name.toLowerCase().includes(q))
      );
    }

    return [...list].sort((a, b) => a.symbol.localeCompare(b.symbol));
  }, [units, itemsByUnit, searchQuery, showUnusedOnly]);

  const toggleDrawer = (id: number) => {
    setOpenDrawers((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-white select-none text-zinc-800">
      {/* Header */}
      <div className="px-4 py-2 border-b border-zinc-200 bg-zinc-50 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/master/coa")}
            className="text-xs text-zinc-500 hover:text-zinc-800 px-2 py-0.5 border border-zinc-200 rounded bg-white shadow-sm"
          >
            ← Back
          </button>
          <span className="font-bold text-sm text-zinc-800">Units of Measure Chart of Accounts</span>
          {showUnusedOnly && (
            <span className="bg-emerald-50 text-emerald-700 text-[10px] font-semibold px-2 py-0.5 border border-emerald-200 rounded-full shadow-inner animate-pulse">
              Exception: Unused Units
            </span>
          )}
        </div>

        {/* Global Toolbar Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleExpandAll}
            className="text-[11px] font-semibold text-zinc-600 hover:text-black px-2 py-1 border border-zinc-300 rounded bg-white shadow-sm"
          >
            Expand All
          </button>
          <button
            onClick={handleCollapseAll}
            className="text-[11px] font-semibold text-zinc-600 hover:text-black px-2 py-1 border border-zinc-300 rounded bg-white shadow-sm"
          >
            Collapse All
          </button>
          <button
            onClick={() => navigate("/master/create/unit")}
            className="text-[11px] font-semibold text-white bg-black hover:bg-zinc-800 px-3 py-1 rounded shadow-sm font-medium"
          >
            + Create Unit
          </button>
        </div>
      </div>

        <div className="px-4 py-2 border-b border-red-200 bg-red-50 text-red-700 text-xs flex justify-between items-center">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="text-red-500 hover:text-red-700 text-xs font-bold">✕</button>
        </div>

      {/* Main Workspace */}
      <div className="flex-1 flex overflow-hidden min-h-0 bg-white">
        {/* Left Side: Search & Content scrollable container */}
        <div className="flex-1 flex flex-col min-w-0 bg-white h-full">
          {/* Dynamic Filter Search Box */}
          <div className="px-4 py-1.5 border-b border-zinc-200 bg-zinc-50/50 flex items-center gap-2">
            <span className="text-[10px] uppercase tracking-wider font-bold text-zinc-400 select-none">Search:</span>
            <input
              type="text"
              placeholder="Search in units list..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 bg-white border border-zinc-300 rounded px-2.5 py-1 text-xs text-zinc-800 focus:outline-none focus:border-zinc-500 shadow-inner"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="text-xs text-zinc-400 hover:text-black font-bold px-1.5"
              >
                Clear
              </button>
            )}
          </div>

          <div className="flex-1 overflow-y-auto min-h-0 bg-white px-4 py-2">
            {loading ? (
              <div className="flex items-center justify-center h-48 text-xs text-zinc-400">Loading units list...</div>
            ) : (
              <div className="py-2 flex flex-col">
                {filteredUnits.length === 0 ? (
                  <div className="text-xs text-zinc-400 text-center py-8">No matching units found.</div>
                ) : (
                  filteredUnits.map((u) => {
                    const uId = u.unit_id!;
                    const isExpanded = !!openDrawers[uId];

                    return (
                      <div key={uId} className="flex flex-col">
                        {/* Redesigned Premium Tree Row for Units */}
                        <div
                          className={`flex items-center min-h-[30px] hover:bg-zinc-50 border-b border-zinc-100/50 cursor-pointer select-none group px-2 ${
                            isExpanded ? "bg-zinc-50" : ""
                          }`}
                          onClick={() => toggleDrawer(uId)}
                        >
                          <span className="w-5 flex items-center justify-center text-sky-600/70 shrink-0 font-bold select-none text-[11px]">
                            ▫
                          </span>
                          <div className="flex-1 flex items-center justify-between pr-2">
                            <div className="flex items-center gap-3">
                              <span className="font-bold text-zinc-900 text-[13px]">{u.symbol}</span>
                              <span className="text-[10px] text-zinc-400 bg-zinc-100 px-1.5 py-0.5 rounded font-medium">
                                {u.unit_type || "Simple"}
                              </span>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="text-xs text-zinc-500 italic max-w-[120px] truncate">{u.formal_name}</span>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigate(`/master/alter/unit`, { state: { unitId: uId } });
                                }}
                                className="text-[10px] text-zinc-400 hover:text-sky-700 opacity-0 group-hover:opacity-100 transition-opacity px-1.5 py-0.5 border border-zinc-200 rounded bg-white shadow-sm"
                              >
                                Edit
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* Units Details Expand Panel */}
                        {isExpanded && (
                          <div className="bg-zinc-50/70 border-b border-zinc-200 py-3.5 px-6 shadow-inner pl-7">
                            <div className="max-w-xl grid grid-cols-2 gap-x-8 gap-y-2 text-xs text-zinc-600">
                              <div className="flex border-b border-zinc-100 pb-1">
                                <span className="text-zinc-400 w-32 shrink-0 select-none">Formal Name</span>
                                <span className="text-zinc-800 font-semibold">{u.formal_name || "—"}</span>
                              </div>
                              <div className="flex border-b border-zinc-100 pb-1">
                                <span className="text-zinc-400 w-32 shrink-0 select-none">Decimal Places</span>
                                <span className="text-zinc-800 font-medium">{u.decimal_places ?? 0}</span>
                              </div>
                              {u.unit_quantity_code && (
                                <div className="flex border-b border-zinc-100 pb-1 col-span-2">
                                  <span className="text-zinc-400 w-32 shrink-0 select-none">UQC</span>
                                  <span className="text-zinc-800 font-medium">{u.unit_quantity_code}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right-Hand Sidebar - Tally Signature Action Bar */}
        <div className="w-44 border-l border-zinc-200 bg-zinc-100 flex flex-col gap-1 p-2 shrink-0 select-none text-[11px] font-medium text-zinc-700">
          <button
            onClick={() => navigate("/master/coa/godown")}
            className="flex flex-col items-start w-full px-2 py-1.5 border border-zinc-300 rounded bg-white hover:bg-zinc-50 transition-colors text-left shadow-sm hover:border-zinc-400"
          >
            <span className="font-bold text-zinc-900 text-[10px]">F5</span>
            <span>Next Category</span>
          </button>

          <button
            onClick={() => setShowChangeViewModal(true)}
            className="flex flex-col items-start w-full px-2 py-1.5 border border-zinc-300 rounded bg-white hover:bg-zinc-50 transition-colors text-left shadow-sm hover:border-zinc-400"
          >
            <span className="font-bold text-zinc-900 text-[10px]">Ctrl+H</span>
            <span>Change View</span>
          </button>

          <button
            onClick={() => setShowExceptionModal(true)}
            className="flex flex-col items-start w-full px-2 py-1.5 border border-zinc-300 rounded bg-white hover:bg-zinc-50 transition-colors text-left shadow-sm hover:border-zinc-400"
          >
            <span className="font-bold text-zinc-900 text-[10px]">Ctrl+J</span>
            <span>Exception Reports</span>
          </button>

          <button
            onClick={() => navigate("/master/create/unit")}
            className="flex flex-col items-start w-full px-2 py-1.5 border border-zinc-300 rounded bg-white hover:bg-zinc-50 transition-colors text-left shadow-sm hover:border-zinc-400"
          >
            <span className="font-bold text-zinc-900 text-[10px]">Alt+C</span>
            <span>Create Unit</span>
          </button>

          <div className="flex-1"></div>

          <button
            onClick={() => navigate("/master/coa")}
            className="flex flex-col items-start w-full px-2 py-1.5 border border-zinc-300 rounded bg-zinc-200 hover:bg-zinc-300 text-zinc-800 transition-colors text-left shadow-sm font-semibold mt-auto"
          >
            <span className="font-bold text-zinc-900 text-[10px]">Esc</span>
            <span>Quit</span>
          </button>
        </div>
      </div>

      {/* Overlay: Change View Modal */}
      {showChangeViewModal && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-xs flex items-center justify-center z-50 animate-fadeIn">
          <div className="bg-white border border-zinc-300 rounded-lg shadow-xl w-80 overflow-hidden select-none">
            <div className="bg-zinc-100 px-4 py-2 text-xs font-bold text-zinc-750 border-b border-zinc-200 flex justify-between items-center">
              <span>Change View</span>
              <button
                onClick={() => setShowChangeViewModal(false)}
                className="text-zinc-400 hover:text-black font-semibold"
              >
                ✕
              </button>
            </div>
            <div className="p-1 flex flex-col text-xs">
              <button
                onClick={() => {
                  setShowChangeViewModal(false);
                  navigate("/master/coa/stock-group");
                }}
                className="w-full text-left px-3 py-2 rounded hover:bg-black hover:text-white transition-colors"
              >
                Stock Groups & Items Tree
              </button>
              <button
                onClick={() => {
                  setShowChangeViewModal(false);
                  navigate("/master/coa/stock-category");
                }}
                className="w-full text-left px-3 py-2 rounded hover:bg-black hover:text-white transition-colors"
              >
                Stock Categories Tree
              </button>
              <button
                disabled
                className="w-full text-left px-3 py-2 rounded bg-zinc-100 font-bold text-zinc-450 cursor-not-allowed"
              >
                Units of Measure List (Active)
              </button>
              <button
                onClick={() => {
                  setShowChangeViewModal(false);
                  navigate("/master/coa/godown");
                }}
                className="w-full text-left px-3 py-2 rounded hover:bg-black hover:text-white transition-colors"
              >
                Godowns / Locations Tree
              </button>
              <button
                onClick={() => {
                  setShowChangeViewModal(false);
                  navigate("/master/coa/group");
                }}
                className="w-full text-left px-3 py-2 rounded hover:bg-black hover:text-white transition-colors border-t border-zinc-100"
              >
                Groups Chart of Accounts
              </button>
              <button
                onClick={() => {
                  setShowChangeViewModal(false);
                  navigate("/master/coa/ledger");
                }}
                className="w-full text-left px-3 py-2 rounded hover:bg-black hover:text-white transition-colors"
              >
                Ledgers Chart of Accounts
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Overlay: Exception Reports Modal */}
      {showExceptionModal && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-xs flex items-center justify-center z-50 animate-fadeIn">
          <div className="bg-white border border-zinc-300 rounded-lg shadow-xl w-72 overflow-hidden select-none">
            <div className="bg-zinc-100 px-4 py-2 text-xs font-bold text-zinc-750 border-b border-zinc-200 flex justify-between items-center">
              <span>Exception Reports</span>
              <button
                onClick={() => setShowExceptionModal(false)}
                className="text-zinc-400 hover:text-black font-semibold"
              >
                ✕
              </button>
            </div>
            <div className="p-1 flex flex-col text-xs">
              <button
                onClick={() => {
                  setShowExceptionModal(false);
                  setShowUnusedOnly(true);
                }}
                className={`w-full text-left px-3 py-2 rounded transition-colors ${
                  showUnusedOnly ? "bg-zinc-100 text-black font-semibold" : "hover:bg-black hover:text-white"
                }`}
              >
                Show Unused Units Only
              </button>
              <button
                onClick={() => {
                  setShowExceptionModal(false);
                  setShowUnusedOnly(false);
                }}
                className={`w-full text-left px-3 py-2 rounded transition-colors border-t border-zinc-100 ${
                  !showUnusedOnly ? "bg-zinc-100 text-black font-semibold" : "hover:bg-black hover:text-white"
                }`}
              >
                Show All Units
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="border-t border-zinc-200 px-4 py-1.5 flex justify-between items-center bg-zinc-50 text-[10px] text-zinc-400">
        <span>Active Tab: Units of Measure</span>
        <span>Startup ERP Inventory Engine v2.0 (Keyboard Enabled)</span>
      </div>
    </div>
  );
}
