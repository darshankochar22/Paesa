import { useState, useEffect, useCallback, useRef } from 'react';
import { NotificationBanner } from '@/components/ui';
import { createPortal } from 'react-dom';
import type { BatchAllocation } from '../../types';
import { VoucherPopupShell } from '@/components/tally-ui/VoucherPopupShell';
import { parseDueOn, toLocalIsoDate } from '@/lib/dueDate';

// Material In / Out (job work) Stock Item Allocations — order-tracked godown rows.
// Items that "maintain in batches" additionally get Batch/Lot No. + Mfg Dt. /
// Expiry Date columns. Order No. and Batch/Lot No. open Tally-style list popups
// (List of Orders / List of Active Batches) with a New Number entry. Strict
// grayscale per UI.md.

interface GodownOption {
  godown_id?: number;
  name: string;
}
interface ItemOption {
  item_id?: number;
  name: string;
}

interface Props {
  itemName: string;
  rate: number;
  unitSymbol?: string;
  godowns?: GodownOption[];
  stockItems?: ItemOption[];
  showBatch?: boolean;
  trackMfg?: boolean;
  trackExpiry?: boolean;
  /** Company + item ids enable the real List of Orders / Active Batches lookups
   *  (window.api.report.orderNumbers / batchBalances). Session-only lists are
   *  used when absent. */
  companyId?: number;
  itemId?: number;
  /** Voucher date (ISO yyyy-mm-dd): default for Mfg Dt. and base for "Due on"
   *  duration parsing. Falls back to today when absent. */
  voucherDate?: string;
  initialAllocations?: BatchAllocation[];
  onClose: () => void;
  onSave: (allocations: BatchAllocation[]) => void;
}

interface FetchedOrder {
  name: string;
  batch?: string | null;
  godown?: string | null;
  due_on?: string | null;
  balance?: number | null;
}
interface FetchedBatch {
  name: string;
  mfg_date?: string | null;
  expiry_date?: string | null;
  balance?: number | null;
}

const NOT_APPLICABLE = '♦ Not Applicable';

// Per-godown balance label — Tally shows negatives as "(-)9 Box"; blank when zero.
const fmtQty = (q: number | undefined, unit?: string) => {
  if (!q) return '';
  const u = unit || '';
  return q < 0 ? `(-)${Math.abs(q)} ${u}`.trim() : `${q} ${u}`.trim();
};
// Fixed column widths — Godown/Batch sit left, the numeric group is pinned to
// the right of the full-width panel, with a flex spacer filling the middle
// (mirrors TallyPrime's allocation grid).
const GODOWN = 'w-72';
const BATCHCOL = 'w-64';
const QTY = 'w-28';
const RATE = 'w-24';
const PER = 'w-12';
const AMT = 'w-32';
const ORDER_COLS = 'grid grid-cols-[1.3fr_0.8fr_1fr_0.8fr_0.8fr_1.3fr_0.9fr] gap-x-2';
const BATCH_COLS = 'grid grid-cols-[1fr_auto_auto] gap-x-3';

export default function MaterialInAllocationPopup({
  itemName,
  rate,
  unitSymbol,
  godowns = [],
  stockItems = [],
  showBatch = false,
  trackMfg = false,
  trackExpiry = false,
  companyId,
  itemId,
  voucherDate,
  initialAllocations = [],
  onClose,
  onSave,
}: Props) {
  const defaultGodown = godowns[0]?.name ?? '';
  const unit = unitSymbol ?? '';

  // Per-godown balances for this item — appended to each godown option label.
  const [godownBal, setGodownBal] = useState<Record<number, number>>({});
  useEffect(() => {
    if (!companyId || !itemId) return;
    (window as any).api.stockItem
      .getStockBalancesByGodown({ company_id: companyId, item_id: itemId })
      .then((res: any) => {
        if (res?.success && res.balances) setGodownBal(res.balances);
      })
      .catch(() => {});
  }, [companyId, itemId]);
  // Mfg Dt. defaults to the voucher's date, not the machine's — local-timezone
  // today only as a fallback when the caller doesn't pass one.
  const today =
    voucherDate && /^\d{4}-\d{2}-\d{2}/.test(voucherDate)
      ? voucherDate.slice(0, 10)
      : toLocalIsoDate(new Date());

  const emptyRow = (): BatchAllocation => ({
    batch_number: '',
    order_no: '',
    due_on: '',
    component_of: NOT_APPLICABLE,
    godown: defaultGodown,
    mfg_date: showBatch && trackMfg ? today : '', // auto-assigned at manufacture
    expiry_date: '',
    quantity: 0,
    rate,
  });

  // Hydrate Consider-as-Scrap from the saved rows (it's saved per-row but is a
  // screen-level answer in Tally, so any "Yes" means the whole allocation is scrap).
  const [considerAsScrap, setConsiderAsScrap] = useState<'Yes' | 'No'>(() =>
    initialAllocations.some((a) => a.consider_as_scrap === 'Yes') ? 'Yes' : 'No',
  );
  const [rows, setRows] = useState<BatchAllocation[]>(
    initialAllocations.length
      ? initialAllocations.map((a) => ({
          ...a,
          // Empty saved value renders as the display default sentinel.
          component_of: a.component_of || NOT_APPLICABLE,
        }))
      : [emptyRow()],
  );
  const [error, setError] = useState<string | null>(null);
  const [openOrderList, setOpenOrderList] = useState<number | null>(null);
  const [openBatchList, setOpenBatchList] = useState<number | null>(null);
  const [openGodownList, setOpenGodownList] = useState<number | null>(null);
  // Keyboard highlight index for whichever list is currently open (only one opens
  // at a time). Reset to 0 whenever a list opens/closes (effect below).
  const [listHi, setListHi] = useState(0);
  const [newNumberRow, setNewNumberRow] = useState<number | null>(null);
  const [newNumberField, setNewNumberField] = useState<'order' | 'batch'>('order');
  const [newNumberValue, setNewNumberValue] = useState('');
  const orderRefs = useRef<(HTMLButtonElement | null)[]>([]);
  // Trigger buttons for the Godown / Batch dropdowns — used to advance focus to
  // the next field after a keyboard/mouse selection (Tally keeps Enter flowing).
  const godownTriggerRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const batchTriggerRefs = useRef<(HTMLButtonElement | null)[]>([]);
  // Anchors for the Order/Batch list popups, portaled to <body> with fixed
  // coordinates below — rows sit inside a scrollable (overflow-y-auto) body, so
  // plain absolute-positioned dropdowns get clipped by that ancestor.
  const orderAnchorRefs = useRef<(HTMLDivElement | null)[]>([]);
  const batchAnchorRefs = useRef<(HTMLDivElement | null)[]>([]);
  const godownAnchorRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [orderPos, setOrderPos] = useState<{ top: number; left: number } | null>(null);
  const [batchPos, setBatchPos] = useState<{ top: number; left: number } | null>(null);
  const [godownPos, setGodownPos] = useState<{ top: number; left: number; width: number } | null>(
    null,
  );

  // Real order / batch lists from the DB (session entries merged in below).
  const [fetchedOrders, setFetchedOrders] = useState<FetchedOrder[]>([]);
  const [fetchedBatches, setFetchedBatches] = useState<FetchedBatch[]>([]);

  useEffect(() => {
    if (!companyId || !itemId) return;
    (window as any).api.report
      .orderNumbers?.(companyId, itemId)
      .then((res: any) => {
        if (res?.success) setFetchedOrders(res.orders ?? []);
      })
      .catch(() => {});
    // batchBalances (not batchesForItem): same distinct-batch list but carries the
    // running Balance the List of Active Batches displays.
    (window as any).api.report
      .batchBalances?.(companyId, itemId)
      .then((res: any) => {
        if (res?.success) setFetchedBatches(res.batches ?? []);
      })
      .catch(() => {});
  }, [companyId, itemId]);

  useEffect(() => {
    if (openOrderList === null && openBatchList === null && openGodownList === null) return;
    const reposition = () => {
      if (openOrderList !== null && orderAnchorRefs.current[openOrderList]) {
        const r = orderAnchorRefs.current[openOrderList]!.getBoundingClientRect();
        setOrderPos({ top: r.bottom + 2, left: r.left });
      } else setOrderPos(null);
      if (openBatchList !== null && batchAnchorRefs.current[openBatchList]) {
        const r = batchAnchorRefs.current[openBatchList]!.getBoundingClientRect();
        setBatchPos({ top: r.bottom + 2, left: r.left });
      } else setBatchPos(null);
      if (openGodownList !== null && godownAnchorRefs.current[openGodownList]) {
        const r = godownAnchorRefs.current[openGodownList]!.getBoundingClientRect();
        setGodownPos({ top: r.bottom + 2, left: r.left, width: r.width });
      } else setGodownPos(null);
    };
    reposition();
    window.addEventListener('scroll', reposition, true);
    window.addEventListener('resize', reposition);
    return () => {
      window.removeEventListener('scroll', reposition, true);
      window.removeEventListener('resize', reposition);
    };
  }, [openOrderList, openBatchList, openGodownList]);

  const update = (i: number, patch: Partial<BatchAllocation>) => {
    setError(null);
    setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  };
  const addRow = () => {
    setError(null);
    setRows((prev) => [...prev, emptyRow()]);
  };
  const removeRow = (i: number) => {
    if (rows.length === 1) return;
    setRows((prev) => prev.filter((_, idx) => idx !== i));
  };

  // Enter on Rate: move to the next row; only the last row appends a new one.
  const onRateEnter = (i: number) => {
    if (i === rows.length - 1) {
      addRow();
      setTimeout(() => orderRefs.current[i + 1]?.focus(), 30);
    } else {
      orderRefs.current[i + 1]?.focus();
    }
  };

  const total = rows.reduce((s, r) => s + (Number(r.quantity) || 0), 0);
  const totalAmount = rows.reduce(
    (s, r) => s + (Number(r.quantity) || 0) * (Number(r.rate) || 0),
    0,
  );
  const num = (v: number) =>
    v ? v.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '';

  // List of Orders = real DB orders first, then session-only numbers (no fake
  // metadata for those — their columns stay blank).
  const orderMap = new Map<string, FetchedOrder & { session?: boolean }>();
  fetchedOrders.forEach((o) => {
    if (o.name) orderMap.set(o.name, { ...o });
  });
  rows.forEach((r) => {
    const name = (r.order_no || '').trim();
    if (name && !orderMap.has(name)) orderMap.set(name, { name, session: true });
  });
  const existingOrders = Array.from(orderMap.values());

  // List of Active Batches = real DB batches (with balances) first, then
  // session-only batch numbers.
  const batchMap = new Map<
    string,
    { name: string; mfg_date: string; expiry: string; balance: number }
  >();
  fetchedBatches.forEach((b) => {
    if (b.name)
      batchMap.set(b.name, {
        name: b.name,
        mfg_date: b.mfg_date || '',
        expiry: b.expiry_date || '',
        balance: Number(b.balance) || 0,
      });
  });
  rows.forEach((r) => {
    const name = (r.batch_number || '').trim();
    if (name && !batchMap.has(name))
      batchMap.set(name, {
        name,
        mfg_date: r.mfg_date || '',
        expiry: r.expiry_date || '',
        balance: Number(r.quantity) || 0,
      });
  });
  const existingBatches = Array.from(batchMap.values());

  const confirmNewNumber = () => {
    if (newNumberRow === null) return;
    const v = newNumberValue.trim();
    update(newNumberRow, newNumberField === 'batch' ? { batch_number: v } : { order_no: v });
    setNewNumberRow(null);
  };

  // Whenever a list opens (or closes), reset the keyboard highlight to the top row.
  useEffect(() => {
    setListHi(0);
  }, [openOrderList, openBatchList, openGodownList]);

  // Move focus to the next focusable field after `el` (DOM order), so Enter keeps
  // flowing after a list selection instead of stranding focus on <body>. Runs after
  // the list's portal has unmounted and the row has re-rendered.
  const focusNextFrom = (el: HTMLElement | null) => {
    if (!el) return;
    setTimeout(() => {
      if (!document.contains(el)) return;
      const focusables = Array.from(
        document.querySelectorAll<HTMLElement>(
          'input:not([disabled]), select:not([disabled]), button:not([disabled])',
        ),
      ).filter((n) => n.offsetParent !== null && n.tabIndex !== -1);
      const idx = focusables.indexOf(el);
      if (idx >= 0 && idx < focusables.length - 1) focusables[idx + 1].focus();
    }, 30);
  };

  type ListKind = 'order' | 'godown' | 'batch';
  // Number of selectable rows in a given open list (order list has a leading
  // "Not Applicable" clear-row at index 0).
  const listCount = (kind: ListKind) =>
    kind === 'order'
      ? existingOrders.length + 1
      : kind === 'batch'
        ? existingBatches.length
        : godowns.length;

  // Commit the highlighted (or clicked) list row, close the list, and advance focus.
  const selectListItem = (kind: ListKind, i: number, idx: number) => {
    if (kind === 'order') {
      if (idx <= 0) update(i, { order_no: '' });
      else {
        const o = existingOrders[idx - 1];
        if (o) update(i, { order_no: o.name });
      }
      setOpenOrderList(null);
      focusNextFrom(orderRefs.current[i]);
    } else if (kind === 'godown') {
      const g = godowns[idx];
      if (g) update(i, { godown: g.name });
      setOpenGodownList(null);
      focusNextFrom(godownTriggerRefs.current[i]);
    } else {
      const b = existingBatches[idx];
      if (b) update(i, { batch_number: b.name, expiry_date: b.expiry || rows[i]?.expiry_date });
      setOpenBatchList(null);
      focusNextFrom(batchTriggerRefs.current[i]);
    }
  };

  // Keyboard driver for a dropdown trigger button: Enter/ArrowDown opens the list;
  // once open, ArrowUp/Down move the highlight, Enter selects it, Esc closes.
  const onListKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>, kind: ListKind, i: number) => {
    const isOpen =
      kind === 'order'
        ? openOrderList === i
        : kind === 'batch'
          ? openBatchList === i
          : openGodownList === i;

    if (!isOpen) {
      if (e.key === 'Enter' || e.key === 'ArrowDown') {
        e.preventDefault();
        if (kind === 'order') setOpenOrderList(i);
        else if (kind === 'batch') setOpenBatchList(i);
        else setOpenGodownList(i);
      }
      return;
    }
    const count = listCount(kind);
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setListHi((h) => Math.min(h + 1, count - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setListHi((h) => Math.max(h - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (count > 0) selectListItem(kind, i, listHi);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      if (kind === 'order') setOpenOrderList(null);
      else if (kind === 'batch') setOpenBatchList(null);
      else setOpenGodownList(null);
    }
  };

  const handleSave = useCallback(() => {
    if (total <= 0) {
      setError('Enter a quantity for at least one row.');
      return;
    }
    if (
      showBatch &&
      rows.some((r) => (Number(r.quantity) || 0) > 0 && !(r.batch_number || '').trim())
    ) {
      setError('Every allocation needs a Batch / Lot No.');
      return;
    }
    const payload: (BatchAllocation & { due_on_date?: string })[] = rows
      .filter((r) => (Number(r.quantity) || 0) > 0 || (r.order_no || '').trim())
      .map((r) => {
        const dueOnText = (r.due_on || '').trim() || undefined;
        // Strip the "♦ Not Applicable" display sentinel — it must never persist.
        const componentOf = (r.component_of || '').trim();
        return {
          batch_number: showBatch ? (r.batch_number || '').trim() : '',
          order_no: (r.order_no || '').trim() || undefined,
          due_on: dueOnText,
          // Dual-save: keep the raw text for display, resolve a real ISO date
          // (relative to the voucher date) for order-outstanding logic.
          due_on_date: parseDueOn(dueOnText, voucherDate) ?? undefined,
          component_of: componentOf && componentOf !== NOT_APPLICABLE ? componentOf : undefined,
          consider_as_scrap: considerAsScrap,
          godown: r.godown || undefined,
          mfg_date: showBatch && trackMfg ? r.mfg_date || undefined : undefined,
          expiry_date: showBatch && trackExpiry ? r.expiry_date || undefined : undefined,
          quantity: Number(r.quantity) || 0,
          rate: Number(r.rate) || rate,
        };
      });
    onSave(payload);
  }, [rows, total, rate, considerAsScrap, showBatch, trackMfg, trackExpiry, voucherDate, onSave]);

  const cell = 'text-sm border border-gray-400 px-1 py-0 outline-none focus:border-black bg-white';

  return (
    <>
      <VoucherPopupShell
        title="Item Allocations"
        headerRight={<span className="font-bold text-black">{itemName}</span>}
        onClose={onClose}
        onAccept={handleSave}
        bodyClassName="p-0"
        hint={
          <>
            Enter on Rate: next row (last row adds a new one) &nbsp;&middot;&nbsp; Alt+A: Accept
            &nbsp;&middot;&nbsp; Esc: Close
          </>
        }
      >
        {/* Full-width Tally-style allocation table — Godown / Batch on the left,
           the numeric group pinned right, generous column widths so nothing
           truncates and the panel reads as one clean grid. */}
        <div className="w-full">
          {/* Context block */}
          <div className="px-8 pt-4 pb-3 border-b border-gray-300 space-y-1.5 select-none">
            <div className="text-sm flex items-center gap-2">
              <span className="text-gray-600 w-40 shrink-0">Item Allocations for</span>
              <span>:</span>
              <span className="font-bold">{itemName}</span>
            </div>
            <div className="text-sm flex items-center gap-2">
              <span className="text-gray-600 w-40 shrink-0">Consider as Scrap</span>
              <span>:</span>
              <button
                type="button"
                onClick={() => setConsiderAsScrap('Yes')}
                className={`px-3 py-0.5 border ${considerAsScrap === 'Yes' ? 'border-black font-bold' : 'border-gray-400 text-gray-600'}`}
              >
                Yes
              </button>
              <button
                type="button"
                onClick={() => setConsiderAsScrap('No')}
                className={`px-3 py-0.5 border ${considerAsScrap === 'No' ? 'border-black font-bold' : 'border-gray-400 text-gray-600'}`}
              >
                No
              </button>
            </div>
          </div>

          {/* Column headers */}
          <div className="flex items-end px-8 pt-3 pb-1.5 border-b border-black text-sm font-semibold text-black gap-4 select-none">
            <div className={`${GODOWN} shrink-0`}>Godown</div>
            {showBatch && (
              <div className={`${BATCHCOL} shrink-0`}>
                <div>Batch/Lot No.</div>
                {(trackMfg || trackExpiry) && (
                  <div className="flex gap-2 text-xs text-gray-600 font-normal mt-0.5">
                    <span className="w-28 shrink-0">{trackMfg ? 'Mfg Dt.' : ''}</span>
                    <span className="flex-1">{trackExpiry ? 'Expiry Date' : ''}</span>
                  </div>
                )}
              </div>
            )}
            <div className="flex-1" />
            <div className={`${QTY} text-right`}>Quantity</div>
            <div className={`${RATE} text-right`}>Rate</div>
            <div className={`${PER} text-center`}>per</div>
            <div className={`${AMT} text-right`}>Amount</div>
            <div className="w-6 shrink-0" />
          </div>

          <div className="px-8 py-4">
            {error && <NotificationBanner type="error" message={error} />}

            {rows.map((row, i) => {
              const amount = (Number(row.quantity) || 0) * (Number(row.rate) || 0);
              const hasOrder = (row.order_no ?? '').trim() !== '';
              return (
                <div key={i} className="mb-4 pb-3 border-b border-gray-200 last:border-b-0">
                  {/* Order line — Due on / Component of appear only once an Order No. is entered */}
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs italic text-gray-700 mb-1.5">
                    <span className="shrink-0">Order No.:</span>
                    <div
                      className="relative"
                      ref={(el) => {
                        orderAnchorRefs.current[i] = el;
                      }}
                    >
                      <button
                        ref={(el) => {
                          orderRefs.current[i] = el;
                        }}
                        type="button"
                        onClick={() => setOpenOrderList(openOrderList === i ? null : i)}
                        onKeyDown={(e) => onListKeyDown(e, 'order', i)}
                        className={`${cell} w-44 text-left not-italic truncate`}
                      >
                        {row.order_no || NOT_APPLICABLE}
                      </button>
                      {openOrderList === i &&
                        orderPos &&
                        createPortal(
                          <>
                            <div
                              className="fixed inset-0 z-[55]"
                              onClick={() => setOpenOrderList(null)}
                            />
                            <div
                              style={{ position: 'fixed', top: orderPos.top, left: orderPos.left }}
                              className="z-[60] w-[640px] bg-white border border-gray-500 shadow-xl not-italic"
                            >
                              <div className="bg-white text-black text-[11px] font-bold px-2 py-1 flex justify-between items-center border-b border-gray-300">
                                <span>List of Orders</span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setNewNumberValue('');
                                    setNewNumberField('order');
                                    setNewNumberRow(i);
                                    setOpenOrderList(null);
                                  }}
                                  className="underline hover:text-gray-600"
                                >
                                  New Number
                                </button>
                              </div>
                              <div
                                className={`${ORDER_COLS} px-2 py-0.5 text-[10px] font-semibold border-b border-gray-300 text-gray-700`}
                              >
                                <span>Name</span>
                                <span>Batch</span>
                                <span>Godown</span>
                                <span>Due On</span>
                                <span className="text-right">Balance</span>
                                <span>Primary Item Name</span>
                                <span>Order Type</span>
                              </div>
                              <div className="max-h-48 overflow-y-auto">
                                <button
                                  type="button"
                                  onClick={() => selectListItem('order', i, 0)}
                                  onMouseEnter={() => setListHi(0)}
                                  className={`${ORDER_COLS} w-full text-left px-2 py-1 text-xs ${
                                    listHi === 0 ? 'bg-gray-200' : 'hover:bg-gray-100'
                                  }`}
                                >
                                  <span>{NOT_APPLICABLE}</span>
                                  <span />
                                  <span />
                                  <span />
                                  <span />
                                  <span />
                                  <span />
                                </button>
                                {existingOrders.map((o, oIdx) => (
                                  <button
                                    key={o.name}
                                    type="button"
                                    onClick={() => selectListItem('order', i, oIdx + 1)}
                                    onMouseEnter={() => setListHi(oIdx + 1)}
                                    className={`${ORDER_COLS} w-full text-left px-2 py-1 text-xs ${
                                      listHi === oIdx + 1 ? 'bg-gray-200' : 'hover:bg-gray-100'
                                    }`}
                                  >
                                    <span className="font-mono">{o.name}</span>
                                    <span className="truncate">{o.batch || ''}</span>
                                    <span className="truncate">{o.godown || ''}</span>
                                    <span>{o.due_on || ''}</span>
                                    <span className="text-right font-mono">
                                      {o.balance ? `${o.balance} ${unit}` : ''}
                                    </span>
                                    <span className="truncate">{o.session ? '' : itemName}</span>
                                    <span>{o.session ? '(this voucher)' : ''}</span>
                                  </button>
                                ))}
                              </div>
                            </div>
                          </>,
                          document.body,
                        )}
                    </div>
                    {hasOrder && (
                      <>
                        <span className="shrink-0 ml-2">Due on</span>
                        <input
                          type="text"
                          value={row.due_on ?? ''}
                          onChange={(e) => update(i, { due_on: e.target.value })}
                          placeholder="9 Days"
                          className={`${cell} w-28 not-italic`}
                        />
                        <span className="shrink-0 ml-2">Component of :</span>
                        <select
                          value={row.component_of ?? ''}
                          onChange={(e) => update(i, { component_of: e.target.value })}
                          onKeyDown={(e) => {
                            // Native select handles arrows/value change; Enter just
                            // advances to the next field so the row keeps flowing.
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              focusNextFrom(e.currentTarget);
                            }
                          }}
                          className={`${cell} w-64 not-italic`}
                        >
                          <option value={NOT_APPLICABLE}>{NOT_APPLICABLE}</option>
                          {stockItems.map((s) => (
                            <option key={s.item_id ?? s.name} value={s.name}>
                              {s.name}
                            </option>
                          ))}
                        </select>
                      </>
                    )}
                  </div>

                  {/* Allocation line */}
                  <div className="flex items-start gap-4">
                    <div className={`${GODOWN} shrink-0`}>
                      {godowns.length > 0 ? (
                        /* Custom dropdown so the per-godown balance shows only inside
                         the list — the selected field carries just the name (Tally). */
                        <div
                          className="relative"
                          ref={(el) => {
                            godownAnchorRefs.current[i] = el;
                          }}
                        >
                          <button
                            ref={(el) => {
                              godownTriggerRefs.current[i] = el;
                            }}
                            type="button"
                            onClick={() => setOpenGodownList(openGodownList === i ? null : i)}
                            onKeyDown={(e) => onListKeyDown(e, 'godown', i)}
                            className={`${cell} w-full text-left truncate ${row.godown ? '' : 'text-gray-400'}`}
                          >
                            {row.godown || 'Select'}
                          </button>
                          {openGodownList === i &&
                            godownPos &&
                            createPortal(
                              <>
                                <div
                                  className="fixed inset-0 z-[55]"
                                  onClick={() => setOpenGodownList(null)}
                                />
                                <div
                                  style={{
                                    position: 'fixed',
                                    top: godownPos.top,
                                    left: godownPos.left,
                                    minWidth: godownPos.width,
                                  }}
                                  className="z-[60] bg-white border border-gray-500 shadow-xl"
                                >
                                  <div className="bg-white text-black text-[11px] font-bold px-2 py-1 border-b border-gray-300">
                                    List of Godowns
                                  </div>
                                  <div className="max-h-48 overflow-y-auto">
                                    {godowns.map((g, gIdx) => {
                                      const q =
                                        g.godown_id != null
                                          ? fmtQty(godownBal[g.godown_id], unitSymbol)
                                          : '';
                                      return (
                                        <button
                                          key={g.godown_id ?? g.name}
                                          type="button"
                                          onClick={() => selectListItem('godown', i, gIdx)}
                                          onMouseEnter={() => setListHi(gIdx)}
                                          className={`w-full text-left px-2 py-1 text-xs flex justify-between gap-3 ${
                                            listHi === gIdx ? 'bg-gray-200' : 'hover:bg-gray-100'
                                          }`}
                                        >
                                          <span className="truncate">{g.name}</span>
                                          {q && (
                                            <span className="shrink-0 font-mono text-gray-600">
                                              {q}
                                            </span>
                                          )}
                                        </button>
                                      );
                                    })}
                                  </div>
                                </div>
                              </>,
                              document.body,
                            )}
                        </div>
                      ) : (
                        <input
                          type="text"
                          value={row.godown ?? ''}
                          onChange={(e) => update(i, { godown: e.target.value })}
                          placeholder="Location"
                          className={`${cell} w-full`}
                        />
                      )}
                    </div>

                    {showBatch && (
                      <div className={`${BATCHCOL} shrink-0`}>
                        {/* Batch/Lot No. — opens List of Active Batches */}
                        <div
                          className="relative"
                          ref={(el) => {
                            batchAnchorRefs.current[i] = el;
                          }}
                        >
                          <button
                            ref={(el) => {
                              batchTriggerRefs.current[i] = el;
                            }}
                            type="button"
                            onClick={() => setOpenBatchList(openBatchList === i ? null : i)}
                            onKeyDown={(e) => onListKeyDown(e, 'batch', i)}
                            className={`${cell} w-full text-left font-semibold truncate ${row.batch_number ? '' : 'text-gray-400 font-normal'}`}
                          >
                            {row.batch_number || 'New Number…'}
                          </button>
                          {openBatchList === i &&
                            batchPos &&
                            createPortal(
                              <>
                                <div
                                  className="fixed inset-0 z-[55]"
                                  onClick={() => setOpenBatchList(null)}
                                />
                                <div
                                  style={{
                                    position: 'fixed',
                                    top: batchPos.top,
                                    left: batchPos.left,
                                  }}
                                  className="z-[60] w-72 bg-white border border-gray-500 shadow-xl"
                                >
                                  <div className="bg-white text-black text-[11px] font-bold px-2 py-1 flex justify-between items-center border-b border-gray-300">
                                    <span>List of Active Batches</span>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setNewNumberValue('');
                                        setNewNumberField('batch');
                                        setNewNumberRow(i);
                                        setOpenBatchList(null);
                                      }}
                                      className="underline hover:text-gray-600"
                                    >
                                      New Number
                                    </button>
                                  </div>
                                  <div
                                    className={`${BATCH_COLS} px-2 py-0.5 text-[10px] font-semibold border-b border-gray-300 text-gray-700`}
                                  >
                                    <span>Name</span>
                                    <span className="text-right">Expiry</span>
                                    <span className="text-right">Balance</span>
                                  </div>
                                  <div className="max-h-48 overflow-y-auto">
                                    {existingBatches.length === 0 && (
                                      <div className="px-2 py-1 text-xs text-gray-400 italic">
                                        No active batches — use New Number
                                      </div>
                                    )}
                                    {existingBatches.map((b, bIdx) => (
                                      <button
                                        key={b.name}
                                        type="button"
                                        onClick={() => selectListItem('batch', i, bIdx)}
                                        onMouseEnter={() => setListHi(bIdx)}
                                        className={`${BATCH_COLS} w-full text-left px-2 py-1 text-xs ${
                                          listHi === bIdx ? 'bg-gray-200' : 'hover:bg-gray-100'
                                        }`}
                                      >
                                        <span className="truncate font-semibold">{b.name}</span>
                                        <span className="text-right font-mono">{b.expiry}</span>
                                        <span className="text-right font-mono">
                                          {b.balance ? `${b.balance} ${unit}` : ''}
                                        </span>
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              </>,
                              document.body,
                            )}
                        </div>
                        {(trackMfg || trackExpiry) && (
                          <div className="flex gap-2 mt-1">
                            {trackMfg && (
                              <input
                                type="date"
                                value={row.mfg_date ?? ''}
                                onChange={(e) => update(i, { mfg_date: e.target.value })}
                                className={`${cell} w-28 shrink-0 font-mono`}
                              />
                            )}
                            {trackExpiry && (
                              <input
                                type="text"
                                value={row.expiry_date ?? ''}
                                onChange={(e) => update(i, { expiry_date: e.target.value })}
                                placeholder="date / 6 Months / 2 Yrs"
                                className={`${cell} flex-1 min-w-0 font-mono`}
                              />
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    <div className="flex-1" />
                    <div className={`${QTY}`}>
                      <div className="flex items-center justify-end gap-1">
                        <input
                          type="number"
                          step="any"
                          value={row.quantity || ''}
                          onChange={(e) => update(i, { quantity: Number(e.target.value) || 0 })}
                          className={`${cell} flex-1 min-w-0 text-right font-mono`}
                        />
                        <span className="text-xs text-gray-600 shrink-0 w-5">{unit}</span>
                      </div>
                    </div>
                    <div className={`${RATE}`}>
                      <input
                        type="number"
                        step="any"
                        value={row.rate || ''}
                        onChange={(e) => update(i, { rate: Number(e.target.value) || 0 })}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            onRateEnter(i);
                          }
                        }}
                        className={`${cell} w-full text-right font-mono`}
                      />
                    </div>
                    <div className={`${PER} text-center text-xs text-gray-600 font-mono pt-1`}>
                      {unit}
                    </div>
                    <div className={`${AMT} text-right text-sm font-mono font-semibold pt-1`}>
                      {num(amount)}
                    </div>
                    <div className="w-6 shrink-0 text-center pt-1">
                      <button
                        type="button"
                        onClick={() => removeRow(i)}
                        className="text-gray-400 hover:text-black text-base font-bold"
                      >
                        &times;
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Next-order prompt (adds a row) */}
            <div className="flex items-center gap-2 text-xs italic text-gray-500">
              <span className="shrink-0">Order No.:</span>
              <button type="button" onClick={addRow} className="hover:text-black">
                ♦ End of List
              </button>
            </div>
          </div>

          {/* Totals */}
          <div className="flex items-center px-8 py-2 border-t border-black text-sm font-bold font-mono gap-4">
            <div className={`${GODOWN} shrink-0`} />
            {showBatch && <div className={`${BATCHCOL} shrink-0`} />}
            <div className="flex-1" />
            <div className={`${QTY} text-right`}>{total ? `${total} ${unit}` : ''}</div>
            <div className={`${RATE}`} />
            <div className={`${PER}`} />
            <div className={`${AMT} text-right`}>{num(totalAmount)}</div>
            <div className="w-6 shrink-0" />
          </div>
        </div>
      </VoucherPopupShell>

      {/* New Number — create a new order / batch number */}
      {newNumberRow !== null && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/30">
          <div className="bg-white border border-gray-300 shadow-2xl w-80">
            <div className="border-b border-gray-300 bg-white px-3 py-1.5 text-sm font-semibold text-black">
              New Number
            </div>
            <div className="p-4">
              <input
                autoFocus
                type="text"
                value={newNumberValue}
                onChange={(e) => setNewNumberValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    confirmNewNumber();
                  }
                  if (e.key === 'Escape') {
                    e.preventDefault();
                    setNewNumberRow(null);
                  }
                }}
                className="w-full text-sm border border-gray-400 px-1 py-1 outline-none focus:border-black bg-white"
              />
            </div>
            <div className="border-t border-gray-300 px-3 py-2 flex justify-end gap-2 bg-white">
              <button
                onClick={() => setNewNumberRow(null)}
                className="text-xs px-3 py-1 border border-black hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                onClick={confirmNewNumber}
                className="text-xs px-4 py-1 bg-black text-white hover:bg-gray-800"
              >
                Accept
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
