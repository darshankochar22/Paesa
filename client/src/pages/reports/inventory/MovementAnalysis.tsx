import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { useCompany } from '@/context/CompanyContext';
import SelectionPopup from './SelectionPopup';
import ItemVoucherAnalysis, { type VoucherRow } from './ItemVoucherAnalysis';

// Issue #107 — Item Movement Analysis.
// Flow: SelectionPopup → Movement Summary (inward parties + outward parties)
//        → Party drill → ItemVoucherAnalysis filtered to that party
//
// Data source: `stockItemVouchers` for the full FY, aggregated client-side.
// Movement Inward  = parties who sent goods IN  (purchase-side, inwards_qty > 0)
// Movement Outward = parties who received goods OUT (sales-side, outwards_qty > 0)

interface StockItem {
  item_id: number;
  name: string;
}

interface PartyTotal {
  name: string;
  qty: number;
  value: number;
}

// Track which "section" the cursor is in plus index within it.
// section "inward" | "outward"; idx = index within that section's list
type Cursor = { section: 'inward' | 'outward'; idx: number };

type Level =
  | { step: 'select' }
  | { step: 'movement'; item: StockItem; allRows: VoucherRow[] }
  | { step: 'detail'; item: StockItem; partyName: string; filteredRows: VoucherRow[] };

const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const dmy = (iso: string) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  return m ? `${Number(m[3])}-${MON[Number(m[2]) - 1]}-${m[1].slice(2)}` : iso;
};

const fmtVal = (v: number) =>
  v === 0
    ? ''
    : new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(
        v,
      );
const fmtQty = (v: number, unit?: string) => {
  if (v === 0) return '';
  const s = Math.abs(v).toLocaleString('en-IN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 3,
  });
  return unit ? `${s} ${unit}` : s;
};

/** Aggregate rows into per-party inward and outward totals (skip Opening Balance). */
function aggregate(rows: VoucherRow[]): { inward: PartyTotal[]; outward: PartyTotal[] } {
  const inMap = new Map<string, { qty: number; value: number }>();
  const outMap = new Map<string, { qty: number; value: number }>();

  for (const r of rows) {
    if (!r.voucher_id) continue; // Opening Balance row

    if ((r.inwards_qty ?? 0) > 0) {
      const prev = inMap.get(r.particulars) ?? { qty: 0, value: 0 };
      inMap.set(r.particulars, {
        qty: prev.qty + (r.inwards_qty ?? 0),
        value: prev.value + (r.inwards_value ?? 0),
      });
    }
    if ((r.outwards_qty ?? 0) > 0) {
      const prev = outMap.get(r.particulars) ?? { qty: 0, value: 0 };
      outMap.set(r.particulars, {
        qty: prev.qty + (r.outwards_qty ?? 0),
        value: prev.value + (r.outwards_value ?? 0),
      });
    }
  }

  const sort = (m: Map<string, { qty: number; value: number }>): PartyTotal[] =>
    [...m.entries()].map(([name, v]) => ({ name, ...v })).sort((a, b) => b.value - a.value);

  return { inward: sort(inMap), outward: sort(outMap) };
}

export default function MovementAnalysis() {
  const navigate = useNavigate();
  const { selectedCompany, activeFY } = useCompany();
  const companyId = selectedCompany?.company_id;
  const fyId = activeFY?.fy_id;
  const fyStart = activeFY?.start_date ?? '';
  const fyEnd = activeFY?.end_date ?? '';
  const periodLabel = fyStart && fyEnd ? `${dmy(fyStart)} to ${dmy(fyEnd)}` : '';

  const [level, setLevel] = React.useState<Level>({ step: 'select' });

  // ── Level 1 — selection popup ──────────────────────────────────────────
  const [allItems, setAllItems] = React.useState<StockItem[]>([]);
  const [listLoading, setListLoading] = React.useState(true);
  const [search, setSearch] = React.useState('');
  const [selectIdx, setSelectIdx] = React.useState(0);

  React.useEffect(() => {
    if (!companyId) {
      setListLoading(false);
      return;
    }
    (window as any).api.stockItem.getAll(companyId).then((res: any) => {
      const list: StockItem[] = ((res.stockItems ?? []) as any[])
        .map((r) => ({ item_id: r.item_id, name: r.name }))
        .sort((a, b) => a.name.localeCompare(b.name));
      setAllItems(list);
      setListLoading(false);
    });
  }, [companyId]);

  const filtered = React.useMemo(
    () =>
      search.trim() === ''
        ? allItems
        : allItems.filter((i) => i.name.toLowerCase().includes(search.toLowerCase())),
    [allItems, search],
  );
  React.useEffect(() => {
    setSelectIdx(0);
  }, [search]);

  // ── Level 2 — movement summary ─────────────────────────────────────────
  const [movLoading, setMovLoading] = React.useState(false);
  const [movErr, setMovErr] = React.useState<string | null>(null);
  const [movData, setMovData] = React.useState<{
    inward: PartyTotal[];
    outward: PartyTotal[];
  } | null>(null);
  const [cursor, setCursor] = React.useState<Cursor>({ section: 'inward', idx: 0 });
  // Keep all rows for the drill-down
  const allRowsRef = React.useRef<VoucherRow[]>([]);

  const openMovement = React.useCallback(
    (item: StockItem) => {
      if (!companyId || !fyId) return;
      setLevel({ step: 'movement', item, allRows: [] });
      setMovLoading(true);
      setMovErr(null);
      setMovData(null);
      setCursor({ section: 'inward', idx: 0 });
      (window as any).api.report
        .stockItemVouchers(companyId, fyId, item.item_id, fyStart, fyEnd)
        .then((res: any) => {
          if (res?.success) {
            const rows: VoucherRow[] = res.rows ?? [];
            allRowsRef.current = rows;
            setMovData(aggregate(rows));
            setLevel({ step: 'movement', item, allRows: rows });
          } else {
            setMovErr(res?.error ?? 'Failed to load movement data.');
          }
          setMovLoading(false);
        })
        .catch((e: any) => {
          setMovErr(e.message);
          setMovLoading(false);
        });
    },
    [companyId, fyId, fyStart, fyEnd],
  );

  // ── Level 3 — party voucher detail ────────────────────────────────────
  const [detailIdx, setDetailIdx] = React.useState(0);

  const openDetail = React.useCallback((item: StockItem, partyName: string) => {
    const rows = allRowsRef.current.filter((r) => r.particulars === partyName);
    setLevel({ step: 'detail', item, partyName, filteredRows: rows });
    setDetailIdx(0);
  }, []);

  // ── Keyboard — selection ───────────────────────────────────────────────
  React.useEffect(() => {
    if (level.step !== 'select') return;
    const h = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectIdx((p) => Math.min(filtered.length - 1, p + 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectIdx((p) => Math.max(0, p - 1));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const it = filtered[selectIdx];
        if (it) openMovement(it);
      } else if (e.key === 'Escape') {
        e.preventDefault();
        navigate(-1);
      }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [level.step, filtered, selectIdx, openMovement, navigate]);

  // ── Keyboard — movement summary ────────────────────────────────────────
  React.useEffect(() => {
    if (level.step !== 'movement') return;
    const inLen = movData?.inward.length ?? 0;
    const outLen = movData?.outward.length ?? 0;

    const h = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setCursor((c) => {
          if (c.section === 'inward') {
            if (c.idx < inLen - 1) return { section: 'inward', idx: c.idx + 1 };
            return { section: 'outward', idx: 0 };
          }
          return { section: 'outward', idx: Math.min(outLen - 1, c.idx + 1) };
        });
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setCursor((c) => {
          if (c.section === 'outward') {
            if (c.idx > 0) return { section: 'outward', idx: c.idx - 1 };
            return { section: 'inward', idx: Math.max(0, inLen - 1) };
          }
          return { section: 'inward', idx: Math.max(0, c.idx - 1) };
        });
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const list = cursor.section === 'inward' ? movData?.inward : movData?.outward;
        const row = list?.[cursor.idx];
        if (row && level.step === 'movement') openDetail(level.item, row.name);
      } else if (e.key === 'Escape' || e.key === 'Backspace') {
        e.preventDefault();
        setLevel({ step: 'select' });
        setMovData(null);
      }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [level, movData, cursor, openDetail]);

  // ── Keyboard — detail vouchers ─────────────────────────────────────────
  React.useEffect(() => {
    if (level.step !== 'detail') return;
    const h = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setDetailIdx((p) => Math.min(level.filteredRows.length - 1, p + 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setDetailIdx((p) => Math.max(0, p - 1));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const r = level.filteredRows[detailIdx];
        if (r?.voucher_id) navigate(`/transactions/voucher/${r.voucher_id}`);
      } else if (e.key === 'Escape' || e.key === 'Backspace') {
        e.preventDefault();
        setLevel({ step: 'movement', item: level.item, allRows: allRowsRef.current });
      }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [level, detailIdx, navigate]);

  // ── Render — selection popup ───────────────────────────────────────────
  if (level.step === 'select') {
    return (
      <div className="flex-1 flex flex-col h-full bg-white select-none text-zinc-900 font-sans text-[11px]">
        <div className="flex items-center justify-between px-3 py-1.5 bg-white border-b-2 border-zinc-900">
          <span className="font-bold text-sm tracking-wide">Item Movement Analysis</span>
          <span className="font-bold text-sm">{selectedCompany?.name ?? ''}</span>
          <span />
        </div>
        <SelectionPopup
          title="Select Stock Item"
          fieldLabel="Name of Item"
          listLabel="List of Stock Items"
          companyName={selectedCompany?.name}
          items={filtered.map((i) => ({ id: i.item_id, name: i.name }))}
          index={selectIdx}
          loading={listLoading}
          search={search}
          onSearchChange={setSearch}
          onIndexChange={setSelectIdx}
          onAccept={(i) => {
            const it = filtered[i];
            if (it) openMovement(it);
          }}
          onCancel={() => navigate(-1)}
          onCreate={() => navigate('/master/create/stock-item')}
        />
      </div>
    );
  }

  // ── Render — party voucher detail ──────────────────────────────────────
  if (level.step === 'detail') {
    return (
      <ItemVoucherAnalysis
        itemName={`${level.item.name} — ${level.partyName}`}
        companyName={selectedCompany?.name}
        periodLabel={periodLabel}
        rows={level.filteredRows}
        loading={false}
        error={null}
        selectedIndex={detailIdx}
        onSelectIndex={setDetailIdx}
        onOpenVoucher={(r) => r.voucher_id && navigate(`/transactions/voucher/${r.voucher_id}`)}
        footer={
          <div className="flex items-center gap-6 px-3 py-1 border-t border-zinc-300 bg-white text-[10px] font-semibold text-zinc-600 shrink-0">
            <button
              onClick={() =>
                setLevel({ step: 'movement', item: level.item, allRows: allRowsRef.current })
              }
              className="hover:text-zinc-900"
            >
              Q: Back
            </button>
            <span className="text-zinc-400">Enter: Open Voucher · Esc: Back to Movement</span>
          </div>
        }
      />
    );
  }

  // ── Render — movement summary (two-section layout) ────────────────────
  const inRows = movData?.inward ?? [];
  const outRows = movData?.outward ?? [];
  const inTotal = {
    qty: inRows.reduce((s, r) => s + r.qty, 0),
    value: inRows.reduce((s, r) => s + r.value, 0),
  };
  const outTotal = {
    qty: outRows.reduce((s, r) => s + r.qty, 0),
    value: outRows.reduce((s, r) => s + r.value, 0),
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-white select-none text-zinc-900 font-sans text-[11px]">
      {/* Title bar */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-white border-b-2 border-zinc-900">
        <span className="font-bold text-sm tracking-wide">Item Movement Analysis</span>
        <span className="font-bold text-sm">{selectedCompany?.name ?? ''}</span>
        <span />
      </div>

      {/* Subtitle: item + period */}
      <div className="flex justify-between items-center px-3 py-1.5 bg-white border-b border-zinc-300 font-mono text-[11px]">
        <span className="font-semibold">Stock Item: {level.item.name}</span>
        <span>Movement Values: Qty | Value&nbsp;&nbsp;{periodLabel}</span>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto">
        {movLoading ? (
          <div className="px-4 py-8 text-center text-zinc-400 italic">Loading…</div>
        ) : movErr ? (
          <div className="px-4 py-8 text-center text-zinc-600">{movErr}</div>
        ) : (
          <table className="w-full border-collapse text-[11px] font-mono">
            <colgroup>
              <col />
              <col className="w-32" />
              <col className="w-36" />
            </colgroup>
            <thead className="sticky top-0 bg-zinc-100 border-b border-zinc-300 z-10 text-zinc-700">
              <tr>
                <th className="px-3 py-1 text-left font-bold">Particulars</th>
                <th className="px-3 py-1 text-right font-bold">Quantity</th>
                <th className="px-3 py-1 text-right font-bold">Value</th>
              </tr>
            </thead>
            <tbody>
              {/* ── Movement Inward section ── */}
              <tr className="bg-zinc-50 border-t border-zinc-300">
                <td colSpan={3} className="px-3 py-1 font-bold text-zinc-900 tracking-wide">
                  Movement Inward:
                </td>
              </tr>
              <tr className="bg-zinc-50 border-b border-zinc-200">
                <td colSpan={3} className="px-6 py-0.5 text-zinc-500 italic text-[10px]">
                  Suppliers
                </td>
              </tr>
              {inRows.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-6 py-2 text-zinc-400 italic">
                    No inward movement
                  </td>
                </tr>
              ) : (
                inRows.map((r, idx) => (
                  <tr
                    key={r.name}
                    onClick={() => setCursor({ section: 'inward', idx })}
                    onDoubleClick={() => openDetail(level.item, r.name)}
                    className={`border-b border-zinc-100 cursor-pointer ${
                      cursor.section === 'inward' && cursor.idx === idx
                        ? 'bg-zinc-200 text-zinc-950 font-bold'
                        : 'hover:bg-zinc-50 text-zinc-800'
                    }`}
                  >
                    <td className="px-6 py-1">{r.name}</td>
                    <td className="px-3 py-1 text-right">{fmtQty(r.qty)}</td>
                    <td className="px-3 py-1 text-right">{fmtVal(r.value)}</td>
                  </tr>
                ))
              )}
              <tr className="border-t border-zinc-300 bg-zinc-50 font-bold text-zinc-900">
                <td className="px-6 py-1">Total</td>
                <td className="px-3 py-1 text-right">{fmtQty(inTotal.qty)}</td>
                <td className="px-3 py-1 text-right">{fmtVal(inTotal.value)}</td>
              </tr>

              {/* ── Spacer ── */}
              <tr>
                <td colSpan={3} className="py-2" />
              </tr>

              {/* ── Movement Outward section ── */}
              <tr className="bg-zinc-50 border-t border-zinc-300">
                <td colSpan={3} className="px-3 py-1 font-bold text-zinc-900 tracking-wide">
                  Movement Outward:
                </td>
              </tr>
              <tr className="bg-zinc-50 border-b border-zinc-200">
                <td colSpan={3} className="px-6 py-0.5 text-zinc-500 italic text-[10px]">
                  Buyers
                </td>
              </tr>
              {outRows.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-6 py-2 text-zinc-400 italic">
                    No outward movement
                  </td>
                </tr>
              ) : (
                outRows.map((r, idx) => (
                  <tr
                    key={r.name}
                    onClick={() => setCursor({ section: 'outward', idx })}
                    onDoubleClick={() => openDetail(level.item, r.name)}
                    className={`border-b border-zinc-100 cursor-pointer ${
                      cursor.section === 'outward' && cursor.idx === idx
                        ? 'bg-zinc-200 text-zinc-950 font-bold'
                        : 'hover:bg-zinc-50 text-zinc-800'
                    }`}
                  >
                    <td className="px-6 py-1">{r.name}</td>
                    <td className="px-3 py-1 text-right">{fmtQty(r.qty)}</td>
                    <td className="px-3 py-1 text-right">{fmtVal(r.value)}</td>
                  </tr>
                ))
              )}
              <tr className="border-t border-zinc-300 bg-zinc-50 font-bold text-zinc-900">
                <td className="px-6 py-1">Total</td>
                <td className="px-3 py-1 text-right">{fmtQty(outTotal.qty)}</td>
                <td className="px-3 py-1 text-right">{fmtVal(outTotal.value)}</td>
              </tr>
            </tbody>
          </table>
        )}
      </div>

      {/* Footer action bar */}
      <div className="flex items-center gap-6 px-3 py-1 border-t border-zinc-300 bg-white text-[10px] font-semibold text-zinc-600 shrink-0">
        <span className="text-zinc-400">Enter: Show Vouchers</span>
        <span className="text-zinc-400">↑↓: Navigate sections</span>
        <span className="text-zinc-400">Esc: Back to Selection</span>
      </div>
    </div>
  );
}
