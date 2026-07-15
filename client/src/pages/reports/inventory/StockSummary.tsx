import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCompany } from '../../../context/CompanyContext';
import { cn } from '@/lib/utils';
import type { StockSummaryGroupNode } from '@/types/api/Transactions';
import StockItemVouchersTable, { type StockVoucherRow } from './StockItemVouchersTable';

interface StockItem {
  item_id: number;
  item_name: string;
  group_name: string;
  unit_name: string;
  closing_qty: number;
  closing_value: number;
  rate: number;
}

interface MonthRow {
  month: string;
  in_qty: number;
  in_value: number;
  out_qty: number;
  out_value: number;
  closing_qty: number;
  closing_value: number;
}

// A row visible at the current drill level: either a child stock group
// (drills further into the tree) or a leaf stock item (drills to monthly).
type Row = { kind: 'group'; node: StockSummaryGroupNode } | { kind: 'item'; item: StockItem };

// "groups" covers every depth of the stock-group tree (root and nested,
// since a node's shape is identical at any depth), then "monthly" for a single
// item's month-wise movement, then "vouchers" for the vouchers within one month.
type Level = 'groups' | 'monthly' | 'vouchers';

const pad2 = (n: number) => String(n).padStart(2, '0');
const MON3 = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const dmyLabel = (iso: string) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  return m ? `${Number(m[3])}-${MON3[Number(m[2]) - 1]}-${m[1].slice(2)}` : iso;
};
// Calendar range for a month index (0 = April) within an Apr–Mar financial year.
const monthRange = (fyStartYear: number, idx: number) => {
  const raw = idx + 4;
  const y = raw > 12 ? fyStartYear + 1 : fyStartYear;
  const m = raw > 12 ? raw - 12 : raw;
  const lastDay = new Date(y, m, 0).getDate();
  return { from: `${y}-${pad2(m)}-01`, to: `${y}-${pad2(m)}-${pad2(lastDay)}` };
};

const fmt = (val: number, digits = 2): string => {
  if (val === 0) return '';
  return new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(val);
};

const fmtQty = (val: number): string => {
  if (val === 0) return '';
  return new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(val);
};

const fmtTick = (v: number): string => {
  if (Math.abs(v) < 0.5) return '0';
  if (Math.abs(v) >= 100000) return `${(v / 100000).toFixed(1)}L`;
  return Math.round(v).toLocaleString('en-IN');
};

// Line chart of monthly Closing Stock Value. Handles NEGATIVE values: the zero
// line sits proportionally inside the plot (top = max, bottom = min) so a month
// whose closing value is negative dips BELOW the baseline — matching Tally's
// downward bars for negative stock. Axis ticks span the real min…max range
// (they were previously all "0" because only the positive max was used).
function MonthlyChart({ months }: { months: MonthRow[] }) {
  const W = 520,
    H = 140;
  const PADL = 60,
    PADR = 20,
    PADT = 20,
    PADB = 36;
  const chartW = W - PADL - PADR;
  const chartH = H - PADT - PADB;

  const values = months.map((m) => m.closing_value);
  // Always include the zero line in range so the baseline is meaningful.
  const maxVal = Math.max(0, ...values);
  const minVal = Math.min(0, ...values);
  const flat = maxVal - minVal < 1e-9; // every closing value is 0
  const span = flat ? 1 : maxVal - minVal;
  // When flat (all-zero) put the line/baseline in the vertical middle.
  const yFor = (v: number) => (flat ? PADT + chartH / 2 : PADT + ((maxVal - v) / span) * chartH);

  const points = months.map((m, i) => {
    const x = PADL + (months.length > 1 ? i / (months.length - 1) : 0.5) * chartW;
    return { x, y: yFor(m.closing_value), m };
  });

  const pathD = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`)
    .join(' ');

  // Ticks across the real min…max span (deduped by label so repeats collapse;
  // a flat 0 series shows a single "0").
  const yTicks = flat
    ? [{ v: 0, y: PADT + chartH / 2 }]
    : Array.from(
        new Map(
          [0, 0.25, 0.5, 0.75, 1].map((f) => {
            const v = minVal + f * span;
            return [fmtTick(v), { v, y: PADT + chartH - f * chartH }] as const;
          }),
        ).values(),
      );
  const zeroY = yFor(0);

  const [hovered, setHovered] = useState<number | null>(null);

  return (
    <svg width={W} height={H} className="font-mono text-[9px]">
      {yTicks.map((t, i) => (
        <line
          key={i}
          x1={PADL}
          y1={t.y}
          x2={W - PADR}
          y2={t.y}
          stroke="#e4e4e7"
          strokeDasharray="3,3"
        />
      ))}

      {yTicks.map((t, i) => (
        <text key={i} x={PADL - 4} y={t.y + 3} textAnchor="end" fill="#71717a" fontSize={9}>
          {fmtTick(t.v)}
        </text>
      ))}

      <line x1={PADL} y1={PADT} x2={PADL} y2={PADT + chartH} stroke="#d4d4d8" />
      {/* Solid zero baseline — bars/points below it are negative stock value. */}
      <line x1={PADL} y1={zeroY} x2={W - PADR} y2={zeroY} stroke="#a1a1aa" strokeWidth={1} />

      <path d={pathD} fill="none" stroke="#52525b" strokeWidth={1.5} />

      {points.map((p, i) => (
        <g key={i}>
          <circle
            cx={p.x}
            cy={p.y}
            r={hovered === i ? 4 : 2.5}
            fill={hovered === i ? '#71717a' : '#52525b'}
            stroke="white"
            strokeWidth={1}
            onMouseEnter={() => setHovered(i)}
            onMouseLeave={() => setHovered(null)}
            style={{ cursor: 'default' }}
          />

          <text x={p.x} y={PADT + chartH + 14} textAnchor="middle" fill="#71717a" fontSize={8}>
            {p.m.month.slice(0, 3)}
          </text>
        </g>
      ))}
      {/* Tooltip */}
      {hovered !== null &&
        (() => {
          const p = points[hovered];
          const label = `₹${fmt(p.m.closing_value)}`;
          const tx = Math.min(p.x + 6, W - PADR - 80);
          return (
            <g>
              <rect
                x={tx}
                y={p.y - 18}
                width={70}
                height={14}
                rx={2}
                fill="#18181b"
                opacity={0.85}
              />
              <text x={tx + 4} y={p.y - 7} fill="white" fontSize={9}>
                {label}
              </text>
            </g>
          );
        })()}
    </svg>
  );
}

// `opening` renders the Opening Stock Summary (the P&L "Opening Stock" drill):
// the stock items' own opening balances instead of the movement-based closing
// valuation. Same grouping/nesting UI — only the data source and column labels
// differ, and the per-item monthly drill (a movement view) is disabled.
export default function StockSummary({ opening = false }: { opening?: boolean }) {
  const navigate = useNavigate();
  const { selectedCompany, activeFY } = useCompany();

  const reportLabel = opening ? 'Opening Stock Summary' : 'Stock Summary';
  const qtyHeader = opening ? 'Quantity' : 'Closing Qty';
  const valueHeader = opening ? 'Value' : 'Closing Value';

  // ── Level state ────────────────────────────────────────────────────────────
  // "groups" handles every depth of the stock-group tree. rootGroups never
  // changes after load; groupPath is the stack of group nodes drilled into so
  // far (e.g. [Choco, Dairy Milk] once you've drilled two levels deep). The
  // rows shown at any time are the childGroups + items of the last entry in
  // groupPath, or rootGroups if the path is empty.
  const [level, setLevel] = useState<Level>('groups');
  const [rootGroups, setRootGroups] = useState<StockSummaryGroupNode[]>([]);
  // Items with no stock group at all sit as bare rows at root, beside the
  // top-level groups - e.g. Fruits/Icecream/Kj next to the Choco group -
  // not wrapped in a synthetic "Ungrouped" group.
  const [rootItems, setRootItems] = useState<StockItem[]>([]);
  const [groupPath, setGroupPath] = useState<StockSummaryGroupNode[]>([]);
  const [totalClosingValue, setTotalClosingValue] = useState(0);
  const [totalClosingQty, setTotalClosingQty] = useState(0);
  const [totalQtyDisplayable, setTotalQtyDisplayable] = useState(true);

  const [selectedItem, setSelectedItem] = useState<StockItem | null>(null);
  const [monthlyData, setMonthlyData] = useState<{
    item_name: string;
    opening_qty: number;
    opening_value: number;
    months: MonthRow[];
  } | null>(null);

  // Level 4 — vouchers within a drilled month.
  const [voucherRows, setVoucherRows] = useState<StockVoucherRow[]>([]);
  const [voucherPeriod, setVoucherPeriod] = useState('');
  const [voucherLoading, setVoucherLoading] = useState(false);
  const [voucherError, setVoucherError] = useState<string | null>(null);

  // ── UI state ───────────────────────────────────────────────────────────────
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [focusedIndex, setFocusedIndex] = useState(0);

  const companyId = selectedCompany?.company_id;
  const fyId = activeFY?.fy_id;
  const companyName = selectedCompany?.name || '';
  const fyLabel = activeFY?.start_date
    ? (() => {
        const d = new Date(activeFY.start_date);
        return `1-Apr-${d.getFullYear()} to 31-Mar-${d.getFullYear() + 1}`;
      })()
    : '';

  // The group node currently being viewed, or null if we're at the root.
  const currentGroup = groupPath.length > 0 ? groupPath[groupPath.length - 1] : null;

  // Rows for the current level: child groups first (so sub-groups always
  // list above leaf items, matching Tally), then this node's own direct
  // items (or the bare ungrouped root items, if we're at the root), each
  // filtered down to ones with real activity.
  const currentRows: Row[] = useMemo(() => {
    const childGroups = currentGroup ? currentGroup.childGroups : rootGroups;
    const directItems = currentGroup ? currentGroup.items : rootItems;

    const groupRows: Row[] = childGroups
      .filter((g) => g.closing_value !== 0 || g.closing_qty !== 0)
      .map((node) => ({ kind: 'group' as const, node }));

    const itemRows: Row[] = directItems
      .filter((it) => it.closing_qty !== 0 || it.closing_value !== 0)
      .map((item) => ({ kind: 'item' as const, item }));

    return [...groupRows, ...itemRows];
  }, [currentGroup, rootGroups, rootItems]);

  const currentRowsTotal = useMemo(() => {
    const qty = currentRows.reduce(
      (s, r) => s + (r.kind === 'group' ? r.node.closing_qty : r.item.closing_qty),
      0,
    );
    const value = currentRows.reduce(
      (s, r) => s + (r.kind === 'group' ? r.node.closing_value : r.item.closing_value),
      0,
    );
    // Tally blanks the total row's Quantity column whenever the rows being
    // totalled don't share one common unit - same rule as a group node, just
    // applied across whatever's currently on screen. A group row that's
    // already qty-blank (mixed units underneath) is excluded rather than
    // treated as unit "" so it can't falsely force a mismatch.
    const unitsInPlay = new Set(
      currentRows
        .filter((r) => (r.kind === 'group' ? r.node.qty_displayable : true))
        .map((r) => (r.kind === 'group' ? r.node.unit_name : r.item.unit_name) || '')
        .filter((u) => u !== ''),
    );
    const qtyDisplayable = unitsInPlay.size <= 1;
    return { qty: qtyDisplayable ? qty : 0, value, qtyDisplayable };
  }, [currentRows]);

  // ── Visible rows for keyboard nav ──────────────────────────────────────────
  const visibleRows: Array<{ id: string | number; label: string }> = (() => {
    if (level === 'groups') {
      return currentRows.map((r) =>
        r.kind === 'group'
          ? { id: `g-${r.node.group_id}`, label: r.node.group_name }
          : { id: `i-${r.item.item_id}`, label: r.item.item_name },
      );
    }
    if (level === 'monthly')
      return monthlyData ? monthlyData.months.map((m, i) => ({ id: i, label: m.month })) : [];
    if (level === 'vouchers') return voucherRows.map((r, i) => ({ id: i, label: r.particulars }));
    return [];
  })();

  // ── Data loading ───────────────────────────────────────────────────────────
  const loadGroups = useCallback(async () => {
    if (!companyId || !fyId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = opening
        ? await window.api.report.openingStockSummary(companyId, fyId)
        : await window.api.report.stockSummary(companyId, fyId, undefined, 'FIFO');
      if (!res.success) throw new Error(res.error || 'Failed to load stock summary');
      // Hide groups with no activity (zero closing qty and value) — Tally does
      // not list an empty stock group in Stock Summary.
      const nonEmpty = (res.groups as StockSummaryGroupNode[]).filter(
        (g) => g.closing_value !== 0 || g.closing_qty !== 0,
      );
      setRootGroups(nonEmpty);
      setRootItems(res.rootItems || []);
      setGroupPath([]);
      setLevel('groups');
      setTotalClosingValue(res.totalClosingValue || 0);
      setTotalClosingQty(res.totalClosingQty || 0);
      setTotalQtyDisplayable(res.totalQtyDisplayable !== false);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [companyId, fyId, opening]);

  const loadItemMonthly = useCallback(
    async (item: StockItem) => {
      if (!companyId || !fyId) return;
      setLoading(true);
      setError(null);
      try {
        const res = await (window as any).api.report.run('stock_item_monthly', {
          company_id: companyId,
          fy_id: fyId,
          item_id: item.item_id,
        });
        if (!res.success) throw new Error(res.error || 'Failed to load monthly data');
        setMonthlyData(res as any);
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    },
    [companyId, fyId],
  );

  // Drill a month row → the vouchers dated within that month (matches Tally:
  // clicking April on the monthly summary opens Stock Item Vouchers).
  const loadMonthVouchers = useCallback(
    async (item: StockItem, monthIdx: number) => {
      if (!companyId || !fyId || !activeFY?.start_date) return;
      const fyStartYear = new Date(activeFY.start_date).getFullYear();
      const { from, to } = monthRange(fyStartYear, monthIdx);
      setLevel('vouchers');
      setVoucherPeriod(`${dmyLabel(from)} to ${dmyLabel(to)}`);
      setVoucherRows([]);
      setVoucherLoading(true);
      setVoucherError(null);
      setFocusedIndex(0);
      try {
        const res = await (window as any).api.report.stockItemVouchers(
          companyId,
          fyId,
          item.item_id,
          from,
          to,
        );
        if (!res.success) throw new Error(res.error || 'Failed to load vouchers');
        setVoucherRows(res.rows ?? []);
      } catch (e: any) {
        setVoucherError(e.message);
      } finally {
        setVoucherLoading(false);
      }
    },
    [companyId, fyId, activeFY?.start_date],
  );

  useEffect(() => {
    loadGroups();
  }, [loadGroups]);

  // Clamp focused index when rows change
  useEffect(() => {
    setFocusedIndex((prev) => Math.min(Math.max(prev, 0), Math.max(visibleRows.length - 1, 0)));
  }, [visibleRows.length]);

  // ── Drill-down actions ─────────────────────────────────────────────────────
  // Drilling into a group just pushes it onto the path — no extra fetch
  // needed, since the whole tree (to any depth) already came back from
  // stockSummary in one call.
  const drillToGroup = (node: StockSummaryGroupNode) => {
    setGroupPath((prev) => [...prev, node]);
    setFocusedIndex(0);
  };

  const drillToItem = (it: StockItem) => {
    // Opening Stock Summary is a static snapshot — no month-wise movement to
    // drill into, so item rows are leaves here (matches Tally).
    if (opening) return;
    setSelectedItem(it);
    setFocusedIndex(0);
    setLevel('monthly');
    loadItemMonthly(it);
  };

  const handleBack = () => {
    if (level === 'vouchers') {
      setLevel('monthly');
      setVoucherRows([]);
      setVoucherError(null);
      setFocusedIndex(0);
    } else if (level === 'monthly') {
      setLevel('groups');
      setMonthlyData(null);
      setSelectedItem(null);
      setFocusedIndex(0);
    } else if (groupPath.length > 0) {
      setGroupPath((prev) => prev.slice(0, -1));
      setFocusedIndex(0);
    } else {
      navigate(-1);
    }
  };

  const handleRowEnter = (idx: number) => {
    if (level === 'groups') {
      const row = currentRows[idx];
      if (!row) return;
      if (row.kind === 'group') drillToGroup(row.node);
      else drillToItem(row.item);
    } else if (level === 'monthly') {
      // Drill the month → its vouchers (Tally opens Stock Item Vouchers).
      if (selectedItem && monthlyData?.months[idx]) loadMonthVouchers(selectedItem, idx);
    } else if (level === 'vouchers') {
      const v = voucherRows[idx];
      if (v?.voucher_id) navigate(`/transactions/voucher/${v.voucher_id}`);
    }
  };

  // ── Keyboard navigation ────────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setFocusedIndex((prev) => Math.min(prev + 1, visibleRows.length - 1));
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setFocusedIndex((prev) => Math.max(prev - 1, 0));
      }
      if (e.key === 'Enter') {
        e.preventDefault();
        handleRowEnter(focusedIndex);
      }
      if (e.key === 'Escape' || e.key === 'Backspace') {
        e.preventDefault();
        handleBack();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [focusedIndex, visibleRows, level, currentRows, groupPath]);

  // ── Title / breadcrumb ─────────────────────────────────────────────────────
  const pageTitle = (() => {
    const crumbs = [reportLabel, ...groupPath.map((g) => g.group_name)];
    if ((level === 'monthly' || level === 'vouchers') && selectedItem)
      crumbs.push(selectedItem.item_name);
    if (level === 'vouchers' && voucherPeriod) crumbs.push(voucherPeriod);
    return crumbs.join('  ›  ');
  })();

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-screen w-screen bg-white select-none text-black font-mono text-[11px]">
      {/* Title Bar */}
      <div className="bg-black/[0.06] border-b border-gray-200 px-3 py-1.5 flex items-center justify-between shrink-0 text-black">
        <div className="font-bold text-sm truncate">{pageTitle}</div>
        <div className="font-bold text-sm">{companyName}</div>
        <div className="text-[10px] text-black">{fyLabel}</div>
      </div>

      {/* Main area */}
      <div className="flex-1 flex min-h-0">
        {/* Table region */}
        <div className="flex-1 flex flex-col min-w-0 bg-white overflow-hidden">
          <div className="flex-1 overflow-y-auto">
            {/* ── Stock Groups & Items at current depth ──────────────────── */}
            {/* currentRows mixes child stock groups (▶, drill deeper) and
                leaf stock items (drill to monthly) at whatever depth
                groupPath has navigated to — Choco -> Dairy Milk -> 5 Star
                and so on, to however many levels the data actually has. */}
            {level === 'groups' && (
              <table className="w-full border-collapse">
                <thead className="sticky top-0 bg-white text-black z-10 border-b border-gray-200 text-[10px]">
                  <tr>
                    <th className="text-left px-3 py-2 font-bold border-r border-gray-200 w-[45%]">
                      Particulars
                    </th>
                    <th className="text-right px-3 py-2 font-bold border-r border-gray-200 w-[18%]">
                      {qtyHeader}
                    </th>
                    <th className="text-right px-3 py-2 font-bold border-r border-gray-200 w-[18%]">
                      Rate
                    </th>
                    <th className="text-right px-3 py-2 font-bold w-[19%]">{valueHeader}</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={4} className="text-center py-8 text-black italic">
                        Loading stock summary…
                      </td>
                    </tr>
                  ) : error ? (
                    <tr>
                      <td colSpan={4} className="text-center py-8 text-black">
                        {error}
                      </td>
                    </tr>
                  ) : currentRows.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="text-center py-8 text-black italic">
                        {currentGroup
                          ? 'No stock items in this group.'
                          : 'No stock items or groups with activity found.'}
                      </td>
                    </tr>
                  ) : (
                    currentRows.map((row, idx) => {
                      const isFocused = idx === focusedIndex;

                      if (row.kind === 'group') {
                        const g = row.node;
                        // Qty/Rate only mean something if every item under
                        // this group shares one unit (set server-side via
                        // qty_displayable) - otherwise leave them blank and
                        // show only the rolled-up Value, matching Tally.
                        const showQty = g.qty_displayable && g.closing_qty !== 0;
                        const avgRate =
                          showQty && g.closing_qty !== 0 ? g.closing_value / g.closing_qty : 0;
                        return (
                          <tr
                            key={`g-${g.group_id}`}
                            onClick={() => setFocusedIndex(idx)}
                            onDoubleClick={() => drillToGroup(g)}
                            className={cn(
                              'border-b border-gray-200 hover:bg-black/[0.03] cursor-pointer h-6 text-[12px]',
                              isFocused
                                ? 'bg-black/[0.06] text-black font-bold'
                                : 'font-bold text-black',
                            )}
                          >
                            <td className="px-3 py-0.5 border-r border-gray-200 align-middle">
                              <span className="mr-1 text-black">▶</span>
                              {g.group_name}
                            </td>
                            <td className="px-3 py-0.5 text-right border-r border-gray-200 align-middle">
                              {showQty
                                ? `${fmtQty(g.closing_qty)}${g.unit_name ? ' ' + g.unit_name : ''}`
                                : ''}
                            </td>
                            <td className="px-3 py-0.5 text-right border-r border-gray-200 align-middle">
                              {avgRate > 0 ? fmt(avgRate) : ''}
                            </td>
                            <td className="px-3 py-0.5 text-right align-middle">
                              {fmt(g.closing_value)}
                            </td>
                          </tr>
                        );
                      }

                      const it = row.item;
                      const qtyLabel =
                        it.closing_qty !== 0
                          ? `${fmtQty(it.closing_qty)}${it.unit_name ? ' ' + it.unit_name : ''}`
                          : '';
                      return (
                        <tr
                          key={`i-${it.item_id}`}
                          onClick={() => setFocusedIndex(idx)}
                          onDoubleClick={() => drillToItem(it)}
                          className={cn(
                            'border-b border-gray-200 hover:bg-black/[0.03] cursor-pointer h-6 text-[12px]',
                            isFocused ? 'bg-black/[0.06] text-black font-bold' : 'text-black',
                          )}
                        >
                          <td className="px-3 py-0.5 border-r border-gray-200 align-middle pl-6">
                            {it.item_name}
                          </td>
                          <td className="px-3 py-0.5 text-right border-r border-gray-200 align-middle">
                            {qtyLabel}
                          </td>
                          <td className="px-3 py-0.5 text-right border-r border-gray-200 align-middle">
                            {it.rate > 0 ? fmt(it.rate) : ''}
                          </td>
                          <td className="px-3 py-0.5 text-right align-middle">
                            {fmt(it.closing_value)}
                          </td>
                        </tr>
                      );
                    })
                  )}
                  {/* Total for this level — Grand Total at root, else this group's total */}
                  {!loading && !error && currentRows.length > 0 && (
                    <tr className="bg-white border-t border-gray-200 border-b-2 border-double border-gray-200 font-bold text-black text-[12px] h-7">
                      <td className="px-3 py-1 text-left uppercase align-middle border-r border-gray-200">
                        {currentGroup ? `${currentGroup.group_name} Total` : 'Grand Total'}
                      </td>
                      <td className="px-3 py-1 text-right border-r border-gray-200 align-middle">
                        {currentGroup
                          ? currentRowsTotal.qtyDisplayable
                            ? fmtQty(currentRowsTotal.qty)
                            : ''
                          : totalQtyDisplayable
                            ? fmtQty(totalClosingQty)
                            : ''}
                      </td>
                      <td className="px-3 py-1 text-right border-r border-gray-200 align-middle"></td>
                      <td className="px-3 py-1 text-right align-middle">
                        {fmt(currentGroup ? currentRowsTotal.value : totalClosingValue)}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}

            {/* ── LEVEL 3: Monthly Breakdown ─────────────────────────────── */}
            {level === 'monthly' && (
              <div className="pb-4">
                {loading ? (
                  <div className="text-center py-8 text-black italic">Loading monthly data…</div>
                ) : error ? (
                  <div className="text-center py-8 text-black">{error}</div>
                ) : monthlyData ? (
                  <>
                    {/* Monthly table */}
                    <table className="w-full border-collapse">
                      <thead className="sticky top-0 bg-white text-black z-10 border-b border-gray-200 text-[10px]">
                        <tr>
                          <th
                            rowSpan={2}
                            className="text-left px-3 py-2 font-bold border-r border-gray-200 w-[18%] align-bottom"
                          >
                            Particulars
                          </th>
                          <th
                            colSpan={2}
                            className="text-center px-2 py-1 font-bold border-r border-gray-200 border-b border-gray-200"
                          >
                            Inwards
                          </th>
                          <th
                            colSpan={2}
                            className="text-center px-2 py-1 font-bold border-r border-gray-200 border-b border-gray-200"
                          >
                            Outwards
                          </th>
                          <th
                            colSpan={2}
                            className="text-center px-2 py-1 font-bold border-b border-gray-200"
                          >
                            Closing Balance
                          </th>
                        </tr>
                        <tr>
                          <th className="text-right px-2 py-1 font-bold border-r border-gray-200 w-[12%]">
                            Qty
                          </th>
                          <th className="text-right px-2 py-1 font-bold border-r border-gray-200 w-[13%]">
                            Value
                          </th>
                          <th className="text-right px-2 py-1 font-bold border-r border-gray-200 w-[12%]">
                            Qty
                          </th>
                          <th className="text-right px-2 py-1 font-bold border-r border-gray-200 w-[13%]">
                            Value
                          </th>
                          <th className="text-right px-2 py-1 font-bold border-r border-gray-200 w-[12%]">
                            Qty
                          </th>
                          <th className="text-right px-2 py-1 font-bold w-[13%]">Value</th>
                        </tr>
                      </thead>
                      <tbody>
                        {/* Opening Balance row */}
                        <tr className="bg-white border-b border-gray-200 h-6 font-bold text-[12px] text-black">
                          <td className="px-3 py-0.5 border-r border-gray-200 align-middle">
                            Opening Balance
                          </td>
                          <td className="px-2 py-0.5 text-right border-r border-gray-200 align-middle"></td>
                          <td className="px-2 py-0.5 text-right border-r border-gray-200 align-middle"></td>
                          <td className="px-2 py-0.5 text-right border-r border-gray-200 align-middle"></td>
                          <td className="px-2 py-0.5 text-right border-r border-gray-200 align-middle"></td>
                          <td className="px-2 py-0.5 text-right border-r border-gray-200 align-middle">
                            {fmtQty(monthlyData.opening_qty)}
                          </td>
                          <td className="px-2 py-0.5 text-right align-middle">
                            {fmt(monthlyData.opening_value)}
                          </td>
                        </tr>
                        {monthlyData.months.map((m, idx) => {
                          const isFocused = idx === focusedIndex;
                          const hasActivity = m.in_qty !== 0 || m.out_qty !== 0;
                          return (
                            <tr
                              key={m.month}
                              onClick={() => setFocusedIndex(idx)}
                              onDoubleClick={() =>
                                selectedItem && loadMonthVouchers(selectedItem, idx)
                              }
                              className={cn(
                                'border-b border-gray-200 hover:bg-black/[0.03] h-6 text-[12px]',
                                hasActivity ? 'cursor-pointer' : 'cursor-default',
                                isFocused
                                  ? 'bg-black/[0.06] text-black font-bold'
                                  : hasActivity
                                    ? 'text-black'
                                    : 'text-black',
                              )}
                            >
                              <td className="px-3 py-0.5 border-r border-gray-200 align-middle">
                                {m.month}
                              </td>
                              <td className="px-2 py-0.5 text-right border-r border-gray-200 align-middle">
                                {fmtQty(m.in_qty)}
                              </td>
                              <td className="px-2 py-0.5 text-right border-r border-gray-200 align-middle">
                                {fmt(m.in_value)}
                              </td>
                              <td className="px-2 py-0.5 text-right border-r border-gray-200 align-middle">
                                {fmtQty(m.out_qty)}
                              </td>
                              <td className="px-2 py-0.5 text-right border-r border-gray-200 align-middle">
                                {fmt(m.out_value)}
                              </td>
                              <td className="px-2 py-0.5 text-right border-r border-gray-200 align-middle">
                                {fmtQty(m.closing_qty)}
                              </td>
                              <td className="px-2 py-0.5 text-right align-middle">
                                {fmt(m.closing_value)}
                              </td>
                            </tr>
                          );
                        })}
                        {/* Grand Total */}
                        {(() => {
                          const last = monthlyData.months[monthlyData.months.length - 1];
                          const totalInQty = monthlyData.months.reduce((s, m) => s + m.in_qty, 0);
                          const totalInVal = monthlyData.months.reduce((s, m) => s + m.in_value, 0);
                          const totalOutQty = monthlyData.months.reduce((s, m) => s + m.out_qty, 0);
                          const totalOutVal = monthlyData.months.reduce(
                            (s, m) => s + m.out_value,
                            0,
                          );
                          return (
                            <tr className="bg-white border-t border-gray-200 border-b-2 border-double border-gray-200 font-bold text-black text-[12px] h-7">
                              <td className="px-3 py-1 uppercase align-middle border-r border-gray-200">
                                Grand Total
                              </td>
                              <td className="px-2 py-1 text-right border-r border-gray-200 align-middle">
                                {fmtQty(totalInQty)}
                              </td>
                              <td className="px-2 py-1 text-right border-r border-gray-200 align-middle">
                                {fmt(totalInVal)}
                              </td>
                              <td className="px-2 py-1 text-right border-r border-gray-200 align-middle">
                                {fmtQty(totalOutQty)}
                              </td>
                              <td className="px-2 py-1 text-right border-r border-gray-200 align-middle">
                                {fmt(totalOutVal)}
                              </td>
                              <td className="px-2 py-1 text-right border-r border-gray-200 align-middle">
                                {fmtQty(last?.closing_qty ?? 0)}
                              </td>
                              <td className="px-2 py-1 text-right align-middle">
                                {fmt(last?.closing_value ?? 0)}
                              </td>
                            </tr>
                          );
                        })()}
                      </tbody>
                    </table>

                    {/* SVG Line Chart */}
                    <div className="px-4 pt-4 pb-2">
                      <div className="text-[10px] font-bold text-black mb-1 uppercase tracking-wide">
                        Closing Stock Value — {monthlyData.item_name}
                      </div>
                      <div className="border border-gray-200 bg-white inline-block p-2">
                        <MonthlyChart months={monthlyData.months} />
                      </div>
                    </div>
                  </>
                ) : null}
              </div>
            )}

            {/* ── LEVEL 4: Vouchers within a month ───────────────────────── */}
            {level === 'vouchers' && selectedItem && (
              <StockItemVouchersTable
                itemName={selectedItem.item_name}
                companyName={companyName}
                periodLabel={voucherPeriod}
                unit={selectedItem.unit_name}
                rows={voucherRows}
                loading={voucherLoading}
                error={voucherError}
                selectedIndex={focusedIndex}
                onSelectIndex={setFocusedIndex}
                onOpenVoucher={(r) =>
                  r.voucher_id && navigate(`/transactions/voucher/${r.voucher_id}`)
                }
              />
            )}
          </div>
        </div>

        {/* Right sidebar buttons */}
        <div className="w-[120px] bg-black/[0.06] border-l border-gray-200 flex flex-col p-1 gap-1 shrink-0 text-black text-[10px] font-bold">
          {(level !== 'groups' || groupPath.length > 0) && (
            <button
              onClick={handleBack}
              className="w-full text-left p-1 border border-gray-200 bg-black/[0.06] hover:bg-black/[0.03]"
            >
              ← Back
            </button>
          )}
          <button
            onClick={() => loadGroups()}
            className="w-full text-left p-1 border border-gray-200 bg-black/[0.06] hover:bg-black/[0.03]"
          >
            F5: Refresh
          </button>
          <div className="flex-1" />
          <button
            onClick={handleBack}
            className="w-full text-left p-1 border border-gray-200 bg-black/[0.06] hover:bg-black/[0.03] text-black"
          >
            Esc: Back
          </button>
        </div>
      </div>
    </div>
  );
}
