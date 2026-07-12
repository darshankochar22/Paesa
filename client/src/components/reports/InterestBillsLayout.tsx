import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { useCompany } from '@/context/CompanyContext';
import { SegmentBreakdownRow, MissingDueDateMark } from './InterestGroupTable';
import type { InterestSegment } from './InterestGroupTable';

/* ── Formatters ────────────────────────────────────────────────────── */
const fmtDate = (d: string) => {
  if (!d) return '';
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return d;
  return `${dt.getDate()}-${dt.toLocaleString('en-IN', { month: 'short' })}-${String(dt.getFullYear()).slice(-2)}`;
};

const fmt = (v: number) =>
  v === 0
    ? '0.00'
    : new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(
        Math.abs(v),
      );

const fmtTotal = (v: number) =>
  new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(
    Math.abs(v),
  );

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
  segments?: InterestSegment[];
  missing_due_date?: boolean;
}

interface GroupedLedger {
  ledger_id: number;
  name: string;
  total_principal: number;
  total_interest: number;
  bills: BillRow[];
}

interface InterestBillsLayoutProps {
  mode: 'receivable' | 'payable';
  fromDate?: string;
  toDate?: string;
}

export default function InterestBillsLayout({
  mode,
  fromDate: fromProp,
  toDate: toProp,
}: InterestBillsLayoutProps) {
  const navigate = useNavigate();
  const { selectedCompany, activeFY } = useCompany();

  const [grouped, setGrouped] = React.useState<GroupedLedger[]>([]);
  const [totalPrincipal, setTotalPrincipal] = React.useState(0);
  const [totalInterest, setTotalInterest] = React.useState(0);
  const [asOn, setAsOn] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Table navigation
  const [focusedIdx, setFocused] = React.useState(0);
  const [expandedIds, setExpanded] = React.useState<Set<number>>(new Set());
  const [expandedBills, setExpandedBills] = React.useState<Set<string>>(new Set());

  const toggleBill = (key: string) => {
    setExpandedBills((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const fromDate = fromProp || activeFY?.start_date || '';
  const toDate = toProp || activeFY?.end_date || '';
  const cid = selectedCompany?.company_id;
  const fyid = activeFY?.fy_id;

  const reportTitle = mode === 'receivable' ? 'Interest Receivable' : 'Interest Payable';

  /* ── Load data (re-fetches when the F2 period changes) ──────────── */
  React.useEffect(() => {
    if (!cid || !fyid) return;
    setLoading(true);
    setError(null);

    const dateParams = { from_date: fromDate || undefined, to_date: toDate || undefined };
    const apiCall =
      mode === 'receivable'
        ? (window as any).api.report.interestReceivable(cid, fyid, dateParams)
        : (window as any).api.report.interestPayable(cid, fyid, dateParams);

    apiCall
      .then((res: any) => {
        if (res?.success) {
          const rawRows: BillRow[] = res.rows || [];
          setTotalPrincipal(res.total_principal || 0);
          setTotalInterest(res.total_interest || 0);
          setAsOn(res.to_date || '');

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
            a.name.localeCompare(b.name),
          );
          setGrouped(sortedGroups);
        } else {
          setError(res?.error || 'Failed to load report data.');
        }
      })
      .catch((err: any) => {
        setError(err.message || 'An error occurred.');
      })
      .finally(() => {
        setLoading(false);
      });
  }, [mode, cid, fyid, fromDate, toDate]);

  /* ── Keyboard navigation ────────────────────────────────────────── */
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (loading || error || grouped.length === 0) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setFocused((p) => Math.min(grouped.length - 1, p + 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setFocused((p) => Math.max(0, p - 1));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const active = grouped[focusedIdx];
        if (active) {
          toggleExpand(active.ledger_id);
        }
      } else if (e.key === 'Escape' || e.key === 'Backspace') {
        e.preventDefault();
        navigate(-1);
      } else if (e.key === 'd' || e.key === 'D') {
        // Drill down → the party's Ledger Interest Calculation
        const active = grouped[focusedIdx];
        if (active) {
          const qs = new URLSearchParams({
            ledger_id: String(active.ledger_id),
            ledger_name: active.name,
          });
          if (fromDate) qs.set('from_date', fromDate);
          if (toDate) qs.set('to_date', toDate);
          navigate(`/reports/accounts/interest-calculation-ledger-wise?${qs.toString()}`);
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [grouped, focusedIdx, loading, error, navigate, fromDate, toDate]);

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
      <div className="flex-1 flex items-center justify-center text-black font-mono text-xs">
        Loading {reportTitle}...
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center text-black font-mono text-xs px-8 text-center">
        {error}
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full w-full bg-white font-mono overflow-hidden">
      {/* Sub-header */}
      <div className="bg-white border-b border-gray-200 px-3 py-1 text-[10px] font-mono text-black flex gap-6 select-none">
        <span className="font-bold">{reportTitle}</span>
        <span className="ml-auto">
          {asOn ? `As on ${fmtDate(asOn)}` : `${fmtDate(fromDate)} to ${fmtDate(toDate)}`}
        </span>
      </div>

      {/* Summary Bar */}
      <div className="bg-white border-b border-gray-200 px-3 py-1.5 text-[10px] font-mono flex gap-8 select-none text-black">
        <span>
          <span className="font-bold text-black">Total Principal:</span> {fmtTotal(totalPrincipal)}
        </span>
        <span>
          <span className="font-bold text-black">Total Interest:</span> {fmtTotal(totalInterest)}
        </span>
        <span className="text-black">
          | Press [Enter] to Expand/Collapse | Press [D] to Drill Down (Bill-wise)
        </span>
      </div>

      {/* Main Table */}
      <div className="flex-1 overflow-y-auto">
        <table className="w-full border-collapse text-[11px] font-mono">
          <thead className="sticky top-0 bg-white border-b border-gray-200 z-10 select-none">
            <tr>
              <th className="px-3 py-1.5 text-left font-bold">Ledger / Particulars</th>
              <th className="px-3 py-1.5 text-right font-bold w-[25%]">Principal Balance</th>
              <th className="px-3 py-1.5 text-right font-bold w-[25%]">Interest Amount</th>
            </tr>
          </thead>
          <tbody>
            {grouped.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-4 py-8 text-center text-black italic">
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
                      className={`border-b border-gray-200 cursor-pointer select-none transition-colors ${
                        isFocused
                          ? 'bg-black/[0.06] text-black font-bold'
                          : 'hover:bg-black/[0.03] text-black'
                      }`}
                      onClick={() => {
                        setFocused(idx);
                        toggleExpand(g.ledger_id);
                      }}
                      onDoubleClick={() => {
                        const qs = new URLSearchParams({
                          ledger_id: String(g.ledger_id),
                          ledger_name: g.name,
                        });
                        if (fromDate) qs.set('from_date', fromDate);
                        if (toDate) qs.set('to_date', toDate);
                        navigate(
                          `/reports/accounts/interest-calculation-ledger-wise?${qs.toString()}`,
                        );
                      }}
                    >
                      <td className="px-3 py-1.5 flex items-center gap-1.5">
                        <span className="text-[9px] text-black w-3 text-center">
                          {isExpanded ? '▼' : '▶'}
                        </span>
                        <span>{g.name}</span>
                      </td>
                      <td className="px-3 py-1.5 text-right font-semibold">
                        {fmt(g.total_principal)}
                      </td>
                      <td className="px-3 py-1.5 text-right font-bold text-black">
                        {fmt(g.total_interest)}
                      </td>
                    </tr>

                    {/* Expandable Bill Rows — click a bill to show its segment breakdown */}
                    {isExpanded &&
                      g.bills.map((bill, bIdx) => {
                        const billKey = `${g.ledger_id}:${bIdx}`;
                        const hasSegments = (bill.segments?.length ?? 0) > 0;
                        const billOpen = expandedBills.has(billKey);
                        return (
                          <React.Fragment key={bIdx}>
                            <tr
                              className={`bg-white border-b border-gray-200 text-black select-none hover:bg-black/[0.03] ${hasSegments ? 'cursor-pointer' : ''}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                if (hasSegments) toggleBill(billKey);
                              }}
                            >
                              <td className="pl-8 pr-3 py-1 text-[10.5px]">
                                <div className="flex flex-col sm:flex-row sm:gap-4 sm:items-center">
                                  <span className="font-semibold text-black">
                                    {hasSegments && (
                                      <span className="text-[8px] text-black mr-1">
                                        {billOpen ? '▼' : '▶'}
                                      </span>
                                    )}
                                    {bill.bill_ref}
                                    {bill.missing_due_date && <MissingDueDateMark />}
                                  </span>
                                  <span className="text-black">
                                    (Due: {fmtDate(bill.bill_due_date)} | {bill.interest_rate}%{' '}
                                    {bill.interest_style})
                                  </span>
                                </div>
                              </td>
                              <td className="px-3 py-1 text-right text-[10.5px] font-medium text-black">
                                {fmt(bill.total_pending)}
                              </td>
                              <td className="px-3 py-1 text-right text-[10.5px] font-bold text-black">
                                <div className="flex justify-end items-center gap-3">
                                  <span className="text-[9.5px] font-normal text-black">
                                    {bill.days} days
                                  </span>
                                  <span>{fmt(bill.interest_amount)}</span>
                                </div>
                              </td>
                            </tr>
                            {billOpen && hasSegments && (
                              <SegmentBreakdownRow segments={bill.segments!} colSpan={3} />
                            )}
                          </React.Fragment>
                        );
                      })}
                  </React.Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Footer Total */}
      <div className="border-t-2 border-double border-gray-200 bg-white px-3 py-1.5 flex font-mono text-[11px] font-bold text-black select-none">
        <span className="flex-1">Total</span>
        <span className="w-[25%] text-right pr-3">{fmtTotal(totalPrincipal)}</span>
        <span className="w-[25%] text-right pr-3 text-black">{fmtTotal(totalInterest)}</span>
      </div>
    </div>
  );
}
