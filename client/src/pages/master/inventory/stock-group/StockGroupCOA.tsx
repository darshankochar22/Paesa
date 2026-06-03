import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useCompany } from "@/context/CompanyContext";
import type { StockGroupType, StockItemType } from "@/types/api";

interface TreeItem {
  id: number;
  name: string;
  parentId?: number | null;
  children?: TreeItem[];
  rawData: any;
}

function buildTree(items: any[], idKey: string, parentKey: string): TreeItem[] {
  const map: Record<number, TreeItem> = {};
  const roots: TreeItem[] = [];

  items.forEach((item) => {
    const id = item[idKey];
    if (id) {
      map[id] = { id, name: item.name, parentId: item[parentKey], children: [], rawData: item };
    }
  });

  items.forEach((item) => {
    const id = item[idKey];
    const parentId = item[parentKey];
    if (id && parentId && map[parentId]) map[parentId].children!.push(map[id]);
    else if (id) roots.push(map[id]);
  });

  return roots;
}

export default function StockGroupCOA() {
  const navigate = useNavigate();
  const { selectedCompany } = useCompany();
  const companyId = selectedCompany?.company_id;

  const [stockGroups, setStockGroups]   = useState<StockGroupType[]>([]);
  const [stockItems, setStockItems]     = useState<StockItemType[]>([]);
  const [units, setUnits]               = useState<{ unit_id?: number; symbol: string }[]>([]);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState<string | null>(null);

  const [showUnusedOnly, setShowUnusedOnly]           = useState(false);
  const [searchQuery, setSearchQuery]                 = useState("");
  const [showChangeViewModal, setShowChangeViewModal] = useState(false);
  const [showExceptionModal, setShowExceptionModal]   = useState(false);
  const [expandedGroups, setExpandedGroups]           = useState<Record<number, boolean>>({});
  const [activeDetailsId, setActiveDetailsId]         = useState<{ type: string; id: number } | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!companyId) return;
      setLoading(true); setError(null);
      try {
        const [sg, si, u] = await Promise.all([
          window.api.stockGroup.getAll(companyId),
          window.api.stockItem.getAll(companyId),
          window.api.unit.getAll(companyId),
        ]);
        if (sg.success) setStockGroups(sg.stockGroups ?? []);
        if (si.success) setStockItems(si.stockItems ?? []);
        if (u.success)  setUnits(u.units ?? []);
      } catch {
        setError("Failed to load inventory masters.");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [companyId]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") { e.preventDefault(); navigate("/master/coa"); }
      if (e.key === "F5")     { e.preventDefault(); navigate("/master/coa/stock-category"); }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "h") { e.preventDefault(); setShowChangeViewModal(p => !p); }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "j") { e.preventDefault(); setShowExceptionModal(p => !p); }
      if (e.altKey && e.key.toLowerCase() === "c") { e.preventDefault(); navigate("/master/create/stock-group"); }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [navigate]);

  const handleExpandAll = () => {
    const all: Record<number, boolean> = {};
    stockGroups.forEach(g => { if (g.sg_id) all[g.sg_id] = true; });
    setExpandedGroups(all);
  };
  const handleCollapseAll = () => { setExpandedGroups({}); setActiveDetailsId(null); };

  const itemsByGroup = useMemo(() => {
    const map: Record<number, StockItemType[]> = {};
    stockItems.forEach(item => {
      if (item.group_id) {
        if (!map[item.group_id]) map[item.group_id] = [];
        map[item.group_id].push(item);
      }
    });
    return map;
  }, [stockItems]);

  const groupTree     = useMemo(() => buildTree(stockGroups, "sg_id", "parent_group_id"), [stockGroups]);

  const filteredGroupTree = useMemo(() => {
    const filterTree = (nodes: TreeItem[]): (TreeItem & { filteredItems: StockItemType[] })[] => {
      return nodes.map(node => {
        const children   = node.children ? filterTree(node.children) : [];
        const nodeItems  = itemsByGroup[node.id] ?? [];
        let matchedItems = showUnusedOnly
          ? nodeItems.filter(i => Number(i.opening_quantity ?? 0) === 0)
          : nodeItems;

        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          matchedItems = matchedItems.filter(i =>
            i.name.toLowerCase().includes(q) || (i.alias && i.alias.toLowerCase().includes(q))
          );
        }

        const q            = searchQuery.toLowerCase();
        const groupMatches = searchQuery.trim()
          ? node.name.toLowerCase().includes(q) || (node.rawData.alias && node.rawData.alias.toLowerCase().includes(q))
          : true;

        const containsUsedItems = (n: TreeItem): boolean => {
          const items = itemsByGroup[n.id] ?? [];
          if (items.some(i => Number(i.opening_quantity ?? 0) > 0)) return true;
          return (n.children ?? []).some(containsUsedItems);
        };

        const shouldInclude = searchQuery.trim()
          ? (groupMatches || children.length > 0 || matchedItems.length > 0)
          : showUnusedOnly
            ? (children.length > 0 || matchedItems.length > 0 || !containsUsedItems(node))
            : true;

        if (shouldInclude) return { ...node, children, filteredItems: matchedItems } as TreeItem & { filteredItems: StockItemType[] };
        return null;
      }).filter((n): n is TreeItem & { filteredItems: StockItemType[] } => n !== null);
    };
    return filterTree(groupTree);
  }, [groupTree, itemsByGroup, searchQuery, showUnusedOnly]);

  const parentGroupName = (id?: number) => stockGroups.find(g => g.sg_id === id)?.name ?? "Primary";
  const unitName        = (id?: number) => units.find(u => u.unit_id === id)?.symbol ?? "Not Applicable";

  const toggleGroup   = (id: number) => setExpandedGroups(prev => ({ ...prev, [id]: !prev[id] }));
  const toggleDetails = (type: string, id: number) => {
    setActiveDetailsId(prev => (prev?.type === type && prev.id === id) ? null : { type, id });
  };

  // ── Detail row helper ──────────────────────────────────────────────────────
  function DetailRow({ label, value, span }: { label: string; value: React.ReactNode; span?: boolean }) {
    return (
      <div className={`flex border-b border-zinc-100 pb-1 ${span ? "col-span-2" : ""}`}>
        <span className="text-zinc-400 w-48 shrink-0 select-none">{label}</span>
        <span className="text-zinc-800 font-medium">{value}</span>
      </div>
    );
  }

  const renderStockTree = (nodes: (TreeItem & { filteredItems: StockItemType[] })[], depth: number): React.ReactNode => {
    return nodes.map(node => {
      const gId            = node.id;
      const isExpanded     = !!expandedGroups[gId];
      const items          = node.filteredItems ?? [];
      const subGroups      = (node.children ?? []) as (TreeItem & { filteredItems: StockItemType[] })[];
      const hasSubItems    = subGroups.length > 0 || items.length > 0;
      const raw            = node.rawData as StockGroupType;
      const isDetailsOpen  = activeDetailsId?.type === "group" && activeDetailsId.id === gId;

      // Derived statutory display values
      const hasHsn         = !!(raw.hsn_sac_code || raw.hsn_sac_description);
      const hasGst         = !!(raw.gst_rate && Number(raw.gst_rate) > 0);
      const taxability     = raw.taxability_type && raw.taxability_type !== "as_per_company"
                               ? raw.taxability_type
                               : "As per Company/Stock Group";

      return (
        <div key={gId} className="flex flex-col">
          {/* Group row */}
          <div
            className={`flex items-center min-h-[30px] hover:bg-zinc-50 border-b border-zinc-100/50 cursor-pointer select-none group ${isDetailsOpen ? "bg-zinc-50" : ""}`}
            style={{ paddingLeft: depth * 20 + 8 }}
            onClick={() => toggleDetails("group", gId)}
          >
            <span
              className="w-5 flex items-center justify-center text-zinc-400 shrink-0"
              onClick={e => { e.stopPropagation(); if (hasSubItems) toggleGroup(gId); }}
            >
              {hasSubItems
                ? <span className="text-xs transition-transform duration-100 hover:text-black">{isExpanded ? "▼" : "▶"}</span>
                : <span className="text-[10px] opacity-30">•</span>}
            </span>
            <div className="flex-1 flex items-center justify-between pr-4">
              <span className="font-semibold text-zinc-800 text-[13px]">{node.name}</span>
              <div className="flex items-center gap-3">
                <span className="text-[9px] bg-zinc-100 text-zinc-500 font-medium px-1.5 py-0.5 rounded">Stock Group</span>
                <button
                  onClick={e => { e.stopPropagation(); navigate(`/master/alter/stock-group`, { state: { groupId: gId } }); }}
                  className="text-[10px] text-zinc-400 hover:text-sky-700 opacity-0 group-hover:opacity-100 transition-opacity px-1.5 py-0.5 border border-zinc-200 rounded bg-white shadow-sm"
                >
                  Edit
                </button>
              </div>
            </div>
          </div>

          {/* ── Group details panel ── */}
          {isDetailsOpen && (
            <div className="bg-zinc-50/70 border-b border-zinc-200 py-3.5 shadow-inner" style={{ paddingLeft: (depth + 1) * 20 + 8, paddingRight: 24 }}>
              <div className="max-w-2xl grid grid-cols-2 gap-x-8 gap-y-2 text-xs text-zinc-600">

                {/* General */}
                <DetailRow label="Alias"  value={raw.alias || "—"} />
                <DetailRow label="Under"  value={parentGroupName(raw.parent_group_id)} />
                <DetailRow label="Should quantities of items be added" value={raw.should_quantities_be_added ? "Yes" : "No"} span />

                {/* Statutory — HSN/SAC */}
                <div className="col-span-2 mt-1 mb-0.5 text-[10px] font-semibold uppercase tracking-wider text-zinc-400 select-none border-b border-zinc-200 pb-0.5">
                  Statutory Details
                </div>

                <div className="col-span-2 text-[10px] italic text-zinc-400 select-none mb-0.5">HSN/SAC &amp; Related Details</div>

                <DetailRow label="HSN/SAC Details"   value={hasHsn ? "Specified Here" : "As per Company/Stock Group"} />
                <DetailRow label="Source of details" value={hasHsn ? "Specified Here" : "Not Available"} />
                {hasHsn && (
                  <>
                    <DetailRow label="HSN/SAC"    value={raw.hsn_sac_code || "—"} />
                    <DetailRow label="Description" value={raw.hsn_sac_description || "—"} />
                  </>
                )}

                {/* GST */}
                <div className="col-span-2 text-[10px] italic text-zinc-400 select-none mt-1 mb-0.5">GST Rate &amp; Related Details</div>

                <DetailRow label="GST Rate Details"  value={hasGst ? "Specified Here" : "As per Company/Stock Group"} />
                <DetailRow label="Source of details" value={hasGst ? "Specified Here" : "Not Available"} />
                <DetailRow label="Taxability Type"   value={taxability} />
                {hasGst && (
                  <>
                    <DetailRow label="GST Rate"  value={`${Number(raw.gst_rate).toFixed(2)} %`} />
                    <DetailRow label="CGST Rate" value={`${Number(raw.cgst_rate ?? 0).toFixed(2)} %`} />
                    <DetailRow label="SGST Rate" value={`${Number(raw.sgst_rate ?? 0).toFixed(2)} %`} />
                  </>
                )}
              </div>
            </div>
          )}

          {/* Children */}
          {isExpanded && hasSubItems && (
            <div className="flex flex-col">
              {renderStockTree(subGroups, depth + 1)}

              {items.map(item => {
                const iId              = item.item_id!;
                const isItemDetailsOpen = activeDetailsId?.type === "item" && activeDetailsId.id === iId;

                return (
                  <div key={iId} className="flex flex-col">
                    <div
                      className={`flex items-center min-h-[28px] hover:bg-zinc-100/70 border-b border-zinc-100/30 cursor-pointer select-none group ${isItemDetailsOpen ? "bg-zinc-50/50" : ""}`}
                      style={{ paddingLeft: (depth + 1) * 20 + 8 }}
                      onClick={() => toggleDetails("item", iId)}
                    >
                      <span className="w-5 flex items-center justify-center text-sky-600/70 shrink-0 font-bold select-none text-[11px]">▫</span>
                      <div className="flex-1 flex items-center justify-between pr-4">
                        <span className="text-zinc-700 font-medium text-[13px] hover:text-sky-800 transition-colors">{item.name}</span>
                        <div className="flex items-center gap-3">
                          <span className="text-[12px] tabular-nums text-zinc-500 mr-2">
                            {Number(item.opening_quantity) === 0 ? "—" : Number(item.opening_quantity).toFixed(2)}
                          </span>
                          <span className="text-[10px] text-zinc-400 w-16 truncate">{unitName(item.unit_id)}</span>
                          <button
                            onClick={e => { e.stopPropagation(); navigate(`/master/alter/stock-item`, { state: { itemId: iId } }); }}
                            className="text-[10px] text-zinc-400 hover:text-sky-700 opacity-0 group-hover:opacity-100 transition-opacity px-1.5 py-0.5 border border-zinc-200 rounded bg-white shadow-sm"
                          >
                            Edit
                          </button>
                        </div>
                      </div>
                    </div>

                    {isItemDetailsOpen && (
                      <div className="bg-zinc-50/80 border-b border-zinc-200 py-3.5 shadow-inner" style={{ paddingLeft: (depth + 2) * 20 + 8, paddingRight: 24 }}>
                        <div className="max-w-2xl grid grid-cols-2 gap-x-8 gap-y-2 text-xs text-zinc-600">
                          {item.alias && <DetailRow label="Alias"       value={item.alias} />}
                          <DetailRow label="Under Group" value={parentGroupName(item.group_id)} />
                          <DetailRow label="Units"       value={unitName(item.unit_id)} />

                          <div className="col-span-2 mt-1 mb-0.5 text-[10px] font-semibold uppercase tracking-wider text-zinc-400 select-none border-b border-zinc-200 pb-0.5">
                            Statutory Details
                          </div>
                          <DetailRow label="GST Applicable" value={item.gst_applicable || "Not Applicable"} />
                          {item.gst_rate !== null && Number(item.gst_rate) > 0 && (
                            <DetailRow label="GST Rate" value={`${Number(item.gst_rate).toFixed(2)} %`} />
                          )}
                          {(item.hsn_code || item.sac_code) && (
                            <DetailRow label="HSN/SAC Code" value={item.hsn_code || item.sac_code} span />
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      );
    });
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-white select-none text-zinc-800">
      {/* Header */}
      <div className="px-4 py-2 border-b border-zinc-200 bg-zinc-50 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate("/master/coa")} className="text-xs text-zinc-500 hover:text-zinc-800 px-2 py-0.5 border border-zinc-200 rounded bg-white shadow-sm">
            ← Back
          </button>
          <span className="font-bold text-sm text-zinc-800">Stock Groups &amp; Items Chart of Accounts</span>
          {showUnusedOnly && (
            <span className="bg-emerald-50 text-emerald-700 text-[10px] font-semibold px-2 py-0.5 border border-emerald-200 rounded-full shadow-inner animate-pulse">
              Exception: Unused Only
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleExpandAll}  className="text-[11px] font-semibold text-zinc-600 hover:text-black px-2 py-1 border border-zinc-300 rounded bg-white shadow-sm">Expand All</button>
          <button onClick={handleCollapseAll} className="text-[11px] font-semibold text-zinc-600 hover:text-black px-2 py-1 border border-zinc-300 rounded bg-white shadow-sm">Collapse All</button>
          <button onClick={() => navigate("/master/create/stock-group")} className="text-[11px] font-semibold text-white bg-black hover:bg-zinc-800 px-3 py-1 rounded shadow-sm">+ Create Group</button>
        </div>
      </div>

      {error && (
        <div className="px-4 py-2 border-b border-red-200 bg-red-50 text-red-700 text-xs flex justify-between items-center">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="font-bold">✕</button>
        </div>
      )}

      <div className="flex-1 flex overflow-hidden min-h-0 bg-white">
        <div className="flex-1 flex flex-col min-w-0 bg-white h-full">
          {/* Search */}
          <div className="px-4 py-1.5 border-b border-zinc-200 bg-zinc-50/50 flex items-center gap-2">
            <span className="text-[10px] uppercase tracking-wider font-bold text-zinc-400 select-none">Search:</span>
            <input
              type="text"
              placeholder="Search in stock groups & items tree..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="flex-1 bg-white border border-zinc-300 rounded px-2.5 py-1 text-xs text-zinc-800 focus:outline-none focus:border-zinc-500 shadow-inner"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery("")} className="text-xs text-zinc-400 hover:text-black font-bold px-1.5">Clear</button>
            )}
          </div>

          <div className="flex-1 overflow-y-auto min-h-0 bg-white px-4 py-2">
            {loading ? (
              <div className="flex items-center justify-center h-48 text-xs text-zinc-400">Loading stock groups tree...</div>
            ) : filteredGroupTree.length === 0 ? (
              <div className="text-xs text-zinc-400 text-center py-8">No matching stock groups or items found.</div>
            ) : (
              <div className="py-2">{renderStockTree(filteredGroupTree, 0)}</div>
            )}
          </div>
        </div>

        {/* Right sidebar */}
        <div className="w-44 border-l border-zinc-200 bg-zinc-100 flex flex-col gap-1 p-2 shrink-0 select-none text-[11px] font-medium text-zinc-700">
          <button onClick={() => navigate("/master/coa/stock-category")} className="flex flex-col items-start w-full px-2 py-1.5 border border-zinc-300 rounded bg-white hover:bg-zinc-50 transition-colors text-left shadow-sm hover:border-zinc-400">
            <span className="font-bold text-zinc-900 text-[10px]">F5</span>
            <span>Next Category</span>
          </button>
          <button onClick={() => setShowChangeViewModal(true)} className="flex flex-col items-start w-full px-2 py-1.5 border border-zinc-300 rounded bg-white hover:bg-zinc-50 transition-colors text-left shadow-sm hover:border-zinc-400">
            <span className="font-bold text-zinc-900 text-[10px]">Ctrl+H</span>
            <span>Change View</span>
          </button>
          <button onClick={() => setShowExceptionModal(true)} className="flex flex-col items-start w-full px-2 py-1.5 border border-zinc-300 rounded bg-white hover:bg-zinc-50 transition-colors text-left shadow-sm hover:border-zinc-400">
            <span className="font-bold text-zinc-900 text-[10px]">Ctrl+J</span>
            <span>Exception Reports</span>
          </button>
          <button onClick={() => navigate("/master/create/stock-group")} className="flex flex-col items-start w-full px-2 py-1.5 border border-zinc-300 rounded bg-white hover:bg-zinc-50 transition-colors text-left shadow-sm hover:border-zinc-400">
            <span className="font-bold text-zinc-900 text-[10px]">Alt+C</span>
            <span>Create Group</span>
          </button>
          <div className="flex-1" />
          <button onClick={() => navigate("/master/coa")} className="flex flex-col items-start w-full px-2 py-1.5 border border-zinc-300 rounded bg-zinc-200 hover:bg-zinc-300 text-zinc-800 transition-colors text-left shadow-sm font-semibold mt-auto">
            <span className="font-bold text-zinc-900 text-[10px]">Esc</span>
            <span>Quit</span>
          </button>
        </div>
      </div>

      {/* Change View Modal */}
      {showChangeViewModal && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-xs flex items-center justify-center z-50">
          <div className="bg-white border border-zinc-300 rounded-lg shadow-xl w-80 overflow-hidden select-none">
            <div className="bg-zinc-100 px-4 py-2 text-xs font-bold text-zinc-700 border-b border-zinc-200 flex justify-between items-center">
              <span>Change View</span>
              <button onClick={() => setShowChangeViewModal(false)} className="text-zinc-400 hover:text-black font-semibold">✕</button>
            </div>
            <div className="p-1 flex flex-col text-xs">
              <button disabled className="w-full text-left px-3 py-2 rounded bg-zinc-100 font-bold text-zinc-400 cursor-not-allowed">Stock Groups &amp; Items Tree (Active)</button>
              {[
                { label: "Stock Categories Tree",        path: "/master/coa/stock-category" },
                { label: "Units of Measure List",        path: "/master/coa/unit" },
                { label: "Godowns / Locations Tree",     path: "/master/coa/godown" },
                { label: "Groups Chart of Accounts",     path: "/master/coa/group" },
                { label: "Ledgers Chart of Accounts",    path: "/master/coa/ledger" },
              ].map(item => (
                <button key={item.path} onClick={() => { setShowChangeViewModal(false); navigate(item.path); }} className="w-full text-left px-3 py-2 rounded hover:bg-black hover:text-white transition-colors">
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Exception Modal */}
      {showExceptionModal && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-xs flex items-center justify-center z-50">
          <div className="bg-white border border-zinc-300 rounded-lg shadow-xl w-72 overflow-hidden select-none">
            <div className="bg-zinc-100 px-4 py-2 text-xs font-bold text-zinc-700 border-b border-zinc-200 flex justify-between items-center">
              <span>Exception Reports</span>
              <button onClick={() => setShowExceptionModal(false)} className="text-zinc-400 hover:text-black font-semibold">✕</button>
            </div>
            <div className="p-1 flex flex-col text-xs">
              <button onClick={() => { setShowExceptionModal(false); setShowUnusedOnly(true); }} className={`w-full text-left px-3 py-2 rounded transition-colors ${showUnusedOnly ? "bg-zinc-100 text-black font-semibold" : "hover:bg-black hover:text-white"}`}>
                Show Unused Masters Only
              </button>
              <button onClick={() => { setShowExceptionModal(false); setShowUnusedOnly(false); }} className={`w-full text-left px-3 py-2 rounded transition-colors border-t border-zinc-100 ${!showUnusedOnly ? "bg-zinc-100 text-black font-semibold" : "hover:bg-black hover:text-white"}`}>
                Show All Masters
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="border-t border-zinc-200 px-4 py-1.5 flex justify-between items-center bg-zinc-50 text-[10px] text-zinc-400">
        <span>Active Tab: Stock Groups &amp; Items</span>
        <span>Startup ERP Inventory Engine v2.0 (Keyboard Enabled)</span>
      </div>
    </div>
  );
}

