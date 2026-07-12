import * as React from 'react';

const val = (v: number | null | undefined) => {
  const n = Number(v) || 0;
  if (n === 0) return '';
  return new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
};
const qty = (v: number | null | undefined, unit?: string) => {
  const n = Number(v) || 0;
  if (n === 0) return '';
  const s = Math.abs(n).toLocaleString('en-IN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 3,
  });
  return unit ? `${s} ${unit}` : s;
};
const rate = (v: number | null | undefined, q: number | null | undefined) => {
  const a = Number(v) || 0,
    b = Number(q) || 0;
  if (!a || !b) return '';
  return new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Math.abs(a / b));
};

export interface CostRow {
  id: React.Key;
  name: string;
  unit?: string;
  cost: { qty: number; value: number };
  revenue: { qty: number; value: number };
  balance: { qty: number; value: number };
  profit: number;
}

interface Props {
  title: string; // "Stock Group Cost Analysis"
  companyName?: string;
  subtitle?: string; // selected group / item name
  periodLabel?: string;
  rows: CostRow[];
  loading?: boolean;
  error?: string | null;
  emptyText?: string;
  selectedIndex: number;
  onSelectIndex: (i: number) => void;
  onActivate?: (row: CostRow, i: number) => void;
  footer?: React.ReactNode;
}

/**
 * Item Cost Analysis — TallyPrime cost-tracking layout: A. Cost (Expense),
 * B. Revenue (Income), C. Balance at Cost, and Profit/(Loss) = B − (A − C).
 * Structure mirrors Tally; theme is this app's strict gray scale.
 */
export default function CostAnalysisTable({
  title,
  companyName,
  subtitle,
  periodLabel,
  rows,
  loading,
  error,
  emptyText = 'No records found.',
  selectedIndex,
  onSelectIndex,
  onActivate,
  footer,
}: Props) {
  const t = rows.reduce(
    (a, r) => ({
      cQty: a.cQty + r.cost.qty,
      cVal: a.cVal + r.cost.value,
      rQty: a.rQty + r.revenue.qty,
      rVal: a.rVal + r.revenue.value,
      bQty: a.bQty + r.balance.qty,
      bVal: a.bVal + r.balance.value,
      pf: a.pf + r.profit,
    }),
    { cQty: 0, cVal: 0, rQty: 0, rVal: 0, bQty: 0, bVal: 0, pf: 0 },
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
                A. Cost (Expense)
              </th>
              <th
                colSpan={3}
                className="px-2 py-0.5 text-center font-bold border-b border-l border-gray-200"
              >
                B. Revenue (Income)
              </th>
              <th
                colSpan={3}
                className="px-2 py-0.5 text-center font-bold border-b border-l border-gray-200"
              >
                C. Balance at Cost
              </th>
              <th
                colSpan={2}
                className="px-2 py-0.5 text-center font-bold border-b border-l border-gray-200"
              >
                Profit/(Loss)
                <br />
                <span className="font-normal">B − (A − C)</span>
              </th>
            </tr>
            <tr>
              <th className="px-2 py-1 text-right font-bold w-20 border-l border-gray-200">
                Inward Quantity
              </th>
              <th className="px-2 py-1 text-right font-bold w-16">Rate</th>
              <th className="px-2 py-1 text-right font-bold w-24">Value</th>
              <th className="px-2 py-1 text-right font-bold w-20 border-l border-gray-200">
                Outward Quantity
              </th>
              <th className="px-2 py-1 text-right font-bold w-16">Rate</th>
              <th className="px-2 py-1 text-right font-bold w-24">Value</th>
              <th className="px-2 py-1 text-right font-bold w-20 border-l border-gray-200">
                Nett Quantity
              </th>
              <th className="px-2 py-1 text-right font-bold w-16">Rate</th>
              <th className="px-2 py-1 text-right font-bold w-24">Value</th>
              <th className="px-2 py-1 text-right font-bold w-24 border-l border-gray-200">
                Value
              </th>
              <th className="px-2 py-1 text-right font-bold w-16">Rate</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={12} className="px-4 py-8 text-center text-black italic">
                  Loading...
                </td>
              </tr>
            ) : error ? (
              <tr>
                <td colSpan={12} className="px-4 py-8 text-center text-black">
                  {error}
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={12} className="px-4 py-8 text-center text-black italic">
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
                    {qty(r.cost.qty, r.unit)}
                  </td>
                  <td className="px-2 py-1 text-right">{rate(r.cost.value, r.cost.qty)}</td>
                  <td className="px-2 py-1 text-right">{val(r.cost.value)}</td>
                  <td className="px-2 py-1 text-right border-l border-gray-200">
                    {qty(r.revenue.qty, r.unit)}
                  </td>
                  <td className="px-2 py-1 text-right">{rate(r.revenue.value, r.revenue.qty)}</td>
                  <td className="px-2 py-1 text-right">{val(r.revenue.value)}</td>
                  <td className="px-2 py-1 text-right border-l border-gray-200">
                    {qty(r.balance.qty, r.unit)}
                  </td>
                  <td className="px-2 py-1 text-right">{rate(r.balance.value, r.balance.qty)}</td>
                  <td className="px-2 py-1 text-right">{val(r.balance.value)}</td>
                  <td className="px-2 py-1 text-right border-l border-gray-200">{val(r.profit)}</td>
                  <td className="px-2 py-1 text-right">{rate(r.profit, r.balance.qty)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="border-t-2 border-black bg-white px-3 py-1.5 flex font-mono text-[11px] font-bold text-black shrink-0">
        <span className="flex-1">Grand Total</span>
        <span className="w-20 text-right border-l border-gray-200 pr-1">{qty(t.cQty)}</span>
        <span className="w-16 text-right pr-1">{rate(t.cVal, t.cQty)}</span>
        <span className="w-24 text-right pr-1">{val(t.cVal)}</span>
        <span className="w-20 text-right border-l border-gray-200 pr-1">{qty(t.rQty)}</span>
        <span className="w-16 text-right pr-1">{rate(t.rVal, t.rQty)}</span>
        <span className="w-24 text-right pr-1">{val(t.rVal)}</span>
        <span className="w-20 text-right border-l border-gray-200 pr-1">{qty(t.bQty)}</span>
        <span className="w-16 text-right pr-1">{rate(t.bVal, t.bQty)}</span>
        <span className="w-24 text-right pr-1">{val(t.bVal)}</span>
        <span className="w-24 text-right border-l border-gray-200 pr-1">{val(t.pf)}</span>
        <span className="w-16 text-right pr-1">{rate(t.pf, t.bQty)}</span>
      </div>

      {footer}
    </div>
  );
}
