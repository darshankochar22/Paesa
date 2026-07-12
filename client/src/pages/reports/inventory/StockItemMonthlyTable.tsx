import * as React from 'react';
import type { ScaleFactor } from './ScaleFactorPopup';

const NO_SCALE: ScaleFactor = { label: 'Default', divisor: 1, suffix: '' };

const makeFmtVal = (scale: ScaleFactor) => (val: number | null | undefined) => {
  const n = (Number(val) || 0) / scale.divisor;
  if (n === 0) return '';
  return (
    new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(
      n,
    ) + scale.suffix
  );
};

const fmtQty = (val: number | null | undefined, unit?: string) => {
  const n = Number(val) || 0;
  if (n === 0) return '';
  const s = n.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 3 });
  return unit ? `${s} ${unit}` : s;
};

const fmtPct = (v: number) => (v === 0 ? '' : `${v.toFixed(2)} %`);

export interface MonthRow {
  month: string;
  in_qty: number;
  in_value: number;
  out_qty: number;
  out_value: number;
  closing_qty: number;
  closing_value: number;
}

interface ProfitRow {
  consumption: number;
  gross_profit: number;
  perc: number;
}

interface Props {
  itemName: string;
  companyName?: string;
  periodLabel?: string;
  unit?: string;
  openingQty: number;
  openingValue: number;
  months: MonthRow[];
  loading?: boolean;
  error?: string | null;
  selectedIndex: number; // index into `months`; -1 = Opening Balance row
  onSelectIndex: (i: number) => void;
  onActivate?: (monthIndex: number) => void;
  footer?: React.ReactNode;
  // ── Issue #107 additions ──
  title?: string; // override "Stock Item Monthly Summary"
  particularsLabel?: string; // override "Particulars" header
  showProfit?: boolean; // F7 — add Consumption / Gross Profit / Perc% cols
  scale?: ScaleFactor; // Basis of Values scale factor
  chart?: React.ReactNode; // bar chart rendered above the Grand Total
  sidebar?: React.ReactNode; // right action panel
}

/**
 * Compute running-average-cost COGS per period from opening + monthly movement.
 * Consumption = out_qty × avg cost (after that period's inwards are absorbed).
 * Gross Profit = out_value − consumption.  Perc% = gross_profit / out_value.
 */
function computeProfit(openingQty: number, openingValue: number, months: MonthRow[]): ProfitRow[] {
  let qty = openingQty;
  let cost = openingValue; // cost-basis running value
  return months.map((m) => {
    qty += m.in_qty;
    cost += m.in_value;
    const avg = qty !== 0 ? cost / qty : 0;
    const consumption = m.out_qty * avg;
    qty -= m.out_qty;
    cost -= consumption;
    const gross_profit = m.out_value - consumption;
    const perc = m.out_value ? (gross_profit / m.out_value) * 100 : 0;
    return { consumption, gross_profit, perc };
  });
}

/**
 * Stock Item Monthly Summary — TallyPrime monthly inward/outward movement with a
 * running closing balance for a single stock item. Opening Balance row, period
 * rows, then a Grand Total. F7 Show Profit adds Consumption / Gross Profit /
 * Perc% columns; Basis of Values scales value columns; an optional bar chart sits
 * above the Grand Total. Presentational only; parent owns selection + keyboard nav.
 */
export default function StockItemMonthlyTable({
  itemName,
  companyName,
  periodLabel,
  unit,
  openingQty,
  openingValue,
  months,
  loading,
  error,
  selectedIndex,
  onSelectIndex,
  onActivate,
  footer,
  title = 'Stock Item Monthly Summary',
  particularsLabel = 'Particulars',
  showProfit = false,
  scale = NO_SCALE,
  chart,
  sidebar,
}: Props) {
  const fmt = React.useMemo(() => makeFmtVal(scale), [scale]);
  const profit = React.useMemo(
    () => (showProfit ? computeProfit(openingQty, openingValue, months) : []),
    [showProfit, openingQty, openingValue, months],
  );

  const tot = months.reduce(
    (a, m) => ({
      inQ: a.inQ + m.in_qty,
      inV: a.inV + m.in_value,
      outQ: a.outQ + m.out_qty,
      outV: a.outV + m.out_value,
    }),
    { inQ: 0, inV: 0, outQ: 0, outV: 0 },
  );
  const totCons = profit.reduce((s, p) => s + p.consumption, 0);
  const totGP = profit.reduce((s, p) => s + p.gross_profit, 0);
  const totGPpc = tot.outV ? (totGP / tot.outV) * 100 : 0;
  const finalCQty = months.length ? months[months.length - 1].closing_qty : openingQty;
  const finalCVal = months.length ? months[months.length - 1].closing_value : openingValue;

  const numCell = 'px-2 py-1 text-right';
  const colSpanCount = showProfit ? 10 : 7;

  const body = (
    <div className="flex-1 flex flex-col h-full bg-white select-none text-black font-sans text-[11px] min-w-0">
      <div className="flex items-center justify-between px-3 py-1.5 bg-white border-b-2 border-gray-200">
        <span className="font-bold text-sm tracking-wide">{title}</span>
        <span className="font-bold text-sm">{companyName || 'Company'}</span>
        <span />
      </div>
      <div className="flex justify-between items-center px-3 py-1.5 bg-white border-b border-gray-200 font-mono text-[11px]">
        <span className="font-semibold">{itemName}</span>
        <span>
          {periodLabel}
          {scale.divisor !== 1 ? ` · Values in ${scale.label}` : ''}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto">
        <table className="w-full border-collapse text-[11px] font-mono select-none">
          <thead className="sticky top-0 bg-white border-b border-gray-200 z-10 text-black">
            <tr>
              <th
                rowSpan={2}
                className="px-3 py-1 text-left font-bold align-bottom border-b border-gray-200"
              >
                {particularsLabel}
              </th>
              <th
                colSpan={2}
                className="px-2 py-0.5 text-center font-bold border-b border-l border-gray-200"
              >
                Inwards
              </th>
              <th
                colSpan={2}
                className="px-2 py-0.5 text-center font-bold border-b border-l border-gray-200"
              >
                Outwards
              </th>
              {showProfit && (
                <>
                  <th
                    rowSpan={2}
                    className="px-2 py-1 text-right font-bold w-28 border-b border-l border-gray-200 align-bottom"
                  >
                    Consumption
                  </th>
                  <th
                    rowSpan={2}
                    className="px-2 py-1 text-right font-bold w-28 border-b border-l border-gray-200 align-bottom"
                  >
                    Gross Profit
                  </th>
                  <th
                    rowSpan={2}
                    className="px-2 py-1 text-right font-bold w-16 border-b border-l border-gray-200 align-bottom"
                  >
                    Perc %
                  </th>
                </>
              )}
              <th
                colSpan={2}
                className="px-2 py-0.5 text-center font-bold border-b border-l border-gray-200"
              >
                Closing Balance
              </th>
            </tr>
            <tr>
              <th className="px-2 py-1 text-right font-bold w-28 border-l border-gray-200">
                Quantity
              </th>
              <th className="px-2 py-1 text-right font-bold w-28">Value</th>
              <th className="px-2 py-1 text-right font-bold w-28 border-l border-gray-200">
                Quantity
              </th>
              <th className="px-2 py-1 text-right font-bold w-28">Value</th>
              <th className="px-2 py-1 text-right font-bold w-28 border-l border-gray-200">
                Quantity
              </th>
              <th className="px-2 py-1 text-right font-bold w-28">Value</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={colSpanCount} className="px-4 py-8 text-center text-black italic">
                  Loading...
                </td>
              </tr>
            ) : error ? (
              <tr>
                <td colSpan={colSpanCount} className="px-4 py-8 text-center text-black">
                  {error}
                </td>
              </tr>
            ) : (
              <>
                <tr
                  className={`border-b border-gray-200 ${selectedIndex === -1 ? 'bg-black/[0.06] text-black font-bold' : 'text-black'}`}
                  onClick={() => onSelectIndex(-1)}
                >
                  <td className="px-3 py-1 italic">Opening Balance</td>
                  <td className={`${numCell} border-l border-gray-200`} />
                  <td className={numCell} />
                  <td className={`${numCell} border-l border-gray-200`} />
                  <td className={numCell} />
                  {showProfit && (
                    <>
                      <td className={`${numCell} border-l border-gray-200`} />
                      <td className={`${numCell} border-l border-gray-200`} />
                      <td className={`${numCell} border-l border-gray-200`} />
                    </>
                  )}
                  <td className={`${numCell} border-l border-gray-200`}>
                    {fmtQty(openingQty, unit)}
                  </td>
                  <td className={numCell}>{fmt(openingValue)}</td>
                </tr>
                {months.map((m, idx) => {
                  const p = profit[idx];
                  // Closing balance is shown only on months that had movement
                  // (inward/outward) — carried-forward balances stay blank,
                  // matching TallyPrime's monthly summary.
                  const hasMovement =
                    m.in_qty !== 0 || m.out_qty !== 0 || m.in_value !== 0 || m.out_value !== 0;
                  return (
                    <tr
                      key={m.month}
                      // Single click drills into the period's vouchers (Tally's Enter);
                      // falls back to plain selection when the row isn't drillable.
                      onClick={() => (onActivate ? onActivate(idx) : onSelectIndex(idx))}
                      onDoubleClick={() => onActivate?.(idx)}
                      className={`border-b border-gray-200 ${onActivate ? 'cursor-pointer' : ''} ${idx === selectedIndex ? 'bg-black/[0.06] text-black font-bold' : 'hover:bg-black/[0.03] text-black'}`}
                    >
                      <td className="px-3 py-1">{m.month}</td>
                      <td className={`${numCell} border-l border-gray-200`}>
                        {fmtQty(m.in_qty, unit)}
                      </td>
                      <td className={numCell}>{fmt(m.in_value)}</td>
                      <td className={`${numCell} border-l border-gray-200`}>
                        {fmtQty(m.out_qty, unit)}
                      </td>
                      <td className={numCell}>{fmt(m.out_value)}</td>
                      {showProfit && p && (
                        <>
                          <td className={`${numCell} border-l border-gray-200`}>
                            {fmt(p.consumption)}
                          </td>
                          <td className={`${numCell} border-l border-gray-200`}>
                            {fmt(p.gross_profit)}
                          </td>
                          <td className={`${numCell} border-l border-gray-200`}>
                            {fmtPct(p.perc)}
                          </td>
                        </>
                      )}
                      <td className={`${numCell} border-l border-gray-200`}>
                        {hasMovement ? fmtQty(m.closing_qty, unit) : ''}
                      </td>
                      <td className={numCell}>{hasMovement ? fmt(m.closing_value) : ''}</td>
                    </tr>
                  );
                })}
              </>
            )}
          </tbody>
        </table>
      </div>

      {chart}

      <div className="border-t-2 border-black bg-white px-3 py-1.5 flex font-mono text-[11px] font-bold text-black shrink-0">
        <span className="flex-1">Grand Total</span>
        <span className="w-28 text-right border-l border-gray-200 pr-1">
          {fmtQty(tot.inQ, unit)}
        </span>
        <span className="w-28 text-right pr-1">{fmt(tot.inV)}</span>
        <span className="w-28 text-right border-l border-gray-200 pr-1">
          {fmtQty(tot.outQ, unit)}
        </span>
        <span className="w-28 text-right pr-1">{fmt(tot.outV)}</span>
        {showProfit && (
          <>
            <span className="w-28 text-right border-l border-gray-200 pr-1">{fmt(totCons)}</span>
            <span className="w-28 text-right border-l border-gray-200 pr-1">{fmt(totGP)}</span>
            <span className="w-16 text-right border-l border-gray-200 pr-1">{fmtPct(totGPpc)}</span>
          </>
        )}
        <span className="w-28 text-right border-l border-gray-200 pr-1">
          {fmtQty(finalCQty, unit)}
        </span>
        <span className="w-28 text-right pr-1">{fmt(finalCVal)}</span>
      </div>

      {footer}
    </div>
  );

  if (!sidebar) return body;
  return (
    <div className="flex h-full w-full">
      {body}
      {sidebar}
    </div>
  );
}
