import * as React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useCompany } from '@/context/CompanyContext';
import { MissingDueDateMark } from './InterestGroupTable';
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

const withSide = (v: number, side: 'Dr' | 'Cr') => (v === 0 ? '0.00' : `${fmt(v)} ${side}`);

/* ── Types ─────────────────────────────────────────────────────────── */
interface LedgerMeta {
  ledger_id: number;
  name: string;
  group_name?: string;
}

/* Bill-wise row (party ledgers) — matches TallyPrime's Ledger Interest view */
interface InterestBillRow {
  bill_ref: string;
  bill_date: string;
  bill_due_date: string;
  opening_amount: number;
  total_pending: number;
  interest_rate: number;
  interest_style: string;
  days: number;
  interest_amount: number;
  segments?: InterestSegment[];
  missing_due_date?: boolean;
}

/* Interval row (ledgers set to "On Outstanding Balance") */
interface IntervalRow {
  date_particulars: string;
  vch_type: string;
  vch_no: string;
  balance: number;
  rate: number;
  interest: number;
  days: number;
  start_date: string;
  end_date: string;
}

interface InterestLedgerLayoutProps {
  fromDate?: string;
  toDate?: string;
}

export default function InterestLedgerLayout({
  fromDate: fromProp,
  toDate: toProp,
}: InterestLedgerLayoutProps = {}) {
  const navigate = useNavigate();
  const location = useLocation();
  const { selectedCompany, activeFY } = useCompany();

  /* Read ledger_id from URL search params or router state */
  const [ledgerId, setLedgerId] = React.useState<number | null>(() => {
    const p = new URLSearchParams(location.search);
    const id = p.get('ledger_id');
    return id ? Number(id) : ((location.state as any)?.ledger_id ?? null);
  });
  const [ledgerName, setLedgerName] = React.useState<string>(() => {
    const p = new URLSearchParams(location.search);
    return p.get('ledger_name') || (location.state as any)?.ledger_name || '';
  });

  /* Picker state */
  const [ledgers, setLedgers] = React.useState<LedgerMeta[]>([]);
  const [search, setSearch] = React.useState('');
  const [pickerFocus, setPickerFocus] = React.useState(0);

  /* Detail state */
  const [mode, setMode] = React.useState<'bill-wise' | 'balance'>('bill-wise');
  const [billRows, setBillRows] = React.useState<InterestBillRow[]>([]);
  const [intervalRows, setIntervalRows] = React.useState<IntervalRow[]>([]);
  const [isCreditor, setIsCreditor] = React.useState(false);
  const [openingBalance, setOpeningBalance] = React.useState(0);
  const [totalPrincipal, setTotalPrincipal] = React.useState(0);
  const [totalInterest, setTotalInterest] = React.useState(0);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [focusedIdx, setFocused] = React.useState(0);

  const fromDate = fromProp || activeFY?.start_date || '';
  const toDate = toProp || activeFY?.end_date || '';
  const cid = selectedCompany?.company_id;
  const fyid = activeFY?.fy_id;
  const side: 'Dr' | 'Cr' = isCreditor ? 'Cr' : 'Dr';

  // Drill into the ledger's vouchers (→ Voucher Alteration), carrying the period.
  const drillToVouchers = React.useCallback(() => {
    if (!ledgerId) return;
    const qs = new URLSearchParams({ ledger_id: String(ledgerId) });
    if (fromDate) qs.set('from_date', fromDate);
    if (toDate) qs.set('to_date', toDate);
    navigate(`/reports/accounts/ledger?${qs.toString()}`);
  }, [navigate, ledgerId, fromDate, toDate]);

  /* ── Load ledger list ───────────────────────────────────────────── */
  React.useEffect(() => {
    if (!cid || ledgerId) return;
    (window as any).api.ledger.getAll(cid).then((res: any) => {
      const rawList = Array.isArray(res) ? res : (res?.ledgers ?? res?.data ?? []);
      const list: LedgerMeta[] = rawList
        .map((l: any) => ({ ledger_id: l.ledger_id, name: l.name, group_name: l.group_name || '' }))
        .sort((a: LedgerMeta, b: LedgerMeta) => a.name.localeCompare(b.name));
      setLedgers(list);
    });
  }, [cid, ledgerId]);

  /* ── Load interest for the chosen ledger (re-fetches on F2 period change) ── */
  React.useEffect(() => {
    if (!ledgerId || !cid || !fyid) return;
    setLoading(true);
    setError(null);

    (window as any).api.report
      .ledgerInterest(cid, fyid, {
        ledger_id: ledgerId,
        from_date: fromDate || undefined,
        to_date: toDate || undefined,
      })
      .then((res: any) => {
        if (res?.success) {
          setMode(res.mode === 'balance' ? 'balance' : 'bill-wise');
          setIsCreditor(res.is_creditor === true);
          setOpeningBalance(res.opening_balance || 0);
          setTotalPrincipal(res.total_principal || 0);
          setTotalInterest(res.total_interest || 0);
          if (res.mode === 'balance') {
            setIntervalRows(res.rows || []);
            setBillRows([]);
          } else {
            setBillRows(res.rows || []);
            setIntervalRows([]);
          }
        } else {
          setError(res?.error || 'Failed to load interest calculation.');
        }
      })
      .catch((err: any) => setError(err.message || 'An error occurred.'))
      .finally(() => setLoading(false));
  }, [ledgerId, cid, fyid, fromDate, toDate]);

  /* ── Keyboard for picker ────────────────────────────────────────── */
  const filtered = ledgers.filter((l) => l.name.toLowerCase().includes(search.toLowerCase()));

  React.useEffect(() => {
    if (ledgerId) return;
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === 'INPUT') {
        if (e.key === 'Escape') navigate(-1);
        return;
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setPickerFocus((p) => Math.min(filtered.length - 1, p + 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setPickerFocus((p) => Math.max(0, p - 1));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const l = filtered[pickerFocus];
        if (l) {
          setLedgerId(l.ledger_id);
          setLedgerName(l.name);
        }
      } else if (e.key === 'Escape' || e.key === 'Backspace') {
        e.preventDefault();
        navigate(-1);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [ledgerId, filtered, pickerFocus, navigate]);

  /* ── Keyboard for detail view ───────────────────────────────────── */
  const detailLen = mode === 'balance' ? intervalRows.length : billRows.length;
  React.useEffect(() => {
    if (!ledgerId) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setFocused((p) => Math.min(detailLen - 1, p + 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setFocused((p) => Math.max(0, p - 1));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (detailLen > 0) drillToVouchers();
      } else if (e.key === 'Escape' || e.key === 'Backspace') {
        e.preventDefault();
        setLedgerId(null);
        setLedgerName('');
        setBillRows([]);
        setIntervalRows([]);
        setFocused(0);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [ledgerId, detailLen, drillToVouchers]);

  /* ── Picker View ────────────────────────────────────────────────── */
  if (!ledgerId) {
    return (
      <div className="flex flex-col h-full w-full bg-white font-mono overflow-hidden">
        <div className="bg-white border-b border-gray-200 px-3 py-1 text-[10px] font-mono text-black flex gap-6 select-none">
          <span className="font-bold">Ledger Interest Calculation</span>
          <span className="ml-auto">Select a ledger to view interest calculation</span>
        </div>
        {/* Search */}
        <div className="px-3 py-1.5 border-b border-gray-200 bg-white">
          <input
            autoFocus
            type="text"
            placeholder="Type to search ledger..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPickerFocus(0);
            }}
            className="w-full text-[11px] font-mono border border-gray-200 px-2 py-1 rounded outline-none focus:border-gray-200 bg-white"
          />
        </div>
        <div className="flex-1 overflow-y-auto">
          <table className="w-full border-collapse text-[11px] font-mono">
            <thead className="sticky top-0 bg-white border-b border-gray-200 z-10 select-none">
              <tr>
                <th className="px-3 py-1.5 text-left font-bold">Ledger Name</th>
                <th className="px-3 py-1.5 text-left font-bold w-48">Group</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={2} className="px-4 py-8 text-center text-black italic">
                    No ledgers found.
                  </td>
                </tr>
              ) : (
                filtered.map((l, idx) => (
                  <tr
                    key={l.ledger_id}
                    className={`border-b border-gray-200 cursor-pointer select-none transition-colors ${
                      pickerFocus === idx
                        ? 'bg-black/[0.06] text-black font-bold'
                        : 'hover:bg-black/[0.03] text-black'
                    }`}
                    onClick={() => {
                      setPickerFocus(idx);
                      setLedgerId(l.ledger_id);
                      setLedgerName(l.name);
                    }}
                  >
                    <td className="px-3 py-1.5">{l.name}</td>
                    <td className="px-3 py-1.5 text-black">{l.group_name}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  /* ── Loading / Error states ─────────────────────────────────────── */
  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center text-black font-mono text-xs">
        Loading Ledger Interest Calculation...
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

  /* ── Shared sub-header (Ledger + Period) ────────────────────────── */
  const Header = (
    <div className="bg-white border-b border-gray-200 px-3 py-1 text-[10px] font-mono text-black flex gap-6 select-none">
      <span>
        Ledger: <span className="font-bold">{ledgerName}</span>
      </span>
      <span className="ml-auto">
        <span className="font-bold">
          {fmtDate(fromDate)} to {fmtDate(toDate)}
        </span>
      </span>
    </div>
  );

  /* ── Bill-wise view (party ledgers) — matches the screenshot ────── */
  if (mode === 'bill-wise') {
    return (
      <div className="flex flex-col h-full w-full bg-white font-mono overflow-hidden">
        {Header}

        {/* Main Table */}
        <div className="flex-1 overflow-y-auto">
          <table className="w-full border-collapse text-[11px] font-mono">
            <thead className="sticky top-0 bg-white border-b border-gray-200 z-10 select-none">
              <tr>
                <th className="px-3 py-1.5 text-left font-bold w-[14%]">Date</th>
                <th className="px-3 py-1.5 text-left font-bold">Ref. No.</th>
                <th className="px-3 py-1.5 text-right font-bold w-[20%]">Opening Amount</th>
                <th className="px-3 py-1.5 text-right font-bold w-[20%]">Pending Amount</th>
                <th className="px-3 py-1.5 text-right font-bold w-[16%]">Interest</th>
              </tr>
            </thead>
            <tbody>
              {billRows.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-black italic">
                    No interest-bearing bills found for this ledger.
                  </td>
                </tr>
              ) : (
                billRows.map((row, idx) => {
                  const isFocused = focusedIdx === idx;
                  const segments = row.segments ?? [];
                  return (
                    <React.Fragment key={idx}>
                      {/* Bill summary row */}
                      <tr
                        className={`border-b border-gray-200 cursor-pointer select-none transition-colors ${
                          isFocused
                            ? 'bg-black/[0.06] text-black font-bold'
                            : 'hover:bg-black/[0.03] text-black'
                        }`}
                        onClick={() => {
                          setFocused(idx);
                          drillToVouchers();
                        }}
                        title="Drill down to Ledger Vouchers"
                      >
                        <td className="px-3 py-1.5 font-bold">{fmtDate(row.bill_date)}</td>
                        <td className="px-3 py-1.5">
                          {row.bill_ref}
                          {row.missing_due_date && <MissingDueDateMark />}
                        </td>
                        <td className="px-3 py-1.5 text-right">
                          {withSide(row.opening_amount, side)}
                        </td>
                        <td className="px-3 py-1.5 text-right font-bold">
                          {withSide(row.total_pending, side)}
                        </td>
                        <td className="px-3 py-1.5 text-right font-bold">
                          {withSide(row.interest_amount, side)}
                        </td>
                      </tr>

                      {/* Interest-calc breakdown line(s) — amount · from · to · days · rate · interest */}
                      {segments.map((s, si) => (
                        <tr
                          key={`${idx}-${si}`}
                          className="border-b border-gray-200 text-black select-none"
                        >
                          <td className="px-3 py-1 text-[10px]" />
                          <td className="px-3 py-1 text-[10px]" colSpan={2}>
                            <span className="inline-flex gap-4 italic">
                              <span>{withSide(Number(s.amount) || 0, side)}</span>
                              <span>{fmtDate(s.from)}</span>
                              <span>{fmtDate(s.to)}</span>
                              <span>{Number(s.days) || 0} days</span>
                              <span>{Number(s.rate) || 0} %</span>
                            </span>
                          </td>
                          <td className="px-3 py-1" />
                          <td className="px-3 py-1 text-right text-[10px] italic">
                            {withSide(Number(s.interest) || 0, side)}
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
        <div className="border-t-2 border-double border-gray-200 bg-white px-3 py-1.5 flex font-mono text-[11px] font-bold text-black select-none">
          <span className="flex-1">Grand Total</span>
          <span className="w-[20%] text-right pr-3" />
          <span className="w-[20%] text-right pr-3">{withSide(totalPrincipal, side)}</span>
          <span className="w-[16%] text-right pr-3">{withSide(totalInterest, side)}</span>
        </div>
      </div>
    );
  }

  /* ── Balance view (ledgers set to "On Outstanding Balance") ─────── */
  const balSide = (v: number): 'Dr' | 'Cr' => (v >= 0 ? 'Dr' : 'Cr');
  const finalBalance =
    intervalRows.length > 0 ? intervalRows[intervalRows.length - 1].balance : openingBalance;

  return (
    <div className="flex flex-col h-full w-full bg-white font-mono overflow-hidden">
      {Header}

      {/* Main Table — Balance | From | To | Total Days | Rate % | Interest */}
      <div className="flex-1 overflow-y-auto">
        <table className="w-full border-collapse text-[11px] font-mono">
          <thead className="sticky top-0 bg-white border-b border-gray-200 z-10 select-none">
            <tr>
              <th className="px-3 py-1.5 text-right font-bold w-[20%]">Balance</th>
              <th className="px-3 py-1.5 text-left font-bold w-[15%]">From</th>
              <th className="px-3 py-1.5 text-left font-bold w-[15%]">To</th>
              <th className="px-3 py-1.5 text-right font-bold w-[15%]">Total Days</th>
              <th className="px-3 py-1.5 text-right font-bold w-[12%]">Rate %</th>
              <th className="px-3 py-1.5 text-right font-bold w-[18%]">Interest</th>
            </tr>
          </thead>
          <tbody>
            {intervalRows.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-black italic">
                  No interest intervals found.
                </td>
              </tr>
            ) : (
              intervalRows.map((row, idx) => {
                const isFocused = focusedIdx === idx;
                return (
                  <tr
                    key={idx}
                    className={`border-b border-gray-200 cursor-pointer select-none transition-colors ${
                      isFocused
                        ? 'bg-black/[0.06] text-black font-bold'
                        : 'hover:bg-black/[0.03] text-black'
                    }`}
                    onClick={() => {
                      setFocused(idx);
                      drillToVouchers();
                    }}
                    title="Drill down to Ledger Vouchers"
                  >
                    <td className="px-3 py-1.5 text-right font-bold">
                      {withSide(row.balance, balSide(row.balance))}
                    </td>
                    <td className="px-3 py-1.5">
                      {fmtDate(row.start_date || row.date_particulars)}
                    </td>
                    <td className="px-3 py-1.5">{fmtDate(row.end_date)}</td>
                    <td className="px-3 py-1.5 text-right">{row.days} days</td>
                    <td className="px-3 py-1.5 text-right">{row.rate} %</td>
                    <td className="px-3 py-1.5 text-right font-bold">
                      {row.interest > 0 ? withSide(row.interest, balSide(row.balance)) : ''}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Footer Total */}
      <div className="border-t-2 border-double border-gray-200 bg-white px-3 py-1.5 flex font-mono text-[11px] font-bold text-black select-none">
        <span className="w-[20%] text-right pr-3">
          Closing: {fmt(finalBalance)} {balSide(finalBalance)}
        </span>
        <span className="flex-1 text-left pl-3">Grand Total</span>
        <span className="w-[18%] text-right pr-3">
          {fmtTotal(totalInterest)} {balSide(finalBalance)}
        </span>
      </div>
    </div>
  );
}
