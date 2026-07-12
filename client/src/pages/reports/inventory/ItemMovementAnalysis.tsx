import * as React from 'react';

// TallyPrime "Item Movement Analysis" — the middle screen of the Movement
// Analysis drill chain. Two sections: Movement Inward (Suppliers) and Movement
// Outward (Buyers), each a list of ledger parties with per-party movement value.
// Columns: Particulars | Quantity | Basic Rate | Effective Rate | Value.
// Presentational only; parent owns selection + keyboard navigation.

export interface PartyMov {
  name: string;
  qty: number;
  basicValue: number; // sum of line amount (excl. additional cost)
  addl: number; // sum of additional cost
}

const neg = (s: string, v: number) => (v < 0 ? `(-)${s}` : s);
const fmtVal = (v: number) => {
  const n = Number(v) || 0;
  if (n === 0) return '';
  return neg(
    new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(
      Math.abs(n),
    ),
    n,
  );
};
const fmtQty = (v: number, unit?: string) => {
  const n = Number(v) || 0;
  if (n === 0) return '';
  const s = Math.abs(n).toLocaleString('en-IN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 3,
  });
  return neg(unit ? `${s} ${unit}` : s, n);
};
const fmtRate = (v: number) => {
  const n = Number(v) || 0;
  if (n === 0) return '';
  return neg(
    new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(
      Math.abs(n),
    ),
    n,
  );
};

export type MovSection = 'inward' | 'outward';
export interface MovCursor {
  section: MovSection;
  idx: number;
}

interface Props {
  itemName: string;
  companyName?: string;
  periodLabel?: string;
  unit?: string;
  inward: PartyMov[];
  outward: PartyMov[];
  loading?: boolean;
  error?: string | null;
  cursor: MovCursor;
  onCursor: (c: MovCursor) => void;
  onActivate: (section: MovSection, party: PartyMov) => void;
  footer?: React.ReactNode;
}

const TH = 'px-2 py-1 font-bold text-black border-b border-gray-200';

function subtotal(list: PartyMov[]) {
  const qty = list.reduce((s, r) => s + r.qty, 0);
  const basic = list.reduce((s, r) => s + r.basicValue, 0);
  const addl = list.reduce((s, r) => s + r.addl, 0);
  const total = basic + addl;
  return { qty, total, effRate: qty ? total / qty : 0 };
}

export default function ItemMovementAnalysis({
  itemName,
  companyName,
  periodLabel,
  unit,
  inward,
  outward,
  loading,
  error,
  cursor,
  onCursor,
  onActivate,
  footer,
}: Props) {
  const renderRows = (list: PartyMov[], section: MovSection, sublabel: string) => (
    <>
      <tr>
        <td colSpan={5} className="px-4 py-0.5 italic text-[10px] text-black">
          {sublabel}:
        </td>
      </tr>
      {list.length === 0 ? (
        <tr>
          <td colSpan={5} className="px-6 py-1 text-black italic">
            None
          </td>
        </tr>
      ) : (
        list.map((r, idx) => {
          const total = r.basicValue + r.addl;
          const selected = cursor.section === section && cursor.idx === idx;
          return (
            <tr
              key={r.name}
              onClick={() => onCursor({ section, idx })}
              onDoubleClick={() => onActivate(section, r)}
              className={`border-b border-gray-200 cursor-pointer ${selected ? 'bg-black/[0.06] text-black font-bold' : 'hover:bg-black/[0.03] text-black'}`}
              title="Enter / double-click: item voucher analysis"
            >
              <td className="px-6 py-1">{r.name}</td>
              <td className="px-2 py-1 text-right">{fmtQty(r.qty, unit)}</td>
              <td className="px-2 py-1 text-right">{fmtRate(r.qty ? r.basicValue / r.qty : 0)}</td>
              <td className="px-2 py-1 text-right">{fmtRate(r.qty ? total / r.qty : 0)}</td>
              <td className="px-2 py-1 text-right">{fmtVal(total)}</td>
            </tr>
          );
        })
      )}
      {list.length > 0 &&
        (() => {
          const st = subtotal(list);
          return (
            <tr className="border-t border-gray-200 font-bold text-black">
              <td className="px-6 py-1" />
              <td className="px-2 py-1 text-right">{fmtQty(st.qty, unit)}</td>
              <td className="px-2 py-1" />
              <td className="px-2 py-1 text-right">{fmtRate(st.effRate)}</td>
              <td className="px-2 py-1 text-right">{fmtVal(st.total)}</td>
            </tr>
          );
        })()}
    </>
  );

  return (
    <div className="flex-1 flex flex-col h-full bg-white select-none text-black font-sans text-[11px]">
      {/* Title bar */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-white border-b-2 border-gray-200">
        <span className="font-bold text-sm tracking-wide">Item Movement Analysis</span>
        <span className="font-bold text-sm">{companyName || 'Company'}</span>
        <span />
      </div>
      {/* Sub-header: item (left), period + Movement Values (right) */}
      <div className="flex justify-between items-center px-3 py-1.5 bg-white border-b border-gray-200 font-mono text-[11px]">
        <span>
          <span className="text-black">Stock Item:</span>{' '}
          <span className="font-semibold">{itemName}</span>
        </span>
        <span className="text-black">Movement Values&nbsp;&nbsp;{periodLabel}</span>
      </div>

      <div className="flex-1 overflow-y-auto">
        <table className="w-full border-collapse text-[11px] font-mono">
          <thead className="sticky top-0 bg-black/[0.06] z-10">
            <tr>
              <th className={`${TH} text-left`}>Particulars</th>
              <th className={`${TH} text-right w-28`}>Quantity</th>
              <th className={`${TH} text-right w-28 italic`}>Basic Rate</th>
              <th className={`${TH} text-right w-32 italic`}>Effective Rate</th>
              <th className={`${TH} text-right w-32`}>Value</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-black italic">
                  Loading…
                </td>
              </tr>
            ) : error ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-black">
                  {error}
                </td>
              </tr>
            ) : (
              <>
                <tr className="bg-white border-t border-gray-200">
                  <td colSpan={5} className="px-2 py-1 font-bold text-black">
                    Movement Inward:
                  </td>
                </tr>
                {renderRows(inward, 'inward', 'Suppliers')}
                <tr>
                  <td colSpan={5} className="py-2" />
                </tr>
                <tr className="bg-white border-t border-gray-200">
                  <td colSpan={5} className="px-2 py-1 font-bold text-black">
                    Movement Outward:
                  </td>
                </tr>
                {renderRows(outward, 'outward', 'Buyers')}
              </>
            )}
          </tbody>
        </table>
      </div>

      {footer}
    </div>
  );
}
