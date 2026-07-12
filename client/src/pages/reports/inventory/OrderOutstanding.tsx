import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { useCompany } from '@/context/CompanyContext';
import SelectionPopup from './SelectionPopup';

// Issues #167–#177 — Sales / Purchase Order Outstandings.
// Flow: dimension sub-menu (Stock Group / Stock Category / Stock Item / Group /
// Ledger / All Orders) → optional entity SelectionPopup → report.
// Every dimension renders the SAME Tally report shape:
//   Particulars | Pending Orders (Quantity · Rate · Value) + Grand Total.
// "Particulars" ALWAYS lists stock items — the dimension (stock group/category/
// item, group, ledger, all) only FILTERS which orders are counted (confirmed by
// #176: Ledger=ABC Customers shows items Fan/Paracetamol, not the party).
// Enter/double-click drills an item into its order lines (Order Details:
// balance qty = ordered − fulfilled, split into outstanding vs over-received).

type Mode = 'sales' | 'purchase';
type GroupBy = 'item' | 'party';

interface Ref {
  id: number;
  name: string;
}
interface Row {
  voucher_id: number | null;
  date: string;
  order_no: string;
  party_name: string;
  party_ledger_id: number | null;
  stock_item_id: number | null;
  item_name: string;
  unit: string;
  due_on: string;
  ordered_qty: number;
  balance_qty: number;
  rate: number;
  value: number;
}

interface Dim {
  key: string;
  label: string;
  // how to fetch the entity list; null => no selection (All Orders)
  fetch: ((companyId: number) => Promise<Ref[]>) | null;
  selectTitle?: string;
  fieldLabel?: string;
  listLabel?: string;
  // master "Create" route offered inside the selection popup (Tally shows it)
  createPath?: string;
  // label shown in the report header when nothing (or Primary) is selected
  allLabel?: string;
  // what the Particulars column groups by
  groupBy: GroupBy;
  // starts a new visual group in the sub-menu (blank line above, as in Tally)
  groupStart?: boolean;
}

const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const dmy = (iso: string | null) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || '');
  return m ? `${Number(m[3])}-${MON[Number(m[2]) - 1]}-${m[1].slice(2)}` : iso || '';
};
const fmtNum = (v: number | null | undefined) =>
  !v
    ? ''
    : new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(
        v,
      );
const fmtQty = (v: number | null | undefined, unit?: string) => {
  const n = Number(v) || 0;
  if (n === 0) return '';
  const num = n.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 3 });
  return unit ? `${num} ${unit}` : num;
};
// Signed quantity for the row breakup — Tally shows negatives as "(-)10 Pcs".
const fmtSignedQty = (v: number | null | undefined, unit?: string) => {
  const n = Number(v) || 0;
  if (n === 0) return '';
  const num = Math.abs(n).toLocaleString('en-IN', { maximumFractionDigits: 3 });
  return `${n < 0 ? '(-)' : ''}${num}${unit ? ` ${unit}` : ''}`;
};
const api = () => (window as any).api;

const DIMS = (): Dim[] => [
  {
    key: 'stock-group',
    label: 'Stock Group',
    groupBy: 'item',
    allLabel: 'All Stock Groups',
    selectTitle: 'Select Stock Group',
    fieldLabel: 'Name of Group',
    listLabel: 'List of Stock Groups',
    createPath: '/master/create/stock-group',
    fetch: async (c) =>
      ((await api().stockGroup.getAll(c)).stockGroups ?? []).map((g: any) => ({
        id: g.sg_id,
        name: g.name,
      })),
  },
  {
    key: 'stock-category',
    label: 'Stock Category',
    groupBy: 'item',
    allLabel: 'All Stock Categories',
    selectTitle: 'Select Stock Category',
    fieldLabel: 'Name of Stock Category',
    listLabel: 'List of Stock Categories',
    createPath: '/master/create/stock-category',
    fetch: async (c) =>
      ((await api().stockCategory.getAll(c)).stockCategories ?? []).map((g: any) => ({
        id: g.sc_id,
        name: g.name,
      })),
  },
  {
    key: 'stock-item',
    label: 'Stock Item',
    groupBy: 'item',
    allLabel: 'All Items',
    selectTitle: 'Select Stock Item',
    fieldLabel: 'Name of Item',
    listLabel: 'List of Stock Items',
    createPath: '/master/create/stock-item',
    fetch: async (c) =>
      ((await api().stockItem.getAll(c)).stockItems ?? []).map((g: any) => ({
        id: g.item_id,
        name: g.name,
      })),
  },
  {
    key: 'group',
    label: 'Group',
    groupBy: 'item',
    allLabel: 'All Groups',
    groupStart: true,
    selectTitle: 'Select Group',
    fieldLabel: 'Name of Group',
    listLabel: 'List of Groups',
    createPath: '/master/create/group',
    fetch: async (c) =>
      ((await api().group.getAll(c)).groups ?? []).map((g: any) => ({
        id: g.group_id,
        name: g.name,
      })),
  },
  {
    key: 'ledger',
    label: 'Ledger',
    groupBy: 'item',
    allLabel: 'All Ledgers',
    selectTitle: 'Select Ledger',
    fieldLabel: 'Name of Ledger',
    listLabel: 'List of Ledgers',
    createPath: '/master/create/ledger',
    fetch: async (c) =>
      ((await api().ledger.getAll(c)).ledgers ?? []).map((g: any) => ({
        id: g.ledger_id,
        name: g.name,
      })),
  },
  {
    key: 'all',
    label: 'All Orders',
    groupBy: 'item',
    allLabel: 'All Orders',
    groupStart: true,
    fetch: null,
  },
];

type Level =
  | { step: 'menu' }
  | { step: 'select'; dim: Dim }
  | { step: 'report'; dim: Dim; selection: Ref | null };

// The root "Primary" group/category means "All …" — no filter.
const isPrimary = (dim: Dim, sel: Ref | null) =>
  (dim.key === 'stock-group' || dim.key === 'stock-category') && sel?.name === 'Primary';

// Group-key for a row under the current Particulars grouping.
const rowKey = (r: Row, by: GroupBy) =>
  by === 'item'
    ? String(r.stock_item_id ?? r.item_name)
    : String(r.party_ledger_id ?? r.party_name);
const rowName = (r: Row, by: GroupBy) => (by === 'item' ? r.item_name : r.party_name || '—');

export default function OrderOutstanding({ mode }: { mode: Mode }) {
  const navigate = useNavigate();
  const { selectedCompany, activeFY } = useCompany();
  const companyId = selectedCompany?.company_id;
  const fyId = activeFY?.fy_id;
  const periodLabel = activeFY ? `${dmy(activeFY.start_date)} to ${dmy(activeFY.end_date)}` : '';
  const heading = mode === 'sales' ? 'Sales Order Outstandings' : 'Purchase Order Outstandings';
  const orderWord = mode === 'sales' ? 'Sales' : 'Purchase';
  const dims = React.useMemo(DIMS, []);

  const [level, setLevel] = React.useState<Level>({ step: 'menu' });
  const [menuIdx, setMenuIdx] = React.useState(0);

  // Entity selection
  const [entities, setEntities] = React.useState<Ref[]>([]);
  const [entLoading, setEntLoading] = React.useState(false);
  const [search, setSearch] = React.useState('');
  const [selIdx, setSelIdx] = React.useState(0);

  const openDim = React.useCallback(
    (dim: Dim) => {
      if (!companyId) return;
      if (!dim.fetch) {
        setLevel({ step: 'report', dim, selection: null });
        return;
      }
      setLevel({ step: 'select', dim });
      setSearch('');
      setSelIdx(0);
      setEntLoading(true);
      setEntities([]);
      dim
        .fetch(companyId!)
        .then((list) => {
          // Pin "Primary" (the All-Groups root) to the top, rest alphabetical.
          setEntities(
            list.sort((a, b) =>
              a.name === 'Primary' ? -1 : b.name === 'Primary' ? 1 : a.name.localeCompare(b.name),
            ),
          );
          setEntLoading(false);
        })
        .catch(() => setEntLoading(false));
    },
    [companyId],
  );

  const filtered = React.useMemo(
    () =>
      search.trim() === ''
        ? entities
        : entities.filter((e) => e.name.toLowerCase().includes(search.toLowerCase())),
    [entities, search],
  );
  React.useEffect(() => {
    setSelIdx(0);
  }, [search]);

  // Report data (order lines)
  const [rows, setRows] = React.useState<Row[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);
  const [rowIdx, setRowIdx] = React.useState(0);
  // Which Particulars row is drilled open (null = summary view).
  const [drill, setDrill] = React.useState<{ key: string; name: string } | null>(null);
  const [sumIdx, setSumIdx] = React.useState(0);

  // Order Details row breakup (expand-on-click): the vouchers behind an order line.
  interface Move {
    voucher_id: number | null;
    date: string;
    voucher_type: string;
    voucher_number: string;
    qty: number;
  }
  const [expanded, setExpanded] = React.useState<Set<string>>(new Set());
  const [moves, setMoves] = React.useState<Record<string, Move[]>>({});
  const moveKey = (r: Row) => `${r.voucher_id}-${r.stock_item_id}`;
  const toggleExpand = React.useCallback(
    (r: Row) => {
      const k = moveKey(r);
      setExpanded((prev) => {
        const n = new Set(prev);
        n.has(k) ? n.delete(k) : n.add(k);
        return n;
      });
      if (moves[k] === undefined && r.voucher_id != null && companyId && fyId) {
        api()
          .report.orderMovements(companyId, fyId, mode, r.voucher_id, r.stock_item_id, r.order_no)
          .then((res: any) => {
            if (res?.success) setMoves((m) => ({ ...m, [k]: res.lines ?? [] }));
          });
      }
    },
    [moves, companyId, fyId, mode],
  );
  // Reset expansions whenever the underlying report data changes.
  React.useEffect(() => {
    setExpanded(new Set());
    setMoves({});
  }, [rows, drill]);

  const groupBy: GroupBy = level.step === 'report' ? level.dim.groupBy : 'item';
  // "All Orders" skips the Particulars summary and shows Order Details directly.
  const directOrders = level.step === 'report' && level.dim.key === 'all';

  React.useEffect(() => {
    if (level.step !== 'report' || !companyId || !fyId) return;
    setLoading(true);
    setErr(null);
    setRows([]);
    setRowIdx(0);
    setSumIdx(0);
    setDrill(null);
    const selId = isPrimary(level.dim, level.selection) ? null : (level.selection?.id ?? null);
    api()
      .report.orderOutstanding(companyId, fyId, mode, level.dim.key, selId)
      .then((res: any) => {
        if (res?.success) setRows(res.rows ?? []);
        else setErr(res?.error ?? 'Failed to load order outstandings.');
        setLoading(false);
      })
      .catch((e: any) => {
        setErr(e.message);
        setLoading(false);
      });
  }, [level, companyId, fyId, mode]);

  // Particulars summary — grouped by item or party. Rate only meaningful when a
  // single item backs the row, so party-grouped rows leave Rate blank.
  interface SumRow {
    key: string;
    name: string;
    qty: number;
    value: number;
    rate: number;
    unit: string;
  }
  const summary = React.useMemo<SumRow[]>(() => {
    const map = new Map<string, SumRow>();
    for (const r of rows) {
      const key = rowKey(r, groupBy);
      const cur = map.get(key) ?? {
        key,
        name: rowName(r, groupBy),
        qty: 0,
        value: 0,
        rate: 0,
        unit: r.unit,
      };
      cur.qty += r.balance_qty;
      cur.value += r.value;
      // A row's unit is meaningful only while every line under it shares one unit.
      if (cur.unit !== r.unit) cur.unit = '';
      map.set(key, cur);
    }
    return [...map.values()]
      .map((x) => ({ ...x, rate: groupBy === 'item' && x.qty ? x.value / x.qty : 0 }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [rows, groupBy]);

  // Quantity is only summable across the report when every row shares one unit.
  const totalUnit = React.useMemo(() => {
    const units = new Set(summary.filter((r) => r.qty).map((r) => r.unit));
    return units.size === 1 ? [...units][0] : null;
  }, [summary]);

  // Order lines for the drilled Particulars row — outstanding (positive balance)
  // first, then over-received (negative), to match Tally's two sections.
  const lineRows = React.useMemo(() => {
    const base = drill ? rows.filter((r) => rowKey(r, groupBy) === drill.key) : rows;
    return [...base].sort((a, b) => (b.balance_qty > 0 ? 1 : 0) - (a.balance_qty > 0 ? 1 : 0));
  }, [rows, drill, groupBy]);

  // Keyboard
  React.useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (level.step === 'menu') {
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          setMenuIdx((p) => Math.min(dims.length - 1, p + 1));
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          setMenuIdx((p) => Math.max(0, p - 1));
        } else if (e.key === 'Enter') {
          e.preventDefault();
          openDim(dims[menuIdx]);
        } else if (e.key === 'Escape') {
          e.preventDefault();
          navigate(-1);
        }
      } else if (level.step === 'select') {
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          setSelIdx((p) => Math.min(filtered.length - 1, p + 1));
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          setSelIdx((p) => Math.max(0, p - 1));
        } else if (e.key === 'Enter') {
          e.preventDefault();
          const s = filtered[selIdx];
          if (s) setLevel({ step: 'report', dim: level.dim, selection: s });
        }
        // Escape only — Backspace must keep editing the SelectionPopup search input.
        else if (e.key === 'Escape') {
          e.preventDefault();
          setLevel({ step: 'menu' });
        }
      } else if (!drill && !directOrders) {
        // Particulars summary view
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          setSumIdx((p) => Math.min(summary.length - 1, p + 1));
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          setSumIdx((p) => Math.max(0, p - 1));
        } else if (e.key === 'Enter') {
          e.preventDefault();
          const it = summary[sumIdx];
          if (it) {
            setDrill({ key: it.key, name: it.name });
            setRowIdx(0);
          }
        } else if (e.key === 'Escape' || e.key === 'Backspace') {
          e.preventDefault();
          setLevel(level.dim.fetch ? { step: 'select', dim: level.dim } : { step: 'menu' });
        }
      } else {
        // Order Details view (drilled item, or All-Orders direct list)
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          setRowIdx((p) => Math.min(lineRows.length - 1, p + 1));
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          setRowIdx((p) => Math.max(0, p - 1));
        } else if (e.key === 'Enter') {
          e.preventDefault();
          const r = lineRows[rowIdx];
          if (r?.voucher_id) navigate(`/transactions/voucher/${r.voucher_id}`);
        } else if (e.key === 'Escape' || e.key === 'Backspace') {
          e.preventDefault();
          drill ? setDrill(null) : setLevel({ step: 'menu' });
        }
      }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [
    level,
    dims,
    menuIdx,
    filtered,
    selIdx,
    summary,
    sumIdx,
    lineRows,
    rowIdx,
    drill,
    openDim,
    navigate,
  ]);

  const TitleBar = ({ title }: { title: string }) => (
    <div className="flex items-center justify-between px-3 py-1.5 bg-white border-b-2 border-gray-200">
      <span className="font-bold text-sm tracking-wide">{title}</span>
      <span className="font-bold text-sm">{selectedCompany?.name ?? ''}</span>
      <span />
    </div>
  );

  // ── Dimension sub-menu ───────────────────────────────────────────────────
  if (level.step === 'menu') {
    return (
      <div className="flex-1 flex flex-col h-full bg-white select-none text-black font-sans text-[11px]">
        <TitleBar title={heading} />
        <div className="max-w-sm mx-auto mt-10 w-full flex flex-col gap-0.5 px-4">
          <div className="text-[11px] italic text-black flex flex-wrap gap-1 mb-1">
            <button onClick={() => navigate('/')} className="hover:underline hover:text-black">
              Gateway
            </button>
            <span>&gt;</span>
            <button
              onClick={() => navigate('/reports/statements-of-inventory')}
              className="hover:underline hover:text-black"
            >
              Statements of Inventory
            </button>
          </div>
          <div className="text-base font-semibold mb-1">{heading}</div>
          {dims.map((d, i) => (
            <button
              key={d.key}
              onClick={() => openDim(d)}
              onMouseEnter={() => setMenuIdx(i)}
              className={`text-left px-2 h-7 text-[12px] ${d.groupStart ? 'mt-3' : ''} ${i === menuIdx ? 'bg-black/[0.06] font-bold' : 'hover:bg-black/[0.03]'}`}
            >
              {d.label}
            </button>
          ))}
          <button
            onClick={() => navigate(-1)}
            className="text-left px-2 h-7 mt-2 text-[12px] font-semibold"
          >
            Quit
          </button>
        </div>
      </div>
    );
  }

  // ── Entity selection popup ───────────────────────────────────────────────
  if (level.step === 'select') {
    return (
      <div className="flex-1 flex flex-col h-full bg-white select-none text-black font-sans text-[11px]">
        <TitleBar title={level.dim.selectTitle!} />
        <SelectionPopup
          title={level.dim.selectTitle!}
          fieldLabel={level.dim.fieldLabel!}
          listLabel={level.dim.listLabel!}
          companyName={selectedCompany?.name}
          items={filtered.map((e) => ({ id: e.id, name: e.name }))}
          index={selIdx}
          loading={entLoading}
          search={search}
          onSearchChange={setSearch}
          onIndexChange={setSelIdx}
          onAccept={(i) => {
            const s = filtered[i];
            if (s) setLevel({ step: 'report', dim: level.dim, selection: s });
          }}
          onCancel={() => setLevel({ step: 'menu' })}
          onCreate={level.dim.createPath ? () => navigate(level.dim.createPath!) : undefined}
        />
      </div>
    );
  }

  // ── Report ───────────────────────────────────────────────────────────────
  // Tally title, e.g. "Sales Order Stock Group Outstandings" (generic for All Orders).
  const reportTitle = `${orderWord} Order ${level.dim.key === 'all' ? '' : level.dim.label + ' '}Outstandings`;
  // Entity label — Primary/none shows the dimension's "All …" label.
  const entityLabel =
    level.selection && !isPrimary(level.dim, level.selection)
      ? level.selection.name
      : (level.dim.allLabel ?? 'All Orders');

  // Info-header band shared by both report views. Mirrors Tally's right-aligned
  // stacked block: scope · company · period · "<Sales> Orders Outstanding" ·
  // "Pending Orders". "Particulars" sits at the far left of the same band.
  const InfoBand = ({ context }: { context?: string }) => (
    <div className="flex justify-between items-start px-3 py-1.5 bg-white border-b border-gray-200 font-mono text-[11px]">
      <span className="font-bold tracking-wide">Particulars</span>
      <div className="text-right leading-tight">
        <div className="italic">{context ?? entityLabel}</div>
        <div className="font-bold">{selectedCompany?.name ?? ''}</div>
        <div className="text-black">{periodLabel}</div>
        <div className="italic">{orderWord} Orders Outstanding</div>
        <div className="font-bold">Pending Orders</div>
      </div>
    </div>
  );

  // ---- Particulars summary: Particulars | Quantity | Rate | Value ----------
  if (!drill && !directOrders) {
    const grandQty = summary.reduce((s, r) => s + r.qty, 0);
    const grandVal = summary.reduce((s, r) => s + r.value, 0);
    return (
      <div className="flex-1 flex flex-col h-full bg-white select-none text-black font-sans text-[11px]">
        <TitleBar title={reportTitle} />
        <InfoBand />
        <div className="flex-1 overflow-y-auto">
          <table className="w-full border-collapse text-[11px] font-mono">
            <thead className="sticky top-0 bg-white border-b border-gray-200 z-10 text-black">
              <tr>
                <th className="px-3 py-1 text-left font-bold" />
                <th className="px-3 py-1 text-right font-bold w-32 border-l border-gray-200">
                  Quantity
                </th>
                <th className="px-3 py-1 text-right font-bold w-28 border-l border-gray-200">
                  Rate
                </th>
                <th className="px-3 py-1 text-right font-bold w-32 border-l border-gray-200">
                  Value
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-black italic">
                    Loading…
                  </td>
                </tr>
              ) : err ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-black">
                    {err}
                  </td>
                </tr>
              ) : summary.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-black italic">
                    No outstanding orders.
                  </td>
                </tr>
              ) : (
                summary.map((r, i) => (
                  <tr
                    key={r.key}
                    onClick={() => setSumIdx(i)}
                    onDoubleClick={() => {
                      setDrill({ key: r.key, name: r.name });
                      setRowIdx(0);
                    }}
                    className={`border-b border-gray-200 cursor-pointer ${i === sumIdx ? 'bg-black/[0.06] font-bold' : 'hover:bg-black/[0.03]'}`}
                  >
                    <td className="px-3 py-1">{r.name}</td>
                    <td className="px-3 py-1 text-right border-l border-gray-200">
                      {fmtQty(r.qty, r.unit)}
                    </td>
                    <td className="px-3 py-1 text-right border-l border-gray-200">
                      {fmtNum(r.rate)}
                    </td>
                    <td className="px-3 py-1 text-right border-l border-gray-200">
                      {fmtNum(r.value)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="border-t-2 border-black bg-white px-3 py-1.5 flex font-mono text-[11px] font-bold shrink-0">
          <span className="flex-1">Grand Total</span>
          <span className="w-32 text-right border-l border-gray-200 pr-2">
            {totalUnit !== null ? fmtQty(grandQty, totalUnit) : ''}
          </span>
          <span className="w-28 border-l border-gray-200" />
          <span className="w-32 text-right border-l border-gray-200 pr-2">{fmtNum(grandVal)}</span>
        </div>
        <div className="flex items-center gap-6 px-3 py-1 border-t border-gray-200 bg-white text-[10px] font-semibold text-black shrink-0">
          <button
            onClick={() =>
              setLevel(level.dim.fetch ? { step: 'select', dim: level.dim } : { step: 'menu' })
            }
            className="hover:text-black"
          >
            Q: Back
          </button>
          <span className="text-black">Enter: Order-wise details</span>
        </div>
      </div>
    );
  }

  // ---- Order Details drill: outstanding + over-received sections -----------
  const TH = 'px-2 py-1 font-bold text-[10px] bg-black/[0.06] border-b border-gray-200';
  // Two Order Details modes: an item drilled from a summary (itemFixed → primary
  // column is the party) vs the "All Orders" direct list (primary column is the
  // item, with a "To: <party>" sub-line). Header for a drilled item is
  // "<party> (for <item> )" when party-scoped (Group/Ledger), else "Item: <item>".
  const itemFixed = !!drill;
  const partyScoped =
    (level.dim.key === 'group' || level.dim.key === 'ledger') && !!level.selection;
  const drillTitle = drill
    ? partyScoped
      ? `${entityLabel} (for ${drill.name} )`
      : `Item: ${drill.name}`
    : '';
  const posCount = lineRows.filter((r) => r.balance_qty > 1e-9).length;
  const sectionUnit = (rs: Row[]) => {
    const u = new Set(rs.filter((r) => r.balance_qty).map((r) => r.unit));
    return u.size === 1 ? [...u][0] : '';
  };
  const sections = [
    {
      label: mode === 'purchase' ? 'Purchase Orders Outstanding :' : 'Sales Orders Outstanding :',
      rows: lineRows.slice(0, posCount),
      offset: 0,
    },
    {
      label:
        mode === 'purchase'
          ? 'Goods received but Orders not Sent :'
          : 'Goods delivered but Orders not received :',
      rows: lineRows.slice(posCount),
      offset: posCount,
    },
  ].filter((s) => s.rows.length > 0);

  return (
    <div className="flex-1 flex flex-col h-full bg-white select-none text-black font-sans text-[11px]">
      <TitleBar title="Order Details" />
      <div className="flex justify-between items-start px-3 py-1.5 bg-white border-b border-gray-200 font-mono text-[11px]">
        <div>
          {itemFixed && <div className="font-bold">{drillTitle}</div>}
          <div className={itemFixed ? 'italic text-black' : 'font-bold'}>
            {orderWord} Orders (All Orders)
          </div>
        </div>
        <span className="text-black">{periodLabel}</span>
      </div>

      <div className="flex-1 overflow-y-auto">
        <table className="w-full border-collapse text-[11px] font-mono">
          <thead className="sticky top-0 z-10">
            <tr>
              <th className={`${TH} text-left w-20`}>Date</th>
              <th className={`${TH} text-left w-24`}>Order No.</th>
              <th className={`${TH} text-left`}>{itemFixed ? 'Name of Party' : 'Name of Item'}</th>
              <th className={`${TH} text-right w-24`}>Ordered Qty</th>
              <th className={`${TH} text-right w-24`}>Balance Qty</th>
              <th className={`${TH} text-right w-24`}>Rate</th>
              <th className={`${TH} text-right w-28`}>Value</th>
              <th className={`${TH} text-left w-24`}>Due on</th>
            </tr>
          </thead>
          <tbody>
            {lineRows.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-black italic">
                  No outstanding orders.
                </td>
              </tr>
            ) : (
              sections.map((sec) => {
                const su = sectionUnit(sec.rows);
                const sub = sec.rows.reduce(
                  (a, r) => ({ o: a.o + r.ordered_qty, b: a.b + r.balance_qty, v: a.v + r.value }),
                  { o: 0, b: 0, v: 0 },
                );
                return (
                  <React.Fragment key={sec.label}>
                    <tr>
                      <td colSpan={8} className="px-2 pt-2 pb-1 font-bold">
                        {sec.label}
                      </td>
                    </tr>
                    {sec.rows.map((r, j) => {
                      const gi = sec.offset + j;
                      return (
                        <React.Fragment key={gi}>
                          <tr
                            onClick={() => {
                              setRowIdx(gi);
                              toggleExpand(r);
                            }}
                            onDoubleClick={() =>
                              r.voucher_id && navigate(`/transactions/voucher/${r.voucher_id}`)
                            }
                            title="Click: show order breakup · Double-click: open voucher"
                            className={`cursor-pointer ${gi === rowIdx ? 'bg-black/[0.06] font-bold' : 'hover:bg-black/[0.03]'} ${itemFixed ? 'border-b border-gray-200' : ''}`}
                          >
                            <td className="px-2 py-1 whitespace-nowrap">{dmy(r.date)}</td>
                            <td className="px-2 py-1">{r.order_no}</td>
                            <td className="px-2 py-1 font-semibold">
                              {itemFixed ? r.party_name || '—' : r.item_name}
                            </td>
                            <td className="px-2 py-1 text-right">
                              {fmtQty(r.ordered_qty, r.unit)}
                            </td>
                            <td className="px-2 py-1 text-right">
                              {fmtQty(r.balance_qty, r.unit)}
                            </td>
                            <td className="px-2 py-1 text-right">{fmtNum(r.rate)}</td>
                            <td className="px-2 py-1 text-right">{fmtNum(r.value)}</td>
                            <td className="px-2 py-1 whitespace-nowrap">{dmy(r.due_on)}</td>
                          </tr>
                          {!itemFixed && (
                            <tr className={gi === rowIdx ? 'bg-black/[0.06]' : ''}>
                              <td />
                              <td />
                              <td className="px-2 pb-1 italic text-black">
                                To: {r.party_name || '—'}
                              </td>
                              <td colSpan={5} />
                            </tr>
                          )}
                          {/* Row breakup dropdown — order voucher + its fulfilments */}
                          {expanded.has(moveKey(r)) &&
                            (moves[moveKey(r)] ?? []).map((m, mi) => (
                              <tr key={`${gi}-m${mi}`} className="text-[10px] italic text-black">
                                <td className="px-2 py-0.5 pl-6 whitespace-nowrap">
                                  {dmy(m.date)}
                                </td>
                                <td className="px-2 py-0.5">{m.voucher_number}</td>
                                <td className="px-2 py-0.5">
                                  {m.voucher_type}&nbsp;&nbsp;{fmtSignedQty(m.qty, r.unit)}
                                </td>
                                <td colSpan={5} />
                              </tr>
                            ))}
                          {expanded.has(moveKey(r)) && (
                            <tr>
                              <td colSpan={8} className="border-b border-gray-200" />
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}
                    <tr className="border-t border-gray-200 font-bold">
                      <td />
                      <td />
                      <td />
                      <td className="px-2 py-1 text-right">{su ? fmtQty(sub.o, su) : ''}</td>
                      <td className="px-2 py-1 text-right">{su ? fmtQty(sub.b, su) : ''}</td>
                      <td />
                      <td className="px-2 py-1 text-right">{fmtNum(sub.v)}</td>
                      <td />
                    </tr>
                  </React.Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center gap-6 px-3 py-1 border-t border-gray-200 bg-white text-[10px] font-semibold text-black shrink-0">
        <button
          onClick={() => (itemFixed ? setDrill(null) : setLevel({ step: 'menu' }))}
          className="hover:text-black"
        >
          Q: Back
        </button>
        <span className="text-black">Enter: Open order voucher</span>
      </div>
    </div>
  );
}
