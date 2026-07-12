import * as React from 'react';
import { useNavigate } from 'react-router-dom';

/* ── Shared group-wise Interest Calculation table ──────────────────────
   Used by the Group Interest Calculations report. Matches TallyPrime's layout:
   Particulars | Closing Balance | Interest, one row per party ledger. Drilling
   a party (Enter / click) opens that ledger's Interest Calculation.             */

const fmtDate = (d: string) => {
  if (!d) return '';
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return d;
  return `${dt.getDate()}-${dt.toLocaleString('en-IN', { month: 'short' })}-${String(dt.getFullYear()).slice(-2)}`;
};
const fmt = (v: number) =>
  new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(
    Math.abs(v),
  );

export interface InterestSegment {
  amount: number;
  rate: number;
  from: string;
  to: string;
  days: number;
  interest: number;
}

export interface BillLine {
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

/* Bold black/white marker for bills the server flagged as lacking a due date */
export function MissingDueDateMark() {
  return (
    <span className="ml-1.5 font-bold text-black border border-gray-200 px-1 text-[9.5px] align-middle">
      (no due date)
    </span>
  );
}

/* Inline segment breakdown row — one line per rate segment, plus a bold total.
   Shared by all interest report layouts; colSpan matches the host table. */
export function SegmentBreakdownRow({
  segments,
  colSpan,
}: {
  segments: InterestSegment[];
  colSpan: number;
}) {
  const totInterest = segments.reduce((s, x) => s + (Number(x.interest) || 0), 0);
  return (
    <tr className="border-b border-gray-200 bg-white select-none">
      <td colSpan={colSpan} className="pl-12 pr-3 py-1.5">
        <table className="min-w-[70%] border border-gray-200 border-collapse text-[10px] font-mono">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="px-2 py-0.5 text-left font-bold">From</th>
              <th className="px-2 py-0.5 text-left font-bold">To</th>
              <th className="px-2 py-0.5 text-right font-bold">Days</th>
              <th className="px-2 py-0.5 text-right font-bold">Principal</th>
              <th className="px-2 py-0.5 text-right font-bold">Rate %</th>
              <th className="px-2 py-0.5 text-right font-bold">Interest</th>
            </tr>
          </thead>
          <tbody>
            {segments.map((s, i) => (
              <tr key={i} className="border-b border-gray-200 text-black">
                <td className="px-2 py-0.5">{fmtDate(s.from)}</td>
                <td className="px-2 py-0.5">{fmtDate(s.to)}</td>
                <td className="px-2 py-0.5 text-right">{Number(s.days) || 0}</td>
                <td className="px-2 py-0.5 text-right">{fmt(Number(s.amount) || 0)}</td>
                <td className="px-2 py-0.5 text-right">{Number(s.rate) || 0}</td>
                <td className="px-2 py-0.5 text-right">{fmt(Number(s.interest) || 0)}</td>
              </tr>
            ))}
            <tr className="font-bold text-black border-t border-gray-200">
              <td className="px-2 py-0.5" colSpan={5}>
                Total
              </td>
              <td className="px-2 py-0.5 text-right">{fmt(totInterest)}</td>
            </tr>
          </tbody>
        </table>
      </td>
    </tr>
  );
}
export interface GroupedLedger {
  ledger_id: number;
  name: string;
  total_principal: number;
  total_interest: number;
  bills: BillLine[];
}

// Collapse the server's per-bill rows into per-ledger groups (shared by all three
// group-wise interest reports: Receivable, Payable, Groups).
export function groupByLedger(rows: any[]): GroupedLedger[] {
  const map = new Map<number, GroupedLedger>();
  (rows || []).forEach((r) => {
    if (!map.has(r.ledger_id)) {
      map.set(r.ledger_id, {
        ledger_id: r.ledger_id,
        name: r.party_ledger,
        total_principal: 0,
        total_interest: 0,
        bills: [],
      });
    }
    const g = map.get(r.ledger_id)!;
    g.total_principal += Number(r.total_pending) || 0;
    g.total_interest += Number(r.interest_amount) || 0;
    g.bills.push({
      bill_ref: r.bill_ref,
      bill_due_date: r.bill_due_date,
      total_pending: Number(r.total_pending) || 0,
      interest_rate: Number(r.interest_rate) || 0,
      interest_style: r.interest_style || '',
      days: Number(r.days) || 0,
      interest_amount: Number(r.interest_amount) || 0,
      segments: Array.isArray(r.segments) ? r.segments : [],
      missing_due_date: r.missing_due_date === true,
    });
  });
  return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
}

interface Props {
  title: string; // "Interest Receivable" / group name
  groupName: string; // "Sundry Debtors" etc — shown in the header block
  drcr: 'Dr' | 'Cr'; // natural side of the group (debtors=Dr, creditors=Cr)
  fromDate?: string;
  toDate?: string;
  groups: GroupedLedger[];
  totalPrincipal: number;
  totalInterest: number;
  onEscape: () => void; // Esc / Backspace — parent decides (back to picker vs -1)
}

// A group's natural side is Dr for debtors, Cr for creditors; a row whose signed
// amount runs opposite (e.g. an advance) flips to the other side.
const sideOf = (v: number, groupDrCr: 'Dr' | 'Cr'): 'Dr' | 'Cr' => {
  const natural = v >= 0;
  if (groupDrCr === 'Dr') return natural ? 'Dr' : 'Cr';
  return natural ? 'Cr' : 'Dr';
};
const withSide = (v: number, groupDrCr: 'Dr' | 'Cr') =>
  v === 0 ? '' : `${fmt(v)} ${sideOf(v, groupDrCr)}`;

export default function InterestGroupTable({
  title,
  groupName,
  drcr,
  fromDate,
  toDate,
  groups,
  totalPrincipal,
  totalInterest,
  onEscape,
}: Props) {
  const navigate = useNavigate();
  const [focusedIdx, setFocused] = React.useState(0);

  // Drill a party ledger → its Ledger Interest Calculation, carrying the period.
  const drill = React.useCallback(
    (g: GroupedLedger) => {
      const qs = new URLSearchParams({ ledger_id: String(g.ledger_id), ledger_name: g.name });
      if (fromDate) qs.set('from_date', fromDate);
      if (toDate) qs.set('to_date', toDate);
      navigate(`/reports/accounts/interest-calculation-ledger-wise?${qs.toString()}`);
    },
    [navigate, fromDate, toDate],
  );

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setFocused((p) => Math.min(groups.length - 1, p + 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setFocused((p) => Math.max(0, p - 1));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const g = groups[focusedIdx];
        if (g) drill(g);
      } else if (e.key === 'Escape' || e.key === 'Backspace') {
        e.preventDefault();
        onEscape();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [groups, focusedIdx, drill, onEscape]);

  return (
    <div className="flex flex-col h-full w-full bg-white font-mono overflow-hidden">
      {/* Sub-header — report title (left) + group / period block (right) */}
      <div className="bg-white border-b border-gray-200 px-3 py-1 text-[10px] font-mono text-black flex gap-6 select-none">
        <span className="font-bold">{title}</span>
        <span className="ml-auto text-right">
          <span className="font-bold">{groupName}</span>
          {(fromDate || toDate) && (
            <span className="ml-3">
              {fmtDate(fromDate || '')} to {fmtDate(toDate || '')}
            </span>
          )}
        </span>
      </div>

      {/* Main table */}
      <div className="flex-1 overflow-y-auto">
        <table className="w-full border-collapse text-[11px] font-mono">
          <thead className="sticky top-0 bg-white border-b border-gray-200 z-10 select-none">
            <tr>
              <th className="px-3 py-1.5 text-left font-bold">Particulars</th>
              <th className="px-3 py-1.5 text-right font-bold w-[25%]">Closing Balance</th>
              <th className="px-3 py-1.5 text-right font-bold w-[25%]">Interest</th>
            </tr>
          </thead>
          <tbody>
            {groups.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-4 py-8 text-center text-black italic">
                  No interest transactions found.
                </td>
              </tr>
            ) : (
              groups.map((g, idx) => {
                const isFocused = focusedIdx === idx;
                return (
                  <tr
                    key={g.ledger_id}
                    className={`border-b border-gray-200 cursor-pointer select-none transition-colors ${isFocused ? 'bg-black/[0.06] text-black font-bold' : 'hover:bg-black/[0.03] text-black'}`}
                    onClick={() => {
                      setFocused(idx);
                      drill(g);
                    }}
                    title="Drill down to Ledger Interest Calculation"
                  >
                    <td className="px-3 py-1.5">{g.name}</td>
                    <td className="px-3 py-1.5 text-right font-semibold">
                      {withSide(g.total_principal, drcr)}
                    </td>
                    <td className="px-3 py-1.5 text-right font-bold">
                      {withSide(
                        g.total_interest === 0
                          ? 0
                          : g.total_principal < 0
                            ? -g.total_interest
                            : g.total_interest,
                        drcr,
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Footer grand total */}
      <div className="border-t-2 border-double border-gray-200 bg-white px-3 py-1.5 flex font-mono text-[11px] font-bold text-black select-none">
        <span className="flex-1">Grand Total</span>
        <span className="w-[25%] text-right pr-3">{withSide(totalPrincipal, drcr)}</span>
        <span className="w-[25%] text-right pr-3">
          {withSide(totalPrincipal < 0 ? -totalInterest : totalInterest, drcr)}
        </span>
      </div>
    </div>
  );
}
