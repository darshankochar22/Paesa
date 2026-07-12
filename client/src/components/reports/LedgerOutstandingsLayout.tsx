import * as React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useCompany } from '@/context/CompanyContext';
import { filterPartyLedgers } from '@/lib/outstandingParties';
import { OutstandingsRightPanel } from './OutstandingsRightPanel';

/* ── Formatters ────────────────────────────────────────────────────── */
const fmtDate = (d: string) => {
  if (!d) return '';
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return d;
  return `${dt.getDate()}-${dt.toLocaleString('en-IN', { month: 'short' })}-${String(dt.getFullYear()).slice(-2)}`;
};
const fmt = (v: number) =>
  v === 0
    ? ''
    : new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(
        Math.abs(v),
      );
// Signed amount with a Dr / Cr suffix (Dr = positive, Cr = negative), Tally-style.
const fmtSigned = (v: number) => (v === 0 ? '' : `${fmt(v)} ${v >= 0 ? 'Dr' : 'Cr'}`);

// "10 nos" — quantity with its unit symbol.
const fmtQty = (q: number, unit: string) => {
  if (!q) return '';
  const n = q.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 3 });
  return unit ? `${n} ${unit}` : n;
};
// "1,410.00/nos" — rate per unit.
const fmtRate = (r: number, unit: string) => {
  if (!r) return '';
  const n = new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Math.abs(r));
  return unit ? `${n}/${unit}` : n;
};

/* ── Types ─────────────────────────────────────────────────────────── */
interface LedgerMeta {
  ledger_id: number;
  name: string;
  group_name?: string;
}
interface BillRow {
  bill: string;
  bill_date: string;
  due_date: string;
  credit_period: string;
  overdue_days: number;
  opening_amount: number; // signed: Dr = +, Cr = -
  pending_amount: number; // signed
}
interface OnAccount {
  date: string;
  amount: number;
}
interface SubTotal {
  opening: number;
  pending: number;
}
interface StockItemLine {
  item_name: string;
  quantity: number;
  rate: number;
  unit_symbol: string;
}
interface BillVoucherRow {
  voucher_id: number;
  date: string;
  voucher_type: string;
  voucher_number: string | number;
  bill_type: string;
  amount: number;
  entry_type: 'Dr' | 'Cr';
  stock_items: StockItemLine[];
}

/* ── Main Component ─────────────────────────────────────────────────── */
export default function LedgerOutstandingsLayout() {
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

  /* Drill-down state */
  const [rows, setRows] = React.useState<BillRow[]>([]);
  const [subTotal, setSubTotal] = React.useState<SubTotal>({ opening: 0, pending: 0 });
  const [onAccount, setOnAccount] = React.useState<OnAccount | null>(null);
  const [as_on, setAsOn] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [focusedIdx, setFocused] = React.useState(0);

  /* Inline expansion: which bill is open + its fetched vouchers (cached by bill name). */
  const [expandedBill, setExpandedBill] = React.useState<string | null>(null);
  const [voucherCache, setVoucherCache] = React.useState<Record<string, BillVoucherRow[]>>({});
  const [loadingBill, setLoadingBill] = React.useState<string | null>(null);

  const fromDate = activeFY?.start_date || '';
  const toDate = activeFY?.end_date || '';
  const cid = selectedCompany?.company_id;
  const fyid = activeFY?.fy_id;

  /* ── Load ledger picker ─────────────────────────────────────────── */
  React.useEffect(() => {
    if (!cid || ledgerId) return;
    // Restrict the picker to Sundry Debtors / Sundry Creditors parties (incl. sub-groups).
    Promise.all([
      (window as any).api.ledger.getAll(cid),
      (window as any).api.group.getAll(cid),
    ]).then(([ledRes, grpRes]: any[]) => {
      const rawList = Array.isArray(ledRes) ? ledRes : (ledRes?.ledgers ?? ledRes?.data ?? []);
      const groups = grpRes?.groups ?? (Array.isArray(grpRes) ? grpRes : []);
      const list: LedgerMeta[] = filterPartyLedgers(rawList, groups)
        .map((l: any) => ({ ledger_id: l.ledger_id, name: l.name, group_name: l.group_name || '' }))
        .sort((a: LedgerMeta, b: LedgerMeta) => a.name.localeCompare(b.name));
      setLedgers(list);
    });
  }, [cid, ledgerId]);

  /* ── Load bill data once ledger selected ─────────────────────────── */
  React.useEffect(() => {
    if (!ledgerId || !cid || !fyid) return;
    setLoading(true);
    setError(null);
    setExpandedBill(null);
    setVoucherCache({});
    (window as any).api.report
      .ledgerOutstandings(cid, fyid, ledgerId)
      .then((res: any) => {
        if (res?.success) {
          setRows(res.rows || []);
          setSubTotal(res.sub_total || { opening: 0, pending: 0 });
          setOnAccount(res.on_account || null);
          setAsOn(res.as_on || '');
        } else {
          setError(res?.error || 'Failed to load.');
        }
      })
      .catch((e: any) => setError(e.message))
      .finally(() => setLoading(false));
  }, [ledgerId, cid, fyid]);

  /* ── Toggle a bill open/closed; lazily fetch its vouchers the first time ─── */
  const toggleExpand = React.useCallback(
    (row: BillRow) => {
      if (!cid || !fyid || !ledgerId) return;
      setExpandedBill((prev) => (prev === row.bill ? null : row.bill));
      if (voucherCache[row.bill] || !row.bill) return;
      setLoadingBill(row.bill);
      (window as any).api.report
        .billVouchers(cid, fyid, ledgerId, row.bill)
        .then((res: any) => {
          if (res?.success) setVoucherCache((prev) => ({ ...prev, [row.bill]: res.rows || [] }));
        })
        .finally(() => setLoadingBill(null));
    },
    [cid, fyid, ledgerId, voucherCache],
  );

  /* ── Keyboard for picker ──────────────────────────────────────────── */
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

  /* ── Keyboard for drill-down table ───────────────────────────────── */
  React.useEffect(() => {
    if (!ledgerId) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setFocused((p) => Math.min(rows.length - 1, p + 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setFocused((p) => Math.max(0, p - 1));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (rows[focusedIdx]) toggleExpand(rows[focusedIdx]);
      } else if (e.key === 'Escape' || e.key === 'Backspace') {
        e.preventDefault();
        setLedgerId(null);
        setLedgerName('');
        setRows([]);
        setFocused(0);
        setExpandedBill(null);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [ledgerId, rows, focusedIdx, toggleExpand]);

  /* ── Picker view ─────────────────────────────────────────────────── */
  if (!ledgerId) {
    return (
      <div className="flex flex-col h-full w-full bg-white font-mono overflow-hidden">
        <div className="bg-white border-b border-gray-200 px-3 py-1 text-[10px] font-mono text-black flex gap-6 select-none">
          <span className="font-bold">Ledger Outstandings</span>
          <span className="ml-auto">Select a ledger to view pending bills</span>
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
                    className={`border-b border-gray-200 cursor-pointer select-none transition-colors ${pickerFocus === idx ? 'bg-black/[0.06] text-black font-bold' : 'hover:bg-black/[0.03] text-black'}`}
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
  if (loading)
    return (
      <div className="flex-1 flex items-center justify-center text-black font-mono text-xs">
        Loading Ledger Outstandings...
      </div>
    );
  if (error)
    return (
      <div className="flex-1 flex items-center justify-center text-black font-mono text-xs px-8 text-center">
        {error}
      </div>
    );

  /* ── Right-panel actions (Tally F-keys). Wired: F4 Ledger → picker,
   * Change View → Group Outstandings. The rest are greyed for parity. ── */
  const panelItems = [
    { key: 'F2', label: 'Period' },
    { key: 'F3', label: 'Company' },
    {
      key: 'F4',
      label: 'Ledger',
      onClick: () => {
        setLedgerId(null);
        setLedgerName('');
        setRows([]);
        setFocused(0);
        setExpandedBill(null);
      },
    },
    { key: '', label: '', spacer: true },
    { key: 'F6', label: 'Ageing Method' },
    { key: 'F9', label: 'GST Outstandings' },
    { key: '', label: '', spacer: true },
    { key: 'B', label: 'Basis of Values' },
    {
      key: 'H',
      label: 'Change View',
      onClick: () => navigate('/reports/accounts/outstandings-group'),
    },
    { key: 'J', label: 'Exception Reports' },
    { key: 'L', label: 'Save View' },
    { key: '', label: '', spacer: true },
    { key: 'E', label: 'Apply Filter' },
    { key: 'B', label: 'Settle Bills' },
    { key: 'S', label: 'Contact' },
  ];

  /* ── Drill-down view ─────────────────────────────────────────────── */
  return (
    <div className="flex h-full w-full bg-white font-mono overflow-hidden">
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Sub-header */}
        <div className="bg-white border-b border-gray-200 px-3 py-1 text-[10px] font-mono text-black flex gap-6 select-none">
          <span>
            Ledger : <span className="font-bold">{ledgerName}</span>
          </span>
          <span>
            Details of : <span className="font-bold">Pending Bills</span>
          </span>
          <span className="ml-auto">
            {as_on ? `As on ${fmtDate(as_on)}` : `${fmtDate(fromDate)} to ${fmtDate(toDate)}`}
          </span>
        </div>

        <div className="flex-1 overflow-y-auto">
          <table className="w-full border-collapse text-[11px] font-mono">
            <thead className="sticky top-0 bg-white border-b border-gray-200 z-10 select-none">
              <tr>
                <th className="px-3 py-1.5 text-left font-bold w-[10%]">Date</th>
                <th className="px-3 py-1.5 text-left font-bold w-[12%]">Ref. No.</th>
                <th className="px-3 py-1.5 text-left font-bold" />
                <th className="px-3 py-1.5 text-right font-bold w-[15%]">Opening Amount</th>
                <th className="px-3 py-1.5 text-right font-bold w-[15%]">Pending Amount</th>
                <th className="px-3 py-1.5 text-left font-bold w-[11%]">Due on</th>
                <th className="px-3 py-1.5 text-center font-bold w-[9%]">
                  Overdue
                  <br />
                  by days
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && !onAccount ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-black italic">
                    No pending bills for this ledger.
                  </td>
                </tr>
              ) : (
                <>
                  {rows.map((row, idx) => {
                    const isFocused = focusedIdx === idx;
                    const isExpanded = expandedBill === row.bill;
                    const vouchers = voucherCache[row.bill];
                    return (
                      <React.Fragment key={row.bill}>
                        {/* Bill summary row */}
                        <tr
                          className={`border-b border-gray-200 cursor-pointer select-none transition-colors ${isFocused || isExpanded ? 'bg-black/[0.06] text-black font-bold' : 'hover:bg-black/[0.03] text-black'}`}
                          onClick={() => {
                            setFocused(idx);
                            toggleExpand(row);
                          }}
                        >
                          <td className="px-3 py-1.5">{fmtDate(row.bill_date)}</td>
                          <td className="px-3 py-1.5 font-semibold">{row.bill}</td>
                          <td />
                          <td className="px-3 py-1.5 text-right">
                            {fmtSigned(row.opening_amount)}
                          </td>
                          <td className="px-3 py-1.5 text-right">
                            {fmtSigned(row.pending_amount)}
                          </td>
                          <td className="px-3 py-1.5">{fmtDate(row.due_date)}</td>
                          <td
                            className={`px-3 py-1.5 text-center ${row.overdue_days > 0 ? 'text-black font-bold' : ''}`}
                          >
                            {row.overdue_days > 0 ? row.overdue_days : ''}
                          </td>
                        </tr>

                        {/* Inline expanded voucher + stock detail */}
                        {isExpanded && loadingBill === row.bill && (
                          <tr className="bg-white">
                            <td
                              colSpan={7}
                              className="px-3 py-1 pl-8 text-[10px] italic text-black"
                            >
                              Loading vouchers…
                            </td>
                          </tr>
                        )}
                        {isExpanded &&
                          vouchers &&
                          vouchers.length === 0 &&
                          loadingBill !== row.bill && (
                            <tr className="bg-white">
                              <td
                                colSpan={7}
                                className="px-3 py-1 pl-8 text-[10px] italic text-black"
                              >
                                No vouchers for this bill.
                              </td>
                            </tr>
                          )}
                        {isExpanded &&
                          vouchers &&
                          vouchers.map((v) => (
                            <React.Fragment key={v.voucher_id}>
                              {/* Voucher line: date, type, number, amount Dr/Cr */}
                              <tr
                                className="bg-white text-black italic cursor-pointer hover:bg-black/[0.03]"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigate(`/transactions/voucher/${v.voucher_id}`);
                                }}
                              >
                                <td className="px-3 py-0.5 pl-8">{fmtDate(v.date)}</td>
                                <td className="px-3 py-0.5">{v.voucher_type}</td>
                                <td className="px-3 py-0.5">
                                  <div className="flex justify-between pr-3">
                                    <span>{v.voucher_number || ''}</span>
                                    <span>
                                      {fmt(v.amount)} {v.entry_type}
                                    </span>
                                  </div>
                                </td>
                                <td colSpan={4} />
                              </tr>
                              {/* Stock item lines: qty + unit, item name, rate/unit */}
                              {v.stock_items.map((s, si) => (
                                <tr
                                  key={`${v.voucher_id}-${si}`}
                                  className="bg-white text-black font-semibold"
                                >
                                  <td className="px-3 py-0.5 pl-8">
                                    {fmtQty(s.quantity, s.unit_symbol)}
                                  </td>
                                  <td className="px-3 py-0.5">{s.item_name}</td>
                                  <td className="px-3 py-0.5 text-right pr-3">
                                    {fmtRate(s.rate, s.unit_symbol)}
                                  </td>
                                  <td colSpan={4} />
                                </tr>
                              ))}
                            </React.Fragment>
                          ))}
                      </React.Fragment>
                    );
                  })}

                  {/* Sub Total (of the bills above) */}
                  {rows.length > 0 && (
                    <tr className="border-t border-gray-200 font-bold text-black select-none">
                      <td />
                      <td />
                      <td className="px-3 py-1.5">Sub Total</td>
                      <td className="px-3 py-1.5 text-right">{fmtSigned(subTotal.opening)}</td>
                      <td className="px-3 py-1.5 text-right">{fmtSigned(subTotal.pending)}</td>
                      <td />
                      <td />
                    </tr>
                  )}

                  {/* On Account — amounts not allocated to any bill */}
                  {onAccount && (
                    <tr className="font-bold text-black select-none">
                      <td className="px-3 py-1.5">{fmtDate(onAccount.date)}</td>
                      <td />
                      <td className="px-3 py-1.5">On Account</td>
                      <td />
                      <td className="px-3 py-1.5 text-right">{fmtSigned(onAccount.amount)}</td>
                      <td />
                      <td />
                    </tr>
                  )}
                </>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <OutstandingsRightPanel items={panelItems} />
    </div>
  );
}
