import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { useCompany } from '@/context/CompanyContext';
import PeriodDialog from './PeriodDialog';
import {
  StockItemMonthlyView,
  StockItemVouchersView,
  fmtAmount,
  fmtQty,
  type MonthRow,
  type StockVoucherRow,
} from './StockItemMovementViews';

/** Compute ISO date range for the Nth month of a financial year. */
function fyMonthRange(fyStart: string, idx: number): { from: string; to: string } {
  const d = new Date(fyStart + 'T00:00:00');
  const year = d.getFullYear() + Math.floor((d.getMonth() + idx) / 12);
  const month = (d.getMonth() + idx) % 12;
  const from = `${year}-${String(month + 1).padStart(2, '0')}-01`;
  const lastDay = new Date(year, month + 1, 0).getDate();
  return {
    from,
    to: `${year}-${String(month + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`,
  };
}

interface ItemSummaryRow {
  item_id: number;
  item_name: string;
  unit_name?: string;
  opening_qty: number;
  opening_value: number;
  in_qty: number;
  in_value: number;
  out_qty: number;
  out_value: number;
  closing_qty: number;
  closing_value: number;
}

interface SummaryResponse {
  success: boolean;
  items: ItemSummaryRow[];
  totalOpeningValue: number;
  totalInValue: number;
  totalOutValue: number;
  totalClosingValue: number;
  error?: string;
}

type Level =
  | { step: 'summary' }
  | { step: 'monthly'; item: ItemSummaryRow }
  | { step: 'vouchers'; item: ItemSummaryRow };

/**
 * Closing Stock drill (issue #242) — Funds Flow → Current Assets → Closing Stock.
 * Flat Stock Summary of every stock item with Opening / Inwards / Outwards /
 * Closing, valued exactly as TallyPrime (closing at weighted-average cost, so
 * the total ties to the Funds Flow / Balance Sheet closing-stock figure). No
 * stock-group header rows; empty items are dropped server-side. Drills item →
 * Stock Item Monthly Summary → Stock Item Vouchers → Voucher.
 */
export default function ClosingStockSummary() {
  const navigate = useNavigate();
  const { selectedCompany, activeFY } = useCompany();
  const companyId = selectedCompany?.company_id;
  const fyId = activeFY?.fy_id;

  const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const dmy = (iso: string) => {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
    return m ? `${Number(m[3])}-${MON[Number(m[2]) - 1]}-${m[1].slice(2)}` : iso;
  };
  // Period (F2) — defaults to the full financial year. A narrower period opens
  // with the prior period's closing carried into Opening and shows only that
  // period's Inwards/Outwards, exactly like TallyPrime.
  const [fromDate, setFromDate] = React.useState<string>(activeFY?.start_date ?? '');
  const [toDate, setToDate] = React.useState<string>(activeFY?.end_date ?? '');
  const [isPeriodOpen, setIsPeriodOpen] = React.useState(false);
  React.useEffect(() => {
    if (activeFY?.start_date && !fromDate) setFromDate(activeFY.start_date);
    if (activeFY?.end_date && !toDate) setToDate(activeFY.end_date);
  }, [activeFY?.start_date, activeFY?.end_date]); // eslint-disable-line react-hooks/exhaustive-deps
  const periodLabel = fromDate && toDate ? `${dmy(fromDate)} to ${dmy(toDate)}` : '';

  const [level, setLevel] = React.useState<Level>({ step: 'summary' });

  // ── Level 1: Stock Summary ───────────────────────────────────────────────
  const [data, setData] = React.useState<SummaryResponse | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [rowIndex, setRowIndex] = React.useState(0);

  React.useEffect(() => {
    if (!companyId || !fyId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    (window as any).api.report
      .stockClosingSummary(companyId, fyId, fromDate || undefined, toDate || undefined)
      .then((res: SummaryResponse) => {
        if (res.success) setData(res);
        else setError(res.error || 'Failed to load stock summary');
        setLoading(false);
      })
      .catch((e: any) => {
        setError(e.message);
        setLoading(false);
      });
  }, [companyId, fyId, fromDate, toDate]);

  const items = data?.items ?? [];

  // ── Level 2: Item Monthly Summary ────────────────────────────────────────
  const [months, setMonths] = React.useState<MonthRow[]>([]);
  const [monthsOpening, setMonthsOpening] = React.useState({ qty: 0, value: 0 });
  const [loadingMonths, setLoadingMonths] = React.useState(false);
  const [monthsError, setMonthsError] = React.useState<string | null>(null);
  const [monthIndex, setMonthIndex] = React.useState(0);

  const loadMonths = React.useCallback(
    (item: ItemSummaryRow) => {
      if (!companyId || !fyId) return;
      setLevel({ step: 'monthly', item });
      setLoadingMonths(true);
      setMonthsError(null);
      setMonthIndex(0);
      (window as any).api.report
        .stockItemMonthly(companyId, fyId, item.item_id)
        .then((res: any) => {
          if (res.success) {
            setMonths(res.months ?? []);
            setMonthsOpening({ qty: res.opening_qty ?? 0, value: res.opening_value ?? 0 });
          } else setMonthsError(res.error || 'Failed to load monthly summary');
          setLoadingMonths(false);
        });
    },
    [companyId, fyId],
  );

  // ── Level 3: Item Vouchers ───────────────────────────────────────────────
  const [voucherRows, setVoucherRows] = React.useState<StockVoucherRow[]>([]);
  const [loadingVouchers, setLoadingVouchers] = React.useState(false);
  const [voucherError, setVoucherError] = React.useState<string | null>(null);
  const [voucherIndex, setVoucherIndex] = React.useState(0);

  const loadVouchers = React.useCallback(
    (item: ItemSummaryRow, fromDate?: string, toDate?: string) => {
      if (!companyId || !fyId) return;
      setLevel({ step: 'vouchers', item });
      setLoadingVouchers(true);
      setVoucherError(null);
      setVoucherIndex(0);
      (window as any).api.report
        .stockItemVouchers(
          companyId,
          fyId,
          item.item_id,
          fromDate ?? activeFY?.start_date,
          toDate ?? activeFY?.end_date,
        )
        .then((res: any) => {
          if (res.success) setVoucherRows(res.rows ?? []);
          else setVoucherError(res.error || 'Failed to load item vouchers');
          setLoadingVouchers(false);
        });
    },
    [companyId, fyId, activeFY],
  );

  const backToSummary = React.useCallback(() => setLevel({ step: 'summary' }), []);
  const backToMonthly = React.useCallback(
    (item: ItemSummaryRow) => setLevel({ step: 'monthly', item }),
    [],
  );

  // ── Keyboard nav ─────────────────────────────────────────────────────────
  React.useEffect(() => {
    if (level.step !== 'summary') return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'F2') {
        e.preventDefault();
        setIsPeriodOpen(true);
        return;
      }
      if (isPeriodOpen) return; // let the period dialog own the keyboard while open
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setRowIndex((p) => Math.min(items.length - 1, p + 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setRowIndex((p) => Math.max(0, p - 1));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const it = items[rowIndex];
        if (it) loadMonths(it);
      } else if (e.key === 'Escape' || e.key === 'Backspace') {
        e.preventDefault();
        navigate(-1);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [level.step, items, rowIndex, loadMonths, navigate, isPeriodOpen]);

  React.useEffect(() => {
    if (level.step !== 'monthly') return;
    const item = level.item;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setMonthIndex((p) => Math.min(months.length - 1, p + 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setMonthIndex((p) => Math.max(0, p - 1));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (activeFY?.start_date) {
          const { from, to } = fyMonthRange(activeFY.start_date, monthIndex);
          loadVouchers(item, from, to);
        } else loadVouchers(item);
      } else if (e.key === 'Escape' || e.key === 'Backspace') {
        e.preventDefault();
        backToSummary();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [level, months, monthIndex, loadVouchers, backToSummary, activeFY]);

  React.useEffect(() => {
    if (level.step !== 'vouchers') return;
    const item = level.item;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setVoucherIndex((p) => Math.min(voucherRows.length - 1, p + 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setVoucherIndex((p) => Math.max(0, p - 1));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const r = voucherRows[voucherIndex];
        if (r?.voucher_id) navigate(`/transactions/voucher/${r.voucher_id}`);
      } else if (e.key === 'Escape' || e.key === 'Backspace') {
        e.preventDefault();
        backToMonthly(item);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [level, voucherRows, voucherIndex, navigate, backToMonthly]);

  // ── Level 2 render ───────────────────────────────────────────────────────
  if (level.step === 'monthly') {
    return (
      <StockItemMonthlyView
        companyName={selectedCompany?.name}
        itemName={level.item.item_name}
        periodLabel={periodLabel}
        months={months}
        opening={monthsOpening}
        loading={loadingMonths}
        error={monthsError}
        selectedIndex={monthIndex}
        onSelect={setMonthIndex}
        onDrill={(idx) => {
          if (activeFY?.start_date) {
            const { from, to } = fyMonthRange(activeFY.start_date, idx);
            loadVouchers(level.item, from, to);
          } else loadVouchers(level.item);
        }}
        footerLabel="Enter: Vouchers"
        onFooter={() => {
          if (activeFY?.start_date) {
            const { from, to } = fyMonthRange(activeFY.start_date, monthIndex);
            loadVouchers(level.item, from, to);
          } else loadVouchers(level.item);
        }}
      />
    );
  }

  // ── Level 3 render ───────────────────────────────────────────────────────
  if (level.step === 'vouchers') {
    return (
      <StockItemVouchersView
        companyName={selectedCompany?.name}
        itemName={level.item.item_name}
        periodLabel={periodLabel}
        rows={voucherRows}
        loading={loadingVouchers}
        error={voucherError}
        selectedIndex={voucherIndex}
        onSelect={setVoucherIndex}
        onOpen={(row) => row.voucher_id && navigate(`/transactions/voucher/${row.voucher_id}`)}
        footerLabel="Esc: Back"
        onFooter={() => backToMonthly(level.item)}
      />
    );
  }

  // ── Level 1 render: Stock Summary (flat item list) ───────────────────────
  return (
    <div className="flex-1 flex flex-col h-full bg-white select-none text-black font-sans text-[11px]">
      <div className="flex items-center justify-between px-3 py-1.5 bg-white border-b-2 border-gray-200">
        <span className="font-bold text-sm tracking-wide">Stock Summary</span>
        <span className="font-bold text-sm">{selectedCompany?.name || 'Company'}</span>
        <span />
      </div>
      <div className="flex justify-between items-center px-3 py-1.5 bg-white border-b border-gray-200 font-mono">
        <span className="font-bold">Closing Stock</span>
        <button
          onClick={() => setIsPeriodOpen(true)}
          title="F2: Period"
          className="hover:underline"
        >
          {periodLabel}
        </button>
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
                Opening Balance
              </th>
              <th
                colSpan={2}
                className="px-3 py-0.5 text-center font-bold border-b border-l border-gray-200"
              >
                Inwards
              </th>
              <th
                colSpan={2}
                className="px-3 py-0.5 text-center font-bold border-b border-l border-gray-200"
              >
                Outwards
              </th>
              <th
                colSpan={2}
                className="px-3 py-0.5 text-center font-bold border-b border-l border-gray-200"
              >
                Closing Balance
              </th>
            </tr>
            <tr>
              {[
                'Quantity',
                'Value',
                'Quantity',
                'Value',
                'Quantity',
                'Value',
                'Quantity',
                'Value',
              ].map((h, i) => (
                <th
                  key={i}
                  className={`px-3 py-1 text-right font-bold ${i % 2 === 0 ? 'w-20 border-l border-gray-200' : 'w-24'}`}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={9} className="px-4 py-8 text-center text-black italic">
                  Loading...
                </td>
              </tr>
            ) : error ? (
              <tr>
                <td colSpan={9} className="px-4 py-8 text-center text-black">
                  {error}
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-4 py-8 text-center text-black italic">
                  No stock items found.
                </td>
              </tr>
            ) : (
              items.map((r, idx) => {
                const isFocused = idx === rowIndex;
                return (
                  <tr
                    key={r.item_id}
                    onClick={() => setRowIndex(idx)}
                    onDoubleClick={() => loadMonths(r)}
                    className={`border-b border-gray-200 cursor-pointer ${isFocused ? 'bg-black/[0.06] text-black font-bold' : 'hover:bg-black/[0.03] text-black'}`}
                  >
                    <td className="px-3 py-1">{r.item_name}</td>
                    <td className="px-3 py-1 text-right border-l border-gray-200">
                      {fmtQty(r.opening_qty, r.unit_name)}
                    </td>
                    <td className="px-3 py-1 text-right">{fmtAmount(r.opening_value)}</td>
                    <td className="px-3 py-1 text-right border-l border-gray-200">
                      {fmtQty(r.in_qty, r.unit_name)}
                    </td>
                    <td className="px-3 py-1 text-right">{fmtAmount(r.in_value)}</td>
                    <td className="px-3 py-1 text-right border-l border-gray-200">
                      {fmtQty(r.out_qty, r.unit_name)}
                    </td>
                    <td className="px-3 py-1 text-right">{fmtAmount(r.out_value)}</td>
                    <td className="px-3 py-1 text-right border-l border-gray-200">
                      {fmtQty(r.closing_qty, r.unit_name)}
                    </td>
                    <td className="px-3 py-1 text-right">{fmtAmount(r.closing_value)}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Grand Total — value totals only; quantities are intentionally blank
          because items span different units (kg / pcs / nos) and Tally never
          cross-sums units at the summary level. */}
      <div className="border-t-2 border-black bg-white px-3 py-1.5 flex font-mono text-[11px] font-bold text-black shrink-0">
        <span className="flex-1">Grand Total</span>
        <span className="w-20 border-l border-gray-200" />
        <span className="w-24 text-right pr-2">{fmtAmount(data?.totalOpeningValue)}</span>
        <span className="w-20 border-l border-gray-200" />
        <span className="w-24 text-right pr-2">{fmtAmount(data?.totalInValue)}</span>
        <span className="w-20 border-l border-gray-200" />
        <span className="w-24 text-right pr-2">{fmtAmount(data?.totalOutValue)}</span>
        <span className="w-20 border-l border-gray-200" />
        <span className="w-24 text-right pr-2">{fmtAmount(data?.totalClosingValue)}</span>
      </div>

      <div className="flex items-center gap-4 px-3 py-1 border-t border-gray-200 bg-white text-[10px] font-semibold text-black shrink-0">
        <button onClick={() => setIsPeriodOpen(true)} className="hover:underline hover:text-black">
          F2: Period
        </button>
      </div>

      {/* F2 Period — carries the prior period's closing into Opening and shows
          only the selected period's Inwards/Outwards, like TallyPrime. */}
      <PeriodDialog
        open={isPeriodOpen}
        onOpenChange={setIsPeriodOpen}
        fromDate={fromDate}
        toDate={toDate}
        minDate={activeFY?.start_date}
        maxDate={activeFY?.end_date}
        onFromChange={setFromDate}
        onToChange={setToDate}
        onFullYear={() => {
          if (activeFY?.start_date) setFromDate(activeFY.start_date);
          if (activeFY?.end_date) setToDate(activeFY.end_date);
        }}
      />
    </div>
  );
}
