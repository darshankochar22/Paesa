import * as React from "react";
import { useNavigate } from "react-router-dom";
import { useCompany } from "@/context/CompanyContext";

interface ChildGroup {
  group_id: number;
  group_name: string;
  dr: number;
  cr: number;
}

interface LedgerRow {
  ledger_id: number;
  ledger_name: string;
  dr: number;
  cr: number;
}

interface GroupSummaryResponse {
  success: boolean;
  group_name: string;
  childGroups: ChildGroup[];
  ledgers: LedgerRow[];
  totalDr: number;
  totalCr: number;
  error?: string;
}

interface FlattenedRow {
  id: string; // e.g., group-12, ledger-5
  name: string;
  type: "parent-group" | "child-group" | "ledger";
  rawId: number;
  dr: number;
  cr: number;
  parentGroupId?: number;
}

const fmt = (val: number) =>
  val === 0
    ? ""
    : new Intl.NumberFormat("en-IN", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(val);

const fmtTotal = (val: number) =>
  new Intl.NumberFormat("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(val);

export default function CashBankSummaryLayout() {
  const navigate = useNavigate();
  const { selectedCompany, activeFY } = useCompany();

  const [rows, setRows] = React.useState<FlattenedRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [focusedIndex, setFocusedIndex] = React.useState<number>(0);

  const fetchSummary = React.useCallback(async () => {
    if (!selectedCompany?.company_id || !activeFY?.fy_id) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);

    try {
      // 1. Get all groups to find the targets
      const groupsRes = await (window as any).api.group.getAll(selectedCompany.company_id);
      if (!groupsRes.success || !groupsRes.groups) {
        throw new Error(groupsRes.error || "Failed to load groups");
      }

      const allGroups = groupsRes.groups;
      
      // Target names to match case-insensitively
      const cashInHandGroup = allGroups.find(
        (g: any) => g.name.toLowerCase().trim() === "cash-in-hand"
      );
      const bankAccountsGroup = allGroups.find(
        (g: any) => g.name.toLowerCase().trim() === "bank accounts"
      );
      const bankODGroup = allGroups.find((g: any) => {
        const name = g.name.toLowerCase().trim();
        return name === "bank od a/c" || name === "bank od accounts" || name === "bank od account";
      });

      // Prepare target group fetches
      const targets = [
        { group: cashInHandGroup, defaultName: "Cash-in-Hand" },
        { group: bankAccountsGroup, defaultName: "Bank Accounts" },
        { group: bankODGroup, defaultName: "Bank OD A/c" },
      ];

      const flatList: FlattenedRow[] = [];

      for (const target of targets) {
        if (!target.group) continue;
        
        const gRes: GroupSummaryResponse = await (window as any).api.report.groupSummaryDrilldown(
          selectedCompany.company_id,
          activeFY.fy_id,
          target.group.group_id
        );

        if (gRes.success) {
          // Calculate the parent group's total dr/cr based on children elements
          // (which matches Tally's behavior of showing the sum of child balances, not net)
          let totalDr = 0;
          let totalCr = 0;
          
          gRes.childGroups.forEach(cg => {
            totalDr += cg.dr;
            totalCr += cg.cr;
          });
          gRes.ledgers.forEach(l => {
            totalDr += l.dr;
            totalCr += l.cr;
          });

          // Only display the group if it has transactions/balances
          if (totalDr !== 0 || totalCr !== 0) {
            const parentRowId = `group-${target.group.group_id}`;
            flatList.push({
              id: parentRowId,
              name: target.group.name,
              type: "parent-group",
              rawId: target.group.group_id,
              dr: totalDr,
              cr: totalCr,
            });

            // Add Child Groups
            gRes.childGroups.forEach((cg) => {
              flatList.push({
                id: `group-${cg.group_id}`,
                name: cg.group_name,
                type: "child-group",
                rawId: cg.group_id,
                dr: cg.dr,
                cr: cg.cr,
                parentGroupId: target.group.group_id,
              });
            });

            // Add Ledgers
            gRes.ledgers.forEach((l) => {
              flatList.push({
                id: `ledger-${l.ledger_id}`,
                name: l.ledger_name,
                type: "ledger",
                rawId: l.ledger_id,
                dr: l.dr,
                cr: l.cr,
                parentGroupId: target.group.group_id,
              });
            });
          }
        }
      }

      setRows(flatList);
      setFocusedIndex(0);
    } catch (err: any) {
      setError(err.message || "An error occurred");
    } finally {
      setLoading(false);
    }
  }, [selectedCompany?.company_id, activeFY?.fy_id]);

  React.useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  const handleDrilldown = React.useCallback(
    (row: FlattenedRow) => {
      if (row.type === "parent-group" || row.type === "child-group") {
        navigate(`/reports/accounts/group-summary/${row.rawId}`);
      } else {
        navigate(`/reports/accounts/ledger-summary/${row.rawId}`);
      }
    },
    [navigate]
  );

  React.useEffect(() => {
    if (rows.length === 0) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is typing in form inputs
      if (
        document.activeElement?.tagName === "INPUT" ||
        document.activeElement?.tagName === "SELECT" ||
        document.activeElement?.tagName === "TEXTAREA"
      ) {
        return;
      }

      if (e.key === "ArrowDown") {
        e.preventDefault();
        setFocusedIndex((prev) => Math.min(rows.length - 1, prev + 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setFocusedIndex((prev) => Math.max(0, prev - 1));
      } else if (e.key === "Enter") {
        e.preventDefault();
        const activeRow = rows[focusedIndex];
        if (activeRow) {
          handleDrilldown(activeRow);
        }
      } else if (e.key === "Backspace" || e.key === "Escape") {
        e.preventDefault();
        navigate(-1);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [rows, focusedIndex, handleDrilldown, navigate]);

  // Calculate grand totals for Cash/Bank summary
  const grandTotalDr = React.useMemo(() => {
    return rows
      .filter((r) => r.type === "parent-group")
      .reduce((sum, r) => sum + r.dr, 0);
  }, [rows]);

  const grandTotalCr = React.useMemo(() => {
    return rows
      .filter((r) => r.type === "parent-group")
      .reduce((sum, r) => sum + r.cr, 0);
  }, [rows]);

  const formatDateLabel = (dateStr?: string) => {
    if (!dateStr) return "";
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
    } catch {
      return dateStr;
    }
  };

  const periodLabel = activeFY
    ? `${formatDateLabel(activeFY.start_date)} to ${formatDateLabel(activeFY.end_date)}`
    : "";

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-white font-mono text-xs text-zinc-400">
        Loading Cash/Bank Summary...
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center bg-white font-mono text-xs text-zinc-600 px-8 text-center">
        {error}
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full w-full bg-white font-mono overflow-hidden">
      <div className="flex-1 overflow-y-auto">
        <table className="w-full border-collapse text-[11px] font-mono">
          <thead className="sticky top-0 bg-[#f4f4f5] border-b border-zinc-300 z-10 text-zinc-700 select-none">
            <tr>
              <th className="px-4 py-2 text-left font-bold" rowSpan={3}>
                Particulars
              </th>
              <th className="px-4 py-0.5 text-center font-bold border-b border-zinc-200">
                {selectedCompany?.name ?? ""}
              </th>
            </tr>
            <tr>
              <th className="px-4 py-0.5 text-center font-normal italic text-zinc-500">
                {periodLabel}
              </th>
            </tr>
            <tr>
              <th className="px-4 py-0.5 text-center font-bold border-t border-zinc-200">
                <div className="border-b border-zinc-200 pb-0.5 mb-0.5">Closing Balance</div>
                <div className="flex w-full">
                  <span className="w-32 text-right pr-4 border-r border-zinc-200">Debit</span>
                  <span className="w-32 text-right pr-4">Credit</span>
                </div>
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={2} className="px-4 py-8 text-center text-zinc-400 italic">
                  No cash or bank accounts found with transactions.
                </td>
              </tr>
            ) : (
              rows.map((row, idx) => {
                const isFocused = idx === focusedIndex;
                const isParent = row.type === "parent-group";
                const isChildGroup = row.type === "child-group";
                
                return (
                  <tr
                    key={row.id}
                    className={`border-b border-zinc-100 cursor-pointer select-none transition-colors ${
                      isFocused
                        ? "bg-[#e4e4e7] text-zinc-950 font-bold"
                        : isParent
                        ? "hover:bg-zinc-50 text-zinc-800 font-bold text-xs"
                        : isChildGroup
                        ? "hover:bg-zinc-50 text-zinc-800 font-semibold"
                        : "hover:bg-zinc-50 text-zinc-700 italic"
                    }`}
                    onClick={() => setFocusedIndex(idx)}
                    onDoubleClick={() => handleDrilldown(row)}
                  >
                    <td className={`px-4 py-1.5 text-left ${!isParent ? "pl-8" : ""}`}>
                      {isChildGroup && (
                        <span className="mr-1.5 text-zinc-400 text-[9px]">▶</span>
                      )}
                      {!isParent && !isChildGroup && (
                        <span className="mr-3 text-zinc-300">–</span>
                      )}
                      {row.name}
                    </td>
                    <td className="text-right">
                      <div className="flex w-full justify-end font-mono">
                        <span className="w-32 text-right pr-4 border-r border-zinc-100">
                          {row.dr !== 0 ? fmt(row.dr) : ""}
                        </span>
                        <span className="w-32 text-right pr-4">
                          {row.cr !== 0 ? fmt(row.cr) : ""}
                        </span>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Grand Total Bar */}
      <div className="border-t-2 border-double border-zinc-400 bg-[#f4f4f5] px-4 py-1.5 flex justify-between font-mono text-[11px] font-bold text-zinc-900 select-none">
        <span className="flex-1">Grand Total</span>
        <div className="flex justify-end pr-4">
          <span className="w-32 text-right pr-4 border-r border-zinc-300">
            {grandTotalDr !== 0 ? fmtTotal(grandTotalDr) : ""}
          </span>
          <span className="w-32 text-right pr-4">
            {grandTotalCr !== 0 ? fmtTotal(grandTotalCr) : ""}
          </span>
        </div>
      </div>
    </div>
  );
}
