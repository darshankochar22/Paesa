import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { useCompany } from '@/context/CompanyContext';

/* ── Types ─────────────────────────────────────────────────────────── */
interface BillRow {
  bill_id: number;
  ledger_id: number;
  bill_name: string;
  date: string;
  ref_no: string;
  party_name: string;
  pending_amount: number;
  due_date: string;
  credit_period: string;
  overdue_days: number;
  ageing: string;
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

type AgeingKey = '0-30' | '31-60' | '61-90' | '90+';
type AgeingTotals = Record<AgeingKey, number>;

interface Props {
  mode: 'receivable' | 'payable';
}

/* ── Formatters ─────────────────────────────────────────────────────── */
const fmtDate = (d: string) => {
  if (!d) return '';
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return d;
  const day = dt.getDate();
  const mon = dt.toLocaleString('en-IN', { month: 'short' });
  const yr = String(dt.getFullYear()).slice(-2);
  return `${day}-${mon}-${yr}`;
};

const fmt = (v: number) =>
  v === 0
    ? ''
    : new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(
        Math.abs(v),
      );

const fmtTotal = (v: number) =>
  new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(
    Math.abs(v),
  );

// "10 nos", "30 P" — quantity with its unit symbol.
const fmtQty = (q: number, unit: string) => {
  if (!q) return '';
  const n = q.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 3 });
  return unit ? `${n} ${unit}` : n;
};

// "10.00/nos", "50,000.00/nos" — rate per unit.
const fmtRate = (r: number, unit: string) => {
  if (!r) return '';
  const n = new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Math.abs(r));
  return unit ? `${n}/${unit}` : n;
};

const BUCKETS: AgeingKey[] = ['0-30', '31-60', '61-90', '90+'];

/* ── Component ─────────────────────────────────────────────────────── */
export default function BillsLayout({ mode }: Props) {
  const navigate = useNavigate();
  const { selectedCompany, activeFY } = useCompany();

  const [rows, setRows] = React.useState<BillRow[]>([]);
  const [bucketTotals, setBuckets] = React.useState<AgeingTotals>({
    '0-30': 0,
    '31-60': 0,
    '61-90': 0,
    '90+': 0,
  });
  const [as_on, setAsOn] = React.useState('');
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [focusedIndex, setFocusedIndex] = React.useState(0);

  // Inline expansion: which bill row is expanded + its fetched vouchers (cached per bill).
  const [expandedId, setExpandedId] = React.useState<number | null>(null);
  const [voucherCache, setVoucherCache] = React.useState<Record<number, BillVoucherRow[]>>({});
  const [loadingId, setLoadingId] = React.useState<number | null>(null);

  const companyId = selectedCompany?.company_id;
  const fyId = activeFY?.fy_id;
  const fromDate = activeFY?.start_date || '';
  const toDate = activeFY?.end_date || '';

  React.useEffect(() => {
    if (!companyId || !fyId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setExpandedId(null);
    setVoucherCache({});
    const method = mode === 'receivable' ? 'billsReceivable' : 'billsPayable';
    (window as any).api.report[method](companyId, fyId)
      .then((res: any) => {
        if (res?.success) {
          const mapped: BillRow[] = (res.rows || []).map((r: any, i: number) => ({
            bill_id: i,
            ledger_id: Number(r.ledger_id ?? 0),
            bill_name: String(r.bill || r.ref_no || ''),
            date: r.bill_date || r.date || '',
            ref_no: String(r.bill || r.ref_no || ''),
            party_name: r.party || r.party_name || '',
            pending_amount: Number(r.balance ?? r.pending_amount ?? 0),
            due_date: r.due_date || '',
            credit_period: String(r.credit_period || ''),
            overdue_days: Number(r.overdue_days ?? 0),
            ageing: r.ageing || '',
          }));
          setRows(mapped);
          setBuckets(res.bucketTotals || { '0-30': 0, '31-60': 0, '61-90': 0, '90+': 0 });
          setAsOn(res.as_on || '');
        } else {
          setError(res?.error || 'Failed to load.');
        }
      })
      .catch((e: any) => setError(e.message))
      .finally(() => setLoading(false));
  }, [companyId, fyId, mode]);

  // Toggle a bill row open/closed; lazily fetch its vouchers the first time.
  const toggleExpand = React.useCallback(
    (row: BillRow) => {
      if (!companyId || !fyId) return;
      setExpandedId((prev) => (prev === row.bill_id ? null : row.bill_id));
      if (voucherCache[row.bill_id] || !row.ledger_id || !row.bill_name) return;
      setLoadingId(row.bill_id);
      window.api.report
        .billVouchers(companyId, fyId, row.ledger_id, row.bill_name)
        .then((res) => {
          if (res.success) setVoucherCache((prev) => ({ ...prev, [row.bill_id]: res.rows || [] }));
        })
        .finally(() => setLoadingId(null));
    },
    [companyId, fyId, voucherCache],
  );

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (document.activeElement?.tagName === 'INPUT') return;
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setFocusedIndex((p) => Math.min(rows.length - 1, p + 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setFocusedIndex((p) => Math.max(0, p - 1));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (rows[focusedIndex]) toggleExpand(rows[focusedIndex]);
      } else if (e.key === 'Escape' || e.key === 'Backspace') {
        e.preventDefault();
        navigate(-1);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [rows, focusedIndex, navigate, toggleExpand]);

  const grandTotal = rows.reduce((s, r) => s + r.pending_amount, 0);
  const title = mode === 'receivable' ? 'Bills Receivable' : 'Bills Payable';

  if (loading)
    return (
      <div className="flex-1 flex items-center justify-center text-black font-mono text-xs">
        Loading {title}...
      </div>
    );
  if (error)
    return (
      <div className="flex-1 flex items-center justify-center text-black font-mono text-xs px-8 text-center">
        {error}
      </div>
    );

  return (
    <div className="flex flex-col h-full w-full bg-white font-mono overflow-hidden">
      {/* Sub-header */}
      <div className="bg-white border-b border-gray-200 px-3 py-1 text-[10px] font-mono text-black flex gap-6 select-none">
        <span>
          Group : <span className="font-bold">♦ All Items</span>
        </span>
        <span>
          Details of : <span className="font-bold">Pending Bills</span>
        </span>
        <span className="ml-auto">
          {as_on ? `As on ${fmtDate(as_on)}` : `${fmtDate(fromDate)} to ${fmtDate(toDate)}`}
        </span>
      </div>

      {/* Ageing summary bar */}
      <div className="bg-white border-b border-gray-200 px-3 py-1 text-[10px] font-mono flex gap-8 select-none text-black">
        {BUCKETS.map((b) => (
          <span key={b}>
            <span className="font-bold text-black">{b} days:</span> {fmt(bucketTotals[b]) || '0.00'}
          </span>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto">
        <table className="w-full border-collapse text-[11px] font-mono">
          <thead className="sticky top-0 bg-white border-b border-gray-200 z-10 select-none">
            <tr>
              <th className="px-3 py-1.5 text-left font-bold w-[11%]">Date</th>
              <th className="px-3 py-1.5 text-left font-bold w-[10%]">Ref. No.</th>
              <th className="px-3 py-1.5 text-left font-bold">Party's Name</th>
              <th className="px-3 py-1.5 text-right font-bold w-[16%]">Pending Amount</th>
              <th className="px-3 py-1.5 text-center font-bold w-[8%]">Credit Days</th>
              <th className="px-3 py-1.5 text-left font-bold w-[11%]">Due On</th>
              <th className="px-3 py-1.5 text-center font-bold w-[9%]">Overdue Days</th>
              <th className="px-3 py-1.5 text-center font-bold w-[7%]">Ageing</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-black italic">
                  No pending bills found.
                </td>
              </tr>
            ) : (
              rows.map((row, idx) => {
                const isFocused = focusedIndex === idx;
                const isExpanded = expandedId === row.bill_id;
                const vouchers = voucherCache[row.bill_id];
                return (
                  <React.Fragment key={row.bill_id}>
                    <tr
                      className={`border-b border-gray-200 cursor-pointer select-none transition-colors ${isFocused || isExpanded ? 'bg-black/[0.06] text-black font-bold' : 'hover:bg-black/[0.03] text-black'}`}
                      onClick={() => {
                        setFocusedIndex(idx);
                        toggleExpand(row);
                      }}
                    >
                      <td className="px-3 py-1.5">{fmtDate(row.date)}</td>
                      <td className="px-3 py-1.5">{row.ref_no}</td>
                      <td className="px-3 py-1.5 font-semibold">{row.party_name}</td>
                      <td className="px-3 py-1.5 text-right">{fmt(row.pending_amount)}</td>
                      <td className="px-3 py-1.5 text-center">{row.credit_period || ''}</td>
                      <td className="px-3 py-1.5">{fmtDate(row.due_date)}</td>
                      <td
                        className={`px-3 py-1.5 text-center ${row.overdue_days > 0 ? 'text-black font-bold' : ''}`}
                      >
                        {row.overdue_days > 0 ? row.overdue_days : ''}
                      </td>
                      <td className="px-3 py-1.5 text-center text-black">{row.ageing}</td>
                    </tr>

                    {/* Inline expanded voucher detail rows */}
                    {isExpanded && loadingId === row.bill_id && (
                      <tr className="bg-white">
                        <td colSpan={8} className="px-3 py-1.5 pl-10 text-[10px] italic text-black">
                          Loading vouchers…
                        </td>
                      </tr>
                    )}
                    {isExpanded &&
                      vouchers &&
                      vouchers.length === 0 &&
                      loadingId !== row.bill_id && (
                        <tr className="bg-white">
                          <td
                            colSpan={8}
                            className="px-3 py-1.5 pl-10 text-[10px] italic text-black"
                          >
                            No vouchers for this bill.
                          </td>
                        </tr>
                      )}
                    {isExpanded &&
                      vouchers &&
                      vouchers.map((v) => (
                        <React.Fragment key={v.voucher_id}>
                          {/* Voucher line: date, voucher type, voucher no, amount Dr/Cr */}
                          <tr
                            className="bg-white text-black italic cursor-pointer hover:bg-black/[0.03]"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/transactions/voucher/${v.voucher_id}`);
                            }}
                          >
                            <td className="px-3 py-0.5 pl-8">{fmtDate(v.date)}</td>
                            <td className="px-3 py-0.5">{v.voucher_type}</td>
                            <td className="px-3 py-0.5">{v.voucher_number || ''}</td>
                            <td className="px-3 py-0.5 text-right">
                              {fmt(v.amount)} {v.entry_type}
                            </td>
                            <td colSpan={4} />
                          </tr>
                          {/* Stock item lines under the voucher: qty + unit, item name, rate/unit */}
                          {v.stock_items.map((s, si) => (
                            <tr
                              key={`${v.voucher_id}-${si}`}
                              className="bg-white text-black font-semibold"
                            >
                              <td className="px-3 py-0.5" />
                              <td className="px-3 py-0.5 pl-8">
                                {fmtQty(s.quantity, s.unit_symbol)}
                              </td>
                              <td className="px-3 py-0.5">{s.item_name}</td>
                              <td className="px-3 py-0.5 text-right">
                                {fmtRate(s.rate, s.unit_symbol)}
                              </td>
                              <td colSpan={4} />
                            </tr>
                          ))}
                        </React.Fragment>
                      ))}
                  </React.Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Grand total footer */}
      <div className="border-t-2 border-double border-gray-200 bg-white px-3 py-1.5 flex font-mono text-[11px] font-bold text-black select-none">
        <span className="flex-[3] pl-[21%]">Grand Total</span>
        <span className="w-[16%] text-right">{fmtTotal(grandTotal)}</span>
        <span className="flex-1" />
      </div>
    </div>
  );
}
