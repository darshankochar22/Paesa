import * as React from "react";

const fmt = (val: number | null | undefined) => {
  const n = Number(val) || 0;
  if (n === 0) return "";
  return new Intl.NumberFormat("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
};

const fmtQty = (val: number | null | undefined, unit?: string) => {
  const n = Number(val) || 0;
  if (n === 0) return "";
  const s = n.toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 3 });
  return unit ? `${s} ${unit}` : s;
};

export interface AgeCell { qty: number; value: number }

export interface AgeRow {
  id: React.Key;
  name: string;
  unit?: string;
  expiry?: string;
  total: AgeCell;
  buckets: AgeCell[]; // length 4 — aligned to bands
  neg: AgeCell;
}

interface Props {
  companyName?: string;
  groupLabel: string;   // "Primary" or the stock group name
  asAt?: string;        // ISO date the stock is aged against
  /** Job Work variant subtitle, e.g. "Job Work In" — shows an extra header line. */
  basis?: string;
  bands: number[];      // [45, 90, 180]
  rows: AgeRow[];
  loading?: boolean;
  error?: string | null;
  emptyText?: string;
  selectedIndex: number;
  onSelectIndex: (i: number) => void;
  onActivate?: (row: AgeRow, i: number) => void;
  footer?: React.ReactNode;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const fmtAsAt = (d?: string) => {
  if (!d) return "";
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(d);
  if (!m) return d;
  return `${Number(m[3])}-${MONTHS[Number(m[2]) - 1]}-${m[1].slice(2)}`;
};

const bandLabels = (bands: number[]) => [
  `( < ${bands[0]} days )`,
  `${bands[0]} to ${bands[1]} days`,
  `${bands[1]} to ${bands[2]} days`,
  `( > ${bands[2]} days )`,
];

/**
 * Stock Ageing Analysis — TallyPrime-style on-hand stock aged by date of
 * purchase. Particulars + Expiry Date, then Total and four ageing bands plus a
 * Negative Stock column, each split Quantity / Value, with a Grand Total row.
 * Presentational only — the parent owns selection + keyboard navigation.
 */
export default function StockAgeingTable({
  companyName, groupLabel, asAt, basis, bands, rows, loading, error,
  emptyText = "No stock in this group.", selectedIndex, onSelectIndex, onActivate, footer,
}: Props) {
  const labels = bandLabels(bands);

  const totals = rows.reduce((acc, r) => {
    acc.total.qty += r.total.qty; acc.total.value += r.total.value;
    r.buckets.forEach((b, i) => { acc.buckets[i].qty += b.qty; acc.buckets[i].value += b.value; });
    acc.neg.qty += r.neg.qty; acc.neg.value += r.neg.value;
    return acc;
  }, {
    total: { qty: 0, value: 0 },
    buckets: [ { qty: 0, value: 0 }, { qty: 0, value: 0 }, { qty: 0, value: 0 }, { qty: 0, value: 0 } ],
    neg: { qty: 0, value: 0 },
  });

  // Section column groups, in render order: Total + 4 bands + Negative.
  // Total and Negative Stock are Quantity-only (no Value sub-column), matching Tally.
  const groups = [
    { key: "total", label: "Total", qtyOnly: true, cell: (r: AgeRow) => r.total },
    ...labels.map((label, i) => ({ key: `b${i}`, label, qtyOnly: false, cell: (r: AgeRow) => r.buckets[i] })),
    { key: "neg", label: "Negative Stock", qtyOnly: true, cell: (r: AgeRow) => r.neg },
  ];
  const colCount = 2 + groups.reduce((n, g) => n + (g.qtyOnly ? 1 : 2), 0);

  return (
    <div className="flex-1 flex flex-col h-full bg-white select-none text-zinc-900 font-sans text-[11px]">
      <div className="flex items-center justify-between px-3 py-1.5 bg-white border-b-2 border-zinc-900">
        <span className="font-bold text-sm tracking-wide">Stock Ageing Analysis</span>
        <span className="font-bold text-sm">{companyName || "Company"}</span>
        <span />
      </div>
      <div className="flex justify-between items-center px-3 py-1 bg-white border-b border-zinc-200 font-mono text-[11px]">
        <span className="font-semibold">Items Under: {groupLabel}</span>
        <span>as at {fmtAsAt(asAt)}</span>
      </div>
      {basis ? (
        <div className="flex justify-between items-center px-3 py-1 bg-white border-b border-zinc-300 font-mono text-[11px]">
          <span className="font-semibold">Ageing Analysis: {basis}</span>
          <span className="text-[10px] italic text-zinc-500">Valued based on Actual Transfer</span>
        </div>
      ) : (
        <div className="flex justify-between items-center px-3 py-1 bg-white border-b border-zinc-300 font-mono text-[10px] italic text-zinc-500">
          <span>All Batches (Aged by Date of Purchase)</span>
          <span>Valued based on actual purchase cost</span>
        </div>
      )}

      <div className="flex-1 overflow-auto">
        <table className="w-full border-collapse text-[11px] font-mono select-none">
          <thead className="sticky top-0 bg-[#f4f4f5] border-b border-zinc-300 z-10 text-zinc-700">
            <tr>
              <th rowSpan={2} className="px-3 py-1 text-left font-bold align-bottom border-b border-zinc-300">Particulars</th>
              <th rowSpan={2} className="px-2 py-1 text-left font-bold align-bottom border-b border-l border-zinc-200 w-24">Expiry Date</th>
              {groups.map(g => (
                <th key={g.key} colSpan={g.qtyOnly ? 1 : 2} className="px-2 py-0.5 text-center font-bold border-b border-l border-zinc-200 whitespace-nowrap">{g.label}</th>
              ))}
            </tr>
            <tr>
              {groups.map(g => (
                <React.Fragment key={g.key}>
                  <th className="px-2 py-1 text-right font-bold w-24 border-l border-zinc-200">Quantity</th>
                  {!g.qtyOnly && <th className="px-2 py-1 text-right font-bold w-28">Value</th>}
                </React.Fragment>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={colCount} className="px-4 py-8 text-center text-zinc-400 italic">Loading...</td></tr>
            ) : error ? (
              <tr><td colSpan={colCount} className="px-4 py-8 text-center text-zinc-600">{error}</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={colCount} className="px-4 py-8 text-center text-zinc-400 italic">{emptyText}</td></tr>
            ) : rows.map((r, idx) => (
              <tr
                key={r.id}
                onClick={() => onSelectIndex(idx)}
                onDoubleClick={() => onActivate?.(r, idx)}
                className={`border-b border-zinc-100 ${onActivate ? "cursor-pointer" : ""} ${idx === selectedIndex ? "bg-[#e4e4e7] text-zinc-950 font-bold" : "hover:bg-zinc-50 text-zinc-800"}`}
              >
                <td className="px-3 py-1">{r.name}</td>
                <td className="px-2 py-1 border-l border-zinc-100">{r.expiry || ""}</td>
                {groups.map(g => {
                  const c = g.cell(r);
                  return (
                    <React.Fragment key={g.key}>
                      <td className="px-2 py-1 text-right border-l border-zinc-100">{fmtQty(c.qty, r.unit)}</td>
                      {!g.qtyOnly && <td className="px-2 py-1 text-right">{fmt(c.value)}</td>}
                    </React.Fragment>
                  );
                })}
              </tr>
            ))}
          </tbody>
          {!loading && !error && rows.length > 0 && (
            <tfoot className="sticky bottom-0 z-10 bg-[#f4f4f5] text-zinc-900 font-bold">
              <tr className="border-t-2 border-zinc-300">
                <td className="px-3 py-1.5">Grand Total</td>
                <td className="px-2 py-1.5 border-l border-zinc-200" />
                {groups.map(g => {
                  // Quantities span mixed units, so the grand total sums only the band Values.
                  const c = g.key === "total" ? totals.total : g.key === "neg" ? totals.neg : totals.buckets[Number(g.key.slice(1))];
                  return (
                    <React.Fragment key={g.key}>
                      <td className="px-2 py-1.5 text-right border-l border-zinc-200" />
                      {!g.qtyOnly && <td className="px-2 py-1.5 text-right">{fmt(c.value)}</td>}
                    </React.Fragment>
                  );
                })}
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {footer}
    </div>
  );
}
