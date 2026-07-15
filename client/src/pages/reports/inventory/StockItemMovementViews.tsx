import StockBarChart, { type ChartBar } from './StockBarChart';

// Shared presentational tables for the two lower levels of every stock drill
// (Stock Group Summary, Closing-Stock Stock Summary, …). Keyboard/selection
// state stays in the parent; these just render.

export interface MonthRow {
  month: string;
  in_qty: number;
  in_value: number;
  out_qty: number;
  out_value: number;
  closing_qty: number;
  closing_value: number;
}

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

export const fmtAmount = (val: number | null | undefined) => {
  const n = Number(val) || 0;
  if (n === 0) return '';
  return new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
};

export const fmtQty = (val: number | null | undefined, unit?: string) => {
  const n = Number(val) || 0;
  if (n === 0) return '';
  const num = n.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
  return unit ? `${num} ${unit}` : num;
};

export const formatDate = (dateStr?: string | null) => {
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

// ── Stock Item Monthly Summary ────────────────────────────────────────────
export function StockItemMonthlyView(props: {
  companyName?: string;
  itemName: string;
  periodLabel: string;
  months: MonthRow[];
  opening: { qty: number; value: number };
  loading: boolean;
  error: string | null;
  selectedIndex: number;
  onSelect: (i: number) => void;
  onDrill: (i: number) => void;
  footerLabel: string;
  onFooter: () => void;
}) {
  const { months, opening } = props;
  const totIn = months.reduce((s, r) => s + (Number(r.in_qty) || 0), 0);
  const totInVal = months.reduce((s, r) => s + (Number(r.in_value) || 0), 0);
  const totOut = months.reduce((s, r) => s + (Number(r.out_qty) || 0), 0);
  const totOutVal = months.reduce((s, r) => s + (Number(r.out_value) || 0), 0);
  const lastClosingQty = months.length ? months[months.length - 1].closing_qty : 0;
  const lastClosingVal = months.length ? months[months.length - 1].closing_value : 0;
  const bars: ChartBar[] = months.map((r) => ({
    label: r.month.length > 4 ? r.month.slice(0, 3) : r.month,
    value: r.closing_qty,
  }));

  return (
    <div className="flex-1 flex flex-col h-full bg-white select-none text-black font-sans text-[11px]">
      <div className="flex items-center justify-between px-3 py-1.5 bg-white border-b-2 border-gray-200">
        <span className="font-bold text-sm tracking-wide">Stock Item Monthly Summary</span>
        <span className="font-bold text-sm">{props.companyName || 'Company'}</span>
        <span />
      </div>
      <div className="flex justify-between items-center px-3 py-1.5 bg-white border-b border-gray-200 font-mono">
        <span>
          Stock Item: <span className="font-bold">{props.itemName}</span>
        </span>
        <span>{props.periodLabel}</span>
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
              <th className="px-3 py-1 text-right font-bold w-20 border-l border-gray-200">
                Quantity
              </th>
              <th className="px-3 py-1 text-right font-bold w-24">Value</th>
              <th className="px-3 py-1 text-right font-bold w-20 border-l border-gray-200">
                Quantity
              </th>
              <th className="px-3 py-1 text-right font-bold w-24">Value</th>
              <th className="px-3 py-1 text-right font-bold w-20 border-l border-gray-200">
                Quantity
              </th>
              <th className="px-3 py-1 text-right font-bold w-24">Value</th>
            </tr>
          </thead>
          <tbody>
            {props.loading ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-black italic">
                  Loading...
                </td>
              </tr>
            ) : props.error ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-black">
                  {props.error}
                </td>
              </tr>
            ) : (
              <>
                <tr className="border-b border-gray-200 italic text-black">
                  <td className="px-3 py-1">Opening Balance</td>
                  <td className="px-3 py-1 text-right border-l border-gray-200" />
                  <td className="px-3 py-1 text-right" />
                  <td className="px-3 py-1 text-right border-l border-gray-200" />
                  <td className="px-3 py-1 text-right" />
                  <td className="px-3 py-1 text-right border-l border-gray-200">
                    {fmtQty(opening.qty)}
                  </td>
                  <td className="px-3 py-1 text-right">{fmtAmount(opening.value)}</td>
                </tr>
                {months.map((row, idx) => {
                  const isFocused = idx === props.selectedIndex;
                  return (
                    <tr
                      key={row.month}
                      onClick={() => props.onSelect(idx)}
                      onDoubleClick={() => props.onDrill(idx)}
                      className={`border-b border-gray-200 cursor-pointer ${isFocused ? 'bg-black/[0.06] text-black font-bold' : 'hover:bg-black/[0.03] text-black'}`}
                    >
                      <td className="px-3 py-1">{row.month}</td>
                      <td className="px-3 py-1 text-right border-l border-gray-200">
                        {fmtQty(row.in_qty)}
                      </td>
                      <td className="px-3 py-1 text-right">{fmtAmount(row.in_value)}</td>
                      <td className="px-3 py-1 text-right border-l border-gray-200">
                        {fmtQty(row.out_qty)}
                      </td>
                      <td className="px-3 py-1 text-right">{fmtAmount(row.out_value)}</td>
                      <td className="px-3 py-1 text-right border-l border-gray-200">
                        {fmtQty(row.closing_qty)}
                      </td>
                      <td className="px-3 py-1 text-right">{fmtAmount(row.closing_value)}</td>
                    </tr>
                  );
                })}
              </>
            )}
          </tbody>
        </table>
      </div>

      {bars.length > 0 && <StockBarChart bars={bars} selectedIndex={props.selectedIndex} />}

      <div className="border-t-2 border-black bg-white px-3 py-1.5 flex font-mono text-[11px] font-bold text-black shrink-0">
        <span className="flex-1">Grand Total</span>
        <span className="w-20 text-right border-l border-gray-200 pr-2">{fmtQty(totIn)}</span>
        <span className="w-24 text-right pr-2">{fmtAmount(totInVal)}</span>
        <span className="w-20 text-right border-l border-gray-200 pr-2">{fmtQty(totOut)}</span>
        <span className="w-24 text-right pr-2">{fmtAmount(totOutVal)}</span>
        <span className="w-20 text-right border-l border-gray-200 pr-2">
          {fmtQty(lastClosingQty)}
        </span>
        <span className="w-24 text-right pr-2">{fmtAmount(lastClosingVal)}</span>
      </div>

      <div className="flex items-center gap-4 px-3 py-1 border-t border-gray-200 bg-white text-[10px] font-semibold text-black shrink-0">
        <button onClick={props.onFooter} className="hover:underline hover:text-black">
          {props.footerLabel}
        </button>
      </div>
    </div>
  );
}

// ── Stock Item Vouchers ───────────────────────────────────────────────────
export function StockItemVouchersView(props: {
  companyName?: string;
  itemName: string;
  periodLabel: string;
  rows: StockVoucherRow[];
  loading: boolean;
  error: string | null;
  selectedIndex: number;
  onSelect: (i: number) => void;
  onOpen: (row: StockVoucherRow) => void;
  footerLabel: string;
  onFooter: () => void;
}) {
  const { rows } = props;
  const totalInQty = rows.reduce((s, r) => s + (Number(r.inwards_qty) || 0), 0);
  const totalInValue = rows.reduce((s, r) => s + (Number(r.inwards_value) || 0), 0);
  const totalOutQty = rows.reduce((s, r) => s + (Number(r.outwards_qty) || 0), 0);
  const totalOutValue = rows.reduce((s, r) => s + (Number(r.outwards_value) || 0), 0);
  const finalClosingQty = rows.length ? rows[rows.length - 1].closing_qty : 0;
  const finalClosingValue = rows.length ? rows[rows.length - 1].closing_value : 0;

  return (
    <div className="flex-1 flex flex-col h-full bg-white select-none text-black font-sans text-[11px]">
      <div className="flex items-center justify-between px-3 py-1.5 bg-white border-b-2 border-gray-200">
        <span className="font-bold text-sm tracking-wide">Stock Item Vouchers</span>
        <span className="font-bold text-sm">{props.companyName || 'Company'}</span>
        <span />
      </div>
      <div className="flex justify-between items-center px-3 py-1.5 bg-white border-b border-gray-200 font-mono">
        <span>
          Stock Item: <span className="font-bold">{props.itemName}</span>
        </span>
        <span>{props.periodLabel}</span>
      </div>

      <div className="flex-1 overflow-y-auto">
        <table className="w-full border-collapse text-[11px] font-mono select-none">
          <thead className="sticky top-0 bg-white border-b border-gray-200 z-10 text-black">
            <tr>
              <th
                rowSpan={2}
                className="px-3 py-1 text-left font-bold w-20 border-b border-gray-200 align-bottom"
              >
                Date
              </th>
              <th
                rowSpan={2}
                className="px-3 py-1 text-left font-bold border-b border-gray-200 align-bottom"
              >
                Particulars
              </th>
              <th
                rowSpan={2}
                className="px-3 py-1 text-left font-bold w-28 border-b border-gray-200 align-bottom"
              >
                Vch Type
              </th>
              <th
                rowSpan={2}
                className="px-3 py-1 text-right font-bold w-20 border-b border-gray-200 align-bottom"
              >
                Vch No.
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
                Closing
              </th>
            </tr>
            <tr>
              <th className="px-3 py-1 text-right font-bold w-20 border-l border-gray-200">
                Quantity
              </th>
              <th className="px-3 py-1 text-right font-bold w-24">Value</th>
              <th className="px-3 py-1 text-right font-bold w-20 border-l border-gray-200">
                Quantity
              </th>
              <th className="px-3 py-1 text-right font-bold w-24">Value</th>
              <th className="px-3 py-1 text-right font-bold w-20 border-l border-gray-200">
                Quantity
              </th>
              <th className="px-3 py-1 text-right font-bold w-24">Value</th>
            </tr>
          </thead>
          <tbody>
            {props.loading ? (
              <tr>
                <td colSpan={10} className="px-4 py-8 text-center text-black italic">
                  Loading vouchers...
                </td>
              </tr>
            ) : props.error ? (
              <tr>
                <td colSpan={10} className="px-4 py-8 text-center text-black">
                  {props.error}
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={10} className="px-4 py-8 text-center text-black italic">
                  No records found.
                </td>
              </tr>
            ) : (
              rows.map((row, idx) => {
                const isFocused = idx === props.selectedIndex;
                return (
                  <tr
                    key={row.voucher_id ?? `open-${idx}`}
                    onClick={() => props.onSelect(idx)}
                    onDoubleClick={() => props.onOpen(row)}
                    className={`border-b border-gray-200 cursor-pointer ${isFocused ? 'bg-black/[0.06] text-black font-bold' : 'hover:bg-black/[0.03] text-black'}`}
                  >
                    <td className="px-3 py-1 whitespace-nowrap">{formatDate(row.date)}</td>
                    <td className="px-3 py-1 truncate max-w-xs">{row.particulars}</td>
                    <td className="px-3 py-1">{row.voucher_type}</td>
                    <td className="px-3 py-1 text-right">{row.voucher_number || ''}</td>
                    <td className="px-3 py-1 text-right border-l border-gray-200">
                      {fmtQty(row.inwards_qty)}
                    </td>
                    <td className="px-3 py-1 text-right">{fmtAmount(row.inwards_value)}</td>
                    <td className="px-3 py-1 text-right border-l border-gray-200">
                      {fmtQty(row.outwards_qty)}
                    </td>
                    <td className="px-3 py-1 text-right">{fmtAmount(row.outwards_value)}</td>
                    <td className="px-3 py-1 text-right border-l border-gray-200">
                      {fmtQty(row.closing_qty)}
                    </td>
                    <td className="px-3 py-1 text-right">{fmtAmount(row.closing_value)}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <div className="border-t border-gray-200 px-3 py-1 text-center text-[10px] italic text-black">
        Totals as per 'Default' valuation :
      </div>
      <div className="border-t-2 border-black bg-white px-3 py-1.5 flex font-mono text-[11px] font-bold text-black shrink-0">
        <span className="w-20" />
        <span className="flex-1" />
        <span className="w-28" />
        <span className="w-20" />
        <span className="w-20 text-right pr-2 border-l border-gray-200">{fmtQty(totalInQty)}</span>
        <span className="w-24 text-right pr-2">{fmtAmount(totalInValue)}</span>
        <span className="w-20 text-right pr-2 border-l border-gray-200">{fmtQty(totalOutQty)}</span>
        <span className="w-24 text-right pr-2">{fmtAmount(totalOutValue)}</span>
        <span className="w-20 text-right pr-2 border-l border-gray-200">
          {fmtQty(finalClosingQty)}
        </span>
        <span className="w-24 text-right pr-2">{fmtAmount(finalClosingValue)}</span>
      </div>

      <div className="flex items-center gap-4 px-3 py-1 border-t border-gray-200 bg-white text-[10px] font-semibold text-black shrink-0">
        <button onClick={props.onFooter} className="hover:underline hover:text-black">
          {props.footerLabel}
        </button>
      </div>
    </div>
  );
}
