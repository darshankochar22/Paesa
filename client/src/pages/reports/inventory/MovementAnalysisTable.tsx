import * as React from 'react';

const fmt = (val: number | null | undefined) => {
  const n = Number(val) || 0;
  if (n === 0) return '';
  return new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
};

const fmtQty = (val: number | null | undefined, unit?: string) => {
  const n = Number(val) || 0;
  if (n === 0) return '';
  const s = n.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 3 });
  return unit ? `${s} ${unit}` : s;
};

const rate = (val: number | null | undefined, qty: number | null | undefined) => {
  const v = Number(val) || 0;
  const q = Number(qty) || 0;
  if (!q || !v) return '';
  return new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(v / q);
};

export interface MovRow {
  id: React.Key;
  name: string;
  unit?: string;
  leftQty: number;
  leftValue: number;
  rightQty: number;
  rightValue: number;
}

interface Props {
  title: string;
  companyName?: string;
  subtitle?: string;
  periodLabel?: string;
  leftLabel: string;
  rightLabel: string;
  rows: MovRow[];
  loading?: boolean;
  error?: string | null;
  emptyText?: string;
  selectedIndex: number;
  onSelectIndex: (i: number) => void;
  onActivate?: (row: MovRow, i: number) => void;
  footer?: React.ReactNode;
}

/**
 * Shared TallyPrime-style Movement Analysis list: Particulars on the left, two
 * sections (e.g. Inward/Outward, Purchases/Sales, Goods In/Goods Out) each with
 * Quantity / Eff. Rate / Value, and a Grand Total row. Presentational only —
 * the parent owns selection state and keyboard navigation.
 */
export default function MovementAnalysisTable({
  title,
  companyName,
  subtitle,
  periodLabel,
  leftLabel,
  rightLabel,
  rows,
  loading,
  error,
  emptyText = 'No records found.',
  selectedIndex,
  onSelectIndex,
  onActivate,
  footer,
}: Props) {
  const totals = rows.reduce(
    (acc, r) => ({
      lQty: acc.lQty + r.leftQty,
      lVal: acc.lVal + r.leftValue,
      rQty: acc.rQty + r.rightQty,
      rVal: acc.rVal + r.rightValue,
    }),
    { lQty: 0, lVal: 0, rQty: 0, rVal: 0 },
  );

  return (
    <div className="flex-1 flex flex-col h-full bg-white select-none text-black font-sans text-[11px]">
      <div className="flex items-center justify-between px-3 py-1.5 bg-white border-b-2 border-gray-200">
        <span className="font-bold text-sm tracking-wide">{title}</span>
        <span className="font-bold text-sm">{companyName || 'Company'}</span>
        <span />
      </div>
      <div className="flex justify-between items-center px-3 py-1.5 bg-white border-b border-gray-200 font-mono text-[11px]">
        <span className="font-semibold">{subtitle}</span>
        <span>{periodLabel}</span>
      </div>

      <div className="flex-1 overflow-y-auto">
        <table className="w-full border-collapse text-[11px] font-mono select-none">
          <thead className="sticky top-0 bg-white border-b border-gray-200 z-10 text-black">
            <tr>
              <th
                rowSpan={2}
                className="px-3 py-1 text-left font-bold align-bottom border-b border-gray-200"
              >
                Particulars
              </th>
              <th
                colSpan={3}
                className="px-2 py-0.5 text-center font-bold border-b border-l border-gray-200"
              >
                {leftLabel}
              </th>
              <th
                colSpan={3}
                className="px-2 py-0.5 text-center font-bold border-b border-l border-gray-200"
              >
                {rightLabel}
              </th>
            </tr>
            <tr>
              <th className="px-2 py-1 text-right font-bold w-24 border-l border-gray-200">
                Quantity
              </th>
              <th className="px-2 py-1 text-right font-bold w-24">Eff. Rate</th>
              <th className="px-2 py-1 text-right font-bold w-28">Value</th>
              <th className="px-2 py-1 text-right font-bold w-24 border-l border-gray-200">
                Quantity
              </th>
              <th className="px-2 py-1 text-right font-bold w-24">Eff. Rate</th>
              <th className="px-2 py-1 text-right font-bold w-28">Value</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-black italic">
                  Loading...
                </td>
              </tr>
            ) : error ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-black">
                  {error}
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-black italic">
                  {emptyText}
                </td>
              </tr>
            ) : (
              rows.map((r, idx) => (
                <tr
                  key={r.id}
                  onClick={() => onSelectIndex(idx)}
                  onDoubleClick={() => onActivate?.(r, idx)}
                  className={`border-b border-gray-200 ${onActivate ? 'cursor-pointer' : ''} ${idx === selectedIndex ? 'bg-black/[0.06] text-black font-bold' : 'hover:bg-black/[0.03] text-black'}`}
                >
                  <td className="px-3 py-1">{r.name}</td>
                  <td className="px-2 py-1 text-right border-l border-gray-200">
                    {fmtQty(r.leftQty, r.unit)}
                  </td>
                  <td className="px-2 py-1 text-right">{rate(r.leftValue, r.leftQty)}</td>
                  <td className="px-2 py-1 text-right">{fmt(r.leftValue)}</td>
                  <td className="px-2 py-1 text-right border-l border-gray-200">
                    {fmtQty(r.rightQty, r.unit)}
                  </td>
                  <td className="px-2 py-1 text-right">{rate(r.rightValue, r.rightQty)}</td>
                  <td className="px-2 py-1 text-right">{fmt(r.rightValue)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="border-t-2 border-black bg-white px-3 py-1.5 flex font-mono text-[11px] font-bold text-black shrink-0">
        <span className="flex-1">Grand Total</span>
        <span className="w-24 text-right border-l border-gray-200 pr-1">{fmtQty(totals.lQty)}</span>
        <span className="w-24 text-right pr-1">{rate(totals.lVal, totals.lQty)}</span>
        <span className="w-28 text-right pr-1">{fmt(totals.lVal)}</span>
        <span className="w-24 text-right border-l border-gray-200 pr-1">{fmtQty(totals.rQty)}</span>
        <span className="w-24 text-right pr-1">{rate(totals.rVal, totals.rQty)}</span>
        <span className="w-28 text-right pr-1">{fmt(totals.rVal)}</span>
      </div>

      {footer}
    </div>
  );
}
