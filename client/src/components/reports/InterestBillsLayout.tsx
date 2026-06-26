import * as React from "react";
import { useNavigate } from "react-router-dom";
import { useCompany } from "@/context/CompanyContext";

/* ── Formatters ────────────────────────────────────────────────────── */
const fmtDate = (d: string) => {
  if (!d) return "";
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return d;
  return `${dt.getDate()}-${dt.toLocaleString("en-IN", { month: "short" })}-${String(dt.getFullYear()).slice(-2)}`;
};

const fmt = (v: number) =>
  v === 0 ? "0.00" : new Intl.NumberFormat("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Math.abs(v));

const fmtTotal = (v: number) =>
  new Intl.NumberFormat("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Math.abs(v));

/* ── Types ─────────────────────────────────────────────────────────── */
interface BillRow {
  ledger_id: number;
  party_ledger: string;
  bill_ref: string;
  bill_due_date: string;
  total_pending: number;
  interest_rate: number;
  interest_style: string;
  days: number;
  interest_amount: number;
}

interface GroupedLedger {
  ledger_id: number;
  name: string;
  total_principal: number;
  total_interest: number;
  bills: BillRow[];
}

interface InterestBillsLayoutProps {
  mode: "receivable" | "payable";
}

export default function InterestBillsLayout({ mode }: InterestBillsLayoutProps) {
  const navigate = useNavigate();
  const { selectedCompany, activeFY } = useCompany();

  const [grouped, setGrouped] = React.useState<GroupedLedger[]>([]);
  const [totalPrincipal, setTotalPrincipal] = React.useState(0);
  const [totalInterest, setTotalInterest] = React.useState(0);
  const [asOn, setAsOn] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Table navigation
  const [focusedIdx, setFocused] = React.useState(0);
  const [expandedIds, setExpanded] = React.useState<Set<number>>(new Set());

  const fromDate = activeFY?.start_date || "";
  const toDate = activeFY?.end_date || "";
  const cid = selectedCompany?.company_id;
  const fyid = activeFY?.fy_id;

  const reportTitle = mode === "receivable" ? "Interest Receivable" : "Interest Payable";

  /* ── Load data ──────────────────────────────────────────────────── */
  React.useEffect(() => {
    if (!cid || !fyid) return;
    setLoading(true);
    setError(null);

    const apiCall =
      mode === "receivable"
        ? (window as any).api.report.interestReceivable(cid, fyid, {})
        : (window as any).api.report.interestPayable(cid, fyid, {});

    apiCall
      .then((res: any) => {
        if (res?.success) {
          const rawRows: BillRow[] = res.rows || [];
          setTotalPrincipal(res.total_principal || 0);
          setTotalInterest(res.total_interest || 0);
          setAsOn(res.to_date || "");

          // Group by ledger
          const groupsMap = new Map<number, GroupedLedger>();
          rawRows.forEach((r) => {
            if (!groupsMap.has(r.ledger_id)) {
              groupsMap.set(r.ledger_id, {
                ledger_id: r.ledger_id,
                name: r.party_ledger,
                total_principal: 0,
                total_interest: 0,
                bills: [],
              });
            }
            const g = groupsMap.get(r.ledger_id)!;
            g.total_principal += r.total_pending;
            g.total_interest += r.interest_amount;
            g.bills.push(r);
          });

          const sortedGroups = Array.from(groupsMap.values()).sort((a, b) =>
            a.name.localeCompare(b.name)
          );
          setGrouped(sortedGroups);
        } else {
          setError(res?.error || "Failed to load report data.");
        }
      })
      .catch((err: any) => {
        setError(err.message || "An error occurred.");
      })
      .finally(() => {
        setLoading(false);
      });
  }, [mode, cid, fyid]);

  /* ── Keyboard navigation ────────────────────────────────────────── */
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (loading || error || grouped.length === 0) return;

      if (e.key === "ArrowDown") {
        e.preventDefault();
        setFocused((p) => Math.min(grouped.length - 1, p + 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setFocused((p) => Math.max(0, p - 1));
      } else if (e.key === "Enter") {
        e.preventDefault();
        const active = grouped[focusedIdx];
        if (active) {
          toggleExpand(active.ledger_id);
        }
      } else if (e.key === "Escape" || e.key === "Backspace") {
        e.preventDefault();
        navigate(-1);
      } else if (e.key === "d" || e.key === "D") {
        // Drill down key
        const active = grouped[focusedIdx];
        if (active) {
          navigate(
            `/reports/accounts/interest-calculation-bill-wise?ledger_id=${active.ledger_id}&ledger_name=${encodeURIComponent(active.name)}`
          );
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [grouped, focusedIdx, loading, error, navigate]);

  const toggleExpand = (id: number) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center text-zinc-400 font-mono text-xs">
        Loading {reportTitle}...
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center text-zinc-600 font-mono text-xs px-8 text-center">
        {error}
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full w-full bg-white font-mono overflow-hidden">
      {/* Sub-header */}
      <div className="bg-[#f4f4f5] border-b border-zinc-300 px-3 py-1 text-[10px] font-mono text-zinc-700 flex gap-6 select-none">
        <span className="font-bold">{reportTitle}</span>
        <span className="ml-auto">
          {asOn ? `As on ${fmtDate(asOn)}` : `${fmtDate(fromDate)} to ${fmtDate(toDate)}`}
        </span>
      </div>

      {/* Summary Bar */}
      <div className="bg-[#fafafa] border-b border-zinc-200 px-3 py-1.5 text-[10px] font-mono flex gap-8 select-none text-zinc-600">
        <span>
          <span className="font-bold text-zinc-800">Total Principal:</span> {fmtTotal(totalPrincipal)}
        </span>
        <span>
          <span className="font-bold text-zinc-800">Total Interest:</span> {fmtTotal(totalInterest)}
        </span>
        <span className="text-zinc-400">| Press [Enter] to Expand/Collapse | Press [D] to Drill Down (Bill-wise)</span>
      </div>

      {/* Main Table */}
      <div className="flex-1 overflow-y-auto">
        <table className="w-full border-collapse text-[11px] font-mono">
          <thead className="sticky top-0 bg-[#f4f4f5] border-b border-zinc-300 z-10 select-none">
            <tr>
              <th className="px-3 py-1.5 text-left font-bold">Ledger / Particulars</th>
              <th className="px-3 py-1.5 text-right font-bold w-[25%]">Principal Balance</th>
              <th className="px-3 py-1.5 text-right font-bold w-[25%]">Interest Amount</th>
            </tr>
          </thead>
          <tbody>
            {grouped.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-4 py-8 text-center text-zinc-400 italic">
                  No interest transactions found.
                </td>
              </tr>
            ) : (
              grouped.map((g, idx) => {
                const isFocused = focusedIdx === idx;
                const isExpanded = expandedIds.has(g.ledger_id);
                return (
                  <React.Fragment key={g.ledger_id}>
                    {/* Parent Ledger Row */}
                    <tr
                      className={`border-b border-zinc-100 cursor-pointer select-none transition-colors ${
                        isFocused ? "bg-[#e4e4e7] text-zinc-950 font-bold" : "hover:bg-zinc-50 text-zinc-800"
                      }`}
                      onClick={() => {
                        setFocused(idx);
                        toggleExpand(g.ledger_id);
                      }}
                      onDoubleClick={() => {
                        navigate(
                          `/reports/accounts/interest-calculation-bill-wise?ledger_id=${g.ledger_id}&ledger_name=${encodeURIComponent(g.name)}`
                        );
                      }}
                    >
                      <td className="px-3 py-1.5 flex items-center gap-1.5">
                        <span className="text-[9px] text-zinc-400 w-3 text-center">
                          {isExpanded ? "▼" : "▶"}
                        </span>
                        <span>{g.name}</span>
                      </td>
                      <td className="px-3 py-1.5 text-right font-semibold">{fmt(g.total_principal)}</td>
                      <td className="px-3 py-1.5 text-right font-bold text-zinc-800">{fmt(g.total_interest)}</td>
                    </tr>

                    {/* Expandable Bill Rows */}
                    {isExpanded &&
                      g.bills.map((bill, bIdx) => (
                        <tr
                          key={bIdx}
                          className="bg-zinc-50/50 border-b border-zinc-100 text-zinc-600 select-none hover:bg-zinc-100/50"
                        >
                          <td className="pl-8 pr-3 py-1 text-[10.5px]">
                            <div className="flex flex-col sm:flex-row sm:gap-4">
                              <span className="font-semibold text-zinc-700">{bill.bill_ref}</span>
                              <span className="text-zinc-400">
                                (Due: {fmtDate(bill.bill_due_date)} | {bill.interest_rate}% {bill.interest_style})
                              </span>
                            </div>
                          </td>
                          <td className="px-3 py-1 text-right text-[10.5px] font-medium text-zinc-700">
                            {fmt(bill.total_pending)}
                          </td>
                          <td className="px-3 py-1 text-right text-[10.5px] font-bold text-zinc-700">
                            <div className="flex justify-end items-center gap-3">
                              <span className="text-[9.5px] font-normal text-zinc-400">{bill.days} days</span>
                              <span>{fmt(bill.interest_amount)}</span>
                            </div>
                          </td>
                        </tr>
                      ))}
                  </React.Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Footer Total */}
      <div className="border-t-2 border-double border-zinc-400 bg-[#f4f4f5] px-3 py-1.5 flex font-mono text-[11px] font-bold text-zinc-900 select-none">
        <span className="flex-1">Total</span>
        <span className="w-[25%] text-right pr-3">{fmtTotal(totalPrincipal)}</span>
        <span className="w-[25%] text-right pr-3 text-zinc-800">{fmtTotal(totalInterest)}</span>
      </div>
    </div>
  );
}
