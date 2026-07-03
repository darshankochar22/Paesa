import * as React from "react";

// TallyPrime "Item Voucher Analysis" — the voucher-level leaf of the Movement
// Analysis drill chain. Filtered to a single stock item + ledger + direction.
// Columns: Date | Particulars | Actual Qty | Billed Qty | Basic Rate |
//          Basic Value | Addl. Cost | Total Value | Eff. Rate.
// The selected row expands an italic voucher sub-line (date · type · number).
// Presentational only; parent owns selection + keyboard navigation.

// ── Formatters (en-IN, Tally negatives as "(-)") ──────────────────────────
const neg = (s: string, v: number) => (v < 0 ? `(-)${s}` : s);
const fmtVal = (v: number | null | undefined) => {
  const n = Number(v) || 0;
  if (n === 0) return "";
  return neg(new Intl.NumberFormat("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Math.abs(n)), n);
};
const fmtQty = (v: number | null | undefined, unit?: string) => {
  const n = Number(v) || 0;
  if (n === 0) return "";
  const s = Math.abs(n).toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 3 });
  return neg(unit ? `${s} ${unit}` : s, n);
};
const fmtRate = (v: number | null | undefined, unit?: string) => {
  const n = Number(v) || 0;
  if (n === 0) return "";
  const s = new Intl.NumberFormat("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Math.abs(n));
  return neg(unit ? `${s}/${unit}` : s, n);
};
const MON = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const fmtDate = (d?: string | null) => {
  if (!d) return "";
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(d);
  return m ? `${Number(m[3])}-${MON[Number(m[2]) - 1]}-${m[1].slice(2)}` : d;
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
  addl_cost?: number | null;
  closing_qty: number;
  closing_value: number;
}

interface Props {
  itemName: string;
  companyName?: string;
  periodLabel?: string;
  /** Ledger the vouchers are filtered under (header line). */
  ledgerName?: string;
  /** "inward" → Purchases section, "outward" → Sales. Inferred per-row if omitted. */
  direction?: "inward" | "outward";
  unit?: string;
  rows: VoucherRow[];
  loading?: boolean;
  error?: string | null;
  selectedIndex: number;
  onSelectIndex: (i: number) => void;
  onOpenVoucher?: (row: VoucherRow) => void;
  footer?: React.ReactNode;
}

const TH = "px-2 py-1 font-bold text-zinc-700 border-b border-zinc-300";

/** One voucher row projected onto the 9-column Tally shape. Net of the opposite
 *  leg so a purchase-return (Debit Note) reads as a negative Purchases line. */
function project(r: VoucherRow, dir: "inward" | "outward") {
  const inQ = Number(r.inwards_qty) || 0,  outQ = Number(r.outwards_qty) || 0;
  const inV = Number(r.inwards_value) || 0, outV = Number(r.outwards_value) || 0;
  const qty   = dir === "inward" ? inQ - outQ : outQ - inQ;
  const basic = dir === "inward" ? inV - outV : outV - inV;
  const addl  = Number(r.addl_cost) || 0;
  const total = basic + addl;
  return {
    qty,
    basicRate: qty ? basic / qty : 0,
    basicValue: basic,
    addl,
    total,
    effRate: qty ? total / qty : 0,
  };
}

export default function ItemVoucherAnalysis({
  itemName, companyName, periodLabel, ledgerName, direction, unit,
  rows, loading, error, selectedIndex, onSelectIndex, onOpenVoucher, footer,
}: Props) {
  const dataRows = rows.filter(r => r.voucher_id !== null);
  const dirOf = (r: VoucherRow): "inward" | "outward" =>
    direction ?? ((Number(r.inwards_qty) || 0) !== 0 ? "inward" : "outward");
  const sectionLabel = direction === "outward" ? "Sales" : direction === "inward" ? "Purchases"
    : dataRows.length && dirOf(dataRows[0]) === "outward" ? "Sales" : "Purchases";
  const ledgerLabel = direction === "outward" ? "Outwards Under Ledger" : "Inwards Under Ledger";

  const tot = dataRows.reduce((a, r) => {
    const p = project(r, dirOf(r));
    a.qty += p.qty; a.basic += p.basicValue; a.addl += p.addl; a.total += p.total;
    return a;
  }, { qty: 0, basic: 0, addl: 0, total: 0 });
  const totEffRate = tot.qty ? tot.total / tot.qty : 0;
  const totBasicRate = tot.qty ? tot.basic / tot.qty : 0;

  return (
    <div className="flex-1 flex flex-col h-full bg-white select-none text-zinc-900 font-sans text-[11px]">
      {/* Title bar */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-white border-b-2 border-zinc-900">
        <span className="font-bold text-sm tracking-wide">Item Voucher Analysis</span>
        <span className="font-bold text-sm">{companyName || "Company"}</span>
        <span />
      </div>
      {/* Sub-header: stock item + ledger (left), period (right) */}
      <div className="flex justify-between items-start px-3 py-1.5 bg-white border-b border-zinc-300 font-mono text-[11px]">
        <div>
          <div><span className="text-zinc-500">Stock Item:</span> <span className="font-semibold">{itemName}</span></div>
          {ledgerName && (
            <div><span className="text-zinc-500">{ledgerLabel}:</span> <span className="font-semibold">{ledgerName}</span></div>
          )}
        </div>
        <span className="font-semibold">{periodLabel}</span>
      </div>

      <div className="flex-1 overflow-y-auto">
        <table className="w-full border-collapse text-[11px] font-mono">
          <thead className="sticky top-0 bg-zinc-100 z-10">
            <tr>
              <th className={`${TH} text-left w-20`}>Date</th>
              <th className={`${TH} text-left`}>Particulars</th>
              <th className={`${TH} text-right w-20`}>Actual Qty</th>
              <th className={`${TH} text-right w-20`}>Billed Qty</th>
              <th className={`${TH} text-right w-24 italic`}>Basic Rate</th>
              <th className={`${TH} text-right w-24`}>Basic Value</th>
              <th className={`${TH} text-right w-20 italic`}>Addl. Cost</th>
              <th className={`${TH} text-right w-24`}>Total Value</th>
              <th className={`${TH} text-right w-24 italic`}>Eff. Rate</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={9} className="px-4 py-8 text-center text-zinc-400 italic">Loading…</td></tr>
            ) : error ? (
              <tr><td colSpan={9} className="px-4 py-8 text-center text-zinc-600">{error}</td></tr>
            ) : dataRows.length === 0 ? (
              <tr><td colSpan={9} className="px-4 py-8 text-center text-zinc-400 italic">No vouchers found.</td></tr>
            ) : (
              <>
                {/* Section label (Purchases / Sales) */}
                <tr>
                  <td className="px-2 pt-2 pb-0.5" />
                  <td colSpan={8} className="px-2 pt-2 pb-0.5 font-bold italic text-zinc-800">{sectionLabel}</td>
                </tr>
                {dataRows.map((r, idx) => {
                  const dir = dirOf(r);
                  const p = project(r, dir);
                  const selected = idx === selectedIndex;
                  return (
                    <React.Fragment key={r.voucher_id ?? `row-${idx}`}>
                      <tr
                        onClick={() => onSelectIndex(idx)}
                        onDoubleClick={() => r.voucher_id && onOpenVoucher?.(r)}
                        className={`border-b border-zinc-100 cursor-pointer ${selected ? "bg-zinc-200 text-zinc-950 font-bold" : "hover:bg-zinc-50 text-zinc-800"}`}
                        title="Enter / double-click: open voucher"
                      >
                        <td className="px-2 py-1 whitespace-nowrap">{fmtDate(r.date)}</td>
                        <td className="px-2 py-1 truncate max-w-0">{r.particulars}</td>
                        <td className="px-2 py-1 text-right">{fmtQty(p.qty, unit)}</td>
                        <td className="px-2 py-1 text-right">{fmtQty(p.qty, unit)}</td>
                        <td className="px-2 py-1 text-right">{fmtRate(p.basicRate, unit)}</td>
                        <td className="px-2 py-1 text-right">{fmtVal(p.basicValue)}</td>
                        <td className="px-2 py-1 text-right">{fmtVal(p.addl)}</td>
                        <td className="px-2 py-1 text-right">{fmtVal(p.total)}</td>
                        <td className="px-2 py-1 text-right">{fmtRate(p.effRate, unit)}</td>
                      </tr>
                      {/* Voucher sub-line for the focused row (date · type · number) */}
                      {selected && (
                        <tr className="text-zinc-500">
                          <td className="px-2 py-0.5" />
                          <td colSpan={8} className="px-6 py-0.5 italic text-[10px]">
                            {fmtDate(r.date)}&nbsp;&nbsp;{r.voucher_type}&nbsp;&nbsp;{r.voucher_number}
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
                {/* Total */}
                <tr className="border-t border-zinc-900 font-bold text-zinc-900">
                  <td className="px-2 py-1" />
                  <td className="px-2 py-1 text-right">Total</td>
                  <td className="px-2 py-1 text-right">{fmtQty(tot.qty, unit)}</td>
                  <td className="px-2 py-1 text-right">{fmtQty(tot.qty, unit)}</td>
                  <td className="px-2 py-1 text-right">{fmtRate(totBasicRate, unit)}</td>
                  <td className="px-2 py-1 text-right">{fmtVal(tot.basic)}</td>
                  <td className="px-2 py-1 text-right">{fmtVal(tot.addl)}</td>
                  <td className="px-2 py-1 text-right">{fmtVal(tot.total)}</td>
                  <td className="px-2 py-1 text-right">{fmtRate(totEffRate, unit)}</td>
                </tr>
              </>
            )}
          </tbody>
        </table>
      </div>

      {footer}
    </div>
  );
}
