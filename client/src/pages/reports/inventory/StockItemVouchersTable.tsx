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

const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const fmtDate = (d?: string | null) => {
  if (!d) return '';
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(d);
  return m ? `${Number(m[3])}-${MON[Number(m[2]) - 1]}-${m[1].slice(2)}` : d;
};

export interface StockVoucherRow {
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
  unit?: string;
  rows: StockVoucherRow[];
  loading?: boolean;
  error?: string | null;
  selectedIndex: number;
  onSelectIndex: (i: number) => void;
  onOpenVoucher?: (row: StockVoucherRow) => void;
  footer?: React.ReactNode;
}

/**
 * TallyPrime "Stock Item Vouchers" — per-voucher Inwards / Outwards with a running
 * Closing balance for a single stock item, scoped to a date range. Matches the
 * Tally screen (Quantity + Value per side, no Rate column) and shows the
 * "Totals as per 'Default' valuation" line. Presentational only.
 */
export default function StockItemVouchersTable({
  itemName,
  companyName,
  periodLabel,
  unit,
  rows,
  loading,
  error,
  selectedIndex,
  onSelectIndex,
  onOpenVoucher,
  footer,
}: Props) {
  const t = rows
    .filter((r) => r.voucher_id !== null)
    .reduce(
      (a, r) => ({
        inQ: a.inQ + (Number(r.inwards_qty) || 0),
        inV: a.inV + (Number(r.inwards_value) || 0),
        outQ: a.outQ + (Number(r.outwards_qty) || 0),
        outV: a.outV + (Number(r.outwards_value) || 0),
      }),
      { inQ: 0, inV: 0, outQ: 0, outV: 0 },
    );
  const finalCQty = rows.length ? rows[rows.length - 1].closing_qty : 0;
  const finalCVal = rows.length ? rows[rows.length - 1].closing_value : 0;

  const num = 'px-2 py-1 text-right';

  return (
    <div className="flex-1 flex flex-col h-full bg-white select-none text-black font-sans text-[11px]">
      <div className="flex items-center justify-between px-3 py-1.5 bg-white border-b-2 border-gray-200">
        <span className="font-bold text-sm tracking-wide">Stock Item Vouchers</span>
        <span className="font-bold text-sm">{companyName || 'Company'}</span>
        <span />
      </div>
      <div className="flex justify-between items-center px-3 py-1.5 bg-white border-b border-gray-200 font-mono text-[11px]">
        <span className="font-semibold">Stock Item: {itemName}</span>
        <span>{periodLabel}</span>
      </div>

      <div className="flex-1 overflow-y-auto">
        <table className="w-full border-collapse text-[11px] font-mono select-none">
          <thead className="sticky top-0 bg-white border-b border-gray-200 z-10 text-black">
            <tr>
              <th
                rowSpan={2}
                className="px-2 py-1 text-left font-bold w-20 border-b border-gray-200 align-bottom"
              >
                Date
              </th>
              <th
                rowSpan={2}
                className="px-2 py-1 text-left font-bold border-b border-gray-200 align-bottom"
              >
                Particulars
              </th>
              <th
                rowSpan={2}
                className="px-2 py-1 text-left font-bold w-28 border-b border-gray-200 align-bottom"
              >
                Vch Type
              </th>
              <th
                rowSpan={2}
                className="px-2 py-1 text-right font-bold w-16 border-b border-gray-200 align-bottom"
              >
                Vch No.
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
              <th
                colSpan={2}
                className="px-2 py-0.5 text-center font-bold border-b border-l border-gray-200"
              >
                Closing
              </th>
            </tr>
            <tr>
              <th className="px-2 py-1 text-right font-bold w-24 border-l border-gray-200">
                Quantity
              </th>
              <th className="px-2 py-1 text-right font-bold w-28">Value</th>
              <th className="px-2 py-1 text-right font-bold w-24 border-l border-gray-200">
                Quantity
              </th>
              <th className="px-2 py-1 text-right font-bold w-28">Value</th>
              <th className="px-2 py-1 text-right font-bold w-24 border-l border-gray-200">
                Quantity
              </th>
              <th className="px-2 py-1 text-right font-bold w-28">Value</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={10} className="px-4 py-8 text-center text-black italic">
                  Loading...
                </td>
              </tr>
            ) : error ? (
              <tr>
                <td colSpan={10} className="px-4 py-8 text-center text-black">
                  {error}
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={10} className="px-4 py-8 text-center text-black italic">
                  No records found.
                </td>
              </tr>
            ) : (
              rows.map((row, idx) => (
                <tr
                  key={row.voucher_id ?? `row-${idx}`}
                  // Single click opens the voucher (Tally's Enter); the opening-balance
                  // row has no voucher_id, so it just selects.
                  onClick={() =>
                    row.voucher_id && onOpenVoucher ? onOpenVoucher(row) : onSelectIndex(idx)
                  }
                  onDoubleClick={() => row.voucher_id && onOpenVoucher?.(row)}
                  className={`border-b border-gray-200 ${row.voucher_id ? 'cursor-pointer' : ''} ${idx === selectedIndex ? 'bg-black/[0.06] text-black font-bold' : 'hover:bg-black/[0.03] text-black'}`}
                >
                  <td className="px-2 py-1 whitespace-nowrap">{fmtDate(row.date)}</td>
                  <td className={`px-2 py-1 truncate max-w-xs ${!row.voucher_id ? 'italic' : ''}`}>
                    {row.particulars}
                  </td>
                  <td className="px-2 py-1">{row.voucher_type}</td>
                  <td className="px-2 py-1 text-right">{row.voucher_number || ''}</td>
                  <td className={`${num} border-l border-gray-200`}>
                    {fmtQty(row.inwards_qty, unit)}
                  </td>
                  <td className={num}>{fmt(row.inwards_value)}</td>
                  <td className={`${num} border-l border-gray-200`}>
                    {fmtQty(row.outwards_qty, unit)}
                  </td>
                  <td className={num}>{fmt(row.outwards_value)}</td>
                  <td className={`${num} border-l border-gray-200`}>
                    {fmtQty(row.closing_qty, unit)}
                  </td>
                  <td className={num}>{fmt(row.closing_value)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="border-t-2 border-black bg-white px-3 py-1.5 flex font-mono text-[11px] font-bold text-black shrink-0">
        <span className="w-20 shrink-0" />
        <span className="flex-1 italic font-semibold">Totals as per 'Default' valuation :</span>
        <span className="w-28 shrink-0" />
        <span className="w-16 shrink-0" />
        <span className="w-24 text-right pr-1 border-l border-gray-200">{fmtQty(t.inQ, unit)}</span>
        <span className="w-28 text-right pr-1">{fmt(t.inV)}</span>
        <span className="w-24 text-right pr-1 border-l border-gray-200">
          {fmtQty(t.outQ, unit)}
        </span>
        <span className="w-28 text-right pr-1">{fmt(t.outV)}</span>
        <span className="w-24 text-right pr-1 border-l border-gray-200">
          {fmtQty(finalCQty, unit)}
        </span>
        <span className="w-28 text-right pr-1">{fmt(finalCVal)}</span>
      </div>

      {footer}
    </div>
  );
}
