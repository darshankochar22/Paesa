import * as React from 'react';

const amt = (val: number | null | undefined) => {
  const n = Number(val) || 0;
  if (n === 0) return '';
  return new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
};

const qtyStr = (val: number | null | undefined, unit?: string) => {
  const n = Number(val) || 0;
  if (n === 0) return '';
  const s = n.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 3 });
  return unit ? `${s} ${unit}` : s;
};

// Per-unit cost with its "/unit" suffix, e.g. "0.77/nos". Blank when zero.
const costStr = (val: number | null | undefined, unit?: string) => {
  const n = Number(val) || 0;
  if (n === 0) return '';
  const s = n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return unit ? `${s}/${unit}` : s;
};

export interface EstComponent {
  name: string;
  unit: string;
  qty: number;
  rate: number;
  amount: number;
}
export interface EstRow {
  id: React.Key;
  name: string;
  unit: string;
  qty: number;
  cost: number; // per-unit estimated cost
  amount: number;
  components: EstComponent[];
}

interface Props {
  companyName?: string;
  groupLabel: string; // "Items Under: Primary"
  bomType?: string; // "Default"
  asAt?: string;
  rows: EstRow[];
  loading?: boolean;
  error?: string | null;
  selectedIndex: number;
  onSelectIndex: (i: number) => void;
  footer?: React.ReactNode;
  expanded?: Set<React.Key>; // controlled expand set (optional)
  onToggleExpand?: (id: React.Key) => void;
}

/**
 * Cost Estimation — TallyPrime "Item Estimates" list. Particulars on the left,
 * then Qty / Cost / Amount. Each BoM item expands to its component breakdown.
 * Mirrors Tally's structure only; styling is this app's strict gray theme.
 */
export default function ItemEstimatesTable({
  companyName,
  groupLabel,
  bomType = 'Default',
  asAt,
  rows,
  loading,
  error,
  selectedIndex,
  onSelectIndex,
  footer,
  expanded: expandedProp,
  onToggleExpand,
}: Props) {
  const [expandedLocal, setExpandedLocal] = React.useState<Set<React.Key>>(new Set());
  const expanded = expandedProp ?? expandedLocal;
  const toggle = (id: React.Key) => {
    if (onToggleExpand) {
      onToggleExpand(id);
      return;
    }
    setExpandedLocal((prev) => {
      const c = new Set(prev);
      c.has(id) ? c.delete(id) : c.add(id);
      return c;
    });
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-white select-none text-black font-sans text-[11px]">
      <div className="flex items-center justify-between px-3 py-1.5 bg-white border-b-2 border-gray-200">
        <span className="font-bold text-sm tracking-wide">Item Estimates</span>
        <span className="font-bold text-sm">{companyName || 'Company'}</span>
        <span />
      </div>
      <div className="flex justify-between items-center px-3 py-1.5 bg-white border-b border-gray-200 font-mono text-[11px]">
        <span className="flex gap-6">
          <span>
            Items Under: <span className="font-semibold">{groupLabel}</span>
          </span>
          <span>
            BoM Type: <span className="font-semibold">{bomType}</span>
          </span>
        </span>
        <span>{asAt ? `as at ${asAt}` : ''}</span>
      </div>

      <div className="flex-1 overflow-y-auto">
        <table className="w-full border-collapse text-[11px] font-mono select-none">
          <thead className="sticky top-0 bg-white border-b border-gray-200 z-10 text-black">
            <tr>
              <th className="px-3 py-1 text-left font-bold">Particulars</th>
              <th className="px-2 py-1 text-right font-bold w-28 border-l border-gray-200">Qty</th>
              <th className="px-2 py-1 text-right font-bold w-24">Cost</th>
              <th className="px-2 py-1 text-right font-bold w-32">Amount</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-black italic">
                  Loading...
                </td>
              </tr>
            ) : error ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-black">
                  {error}
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-black italic">
                  No BoM items in this group.
                </td>
              </tr>
            ) : (
              rows.map((r, idx) => (
                <React.Fragment key={r.id}>
                  <tr
                    onClick={() => onSelectIndex(idx)}
                    onDoubleClick={() => toggle(r.id)}
                    className={`border-b border-gray-200 cursor-pointer ${idx === selectedIndex ? 'bg-black/[0.06] text-black font-bold' : 'hover:bg-black/[0.03] text-black'}`}
                  >
                    <td className="px-3 py-1">
                      {r.components.length > 0 && (
                        <span className="inline-block w-3 text-black">
                          {expanded.has(r.id) ? '▾' : '▸'}
                        </span>
                      )}
                      {r.name}
                    </td>
                    <td className="px-2 py-1 text-right border-l border-gray-200">
                      {qtyStr(r.qty, r.unit)}
                    </td>
                    <td className="px-2 py-1 text-right">{costStr(r.cost, r.unit)}</td>
                    <td className="px-2 py-1 text-right">{amt(r.amount)}</td>
                  </tr>
                  {expanded.has(r.id) &&
                    r.components.map((c, ci) => (
                      <tr
                        key={`${r.id}-c${ci}`}
                        className="border-b border-gray-200 text-black italic"
                      >
                        <td className="px-3 py-0.5 pl-8">{c.name}</td>
                        <td className="px-2 py-0.5 text-right border-l border-gray-200">
                          {qtyStr(c.qty, c.unit)}
                        </td>
                        <td className="px-2 py-0.5 text-right">{costStr(c.rate, c.unit)}</td>
                        <td className="px-2 py-0.5 text-right">{amt(c.amount)}</td>
                      </tr>
                    ))}
                </React.Fragment>
              ))
            )}
          </tbody>
        </table>
      </div>

      {footer}
    </div>
  );
}
