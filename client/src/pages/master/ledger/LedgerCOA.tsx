import { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCompany } from '@/context/CompanyContext';
import { NotificationBanner } from '@/components/ui';
import type { LedgerType, GroupType } from '@/types/api';

interface TreeNode extends GroupType {
  children?: TreeNode[];
}

export default function LedgerCOA() {
  const { selectedCompany } = useCompany();
  const navigate = useNavigate();
  const [ledgers, setLedgers] = useState<LedgerType[]>([]);
  const [groupTree, setGroupTree] = useState<TreeNode[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [isLedgerView, setIsLedgerView] = useState(false);
  const [showUnusedOnly, setShowUnusedOnly] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const [showChangeViewModal, setShowChangeViewModal] = useState(false);
  const [showExceptionModal, setShowExceptionModal] = useState(false);

  const [expandedGroups, setExpandedGroups] = useState<Record<number, boolean>>({});

  const companyId = selectedCompany?.company_id;

  useEffect(() => {
    if (!companyId) return;
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const [lRes, treeRes] = await Promise.all([
          window.api.ledger.getAll(companyId),
          window.api.group.getTree(companyId),
        ]);
        if (cancelled) return;
        if (lRes.success) setLedgers(lRes.ledgers ?? []);
        if (treeRes.success) {
          setGroupTree(treeRes.tree ?? []);
          const initialExpanded: Record<number, boolean> = {};
          (treeRes.tree ?? []).forEach((g: TreeNode) => {
            if (g.group_id) initialExpanded[g.group_id] = true;
          });
          setExpandedGroups(initialExpanded);
        }
      } catch (e) {
        if (!cancelled) setError('Failed to load data.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [companyId]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        navigate('/master/coa');
      }
      if (e.key === 'F5' || e.key === 'f5') {
        e.preventDefault();
        setIsLedgerView((prev) => !prev);
      }
      if ((e.ctrlKey || e.metaKey) && (e.key === 'h' || e.key === 'H')) {
        e.preventDefault();
        setShowChangeViewModal((prev) => !prev);
      }
      if ((e.ctrlKey || e.metaKey) && (e.key === 'j' || e.key === 'J')) {
        e.preventDefault();
        setShowExceptionModal((prev) => !prev);
      }
      if (e.altKey && (e.key === 'c' || e.key === 'C')) {
        e.preventDefault();
        navigate('/master/create/ledger');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navigate]);

  const groupMap = useMemo(() => {
    const map: Record<number, string> = {};
    const traverse = (nodes: TreeNode[]) => {
      nodes.forEach((n) => {
        if (n.group_id) map[n.group_id] = n.name;
        if (n.children) traverse(n.children);
      });
    };
    traverse(groupTree);
    return map;
  }, [groupTree]);

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

  const flatLedgerList = useMemo(() => {
    let list = ledgers.map((l) => ({
      ...l,
      parentGroupName: l.group_id ? groupMap[l.group_id] || 'Primary' : 'Primary',
    }));
    if (showUnusedOnly) list = list.filter((l) => Number(l.opening_balance) === 0);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (l) =>
          l.name.toLowerCase().includes(q) ||
          (l.alias && l.alias.toLowerCase().includes(q)) ||
          l.parentGroupName.toLowerCase().includes(q),
      );
    }
    return list.sort((a, b) => a.name.localeCompare(b.name));
  }, [ledgers, showUnusedOnly, groupMap, searchQuery]);

  const filteredGroupTree = useMemo(() => {
    if (!showUnusedOnly && !searchQuery.trim()) return groupTree;
    const q = searchQuery.toLowerCase();
    const filterNodes = (nodes: TreeNode[]): TreeNode[] => {
      return nodes
        .map((node) => {
          const children = node.children ? filterNodes(node.children) : [];
          const nodeLedgers = ledgersByGroup[node.group_id!] ?? [];
          let matchedLedgers = nodeLedgers;
          if (showUnusedOnly)
            matchedLedgers = matchedLedgers.filter((l) => Number(l.opening_balance) === 0);
          if (q)
            matchedLedgers = matchedLedgers.filter(
              (l) =>
                l.name.toLowerCase().includes(q) || (l.alias && l.alias.toLowerCase().includes(q)),
            );
          const groupNameMatches = node.name.toLowerCase().includes(q);
          if (groupNameMatches || children.length > 0 || matchedLedgers.length > 0) {
            return { ...node, children } as TreeNode;
          }
          return null;
        })
        .filter((n): n is TreeNode => n !== null);
    };
    return filterNodes(groupTree);
  }, [groupTree, showUnusedOnly, searchQuery, ledgersByGroup]);

  const expandAll = () => {
    const newExpanded: Record<number, boolean> = {};
    const traverse = (nodes: TreeNode[]) => {
      nodes.forEach((n) => {
        if (n.group_id) newExpanded[n.group_id] = true;
        if (n.children) traverse(n.children);
      });
    };
    traverse(groupTree);
    setExpandedGroups(newExpanded);
  };

  const collapseAll = () => {
    setExpandedGroups({});
  };

  const toggleGroup = (groupId: number) => {
    setExpandedGroups((prev) => ({ ...prev, [groupId]: !prev[groupId] }));
  };

  const renderTreeNode = (node: TreeNode, depth: number) => {
    const groupId = node.group_id!;
    const isExpanded = !!expandedGroups[groupId];
    const childGroups = node.children ?? [];
    const childLedgers = ledgersByGroup[groupId] ?? [];
    const activeLedgers = showUnusedOnly
      ? childLedgers.filter((l) => Number(l.opening_balance) === 0)
      : childLedgers;
    const hasItems = childGroups.length > 0 || activeLedgers.length > 0;

    return (
      <div key={groupId} className="flex flex-col">
        <div
          className="flex items-center min-h-[28px] hover:bg-zinc-50 border-b border-zinc-100/50 cursor-pointer select-none group"
          style={{ paddingLeft: depth * 20 + 8 }}
          onClick={() => hasItems && toggleGroup(groupId)}
        >
          <span className="w-5 flex items-center justify-center text-zinc-400 shrink-0">
            {hasItems ? (
              <span className="text-xs transition-transform duration-100 select-none">
                {isExpanded ? '▼' : '▶'}
              </span>
            ) : (
              <span className="text-[10px] opacity-30 select-none">•</span>
            )}
          </span>
          <div className="flex-1 flex items-center justify-between pr-4">
            <span className="font-semibold text-zinc-800 text-[13px]">{node.name}</span>
            <div className="flex items-center gap-2 text-[10px] text-zinc-400 opacity-0 group-hover:opacity-100 transition-opacity">
              <span>Group</span>
              {node.nature && (
                <span className="bg-zinc-100 px-1 py-0.5 rounded">{node.nature}</span>
              )}
            </div>
          </div>
        </div>

        {isExpanded && hasItems && (
          <div className="flex flex-col">
            {childGroups.map((child) => renderTreeNode(child, depth + 1))}
            {activeLedgers.map((ledger) => {
              const ledgerId = ledger.ledger_id!;
              return (
                <div
                  key={ledgerId}
                  className="flex items-center min-h-[26px] hover:bg-zinc-100/70 border-b border-zinc-100/30 cursor-pointer select-none group"
                  style={{ paddingLeft: (depth + 1) * 20 + 8 }}
                  onClick={() => navigate(`/master/alter/ledger`, { state: { ledgerId } })}
                >
                  <span className="w-5 flex items-center justify-center text-sky-600/70 shrink-0 font-bold select-none text-[11px]">
                    ▫
                  </span>
                  <div className="flex-1 flex items-center justify-between pr-4">
                    <span className="text-zinc-700 font-medium text-[13px] group-hover:text-sky-800 transition-colors">
                      {ledger.name}
                    </span>
                    <span className="text-[12px] tabular-nums text-zinc-500">
                      {Number(ledger.opening_balance) === 0
                        ? '—'
                        : `${Number(ledger.opening_balance).toFixed(2)} ${(ledger as any).opening_balance_type || 'Dr'}`}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-white select-none text-zinc-800">
      {/* Top Header Bar */}
      <div className="px-4 py-2 border-b border-zinc-200 bg-zinc-50 flex items-center justify-between select-none">
        <div className="flex items-center gap-3">
          <Link
            to="/master/coa"
            className="text-xs text-zinc-500 hover:text-zinc-800 px-2 py-0.5 border border-zinc-200 rounded bg-white shadow-sm"
          >
            ← Back
          </Link>
          <span className="font-bold text-sm text-zinc-800">Chart of Accounts: Ledgers</span>
          {showUnusedOnly && (
            <span className="bg-emerald-50 text-emerald-700 text-[10px] font-semibold px-2 py-0.5 border border-emerald-200 rounded-full shadow-inner animate-pulse">
              Exception: Unused Only
            </span>
          )}
        </div>
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
            to="/master/create/ledger"
            className="text-[11px] font-semibold text-white bg-black hover:bg-zinc-800 px-3 py-1 rounded shadow-sm"
          >
            + Create Ledger
          </Link>
        </div>
      </div>

      {error && (
        <NotificationBanner type="error" message={error} onDismiss={() => setError(null)} />
      )}

      <div className="flex-1 flex overflow-hidden min-h-0 bg-white">
        <div className="flex-1 flex flex-col min-w-0 bg-white h-full">
          <div className="px-4 py-1.5 border-b border-zinc-200 bg-zinc-50/50 flex items-center gap-2">
            <span className="text-[10px] uppercase tracking-wider font-bold text-zinc-400 select-none">
              Search:
            </span>
            <input
              type="text"
              placeholder="Type name, alias, parent group to filter..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 bg-white border border-zinc-300 rounded px-2.5 py-1 text-xs text-zinc-850 focus:outline-none focus:border-zinc-500 shadow-inner"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="text-xs text-zinc-400 hover:text-black font-bold px-1.5"
              >
                Clear
              </button>
            )}
          </div>

          <div className="flex-1 overflow-y-auto min-h-0 bg-white">
            {loading ? (
              <div className="flex items-center justify-center h-48 text-xs text-zinc-400">
                Loading ledger hierarchy...
              </div>
            ) : isLedgerView ? (
              flatLedgerList.length === 0 ? (
                <div className="flex items-center justify-center h-48 text-xs text-zinc-400">
                  No matching ledgers found.
                </div>
              ) : (
                <div className="flex flex-col min-w-full">
                  {/* Table headers */}
                  <div className="flex items-center bg-zinc-50 border-b border-zinc-200 text-[10px] font-bold text-zinc-500 uppercase tracking-wider select-none min-h-[26px]">
                    <span className="flex-1 px-4 py-1">Ledger Name</span>
                    <span className="w-56 px-4 py-1 border-l border-zinc-200">Parent Group</span>
                    <span className="w-36 px-4 py-1 text-right border-l border-zinc-200">
                      Opening Balance
                    </span>
                  </div>
                  {flatLedgerList.map((ledger) => {
                    const ledgerId = ledger.ledger_id!;
                    return (
                      <div
                        key={ledgerId}
                        className="flex items-center min-h-[30px] hover:bg-zinc-50/70 border-b border-zinc-100 cursor-pointer select-none group"
                        onClick={() => navigate(`/master/alter/ledger`, { state: { ledgerId } })}
                      >
                        <div className="flex-1 px-4 py-1.5 flex items-center min-w-0">
                          <span className="text-zinc-800 font-semibold text-[13px] group-hover:text-sky-800 transition-colors truncate">
                            {ledger.name}
                          </span>
                          {ledger.alias && (
                            <span className="text-[10px] text-zinc-400 font-normal ml-1.5 truncate">
                              ({ledger.alias})
                            </span>
                          )}
                        </div>
                        <div className="w-56 px-4 py-1.5 text-zinc-600 text-xs truncate border-l border-zinc-100/50">
                          {(ledger as any).parentGroupName}
                        </div>
                        <div className="w-36 px-4 py-1.5 flex items-center border-l border-zinc-100/50">
                          <span className="text-xs font-medium tabular-nums text-zinc-700 ml-auto">
                            {Number(ledger.opening_balance) === 0
                              ? '—'
                              : `${Number(ledger.opening_balance).toFixed(2)} ${(ledger as any).opening_balance_type || 'Dr'}`}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )
            ) : filteredGroupTree.length === 0 ? (
              <div className="flex items-center justify-center h-48 text-xs text-zinc-400">
                No matching items found.
              </div>
            ) : (
              <div className="py-2">{filteredGroupTree.map((node) => renderTreeNode(node, 0))}</div>
            )}
          </div>
        </div>

        <div className="w-44 border-l border-zinc-200 bg-zinc-100 flex flex-col gap-1 p-2 shrink-0 select-none text-[11px] font-medium text-zinc-700">
          <button
            onClick={() => setIsLedgerView((prev) => !prev)}
            className="flex flex-col items-start w-full px-2 py-1.5 border border-zinc-300 rounded bg-white hover:bg-zinc-50 transition-colors text-left shadow-sm hover:border-zinc-400"
          >
            <span className="font-bold text-zinc-900 text-[10px]">F5</span>
            <span>{isLedgerView ? 'Group-wise' : 'Ledger-wise'}</span>
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
            onClick={() => alert('Multi-Masters option selected. (Emulated Mode)')}
            className="flex flex-col items-start w-full px-2 py-1.5 border border-zinc-300 rounded bg-white hover:bg-zinc-50 transition-colors text-left shadow-sm hover:border-zinc-400"
          >
            <span className="font-bold text-zinc-900 text-[10px]">Alt+H</span>
            <span>Multi-Masters</span>
          </button>
          <button
            onClick={() => navigate('/master/create/ledger')}
            className="flex flex-col items-start w-full px-2 py-1.5 border border-zinc-300 rounded bg-white hover:bg-zinc-50 transition-colors text-left shadow-sm hover:border-zinc-400"
          >
            <span className="font-bold text-zinc-900 text-[10px]">Alt+C</span>
            <span>Create Master</span>
          </button>
          <div className="flex-1"></div>
          <button
            onClick={() => navigate('/master/coa')}
            className="flex flex-col items-start w-full px-2 py-1.5 border border-zinc-300 rounded bg-zinc-200 hover:bg-zinc-300 text-zinc-800 transition-colors text-left shadow-sm font-semibold mt-auto"
          >
            <span className="font-bold text-zinc-900 text-[10px]">Esc</span>
            <span>Quit</span>
          </button>
        </div>
      </div>

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
                  setIsLedgerView(false);
                }}
                className="w-full text-left px-3 py-2 rounded hover:bg-black hover:text-white transition-colors"
              >
                Ledgers (Group-wise Tree)
              </button>
              <button
                onClick={() => {
                  setShowChangeViewModal(false);
                  setIsLedgerView(true);
                }}
                className="w-full text-left px-3 py-2 rounded hover:bg-black hover:text-white transition-colors"
              >
                Ledgers (Ledger-wise Flat)
              </button>
              <button
                onClick={() => {
                  setShowChangeViewModal(false);
                  navigate('/master/coa/group');
                }}
                className="w-full text-left px-3 py-2 rounded hover:bg-black hover:text-white transition-colors border-t border-zinc-100"
              >
                Groups
              </button>
              <button
                onClick={() => {
                  setShowChangeViewModal(false);
                  navigate('/master/coa/inventory?section=stock-group');
                }}
                className="w-full text-left px-3 py-2 rounded hover:bg-black hover:text-white transition-colors"
              >
                Stock Groups & Items
              </button>
              <button
                onClick={() => {
                  setShowChangeViewModal(false);
                  navigate('/master/coa/inventory?section=stock-category');
                }}
                className="w-full text-left px-3 py-2 rounded hover:bg-black hover:text-white transition-colors"
              >
                Stock Categories
              </button>
              <button
                onClick={() => {
                  setShowChangeViewModal(false);
                  navigate('/master/coa/inventory?section=unit');
                }}
                className="w-full text-left px-3 py-2 rounded hover:bg-black hover:text-white transition-colors"
              >
                Units of Measure
              </button>
              <button
                onClick={() => {
                  setShowChangeViewModal(false);
                  navigate('/master/coa/inventory?section=godown');
                }}
                className="w-full text-left px-3 py-2 rounded hover:bg-black hover:text-white transition-colors"
              >
                Godowns
              </button>
            </div>
          </div>
        </div>
      )}

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
                className={`w-full text-left px-3 py-2 rounded transition-colors ${showUnusedOnly ? 'bg-zinc-100 text-black font-semibold' : 'hover:bg-black hover:text-white'}`}
              >
                Show Unused Masters Only
              </button>
              <button
                onClick={() => {
                  setShowExceptionModal(false);
                  setShowUnusedOnly(false);
                }}
                className={`w-full text-left px-3 py-2 rounded transition-colors border-t border-zinc-100 ${!showUnusedOnly ? 'bg-zinc-100 text-black font-semibold' : 'hover:bg-black hover:text-white'}`}
              >
                Show All Masters
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="border-t border-zinc-200 px-4 py-1.5 flex justify-between items-center bg-zinc-50 text-[10px] text-zinc-400 select-none">
        <span>
          Total Ledgers Displayed: {isLedgerView ? flatLedgerList.length : ledgers.length}
        </span>
        <span>COA Engine v2.0 (Keyboard Enabled)</span>
      </div>
    </div>
  );
}
