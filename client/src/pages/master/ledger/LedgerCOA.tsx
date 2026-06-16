import { useState, useEffect, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useCompany } from "@/context/CompanyContext";
import type { LedgerType, GroupType } from "@/types/api";

interface TreeNode extends GroupType {
  children?: TreeNode[];
}

function LedgerDetailsGrid({ ledger }: { ledger: LedgerType }) {
  const bank = (ledger as any).bank_details;
  return (
    <div className="max-w-2xl grid grid-cols-2 gap-x-8 gap-y-2.5 text-xs text-zinc-600">
      {ledger.alias && (
        <div className="flex border-b border-zinc-100 pb-1">
          <span className="text-zinc-400 w-32 shrink-0 select-none">Alias</span>
          <span className="text-zinc-800 font-medium">{ledger.alias}</span>
        </div>
      )}
      <div className="flex border-b border-zinc-100 pb-1">
        <span className="text-zinc-400 w-32 shrink-0 select-none">Mailing Name</span>
        <span className="text-zinc-800">{ledger.mailing_name || "—"}</span>
      </div>
      <div className="flex col-span-2 border-b border-zinc-100 pb-1">
        <span className="text-zinc-400 w-32 shrink-0 select-none">Address</span>
        <span className="text-zinc-800">
          {[ledger.address1, ledger.address2, ledger.city, ledger.state, ledger.country, ledger.pincode]
            .filter(Boolean)
            .join(", ") || "—"}
        </span>
      </div>
      <div className="flex border-b border-zinc-100 pb-1">
        <span className="text-zinc-400 w-32 shrink-0 select-none">Phone</span>
        <span className="text-zinc-800">{ledger.phone || "—"}</span>
      </div>
      <div className="flex border-b border-zinc-100 pb-1">
        <span className="text-zinc-400 w-32 shrink-0 select-none">Email</span>
        <span className="text-zinc-800 text-sky-700">{ledger.email || "—"}</span>
      </div>
      <div className="flex border-b border-zinc-100 pb-1">
        <span className="text-zinc-400 w-32 shrink-0 select-none">GSTIN</span>
        <span className="text-zinc-800 font-medium">{ledger.gstin || "—"}</span>
      </div>
      <div className="flex border-b border-zinc-100 pb-1">
        <span className="text-zinc-400 w-32 shrink-0 select-none">PAN / IT No.</span>
        <span className="text-zinc-800">{ledger.pan || "—"}</span>
      </div>
      <div className="flex border-b border-zinc-100 pb-1">
        <span className="text-zinc-400 w-32 shrink-0 select-none">Registration Type</span>
        <span className="text-zinc-800">{ledger.registration_type || "Unregistered"}</span>
      </div>
      <div className="flex border-b border-zinc-100 pb-1">
        <span className="text-zinc-400 w-32 shrink-0 select-none">Bill-wise</span>
        <span className="text-zinc-800">{ledger.is_bill_wise ? "Yes" : "No"}</span>
      </div>
      <div className="flex border-b border-zinc-100 pb-1">
        <span className="text-zinc-400 w-32 shrink-0 select-none">Inventory Values</span>
        <span className="text-zinc-800">{ledger.maintain_inventory_values ? "Yes" : "No"}</span>
      </div>
      <div className="flex border-b border-zinc-100 pb-1">
        <span className="text-zinc-400 w-32 shrink-0 select-none">Closing Balance</span>
        <span className="text-zinc-800 font-semibold">
          {Number(ledger.closing_balance).toFixed(2)}
        </span>
      </div>

      {!!ledger.invoice_rounding && (
        <>
          <div className="col-span-2 pt-2 pb-1 mt-1 border-t border-zinc-200">
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Invoice Rounding Details</span>
          </div>
          <div className="flex border-b border-zinc-100 pb-1">
            <span className="text-zinc-400 w-32 shrink-0 select-none">Invoice Rounding</span>
            <span className="text-zinc-800">Yes</span>
          </div>
          {ledger.rounding_method && (
            <div className="flex border-b border-zinc-100 pb-1">
              <span className="text-zinc-400 w-32 shrink-0 select-none">Rounding Method</span>
              <span className="text-zinc-800">{ledger.rounding_method}</span>
            </div>
          )}
          <div className="flex border-b border-zinc-100 pb-1">
            <span className="text-zinc-400 w-32 shrink-0 select-none">Rounding Limit</span>
            <span className="text-zinc-800">{Number(ledger.rounding_limit ?? 0).toFixed(2)}</span>
          </div>
        </>
      )}

      {bank && (
        <>
          <div className="col-span-2 pt-2 pb-1 mt-1 border-t border-zinc-200">
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Bank Details</span>
          </div>
          {bank.account_holder_name && (
            <div className="flex border-b border-zinc-100 pb-1">
              <span className="text-zinc-400 w-32 shrink-0 select-none">A/c Holder's Name</span>
              <span className="text-zinc-800">{bank.account_holder_name}</span>
            </div>
          )}
          {bank.account_number && (
            <div className="flex border-b border-zinc-100 pb-1">
              <span className="text-zinc-400 w-32 shrink-0 select-none">A/c No.</span>
              <span className="text-zinc-800 font-medium tracking-wider">{bank.account_number}</span>
            </div>
          )}
          {bank.ifsc_code && (
            <div className="flex border-b border-zinc-100 pb-1">
              <span className="text-zinc-400 w-32 shrink-0 select-none">IFS Code</span>
              <span className="text-zinc-800 font-medium">{bank.ifsc_code}</span>
            </div>
          )}
          {bank.swift_code && (
            <div className="flex border-b border-zinc-100 pb-1">
              <span className="text-zinc-400 w-32 shrink-0 select-none">SWIFT Code</span>
              <span className="text-zinc-800">{bank.swift_code}</span>
            </div>
          )}
          {bank.bank_name && (
            <div className="flex border-b border-zinc-100 pb-1">
              <span className="text-zinc-400 w-32 shrink-0 select-none">Bank Name</span>
              <span className="text-zinc-800 font-medium">{bank.bank_name}</span>
            </div>
          )}
          {bank.branch_name && (
            <div className="flex border-b border-zinc-100 pb-1">
              <span className="text-zinc-400 w-32 shrink-0 select-none">Branch</span>
              <span className="text-zinc-800">{bank.branch_name}</span>
            </div>
          )}
          {bank.od_limit > 0 && (
            <div className="flex border-b border-zinc-100 pb-1">
              <span className="text-zinc-400 w-32 shrink-0 select-none">OD Limit</span>
              <span className="text-zinc-800 font-semibold">{Number(bank.od_limit).toFixed(2)}</span>
            </div>
          )}
          {bank.transaction_type && (
            <div className="flex border-b border-zinc-100 pb-1">
              <span className="text-zinc-400 w-32 shrink-0 select-none">Transaction Type</span>
              <span className="text-zinc-800">{bank.transaction_type}</span>
            </div>
          )}
          <div className="col-span-2 pt-2 pb-1 mt-1 border-t border-zinc-200">
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Bank Configuration</span>
          </div>
          <div className="flex border-b border-zinc-100 pb-1">
            <span className="text-zinc-400 w-32 shrink-0 select-none">Set/Alter range for Cheque Books</span>
            <span className="text-zinc-800">{bank.bank_configuration === "Yes" ? "Yes" : "No"}</span>
          </div>
          {bank.bank_configuration === "Yes" && (
            <>
              {bank.cheque_book_start_no && (
                <div className="flex border-b border-zinc-100 pb-1">
                  <span className="text-zinc-400 w-32 shrink-0 select-none">Cheque Book Start No</span>
                  <span className="text-zinc-800">{bank.cheque_book_start_no}</span>
                </div>
              )}
              {bank.cheque_book_end_no && (
                <div className="flex border-b border-zinc-100 pb-1">
                  <span className="text-zinc-400 w-32 shrink-0 select-none">Cheque Book End No</span>
                  <span className="text-zinc-800">{bank.cheque_book_end_no}</span>
                </div>
              )}
            </>
          )}
          <div className="flex border-b border-zinc-100 pb-1">
            <span className="text-zinc-400 w-32 shrink-0 select-none">Enable Cheque Printing</span>
            <span className="text-zinc-800">{bank.enable_cheque_printing ? "Yes" : "No"}</span>
          </div>
          {bank.enable_cheque_printing && bank.cheque_printing_configuration && (
            <div className="flex border-b border-zinc-100 pb-1">
              <span className="text-zinc-400 w-32 shrink-0 select-none">Cheque Print Config</span>
              <span className="text-zinc-800">{bank.cheque_printing_configuration}</span>
            </div>
          )}
        </>
      )}
    </div>
  );
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
  const [searchQuery, setSearchQuery] = useState("");

  const [showChangeViewModal, setShowChangeViewModal] = useState(false);
  const [showExceptionModal, setShowExceptionModal] = useState(false);

  const [expandedGroups, setExpandedGroups] = useState<Record<number, boolean>>({});
  const [expandedLedgers, setExpandedLedgers] = useState<Record<number, boolean>>({});

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
        if (!cancelled) setError("Failed to load data.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [companyId]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") { e.preventDefault(); navigate("/master/coa"); }
      if (e.key === "F5" || e.key === "f5") { e.preventDefault(); setIsLedgerView((prev) => !prev); }
      if ((e.ctrlKey || e.metaKey) && (e.key === "h" || e.key === "H")) { e.preventDefault(); setShowChangeViewModal((prev) => !prev); }
      if ((e.ctrlKey || e.metaKey) && (e.key === "j" || e.key === "J")) { e.preventDefault(); setShowExceptionModal((prev) => !prev); }
      if (e.altKey && (e.key === "c" || e.key === "C")) { e.preventDefault(); navigate("/master/create/ledger"); }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
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
      parentGroupName: l.group_id ? (groupMap[l.group_id] || "Primary") : "Primary",
    }));
    if (showUnusedOnly) list = list.filter((l) => Number(l.opening_balance) === 0);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (l) =>
          l.name.toLowerCase().includes(q) ||
          (l.alias && l.alias.toLowerCase().includes(q)) ||
          l.parentGroupName.toLowerCase().includes(q)
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
          if (showUnusedOnly) matchedLedgers = matchedLedgers.filter((l) => Number(l.opening_balance) === 0);
          if (q) matchedLedgers = matchedLedgers.filter(
            (l) => l.name.toLowerCase().includes(q) || (l.alias && l.alias.toLowerCase().includes(q))
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
    setExpandedLedgers({});
  };

  const toggleGroup = (groupId: number) => {
    setExpandedGroups((prev) => ({ ...prev, [groupId]: !prev[groupId] }));
  };

  const toggleLedger = (ledgerId: number) => {
    setExpandedLedgers((prev) => ({ ...prev, [ledgerId]: !prev[ledgerId] }));
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
                {isExpanded ? "▼" : "▶"}
              </span>
            ) : (
              <span className="text-[10px] opacity-30 select-none">•</span>
            )}
          </span>
          <div className="flex-1 flex items-center justify-between pr-4">
            <span className="font-semibold text-zinc-800 text-[13px]">{node.name}</span>
            <div className="flex items-center gap-2 text-[10px] text-zinc-400 opacity-0 group-hover:opacity-100 transition-opacity">
              <span>Group</span>
              {node.nature && <span className="bg-zinc-100 px-1 py-0.5 rounded">{node.nature}</span>}
            </div>
          </div>
        </div>

        {isExpanded && hasItems && (
          <div className="flex flex-col">
            {childGroups.map((child) => renderTreeNode(child, depth + 1))}
            {activeLedgers.map((ledger) => {
              const ledgerId = ledger.ledger_id!;
              const isLedgerExpanded = !!expandedLedgers[ledgerId];
              return (
                <div key={ledgerId} className="flex flex-col">
                  <div
                    className={`flex items-center min-h-[26px] hover:bg-zinc-100/70 border-b border-zinc-100/30 cursor-pointer select-none group ${isLedgerExpanded ? "bg-zinc-50/50" : ""}`}
                    style={{ paddingLeft: (depth + 1) * 20 + 8 }}
                    onClick={() => toggleLedger(ledgerId)}
                  >
                    <span className="w-5 flex items-center justify-center text-sky-600/70 shrink-0 font-bold select-none text-[11px]">▫</span>
                    <div className="flex-1 flex items-center justify-between pr-4">
                      <span className="text-zinc-700 font-medium text-[13px] hover:text-sky-800 transition-colors">
                        {ledger.name}
                      </span>
                      <div className="flex items-center gap-3">
                        <span className="text-[12px] tabular-nums text-zinc-500">
                          {Number(ledger.opening_balance) === 0 ? "—" : Number(ledger.opening_balance).toFixed(2)}
                        </span>
                        <button
                          onClick={(e) => { e.stopPropagation(); navigate(`/master/alter/ledger`, { state: { ledgerId } }); }}
                          className="text-[10px] text-zinc-400 hover:text-sky-700 opacity-0 group-hover:opacity-100 transition-opacity px-1.5 py-0.5 border border-zinc-200 rounded bg-white shadow-sm"
                        >
                          Edit
                        </button>
                      </div>
                    </div>
                  </div>

                  {isLedgerExpanded && (
                    <div
                      className="bg-zinc-50/80 border-b border-zinc-200 py-3 px-6 shadow-inner"
                      style={{ paddingLeft: (depth + 2) * 20 + 8 }}
                    >
                      <LedgerDetailsGrid ledger={ledger} />
                    </div>
                  )}
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
          <button onClick={expandAll} className="text-[11px] font-semibold text-zinc-600 hover:text-black px-2 py-1 border border-zinc-300 rounded bg-white shadow-sm">
            Expand All
          </button>
          <button onClick={collapseAll} className="text-[11px] font-semibold text-zinc-600 hover:text-black px-2 py-1 border border-zinc-300 rounded bg-white shadow-sm">
            Collapse All
          </button>
          <Link to="/master/create/ledger" className="text-[11px] font-semibold text-white bg-black hover:bg-zinc-800 px-3 py-1 rounded shadow-sm">
            + Create Ledger
          </Link>
        </div>
      </div>

      {error && (
        <div className="px-4 py-2 border-b border-red-200 bg-red-50 text-red-700 text-xs flex justify-between items-center animate-shake">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="text-red-500 hover:text-red-700 text-xs font-bold">dismiss</button>
        </div>
      )}

      <div className="flex-1 flex overflow-hidden min-h-0 bg-white">
        <div className="flex-1 flex flex-col min-w-0 bg-white h-full">
          <div className="px-4 py-1.5 border-b border-zinc-200 bg-zinc-50/50 flex items-center gap-2">
            <span className="text-[10px] uppercase tracking-wider font-bold text-zinc-400 select-none">Search:</span>
            <input
              type="text"
              placeholder="Type name, alias, parent group to filter..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 bg-white border border-zinc-300 rounded px-2.5 py-1 text-xs text-zinc-850 focus:outline-none focus:border-zinc-500 shadow-inner"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery("")} className="text-xs text-zinc-400 hover:text-black font-bold px-1.5">
                Clear
              </button>
            )}
          </div>

          <div className="flex-1 overflow-y-auto min-h-0 bg-white">
            {loading ? (
              <div className="flex items-center justify-center h-48 text-xs text-zinc-400">Loading ledger hierarchy...</div>
            ) : isLedgerView ? (
              flatLedgerList.length === 0 ? (
                <div className="flex items-center justify-center h-48 text-xs text-zinc-400">No matching ledgers found.</div>
              ) : (
                <div className="flex flex-col min-w-full">
                  {/* Table headers */}
                  <div className="flex items-center bg-zinc-50 border-b border-zinc-200 text-[10px] font-bold text-zinc-500 uppercase tracking-wider select-none min-h-[26px]">
                    <span className="flex-1 px-4 py-1">Ledger Name</span>
                    <span className="w-56 px-4 py-1 border-l border-zinc-200">Parent Group</span>
                    <span className="w-36 px-4 py-1 text-right border-l border-zinc-200">Opening Balance</span>
                  </div>
                  {flatLedgerList.map((ledger) => {
                    const ledgerId = ledger.ledger_id!;
                    const isLedgerExpanded = !!expandedLedgers[ledgerId];
                    return (
                      <div key={ledgerId} className="flex flex-col border-b border-zinc-100">
                        <div
                          className={`flex items-center min-h-[30px] hover:bg-zinc-50/70 cursor-pointer select-none group ${isLedgerExpanded ? "bg-zinc-50" : ""}`}
                          onClick={() => toggleLedger(ledgerId)}
                        >
                          <div className="flex-1 px-4 py-1.5 flex items-center min-w-0">
                            <span className="text-zinc-800 font-semibold text-[13px] hover:text-sky-800 transition-colors truncate">
                              {ledger.name}
                            </span>
                            {ledger.alias && (
                              <span className="text-[10px] text-zinc-400 font-normal ml-1.5 truncate">({ledger.alias})</span>
                            )}
                          </div>
                          <div className="w-56 px-4 py-1.5 text-zinc-600 text-xs truncate border-l border-zinc-100/50">
                            {(ledger as any).parentGroupName}
                          </div>
                          <div className="w-36 px-4 py-1.5 flex items-center justify-between border-l border-zinc-100/50">
                            <span className="text-xs font-medium tabular-nums text-zinc-700 ml-auto">
                              {Number(ledger.opening_balance) === 0 ? "—" : Number(ledger.opening_balance).toFixed(2)}
                            </span>
                            <button
                              onClick={(e) => { e.stopPropagation(); navigate(`/master/alter/ledger`, { state: { ledgerId } }); }}
                              className="text-[9px] text-zinc-400 hover:text-sky-700 opacity-0 group-hover:opacity-100 transition-opacity px-1.5 py-0.5 border border-zinc-200 rounded bg-white shadow-sm ml-2.5 shrink-0"
                            >
                              Edit
                            </button>
                          </div>
                        </div>

                        {isLedgerExpanded && (
                          <div className="bg-zinc-50/80 border-t border-b border-zinc-200 py-3.5 px-8 shadow-inner">
                            <LedgerDetailsGrid ledger={ledger} />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )
            ) : (
              filteredGroupTree.length === 0 ? (
                <div className="flex items-center justify-center h-48 text-xs text-zinc-400">No matching items found.</div>
              ) : (
                <div className="py-2">{filteredGroupTree.map((node) => renderTreeNode(node, 0))}</div>
              )
            )}
          </div>
        </div>

        <div className="w-44 border-l border-zinc-200 bg-zinc-100 flex flex-col gap-1 p-2 shrink-0 select-none text-[11px] font-medium text-zinc-700">
          <button
            onClick={() => setIsLedgerView((prev) => !prev)}
            className="flex flex-col items-start w-full px-2 py-1.5 border border-zinc-300 rounded bg-white hover:bg-zinc-50 transition-colors text-left shadow-sm hover:border-zinc-400"
          >
            <span className="font-bold text-zinc-900 text-[10px]">F5</span>
            <span>{isLedgerView ? "Group-wise" : "Ledger-wise"}</span>
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
            onClick={() => navigate("/master/create/ledger")}
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

      {showChangeViewModal && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-xs flex items-center justify-center z-50">
          <div className="bg-white border border-zinc-300 rounded-lg shadow-xl w-80 overflow-hidden select-none animate-fadeIn">
            <div className="bg-zinc-100 px-4 py-2 text-xs font-bold text-zinc-750 border-b border-zinc-200 flex justify-between items-center">
              <span>Change View</span>
              <button onClick={() => setShowChangeViewModal(false)} className="text-zinc-400 hover:text-black font-semibold">✕</button>
            </div>
            <div className="p-1 flex flex-col text-xs">
              <button onClick={() => { setShowChangeViewModal(false); setIsLedgerView(false); }} className="w-full text-left px-3 py-2 rounded hover:bg-black hover:text-white transition-colors">Ledgers (Group-wise Tree)</button>
              <button onClick={() => { setShowChangeViewModal(false); setIsLedgerView(true); }} className="w-full text-left px-3 py-2 rounded hover:bg-black hover:text-white transition-colors">Ledgers (Ledger-wise Flat)</button>
              <button onClick={() => { setShowChangeViewModal(false); navigate("/master/coa/group"); }} className="w-full text-left px-3 py-2 rounded hover:bg-black hover:text-white transition-colors border-t border-zinc-100">Groups</button>
              <button onClick={() => { setShowChangeViewModal(false); navigate("/master/coa/inventory?section=stock-group"); }} className="w-full text-left px-3 py-2 rounded hover:bg-black hover:text-white transition-colors">Stock Groups & Items</button>
              <button onClick={() => { setShowChangeViewModal(false); navigate("/master/coa/inventory?section=stock-category"); }} className="w-full text-left px-3 py-2 rounded hover:bg-black hover:text-white transition-colors">Stock Categories</button>
              <button onClick={() => { setShowChangeViewModal(false); navigate("/master/coa/inventory?section=unit"); }} className="w-full text-left px-3 py-2 rounded hover:bg-black hover:text-white transition-colors">Units of Measure</button>
              <button onClick={() => { setShowChangeViewModal(false); navigate("/master/coa/inventory?section=godown"); }} className="w-full text-left px-3 py-2 rounded hover:bg-black hover:text-white transition-colors">Godowns</button>
            </div>
          </div>
        </div>
      )}

      {showExceptionModal && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-xs flex items-center justify-center z-50">
          <div className="bg-white border border-zinc-300 rounded-lg shadow-xl w-72 overflow-hidden select-none animate-fadeIn">
            <div className="bg-zinc-100 px-4 py-2 text-xs font-bold text-zinc-750 border-b border-zinc-200 flex justify-between items-center">
              <span>Exception Reports</span>
              <button onClick={() => setShowExceptionModal(false)} className="text-zinc-400 hover:text-black font-semibold">✕</button>
            </div>
            <div className="p-1 flex flex-col text-xs">
              <button
                onClick={() => { setShowExceptionModal(false); setShowUnusedOnly(true); }}
                className={`w-full text-left px-3 py-2 rounded transition-colors ${showUnusedOnly ? "bg-zinc-100 text-black font-semibold" : "hover:bg-black hover:text-white"}`}
              >
                Show Unused Masters Only
              </button>
              <button
                onClick={() => { setShowExceptionModal(false); setShowUnusedOnly(false); }}
                className={`w-full text-left px-3 py-2 rounded transition-colors border-t border-zinc-100 ${!showUnusedOnly ? "bg-zinc-100 text-black font-semibold" : "hover:bg-black hover:text-white"}`}
              >
                Show All Masters
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="border-t border-zinc-200 px-4 py-1.5 flex justify-between items-center bg-zinc-50 text-[10px] text-zinc-400 select-none">
        <span>Total Ledgers Displayed: {isLedgerView ? flatLedgerList.length : ledgers.length}</span>
        <span>TallyPrime COA Engine v2.0 (Keyboard Enabled)</span>
      </div>
    </div>
  );
}
