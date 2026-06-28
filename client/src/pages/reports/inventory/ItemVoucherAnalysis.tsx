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

const fmtDate = (d?: string | null) => {
  if (!d) return "";
  try { return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "2-digit" }); }
  catch { return d; }
};

const rate = (val: number | null | undefined, qty: number | null | undefined) => {
  const v = Number(val) || 0;
  const q = Number(qty) || 0;
  if (!q || !v) return "";
  return new Intl.NumberFormat("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v / q);
};

export interface VoucherRow {
  voucher_id: number | null;
  date: string | null;
  particulars: string;
  voucher_type: string;
  voucher_number: string | number;
  inwards_qty: number | null;
  inwards_value: number | null;
  outwards_qty: number | null;
  outwards_value: number | null;
  closing_qty: number;
  closing_value: number;
}

interface Props {
  itemName: string;
  companyName?: string;
  periodLabel?: string;
  rows: VoucherRow[];
  loading?: boolean;
  error?: string | null;
  selectedIndex: number;
  onSelectIndex: (i: number) => void;
  onOpenVoucher?: (row: VoucherRow) => void;
  footer?: React.ReactNode;
}

/**
 * Shared TallyPrime "Item Voucher Analysis" — per-voucher Purchases / Sales
 * (Qty, Rate, Value) with a running Closing balance for a single stock item.
 * Presentational only; parent owns selection + keyboard navigation.
 */
export default function ItemVoucherAnalysis({
  itemName, companyName, periodLabel, rows, loading, error,
  selectedIndex, onSelectIndex, onOpenVoucher, footer,
}: Props) {
  const movementRows = rows.filter(r => r.voucher_id !== null);
  const totPurchQty = movementRows.reduce((s, r) => s + (Number(r.inwards_qty)    || 0), 0);
  const totPurchVal = movementRows.reduce((s, r) => s + (Number(r.inwards_value)  || 0), 0);
  const totSalesQty = movementRows.reduce((s, r) => s + (Number(r.outwards_qty)   || 0), 0);
  const totSalesVal = movementRows.reduce((s, r) => s + (Number(r.outwards_value) || 0), 0);
  const finalCQty   = rows.length ? rows[rows.length - 1].closing_qty   : 0;
  const finalCVal   = rows.length ? rows[rows.length - 1].closing_value : 0;

  return (
    <div className="flex-1 flex flex-col h-full bg-white select-none text-zinc-900 font-sans text-[11px]">
      <div className="flex items-center justify-between px-3 py-1.5 bg-white border-b-2 border-zinc-900">
        <span className="font-bold text-sm tracking-wide">Item Voucher Analysis</span>
        <span className="font-bold text-sm">{companyName || "Company"}</span>
        <span />
      </div>
      <div className="flex justify-between items-center px-3 py-1.5 bg-white border-b border-zinc-300 font-mono text-[11px]">
        <span className="font-semibold">{itemName}</span>
        <span>{periodLabel}</span>
      </div>

      <div className="flex-1 overflow-y-auto">
        <table className="w-full border-collapse text-[11px] font-mono select-none">
          <thead className="sticky top-0 bg-[#f4f4f5] border-b border-zinc-300 z-10 text-zinc-700">
            <tr>
              <th rowSpan={2} className="px-2 py-1 text-left font-bold w-20 border-b border-zinc-300 align-bottom">Date</th>
              <th rowSpan={2} className="px-2 py-1 text-left font-bold border-b border-zinc-300 align-bottom">Particulars</th>
              <th rowSpan={2} className="px-2 py-1 text-left font-bold w-28 border-b border-zinc-300 align-bottom">Vch Type</th>
              <th rowSpan={2} className="px-2 py-1 text-right font-bold w-16 border-b border-zinc-300 align-bottom">Vch No.</th>
              <th colSpan={3} className="px-2 py-0.5 text-center font-bold border-b border-l border-zinc-200">Purchases</th>
              <th colSpan={3} className="px-2 py-0.5 text-center font-bold border-b border-l border-zinc-200">Sales</th>
              <th colSpan={2} className="px-2 py-0.5 text-center font-bold border-b border-l border-zinc-200">Closing</th>
            </tr>
            <tr>
              <th className="px-2 py-1 text-right font-bold w-20 border-l border-zinc-200">Qty</th>
              <th className="px-2 py-1 text-right font-bold w-24">Rate</th>
              <th className="px-2 py-1 text-right font-bold w-24">Value</th>
              <th className="px-2 py-1 text-right font-bold w-20 border-l border-zinc-200">Qty</th>
              <th className="px-2 py-1 text-right font-bold w-24">Rate</th>
              <th className="px-2 py-1 text-right font-bold w-24">Value</th>
              <th className="px-2 py-1 text-right font-bold w-20 border-l border-zinc-200">Qty</th>
              <th className="px-2 py-1 text-right font-bold w-24">Value</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={12} className="px-4 py-8 text-center text-zinc-400 italic">Loading...</td></tr>
            ) : error ? (
              <tr><td colSpan={12} className="px-4 py-8 text-center text-zinc-600">{error}</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={12} className="px-4 py-8 text-center text-zinc-400 italic">No records found.</td></tr>
            ) : rows.map((row, idx) => (
              <tr
                key={row.voucher_id ?? `row-${idx}`}
                onClick={() => onSelectIndex(idx)}
                onDoubleClick={() => row.voucher_id && onOpenVoucher?.(row)}
                className={`border-b border-zinc-100 cursor-pointer ${idx === selectedIndex ? "bg-[#e4e4e7] text-zinc-950 font-bold" : "hover:bg-zinc-50 text-zinc-800"}`}
              >
                <td className="px-2 py-1 whitespace-nowrap">{fmtDate(row.date)}</td>
                <td className="px-2 py-1 truncate max-w-xs">{row.particulars}</td>
                <td className="px-2 py-1">{row.voucher_type}</td>
                <td className="px-2 py-1 text-right">{row.voucher_number || ""}</td>
                <td className="px-2 py-1 text-right border-l border-zinc-100">{fmtQty(row.inwards_qty)}</td>
                <td className="px-2 py-1 text-right">{rate(row.inwards_value, row.inwards_qty)}</td>
                <td className="px-2 py-1 text-right">{fmt(row.inwards_value)}</td>
                <td className="px-2 py-1 text-right border-l border-zinc-100">{fmtQty(row.outwards_qty)}</td>
                <td className="px-2 py-1 text-right">{rate(row.outwards_value, row.outwards_qty)}</td>
                <td className="px-2 py-1 text-right">{fmt(row.outwards_value)}</td>
                <td className="px-2 py-1 text-right border-l border-zinc-100">{fmtQty(row.closing_qty)}</td>
                <td className="px-2 py-1 text-right">{fmt(row.closing_value)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="border-t-2 border-zinc-300 bg-[#f4f4f5] px-3 py-1.5 flex font-mono text-[11px] font-bold text-zinc-900 shrink-0">
        <span className="w-20" /><span className="flex-1" /><span className="w-28" /><span className="w-16" />
        <span className="w-20 text-right pr-1 border-l border-zinc-300">{fmtQty(totPurchQty)}</span>
        <span className="w-24 text-right pr-1">{rate(totPurchVal, totPurchQty)}</span>
        <span className="w-24 text-right pr-1">{fmt(totPurchVal)}</span>
        <span className="w-20 text-right pr-1 border-l border-zinc-300">{fmtQty(totSalesQty)}</span>
        <span className="w-24 text-right pr-1">{rate(totSalesVal, totSalesQty)}</span>
        <span className="w-24 text-right pr-1">{fmt(totSalesVal)}</span>
        <span className="w-20 text-right pr-1 border-l border-zinc-300">{fmtQty(finalCQty)}</span>
        <span className="w-24 text-right pr-1">{fmt(finalCVal)}</span>
      </div>

      {footer}
    </div>
  );
}
