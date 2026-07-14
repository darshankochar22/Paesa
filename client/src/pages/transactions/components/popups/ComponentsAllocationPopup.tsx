import { useState, useRef } from 'react';
import type { ComponentAllocationRow } from '../../types';
import { useCompany } from '../../../../context/CompanyContext';
import { isFeatureEnabled } from '@/lib/companyFeatures';
import { VoucherPopupShell } from '@/components/tally-ui/VoucherPopupShell';

interface GodownOption {
  godown_id?: number;
  name: string;
}

interface Props {
  parentItemName: string;
  forGodown: string;
  /** Batch / Lot selected on the parent item allocation — batch items only. */
  forBatch?: string;
  quantity: number;
  unitSymbol?: string;
  voucherDate: string;
  allStockItems: any[];
  allGodowns: GodownOption[];
  allUnits: any[];
  initialRows?: ComponentAllocationRow[];
  onClose: () => void;
  onSave: (rows: ComponentAllocationRow[]) => void;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
function fmtDate(iso: string) {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return `${d.getDate()}-${MONTHS[d.getMonth()]}-${String(d.getFullYear()).slice(-2)}`;
}

const TRACK_OPTIONS = ['Pending to Issue', 'Pending to Receive'] as const;

interface BatchOption {
  name: string;
  mfg_date?: string | null;
  expiry_date?: string | null;
}

interface CompRow {
  id: number;
  item_id?: number;
  item_name: string;
  unit_symbol: string;
  isBatch: boolean;
  showTrackDD: boolean;
  showGodownDD: boolean;
  showBatchDD: boolean;
  track: 'Pending to Issue' | 'Pending to Receive' | '';
  due_on: string;
  godown: string;
  batch_lot: string;
  mfg_date: string;
  expiry_date: string;
  actual_qty: string;
  as_per_bom: string;
  rate: string;
  amount: number;
}

const num = (v: number) =>
  v ? v.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '';

// Per-godown balance label — Tally shows negatives as "(-)9 Box"; blank when zero.
const fmtQty = (q: number | undefined, unit?: string) => {
  if (!q) return '';
  const u = unit || '';
  return q < 0 ? `(-)${Math.abs(q)} ${u}`.trim() : `${q} ${u}`.trim();
};

const focusEl = (sel: string) =>
  setTimeout(() => (document.querySelector(sel) as HTMLElement | null)?.focus(), 30);

export default function ComponentsAllocationPopup({
  parentItemName,
  forGodown,
  forBatch,
  quantity,
  unitSymbol,
  voucherDate,
  allStockItems,
  allGodowns,
  allUnits,
  initialRows,
  onClose,
  onSave,
}: Props) {
  const { selectedCompany, features } = useCompany();
  const companyId = selectedCompany?.company_id;
  // F11 "Enable Batches" gates the per-component Batch / Lot column, same as the
  // parent item allocation — an item's own track_batches only matters when on.
  const batchesOn = isFeatureEnabled(features, 'enable_batches');

  // Per-godown balances, cached per component item id (each row can hold a
  // different item). Fetched lazily when a row's godown picker opens.
  const [godownBalByItem, setGodownBalByItem] = useState<Record<number, Record<number, number>>>(
    {},
  );
  const ensureGodownBal = (iid?: number) => {
    if (!companyId || !iid || godownBalByItem[iid]) return;
    (window as any).api.stockItem
      .getStockBalancesByGodown({ company_id: companyId, item_id: iid })
      .then((res: any) => {
        if (res?.success && res.balances)
          setGodownBalByItem((prev) => ({ ...prev, [iid]: res.balances }));
      })
      .catch(() => {});
  };

  const rowIdRef = useRef(0);
  const nextRowId = () => ++rowIdRef.current;
  const newRow = (): CompRow => ({
    id: nextRowId(),
    item_name: '',
    unit_symbol: '',
    isBatch: false,
    showTrackDD: false,
    showGodownDD: false,
    showBatchDD: false,
    track: '',
    due_on: voucherDate,
    godown: '',
    batch_lot: '',
    mfg_date: '',
    expiry_date: '',
    actual_qty: '',
    as_per_bom: '',
    rate: '',
    amount: 0,
  });

  const [rows, setRows] = useState<CompRow[]>(() => {
    if (initialRows?.length) {
      return initialRows.map((r) => {
        const si = allStockItems.find((s: any) => s.name === r.item_name);
        return {
          id: nextRowId(),
          item_id: si?.item_id,
          item_name: r.item_name,
          unit_symbol: r.unit_symbol ?? '',
          isBatch: batchesOn && si ? Boolean(Number(si.track_batches)) : false,
          showTrackDD: false,
          showGodownDD: false,
          showBatchDD: false,
          track: r.track || '',
          due_on: r.due_on || voucherDate,
          godown: r.godown,
          batch_lot: r.batch_lot ?? '',
          mfg_date: r.mfg_date ?? '',
          expiry_date: r.expiry_date ?? '',
          actual_qty: r.actual_qty ? String(r.actual_qty) : '',
          as_per_bom: r.as_per_bom ? String(r.as_per_bom) : '',
          rate: r.rate ? String(r.rate) : '',
          amount: r.amount,
        };
      });
    }
    return [newRow()];
  });

  const [showItemDD, setShowItemDD] = useState<number | null>(null);
  const [itemSearch, setItemSearch] = useState<Record<number, string>>({});
  const [error, setError] = useState<string | null>(null);
  // Existing batches per item_id (List of Active Batches for the batch column).
  const [batchCache, setBatchCache] = useState<Record<number, BatchOption[]>>({});

  const update = (id: number, patch: Partial<CompRow>) => {
    // Data edits clear the inline error; dropdown open/close toggles don't.
    if (
      Object.keys(patch).some(
        (k) => k !== 'showTrackDD' && k !== 'showGodownDD' && k !== 'showBatchDD',
      )
    ) {
      setError(null);
    }
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  };

  const loadBatches = (itemId?: number) => {
    if (!itemId || !companyId || batchCache[itemId]) return;
    (window as any).api.report
      .batchesForItem?.(companyId, itemId)
      .then((res: any) => {
        if (res?.success) setBatchCache((p) => ({ ...p, [itemId]: res.batches ?? [] }));
      })
      .catch(() => {});
  };

  const totalActual = rows.reduce((s, r) => s + (Number(r.actual_qty) || 0), 0);
  const totalBoM = rows.reduce((s, r) => s + (Number(r.as_per_bom) || 0), 0);
  // Quantity totals only make sense when every contributing row shares one unit.
  const unitsOf = (getQty: (r: CompRow) => number) =>
    new Set(rows.filter((r) => getQty(r) > 0).map((r) => r.unit_symbol || ''));
  const actualUnitsMixed = unitsOf((r) => Number(r.actual_qty) || 0).size > 1;
  const bomUnitsMixed = unitsOf((r) => Number(r.as_per_bom) || 0).size > 1;
  const totalAmount = rows.reduce((s, r) => s + (r.amount || 0), 0);

  const handleAccept = () => {
    const filled = rows.filter((r) => r.item_name.trim());
    const missingTrack = filled.find((r) => !r.track);
    if (missingTrack) {
      setError(`Select Track (Type of Component) for "${missingTrack.item_name}".`);
      return;
    }
    onSave(
      filled.map((r): ComponentAllocationRow => ({
        item_name: r.item_name,
        track: r.track as 'Pending to Issue' | 'Pending to Receive',
        due_on: r.due_on,
        godown: r.godown,
        batch_lot: r.batch_lot || undefined,
        mfg_date: r.isBatch && r.mfg_date ? r.mfg_date : undefined,
        expiry_date: r.isBatch && r.expiry_date ? r.expiry_date : undefined,
        actual_qty: Number(r.actual_qty) || 0,
        as_per_bom: Number(r.as_per_bom) || 0,
        rate: Number(r.rate) || 0,
        unit_symbol: r.unit_symbol || undefined,
        amount: r.amount,
      })),
    );
  };

  const filteredItems = (id: number) => {
    const q = (itemSearch[id] ?? '').trim().toLowerCase();
    return allStockItems.filter((s: any) => !q || s.name.toLowerCase().includes(q));
  };

  const inputCls =
    'text-xs px-1 py-0.5 bg-white border border-gray-400 w-full outline-none focus:border-black';
  const ddHeadCls = 'bg-white text-black text-[10px] font-bold px-2 py-1 border-b border-gray-400';
  const W = {
    name: 'w-28',
    track: 'w-28',
    godown: 'w-24',
    batch: 'w-20',
    qty: 'w-16',
    rate: 'w-20',
    per: 'w-8',
    amount: 'w-24',
  };
  const cell = 'shrink-0';

  return (
    <VoucherPopupShell
      title="Components Allocation"
      headerRight={
        <span>
          Components Allocations for <span className="font-bold text-black">{parentItemName}</span>
        </span>
      }
      onClose={onClose}
      onAccept={handleAccept}
      bodyClassName="p-0 flex flex-col"
    >
      {/* Info block */}
      <div className="px-6 py-3 border-b border-gray-300 text-xs space-y-0.5">
        <div className="flex gap-2">
          <span className="w-52 text-gray-600 shrink-0">Components Allocations for</span>
          <span className="font-bold">{parentItemName}</span>
        </div>
        <div className="flex gap-2">
          <span className="w-52 text-gray-600 shrink-0">For Godown</span>
          <span className="font-semibold">{forGodown}</span>
        </div>
        {forBatch && (
          <div className="flex gap-2">
            <span className="w-52 text-gray-600 shrink-0">For Batch</span>
            <span className="font-semibold">{forBatch}</span>
          </div>
        )}
        <div className="flex gap-2">
          <span className="w-52 text-gray-600 shrink-0">Quantity</span>
          <span className="font-semibold">
            {quantity} {unitSymbol ?? ''}
          </span>
        </div>
        <div className="flex gap-2">
          <span className="w-52 text-gray-600 shrink-0">Fill Components using</span>
          <span className="font-semibold">&#9670; Not Applicable</span>
        </div>
      </div>

      {error && (
        <div className="mx-6 mt-2 border border-gray-400 border-l-2 border-l-black text-black font-semibold text-xs px-3 py-2 flex justify-between items-center">
          <span>&bull; {error}</span>
          <button onClick={() => setError(null)} className="font-bold">
            &times;
          </button>
        </div>
      )}

      {/* Table */}
      <div className="flex-1 min-h-0">
        {/* Column headers */}
        <div className="border-b border-gray-400 bg-white text-[10px] font-bold uppercase tracking-wide text-black">
          <div className="flex px-6 pt-1.5 gap-2">
            <div className={`${cell} ${W.name}`}>Name of Item</div>
            <div className={`${cell} ${W.track}`}>Track</div>
            <div className={`${cell} ${W.godown}`}>Godown</div>
            <div className={`${cell} ${W.batch} text-center`}>Batch/Lot No.</div>
            <div className={`${cell} ${W.qty} text-right`}>Quantity</div>
            <div className={`${cell} ${W.qty} text-right`}>&nbsp;</div>
            <div className={`${cell} ${W.rate} text-right`}>Rate</div>
            <div className={`${cell} ${W.per} text-center`}>per</div>
            <div className={`${cell} ${W.amount} text-right`}>Amount</div>
          </div>
          <div className="flex px-6 pb-1.5 gap-2 text-[9px] text-gray-600">
            <div className={`${cell} ${W.name}`} />
            <div className={`${cell} ${W.track}`} />
            <div className={`${cell} ${W.godown}`} />
            <div className={`${cell} ${W.batch} flex gap-1 text-center`}>
              <div className="flex-1">Mfg Dt.</div>
              <div className="flex-1">Expiry Date</div>
            </div>
            <div className={`${cell} ${W.qty} text-right`}>Actual</div>
            <div className={`${cell} ${W.qty} text-right`}>As per BoM</div>
            <div className={`${cell} ${W.rate}`} />
            <div className={`${cell} ${W.per}`} />
            <div className={`${cell} ${W.amount}`} />
          </div>
        </div>

        {/* Rows */}
        {rows.map((row, idx) => (
          <div key={row.id} className="border-b border-gray-200">
            {/* Header line: item name + track dropdown */}
            <div className="flex items-center px-6 pt-1 gap-2">
              {/* Item name */}
              <div className={`${cell} ${W.name} relative`}>
                <input
                  type="text"
                  autoFocus={idx === 0}
                  data-ca-item={idx}
                  value={showItemDD === idx ? (itemSearch[row.id] ?? '') : row.item_name}
                  onChange={(e) => {
                    setItemSearch((p) => ({ ...p, [row.id]: e.target.value }));
                    update(row.id, { item_name: '' });
                    setShowItemDD(idx);
                  }}
                  onFocus={() => {
                    setShowItemDD(idx);
                    setItemSearch((p) => ({ ...p, [row.id]: '' }));
                  }}
                  onBlur={() => setTimeout(() => setShowItemDD(null), 150)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      if (!row.item_name.trim()) {
                        const filled = rows.filter((r) => r.item_name.trim());
                        if (filled.length > 0) {
                          handleAccept();
                          return;
                        }
                      }
                      focusEl(`[data-ca-track="${idx}"]`);
                    }
                  }}
                  placeholder="Select item…"
                  className={`${inputCls} font-semibold`}
                />
                {showItemDD === idx && (
                  <div className="absolute left-0 top-full mt-0.5 w-52 bg-white border border-gray-400 shadow-xl z-50 max-h-48 overflow-y-auto">
                    <div className={ddHeadCls}>List of Stock Items</div>
                    {filteredItems(row.id).map((s: any) => (
                      <button
                        key={s.item_id}
                        type="button"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          const unit = allUnits.find((u: any) => u.unit_id === s.unit_id);
                          // Rate seed from real StockItemType keys: opening_rate,
                          // else derived opening_value / opening_quantity.
                          const openQty = Number(s.opening_quantity) || 0;
                          const autoRate =
                            Number(s.opening_rate) ||
                            (openQty > 0 ? (Number(s.opening_value) || 0) / openQty : 0) ||
                            0;
                          update(row.id, {
                            item_id: s.item_id,
                            item_name: s.name,
                            unit_symbol: unit?.symbol ?? '',
                            isBatch: batchesOn && Boolean(Number(s.track_batches)),
                            rate: autoRate ? String(Math.round(autoRate * 100) / 100) : '',
                          });
                          setShowItemDD(null);
                          focusEl(`[data-ca-track="${idx}"]`);
                        }}
                        className="block w-full text-left text-[11px] px-2 py-1 hover:bg-gray-100 border-b border-gray-100 font-semibold"
                      >
                        {s.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Track (Type of Component) */}
              <div className={`${cell} ${W.track} relative`}>
                <button
                  type="button"
                  data-ca-track={idx}
                  onClick={() => update(row.id, { showTrackDD: !row.showTrackDD })}
                  className={`${inputCls} text-left ${row.track ? 'font-semibold' : 'text-gray-400'}`}
                >
                  {row.track || 'Type of Component'}
                </button>
                {row.showTrackDD && (
                  <div className="absolute left-0 top-full mt-0.5 w-44 bg-white border border-gray-400 shadow-xl z-50">
                    <div className={ddHeadCls}>Type of Component</div>
                    {TRACK_OPTIONS.map((t) => (
                      <button
                        key={t}
                        type="button"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          update(row.id, { track: t, showTrackDD: false });
                          focusEl(`[data-ca-godown="${idx}"]`);
                        }}
                        className={`block w-full text-left text-[11px] px-2 py-1 hover:bg-gray-100 border-b border-gray-100 ${t === row.track ? 'font-bold' : ''}`}
                      >
                        {t === row.track ? `♦ ${t}` : t}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Remaining header columns empty */}
              <div className={`${cell} ${W.godown}`} />
              <div className={`${cell} ${W.batch}`} />
              <div className={`${cell} ${W.qty}`} />
              <div className={`${cell} ${W.qty}`} />
              <div className={`${cell} ${W.rate}`} />
              <div className={`${cell} ${W.per}`} />
              <div className={`${cell} ${W.amount}`} />
            </div>

            {/* Sub-line: Due on (name col) | spacer (track col) | Godown | Batch? | Qty (Actual/BoM) | Rate | Amount */}
            <div className="flex items-center px-6 pb-1 gap-2">
              {/* Due on — stays in the Name column */}
              <div
                className={`${cell} ${W.name} text-[10px] text-gray-600 italic flex items-center gap-0.5 shrink-0`}
              >
                <span className="shrink-0">Due on :</span>
                <input
                  type="date"
                  data-ca-due={idx}
                  value={row.due_on}
                  onChange={(e) => update(row.id, { due_on: e.target.value })}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      focusEl(`[data-ca-godown="${idx}"]`);
                    }
                  }}
                  className="text-[10px] border-b border-gray-400 outline-none bg-transparent min-w-0 flex-1 ml-0.5 focus:border-black"
                  title={fmtDate(row.due_on)}
                />
              </div>

              {/* Empty spacer — aligns with Track column */}
              <div className={`${cell} ${W.track}`} />

              {/* Godown — aligned under the Godown column header */}
              <div className={`${cell} ${W.godown} relative`}>
                <input
                  type="text"
                  data-ca-godown={idx}
                  value={row.godown}
                  onChange={(e) => update(row.id, { godown: e.target.value })}
                  onFocus={() => {
                    update(row.id, { showGodownDD: true });
                    ensureGodownBal(row.item_id);
                  }}
                  onBlur={() => setTimeout(() => update(row.id, { showGodownDD: false }), 150)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      focusEl(
                        row.isBatch ? `[data-ca-batch="${idx}"]` : `[data-ca-actual="${idx}"]`,
                      );
                    }
                  }}
                  placeholder="Location"
                  className={inputCls}
                />
                {row.showGodownDD && (
                  <div className="absolute left-0 top-full mt-0.5 w-44 bg-white border border-gray-400 shadow-xl z-40 max-h-40 overflow-y-auto">
                    <div className={ddHeadCls}>List of Godowns</div>
                    {allGodowns
                      .filter(
                        (g) =>
                          !row.godown || g.name.toLowerCase().includes(row.godown.toLowerCase()),
                      )
                      .map((g: any) => (
                        <button
                          key={g.godown_id ?? g.name}
                          type="button"
                          onMouseDown={(e) => {
                            e.preventDefault();
                            update(row.id, { godown: g.name, showGodownDD: false });
                            focusEl(
                              row.isBatch
                                ? `[data-ca-batch="${idx}"]`
                                : `[data-ca-actual="${idx}"]`,
                            );
                          }}
                          className="flex w-full items-center justify-between text-left text-[11px] px-2 py-1 hover:bg-gray-100 border-b border-gray-100 font-semibold"
                        >
                          <span className="truncate">{g.name}</span>
                          <span className="font-mono text-gray-600 shrink-0 ml-2">
                            {g.godown_id != null
                              ? fmtQty(
                                  godownBalByItem[row.item_id as number]?.[g.godown_id],
                                  row.unit_symbol,
                                )
                              : ''}
                          </span>
                        </button>
                      ))}
                  </div>
                )}
              </div>

              {/* Batch/Lot No. — only active for batch-tracked component items */}
              <div className={`${cell} ${W.batch} relative`}>
                {row.isBatch ? (
                  <>
                    <input
                      type="text"
                      data-ca-batch={idx}
                      value={row.batch_lot}
                      onChange={(e) => update(row.id, { batch_lot: e.target.value })}
                      onFocus={() => {
                        loadBatches(row.item_id);
                        update(row.id, { showBatchDD: true });
                      }}
                      onBlur={() => setTimeout(() => update(row.id, { showBatchDD: false }), 150)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          update(row.id, { showBatchDD: false });
                          focusEl(`[data-ca-actual="${idx}"]`);
                        }
                      }}
                      placeholder="Any"
                      className={inputCls}
                    />
                    {/* Mfg / Expiry — saved with the row (batch-tracked items). */}
                    <div className="flex gap-1 mt-0.5">
                      <input
                        type="date"
                        value={row.mfg_date}
                        onChange={(e) => update(row.id, { mfg_date: e.target.value })}
                        className={`${inputCls} flex-1 min-w-0 font-mono text-[9px] px-0.5`}
                        title="Mfg Dt."
                      />
                      <input
                        type="date"
                        value={row.expiry_date}
                        onChange={(e) => update(row.id, { expiry_date: e.target.value })}
                        className={`${inputCls} flex-1 min-w-0 font-mono text-[9px] px-0.5`}
                        title="Expiry Date"
                      />
                    </div>
                    {row.showBatchDD && !!row.item_id && (
                      <div className="absolute left-0 top-full mt-0.5 w-44 bg-white border border-gray-400 shadow-xl z-40 max-h-40 overflow-y-auto">
                        <div className={ddHeadCls}>List of Active Batches</div>
                        {(batchCache[row.item_id] ?? [])
                          .filter(
                            (b) =>
                              !row.batch_lot ||
                              b.name.toLowerCase().includes(row.batch_lot.toLowerCase()),
                          )
                          .map((b) => (
                            <button
                              key={b.name}
                              type="button"
                              onMouseDown={(e) => {
                                e.preventDefault();
                                update(row.id, {
                                  batch_lot: b.name,
                                  showBatchDD: false,
                                  mfg_date: row.mfg_date || b.mfg_date || '',
                                  expiry_date: row.expiry_date || b.expiry_date || '',
                                });
                                focusEl(`[data-ca-actual="${idx}"]`);
                              }}
                              className="block w-full text-left text-[11px] px-2 py-1 hover:bg-gray-100 border-b border-gray-100 font-semibold"
                            >
                              {b.name}
                            </button>
                          ))}
                        {(batchCache[row.item_id] ?? []).length === 0 && (
                          <div className="text-[10px] text-gray-500 px-2 py-1.5 text-center">
                            No existing batches
                          </div>
                        )}
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-[11px] text-gray-300 px-1 text-center">—</div>
                )}
              </div>

              {/* Actual Qty */}
              <div className={`${cell} ${W.qty}`}>
                <input
                  type="text"
                  inputMode="decimal"
                  data-ca-actual={idx}
                  value={row.actual_qty}
                  onChange={(e) => {
                    const v = e.target.value;
                    const amt = (Number(v) || 0) * (Number(row.rate) || 0);
                    update(row.id, { actual_qty: v, amount: amt });
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      // If rate already autofilled, skip BoM and rate and go to next row/accept
                      if (row.rate) {
                        if (idx === rows.length - 1) {
                          setRows((prev) => [...prev, newRow()]);
                          setTimeout(() => focusEl(`[data-ca-item="${idx + 1}"]`), 40);
                        } else {
                          focusEl(`[data-ca-item="${idx + 1}"]`);
                        }
                      } else {
                        focusEl(`[data-ca-rate="${idx}"]`);
                      }
                    }
                  }}
                  className={`${inputCls} text-right font-mono`}
                />
              </div>

              {/* As per BoM */}
              <div className={`${cell} ${W.qty}`}>
                <input
                  type="text"
                  inputMode="decimal"
                  data-ca-bom={idx}
                  value={row.as_per_bom}
                  onChange={(e) => {
                    // Informational only — the amount tracks the Actual quantity.
                    update(row.id, { as_per_bom: e.target.value });
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      focusEl(`[data-ca-rate="${idx}"]`);
                    }
                  }}
                  className={`${inputCls} text-right font-mono`}
                />
              </div>

              {/* Rate */}
              <div className={`${cell} ${W.rate}`}>
                <input
                  type="text"
                  inputMode="decimal"
                  data-ca-rate={idx}
                  value={row.rate}
                  onChange={(e) => {
                    const v = e.target.value;
                    const qty = Number(row.actual_qty) || 0;
                    update(row.id, { rate: v, amount: qty * (Number(v) || 0) });
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      if (idx === rows.length - 1) {
                        setRows((prev) => [...prev, newRow()]);
                        setTimeout(() => focusEl(`[data-ca-item="${idx + 1}"]`), 40);
                      } else {
                        focusEl(`[data-ca-item="${idx + 1}"]`);
                      }
                    }
                  }}
                  className={`${inputCls} text-right font-mono`}
                />
              </div>

              {/* per */}
              <div className={`${cell} ${W.per} text-center text-[11px] text-gray-600 font-mono`}>
                {row.unit_symbol}
              </div>

              {/* Amount */}
              <div className={`${cell} ${W.amount} text-right text-xs font-mono font-semibold`}>
                {row.amount > 0 ? num(row.amount) : ''}
              </div>
            </div>
          </div>
        ))}

        {/* Empty filler rows */}
        {Array.from({ length: Math.max(0, 4 - rows.length) }).map((_, i) => (
          <div key={`ef-${i}`} className="flex border-b border-gray-100 min-h-[48px] px-6" />
        ))}
      </div>

      {/* Totals */}
      <div className="flex items-center border-t border-black bg-white px-6 py-1.5 gap-2 font-bold text-xs font-mono shrink-0">
        <div className={`${cell} ${W.name}`} />
        <div className={`${cell} ${W.track}`} />
        <div className={`${cell} ${W.godown}`} />
        <div className={`${cell} ${W.batch}`} />
        <div className={`${cell} ${W.qty} text-right`}>
          {totalActual > 0 && !actualUnitsMixed ? totalActual : ''}
        </div>
        <div className={`${cell} ${W.qty} text-right`}>
          {totalBoM > 0 && !bomUnitsMixed ? totalBoM : ''}
        </div>
        <div className={`${cell} ${W.rate}`} />
        <div className={`${cell} ${W.per}`} />
        <div className={`${cell} ${W.amount} text-right`}>
          {totalAmount > 0 ? num(totalAmount) : ''}
        </div>
      </div>
    </VoucherPopupShell>
  );
}
