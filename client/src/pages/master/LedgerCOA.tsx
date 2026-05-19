import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useCompany } from "../../context/CompanyContext";
import type { LedgerType, GroupType } from "../../types/api";

export default function LedgerCOA() {
  const { selectedCompany } = useCompany();
  const [ledgers, setLedgers] = useState<LedgerType[]>([]);
  const [groups, setGroups] = useState<GroupType[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const companyId = selectedCompany?.company_id;

  useEffect(() => {
    if (!companyId) return;
    let cancelled = false;
    (async () => {
      try {
        const [lRes, gRes] = await Promise.all([
          window.api.ledger.getAll(companyId),
          window.api.group.getAll(companyId),
        ]);
        if (cancelled) return;
        if (lRes.success) setLedgers(lRes.ledgers ?? []);
        if (gRes.success) setGroups(gRes.groups ?? []);
      } catch (e) {
        if (!cancelled) setError("Failed to load data.");
      }
    })();
    return () => { cancelled = true; };
  }, [companyId]);

  const getGroupPath = (group_id?: number): string => {
    if (!group_id) return "\u2014";
    const parts: string[] = [];
    let current = groups.find((g) => g.group_id === group_id);
    while (current) {
      parts.unshift(current.name);
      if (current.parent_group_id) {
        current = groups.find((g) => g.group_id === current!.parent_group_id) || undefined;
      } else {
        break;
      }
    }
    return parts.join(" > ");
  };

  const expandLedger = async (id: number) => {
    if (expandedId === id) {
      setExpandedId(null);
      return;
    }
    setExpandedId(id);
  };

  return (
    <div className="flex-1 p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-4">
          <Link to="/master/coa" className="text-sm text-zinc-500 hover:text-zinc-800">
            &larr; Back to Chart of Accounts
          </Link>
          <h1 className="text-lg font-semibold text-zinc-800">Chart of Accounts - Ledgers</h1>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-2 border border-red-200 text-red-700 text-sm flex justify-between items-center">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="text-red-500 hover:text-red-700 text-xs">dismiss</button>
        </div>
      )}

      <div className="overflow-x-auto border rounded">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs uppercase text-gray-500 bg-gray-50">
              <th className="px-4 py-2 text-left border">Name</th>
              <th className="px-4 py-2 text-left border">Under Group</th>
              <th className="px-4 py-2 text-left border">Type</th>
              <th className="px-4 py-2 text-left border">Nature</th>
              <th className="px-4 py-2 text-right border">Opening Balance</th>
              <th className="px-4 py-2 text-center border">View</th>
            </tr>
          </thead>
          <tbody>
            {ledgers.map((l) => {
              const isExpanded = expandedId === l.ledger_id;
              return (
                <>
                  <tr key={l.ledger_id} className="hover:bg-gray-50 border-b">
                    <td className="px-4 py-2 border font-medium">{l.name}</td>
                    <td className="px-4 py-2 border text-xs text-zinc-500">{getGroupPath(l.group_id)}</td>
                    <td className="px-4 py-2 border">{l.ledger_type}</td>
                    <td className="px-4 py-2 border">{l.nature}</td>
                    <td className="px-4 py-2 border text-right tabular-nums">
                      {Number(l.opening_balance) === 0 ? "\u2014" : Number(l.opening_balance).toFixed(2)}
                    </td>
                    <td className="px-4 py-2 border text-center">
                      <button
                        onClick={() => expandLedger(l.ledger_id!)}
                        className="text-xs px-2 py-0.5 rounded border border-zinc-300 hover:bg-zinc-100"
                      >
                        {isExpanded ? "Hide" : "View"}
                      </button>
                    </td>
                  </tr>
                  {isExpanded && (
                    <tr>
                      <td colSpan={6} className="px-6 py-4 bg-zinc-50 border-b">
                        <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
                          {l.alias && (
                            <div className="flex gap-2">
                              <span className="text-zinc-500 w-32">Alias</span>
                              <span className="text-zinc-800">{l.alias}</span>
                            </div>
                          )}
                          <div className="flex gap-2">
                            <span className="text-zinc-500 w-32">Mailing Name</span>
                            <span className="text-zinc-800">{l.mailing_name || "\u2014"}</span>
                          </div>
                          <div className="flex gap-2">
                            <span className="text-zinc-500 w-32">Address</span>
                            <span className="text-zinc-800">
                              {[l.address1, l.address2, l.city, l.state, l.country, l.pincode]
                                .filter(Boolean).join(", ") || "\u2014"}
                            </span>
                          </div>
                          <div className="flex gap-2">
                            <span className="text-zinc-500 w-32">Phone</span>
                            <span className="text-zinc-800">{l.phone || "\u2014"}</span>
                          </div>
                          <div className="flex gap-2">
                            <span className="text-zinc-500 w-32">Email</span>
                            <span className="text-zinc-800">{l.email || "\u2014"}</span>
                          </div>
                          <div className="flex gap-2">
                            <span className="text-zinc-500 w-32">GSTIN</span>
                            <span className="text-zinc-800">{l.gstin || "\u2014"}</span>
                          </div>
                          <div className="flex gap-2">
                            <span className="text-zinc-500 w-32">PAN</span>
                            <span className="text-zinc-800">{l.pan || "\u2014"}</span>
                          </div>
                          <div className="flex gap-2">
                            <span className="text-zinc-500 w-32">Registration Type</span>
                            <span className="text-zinc-800">{l.registration_type || "\u2014"}</span>
                          </div>
                          <div className="flex gap-2">
                            <span className="text-zinc-500 w-32">Bank Name</span>
                            <span className="text-zinc-800">{l.bank_name || "\u2014"}</span>
                          </div>
                          <div className="flex gap-2">
                            <span className="text-zinc-500 w-32">Account Number</span>
                            <span className="text-zinc-800">{l.account_number || "\u2014"}</span>
                          </div>
                          <div className="flex gap-2">
                            <span className="text-zinc-500 w-32">IFSC Code</span>
                            <span className="text-zinc-800">{l.ifsc_code || "\u2014"}</span>
                          </div>
                          <div className="flex gap-2">
                            <span className="text-zinc-500 w-32">Closing Balance</span>
                            <span className="text-zinc-800 tabular-nums">{Number(l.closing_balance).toFixed(2)}</span>
                          </div>
                          <div className="flex gap-2">
                            <span className="text-zinc-500 w-32">Bill-wise</span>
                            <span className="text-zinc-800">{l.is_bill_wise ? "Yes" : "No"}</span>
                          </div>
                          <div className="flex gap-2">
                            <span className="text-zinc-500 w-32">Inventory</span>
                            <span className="text-zinc-800">{l.maintain_inventory_values ? "Yes" : "No"}</span>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              );
            })}
            {ledgers.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gray-400">
                  No ledgers found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
