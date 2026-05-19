import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useCompany } from "../../context/CompanyContext";
import GroupTree from "../../../components/GroupTree";
import type { GroupType } from "../../types/api";

export default function GroupCOA() {
  const { selectedCompany } = useCompany();
  const [groupTree, setGroupTree] = useState<(GroupType & { children?: GroupType[] })[]>([]);
  const [groups, setGroups] = useState<GroupType[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<GroupType | null>(null);

  const companyId = selectedCompany?.company_id;

  useEffect(() => {
    if (!companyId) return;
    let cancelled = false;
    (async () => {
      try {
        const [treeRes, gRes] = await Promise.all([
          window.api.group.getTree(companyId),
          window.api.group.getAll(companyId),
        ]);
        if (cancelled) return;
        if (treeRes.success && treeRes.tree) setGroupTree(treeRes.tree ?? []);
        if (gRes.success && gRes.groups) setGroups(gRes.groups ?? []);
      } catch (e) {
        if (!cancelled) setError("Failed to load groups.");
      }
    })();
    return () => { cancelled = true; };
  }, [companyId]);

  const handleGroupSelect = (group: GroupType) => {
    setSelectedGroup(group);
  };

  const parentName = (id?: number | null) => groups.find((g) => g.group_id === id)?.name || "\u2014";

  return (
    <div className="flex-1 flex">
      <div className="flex-1 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <Link to="/master/coa" className="text-sm text-zinc-500 hover:text-zinc-800">
              &larr; Back to Chart of Accounts
            </Link>
            <h1 className="text-lg font-semibold text-zinc-800">Chart of Accounts - Groups</h1>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-2 border border-red-200 text-red-700 text-sm flex justify-between items-center">
            <span>{error}</span>
            <button onClick={() => setError(null)} className="text-red-500 hover:text-red-700 text-xs">dismiss</button>
          </div>
        )}

        <div className="flex gap-6">
          <div className="w-72 border rounded overflow-hidden flex-shrink-0">
            <div className="px-4 py-3 border-b bg-zinc-50 text-sm font-medium text-zinc-600">
              Groups
            </div>
            <div className="max-h-[70vh] overflow-y-auto">
              <GroupTree
                tree={groupTree}
                selectedId={selectedGroup?.group_id}
                onSelect={handleGroupSelect}
              />
            </div>
          </div>

          <div className="flex-1">
            {selectedGroup ? (
              <div className="border rounded overflow-hidden">
                <div className="px-4 py-3 border-b bg-zinc-50 text-sm font-medium text-zinc-600">
                  Group Details: {selectedGroup.name}
                </div>
                <div className="p-4 grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
                  <div className="flex gap-2">
                    <span className="text-zinc-500 w-32">Name</span>
                    <span className="text-zinc-800 font-medium">{selectedGroup.name}</span>
                  </div>
                  {selectedGroup.alias && (
                    <div className="flex gap-2">
                      <span className="text-zinc-500 w-32">Alias</span>
                      <span className="text-zinc-800">{selectedGroup.alias}</span>
                    </div>
                  )}
                  <div className="flex gap-2">
                    <span className="text-zinc-500 w-32">Under</span>
                    <span className="text-zinc-800">{parentName(selectedGroup.parent_group_id)}</span>
                  </div>
                  <div className="flex gap-2">
                    <span className="text-zinc-500 w-32">Nature</span>
                    <span className="text-zinc-800">{selectedGroup.nature}</span>
                  </div>
                  <div className="flex gap-2">
                    <span className="text-zinc-500 w-32">Type</span>
                    <span className="text-zinc-800">
                      {selectedGroup.is_primary === 1 ? "Primary" : selectedGroup.is_predefined === 1 ? "Predefined" : "User"}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <span className="text-zinc-500 w-32">Allocation Method</span>
                    <span className="text-zinc-800">{selectedGroup.allocation_method}</span>
                  </div>
                  <div className="flex gap-2">
                    <span className="text-zinc-500 w-32">Sort Order</span>
                    <span className="text-zinc-800 tabular-nums">{selectedGroup.sort_order}</span>
                  </div>
                  <div className="flex gap-2">
                    <span className="text-zinc-500 w-32">Display Order</span>
                    <span className="text-zinc-800 tabular-nums">{selectedGroup.display_order}</span>
                  </div>

                  <div className="flex gap-2">
                    <span className="text-zinc-500 w-32">Gross Profit</span>
                    <span className="text-zinc-800">{selectedGroup.affect_gross_profit ? "Yes" : "No"}</span>
                  </div>
                  <div className="flex gap-2">
                    <span className="text-zinc-500 w-32">Sub-ledger</span>
                    <span className="text-zinc-800">{selectedGroup.behaves_like_subledger ? "Yes" : "No"}</span>
                  </div>
                  <div className="flex gap-2">
                    <span className="text-zinc-500 w-32">Net Dr/Cr</span>
                    <span className="text-zinc-800">{selectedGroup.show_net_debit_credit ? "Yes" : "No"}</span>
                  </div>
                  <div className="flex gap-2">
                    <span className="text-zinc-500 w-32">Calculation</span>
                    <span className="text-zinc-800">{selectedGroup.used_for_calculation ? "Yes" : "No"}</span>
                  </div>

                  {selectedGroup.gst_rate !== null && (
                    <div className="flex gap-2">
                      <span className="text-zinc-500 w-32">GST Rate</span>
                      <span className="text-zinc-800 tabular-nums">{Number(selectedGroup.gst_rate).toFixed(2)}%</span>
                    </div>
                  )}
                  {selectedGroup.cgst_rate !== null && (
                    <div className="flex gap-2">
                      <span className="text-zinc-500 w-32">CGST Rate</span>
                      <span className="text-zinc-800 tabular-nums">{Number(selectedGroup.cgst_rate).toFixed(2)}%</span>
                    </div>
                  )}
                  {selectedGroup.sgst_rate !== null && (
                    <div className="flex gap-2">
                      <span className="text-zinc-500 w-32">SGST Rate</span>
                      <span className="text-zinc-800 tabular-nums">{Number(selectedGroup.sgst_rate).toFixed(2)}%</span>
                    </div>
                  )}
                  {selectedGroup.igst_rate !== null && (
                    <div className="flex gap-2">
                      <span className="text-zinc-500 w-32">IGST Rate</span>
                      <span className="text-zinc-800 tabular-nums">{Number(selectedGroup.igst_rate).toFixed(2)}%</span>
                    </div>
                  )}
                  {selectedGroup.hsn_sac_code && (
                    <div className="flex gap-2">
                      <span className="text-zinc-500 w-32">HSN/SAC</span>
                      <span className="text-zinc-800">{selectedGroup.hsn_sac_code}</span>
                    </div>
                  )}
                  {selectedGroup.statutory_details && (
                    <div className="flex gap-2">
                      <span className="text-zinc-500 w-32">Statutory Details</span>
                      <span className="text-zinc-800">{selectedGroup.statutory_details}</span>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="border rounded p-8 text-center text-zinc-400">
                <p className="text-sm">Select a group to view its details</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
