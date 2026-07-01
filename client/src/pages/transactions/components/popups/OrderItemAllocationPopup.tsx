import { useState, useEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import type { BatchAllocation } from "../../types";
import NewNumberPopup from "./NewNumberPopup";

// Stock Item Allocations sub-screen for order-tracking vouchers (Purchase/Sales
// Order, Receipt Note, Delivery Note). Tally layout: each allocation is a
// "Tracking No. / Order No. / Due on" header line over a Godown / Batch-Lot /
// Actual / Billed / Rate / Disc / Amount data line. Order No. + Due on appear
// only once a real Tracking No. is chosen; a "Not Applicable" tracking skips
// straight to the Godown. Strict grayscale per UI.md.

interface ActiveBatch {
  name: string;
  mfg_date: string | null;
  expiry_date: string | null;
  balance: number;
}

interface GodownOption {
  godown_id?: number;
  name: string;
}

interface Props {
  companyId: number;
  itemId: number;
  itemName: string;
  rate: number;
  unitSymbol?: string;
  voucherDate: string;        // ISO yyyy-mm-dd — default "Due on" date
  trackMfg: boolean;
  trackExpiry: boolean;
  isInward: boolean;
  godowns?: GodownOption[];
  initialAllocations?: BatchAllocation[];
  /** Show the Batch / Lot No. column (batch-tracked items only). */
  showBatch?: boolean;
  onClose: () => void;
  onSave: (allocations: BatchAllocation[]) => void;
}

const NA = "♦ Not Applicable";
const EOL = "♦ End of List";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function fmtDate(iso?: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return `${d.getDate()}-${MONTHS[d.getMonth()]}-${String(d.getFullYear()).slice(-2)}`;
}

const num = (v: number | undefined) =>
  v ? v.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "";

// Per-godown balance label — Tally shows negatives as "(-)9 Box"; blank when zero.
const fmtQty = (q: number | undefined, unit?: string) => {
  if (!q) return "";
  const u = unit || "";
  return q < 0 ? `(-)${Math.abs(q)} ${u}`.trim() : `${q} ${u}`.trim();
};

const focusSel = (sel: string) =>
  setTimeout(() => (document.querySelector(sel) as HTMLElement | null)?.focus(), 30);

// A Tracking No. is "real" (Order No. + Due on apply) when it is set and is not
// the Not Applicable / End of List sentinel.
const hasTracking = (r: BatchAllocation) =>
  !!r.tracking_no && r.tracking_no !== NA && r.tracking_no !== EOL;

export default function OrderItemAllocationPopup({
  companyId, itemId, itemName, rate, unitSymbol,
  trackMfg, trackExpiry, isInward, godowns = [], initialAllocations = [],
  showBatch = true, onClose, onSave,
}: Props) {
  const emptyRow = (): BatchAllocation => ({
    batch_number: "",
    godown: "",
    quantity: 0,
    actual_quantity: 0,
    rate,
    disc_percent: 0,
    tracking_no: "",
    order_no: "",
    due_on: "",
  });

  const [rows, setRows] = useState<BatchAllocation[]>(
    initialAllocations.length ? initialAllocations.map((a) => ({ ...a })) : [emptyRow()]
  );
  const [activeBatches, setActiveBatches] = useState<ActiveBatch[]>([]);
  const [godownBal, setGodownBal] = useState<Record<number, number>>({});
  const [openListRow, setOpenListRow] = useState<number | null>(null);
  const [openTrackRow, setOpenTrackRow] = useState<number | null>(null);
  const [openOrderRow, setOpenOrderRow] = useState<number | null>(null);
  const [openGodownRow, setOpenGodownRow] = useState<number | null>(null);
  const [newNumber, setNewNumber] = useState<{ row: number; field: "tracking" | "order" | "batch" } | null>(null);
  // Numbers created via "New Number" this session — they persist in the field's
  // list even before/after they are assigned to a row (Tally behaviour).
  const [created, setCreated] = useState<{ tracking: string[]; order: string[]; batch: string[] }>({ tracking: [], order: [], batch: [] });
  const [error, setError] = useState<string | null>(null);
  const listRefs = useRef<(HTMLDivElement | null)[]>([]);
  // Anchors for the four row-level dropdowns (Tracking/Order/Godown/Batch), each
  // portaled to <body> with fixed coordinates below — the allocations list sits
  // inside a scrollable (overflow-y-auto) body, so plain absolute dropdowns get
  // clipped by that ancestor instead of floating over the popup.
  const trackAnchorRefs = useRef<(HTMLDivElement | null)[]>([]);
  const orderAnchorRefs = useRef<(HTMLDivElement | null)[]>([]);
  const godownAnchorRefs = useRef<(HTMLDivElement | null)[]>([]);
  const trackDropdownRef = useRef<HTMLDivElement | null>(null);
  const orderDropdownRef = useRef<HTMLDivElement | null>(null);
  const godownDropdownRef = useRef<HTMLDivElement | null>(null);
  const batchDropdownRef = useRef<HTMLDivElement | null>(null);
  const [trackPos, setTrackPos] = useState<{ top: number; left: number; width: number } | null>(null);
  const [orderPos, setOrderPos] = useState<{ top: number; left: number; width: number } | null>(null);
  const [godownPos, setGodownPos] = useState<{ top: number; left: number; width: number } | null>(null);
  const [batchPos, setBatchPos] = useState<{ top: number; left: number; width: number } | null>(null);

  // Existing lots (with balances) for the "List of Active Batches".
  useEffect(() => {
    if (!companyId || !itemId) return;
    (window as any).api.report.batchBalances(companyId, itemId).then((res: any) => {
      if (res?.success) setActiveBatches(res.batches ?? []);
    }).catch(() => {});
  }, [companyId, itemId]);

  // Per-godown balances for the item — populates the "List of Godowns" balance
  // column. Only godowns that actually hold stock show a quantity.
  useEffect(() => {
    if (!companyId || !itemId) return;
    (window as any).api.stockItem.getStockBalancesByGodown({ company_id: companyId, item_id: itemId })
      .then((res: any) => { if (res?.success && res.balances) setGodownBal(res.balances); })
      .catch(() => {});
  }, [companyId, itemId]);

  // Close the batch list on an outside click. Checks the portaled dropdown ref
  // too, since it no longer lives inside the anchor's DOM subtree once portaled.
  useEffect(() => {
    if (openListRow === null) return;
    const onDown = (e: MouseEvent) => {
      const el = listRefs.current[openListRow];
      const target = e.target as Node;
      if (el && !el.contains(target) && !batchDropdownRef.current?.contains(target)) setOpenListRow(null);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [openListRow]);

  // Close the Tracking / Order / Godown dropdowns on an outside click. The
  // dropdowns are portaled to <body>, so `closest("[data-oa-dd]")` alone won't
  // catch clicks inside them — check each dropdown ref directly as well.
  useEffect(() => {
    if (openTrackRow === null && openOrderRow === null && openGodownRow === null) return;
    const onDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        !(target as HTMLElement).closest("[data-oa-dd]") &&
        !trackDropdownRef.current?.contains(target) &&
        !orderDropdownRef.current?.contains(target) &&
        !godownDropdownRef.current?.contains(target)
      ) {
        setOpenTrackRow(null);
        setOpenOrderRow(null);
        setOpenGodownRow(null);
      }
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [openTrackRow, openOrderRow, openGodownRow]);

  // Recompute the portaled dropdowns' fixed positions whenever one opens, and
  // while the popup's scrollable body (or the window) moves it.
  useEffect(() => {
    if (openTrackRow === null && openOrderRow === null && openGodownRow === null && openListRow === null) return;
    const reposition = () => {
      if (openTrackRow !== null && trackAnchorRefs.current[openTrackRow]) {
        const r = trackAnchorRefs.current[openTrackRow]!.getBoundingClientRect();
        setTrackPos({ top: r.bottom + 2, left: r.left, width: 224 });
      } else setTrackPos(null);
      if (openOrderRow !== null && orderAnchorRefs.current[openOrderRow]) {
        const r = orderAnchorRefs.current[openOrderRow]!.getBoundingClientRect();
        setOrderPos({ top: r.bottom + 2, left: r.left, width: 256 });
      } else setOrderPos(null);
      if (openGodownRow !== null && godownAnchorRefs.current[openGodownRow]) {
        const r = godownAnchorRefs.current[openGodownRow]!.getBoundingClientRect();
        setGodownPos({ top: r.bottom + 2, left: r.left, width: 256 });
      } else setGodownPos(null);
      if (openListRow !== null && listRefs.current[openListRow]) {
        const r = listRefs.current[openListRow]!.getBoundingClientRect();
        setBatchPos({ top: r.bottom + 4, left: r.left, width: 256 });
      } else setBatchPos(null);
    };
    reposition();
    window.addEventListener("scroll", reposition, true);
    window.addEventListener("resize", reposition);
    return () => {
      window.removeEventListener("scroll", reposition, true);
      window.removeEventListener("resize", reposition);
    };
  }, [openTrackRow, openOrderRow, openGodownRow, openListRow]);

  const billed = (r: BatchAllocation) => Number(r.quantity) || 0;
  const actual = (r: BatchAllocation) => Number(r.actual_quantity ?? r.quantity) || 0;
  const lineAmount = (r: BatchAllocation) =>
    billed(r) * (Number(r.rate) || 0) * (1 - (Number(r.disc_percent) || 0) / 100);

  const totalActual = rows.reduce((s, r) => s + actual(r), 0);
  const totalBilled = rows.reduce((s, r) => s + billed(r), 0);
  const totalAmount = rows.reduce((s, r) => s + lineAmount(r), 0);

  // Numbers available in each list = created-this-session + already on a row.
  // A freshly-created number stays in the list for reuse on later rows (Tally).
  const mergeNos = (fromRows: string[], fromCreated: string[]) =>
    Array.from(new Set([...fromCreated, ...fromRows]));
  const sessionTracking = mergeNos(
    rows.filter((r) => hasTracking(r)).map((r) => r.tracking_no as string),
    created.tracking
  ).map((no) => {
    const src = rows.find((r) => r.tracking_no === no);
    return { no, godown: src?.godown, balance: src ? billed(src) : 0 };
  });
  const sessionOrders = mergeNos(
    rows.filter((r) => r.order_no && r.order_no !== NA).map((r) => r.order_no as string),
    created.order
  ).map((no) => {
    const src = rows.find((r) => r.order_no === no);
    return { no, godown: src?.godown, due: src?.due_on, balance: src ? billed(src) : 0 };
  });
  const typedBatches = mergeNos(
    rows.map((r) => (r.batch_number || "").trim()).filter((n) => n && n.toLowerCase() !== "any"),
    created.batch
  ).filter((n) => !activeBatches.some((b) => b.name === n));

  const update = (i: number, patch: Partial<BatchAllocation>) => {
    setError(null);
    setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  };

  // Actual drives Billed until Billed is overridden independently.
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

  const addRow = () => { setError(null); setRows((prev) => [...prev, emptyRow()]); };
  const removeRow = (i: number) => { if (rows.length > 1) setRows((prev) => prev.filter((_, idx) => idx !== i)); };

  // Tracking No. picked → real number goes to Order No.; Not Applicable jumps
  // straight to the Godown (Order No. / Due on are hidden for that row).
  const afterTracking = (i: number, value: string) => {
    const v = value.trim();
    update(i, { tracking_no: v });
    setOpenTrackRow(null);
    // No tracking number (blank or Not Applicable) → skip Order No. / Due on and
    // go straight to the Godown; a real number → Order No.
    if (!v || v === NA) focusSel(`[data-oa-godown="${i}"]`);
    else focusSel(`[data-oa-order="${i}"]`);
  };

  // Enter on the last field (Disc) of a row: append a fresh allocation and land
  // on the NEXT row's Tracking No. — the loop restarts Tracking → Order → Due →
  // Godown → … (matches Tally's order-tracking sub-screen).
  const completeRow = (i: number) => {
    if (i === rows.length - 1) addRow();
    focusSel(`[data-oa-track="${i + 1}"]`);
  };

  const saveAllocations = useCallback((list: BatchAllocation[]) => {
    const filled = list.filter((r) => r.godown || Number(r.quantity) > 0 || (r.batch_number || "").trim());
    if (showBatch && filled.some((r) => !(r.batch_number || "").trim())) {
      setError("Every row needs a Batch / Lot No. (pick Any or a New Number).");
      return;
    }
    const sumBilled = filled.reduce((s, r) => s + (Number(r.quantity) || 0), 0);
    if (sumBilled <= 0) { setError("Enter a quantity for at least one allocation."); return; }
    onSave(filled.map((r) => ({
      batch_number: (r.batch_number || "").trim(),
      godown: r.godown || undefined,
      tracking_no: hasTracking(r) ? (r.tracking_no as string).trim() : undefined,
      order_no: r.order_no && r.order_no !== NA ? (r.order_no as string).trim() : undefined,
      due_on: hasTracking(r) ? (r.due_on || undefined) : undefined,
      mfg_date: trackMfg ? (r.mfg_date || undefined) : undefined,
      expiry_date: trackExpiry ? (r.expiry_date || undefined) : undefined,
      quantity: Number(r.quantity) || 0,
      actual_quantity: Number(r.actual_quantity ?? r.quantity) || 0,
      rate: Number(r.rate) || rate,
      disc_percent: Number(r.disc_percent) || 0,
    })));
  }, [showBatch, trackMfg, trackExpiry, rate, onSave]);

  const handleSave = useCallback(() => saveAllocations(rows), [saveAllocations, rows]);

  // "End of List" on a Tracking No. — drop that (trailing/empty) row and accept
  // the allocations entered so far; if none, just close.
  const endOfList = (i: number) => {
    setOpenTrackRow(null);
    const kept = rows.filter((_, idx) => idx !== i);
    if (!kept.some((r) => r.godown || Number(r.quantity) > 0)) { onClose(); return; }
    saveAllocations(kept);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (newNumber) return; // let the New Number popup own the keyboard
      if (e.key === "Escape") { e.preventDefault(); onClose(); }
      if (e.altKey && (e.key === "a" || e.key === "A")) { e.preventDefault(); handleSave(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, handleSave, newNumber]);

  const enter = (fn: () => void) => (e: React.KeyboardEvent) => {
    if (e.key === "Enter") { e.preventDefault(); fn(); }
  };

  const cell = "shrink-0";
  const W = {
    godown: "w-24", batch: "w-28", qty: "w-14", rate: "w-16",
    per: "w-8", disc: "w-12", amount: "w-20", del: "w-4",
  };
  const inputCls = "text-xs px-1 py-0.5 border border-zinc-300 w-full outline-none focus:border-zinc-800";
  const optNew = "block w-full text-right text-[11px] px-2 py-1 hover:bg-zinc-100 font-semibold border-b border-zinc-50";
  const optSpecial = "block w-full text-left text-[11px] px-2 py-1 hover:bg-zinc-100";

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/25 pt-10 select-none">
      <div className={`bg-white border border-black shadow-2xl ${showBatch ? "w-[720px]" : "w-[560px]"} flex flex-col max-h-[88vh]`}>
        {/* Header — centred "Item Allocations for : <item>" (Tally) */}
        <div className="relative border-b border-black px-4 py-2">
          <span className="absolute left-3 top-2 text-[9px] font-bold uppercase tracking-wider text-zinc-400">Stock Item Allocations</span>
          <button onClick={onClose} className="absolute right-3 top-1.5 text-zinc-500 hover:text-black font-bold text-sm">&times;</button>
          <div className="text-center text-sm">
            Item Allocations for : <span className="font-bold">{itemName}</span>
          </div>
        </div>

        <div className="p-4 flex-1 overflow-y-auto min-h-0 space-y-3">
          {error && (
            <div className="border border-zinc-400 text-zinc-900 text-xs px-3 py-2 flex justify-between items-center font-semibold">
              <span>• {error}</span>
              <button onClick={() => setError(null)} className="font-bold">&times;</button>
            </div>
          )}

          <div className="border border-zinc-300">
            {/* Column headers (two rows) */}
            <div className="flex bg-zinc-100 px-3 pt-1.5 text-[10px] font-bold uppercase tracking-wide text-zinc-600 gap-2">
              <div className={`${cell} ${W.godown}`}>Godown</div>
              {showBatch && <div className={`${cell} ${W.batch} text-center`}>Batch / Lot No.</div>}
              <div className={`${cell} ${W.qty} text-right`}>Actual</div>
              <div className={`${cell} ${W.qty} text-right`}>Billed</div>
              <div className={`${cell} ${W.rate} text-right`}>Rate</div>
              <div className={`${cell} ${W.per} text-center`}>per</div>
              <div className={`${cell} ${W.disc} text-right`}>Disc %</div>
              <div className={`${cell} ${W.amount} text-right`}>Amount</div>
              <div className={`${cell} ${W.del}`} />
            </div>
            <div className="flex bg-zinc-100 border-b border-zinc-300 px-3 pb-1.5 text-[9px] font-bold uppercase tracking-wide text-zinc-500 gap-2">
              <div className={`${cell} ${W.godown}`} />
              {showBatch && (
                <div className={`${cell} ${W.batch} flex gap-1`}>
                  <div className="flex-1">{trackMfg ? "Mfg Dt." : ""}</div>
                  <div className="flex-1">{trackExpiry ? "Expiry Date" : ""}</div>
                </div>
              )}
              <div className={`${cell} ${W.qty}`} />
              <div className={`${cell} ${W.qty}`} />
              <div className={`${cell} ${W.rate}`} />
              <div className={`${cell} ${W.per}`} />
              <div className={`${cell} ${W.disc}`} />
              <div className={`${cell} ${W.amount}`} />
              <div className={`${cell} ${W.del}`} />
            </div>

            {/* Allocations — Tracking/Order/Due header line + data line */}
            <div>
              {rows.map((row, i) => {
                const showOrder = hasTracking(row);
                return (
                  <div key={i} className="border-b border-zinc-100">
                    {/* Tracking No. / Order No. / Due on */}
                    <div className="flex items-center px-3 pt-1.5 gap-2 text-[11px]">
                      <span className="italic text-zinc-600 shrink-0">Tracking No. :</span>
                      <div data-oa-dd className="relative shrink-0" ref={(el) => { trackAnchorRefs.current[i] = el; }}>
                        <input
                          type="text"
                          data-oa-track={i}
                          autoFocus={i === 0}
                          value={row.tracking_no ?? ""}
                          onFocus={() => { setOpenTrackRow(i); setOpenOrderRow(null); setOpenGodownRow(null); }}
                          onChange={(e) => update(i, { tracking_no: e.target.value })}
                          onKeyDown={enter(() => afterTracking(i, (row.tracking_no || "").trim()))}
                          placeholder="New Number…"
                          className="w-28 text-[11px] px-1 py-0.5 border border-zinc-300 outline-none focus:border-zinc-800 font-mono bg-yellow-50"
                        />
                        {openTrackRow === i && trackPos && createPortal(
                          <div
                            ref={trackDropdownRef}
                            style={{ position: "fixed", top: trackPos.top, left: trackPos.left, width: trackPos.width }}
                            className="bg-white border border-zinc-400 shadow-xl z-[60] max-h-52 overflow-y-auto"
                          >
                            <div className="bg-zinc-900 text-white text-[10px] font-bold px-2 py-0.5">List of Tracking Numbers</div>
                            <div className="flex bg-zinc-100 text-[9px] font-bold text-zinc-600 px-2 py-0.5 border-b border-zinc-200">
                              <div className="flex-1">Number</div><div className="w-16">Godown</div><div className="w-12 text-right">Balance</div>
                            </div>
                            <button type="button" onMouseDown={(e) => { e.preventDefault(); endOfList(i); }} className={optSpecial + " border-b border-zinc-50"}>{EOL}</button>
                            <button type="button" onMouseDown={(e) => { e.preventDefault(); afterTracking(i, NA); }} className={optSpecial + " border-b border-zinc-50"}>{NA}</button>
                            <button type="button" onMouseDown={(e) => { e.preventDefault(); setOpenTrackRow(null); setNewNumber({ row: i, field: "tracking" }); }} className={optNew}>New Number</button>
                            {sessionTracking.filter((t) => t.no !== row.tracking_no).map((t) => (
                              <button key={t.no} type="button" onMouseDown={(e) => { e.preventDefault(); afterTracking(i, t.no); }} className="flex w-full text-left text-[11px] px-2 py-1 hover:bg-zinc-100 border-b border-zinc-50">
                                <div className="flex-1 font-semibold">{t.no}</div><div className="w-16 truncate">{t.godown}</div><div className="w-12 text-right font-mono">{t.balance || ""}</div>
                              </button>
                            ))}
                          </div>,
                          document.body
                        )}
                      </div>

                      {showOrder && (
                        <>
                          <span className="italic text-zinc-600 shrink-0 ml-3">Order No.:</span>
                          <div data-oa-dd className="relative shrink-0" ref={(el) => { orderAnchorRefs.current[i] = el; }}>
                            <input
                              type="text"
                              data-oa-order={i}
                              value={row.order_no ?? ""}
                              onFocus={() => { setOpenOrderRow(i); setOpenTrackRow(null); setOpenGodownRow(null); }}
                              onChange={(e) => update(i, { order_no: e.target.value })}
                              onKeyDown={enter(() => { setOpenOrderRow(null); focusSel(`[data-oa-due="${i}"]`); })}
                              placeholder="New Number…"
                              className="w-24 text-[11px] px-1 py-0.5 border border-zinc-300 outline-none focus:border-zinc-800 font-mono"
                            />
                            {openOrderRow === i && orderPos && createPortal(
                              <div
                                ref={orderDropdownRef}
                                style={{ position: "fixed", top: orderPos.top, left: orderPos.left, width: orderPos.width }}
                                className="bg-white border border-zinc-400 shadow-xl z-[60] max-h-52 overflow-y-auto"
                              >
                                <div className="bg-zinc-900 text-white text-[10px] font-bold px-2 py-0.5">List of Orders</div>
                                <div className="flex bg-zinc-100 text-[9px] font-bold text-zinc-600 px-2 py-0.5 border-b border-zinc-200">
                                  <div className="flex-1">Order No.</div><div className="w-14">Godown</div><div className="w-14">Due On</div><div className="w-12 text-right">Balance</div>
                                </div>
                                <button type="button" onMouseDown={(e) => { e.preventDefault(); update(i, { order_no: NA }); setOpenOrderRow(null); focusSel(`[data-oa-due="${i}"]`); }} className={optSpecial + " border-b border-zinc-50"}>{NA}</button>
                                <button type="button" onMouseDown={(e) => { e.preventDefault(); setOpenOrderRow(null); setNewNumber({ row: i, field: "order" }); }} className={optNew}>New Number</button>
                                {sessionOrders.filter((o) => o.no !== row.order_no).map((o) => (
                                  <button key={o.no} type="button" onMouseDown={(e) => { e.preventDefault(); update(i, { order_no: o.no }); setOpenOrderRow(null); focusSel(`[data-oa-due="${i}"]`); }} className="flex w-full text-left text-[11px] px-2 py-1 hover:bg-zinc-100 border-b border-zinc-50">
                                    <div className="flex-1 font-semibold">{o.no}</div><div className="w-14 truncate">{o.godown}</div><div className="w-14">{o.due}</div><div className="w-12 text-right font-mono">{o.balance || ""}</div>
                                  </button>
                                ))}
                              </div>,
                              document.body
                            )}
                          </div>

                          <span className="italic text-zinc-600 shrink-0 ml-3">Due on</span>
                          <input
                            type="text"
                            data-oa-due={i}
                            value={row.due_on ?? ""}
                            onChange={(e) => update(i, { due_on: e.target.value })}
                            onKeyDown={enter(() => focusSel(`[data-oa-godown="${i}"]`))}
                            placeholder="2-Apr-27 / 500 Days / 2 Years"
                            className="w-40 text-[11px] px-1 py-0.5 border border-zinc-300 outline-none focus:border-zinc-800 font-mono"
                          />
                        </>
                      )}
                    </div>

                    {/* Data line */}
                    <div className="flex items-start px-3 py-1.5 gap-2">
                      {/* Godown — opens the "List of Godowns" panel */}
                      <div data-oa-dd className={`${cell} ${W.godown} relative`} ref={(el) => { godownAnchorRefs.current[i] = el; }}>
                        <input
                          type="text" data-oa-godown={i}
                          value={row.godown ?? ""}
                          onFocus={() => { setOpenGodownRow(i); setOpenTrackRow(null); setOpenOrderRow(null); }}
                          onChange={(e) => update(i, { godown: e.target.value })}
                          onKeyDown={enter(() => { setOpenGodownRow(null); focusSel(showBatch ? `[data-oa-batch="${i}"]` : `[data-oa-actual="${i}"]`); })}
                          placeholder="Location" className={inputCls}
                        />
                        {openGodownRow === i && godownPos && createPortal(
                          <div
                            ref={godownDropdownRef}
                            style={{ position: "fixed", top: godownPos.top, left: godownPos.left, width: godownPos.width }}
                            className="bg-white border border-zinc-400 shadow-xl z-[60] max-h-56 overflow-y-auto"
                          >
                            <div className="bg-zinc-900 text-white text-[10px] font-bold px-2 py-0.5 flex justify-between">
                              <span>List of Godowns</span>
                              <span className="opacity-70">Create</span>
                            </div>
                            {godowns.map((g) => (
                              <button key={g.godown_id ?? g.name} type="button"
                                onMouseDown={(e) => { e.preventDefault(); update(i, { godown: g.name }); setOpenGodownRow(null); focusSel(showBatch ? `[data-oa-batch="${i}"]` : `[data-oa-actual="${i}"]`); }}
                                className="flex w-full items-center text-left text-[11px] px-2 py-1 hover:bg-zinc-100 border-b border-zinc-50">
                                <div className="flex-1 font-semibold">{g.name}</div>
                                <div className="w-16 italic text-zinc-500">&#9670; Primary</div>
                                <div className="w-14 text-right font-mono text-zinc-600">{fmtQty(g.godown_id != null ? godownBal[g.godown_id] : undefined, unitSymbol)}</div>
                              </button>
                            ))}
                          </div>,
                          document.body
                        )}
                      </div>

                      {/* Batch / Lot No. (+ Mfg / Expiry stacked) */}
                      {showBatch && (
                        <div className={`${cell} ${W.batch} relative`} ref={(el) => { listRefs.current[i] = el; }}>
                          <input
                            type="text" data-oa-batch={i}
                            value={row.batch_number}
                            onChange={(e) => update(i, { batch_number: e.target.value })}
                            onFocus={() => setOpenListRow(i)}
                            onKeyDown={enter(() => { setOpenListRow(null); focusSel(`[data-oa-actual="${i}"]`); })}
                            placeholder="Any / New Number…"
                            className={`${inputCls} font-semibold`}
                          />
                          {(trackMfg || trackExpiry) && (
                            <div className="flex gap-1 mt-1">
                              <div className="flex-1">
                                {trackMfg && (
                                  <input type="date" value={row.mfg_date ?? ""}
                                    onChange={(e) => update(i, { mfg_date: e.target.value })}
                                    className={`${inputCls} font-mono`} />
                                )}
                              </div>
                              <div className="flex-1">
                                {trackExpiry && (
                                  <input type="date" value={row.expiry_date ?? ""}
                                    onChange={(e) => update(i, { expiry_date: e.target.value })}
                                    className={`${inputCls} font-mono`} />
                                )}
                              </div>
                            </div>
                          )}
                          {openListRow === i && batchPos && createPortal(
                            <div
                              ref={batchDropdownRef}
                              style={{ position: "fixed", top: batchPos.top, left: batchPos.left, width: batchPos.width }}
                              className="bg-white border border-zinc-400 shadow-xl z-[60] max-h-44 overflow-y-auto"
                            >
                              <div className="bg-zinc-900 text-white text-[10px] font-bold px-2 py-1 sticky top-0">List of Active Batches</div>
                              <div className="flex bg-zinc-100 text-[9px] font-bold text-zinc-600 px-2 py-1 border-b border-zinc-200">
                                <div className="flex-1">Name</div>
                                <div className="w-16">Expiry</div>
                                <div className="w-14 text-right">Balance</div>
                              </div>
                              {/* New Number — opens the New Number popup (inward only). */}
                              {isInward && (
                                <button type="button"
                                  onMouseDown={(e) => { e.preventDefault(); setOpenListRow(null); setNewNumber({ row: i, field: "batch" }); }}
                                  className="flex w-full justify-end text-[11px] px-2 py-1 hover:bg-zinc-100 border-b border-zinc-50 font-semibold">
                                  New Number
                                </button>
                              )}
                              {/* Any — no specific lot. */}
                              <button type="button"
                                onMouseDown={(e) => { e.preventDefault(); update(i, { batch_number: "Any" }); setOpenListRow(null); focusSel(`[data-oa-actual="${i}"]`); }}
                                className="flex w-full text-left text-[11px] px-2 py-1 hover:bg-zinc-100 border-b border-zinc-50">
                                <div className="flex-1 font-semibold">&#9670; Any</div>
                              </button>
                              {activeBatches.map((b) => (
                                <button key={b.name} type="button"
                                  onMouseDown={(e) => { e.preventDefault(); update(i, { batch_number: b.name, mfg_date: b.mfg_date ?? undefined, expiry_date: b.expiry_date ?? undefined }); setOpenListRow(null); focusSel(`[data-oa-actual="${i}"]`); }}
                                  className="flex w-full text-left text-[11px] px-2 py-1 hover:bg-zinc-100 border-b border-zinc-50">
                                  <div className="flex-1 font-semibold">{b.name}</div>
                                  <div className="w-16 font-mono">{fmtDate(b.expiry_date)}</div>
                                  <div className="w-14 text-right font-mono">{b.balance}</div>
                                </button>
                              ))}
                              {/* Lots created this session (New Number) show up too. */}
                              {typedBatches.map((n) => (
                                <button key={`t-${n}`} type="button"
                                  onMouseDown={(e) => { e.preventDefault(); update(i, { batch_number: n }); setOpenListRow(null); focusSel(`[data-oa-actual="${i}"]`); }}
                                  className="flex w-full text-left text-[11px] px-2 py-1 hover:bg-zinc-100 border-b border-zinc-50">
                                  <div className="flex-1 font-semibold">{n}</div>
                                </button>
                              ))}
                            </div>,
                            document.body
                          )}
                        </div>
                      )}

                      {/* Actual */}
                      <div className={`${cell} ${W.qty}`}>
                        <input type="number" step="any" data-oa-actual={i}
                          value={row.actual_quantity || ""}
                          onChange={(e) => setActual(i, Number(e.target.value) || 0)}
                          onKeyDown={enter(() => focusSel(`[data-oa-billed="${i}"]`))}
                          className={`${inputCls} text-right font-mono`} />
                      </div>
                      {/* Billed */}
                      <div className={`${cell} ${W.qty}`}>
                        <input type="number" step="any" data-oa-billed={i}
                          value={row.quantity || ""}
                          onChange={(e) => update(i, { quantity: Number(e.target.value) || 0 })}
                          onKeyDown={enter(() => focusSel(`[data-oa-rate="${i}"]`))}
                          className={`${inputCls} text-right font-mono`} />
                      </div>
                      {/* Rate */}
                      <div className={`${cell} ${W.rate}`}>
                        <input type="number" step="any" data-oa-rate={i}
                          value={row.rate || ""}
                          onChange={(e) => update(i, { rate: Number(e.target.value) || 0 })}
                          onKeyDown={enter(() => focusSel(`[data-oa-disc="${i}"]`))}
                          className={`${inputCls} text-right font-mono`} />
                      </div>
                      {/* per */}
                      <div className={`${cell} ${W.per} text-center text-[11px] text-zinc-600 pt-1 font-mono`}>{unitSymbol ?? ""}</div>
                      {/* Disc % — Enter completes the row and starts the next allocation. */}
                      <div className={`${cell} ${W.disc}`}>
                        <input type="number" step="any" data-oa-disc={i}
                          value={row.disc_percent || ""}
                          onChange={(e) => update(i, { disc_percent: Number(e.target.value) || 0 })}
                          onKeyDown={enter(() => completeRow(i))}
                          className={`${inputCls} text-right font-mono`} />
                      </div>
                      {/* Amount */}
                      <div className={`${cell} ${W.amount} text-right text-xs font-mono font-semibold pt-1`}>{num(lineAmount(row))}</div>
                      {/* Remove */}
                      <div className={`${cell} ${W.del} text-center pt-0.5`}>
                        <button type="button" onClick={() => removeRow(i)} className="text-zinc-400 hover:text-zinc-900 text-sm font-bold">&times;</button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Totals */}
            <div className="flex items-center px-3 py-2 bg-zinc-100 border-t-2 border-zinc-300 gap-2 font-bold text-xs font-mono">
              <div className={`${cell} ${W.godown}`} />
              {showBatch && <div className={`${cell} ${W.batch}`} />}
              <div className={`${cell} ${W.qty} text-right`}>{totalActual || ""}</div>
              <div className={`${cell} ${W.qty} text-right`}>{totalBilled || ""}</div>
              <div className={`${cell} ${W.rate}`} />
              <div className={`${cell} ${W.per}`} />
              <div className={`${cell} ${W.disc}`} />
              <div className={`${cell} ${W.amount} text-right`}>{num(totalAmount)}</div>
              <div className={`${cell} ${W.del}`} />
            </div>
          </div>

          <div className="flex justify-between items-center">
            <button onClick={addRow}
              className="text-[10px] uppercase tracking-wide font-bold text-zinc-600 hover:text-zinc-900 border border-zinc-300 px-2.5 py-1 hover:bg-zinc-50">
              + Add Allocation
            </button>
            <span className="text-xs font-mono font-semibold text-zinc-900">Total: {totalBilled} {unitSymbol ?? ""}</span>
          </div>
        </div>

        <div className="border-t border-zinc-200 p-3 bg-zinc-50 flex justify-between items-center">
          <span className="text-[10px] text-zinc-500">Alt+A: Accept · Esc: Close</span>
          <div className="flex gap-2">
            <button onClick={onClose} className="text-xs px-3 py-1.5 border border-zinc-300 text-zinc-700 bg-white hover:bg-zinc-100 font-semibold">Cancel</button>
            <button onClick={handleSave} className="text-xs px-5 py-1.5 bg-zinc-900 text-white hover:bg-zinc-700 font-semibold">Accept</button>
          </div>
        </div>
      </div>

      {newNumber && (
        <NewNumberPopup
          title={newNumber.field === "order" ? "New Order Number" : newNumber.field === "batch" ? "New Batch / Lot Number" : "New Tracking Number"}
          label={newNumber.field === "order" ? "Order No." : newNumber.field === "batch" ? "Batch / Lot No." : "Tracking No."}
          onClose={() => setNewNumber(null)}
          onConfirm={(value) => {
            const { row, field } = newNumber;
            setNewNumber(null);
            setCreated((c) => (c[field].includes(value) ? c : { ...c, [field]: [...c[field], value] }));
            if (field === "tracking") { update(row, { tracking_no: value }); focusSel(`[data-oa-order="${row}"]`); }
            else if (field === "order") { update(row, { order_no: value }); focusSel(`[data-oa-due="${row}"]`); }
            else { update(row, { batch_number: value }); focusSel(`[data-oa-actual="${row}"]`); }
          }}
        />
      )}
    </div>
  );
}
