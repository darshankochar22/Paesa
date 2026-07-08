import { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import type { BatchAllocation } from '../../types';
import NewNumberPopup from './NewNumberPopup';
import { VoucherPopupShell } from '@/components/tally-ui/VoucherPopupShell';
import { parseDueOn, toLocalIsoDate } from '@/lib/dueDate';
import { useCompany } from '@/context/CompanyContext';

// Saved allocation — BatchAllocation plus the resolved ISO due date (additive).
type SavedAllocation = BatchAllocation & { due_on_date?: string };

// Stock Item Allocations sub-screen (TallyPrime "Batch / Lot" allocation).
// Splits a line quantity across one or more godown + batch rows, each with
// optional mfg + expiry dates, actual/billed quantities, rate and discount.
// Strict grayscale per UI.md — no hue, emphasis via weight/border only.

interface ActiveBatch {
  name: string;
  mfg_date: string | null;
  expiry_date: string | null;
  balance: number;
}

interface TrackingOption {
  name: string;
  batch?: string | null;
  godown?: string | null;
  date?: string | null;
  balance?: number;
  rate?: number;
}

interface OrderOption {
  name: string;
  batch?: string | null;
  godown?: string | null;
  due_on?: string | null;
  balance?: number;
}

const NOT_APPLICABLE = '◆ Not Applicable';

interface GodownOption {
  godown_id?: number;
  name: string;
  parent_godown_id?: number;
}

interface Props {
  companyId: number;
  itemId: number;
  itemName: string;
  totalQuantity: number;
  rate: number;
  unitSymbol?: string;
  voucherDate: string;
  trackMfg: boolean;
  trackExpiry: boolean;
  isInward: boolean;
  godowns?: GodownOption[];
  initialAllocations?: BatchAllocation[];
  quantityDriven?: boolean;
  showBatch?: boolean;
  onClose: () => void;
  onSave: (allocations: BatchAllocation[]) => void;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function fmtDate(iso?: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return `${d.getDate()}-${MONTHS[d.getMonth()]}-${String(d.getFullYear()).slice(-2)}`;
}

function toIso(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function parseExpiry(input: string, baseIso: string): string {
  const raw = (input || '').trim();
  if (!raw) return '';
  const direct = new Date(raw);
  if (
    !isNaN(direct.getTime()) &&
    /\d{4}|[A-Za-z]{3}/.test(raw) &&
    !/year|month|day|yr|mo|wk|week/i.test(raw)
  ) {
    return toIso(direct);
  }
  const m = raw.match(/^(\d+)\s*(year|years|yr|month|months|mo|week|weeks|wk|day|days)$/i);
  if (m) {
    const n = parseInt(m[1], 10);
    const unit = m[2].toLowerCase();
    const base = new Date(baseIso);
    if (isNaN(base.getTime())) return '';
    if (unit.startsWith('year') || unit === 'yr') base.setFullYear(base.getFullYear() + n);
    else if (unit.startsWith('mo')) base.setMonth(base.getMonth() + n);
    else if (unit.startsWith('week') || unit === 'wk') base.setDate(base.getDate() + n * 7);
    else base.setDate(base.getDate() + n);
    return toIso(base);
  }
  return '';
}

const num = (v: number | undefined) =>
  Number.isFinite(v)
    ? (v as number).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : '';

const round2 = (v: number) => Math.round(v * 100) / 100;

// Per-godown balance label — Tally shows negatives as "(-)9 Box"; blank when zero.
const fmtQty = (q: number | undefined, unit?: string) => {
  if (!q) return '';
  const u = unit || '';
  return q < 0 ? `(-)${Math.abs(q)} ${u}`.trim() : `${q} ${u}`.trim();
};

export default function BatchAllocationPopup({
  companyId,
  itemId,
  itemName,
  totalQuantity,
  rate,
  unitSymbol,
  voucherDate,
  trackMfg,
  trackExpiry,
  isInward,
  godowns = [],
  initialAllocations = [],
  quantityDriven = false,
  showBatch = true,
  onClose,
  onSave,
}: Props) {
  const defaultGodown = godowns[0]?.name ?? '';

  // F11 "Use separate Actual and Billed Quantity columns" — single Quantity
  // column when the flag is explicitly No.
  const { features } = useCompany();
  const showBilled = features?.use_separate_actual_billed_qty !== 0;
  // F11 "Use Discount column in invoices" — hide the Disc % column when No.
  const showDisc = features?.use_discount_column_in_invoices !== 0;

  // Per-godown balances for this item — drives the quantity column in the
  // "List of Godowns" side panel (same as the other allocation popups).
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

  // Enter-to-advance: focus the given field on a row (actual → billed → rate →
  // disc → next row / accept). rAF waits for the row to (re)render.
  const focusRowField = (row: number, field: 'actual' | 'billed' | 'rate' | 'disc') => {
    requestAnimationFrame(() => {
      const el = document.querySelector<HTMLInputElement>(
        `[data-ba-row="${row}"][data-ba-field="${field}"]`,
      );
      el?.focus();
    });
  };

  const emptyRow = (): BatchAllocation => ({
    batch_number: '',
    godown: defaultGodown,
    quantity: quantityDriven ? undefined : totalQuantity,
    actual_quantity: quantityDriven ? undefined : totalQuantity,
    rate,
    disc_percent: undefined,
  });

  const [rows, setRows] = useState<BatchAllocation[]>(
    initialAllocations.length ? initialAllocations.map((a) => ({ ...a })) : [emptyRow()],
  );

  // When every hydrated row shares one value, surface it in the top-level
  // (default) input; otherwise leave the default empty — per-row values win.
  const uniformInit = (get: (a: BatchAllocation) => string | undefined): string => {
    if (!initialAllocations.length) return '';
    const vals = new Set(initialAllocations.map((a) => get(a) || ''));
    return vals.size === 1 ? get(initialAllocations[0]) || '' : '';
  };
  const [activeBatches, setActiveBatches] = useState<ActiveBatch[]>([]);
  const [createdBatches, setCreatedBatches] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Side panel — "godown" or "batch", plus which row is active
  const [activePanel, setActivePanel] = useState<null | 'godown' | 'batch'>(null);
  const [activePanelRow, setActivePanelRow] = useState<number | null>(null);
  const [godownSearch, setGodownSearch] = useState('');
  const [panelHi, setPanelHi] = useState(0);
  const panelListRef = useRef<HTMLDivElement>(null);
  const godownSearchRef = useRef<HTMLInputElement>(null);

  // NewNumber popup for batch
  const [batchNumberRow, setBatchNumberRow] = useState<number | null>(null);

  // Tracking No. — top-level input is the DEFAULT applied to rows that don't
  // set their own; each row can override via its per-row field.
  const [trackingList, setTrackingList] = useState<TrackingOption[]>([]);
  const [trackingNo, setTrackingNo] = useState<string>(
    uniformInit((a) => a.tracking_no) || NOT_APPLICABLE,
  );
  const [showTrackingList, setShowTrackingList] = useState(false);
  const [trackingNewNumber, setTrackingNewNumber] = useState(false);
  const trackingRef = useRef<HTMLDivElement | null>(null);

  // Order No. + Due on (batch items) — mirrors Tracking No.
  const [orderList, setOrderList] = useState<OrderOption[]>([]);
  const [orderNo, setOrderNo] = useState<string>(uniformInit((a) => a.order_no) || NOT_APPLICABLE);
  const [dueOn, setDueOn] = useState<string>(uniformInit((a) => a.due_on));
  const [showOrderList, setShowOrderList] = useState(false);
  const [orderNewNumber, setOrderNewNumber] = useState(false);
  const orderRef = useRef<HTMLDivElement | null>(null);

  // The Tracking / Order dropdowns are portaled to <body> with fixed positions —
  // they live inside the popup's overflow-y-auto body, so plain absolute
  // positioning gets clipped by that scrollable ancestor.
  const trackingDropRef = useRef<HTMLDivElement | null>(null);
  const orderDropRef = useRef<HTMLDivElement | null>(null);
  const [trackingPos, setTrackingPos] = useState<{ top: number; left: number } | null>(null);
  const [orderPos, setOrderPos] = useState<{ top: number; left: number } | null>(null);

  // Load existing batches
  useEffect(() => {
    if (!companyId || !itemId) return;
    (window as any).api.report
      .batchBalances(companyId, itemId)
      .then((res: any) => {
        if (res?.success) setActiveBatches(res.batches ?? []);
      })
      .catch(() => {});
  }, [companyId, itemId]);

  // Load tracking numbers
  useEffect(() => {
    if (!companyId || !itemId) return;
    (window as any).api.report
      .trackingNumbers?.(companyId, itemId)
      .then((res: any) => {
        if (res?.success) setTrackingList(res.trackingNumbers ?? []);
      })
      .catch(() => {});
  }, [companyId, itemId]);

  // Load order numbers
  useEffect(() => {
    if (!companyId || !itemId) return;
    (window as any).api.report
      .orderNumbers?.(companyId, itemId)
      .then((res: any) => {
        if (res?.success) setOrderList(res.orders ?? []);
      })
      .catch(() => {});
  }, [companyId, itemId]);

  // Close tracking dropdown on outside click. The dropdown is portaled to
  // <body>, so check its own ref too — it is no longer inside the anchor.
  useEffect(() => {
    if (!showTrackingList) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (
        trackingRef.current &&
        !trackingRef.current.contains(t) &&
        !trackingDropRef.current?.contains(t)
      )
        setShowTrackingList(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [showTrackingList]);

  // Close order dropdown on outside click (same portal-aware check).
  useEffect(() => {
    if (!showOrderList) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (orderRef.current && !orderRef.current.contains(t) && !orderDropRef.current?.contains(t))
        setShowOrderList(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [showOrderList]);

  // Keep the portaled dropdowns glued under their anchors while the popup's
  // scrollable body (or the window) moves.
  useEffect(() => {
    if (!showTrackingList && !showOrderList) return;
    const reposition = () => {
      if (showTrackingList && trackingRef.current) {
        const r = trackingRef.current.getBoundingClientRect();
        setTrackingPos({ top: r.bottom + 2, left: r.left });
      } else setTrackingPos(null);
      if (showOrderList && orderRef.current) {
        const r = orderRef.current.getBoundingClientRect();
        setOrderPos({ top: r.bottom + 2, left: r.left });
      } else setOrderPos(null);
    };
    reposition();
    window.addEventListener('scroll', reposition, true);
    window.addEventListener('resize', reposition);
    return () => {
      window.removeEventListener('scroll', reposition, true);
      window.removeEventListener('resize', reposition);
    };
  }, [showTrackingList, showOrderList]);

  // Auto-focus godown search when godown panel opens
  useEffect(() => {
    if (activePanel === 'godown') {
      setTimeout(() => godownSearchRef.current?.focus(), 30);
    }
  }, [activePanel]);

  // Reset highlight when panel or search changes
  useEffect(() => {
    setPanelHi(0);
  }, [activePanel, godownSearch, activePanelRow]);

  const closePanel = () => {
    setActivePanel(null);
    setActivePanelRow(null);
    setGodownSearch('');
    setPanelHi(0);
  };

  // Resolve parent name from godowns list
  const parentName = (g: GodownOption): string => {
    if (!g.parent_godown_id) return 'Primary';
    const p = godowns.find((x) => x.godown_id === g.parent_godown_id);
    return p?.name ?? 'Primary';
  };

  // Filtered lists for side panels
  const filteredGodowns = godowns.filter(
    (g) => !godownSearch || g.name.toLowerCase().includes(godownSearch.toLowerCase()),
  );

  const batchSearchTerm = activePanelRow !== null ? (rows[activePanelRow]?.batch_number ?? '') : '';
  const filteredBatches = [
    ...activeBatches,
    ...createdBatches
      .filter((n) => !activeBatches.some((b) => b.name === n))
      .map((n) => ({ name: n, mfg_date: null, expiry_date: null, balance: 0 })),
  ].filter(
    (b) =>
      !batchSearchTerm ||
      batchSearchTerm === 'Any' ||
      b.name.toLowerCase().includes(batchSearchTerm.toLowerCase()),
  );

  // Panel keyboard nav
  const godownPanelItems = filteredGodowns;
  const batchPanelItems = filteredBatches;
  const panelLength =
    activePanel === 'godown' ? godownPanelItems.length + 1 /* Any */ : batchPanelItems.length;

  useEffect(() => {
    if (!activePanel) return;
    const el = panelListRef.current?.querySelectorAll('[data-panel-item]')[
      panelHi
    ] as HTMLElement | null;
    el?.scrollIntoView({ block: 'nearest' });
  }, [panelHi, activePanel]);

  const selectTracking = (name: string) => {
    setTrackingNo(name);
    setShowTrackingList(false);
    // The tracked document carries its own rate — apply it to rows whose rate
    // the user hasn't touched (still the line default / cleared).
    const opt = trackingList.find((t) => t.name === name);
    const optRate = Number(opt?.rate);
    if (name !== NOT_APPLICABLE && opt && Number.isFinite(optRate) && optRate > 0) {
      setRows((prev) =>
        prev.map((r) => {
          const untouched = r.rate == null || Number(r.rate) === rate;
          return untouched ? { ...r, rate: optRate } : r;
        }),
      );
    }
  };
  const addTrackingNumber = (value: string) => {
    setTrackingList((prev) =>
      prev.some((t) => t.name === value) ? prev : [...prev, { name: value }],
    );
    setTrackingNo(value);
    setTrackingNewNumber(false);
    setShowTrackingList(false);
  };

  const selectOrder = (name: string) => {
    setOrderNo(name);
    setShowOrderList(false);
    if (name === NOT_APPLICABLE) setDueOn('');
  };
  const addOrderNumber = (value: string) => {
    setOrderList((prev) =>
      prev.some((o) => o.name === value) ? prev : [...prev, { name: value }],
    );
    setOrderNo(value);
    setOrderNewNumber(false);
    setShowOrderList(false);
  };

  const billed = (r: BatchAllocation) => Number(r.quantity) || 0;
  const actual = (r: BatchAllocation) => Number(r.actual_quantity ?? r.quantity) || 0;
  const lineAmount = (r: BatchAllocation) =>
    billed(r) * (Number(r.rate) || 0) * (1 - (Number(r.disc_percent) || 0) / 100);

  const totalActual = rows.reduce((s, r) => s + actual(r), 0);
  const totalBilled = rows.reduce((s, r) => s + billed(r), 0);
  const totalAmount = rows.reduce((s, r) => s + lineAmount(r), 0);
  const remaining = totalQuantity - totalBilled;
  const remainingDisp = round2(remaining); // display only — the save check keeps full precision

  const update = (i: number, patch: Partial<BatchAllocation>) => {
    setError(null);
    setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  };

  const setActual = (i: number, v: number | undefined) => {
    setError(null);
    setRows((prev) =>
      prev.map((r, idx) => {
        if (idx !== i) return r;
        const linked = (Number(r.quantity) || 0) === (Number(r.actual_quantity) || 0);
        return { ...r, actual_quantity: v, quantity: linked ? v : r.quantity };
      }),
    );
  };

  // Number inputs: "" clears the field (undefined) so a typed 0 stays a visible 0.
  const numVal = (s: string): number | undefined => (s === '' ? undefined : Number(s));

  const pickBatch = (i: number, b: ActiveBatch) => {
    update(i, {
      batch_number: b.name,
      mfg_date: b.mfg_date ?? undefined,
      expiry_date: b.expiry_date ?? undefined,
    });
    closePanel();
  };

  const pickGodown = (i: number, name: string) => {
    update(i, { godown: name });
    closePanel();
    focusRowField(i, 'actual');
  };

  const addRow = () => {
    setError(null);
    setRows((prev) => [...prev, emptyRow()]);
  };

  const removeRow = (i: number) => {
    if (rows.length === 1) return;
    setRows((prev) => prev.filter((_, idx) => idx !== i));
  };

  const handleSave = useCallback(() => {
    if (showBatch && rows.some((r) => !r.batch_number.trim())) {
      setError('Every row needs a Batch / Lot No.');
      return;
    }
    if (quantityDriven) {
      if (totalBilled <= 0) {
        setError('Enter a quantity for at least one batch.');
        return;
      }
    } else if (Math.abs(remaining) >= 0.0001) {
      setError(
        `Allocated ${round2(totalBilled)} of ${totalQuantity} ${unitSymbol ?? ''} — remaining ${remainingDisp} must be zero.`,
      );
      return;
    }
    // Top-level values are defaults; a per-row value always wins.
    const defTrk = trackingNo && trackingNo !== NOT_APPLICABLE ? trackingNo : undefined;
    const defOrd = showBatch && orderNo && orderNo !== NOT_APPLICABLE ? orderNo : undefined;
    const baseDate = voucherDate || toLocalIsoDate(new Date());
    onSave(
      rows.map((r): SavedAllocation => {
        const rowTrk = (r.tracking_no || '').trim();
        const trk = rowTrk && rowTrk !== NOT_APPLICABLE ? rowTrk : defTrk;
        const rowOrd = (r.order_no || '').trim();
        const ord = showBatch ? (rowOrd && rowOrd !== NOT_APPLICABLE ? rowOrd : defOrd) : undefined;
        const due = ord ? (r.due_on || '').trim() || dueOn.trim() || undefined : undefined;
        return {
          batch_number: r.batch_number.trim(),
          tracking_no: trk,
          order_no: ord,
          due_on: due,
          due_on_date: due ? (parseDueOn(due, baseDate) ?? undefined) : undefined,
          godown: r.godown || undefined,
          mfg_date: trackMfg ? r.mfg_date || undefined : undefined,
          expiry_date: trackExpiry ? r.expiry_date || undefined : undefined,
          quantity: Number(r.quantity) || 0,
          actual_quantity: Number(r.actual_quantity ?? r.quantity) || 0,
          rate: Number.isFinite(Number(r.rate)) ? Number(r.rate) : rate,
          disc_percent: Number.isFinite(Number(r.disc_percent)) ? Number(r.disc_percent) : 0,
        };
      }),
    );
  }, [
    rows,
    remaining,
    remainingDisp,
    totalBilled,
    totalQuantity,
    unitSymbol,
    trackMfg,
    trackExpiry,
    rate,
    quantityDriven,
    showBatch,
    onSave,
    trackingNo,
    orderNo,
    dueOn,
    voucherDate,
  ]);

  // Esc / Alt+A themselves are handled by VoucherPopupShell — these wrappers
  // preserve the old guards: nested popups own the keyboard; Esc with a side
  // panel open closes the panel, not the popup; open dropdowns swallow keys.
  const guardedClose = () => {
    if (batchNumberRow !== null || trackingNewNumber || orderNewNumber) return;
    if (activePanel) {
      closePanel();
      return;
    }
    if (showTrackingList || showOrderList) return;
    onClose();
  };
  const guardedAccept = () => {
    if (batchNumberRow !== null || trackingNewNumber || orderNewNumber) return;
    if (activePanel) {
      closePanel();
      return;
    }
    if (showTrackingList || showOrderList) return;
    handleSave();
  };

  // Side-panel keyboard navigation (arrows + Enter). Esc/Alt+A live in the shell.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (batchNumberRow !== null || trackingNewNumber || orderNewNumber) return;
      if (!activePanel) return;
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setPanelHi((p) => Math.min(p + 1, panelLength - 1));
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setPanelHi((p) => Math.max(p - 1, 0));
        return;
      }
      if (e.key === 'Enter' && activePanelRow !== null) {
        e.preventDefault();
        if (activePanel === 'godown') {
          if (panelHi === 0) {
            pickGodown(activePanelRow, '');
          } else {
            const g = godownPanelItems[panelHi - 1];
            if (g) pickGodown(activePanelRow, g.name);
          }
        } else {
          const b = batchPanelItems[panelHi];
          if (b) pickBatch(activePanelRow, b);
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [
    batchNumberRow,
    trackingNewNumber,
    orderNewNumber,
    activePanel,
    activePanelRow,
    panelHi,
    panelLength,
    godownPanelItems,
    batchPanelItems,
  ]);

  const cell = 'shrink-0';
  const W = {
    godown: 'w-28',
    batch: 'w-52',
    qty: 'w-32',
    rate: 'w-20',
    per: 'w-10',
    disc: 'w-14',
    amount: 'w-24',
    del: 'w-5',
  };
  const inputCls =
    'text-xs px-1.5 py-1 border border-gray-400 bg-white w-full outline-none focus:border-black';
  const listHeadCls = 'bg-white text-black border-b border-gray-300';

  return (
    <>
      <VoucherPopupShell
        title="Stock Item Allocations"
        headerRight={
          <span>
            Item Allocations for : <span className="font-bold text-black">{itemName}</span>
          </span>
        }
        onClose={guardedClose}
        onAccept={guardedAccept}
        size="compact"
        bodyClassName="p-0"
      >
        {/* Body flex: [allocation table] [side picker panel] */}
        <div className="flex h-full min-h-0">
          <div className="flex-1 min-w-0 overflow-y-auto px-6 py-4 space-y-3">
            {error && (
              <div className="border border-gray-400 text-black text-xs px-3 py-2 flex justify-between items-center font-semibold">
                <span>• {error}</span>
                <button onClick={() => setError(null)} className="font-bold">
                  &times;
                </button>
              </div>
            )}

            <div className="border border-gray-300">
              {/* Header row 1 */}
              <div className="flex px-3 pt-1.5 text-[10px] font-bold uppercase tracking-wide text-gray-700 gap-2">
                <div className={`${cell} ${W.godown}`}>Godown</div>
                {showBatch && (
                  <div className={`${cell} ${W.batch} text-center`}>Batch / Lot No.</div>
                )}
                <div className={`${cell} ${W.qty} text-center`}>Quantity</div>
                <div className={`${cell} ${W.rate} text-right`}>Rate</div>
                <div className={`${cell} ${W.per} text-center`}>per</div>
                {showDisc && <div className={`${cell} ${W.disc} text-right`}>Disc %</div>}
                <div className={`${cell} ${W.amount} text-right`}>Amount</div>
                <div className={`${cell} ${W.del}`} />
              </div>
              {/* Header row 2 — sub-columns */}
              <div className="flex border-b border-gray-300 px-3 pb-1.5 text-[9px] font-bold uppercase tracking-wide text-gray-500 gap-2">
                <div className={`${cell} ${W.godown}`} />
                {showBatch && (
                  <div className={`${cell} ${W.batch} flex gap-1`}>
                    <div className="flex-1">{trackMfg ? 'Mfg Dt.' : ''}</div>
                    <div className="flex-1">{trackExpiry ? 'Expiry Date' : ''}</div>
                  </div>
                )}
                <div className={`${cell} ${W.qty} flex gap-1`}>
                  {showBilled && (
                    <>
                      <div className="flex-1 text-right">Actual</div>
                      <div className="flex-1 text-right">Billed</div>
                    </>
                  )}
                </div>
                <div className={`${cell} ${W.rate}`} />
                <div className={`${cell} ${W.per}`} />
                {showDisc && <div className={`${cell} ${W.disc}`} />}
                <div className={`${cell} ${W.amount}`} />
                <div className={`${cell} ${W.del}`} />
              </div>

              {/* Order-tracking header — Tracking No. / Order No. / Due on (Tally).
                  These are DEFAULTS applied to any row that has no per-row value
                  of its own. Order No. + Due on show for batch items. Each list
                  has the default (◆ Not Applicable) + New Number + entries. */}
              <div className="flex items-center bg-white px-3 py-1.5 text-[11px] border-b border-gray-200 gap-4">
                {/* Tracking No. */}
                <div className="flex items-center gap-1 relative" ref={trackingRef}>
                  <span className="italic text-gray-600 shrink-0">Tracking No.</span>
                  <span className="text-gray-400">:</span>
                  <button
                    type="button"
                    onClick={() => {
                      setShowOrderList(false);
                      setShowTrackingList((s) => !s);
                    }}
                    className="min-w-[90px] text-left font-semibold text-black border-b border-dashed border-gray-400 hover:border-black px-1"
                  >
                    {trackingNo}
                  </button>
                  {showTrackingList &&
                    trackingPos &&
                    createPortal(
                      <div
                        ref={trackingDropRef}
                        style={{
                          position: 'fixed',
                          top: trackingPos.top,
                          left: trackingPos.left,
                          width: 400,
                        }}
                        className="bg-white border border-gray-400 shadow-xl z-[60] max-h-56 overflow-y-auto"
                      >
                        <div
                          className={`${listHeadCls} text-[10px] font-bold px-2 py-1 sticky top-0 flex justify-between items-center`}
                        >
                          <span>List of Tracking Numbers</span>
                          <button
                            type="button"
                            onClick={() => {
                              setShowTrackingList(false);
                              setTrackingNewNumber(true);
                            }}
                            className="underline font-semibold text-black hover:text-gray-700"
                          >
                            New Number
                          </button>
                        </div>
                        <div className="flex text-[9px] font-bold text-gray-600 px-2 py-1 border-b border-gray-200 gap-1">
                          <div className="flex-1">Name</div>
                          <div className="w-16">Batch</div>
                          <div className="w-16">Godown</div>
                          <div className="w-16">Date</div>
                          <div className="w-14 text-right">Balance</div>
                        </div>
                        <button
                          type="button"
                          onClick={() => selectTracking(NOT_APPLICABLE)}
                          className="flex w-full text-left text-[11px] px-2 py-1 hover:bg-gray-100 border-b border-gray-100 font-semibold"
                        >
                          {NOT_APPLICABLE}
                        </button>
                        {trackingList.map((t) => (
                          <button
                            key={t.name}
                            type="button"
                            onClick={() => selectTracking(t.name)}
                            className="flex w-full text-left text-[11px] px-2 py-1 hover:bg-gray-100 border-b border-gray-100 gap-1"
                          >
                            <div className="flex-1 font-semibold">{t.name}</div>
                            <div className="w-16 font-mono truncate">{t.batch ?? ''}</div>
                            <div className="w-16 font-mono truncate">{t.godown ?? ''}</div>
                            <div className="w-16 font-mono">{fmtDate(t.date)}</div>
                            <div className="w-14 text-right font-mono">{t.balance ?? ''}</div>
                          </button>
                        ))}
                      </div>,
                      document.body,
                    )}
                </div>

                {/* Order No. — batch items only */}
                {showBatch && (
                  <div className="flex items-center gap-1 relative" ref={orderRef}>
                    <span className="italic text-gray-600 shrink-0">Order No.</span>
                    <span className="text-gray-400">:</span>
                    <button
                      type="button"
                      onClick={() => {
                        setShowTrackingList(false);
                        setShowOrderList((s) => !s);
                      }}
                      className="min-w-[90px] text-left font-semibold text-black border-b border-dashed border-gray-400 hover:border-black px-1"
                    >
                      {orderNo}
                    </button>
                    {showOrderList &&
                      orderPos &&
                      createPortal(
                        <div
                          ref={orderDropRef}
                          style={{
                            position: 'fixed',
                            top: orderPos.top,
                            left: orderPos.left,
                            width: 400,
                          }}
                          className="bg-white border border-gray-400 shadow-xl z-[60] max-h-56 overflow-y-auto"
                        >
                          <div
                            className={`${listHeadCls} text-[10px] font-bold px-2 py-1 sticky top-0 flex justify-between items-center`}
                          >
                            <span>List of Orders</span>
                            <button
                              type="button"
                              onClick={() => {
                                setShowOrderList(false);
                                setOrderNewNumber(true);
                              }}
                              className="underline font-semibold text-black hover:text-gray-700"
                            >
                              New Number
                            </button>
                          </div>
                          <div className="flex text-[9px] font-bold text-gray-600 px-2 py-1 border-b border-gray-200 gap-1">
                            <div className="flex-1">Name</div>
                            <div className="w-16">Batch</div>
                            <div className="w-16">Godown</div>
                            <div className="w-16">Due On</div>
                            <div className="w-14 text-right">Balance</div>
                          </div>
                          <button
                            type="button"
                            onClick={() => selectOrder(NOT_APPLICABLE)}
                            className="flex w-full text-left text-[11px] px-2 py-1 hover:bg-gray-100 border-b border-gray-100 font-semibold"
                          >
                            {NOT_APPLICABLE}
                          </button>
                          {orderList.map((o) => (
                            <button
                              key={o.name}
                              type="button"
                              onClick={() => selectOrder(o.name)}
                              className="flex w-full text-left text-[11px] px-2 py-1 hover:bg-gray-100 border-b border-gray-100 gap-1"
                            >
                              <div className="flex-1 font-semibold">{o.name}</div>
                              <div className="w-16 font-mono truncate">{o.batch ?? ''}</div>
                              <div className="w-16 font-mono truncate">{o.godown ?? ''}</div>
                              <div className="w-16 font-mono truncate">{fmtDate(o.due_on)}</div>
                              <div className="w-14 text-right font-mono">{o.balance ?? ''}</div>
                            </button>
                          ))}
                        </div>,
                        document.body,
                      )}
                  </div>
                )}

                {/* Due on — shown once an order is chosen */}
                {showBatch && orderNo !== NOT_APPLICABLE && (
                  <div className="flex items-center gap-1">
                    <span className="italic text-gray-600 shrink-0">Due on</span>
                    <span className="text-gray-400">:</span>
                    <input
                      type="text"
                      value={dueOn}
                      onChange={(e) => setDueOn(e.target.value)}
                      placeholder="e.g. 5 Days"
                      className="w-24 text-xs border border-gray-400 bg-white px-1 py-0.5 outline-none focus:border-black font-mono"
                    />
                  </div>
                )}
              </div>

              {/* Data rows */}
              <div className="divide-y divide-gray-200">
                {rows.map((row, i) => {
                  const baseIso = trackMfg && row.mfg_date ? row.mfg_date : voucherDate;
                  const godownActive = activePanel === 'godown' && activePanelRow === i;
                  const batchActive = activePanel === 'batch' && activePanelRow === i;
                  // Effective Order No. for the row (per-row override, else default) —
                  // gates the per-row "Due on" input.
                  const rowOrdRaw = (row.order_no || '').trim();
                  const effOrder = showBatch
                    ? rowOrdRaw && rowOrdRaw !== NOT_APPLICABLE
                      ? rowOrdRaw
                      : orderNo !== NOT_APPLICABLE
                        ? orderNo
                        : ''
                    : '';
                  return (
                    <div key={i} className="px-3 py-2">
                      <div className="flex items-start gap-2">
                        {/* Godown — button that opens side panel */}
                        <div className={`${cell} ${W.godown}`}>
                          <button
                            type="button"
                            className={`${inputCls} text-left truncate ${godownActive ? 'border-black' : ''}`}
                            onClick={() => {
                              if (godownActive) {
                                closePanel();
                              } else {
                                setActivePanel('godown');
                                setActivePanelRow(i);
                                setGodownSearch('');
                              }
                            }}
                          >
                            {row.godown || <span className="text-gray-400">Location…</span>}
                          </button>
                        </div>

                        {/* Batch / Lot No. + Mfg Dt. / Expiry Date */}
                        {showBatch && (
                          <div className={`${cell} ${W.batch}`}>
                            <input
                              type="text"
                              value={row.batch_number}
                              onChange={(e) => update(i, { batch_number: e.target.value })}
                              onFocus={() => {
                                setActivePanel('batch');
                                setActivePanelRow(i);
                              }}
                              placeholder="Batch / Lot No.…"
                              className={`${inputCls} font-semibold ${batchActive ? 'border-black' : ''}`}
                            />
                            {(trackMfg || trackExpiry) && (
                              <div className="flex gap-1 mt-1">
                                <div className="flex-1">
                                  {trackMfg && (
                                    <input
                                      type="date"
                                      value={row.mfg_date ?? ''}
                                      onChange={(e) => update(i, { mfg_date: e.target.value })}
                                      className={`${inputCls} font-mono`}
                                    />
                                  )}
                                </div>
                                <div className="flex-1">
                                  {trackExpiry && (
                                    <input
                                      type="text"
                                      defaultValue={row.expiry_date ? fmtDate(row.expiry_date) : ''}
                                      onBlur={(e) => {
                                        const iso = parseExpiry(e.target.value, baseIso);
                                        update(i, { expiry_date: iso || undefined });
                                        e.target.value = iso ? fmtDate(iso) : e.target.value;
                                      }}
                                      placeholder="date / 2 years"
                                      className={`${inputCls} font-mono`}
                                    />
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Quantity — Actual / Billed (single Quantity when the F11 flag is No) */}
                        <div className={`${cell} ${W.qty} flex gap-1`}>
                          <input
                            type="number"
                            step="any"
                            data-ba-row={i}
                            data-ba-field="actual"
                            value={row.actual_quantity ?? ''}
                            onChange={(e) => setActual(i, numVal(e.target.value))}
                            onFocus={closePanel}
                            onKeyDown={(e) => {
                              if (e.key !== 'Enter') return;
                              e.preventDefault();
                              focusRowField(i, showBilled ? 'billed' : 'rate');
                            }}
                            className={`${inputCls} text-right font-mono`}
                          />
                          {showBilled && (
                            <input
                              type="number"
                              step="any"
                              data-ba-row={i}
                              data-ba-field="billed"
                              value={row.quantity ?? ''}
                              onChange={(e) => update(i, { quantity: numVal(e.target.value) })}
                              onFocus={closePanel}
                              onKeyDown={(e) => {
                                if (e.key !== 'Enter') return;
                                e.preventDefault();
                                focusRowField(i, 'rate');
                              }}
                              className={`${inputCls} text-right font-mono`}
                            />
                          )}
                        </div>

                        {/* Rate */}
                        <div className={`${cell} ${W.rate}`}>
                          <input
                            type="number"
                            step="any"
                            data-ba-row={i}
                            data-ba-field="rate"
                            value={row.rate ?? ''}
                            onChange={(e) => update(i, { rate: numVal(e.target.value) })}
                            onFocus={closePanel}
                            onKeyDown={(e) => {
                              if (e.key !== 'Enter') return;
                              e.preventDefault();
                              // Disc hidden → Rate is the last field: accept / next row.
                              if (showDisc) focusRowField(i, 'disc');
                              else if (i === rows.length - 1) guardedAccept();
                              else focusRowField(i + 1, 'actual');
                            }}
                            className={`${inputCls} text-right font-mono`}
                          />
                        </div>

                        {/* per */}
                        <div
                          className={`${cell} ${W.per} text-center text-[11px] text-gray-600 pt-1.5 font-mono`}
                        >
                          {unitSymbol ?? ''}
                        </div>

                        {/* Disc % */}
                        {showDisc && (
                          <div className={`${cell} ${W.disc}`}>
                            <input
                              type="number"
                              step="any"
                              data-ba-row={i}
                              data-ba-field="disc"
                              value={row.disc_percent ?? ''}
                              onChange={(e) => update(i, { disc_percent: numVal(e.target.value) })}
                              onFocus={closePanel}
                              onKeyDown={(e) => {
                                if (e.key !== 'Enter') return;
                                e.preventDefault();
                                // Last row → accept (Enter-Enter through to save); else next row.
                                if (i === rows.length - 1) guardedAccept();
                                else focusRowField(i + 1, 'actual');
                              }}
                              className={`${inputCls} text-right font-mono`}
                            />
                          </div>
                        )}

                        {/* Amount */}
                        <div
                          className={`${cell} ${W.amount} text-right text-xs font-mono font-semibold pt-1.5`}
                        >
                          {num(lineAmount(row))}
                        </div>

                        {/* Remove */}
                        <div className={`${cell} ${W.del} text-center pt-1`}>
                          <button
                            type="button"
                            onClick={() => removeRow(i)}
                            className="text-gray-400 hover:text-black text-sm font-bold"
                          >
                            &times;
                          </button>
                        </div>
                      </div>

                      {/* Per-row Tracking / Order / Due-on overrides — blank rows
                        inherit the top-level defaults above on save. */}
                      <div className="flex items-center gap-1.5 mt-1 text-[10px] text-gray-600">
                        <span className="italic shrink-0">Tracking No.:</span>
                        <input
                          type="text"
                          value={row.tracking_no ?? ''}
                          onChange={(e) => update(i, { tracking_no: e.target.value })}
                          onFocus={closePanel}
                          placeholder={trackingNo !== NOT_APPLICABLE ? trackingNo : '—'}
                          className="w-24 text-[10px] px-1 py-0.5 border border-gray-300 bg-white outline-none focus:border-black font-mono"
                        />
                        {showBatch && (
                          <>
                            <span className="italic shrink-0 ml-2">Order No.:</span>
                            <input
                              type="text"
                              value={row.order_no ?? ''}
                              onChange={(e) => update(i, { order_no: e.target.value })}
                              onFocus={closePanel}
                              placeholder={orderNo !== NOT_APPLICABLE ? orderNo : '—'}
                              className="w-24 text-[10px] px-1 py-0.5 border border-gray-300 bg-white outline-none focus:border-black font-mono"
                            />
                            {effOrder && (
                              <>
                                <span className="italic shrink-0 ml-2">Due on:</span>
                                <input
                                  type="text"
                                  value={row.due_on ?? ''}
                                  onChange={(e) => update(i, { due_on: e.target.value })}
                                  onFocus={closePanel}
                                  placeholder={dueOn || 'e.g. 5 Days'}
                                  className="w-24 text-[10px] px-1 py-0.5 border border-gray-300 bg-white outline-none focus:border-black font-mono"
                                />
                              </>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Totals row — bold + 1px black top border, no fill */}
              <div className="flex items-center px-3 py-2 border-t border-black gap-2 font-bold text-xs font-mono">
                <div className={`${cell} ${W.godown}`} />
                {showBatch && <div className={`${cell} ${W.batch}`} />}
                <div className={`${cell} ${W.qty} flex gap-1`}>
                  {showBilled && <div className="flex-1 text-right">{totalActual || ''}</div>}
                  <div className="flex-1 text-right">{totalBilled || ''}</div>
                </div>
                <div className={`${cell} ${W.rate}`} />
                <div className={`${cell} ${W.per}`} />
                {showDisc && <div className={`${cell} ${W.disc}`} />}
                <div className={`${cell} ${W.amount} text-right`}>{num(totalAmount)}</div>
                <div className={`${cell} ${W.del}`} />
              </div>
            </div>

            <div className="flex justify-between items-center">
              <button
                onClick={addRow}
                className="text-[10px] uppercase tracking-wide font-bold text-gray-700 hover:text-black border border-gray-400 px-2.5 py-1 hover:bg-gray-100"
              >
                + Add Batch
              </button>
              {quantityDriven ? (
                <span className="text-xs font-mono font-semibold text-black">
                  Total: {totalBilled} {unitSymbol ?? ''}
                </span>
              ) : (
                <span
                  className={`text-xs font-mono font-semibold ${Math.abs(remaining) < 0.0001 ? 'text-gray-500' : 'text-black'}`}
                >
                  Remaining: {remainingDisp} {unitSymbol ?? ''}
                </span>
              )}
            </div>
          </div>

          {/* ── Side panel: List of Godowns or List of Active Batches ── */}
          {activePanel !== null && (
            <div className="w-64 shrink-0 border-l border-gray-300 flex flex-col bg-white">
              {activePanel === 'godown' ? (
                <>
                  {/* Godown panel header */}
                  <div
                    className={`${listHeadCls} text-xs font-bold px-2 py-1 flex justify-between items-center shrink-0`}
                  >
                    <span>List of Godowns</span>
                    <button
                      onClick={closePanel}
                      className="text-gray-500 hover:text-black font-bold leading-none"
                    >
                      &times;
                    </button>
                  </div>

                  {/* Search */}
                  <div className="border-b border-gray-300 shrink-0">
                    <input
                      ref={godownSearchRef}
                      type="text"
                      className="w-full text-xs outline-none px-2 py-1 bg-white"
                      value={godownSearch}
                      onChange={(e) => setGodownSearch(e.target.value)}
                      placeholder="Search..."
                    />
                  </div>

                  {/* Godown items */}
                  <div ref={panelListRef} className="flex-1 overflow-y-auto min-h-0">
                    {/* Any */}
                    <div
                      data-panel-item
                      className={`px-2 py-0.5 text-xs cursor-pointer select-none flex items-center justify-between ${panelHi === 0 ? 'bg-gray-200 font-semibold' : 'hover:bg-gray-50'}`}
                      onClick={() => activePanelRow !== null && pickGodown(activePanelRow, '')}
                      onMouseEnter={() => setPanelHi(0)}
                    >
                      <span>&#9670; Any</span>
                    </div>

                    {filteredGodowns.map((g, idx) => (
                      <div
                        key={g.godown_id ?? g.name}
                        data-panel-item
                        className={`px-2 py-0.5 text-xs cursor-pointer select-none flex items-center justify-between ${panelHi === idx + 1 ? 'bg-gray-200 font-semibold' : 'hover:bg-gray-50'}`}
                        onClick={() =>
                          activePanelRow !== null && pickGodown(activePanelRow, g.name)
                        }
                        onMouseEnter={() => setPanelHi(idx + 1)}
                      >
                        <span className="truncate">{g.name}</span>
                        <span className="text-gray-500 text-[10px] shrink-0 ml-2 flex items-center gap-2">
                          <span>&#9670; {parentName(g)}</span>
                          <span className="font-mono text-gray-600 w-12 text-right">
                            {g.godown_id != null ? fmtQty(godownBal[g.godown_id], unitSymbol) : ''}
                          </span>
                        </span>
                      </div>
                    ))}

                    {filteredGodowns.length === 0 && (
                      <div className="px-2 py-2 text-xs text-gray-400 italic">No godowns</div>
                    )}
                  </div>

                  <div className="border-t border-gray-200 px-2 py-1 text-[10px] text-gray-500 select-none shrink-0">
                    ↑↓ Navigate &nbsp;·&nbsp; Enter Select
                  </div>
                </>
              ) : (
                <>
                  {/* Batch panel header — "New Number" on the right */}
                  <div
                    className={`${listHeadCls} text-xs font-bold px-2 py-1 flex justify-between items-center shrink-0`}
                  >
                    <span>List of Active Batches</span>
                    {/* New Number — always available (Tally shows it for outward too). */}
                    <button
                      type="button"
                      title={isInward ? 'Create a new lot' : 'Type a batch number to issue'}
                      className="text-black hover:text-gray-700 font-semibold text-[10px] underline"
                      onClick={() => {
                        if (activePanelRow !== null) {
                          setBatchNumberRow(activePanelRow);
                          closePanel();
                        }
                      }}
                    >
                      New Number
                    </button>
                  </div>

                  {/* Column headers */}
                  <div className="flex px-2 py-1 border-b border-gray-300 text-[9px] font-bold uppercase tracking-wide text-gray-600 shrink-0">
                    <div className="flex-1">Name</div>
                    <div className="w-16 text-center">Expiry</div>
                    <div className="w-14 text-right">Balance</div>
                  </div>

                  {/* Items — New Number (header) + existing batches only, no "Any". */}
                  <div ref={panelListRef} className="flex-1 overflow-y-auto min-h-0">
                    {filteredBatches.map((b, idx) => (
                      <div
                        key={b.name}
                        data-panel-item
                        className={`px-2 py-0.5 text-xs cursor-pointer select-none flex items-center ${panelHi === idx ? 'bg-gray-200 font-semibold' : 'hover:bg-gray-50'}`}
                        onClick={() => activePanelRow !== null && pickBatch(activePanelRow, b)}
                        onMouseEnter={() => setPanelHi(idx)}
                      >
                        <span className="flex-1 font-mono truncate">{b.name}</span>
                        <span className="w-16 text-center font-mono text-gray-600">
                          {fmtDate(b.expiry_date)}
                        </span>
                        <span className="w-14 text-right font-mono text-gray-600">
                          {b.balance ? `${b.balance}${unitSymbol ? ` ${unitSymbol}` : ''}` : ''}
                        </span>
                      </div>
                    ))}

                    {filteredBatches.length === 0 && (
                      <div className="px-2 py-2 text-xs text-gray-400 italic">No batches yet</div>
                    )}
                  </div>

                  <div className="border-t border-gray-200 px-2 py-1 text-[10px] text-gray-500 select-none shrink-0">
                    ↑↓ Navigate &nbsp;·&nbsp; Enter Select
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </VoucherPopupShell>

      {/* New Number popup — tracking numbers (shared component, same everywhere) */}
      {trackingNewNumber && (
        <NewNumberPopup
          title="New Number"
          label="Tracking No."
          onClose={() => setTrackingNewNumber(false)}
          onConfirm={addTrackingNumber}
        />
      )}

      {/* New Number popup — order numbers */}
      {orderNewNumber && (
        <NewNumberPopup
          title="New Number"
          label="Order No."
          onClose={() => setOrderNewNumber(false)}
          onConfirm={addOrderNumber}
        />
      )}

      {/* New Number popup — batch numbers */}
      {batchNumberRow !== null && (
        <NewNumberPopup
          title="New Number"
          label="Batch / Lot No."
          onClose={() => setBatchNumberRow(null)}
          onConfirm={(value) => {
            setCreatedBatches((c) => (c.includes(value) ? c : [...c, value]));
            update(batchNumberRow, { batch_number: value });
            setBatchNumberRow(null);
          }}
        />
      )}
    </>
  );
}
