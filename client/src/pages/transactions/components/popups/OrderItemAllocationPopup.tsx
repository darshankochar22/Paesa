import { useState, useEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import type { BatchAllocation } from "../../types";
import NewNumberPopup from "./NewNumberPopup";
import { VoucherPopupShell } from "@/components/tally-ui/VoucherPopupShell";
import { parseDueOn, toLocalIsoDate } from "@/lib/dueDate";

// Saved allocation — BatchAllocation plus the resolved ISO due date (additive).
type SavedAllocation = BatchAllocation & { due_on_date?: string };

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
  rate?: number;
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
  Number.isFinite(v)
    ? (v as number).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : "";

// Free-text expiry parsing — same behaviour as BatchAllocationPopup: an actual
// date, or a duration ("2 years", "6 months", "30 days") relative to baseIso.
function parseExpiry(input: string, baseIso: string): string {
  const raw = (input || "").trim();
  if (!raw) return "";
  const direct = new Date(raw);
  if (!isNaN(direct.getTime()) && /\d{4}|[A-Za-z]{3}/.test(raw) && !/year|month|day|yr|mo|wk|week/i.test(raw)) {
    return toLocalIsoDate(direct);
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
    return toLocalIsoDate(base);
  }
  return "";
}

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
  companyId, itemId, itemName, rate, unitSymbol, voucherDate,
  trackMfg, trackExpiry, isInward, godowns = [], initialAllocations = [],
  showBatch = true, onClose, onSave,
}: Props) {
  const emptyRow = (): BatchAllocation => ({
    batch_number: "",
    godown: "",
    quantity: undefined,
    actual_quantity: undefined,
    rate,
    disc_percent: undefined,
    tracking_no: "",
    order_no: "",
    due_on: "",
  });

  const [rows, setRows] = useState<BatchAllocation[]>(
    initialAllocations.length ? initialAllocations.map((a) => ({ ...a })) : [emptyRow()]
  );
  const [activeBatches, setActiveBatches] = useState<ActiveBatch[]>([]);
  const [fetchedTracking, setFetchedTracking] = useState<TrackingOption[]>([]);
  const [fetchedOrders, setFetchedOrders] = useState<OrderOption[]>([]);
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

  // Outstanding tracking numbers (Delivery/Receipt Notes awaiting invoice) for
  // this item — real balances for the "List of Tracking Numbers" dropdown.
  useEffect(() => {
    if (!companyId || !itemId) return;
    (window as any).api.report.trackingNumbers?.(companyId, itemId).then((res: any) => {
      if (res?.success) setFetchedTracking(res.trackingNumbers ?? []);
    }).catch(() => {});
  }, [companyId, itemId]);

  // Outstanding order numbers for this item — "List of Orders" dropdown.
  useEffect(() => {
    if (!companyId || !itemId) return;
    (window as any).api.report.orderNumbers?.(companyId, itemId).then((res: any) => {
      if (res?.success) setFetchedOrders(res.orders ?? []);
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

  // Numbers available in each list = fetched from the backend (with their real
  // outstanding balances) + created-this-session / already on a row (no
  // balance — they aren't booked yet). A freshly-created number stays in the
  // list for reuse on later rows (Tally).
  const mergeNos = (fromRows: string[], fromCreated: string[]) =>
    Array.from(new Set([...fromCreated, ...fromRows]));
  const sessionTracking: { no: string; godown?: string; balance?: number }[] = [
    ...fetchedTracking.map((t) => ({ no: t.name, godown: t.godown ?? undefined, balance: t.balance })),
    ...mergeNos(
      rows.filter((r) => hasTracking(r)).map((r) => r.tracking_no as string),
      created.tracking
    )
      .filter((no) => !fetchedTracking.some((t) => t.name === no))
      .map((no) => ({ no, godown: rows.find((r) => r.tracking_no === no)?.godown, balance: undefined })),
  ];
  const sessionOrders: { no: string; godown?: string; due?: string; balance?: number; rate?: number }[] = [
    ...fetchedOrders.map((o) => ({ no: o.name, godown: o.godown ?? undefined, due: o.due_on ?? undefined, balance: o.balance, rate: o.rate })),
    ...mergeNos(
      rows.filter((r) => r.order_no && r.order_no !== NA).map((r) => r.order_no as string),
      created.order
    )
      .filter((no) => !fetchedOrders.some((o) => o.name === no))
      .map((no) => {
        const src = rows.find((r) => r.order_no === no);
        return { no, godown: src?.godown, due: src?.due_on, balance: undefined };
      }),
  ];
  const typedBatches = mergeNos(
    rows.map((r) => (r.batch_number || "").trim()).filter((n) => n && n.toLowerCase() !== "any"),
    created.batch
  ).filter((n) => !activeBatches.some((b) => b.name === n));

  const update = (i: number, patch: Partial<BatchAllocation>) => {
    setError(null);
    setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  };

  // Number inputs: "" clears the field (undefined) so a typed 0 stays a visible 0.
  const numVal = (s: string): number | undefined => (s === "" ? undefined : Number(s));

  // Actual drives Billed until Billed is overridden independently.
  const setActual = (i: number, v: number | undefined) => {
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
  // A tracked number (from a saved Receipt/Delivery Note) autofills the row's
  // godown / quantity / rate from that note — all still editable.
  const afterTracking = (i: number, value: string) => {
    const v = value.trim();
    const t = fetchedTracking.find((x) => x.name === v);
    update(i, {
      tracking_no: v,
      ...(t?.godown ? { godown: t.godown } : {}),
      ...(t?.balance ? { quantity: t.balance, actual_quantity: t.balance } : {}),
      ...(t?.rate ? { rate: t.rate } : {}),
    });
    setOpenTrackRow(null);
    // Order No. / Due on are always available (a note can be order-tracked
    // without a tracking number) — Enter lands on Order No. either way.
    focusSel(`[data-oa-order="${i}"]`);
  };

  // Order No. picked from the list → autofill godown / due-on / quantity / rate
  // from the saved order voucher (Tally behaviour); everything stays editable.
  const selectOrder = (i: number, o: { no: string; godown?: string; due?: string; balance?: number; rate?: number }) => {
    update(i, {
      order_no: o.no,
      ...(o.godown ? { godown: o.godown } : {}),
      ...(o.due ? { due_on: o.due } : {}),
      ...(o.balance ? { quantity: o.balance, actual_quantity: o.balance } : {}),
      ...(o.rate ? { rate: o.rate } : {}),
    });
    setOpenOrderRow(null);
    focusSel(`[data-oa-due="${i}"]`);
  };

  // Enter on the last field (Disc) of a row: append a fresh allocation and land
  // on the NEXT row's Tracking No. — the loop restarts Tracking → Order → Due →
  // Godown → … (matches Tally's order-tracking sub-screen).
  const completeRow = (i: number) => {
    if (i === rows.length - 1) addRow();
    focusSel(`[data-oa-track="${i + 1}"]`);
  };

  const saveAllocations = useCallback((list: BatchAllocation[]) => {
    const isFilled = (r: BatchAllocation) =>
      !!(r.godown || Number(r.quantity) > 0 || (r.batch_number || "").trim());
    // A row with only Rate / Disc typed would be dropped silently — surface it
    // instead so the user can complete or clear it.
    const orphaned = list
      .map((r, idx) => ({ r, idx }))
      .filter(({ r }) =>
        !isFilled(r) &&
        ((Number(r.disc_percent) || 0) !== 0 ||
          (Number.isFinite(Number(r.rate)) && Number(r.rate) !== rate)));
    if (orphaned.length) {
      const nums = orphaned.map(({ idx }) => idx + 1).join(", ");
      setError(`Row${orphaned.length > 1 ? "s" : ""} ${nums} ha${orphaned.length > 1 ? "ve" : "s"} only Rate / Disc filled — add a quantity or godown, or clear the row.`);
      return;
    }
    const filled = list.filter(isFilled);
    if (showBatch && filled.some((r) => !(r.batch_number || "").trim())) {
      setError("Every row needs a Batch / Lot No. (pick Any or a New Number).");
      return;
    }
    const sumBilled = filled.reduce((s, r) => s + (Number(r.quantity) || 0), 0);
    if (sumBilled <= 0) { setError("Enter a quantity for at least one allocation."); return; }
    const baseDate = voucherDate || toLocalIsoDate(new Date());
    onSave(filled.map((r): SavedAllocation => {
      const hasOrder = !!(r.order_no && r.order_no !== NA);
      // Due-on applies whenever the row is order-tracked in either direction.
      const due = (hasTracking(r) || hasOrder) ? ((r.due_on || "").trim() || undefined) : undefined;
      return {
        batch_number: (r.batch_number || "").trim(),
        godown: r.godown || undefined,
        tracking_no: hasTracking(r) ? (r.tracking_no as string).trim() : undefined,
        order_no: hasOrder ? (r.order_no as string).trim() : undefined,
        due_on: due,
        due_on_date: due ? (parseDueOn(due, baseDate) ?? undefined) : undefined,
        mfg_date: trackMfg ? (r.mfg_date || undefined) : undefined,
        expiry_date: trackExpiry ? (r.expiry_date || undefined) : undefined,
        quantity: Number(r.quantity) || 0,
        actual_quantity: Number(r.actual_quantity ?? r.quantity) || 0,
        rate: Number.isFinite(Number(r.rate)) ? Number(r.rate) : rate,
        disc_percent: Number.isFinite(Number(r.disc_percent)) ? Number(r.disc_percent) : 0,
      };
    }));
  }, [showBatch, trackMfg, trackExpiry, rate, onSave, voucherDate]);

  const handleSave = useCallback(() => saveAllocations(rows), [saveAllocations, rows]);

  // "End of List" on a Tracking No. — accept the allocations entered so far.
  // Only a genuinely EMPTY row is dropped; a row with data keeps it (the
  // dropdown just closes and the row is saved with the rest).
  const endOfList = (i: number) => {
    setOpenTrackRow(null);
    const r = rows[i];
    const rowFilled = !!(r && (
      r.godown || Number(r.quantity) > 0 || (r.batch_number || "").trim() ||
      hasTracking(r) || (r.order_no && r.order_no !== NA)));
    const kept = rowFilled ? rows : rows.filter((_, idx) => idx !== i);
    if (!kept.some((x) => x.godown || Number(x.quantity) > 0)) { onClose(); return; }
    saveAllocations(kept);
  };

  // Esc / Alt+A are handled by VoucherPopupShell; these wrappers keep the old
  // guard — the New Number popup owns the keyboard while it is open.
  const guardedClose = () => { if (newNumber) return; onClose(); };
  const guardedAccept = () => { if (newNumber) return; handleSave(); };

  const enter = (fn: () => void) => (e: React.KeyboardEvent) => {
    if (e.key === "Enter") { e.preventDefault(); fn(); }
  };

  const cell = "shrink-0";
  const W = {
    godown: "w-24", batch: "w-28", qty: "w-14", rate: "w-16",
    per: "w-8", disc: "w-12", amount: "w-20", del: "w-4",
  };
  const inputCls = "text-xs px-1 py-0.5 border border-gray-400 bg-white w-full outline-none focus:border-black";
  const smallInputCls = "text-[11px] px-1 py-0.5 border border-gray-400 bg-white outline-none focus:border-black font-mono";
  const listHeadCls = "bg-white text-black font-bold border-b border-gray-300";
  const optNew = "block w-full text-right text-[11px] px-2 py-1 hover:bg-gray-100 font-semibold border-b border-gray-100";
  const optSpecial = "block w-full text-left text-[11px] px-2 py-1 hover:bg-gray-100";

  return (
    <>
      <VoucherPopupShell
        title="Stock Item Allocations"
        headerRight={
          <span>Item Allocations for : <span className="font-bold text-black">{itemName}</span></span>
        }
        onClose={guardedClose}
        onAccept={guardedAccept}
      >
        <div className="space-y-3">
          {error && (
            <div className="border border-gray-400 text-black text-xs px-3 py-2 flex justify-between items-center font-semibold">
              <span>• {error}</span>
              <button onClick={() => setError(null)} className="font-bold">&times;</button>
            </div>
          )}

          <div className="border border-gray-300">
            {/* Column headers (two rows) */}
            <div className="flex px-3 pt-1.5 text-[10px] font-bold uppercase tracking-wide text-gray-700 gap-2">
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
            <div className="flex border-b border-gray-300 px-3 pb-1.5 text-[9px] font-bold uppercase tracking-wide text-gray-500 gap-2">
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
                // Order No. / Due on always show — order tracking works with or
                // without a tracking number (Tally shows both side by side).
                const showOrder = true;
                const baseIso = (trackMfg && row.mfg_date) ? row.mfg_date : voucherDate;
                return (
                  <div key={i} className="border-b border-gray-200">
                    {/* Tracking No. / Order No. / Due on */}
                    <div className="flex items-center px-3 pt-1.5 gap-2 text-[11px]">
                      <span className="italic text-gray-600 shrink-0">Tracking No. :</span>
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
                          className={`w-28 ${smallInputCls}`}
                        />
                        {openTrackRow === i && trackPos && createPortal(
                          <div
                            ref={trackDropdownRef}
                            style={{ position: "fixed", top: trackPos.top, left: trackPos.left, width: trackPos.width }}
                            className="bg-white border border-gray-400 shadow-xl z-[60] max-h-52 overflow-y-auto"
                          >
                            <div className={`${listHeadCls} text-[10px] px-2 py-0.5`}>List of Tracking Numbers</div>
                            <div className="flex text-[9px] font-bold text-gray-600 px-2 py-0.5 border-b border-gray-200">
                              <div className="flex-1">Number</div><div className="w-16">Godown</div><div className="w-12 text-right">Balance</div>
                            </div>
                            <button type="button" onMouseDown={(e) => { e.preventDefault(); endOfList(i); }} className={optSpecial + " border-b border-gray-100"}>{EOL}</button>
                            <button type="button" onMouseDown={(e) => { e.preventDefault(); afterTracking(i, NA); }} className={optSpecial + " border-b border-gray-100"}>{NA}</button>
                            <button type="button" onMouseDown={(e) => { e.preventDefault(); setOpenTrackRow(null); setNewNumber({ row: i, field: "tracking" }); }} className={optNew}>New Number</button>
                            {sessionTracking.filter((t) => t.no !== row.tracking_no).map((t) => (
                              <button key={t.no} type="button" onMouseDown={(e) => { e.preventDefault(); afterTracking(i, t.no); }} className="flex w-full text-left text-[11px] px-2 py-1 hover:bg-gray-100 border-b border-gray-100">
                                <div className="flex-1 font-semibold">{t.no}</div><div className="w-16 truncate">{t.godown}</div><div className="w-12 text-right font-mono">{t.balance || ""}</div>
                              </button>
                            ))}
                          </div>,
                          document.body
                        )}
                      </div>

                      {showOrder && (
                        <>
                          <span className="italic text-gray-600 shrink-0 ml-3">Order No.:</span>
                          <div data-oa-dd className="relative shrink-0" ref={(el) => { orderAnchorRefs.current[i] = el; }}>
                            <input
                              type="text"
                              data-oa-order={i}
                              value={row.order_no ?? ""}
                              onFocus={() => { setOpenOrderRow(i); setOpenTrackRow(null); setOpenGodownRow(null); }}
                              onChange={(e) => update(i, { order_no: e.target.value })}
                              onKeyDown={enter(() => { setOpenOrderRow(null); focusSel(`[data-oa-due="${i}"]`); })}
                              placeholder="New Number…"
                              className={`w-24 ${smallInputCls}`}
                            />
                            {openOrderRow === i && orderPos && createPortal(
                              <div
                                ref={orderDropdownRef}
                                style={{ position: "fixed", top: orderPos.top, left: orderPos.left, width: orderPos.width }}
                                className="bg-white border border-gray-400 shadow-xl z-[60] max-h-52 overflow-y-auto"
                              >
                                <div className={`${listHeadCls} text-[10px] px-2 py-0.5`}>List of Orders</div>
                                <div className="flex text-[9px] font-bold text-gray-600 px-2 py-0.5 border-b border-gray-200">
                                  <div className="flex-1">Order No.</div><div className="w-14">Godown</div><div className="w-14">Due On</div><div className="w-12 text-right">Balance</div>
                                </div>
                                <button type="button" onMouseDown={(e) => { e.preventDefault(); update(i, { order_no: NA }); setOpenOrderRow(null); focusSel(`[data-oa-due="${i}"]`); }} className={optSpecial + " border-b border-gray-100"}>{NA}</button>
                                <button type="button" onMouseDown={(e) => { e.preventDefault(); setOpenOrderRow(null); setNewNumber({ row: i, field: "order" }); }} className={optNew}>New Number</button>
                                {sessionOrders.filter((o) => o.no !== row.order_no).map((o) => (
                                  <button key={o.no} type="button" onMouseDown={(e) => { e.preventDefault(); selectOrder(i, o); }} className="flex w-full text-left text-[11px] px-2 py-1 hover:bg-gray-100 border-b border-gray-100">
                                    <div className="flex-1 font-semibold">{o.no}</div><div className="w-14 truncate">{o.godown}</div><div className="w-14 truncate">{fmtDate(o.due)}</div><div className="w-12 text-right font-mono">{o.balance || ""}</div>
                                  </button>
                                ))}
                              </div>,
                              document.body
                            )}
                          </div>

                          <span className="italic text-gray-600 shrink-0 ml-3">Due on</span>
                          <input
                            type="text"
                            data-oa-due={i}
                            value={row.due_on ?? ""}
                            onChange={(e) => update(i, { due_on: e.target.value })}
                            onKeyDown={enter(() => focusSel(`[data-oa-godown="${i}"]`))}
                            placeholder="2-Apr-27 / 500 Days / 2 Years"
                            className={`w-40 ${smallInputCls}`}
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
                            className="bg-white border border-gray-400 shadow-xl z-[60] max-h-56 overflow-y-auto"
                          >
                            <div className={`${listHeadCls} text-[10px] px-2 py-0.5`}>
                              List of Godowns
                            </div>
                            {godowns.map((g) => (
                              <button key={g.godown_id ?? g.name} type="button"
                                onMouseDown={(e) => { e.preventDefault(); update(i, { godown: g.name }); setOpenGodownRow(null); focusSel(showBatch ? `[data-oa-batch="${i}"]` : `[data-oa-actual="${i}"]`); }}
                                className="flex w-full items-center text-left text-[11px] px-2 py-1 hover:bg-gray-100 border-b border-gray-100">
                                <div className="flex-1 font-semibold">{g.name}</div>
                                <div className="w-14 text-right font-mono text-gray-600">{fmtQty(g.godown_id != null ? godownBal[g.godown_id] : undefined, unitSymbol)}</div>
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
                          {openListRow === i && batchPos && createPortal(
                            <div
                              ref={batchDropdownRef}
                              style={{ position: "fixed", top: batchPos.top, left: batchPos.left, width: batchPos.width }}
                              className="bg-white border border-gray-400 shadow-xl z-[60] max-h-44 overflow-y-auto"
                            >
                              <div className={`${listHeadCls} text-[10px] px-2 py-1 sticky top-0`}>List of Active Batches</div>
                              <div className="flex text-[9px] font-bold text-gray-600 px-2 py-1 border-b border-gray-200">
                                <div className="flex-1">Name</div>
                                <div className="w-16">Expiry</div>
                                <div className="w-14 text-right">Balance</div>
                              </div>
                              {/* New Number — opens the New Number popup (inward only). */}
                              {isInward && (
                                <button type="button"
                                  onMouseDown={(e) => { e.preventDefault(); setOpenListRow(null); setNewNumber({ row: i, field: "batch" }); }}
                                  className="flex w-full justify-end text-[11px] px-2 py-1 hover:bg-gray-100 border-b border-gray-100 font-semibold">
                                  New Number
                                </button>
                              )}
                              {/* Any — no specific lot. */}
                              <button type="button"
                                onMouseDown={(e) => { e.preventDefault(); update(i, { batch_number: "Any" }); setOpenListRow(null); focusSel(`[data-oa-actual="${i}"]`); }}
                                className="flex w-full text-left text-[11px] px-2 py-1 hover:bg-gray-100 border-b border-gray-100">
                                <div className="flex-1 font-semibold">&#9670; Any</div>
                              </button>
                              {activeBatches.map((b) => (
                                <button key={b.name} type="button"
                                  onMouseDown={(e) => { e.preventDefault(); update(i, { batch_number: b.name, mfg_date: b.mfg_date ?? undefined, expiry_date: b.expiry_date ?? undefined }); setOpenListRow(null); focusSel(`[data-oa-actual="${i}"]`); }}
                                  className="flex w-full text-left text-[11px] px-2 py-1 hover:bg-gray-100 border-b border-gray-100">
                                  <div className="flex-1 font-semibold">{b.name}</div>
                                  <div className="w-16 font-mono">{fmtDate(b.expiry_date)}</div>
                                  <div className="w-14 text-right font-mono">{b.balance}</div>
                                </button>
                              ))}
                              {/* Lots created this session (New Number) show up too. */}
                              {typedBatches.map((n) => (
                                <button key={`t-${n}`} type="button"
                                  onMouseDown={(e) => { e.preventDefault(); update(i, { batch_number: n }); setOpenListRow(null); focusSel(`[data-oa-actual="${i}"]`); }}
                                  className="flex w-full text-left text-[11px] px-2 py-1 hover:bg-gray-100 border-b border-gray-100">
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
                          value={row.actual_quantity ?? ""}
                          onChange={(e) => setActual(i, numVal(e.target.value))}
                          onKeyDown={enter(() => focusSel(`[data-oa-billed="${i}"]`))}
                          className={`${inputCls} text-right font-mono`} />
                      </div>
                      {/* Billed */}
                      <div className={`${cell} ${W.qty}`}>
                        <input type="number" step="any" data-oa-billed={i}
                          value={row.quantity ?? ""}
                          onChange={(e) => update(i, { quantity: numVal(e.target.value) })}
                          onKeyDown={enter(() => focusSel(`[data-oa-rate="${i}"]`))}
                          className={`${inputCls} text-right font-mono`} />
                      </div>
                      {/* Rate */}
                      <div className={`${cell} ${W.rate}`}>
                        <input type="number" step="any" data-oa-rate={i}
                          value={row.rate ?? ""}
                          onChange={(e) => update(i, { rate: numVal(e.target.value) })}
                          onKeyDown={enter(() => focusSel(`[data-oa-disc="${i}"]`))}
                          className={`${inputCls} text-right font-mono`} />
                      </div>
                      {/* per */}
                      <div className={`${cell} ${W.per} text-center text-[11px] text-gray-600 pt-1 font-mono`}>{unitSymbol ?? ""}</div>
                      {/* Disc % — Enter completes the row and starts the next allocation. */}
                      <div className={`${cell} ${W.disc}`}>
                        <input type="number" step="any" data-oa-disc={i}
                          value={row.disc_percent ?? ""}
                          onChange={(e) => update(i, { disc_percent: numVal(e.target.value) })}
                          onKeyDown={enter(() => completeRow(i))}
                          className={`${inputCls} text-right font-mono`} />
                      </div>
                      {/* Amount */}
                      <div className={`${cell} ${W.amount} text-right text-xs font-mono font-semibold pt-1`}>{num(lineAmount(row))}</div>
                      {/* Remove */}
                      <div className={`${cell} ${W.del} text-center pt-0.5`}>
                        <button type="button" onClick={() => removeRow(i)} className="text-gray-400 hover:text-black text-sm font-bold">&times;</button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Totals — bold + 1px black top border, no fill */}
            <div className="flex items-center px-3 py-2 border-t border-black gap-2 font-bold text-xs font-mono">
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
              className="text-[10px] uppercase tracking-wide font-bold text-gray-700 hover:text-black border border-gray-400 px-2.5 py-1 hover:bg-gray-100">
              + Add Allocation
            </button>
            <span className="text-xs font-mono font-semibold text-black">Total: {totalBilled} {unitSymbol ?? ""}</span>
          </div>
        </div>
      </VoucherPopupShell>

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
    </>
  );
}
