import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { useCompany } from '@/context/CompanyContext';

// Tally shows quantities as "12 Pcs" and reversing (rejection) rows as "(-)2 Pcs".
const fmtQty = (val: number | null | undefined, unit?: string) => {
  const n = Number(val) || 0;
  if (n === 0) return '';
  const abs = Math.abs(n).toLocaleString('en-IN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
  const sign = n < 0 ? '(-)' : '';
  return `${sign}${abs}${unit ? ` ${unit}` : ''}`;
};

const fmtAmt = (val: number | null | undefined) => {
  const n = Number(val) || 0;
  if (n === 0) return '';
  return n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const formatDate = (dateStr?: string | null) => {
  if (!dateStr) return '';
  try {
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: '2-digit',
    });
  } catch {
    return dateStr;
  }
};

const MONTHS_ORDER = [
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
  'January',
  'February',
  'March',
];

interface MonthRow {
  month: string;
  total_vouchers: number;
  cancelled: number;
}
interface VoucherRow {
  voucher_id: number;
  date: string;
  particulars: string;
  voucher_type: string;
  voucher_number: string | number;
  inwards_qty: number;
  outwards_qty: number;
  unit_symbol?: string;
  order_ref?: string;
  order_amount?: number;
  debit?: number;
  credit?: number;
}

interface Props {
  voucherType: string; // e.g. "Stock Journal" | "Physical Stock"
  title: string; // e.g. "Stock Journal Register"
  /** "inventory" → Inwards/Outwards Qty; "order" → Order Ref/Amount; "accounting" → Debit/Credit. */
  variant?: 'inventory' | 'order' | 'accounting';
  /** Overrides the left sub-header (defaults to the voucher type). */
  subtitle?: string;
}

type Level = { step: 'monthly' } | { step: 'vouchers'; month: string };

export default function InventoryVoucherRegister({
  voucherType,
  title,
  variant = 'inventory',
  subtitle,
}: Props) {
  const isOrder = variant === 'order';
  const isAccounting = variant === 'accounting';
  const navigate = useNavigate();
  const { selectedCompany, activeFY } = useCompany();
  const companyId = selectedCompany?.company_id;
  const fyId = activeFY?.fy_id;
  const periodLabel = activeFY ? `${activeFY.start_date} to ${activeFY.end_date}` : '';

  const [level, setLevel] = React.useState<Level>({ step: 'monthly' });

  // ── Level 1: Monthly ─────────────────────────────────────────────────────
  const [months, setMonths] = React.useState<MonthRow[]>([]);
  const [loadingMonths, setLoadingMonths] = React.useState(true);
  const [monthsError, setMonthsError] = React.useState<string | null>(null);
  const [monthIndex, setMonthIndex] = React.useState(0);

  React.useEffect(() => {
    setLevel({ step: 'monthly' });
    if (!companyId || !fyId) {
      setLoadingMonths(false);
      return;
    }
    setLoadingMonths(true);
    setMonthsError(null);
    const monthlyFetcher = isAccounting
      ? (window as any).api.report.statisticsVoucherMonthly(companyId, fyId, voucherType)
      : (window as any).api.report.inventoryRegisterMonthly(companyId, fyId, voucherType);
    monthlyFetcher.then((res: any) => {
      if (res.success) setMonths(res.rows ?? []);
      else setMonthsError(res.error || 'Failed to load register');
      setLoadingMonths(false);
    });
  }, [companyId, fyId, voucherType, isAccounting]);

  // ── Level 2: Vouchers for a month ────────────────────────────────────────
  const [voucherRows, setVoucherRows] = React.useState<VoucherRow[]>([]);
  const [loadingVouchers, setLoadingVouchers] = React.useState(false);
  const [voucherError, setVoucherError] = React.useState<string | null>(null);
  const [voucherIndex, setVoucherIndex] = React.useState(0);

  const monthRange = React.useCallback(
    (monthName: string) => {
      if (!activeFY?.start_date) return { from: undefined, to: undefined };
      const startYear = new Date(activeFY.start_date).getFullYear();
      const idx = MONTHS_ORDER.indexOf(monthName);
      let m = idx + 4,
        y = startYear;
      if (m > 12) {
        m -= 12;
        y = startYear + 1;
      }
      const pad = (n: number) => String(n).padStart(2, '0');
      const from = `${y}-${pad(m)}-01`;
      const lastDay = new Date(y, m, 0).getDate();
      const to = `${y}-${pad(m)}-${pad(lastDay)}`;
      return { from, to };
    },
    [activeFY],
  );

  const loadVouchers = React.useCallback(
    (monthName: string) => {
      if (!companyId || !fyId) return;
      setLevel({ step: 'vouchers', month: monthName });
      setLoadingVouchers(true);
      setVoucherError(null);
      setVoucherIndex(0);
      const { from, to } = monthRange(monthName);
      const fetcher = isAccounting
        ? (window as any).api.report.statisticsVoucherDayList(
            companyId,
            fyId,
            voucherType,
            from,
            to,
          )
        : isOrder
          ? (window as any).api.report.jobWorkOrderVouchers(companyId, fyId, voucherType, from, to)
          : (window as any).api.report.inventoryRegisterVouchers(
              companyId,
              fyId,
              voucherType,
              from,
              to,
            );
      fetcher.then((res: any) => {
        if (res.success) setVoucherRows(res.rows ?? []);
        else setVoucherError(res.error || 'Failed to load vouchers');
        setLoadingVouchers(false);
      });
    },
    [companyId, fyId, voucherType, monthRange, isOrder, isAccounting],
  );

  const backToMonthly = React.useCallback(() => {
    setLevel({ step: 'monthly' });
    setVoucherRows([]);
  }, []);

  // ── Keyboard nav ─────────────────────────────────────────────────────────
  React.useEffect(() => {
    if (level.step !== 'monthly') return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setMonthIndex((p) => Math.min(months.length - 1, p + 1));
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setMonthIndex((p) => Math.max(0, p - 1));
        return;
      }
      if (e.key === 'Enter') {
        e.preventDefault();
        const m = months[monthIndex];
        if (m) loadVouchers(m.month);
        return;
      }
      if (e.key === 'Escape' || e.key === 'Backspace') {
        e.preventDefault();
        navigate(-1);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [level.step, months, monthIndex, loadVouchers, navigate]);

  React.useEffect(() => {
    if (level.step !== 'vouchers') return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setVoucherIndex((p) => Math.min(voucherRows.length - 1, p + 1));
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setVoucherIndex((p) => Math.max(0, p - 1));
        return;
      }
      if (e.key === 'Enter') {
        e.preventDefault();
        const r = voucherRows[voucherIndex];
        if (r?.voucher_id) navigate(`/transactions/voucher/${r.voucher_id}`);
        return;
      }
      if (e.key === 'Escape' || e.key === 'Backspace') {
        e.preventDefault();
        backToMonthly();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [level.step, voucherRows, voucherIndex, navigate, backToMonthly]);

  // ═══════════════════════════════════════════════════════════════════════
  // LEVEL 1 — Monthly register (matches screenshots 2 / 5)
  // ═══════════════════════════════════════════════════════════════════════
  if (level.step === 'monthly') {
    const totalVouchers = months.reduce((s, r) => s + (Number(r.total_vouchers) || 0), 0);
    const totalCancelled = months.reduce((s, r) => s + (Number(r.cancelled) || 0), 0);
    return (
      <div className="flex-1 flex flex-col h-full bg-white select-none text-black font-sans text-[11px]">
        <div className="flex items-center justify-between px-3 py-1.5 bg-white border-b-2 border-gray-200">
          <span className="font-bold text-sm tracking-wide">{title}</span>
          <span className="font-bold text-sm">{selectedCompany?.name || 'Company'}</span>
          <span />
        </div>
        <div className="flex justify-between items-center px-3 py-1.5 bg-white border-b border-gray-200 font-mono">
          <span>{subtitle ?? voucherType}</span>
          <span>{periodLabel}</span>
        </div>

        <div className="flex-1 overflow-y-auto">
          <table className="w-full border-collapse text-[11px] font-mono select-none">
            <thead className="sticky top-0 bg-white border-b border-gray-200 z-10 text-black">
              <tr>
                <th rowSpan={2} className="px-3 py-1 text-left font-bold align-bottom">
                  Particulars
                </th>
                <th
                  colSpan={2}
                  className="px-3 py-0.5 text-center font-bold border-b border-l border-gray-200"
                >
                  Transactions
                </th>
              </tr>
              <tr>
                <th className="px-3 py-1 text-right font-bold w-40 border-l border-gray-200">
                  Total Vouchers
                </th>
                <th className="px-3 py-1 text-right font-bold w-40">(cancelled )</th>
              </tr>
            </thead>
            <tbody>
              {loadingMonths ? (
                <tr>
                  <td colSpan={3} className="px-4 py-8 text-center text-black italic">
                    Loading...
                  </td>
                </tr>
              ) : monthsError ? (
                <tr>
                  <td colSpan={3} className="px-4 py-8 text-center text-black">
                    {monthsError}
                  </td>
                </tr>
              ) : (
                months.map((row, idx) => {
                  const isFocused = idx === monthIndex;
                  return (
                    <tr
                      key={row.month}
                      onClick={() => setMonthIndex(idx)}
                      onDoubleClick={() => loadVouchers(row.month)}
                      className={`border-b border-gray-200 cursor-pointer ${isFocused ? 'bg-black/[0.06] text-black font-bold' : 'hover:bg-black/[0.03] text-black'}`}
                    >
                      <td className="px-3 py-1">{row.month}</td>
                      <td className="px-3 py-1 text-right border-l border-gray-200">
                        {row.total_vouchers > 0 ? row.total_vouchers : ''}
                      </td>
                      <td className="px-3 py-1 text-right text-black">
                        {row.cancelled > 0 ? `(${row.cancelled} )` : ''}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="border-t-2 border-black bg-white px-3 py-1.5 flex font-mono text-[11px] font-bold text-black shrink-0">
          <span className="flex-1">Grand Total</span>
          <span className="w-40 text-right border-l border-gray-200 pr-2">
            {totalVouchers > 0 ? totalVouchers : ''}
          </span>
          <span className="w-40 text-right text-black pr-2">
            {totalCancelled > 0 ? `(${totalCancelled} )` : ''}
          </span>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════
  // LEVEL 2 — Voucher Register (matches screenshots 3 / 6)
  // ═══════════════════════════════════════════════════════════════════════
  const totalIn = voucherRows.reduce((s, r) => s + (Number(r.inwards_qty) || 0), 0);
  const totalOut = voucherRows.reduce((s, r) => s + (Number(r.outwards_qty) || 0), 0);
  const totalAmt = voucherRows.reduce((s, r) => s + (Number(r.order_amount) || 0), 0);
  const totalDrCr = voucherRows.reduce(
    (s, r) => s + (Number(r.debit) || 0) + (Number(r.credit) || 0),
    0,
  );

  return (
    <div className="flex-1 flex flex-col h-full bg-white select-none text-black font-sans text-[11px]">
      <div className="flex items-center justify-between px-3 py-1.5 bg-white border-b-2 border-gray-200">
        <span className="font-bold text-sm tracking-wide">Voucher Register</span>
        <span className="font-bold text-sm">{selectedCompany?.name || 'Company'}</span>
        <span />
      </div>
      <div className="flex justify-between items-center px-3 py-1.5 bg-white border-b border-gray-200 font-mono">
        <span>List of All {voucherType} Vouchers</span>
        <span>{periodLabel}</span>
      </div>

      <div className="flex-1 overflow-y-auto">
        <table className="w-full border-collapse text-[11px] font-mono select-none">
          <thead className="sticky top-0 bg-white border-b border-gray-200 z-10 text-black">
            <tr>
              <th className="px-3 py-1 text-left font-bold w-20">Date</th>
              <th className="px-3 py-1 text-left font-bold">Particulars</th>
              <th className="px-3 py-1 text-left font-bold w-28">Vch Type</th>
              <th className="px-3 py-1 text-right font-bold w-20">Vch No.</th>
              {isAccounting ? (
                <>
                  <th className="px-3 py-1 text-right font-bold w-32 border-l border-gray-200">
                    Debit
                    <br />
                    Amount
                  </th>
                  <th className="px-3 py-1 text-right font-bold w-32 border-l border-gray-200">
                    Credit
                    <br />
                    Amount
                  </th>
                </>
              ) : isOrder ? (
                <>
                  <th className="px-3 py-1 text-right font-bold w-28 border-l border-gray-200">
                    Order
                    <br />
                    Ref No.
                  </th>
                  <th className="px-3 py-1 text-right font-bold w-32 border-l border-gray-200">
                    Order
                    <br />
                    Amount
                  </th>
                </>
              ) : (
                <>
                  <th className="px-3 py-1 text-right font-bold w-28 border-l border-gray-200">
                    Inwards
                    <br />
                    Quantity
                  </th>
                  <th className="px-3 py-1 text-right font-bold w-28 border-l border-gray-200">
                    Outwards
                    <br />
                    Quantity
                  </th>
                </>
              )}
            </tr>
          </thead>
          <tbody>
            {loadingVouchers ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-black italic">
                  Loading vouchers...
                </td>
              </tr>
            ) : voucherError ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-black">
                  {voucherError}
                </td>
              </tr>
            ) : voucherRows.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-black italic">
                  No records found.
                </td>
              </tr>
            ) : (
              voucherRows.map((row, idx) => {
                const isFocused = idx === voucherIndex;
                return (
                  <tr
                    key={row.voucher_id}
                    onClick={() => setVoucherIndex(idx)}
                    onDoubleClick={() => navigate(`/transactions/voucher/${row.voucher_id}`)}
                    className={`border-b border-gray-200 cursor-pointer ${isFocused ? 'bg-black/[0.06] text-black font-bold' : 'hover:bg-black/[0.03] text-black'}`}
                  >
                    <td className="px-3 py-1 whitespace-nowrap">{formatDate(row.date)}</td>
                    <td className="px-3 py-1 truncate max-w-xs">{row.particulars}</td>
                    <td className="px-3 py-1">{row.voucher_type}</td>
                    <td className="px-3 py-1 text-right">{row.voucher_number || ''}</td>
                    {isAccounting ? (
                      <>
                        <td className="px-3 py-1 text-right border-l border-gray-200">
                          {fmtAmt(row.debit)}
                        </td>
                        <td className="px-3 py-1 text-right border-l border-gray-200">
                          {fmtAmt(row.credit)}
                        </td>
                      </>
                    ) : isOrder ? (
                      <>
                        <td className="px-3 py-1 text-right border-l border-gray-200">
                          {row.order_ref || ''}
                        </td>
                        <td className="px-3 py-1 text-right border-l border-gray-200">
                          {fmtAmt(row.order_amount)}
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="px-3 py-1 text-right border-l border-gray-200">
                          {fmtQty(row.inwards_qty, row.unit_symbol)}
                        </td>
                        <td className="px-3 py-1 text-right border-l border-gray-200">
                          {fmtQty(row.outwards_qty, row.unit_symbol)}
                        </td>
                      </>
                    )}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <div className="border-t-2 border-black bg-white px-3 py-1.5 flex font-mono text-[11px] font-bold text-black shrink-0">
        <span className="w-20" />
        <span className="flex-1" />
        <span className="w-28" />
        <span className="w-20" />
        {isAccounting ? (
          <span className="w-64 text-right pr-2 border-l border-gray-200">
            Total:&nbsp;&nbsp;{fmtAmt(totalDrCr)}
          </span>
        ) : isOrder ? (
          <>
            <span className="w-28 text-right pr-2 border-l border-gray-200" />
            <span className="w-32 text-right pr-2 border-l border-gray-200">
              {fmtAmt(totalAmt)}
            </span>
          </>
        ) : (
          <>
            <span className="w-28 text-right pr-2 border-l border-gray-200">{fmtQty(totalIn)}</span>
            <span className="w-28 text-right pr-2 border-l border-gray-200">
              {fmtQty(totalOut)}
            </span>
          </>
        )}
      </div>
    </div>
  );
}
