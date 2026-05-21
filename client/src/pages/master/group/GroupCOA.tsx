import { useState, useEffect, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useCompany } from "@/context/CompanyContext";
import type { GroupType, LedgerType } from "@/types/api";

interface TreeNode extends GroupType {
  children?: TreeNode[];
}

export default function GroupCOA() {
  const { selectedCompany } = useCompany();
  const navigate = useNavigate();
  const [groupTree, setGroupTree] = useState<TreeNode[]>([]);
  const [flatGroups, setFlatGroups] = useState<GroupType[]>([]);
  const [ledgers, setLedgers] = useState<LedgerType[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Tree & View States
  const [isFlatView, setIsFlatView] = useState(false);
  const [showUnusedOnly, setShowUnusedOnly] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Modal Overlay States
  const [showChangeViewModal, setShowChangeViewModal] = useState(false);
  const [showExceptionModal, setShowExceptionModal] = useState(false);

  // Expansion states
  const [expandedNodes, setExpandedNodes] = useState<Record<number, boolean>>({});
  const [expandedDetails, setExpandedDetails] = useState<Record<number, boolean>>({});

  const companyId = selectedCompany?.company_id;

  useEffect(() => {
    if (!companyId) return;
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const [treeRes, allRes, ledgerRes] = await Promise.all([
          window.api.group.getTree(companyId),
          window.api.group.getAll(companyId),
          window.api.ledger.getAll(companyId),
        ]);
        if (cancelled) return;
        if (treeRes.success) {
          setGroupTree(treeRes.tree ?? []);
          // By default expand top level nodes
          const initialExpanded: Record<number, boolean> = {};
          (treeRes.tree ?? []).forEach((g: TreeNode) => {
            if (g.group_id) initialExpanded[g.group_id] = true;
          });
          setExpandedNodes(initialExpanded);
        }
        if (allRes.success) {
          setFlatGroups(allRes.groups ?? []);
        }
        if (ledgerRes.success) {
          setLedgers(ledgerRes.ledgers ?? []);
        }
      } catch (e) {
        if (!cancelled) setError("Failed to load groups.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [companyId]);

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Esc: navigate back to Gateway/coa menu
      if (e.key === "Escape") {
        e.preventDefault();
        navigate("/master/coa");
      }
      // F5: Toggle flat group view
      if (e.key === "F5" || e.key === "f5") {
        e.preventDefault();
        setIsFlatView((prev) => !prev);
      }
      // Ctrl+H: Change View
      if ((e.ctrlKey || e.metaKey) && (e.key === "h" || e.key === "H")) {
        e.preventDefault();
        setShowChangeViewModal((prev) => !prev);
      }
      // Ctrl+J: Exception Reports
      if ((e.ctrlKey || e.metaKey) && (e.key === "j" || e.key === "J")) {
        e.preventDefault();
        setShowExceptionModal((prev) => !prev);
      }
      // Alt+C: Create Group
      if (e.altKey && (e.key === "c" || e.key === "C")) {
        e.preventDefault();
        navigate("/master/create/group");
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [navigate]);

  // Group ledgers by group_id for active usage lookup
  const ledgersByGroup = useMemo(() => {
    const map: Record<number, LedgerType[]> = {};
    ledgers.forEach((l) => {
      if (l.group_id) {
        if (!map[l.group_id]) map[l.group_id] = [];
        map[l.group_id].push(l);
      }
    });
    return map;
  }, [ledgers]);

  // A group is recursively "used" if it or any of its subgroup contains a ledger with non-zero opening balance.
  // In Tally exception reporting, "unused groups" have no active financial values inside their hierarchy.
  const usedGroupIds = useMemo(() => {
    const used = new Set<number>();
    const checkUsed = (nodes: TreeNode[]): boolean => {
      let isAnyChildUsed = false;
      nodes.forEach((node) => {
        const nodeLedgers = ledgersByGroup[node.group_id!] ?? [];
        const hasActiveLedger = nodeLedgers.some((l) => Number(l.opening_balance) !== 0);
        const hasActiveSubGroup = node.children ? checkUsed(node.children) : false;

        if (hasActiveLedger || hasActiveSubGroup) {
          used.add(node.group_id!);
          isAnyChildUsed = true;
        }
      });
      return isAnyChildUsed;
    };
    checkUsed(groupTree);
    return used;
  }, [groupTree, ledgersByGroup]);

  // O(1) group name lookup map
  const groupMap = useMemo(() => {
    const map: Record<number, string> = {};
    flatGroups.forEach((g) => {
      if (g.group_id) map[g.group_id] = g.name;
    });
    return map;
  }, [flatGroups]);

  const parentName = (id?: number | null) =>
    id ? (groupMap[id] || "—") : "—";

  // Filtered Flat Groups List
  const filteredFlatGroups = useMemo(() => {
    let list = flatGroups;

    if (showUnusedOnly) {
      list = list.filter((g) => !usedGroupIds.has(g.group_id!));
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (g) =>
          g.name.toLowerCase().includes(q) ||
          (g.alias && g.alias.toLowerCase().includes(q)) ||
          (g.nature && g.nature.toLowerCase().includes(q)) ||
          parentName(g.parent_group_id).toLowerCase().includes(q)
      );
    }

    return list.sort((a, b) => a.name.localeCompare(b.name));
  }, [flatGroups, showUnusedOnly, usedGroupIds, searchQuery, groupMap]);

  // Filtered Group Tree
  const filteredGroupTree = useMemo(() => {
    if (!showUnusedOnly && !searchQuery.trim()) return groupTree;

    const q = searchQuery.toLowerCase();

    const filterNodes = (nodes: TreeNode[]): TreeNode[] => {
      return nodes
        .map((node) => {
          const children = node.children ? filterNodes(node.children) : [];
          const matchesQuery =
            node.name.toLowerCase().includes(q) ||
            (node.alias && node.alias.toLowerCase().includes(q));

          const matchesUnused = showUnusedOnly ? !usedGroupIds.has(node.group_id!) : true;

          if ((matchesQuery && matchesUnused) || children.length > 0) {
            return {
              ...node,
              children,
            } as TreeNode;
          }
          return null;
        })
        .filter((n): n is TreeNode => n !== null);
    };

    return filterNodes(groupTree);
  }, [groupTree, showUnusedOnly, searchQuery, usedGroupIds]);

  const expandAll = () => {
    const newExpanded: Record<number, boolean> = {};
    const traverse = (nodes: TreeNode[]) => {
      nodes.forEach((n) => {
        if (n.group_id) newExpanded[n.group_id] = true;
        if (n.children) traverse(n.children);
      });
    };
    traverse(groupTree);
    setExpandedNodes(newExpanded);
  };

  const collapseAll = () => {
    setExpandedNodes({});
    setExpandedDetails({});
  };

  const toggleNode = (groupId: number) => {
    setExpandedNodes((prev) => ({
      ...prev,
      [groupId]: !prev[groupId],
    }));
  };

  const toggleDetails = (groupId: number) => {
    setExpandedDetails((prev) => ({
      ...prev,
      [groupId]: !prev[groupId],
    }));
  };

  // Recursive Tree Node Renderer
  const renderTreeNode = (node: TreeNode, depth: number) => {
    const groupId = node.group_id!;
    const isExpanded = !!expandedNodes[groupId];
    const isDetailsExpanded = !!expandedDetails[groupId];
    const hasChildren = node.children && node.children.length > 0;

    return (
      <div key={groupId} className="flex flex-col">
        {/* Group Row */}
        <div
          className={`flex items-center min-h-[28px] hover:bg-zinc-50 border-b border-zinc-100/50 cursor-pointer select-none group ${
            isDetailsExpanded ? "bg-zinc-50/50" : ""
          }`}
          style={{ paddingLeft: depth * 20 + 8 }}
          onClick={() => toggleDetails(groupId)}
        >
          {/* Collapse / Expand Arrow */}
          <span
            className="w-5 flex items-center justify-center text-zinc-400 shrink-0"
            onClick={(e) => {
              e.stopPropagation();
              if (hasChildren) toggleNode(groupId);
            }}
          >
            {hasChildren ? (
              <span className="text-xs transition-transform duration-100 hover:text-black">
                {isExpanded ? "▼" : "▶"}
              </span>
            ) : (
              <span className="text-[10px] opacity-30">•</span>
            )}
          </span>

          {/* Group Content */}
          <div className="flex-1 flex items-center justify-between pr-4">
            <span className="font-semibold text-zinc-800 text-[13px] hover:text-sky-800 transition-colors">
              {node.name}
            </span>
            <div className="flex items-center gap-3">
              {node.nature && (
                <span className="text-[9px] bg-zinc-100 text-zinc-500 font-medium px-1.5 py-0.5 rounded">
                  {node.nature}
                </span>
              )}
              <span className="text-[10px] text-zinc-400">
                {node.is_primary === 1 ? "Primary" : node.is_predefined === 1 ? "Predefined" : "User"}
              </span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  navigate(`/master/alter/group/${groupId}`);
                }}
                className="text-[10px] text-zinc-400 hover:text-sky-700 opacity-0 group-hover:opacity-100 transition-opacity px-1.5 py-0.5 border border-zinc-200 rounded bg-white shadow-sm"
              >
                Edit
              </button>
            </div>
          </div>
        </div>

        {/* Inline Group Details Drawer */}
        {isDetailsExpanded && (
          <div
            className="bg-zinc-50/70 border-b border-zinc-200 py-3.5 px-6 shadow-inner"
            style={{ paddingLeft: (depth + 1) * 20 + 8 }}
          >
            <div className="max-w-2xl grid grid-cols-2 gap-x-8 gap-y-2 text-xs text-zinc-600">
              <div className="flex border-b border-zinc-100 pb-1">
                <span className="text-zinc-400 w-32 shrink-0 select-none">Name</span>
                <span className="text-zinc-800 font-semibold">{node.name}</span>
              </div>
              {node.alias && (
                <div className="flex border-b border-zinc-100 pb-1">
                  <span className="text-zinc-400 w-32 shrink-0 select-none">Alias</span>
                  <span className="text-zinc-800">{node.alias}</span>
                </div>
              )}
              <div className="flex border-b border-zinc-100 pb-1">
                <span className="text-zinc-400 w-32 shrink-0 select-none">Under</span>
                <span className="text-zinc-800 font-medium">{parentName(node.parent_group_id)}</span>
              </div>
              <div className="flex border-b border-zinc-100 pb-1">
                <span className="text-zinc-400 w-32 shrink-0 select-none">Nature</span>
                <span className="text-zinc-800">{node.nature || "—"}</span>
              </div>
              <div className="flex border-b border-zinc-100 pb-1">
                <span className="text-zinc-400 w-32 shrink-0 select-none">Type</span>
                <span className="text-zinc-800">
                  {node.is_primary === 1 ? "Primary" : node.is_predefined === 1 ? "Predefined" : "User"}
                </span>
              </div>
              <div className="flex border-b border-zinc-100 pb-1">
                <span className="text-zinc-400 w-32 shrink-0 select-none">Allocation Method</span>
                <span className="text-zinc-800">{node.allocation_method || "Not Applicable"}</span>
              </div>
              <div className="flex border-b border-zinc-100 pb-1">
                <span className="text-zinc-400 w-32 shrink-0 select-none">Affect Gross Profit</span>
                <span className="text-zinc-800">{node.affect_gross_profit ? "Yes" : "No"}</span>
              </div>
              <div className="flex border-b border-zinc-100 pb-1">
                <span className="text-zinc-400 w-32 shrink-0 select-none">Behaves as Sub-ledger</span>
                <span className="text-zinc-800">{node.behaves_like_subledger ? "Yes" : "No"}</span>
              </div>
              <div className="flex border-b border-zinc-100 pb-1">
                <span className="text-zinc-400 w-32 shrink-0 select-none">Show Net Dr/Cr</span>
                <span className="text-zinc-800">{node.show_net_debit_credit ? "Yes" : "No"}</span>
              </div>
              <div className="flex border-b border-zinc-100 pb-1">
                <span className="text-zinc-400 w-32 shrink-0 select-none">Used for Calculation</span>
                <span className="text-zinc-800">{node.used_for_calculation ? "Yes" : "No"}</span>
              </div>
              {node.gst_rate !== null && Number(node.gst_rate) > 0 && (
                <div className="flex border-b border-zinc-100 pb-1">
                  <span className="text-zinc-400 w-32 shrink-0 select-none">GST Rate</span>
                  <span className="text-zinc-800 font-mono font-medium">{Number(node.gst_rate).toFixed(2)}%</span>
                </div>
              )}
              {node.hsn_sac_code && (
                <div className="flex border-b border-zinc-100 pb-1">
                  <span className="text-zinc-400 w-32 shrink-0 select-none">HSN / SAC Code</span>
                  <span className="text-zinc-800 font-mono">{node.hsn_sac_code}</span>
                </div>
              )}
              {node.statutory_details && (
                <div className="flex col-span-2 border-b border-zinc-100 pb-1">
                  <span className="text-zinc-400 w-32 shrink-0 select-none">Statutory Details</span>
                  <span className="text-zinc-800">{node.statutory_details}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Children Render */}
        {isExpanded && hasChildren && (
          <div className="flex flex-col">
            {node.children!.map((child) => renderTreeNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-white select-none text-zinc-800">
      {/* Header Title Bar */}
      <div className="px-4 py-2 border-b border-zinc-200 bg-zinc-50 flex items-center justify-between select-none">
        <div className="flex items-center gap-3">
          <Link
            to="/master/coa"
            className="text-xs text-zinc-500 hover:text-zinc-800 px-2 py-0.5 border border-zinc-200 rounded bg-white shadow-sm"
          >
            ← Back
          </Link>
          <span className="font-bold text-sm text-zinc-800">Chart of Accounts: Groups</span>
          {showUnusedOnly && (
            <span className="bg-emerald-50 text-emerald-700 text-[10px] font-semibold px-2 py-0.5 border border-emerald-200 rounded-full shadow-inner animate-pulse">
              Exception: Unused Only
            </span>
          )}
        </div>

        {/* Global Toolbar Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={expandAll}
            className="text-[11px] font-semibold text-zinc-600 hover:text-black px-2 py-1 border border-zinc-300 rounded bg-white shadow-sm"
          >
            Expand All
          </button>
          <button
            onClick={collapseAll}
            className="text-[11px] font-semibold text-zinc-600 hover:text-black px-2 py-1 border border-zinc-300 rounded bg-white shadow-sm"
          >
            Collapse All
          </button>
          <Link
            to="/master/create/group"
            className="text-[11px] font-semibold text-white bg-black hover:bg-zinc-800 px-3 py-1 rounded shadow-sm"
          >
            + Create Group
          </Link>
        </div>
      </div>

      {error && (
        <div className="px-4 py-2 border-b border-red-200 bg-red-50 text-red-700 text-xs flex justify-between items-center">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="text-red-500 hover:text-red-700 text-xs font-bold">
            dismiss
          </button>
        </div>
      )}

      {/* Main Workspace (Scroll Area + Right-Hand Button Bar) */}
      <div className="flex-1 flex overflow-hidden min-h-0 bg-white">
        {/* Left Side: Search & Content scrollable container */}
        <div className="flex-1 flex flex-col min-w-0 bg-white h-full">
          {/* Dynamic Filter Search Box */}
          <div className="px-4 py-1.5 border-b border-zinc-200 bg-zinc-50/50 flex items-center gap-2">
            <span className="text-[10px] uppercase tracking-wider font-bold text-zinc-400 select-none">Search:</span>
            <input
              type="text"
              placeholder="Type group name, alias, parent group to filter..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 bg-white border border-zinc-300 rounded px-2.5 py-1 text-xs text-zinc-850 focus:outline-none focus:border-zinc-500 shadow-inner"
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

          <div className="flex-1 overflow-y-auto min-h-0 bg-white">
            {loading ? (
              <div className="flex items-center justify-center h-48 text-xs text-zinc-400">Loading groups...</div>
            ) : isFlatView ? (
              /* Flat Group-wise View */
              filteredFlatGroups.length === 0 ? (
                <div className="flex items-center justify-center h-48 text-xs text-zinc-400">No matching groups found.</div>
              ) : (
                <div className="flex flex-col min-w-full">
                  {/* Table headers */}
                  <div className="flex items-center bg-zinc-50 border-b border-zinc-200 text-[10px] font-bold text-zinc-500 uppercase tracking-wider select-none min-h-[26px]">
                    <span className="flex-1 px-4 py-1">Group Name</span>
                    <span className="w-56 px-4 py-1 border-l border-zinc-200">Under / Parent</span>
                    <span className="w-40 px-4 py-1 border-l border-zinc-200">Nature</span>
                    <span className="w-32 px-4 py-1 border-l border-zinc-200 text-right">Type</span>
                  </div>

                  {/* Table rows */}
                  {filteredFlatGroups.map((group) => {
                    const gId = group.group_id!;
                    const isDetailsExpanded = !!expandedDetails[gId];
                    return (
                      <div key={gId} className="flex flex-col border-b border-zinc-100">
                        <div
                          className={`flex items-center min-h-[30px] hover:bg-zinc-50/70 cursor-pointer select-none group ${
                            isDetailsExpanded ? "bg-zinc-50" : ""
                          }`}
                          onClick={() => toggleDetails(gId)}
                        >
                          <div className="flex-1 px-4 py-1.5 flex items-center min-w-0">
                            <span className="text-zinc-800 font-semibold text-[13px] hover:text-sky-800 transition-colors truncate">
                              {group.name}
                            </span>
                            {group.alias && (
                              <span className="text-[10px] text-zinc-400 font-normal ml-1.5 truncate">
                                ({group.alias})
                              </span>
                            )}
                          </div>
                          <div className="w-56 px-4 py-1.5 text-zinc-600 text-xs truncate border-l border-zinc-100/50">
                            {parentName(group.parent_group_id)}
                          </div>
                          <div className="w-40 px-4 py-1.5 border-l border-zinc-100/50">
                            {group.nature ? (
                              <span className="text-[10px] bg-zinc-100 text-zinc-500 font-semibold px-2 py-0.5 rounded">
                                {group.nature}
                              </span>
                            ) : (
                              <span className="text-zinc-300 text-xs">—</span>
                            )}
                          </div>
                          <div className="w-32 px-4 py-1.5 flex items-center justify-between border-l border-zinc-100/50">
                            <span className="text-xs text-zinc-500 ml-auto">
                              {group.is_primary === 1 ? "Primary" : group.is_predefined === 1 ? "Predefined" : "User"}
                            </span>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/master/alter/group/${gId}`);
                              }}
                              className="text-[9px] text-zinc-400 hover:text-sky-700 opacity-0 group-hover:opacity-100 transition-opacity px-1.5 py-0.5 border border-zinc-200 rounded bg-white shadow-sm ml-2.5 shrink-0"
                            >
                              Edit
                            </button>
                          </div>
                        </div>

                        {/* Inline Details Card */}
                        {isDetailsExpanded && (
                          <div className="bg-zinc-50/80 border-t border-b border-zinc-200 py-3.5 px-8 shadow-inner">
                            <div className="max-w-2xl grid grid-cols-2 gap-x-8 gap-y-2 text-xs text-zinc-600">
                              <div className="flex border-b border-zinc-100 pb-1">
                                <span className="text-zinc-400 w-32 shrink-0 select-none">Name</span>
                                <span className="text-zinc-800 font-semibold">{group.name}</span>
                              </div>
                              {group.alias && (
                                <div className="flex border-b border-zinc-100 pb-1">
                                  <span className="text-zinc-400 w-32 shrink-0 select-none">Alias</span>
                                  <span className="text-zinc-800">{group.alias}</span>
                                </div>
                              )}
                              <div className="flex border-b border-zinc-100 pb-1">
                                <span className="text-zinc-400 w-32 shrink-0 select-none">Under</span>
                                <span className="text-zinc-800 font-medium">{parentName(group.parent_group_id)}</span>
                              </div>
                              <div className="flex border-b border-zinc-100 pb-1">
                                <span className="text-zinc-400 w-32 shrink-0 select-none">Nature</span>
                                <span className="text-zinc-800">{group.nature || "—"}</span>
                              </div>
                              <div className="flex border-b border-zinc-100 pb-1">
                                <span className="text-zinc-400 w-32 shrink-0 select-none">Type</span>
                                <span className="text-zinc-800">
                                  {group.is_primary === 1 ? "Primary" : group.is_predefined === 1 ? "Predefined" : "User"}
                                </span>
                              </div>
                              <div className="flex border-b border-zinc-100 pb-1">
                                <span className="text-zinc-400 w-32 shrink-0 select-none">Allocation Method</span>
                                <span className="text-zinc-800">{group.allocation_method || "Not Applicable"}</span>
                              </div>
                              <div className="flex border-b border-zinc-100 pb-1">
                                <span className="text-zinc-400 w-32 shrink-0 select-none">Affect Gross Profit</span>
                                <span className="text-zinc-800">{group.affect_gross_profit ? "Yes" : "No"}</span>
                              </div>
                              <div className="flex border-b border-zinc-100 pb-1">
                                <span className="text-zinc-400 w-32 shrink-0 select-none">Behaves as Sub-ledger</span>
                                <span className="text-zinc-800">{group.behaves_like_subledger ? "Yes" : "No"}</span>
                              </div>
                              <div className="flex border-b border-zinc-100 pb-1">
                                <span className="text-zinc-400 w-32 shrink-0 select-none">Show Net Dr/Cr</span>
                                <span className="text-zinc-800">{group.show_net_debit_credit ? "Yes" : "No"}</span>
                              </div>
                              <div className="flex border-b border-zinc-100 pb-1">
                                <span className="text-zinc-400 w-32 shrink-0 select-none">Used for Calculation</span>
                                <span className="text-zinc-800">{group.used_for_calculation ? "Yes" : "No"}</span>
                              </div>
                              {group.gst_rate !== null && Number(group.gst_rate) > 0 && (
                                <div className="flex border-b border-zinc-100 pb-1">
                                  <span className="text-zinc-400 w-32 shrink-0 select-none">GST Rate</span>
                                  <span className="text-zinc-800 font-mono font-medium">{Number(group.gst_rate).toFixed(2)}%</span>
                                </div>
                              )}
                              {group.hsn_sac_code && (
                                <div className="flex border-b border-zinc-100 pb-1">
                                  <span className="text-zinc-400 w-32 shrink-0 select-none">HSN / SAC Code</span>
                                  <span className="text-zinc-800 font-mono">{group.hsn_sac_code}</span>
                                </div>
                              )}
                              {group.statutory_details && (
                                <div className="flex col-span-2 border-b border-zinc-100 pb-1">
                                  <span className="text-zinc-400 w-32 shrink-0 select-none">Statutory Details</span>
                                  <span className="text-zinc-800">{group.statutory_details}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )
            ) : (
              /* Group-wise Hierarchical Tree View */
              filteredGroupTree.length === 0 ? (
                <div className="flex items-center justify-center h-48 text-xs text-zinc-400">No matching groups found.</div>
              ) : (
                <div className="py-2">{filteredGroupTree.map((node) => renderTreeNode(node, 0))}</div>
              )
            )}
          </div>
        </div>

        {/* Right-Hand Sidebar - Tally Signature Action Bar */}
        <div className="w-44 border-l border-zinc-200 bg-zinc-100 flex flex-col gap-1 p-2 shrink-0 select-none text-[11px] font-medium font-mono text-zinc-700">
          <button
            onClick={() => setIsFlatView((prev) => !prev)}
            className="flex flex-col items-start w-full px-2 py-1.5 border border-zinc-300 rounded bg-white hover:bg-zinc-50 transition-colors text-left shadow-sm hover:border-zinc-400"
          >
            <span className="font-bold text-zinc-900 text-[10px]">F5</span>
            <span>{isFlatView ? "Group-wise Tree" : "Alphabetical Flat"}</span>
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
            className="flex flex-col items-start w-full px-2 py-1.5 border border-zinc-300 rounded bg-white hover:bg-zinc-50 transition-colors text-left shadow-sm hover:border-zinc-400 animate-pulse"
          >
            <span className="font-bold text-zinc-900 text-[10px]">Ctrl+J</span>
            <span>Exception Reports</span>
          </button>

          <button
            onClick={() => alert("Multi-Masters option selected. (Emulated Mode)")}
            className="flex flex-col items-start w-full px-2 py-1.5 border border-zinc-300 rounded bg-white hover:bg-zinc-50 transition-colors text-left shadow-sm hover:border-zinc-400"
          >
            <span className="font-bold text-zinc-900 text-[10px]">Alt+H</span>
            <span>Multi-Masters</span>
          </button>

          <button
            onClick={() => navigate("/master/create/group")}
            className="flex flex-col items-start w-full px-2 py-1.5 border border-zinc-300 rounded bg-white hover:bg-zinc-50 transition-colors text-left shadow-sm hover:border-zinc-400"
          >
            <span className="font-bold text-zinc-900 text-[10px]">Alt+C</span>
            <span>Create Master</span>
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
        <div className="fixed inset-0 bg-black/30 backdrop-blur-xs flex items-center justify-center z-50">
          <div className="bg-white border border-zinc-300 rounded-lg shadow-xl w-80 overflow-hidden select-none animate-fadeIn">
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
                  setIsFlatView(false);
                }}
                className="w-full text-left px-3 py-2 rounded hover:bg-black hover:text-white transition-colors"
              >
                Groups (Group-wise Tree)
              </button>
              <button
                onClick={() => {
                  setShowChangeViewModal(false);
                  setIsFlatView(true);
                }}
                className="w-full text-left px-3 py-2 rounded hover:bg-black hover:text-white transition-colors"
              >
                Groups (Alphabetical Flat)
              </button>
              <button
                onClick={() => {
                  setShowChangeViewModal(false);
                  navigate("/master/coa/ledger");
                }}
                className="w-full text-left px-3 py-2 rounded hover:bg-black hover:text-white transition-colors border-t border-zinc-100"
              >
                Ledgers
              </button>
              <button
                onClick={() => {
                  setShowChangeViewModal(false);
                  navigate("/master/coa/inventory?section=stock-group");
                }}
                className="w-full text-left px-3 py-2 rounded hover:bg-black hover:text-white transition-colors"
              >
                Stock Groups & Items
              </button>
              <button
                onClick={() => {
                  setShowChangeViewModal(false);
                  navigate("/master/coa/inventory?section=stock-category");
                }}
                className="w-full text-left px-3 py-2 rounded hover:bg-black hover:text-white transition-colors"
              >
                Stock Categories
              </button>
              <button
                onClick={() => {
                  setShowChangeViewModal(false);
                  navigate("/master/coa/inventory?section=unit");
                }}
                className="w-full text-left px-3 py-2 rounded hover:bg-black hover:text-white transition-colors"
              >
                Units of Measure
              </button>
              <button
                onClick={() => {
                  setShowChangeViewModal(false);
                  navigate("/master/coa/inventory?section=godown");
                }}
                className="w-full text-left px-3 py-2 rounded hover:bg-black hover:text-white transition-colors"
              >
                Godowns
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Overlay: Exception Reports Modal */}
      {showExceptionModal && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-xs flex items-center justify-center z-50">
          <div className="bg-white border border-zinc-300 rounded-lg shadow-xl w-72 overflow-hidden select-none animate-fadeIn">
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
                Show Unused Groups Only
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
                Show All Groups
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer Status Bar */}
      <div className="border-t border-zinc-200 px-4 py-1.5 flex justify-between items-center bg-zinc-50 text-[10px] text-zinc-400 font-mono select-none">
        <span>Total Groups Displayed: {isFlatView ? filteredFlatGroups.length : flatGroups.length}</span>
        <span>TallyPrime COA Engine v2.0 (Keyboard Enabled)</span>
      </div>
    </div>
  );
}
