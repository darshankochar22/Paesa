import { useState, useEffect, useCallback, useRef } from "react";
import type { BatchAllocation } from "../../types";
import NewNumberPopup from "./NewNumberPopup";
import { VoucherPopupShell } from "@/components/tally-ui/VoucherPopupShell";

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

const NOT_APPLICABLE = "◆ Not Applicable";

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

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function fmtDate(iso?: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return `${d.getDate()}-${MONTHS[d.getMonth()]}-${String(d.getFullYear()).slice(-2)}`;
}

function toIso(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function parseExpiry(input: string, baseIso: string): string {
  const raw = (input || "").trim();
  if (!raw) return "";
  const direct = new Date(raw);
  if (!isNaN(direct.getTime()) && /\d{4}|[A-Za-z]{3}/.test(raw) && !/year|month|day|yr|mo|wk|week/i.test(raw)) {
    return toIso(direct);
  }
  const m = raw.match(/^(\d+)\s*(year|years|yr|month|months|mo|week|weeks|wk|day|days)$/i);
  if (m) {
    const n = parseInt(m[1], 10);
    const unit = m[2].toLowerCase();
    const base = new Date(baseIso);
    if (isNaN(base.getTime())) return "";
    if (unit.startsWith("year") || unit === "yr") base.setFullYear(base.getFullYear() + n);
    else if (unit.startsWith("mo")) base.setMonth(base.getMonth() + n);
    else if (unit.startsWith("week") || unit === "wk") base.setDate(base.getDate() + n * 7);
    else base.setDate(base.getDate() + n);
    return toIso(base);
  }
  return "";
}

const num = (v: number | undefined) =>
  v ? v.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "";

export default function BatchAllocationPopup({
  companyId, itemId, itemName, totalQuantity, rate, unitSymbol,
  voucherDate, trackMfg, trackExpiry, isInward, godowns = [], initialAllocations = [],
  quantityDriven = false, showBatch = true,
  onClose, onSave,
}: Props) {
  const defaultGodown = godowns[0]?.name ?? "";

  const emptyRow = (): BatchAllocation => ({
    batch_number: "",
    godown: defaultGodown,
    quantity: quantityDriven ? 0 : totalQuantity,
    actual_quantity: quantityDriven ? 0 : totalQuantity,
    rate,
    disc_percent: 0,
  });

  const [rows, setRows] = useState<BatchAllocation[]>(
    initialAllocations.length ? initialAllocations.map((a) => ({ ...a })) : [emptyRow()]
  );
  const [activeBatches, setActiveBatches] = useState<ActiveBatch[]>([]);
  const [createdBatches, setCreatedBatches] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Side panel — "godown" or "batch", plus which row is active
  const [activePanel, setActivePanel] = useState<null | "godown" | "batch">(null);
  const [activePanelRow, setActivePanelRow] = useState<number | null>(null);
  const [godownSearch, setGodownSearch] = useState("");
  const [panelHi, setPanelHi] = useState(0);
  const panelListRef = useRef<HTMLDivElement>(null);
  const godownSearchRef = useRef<HTMLInputElement>(null);

  // NewNumber popup for batch
  const [batchNumberRow, setBatchNumberRow] = useState<number | null>(null);

  // Tracking No.
  const [trackingList, setTrackingList] = useState<TrackingOption[]>([]);
  const [trackingNo, setTrackingNo] = useState<string>(initialAllocations[0]?.tracking_no || NOT_APPLICABLE);
  const [showTrackingList, setShowTrackingList] = useState(false);
  const [trackingNewNumber, setTrackingNewNumber] = useState(false);
  const trackingRef = useRef<HTMLDivElement | null>(null);

  // Order No. + Due on (batch items) — mirrors Tracking No.
  const [orderList, setOrderList] = useState<OrderOption[]>([]);
  const [orderNo, setOrderNo] = useState<string>(initialAllocations[0]?.order_no || NOT_APPLICABLE);
  const [dueOn, setDueOn] = useState<string>(initialAllocations[0]?.due_on || "");
  const [showOrderList, setShowOrderList] = useState(false);
  const [orderNewNumber, setOrderNewNumber] = useState(false);
  const orderRef = useRef<HTMLDivElement | null>(null);

  // Load existing batches
  useEffect(() => {
    if (!companyId || !itemId) return;
    (window as any).api.report.batchBalances(companyId, itemId).then((res: any) => {
      if (res?.success) setActiveBatches(res.batches ?? []);
    }).catch(() => {});
  }, [companyId, itemId]);

  // Load tracking numbers
  useEffect(() => {
    if (!companyId || !itemId) return;
    (window as any).api.report.trackingNumbers?.(companyId, itemId).then((res: any) => {
      if (res?.success) setTrackingList(res.trackingNumbers ?? []);
    }).catch(() => {});
  }, [companyId, itemId]);

  // Load order numbers
  useEffect(() => {
    if (!companyId || !itemId) return;
    (window as any).api.report.orderNumbers?.(companyId, itemId).then((res: any) => {
      if (res?.success) setOrderList(res.orders ?? []);
    }).catch(() => {});
  }, [companyId, itemId]);

  // Close tracking dropdown on outside click
  useEffect(() => {
    if (!showTrackingList) return;
    const onDown = (e: MouseEvent) => {
      if (trackingRef.current && !trackingRef.current.contains(e.target as Node)) setShowTrackingList(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [showTrackingList]);

  // Close order dropdown on outside click
  useEffect(() => {
    if (!showOrderList) return;
    const onDown = (e: MouseEvent) => {
      if (orderRef.current && !orderRef.current.contains(e.target as Node)) setShowOrderList(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [showOrderList]);

  // Auto-focus godown search when godown panel opens
  useEffect(() => {
    if (activePanel === "godown") {
      setTimeout(() => godownSearchRef.current?.focus(), 30);
    }
  }, [activePanel]);

  // Reset highlight when panel or search changes
  useEffect(() => { setPanelHi(0); }, [activePanel, godownSearch, activePanelRow]);

  const closePanel = () => {
    setActivePanel(null);
    setActivePanelRow(null);
    setGodownSearch("");
    setPanelHi(0);
  };

  // Resolve parent name from godowns list
  const parentName = (g: GodownOption): string => {
    if (!g.parent_godown_id) return "Primary";
    const p = godowns.find((x) => x.godown_id === g.parent_godown_id);
    return p?.name ?? "Primary";
  };

  // Filtered lists for side panels
  const filteredGodowns = godowns.filter((g) =>
    !godownSearch || g.name.toLowerCase().includes(godownSearch.toLowerCase())
  );

  const batchSearchTerm =
    activePanelRow !== null ? (rows[activePanelRow]?.batch_number ?? "") : "";
  const filteredBatches = [
    ...activeBatches,
    ...createdBatches
      .filter((n) => !activeBatches.some((b) => b.name === n))
      .map((n) => ({ name: n, mfg_date: null, expiry_date: null, balance: 0 })),
  ].filter(
    (b) =>
      !batchSearchTerm ||
      batchSearchTerm === "Any" ||
      b.name.toLowerCase().includes(batchSearchTerm.toLowerCase())
  );

  // Panel keyboard nav
  const godownPanelItems = filteredGodowns;
  const batchPanelItems = filteredBatches;
  const panelLength =
    activePanel === "godown" ? godownPanelItems.length + 1 /* Any */ : batchPanelItems.length;

  useEffect(() => {
    if (!activePanel) return;
    const el = panelListRef.current?.querySelectorAll("[data-panel-item]")[panelHi] as HTMLElement | null;
    el?.scrollIntoView({ block: "nearest" });
  }, [panelHi, activePanel]);

  const selectTracking = (name: string) => { setTrackingNo(name); setShowTrackingList(false); };
  const addTrackingNumber = (value: string) => {
    setTrackingList((prev) => (prev.some((t) => t.name === value) ? prev : [...prev, { name: value }]));
    setTrackingNo(value);
    setTrackingNewNumber(false);
    setShowTrackingList(false);
  };

  const selectOrder = (name: string) => {
    setOrderNo(name);
    setShowOrderList(false);
    if (name === NOT_APPLICABLE) setDueOn("");
  };
  const addOrderNumber = (value: string) => {
    setOrderList((prev) => (prev.some((o) => o.name === value) ? prev : [...prev, { name: value }]));
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

  const update = (i: number, patch: Partial<BatchAllocation>) => {
    setError(null);
    setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  };

  const setActual = (i: number, v: number) => {
    setError(null);
    setRows((prev) =>
      prev.map((r, idx) => {
        if (idx !== i) return r;
        const linked = (Number(r.quantity) || 0) === (Number(r.actual_quantity) || 0);
        return { ...r, actual_quantity: v, quantity: linked ? v : r.quantity };
      })
    );
  };

  const pickBatch = (i: number, b: ActiveBatch) => {
    update(i, { batch_number: b.name, mfg_date: b.mfg_date ?? undefined, expiry_date: b.expiry_date ?? undefined });
    closePanel();
  };

  const pickGodown = (i: number, name: string) => {
    update(i, { godown: name });
    closePanel();
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
      setError("Every row needs a Batch / Lot No.");
      return;
    }
    if (quantityDriven) {
      if (totalBilled <= 0) { setError("Enter a quantity for at least one batch."); return; }
    } else if (Math.abs(remaining) >= 0.0001) {
      setError(`Allocated ${totalBilled} of ${totalQuantity} ${unitSymbol ?? ""} — remaining ${remaining} must be zero.`);
      return;
    }
    const trk = trackingNo && trackingNo !== NOT_APPLICABLE ? trackingNo : undefined;
    const ord = showBatch && orderNo && orderNo !== NOT_APPLICABLE ? orderNo : undefined;
    onSave(rows.map((r) => ({
      batch_number: r.batch_number.trim(),
      tracking_no: trk,
      order_no: ord,
      due_on: ord ? (dueOn || undefined) : undefined,
      godown: r.godown || undefined,
      mfg_date: trackMfg ? (r.mfg_date || undefined) : undefined,
      expiry_date: trackExpiry ? (r.expiry_date || undefined) : undefined,
      quantity: Number(r.quantity) || 0,
      actual_quantity: Number(r.actual_quantity ?? r.quantity) || 0,
      rate: Number(r.rate) || rate,
      disc_percent: Number(r.disc_percent) || 0,
    })));
  }, [rows, remaining, totalBilled, totalQuantity, unitSymbol, trackMfg, trackExpiry, rate, quantityDriven, showBatch, onSave, trackingNo, orderNo, dueOn]);

  // Esc / Alt+A themselves are handled by VoucherPopupShell — these wrappers
  // preserve the old guards: nested popups own the keyboard; Esc with a side
  // panel open closes the panel, not the popup; open dropdowns swallow keys.
  const guardedClose = () => {
    if (batchNumberRow !== null || trackingNewNumber || orderNewNumber) return;
    if (activePanel) { closePanel(); return; }
    if (showTrackingList || showOrderList) return;
    onClose();
  };
  const guardedAccept = () => {
    if (batchNumberRow !== null || trackingNewNumber || orderNewNumber) return;
    if (activePanel) { closePanel(); return; }
    if (showTrackingList || showOrderList) return;
    handleSave();
  };

  // Side-panel keyboard navigation (arrows + Enter). Esc/Alt+A live in the shell.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (batchNumberRow !== null || trackingNewNumber || orderNewNumber) return;
      if (!activePanel) return;
      if (e.key === "ArrowDown") { e.preventDefault(); setPanelHi((p) => Math.min(p + 1, panelLength - 1)); return; }
      if (e.key === "ArrowUp") { e.preventDefault(); setPanelHi((p) => Math.max(p - 1, 0)); return; }
      if (e.key === "Enter" && activePanelRow !== null) {
        e.preventDefault();
        if (activePanel === "godown") {
          if (panelHi === 0) { pickGodown(activePanelRow, ""); }
          else { const g = godownPanelItems[panelHi - 1]; if (g) pickGodown(activePanelRow, g.name); }
        } else {
          const b = batchPanelItems[panelHi]; if (b) pickBatch(activePanelRow, b);
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [batchNumberRow, trackingNewNumber, orderNewNumber, activePanel, activePanelRow, panelHi,
      panelLength, godownPanelItems, batchPanelItems]);

  const cell = "shrink-0";
  const W = {
    godown: "w-28",
    batch: "w-52",
    qty: "w-32",
    rate: "w-20",
    per: "w-10",
    disc: "w-14",
    amount: "w-24",
    del: "w-5",
  };
  const inputCls = "text-xs px-1.5 py-1 border border-gray-400 bg-white w-full outline-none focus:border-black";
  const listHeadCls = "bg-white text-black border-b border-gray-300";

  return (
    <>
      <VoucherPopupShell
        title="Stock Item Allocations"
        headerRight={
          <span>Item Allocations for : <span className="font-bold text-black">{itemName}</span></span>
        }
        onClose={guardedClose}
        onAccept={guardedAccept}
        bodyClassName="p-0"
      >
        {/* Body flex: [allocation table] [side picker panel] */}
        <div className="flex h-full min-h-0">
          <div className="flex-1 min-w-0 overflow-y-auto px-6 py-4 space-y-3">
            {error && (
              <div className="border border-gray-400 text-black text-xs px-3 py-2 flex justify-between items-center font-semibold">
                <span>• {error}</span>
                <button onClick={() => setError(null)} className="font-bold">&times;</button>
              </div>
            )}

            <div className="border border-gray-300">
              {/* Header row 1 */}
              <div className="flex px-3 pt-1.5 text-[10px] font-bold uppercase tracking-wide text-gray-700 gap-2">
                <div className={`${cell} ${W.godown}`}>Godown</div>
                {showBatch && <div className={`${cell} ${W.batch} text-center`}>Batch / Lot No.</div>}
                <div className={`${cell} ${W.qty} text-center`}>Quantity</div>
                <div className={`${cell} ${W.rate} text-right`}>Rate</div>
                <div className={`${cell} ${W.per} text-center`}>per</div>
                <div className={`${cell} ${W.disc} text-right`}>Disc %</div>
                <div className={`${cell} ${W.amount} text-right`}>Amount</div>
                <div className={`${cell} ${W.del}`} />
              </div>
              {/* Header row 2 — sub-columns */}
              <div className="flex border-b border-gray-300 px-3 pb-1.5 text-[9px] font-bold uppercase tracking-wide text-gray-500 gap-2">
                <div className={`${cell} ${W.godown}`} />
                {showBatch && (
                  <div className={`${cell} ${W.batch} flex gap-1`}>
                    <div className="flex-1">{trackMfg ? "Mfg Dt." : ""}</div>
                    <div className="flex-1">{trackExpiry ? "Expiry Date" : ""}</div>
                  </div>
                )}
                <div className={`${cell} ${W.qty} flex gap-1`}>
                  <div className="flex-1 text-right">Actual</div>
                  <div className="flex-1 text-right">Billed</div>
                </div>
                <div className={`${cell} ${W.rate}`} />
                <div className={`${cell} ${W.per}`} />
                <div className={`${cell} ${W.disc}`} />
                <div className={`${cell} ${W.amount}`} />
                <div className={`${cell} ${W.del}`} />
              </div>

              {/* Order-tracking header — Tracking No. / Order No. / Due on (Tally).
                  Order No. + Due on show for batch items. Each list has only the
                  default (◆ Not Applicable) + New Number + existing entries. */}
              <div className="flex items-center bg-white px-3 py-1.5 text-[11px] border-b border-gray-200 gap-4">
                {/* Tracking No. */}
                <div className="flex items-center gap-1 relative" ref={trackingRef}>
                  <span className="italic text-gray-600 shrink-0">Tracking No.</span>
                  <span className="text-gray-400">:</span>
                  <button
                    type="button"
                    onClick={() => { setShowOrderList(false); setShowTrackingList((s) => !s); }}
                    className="min-w-[90px] text-left font-semibold text-black border-b border-dashed border-gray-400 hover:border-black px-1"
                  >
                    {trackingNo}
                  </button>
                  {showTrackingList && (
                    <div className="absolute left-0 top-full mt-1 w-[400px] bg-white border border-gray-400 shadow-xl z-40 max-h-56 overflow-y-auto">
                      <div className={`${listHeadCls} text-[10px] font-bold px-2 py-1 sticky top-0 flex justify-between items-center`}>
                        <span>List of Tracking Numbers</span>
                        <button type="button" onClick={() => { setShowTrackingList(false); setTrackingNewNumber(true); }} className="underline font-semibold text-black hover:text-gray-700">New Number</button>
                      </div>
                      <div className="flex text-[9px] font-bold text-gray-600 px-2 py-1 border-b border-gray-200 gap-1">
                        <div className="flex-1">Name</div>
                        <div className="w-16">Batch</div>
                        <div className="w-16">Godown</div>
                        <div className="w-16">Date</div>
                        <div className="w-14 text-right">Balance</div>
                      </div>
                      <button type="button" onClick={() => selectTracking(NOT_APPLICABLE)}
                        className="flex w-full text-left text-[11px] px-2 py-1 hover:bg-gray-100 border-b border-gray-100 font-semibold">
                        {NOT_APPLICABLE}
                      </button>
                      {trackingList.map((t) => (
                        <button key={t.name} type="button" onClick={() => selectTracking(t.name)}
                          className="flex w-full text-left text-[11px] px-2 py-1 hover:bg-gray-100 border-b border-gray-100 gap-1">
                          <div className="flex-1 font-semibold">{t.name}</div>
                          <div className="w-16 font-mono truncate">{t.batch ?? ""}</div>
                          <div className="w-16 font-mono truncate">{t.godown ?? ""}</div>
                          <div className="w-16 font-mono">{fmtDate(t.date)}</div>
                          <div className="w-14 text-right font-mono">{t.balance ?? ""}</div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Order No. — batch items only */}
                {showBatch && (
                  <div className="flex items-center gap-1 relative" ref={orderRef}>
                    <span className="italic text-gray-600 shrink-0">Order No.</span>
                    <span className="text-gray-400">:</span>
                    <button
                      type="button"
                      onClick={() => { setShowTrackingList(false); setShowOrderList((s) => !s); }}
                      className="min-w-[90px] text-left font-semibold text-black border-b border-dashed border-gray-400 hover:border-black px-1"
                    >
                      {orderNo}
                    </button>
                    {showOrderList && (
                      <div className="absolute left-0 top-full mt-1 w-[400px] bg-white border border-gray-400 shadow-xl z-40 max-h-56 overflow-y-auto">
                        <div className={`${listHeadCls} text-[10px] font-bold px-2 py-1 sticky top-0 flex justify-between items-center`}>
                          <span>List of Orders</span>
                          <button type="button" onClick={() => { setShowOrderList(false); setOrderNewNumber(true); }} className="underline font-semibold text-black hover:text-gray-700">New Number</button>
                        </div>
                        <div className="flex text-[9px] font-bold text-gray-600 px-2 py-1 border-b border-gray-200 gap-1">
                          <div className="flex-1">Name</div>
                          <div className="w-16">Batch</div>
                          <div className="w-16">Godown</div>
                          <div className="w-16">Due On</div>
                          <div className="w-14 text-right">Balance</div>
                        </div>
                        <button type="button" onClick={() => selectOrder(NOT_APPLICABLE)}
                          className="flex w-full text-left text-[11px] px-2 py-1 hover:bg-gray-100 border-b border-gray-100 font-semibold">
                          {NOT_APPLICABLE}
                        </button>
                        {orderList.map((o) => (
                          <button key={o.name} type="button" onClick={() => selectOrder(o.name)}
                            className="flex w-full text-left text-[11px] px-2 py-1 hover:bg-gray-100 border-b border-gray-100 gap-1">
                            <div className="flex-1 font-semibold">{o.name}</div>
                            <div className="w-16 font-mono truncate">{o.batch ?? ""}</div>
                            <div className="w-16 font-mono truncate">{o.godown ?? ""}</div>
                            <div className="w-16 font-mono truncate">{o.due_on ?? ""}</div>
                            <div className="w-14 text-right font-mono">{o.balance ?? ""}</div>
                          </button>
                        ))}
                      </div>
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
                  const baseIso = (trackMfg && row.mfg_date) ? row.mfg_date : voucherDate;
                  const godownActive = activePanel === "godown" && activePanelRow === i;
                  const batchActive = activePanel === "batch" && activePanelRow === i;
                  return (
                    <div key={i} className="flex items-start px-3 py-2 gap-2">

                      {/* Godown — button that opens side panel */}
                      <div className={`${cell} ${W.godown}`}>
                        <button
                          type="button"
                          className={`${inputCls} text-left truncate ${godownActive ? "border-black" : ""}`}
                          onClick={() => {
                            if (godownActive) { closePanel(); }
                            else { setActivePanel("godown"); setActivePanelRow(i); setGodownSearch(""); }
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
                            onFocus={() => { setActivePanel("batch"); setActivePanelRow(i); }}
                            placeholder="Batch / Lot No.…"
                            className={`${inputCls} font-semibold ${batchActive ? "border-black" : ""}`}
                          />
                          {(trackMfg || trackExpiry) && (
                            <div className="flex gap-1 mt-1">
                              <div className="flex-1">
                                {trackMfg && (
                                  <input
                                    type="date"
                                    value={row.mfg_date ?? ""}
                                    onChange={(e) => update(i, { mfg_date: e.target.value })}
                                    className={`${inputCls} font-mono`}
                                  />
                                )}
                              </div>
                              <div className="flex-1">
                                {trackExpiry && (
                                  <input
                                    type="text"
                                    defaultValue={row.expiry_date ? fmtDate(row.expiry_date) : ""}
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

                      {/* Quantity — Actual / Billed */}
                      <div className={`${cell} ${W.qty} flex gap-1`}>
                        <input
                          type="number"
                          step="any"
                          value={row.actual_quantity || ""}
                          onChange={(e) => setActual(i, Number(e.target.value) || 0)}
                          onFocus={closePanel}
                          className={`${inputCls} text-right font-mono`}
                        />
                        <input
                          type="number"
                          step="any"
                          value={row.quantity || ""}
                          onChange={(e) => update(i, { quantity: Number(e.target.value) || 0 })}
                          onFocus={closePanel}
                          className={`${inputCls} text-right font-mono`}
                        />
                      </div>

                      {/* Rate */}
                      <div className={`${cell} ${W.rate}`}>
                        <input
                          type="number"
                          step="any"
                          value={row.rate || ""}
                          onChange={(e) => update(i, { rate: Number(e.target.value) || 0 })}
                          onFocus={closePanel}
                          className={`${inputCls} text-right font-mono`}
                        />
                      </div>

                      {/* per */}
                      <div className={`${cell} ${W.per} text-center text-[11px] text-gray-600 pt-1.5 font-mono`}>
                        {unitSymbol ?? ""}
                      </div>

                      {/* Disc % */}
                      <div className={`${cell} ${W.disc}`}>
                        <input
                          type="number"
                          step="any"
                          value={row.disc_percent || ""}
                          onChange={(e) => update(i, { disc_percent: Number(e.target.value) || 0 })}
                          onFocus={closePanel}
                          className={`${inputCls} text-right font-mono`}
                        />
                      </div>

                      {/* Amount */}
                      <div className={`${cell} ${W.amount} text-right text-xs font-mono font-semibold pt-1.5`}>
                        {num(lineAmount(row))}
                      </div>

                      {/* Remove */}
                      <div className={`${cell} ${W.del} text-center pt-1`}>
                        <button type="button" onClick={() => removeRow(i)} className="text-gray-400 hover:text-black text-sm font-bold">&times;</button>
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
                  <div className="flex-1 text-right">{totalActual || ""}</div>
                  <div className="flex-1 text-right">{totalBilled || ""}</div>
                </div>
                <div className={`${cell} ${W.rate}`} />
                <div className={`${cell} ${W.per}`} />
                <div className={`${cell} ${W.disc}`} />
                <div className={`${cell} ${W.amount} text-right`}>{num(totalAmount)}</div>
                <div className={`${cell} ${W.del}`} />
              </div>
            </div>

            <div className="flex justify-between items-center">
              <button onClick={addRow}
                className="text-[10px] uppercase tracking-wide font-bold text-gray-700 hover:text-black border border-gray-400 px-2.5 py-1 hover:bg-gray-100">
                + Add Batch
              </button>
              {quantityDriven ? (
                <span className="text-xs font-mono font-semibold text-black">
                  Total: {totalBilled} {unitSymbol ?? ""}
                </span>
              ) : (
                <span className={`text-xs font-mono font-semibold ${Math.abs(remaining) < 0.0001 ? "text-gray-500" : "text-black"}`}>
                  Remaining: {remaining} {unitSymbol ?? ""}
                </span>
              )}
            </div>
          </div>

          {/* ── Side panel: List of Godowns or List of Active Batches ── */}
          {activePanel !== null && (
            <div className="w-64 shrink-0 border-l border-gray-300 flex flex-col bg-white">

              {activePanel === "godown" ? (
                <>
                  {/* Godown panel header */}
                  <div className={`${listHeadCls} text-xs font-bold px-2 py-1 flex justify-between items-center shrink-0`}>
                    <span>List of Godowns</span>
                    <button onClick={closePanel} className="text-gray-500 hover:text-black font-bold leading-none">&times;</button>
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

                  {/* Create */}
                  <div
                    className="px-2 py-1 text-xs cursor-pointer hover:bg-gray-100 border-b border-gray-200 text-black select-none font-semibold"
                    onClick={closePanel}
                  >
                    Create
                  </div>

                  {/* Godown items */}
                  <div ref={panelListRef} className="flex-1 overflow-y-auto min-h-0">
                    {/* Any */}
                    <div
                      data-panel-item
                      className={`px-2 py-0.5 text-xs cursor-pointer select-none flex items-center justify-between ${panelHi === 0 ? "bg-gray-200 font-semibold" : "hover:bg-gray-50"}`}
                      onClick={() => activePanelRow !== null && pickGodown(activePanelRow, "")}
                      onMouseEnter={() => setPanelHi(0)}
                    >
                      <span>&#9670; Any</span>
                    </div>

                    {filteredGodowns.map((g, idx) => (
                      <div
                        key={g.godown_id ?? g.name}
                        data-panel-item
                        className={`px-2 py-0.5 text-xs cursor-pointer select-none flex items-center justify-between ${panelHi === idx + 1 ? "bg-gray-200 font-semibold" : "hover:bg-gray-50"}`}
                        onClick={() => activePanelRow !== null && pickGodown(activePanelRow, g.name)}
                        onMouseEnter={() => setPanelHi(idx + 1)}
                      >
                        <span className="truncate">{g.name}</span>
                        <span className="text-gray-500 text-[10px] shrink-0 ml-2">&#9670; {parentName(g)}</span>
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
                  <div className={`${listHeadCls} text-xs font-bold px-2 py-1 flex justify-between items-center shrink-0`}>
                    <span>List of Active Batches</span>
                    {/* New Number — always available (Tally shows it for outward too). */}
                    <button
                      type="button"
                      title={isInward ? "Create a new lot" : "Type a batch number to issue"}
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
                        className={`px-2 py-0.5 text-xs cursor-pointer select-none flex items-center ${panelHi === idx ? "bg-gray-200 font-semibold" : "hover:bg-gray-50"}`}
                        onClick={() => activePanelRow !== null && pickBatch(activePanelRow, b)}
                        onMouseEnter={() => setPanelHi(idx)}
                      >
                        <span className="flex-1 font-mono truncate">{b.name}</span>
                        <span className="w-16 text-center font-mono text-gray-600">{fmtDate(b.expiry_date)}</span>
                        <span className="w-14 text-right font-mono text-gray-600">
                          {b.balance ? `${b.balance}${unitSymbol ? ` ${unitSymbol}` : ""}` : ""}
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
