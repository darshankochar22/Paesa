import { useState, useEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import type { BatchAllocation } from "../../types";
import { VoucherPopupShell } from "@/components/tally-ui/VoucherPopupShell";

// Material In / Out (job work) Stock Item Allocations — order-tracked godown rows.
// Items that "maintain in batches" additionally get Batch/Lot No. + Mfg Dt. /
// Expiry Date columns. Order No. and Batch/Lot No. open Tally-style list popups
// (List of Orders / List of Active Batches) with a New Number entry. Strict
// grayscale per UI.md.

interface GodownOption { godown_id?: number; name: string; }
interface ItemOption { item_id?: number; name: string; }

interface Props {
  itemName: string;
  rate: number;
  unitSymbol?: string;
  godowns?: GodownOption[];
  stockItems?: ItemOption[];
  showBatch?: boolean;
  trackMfg?: boolean;
  trackExpiry?: boolean;
  initialAllocations?: BatchAllocation[];
  onClose: () => void;
  onSave: (allocations: BatchAllocation[]) => void;
}

const NOT_APPLICABLE = "♦ Not Applicable";
// Right block = Quantity + Rate + per + Amount; "Component of" spans the same.
const RIGHT = "w-[360px]";
const BATCH = "w-56";
const ORDER_COLS = "grid grid-cols-[1.3fr_0.8fr_1fr_0.8fr_0.8fr_1.3fr_0.9fr] gap-x-2";
const BATCH_COLS = "grid grid-cols-[1fr_auto_auto] gap-x-3";

export default function MaterialInAllocationPopup({
  itemName, rate, unitSymbol, godowns = [], stockItems = [],
  showBatch = false, trackMfg = false, trackExpiry = false,
  initialAllocations = [], onClose, onSave,
}: Props) {
  const defaultGodown = godowns[0]?.name ?? "";
  const unit = unitSymbol ?? "";
  const today = new Date().toISOString().slice(0, 10);

  const emptyRow = (): BatchAllocation => ({
    batch_number: "",
    order_no: "",
    due_on: "",
    component_of: NOT_APPLICABLE,
    godown: defaultGodown,
    mfg_date: showBatch && trackMfg ? today : "",   // auto-assigned at manufacture
    expiry_date: "",
    quantity: 0,
    rate,
  });

  const [considerAsScrap, setConsiderAsScrap] = useState<"Yes" | "No">("No");
  const [rows, setRows] = useState<BatchAllocation[]>(
    initialAllocations.length ? initialAllocations.map((a) => ({ ...a })) : [emptyRow()]
  );
  const [error, setError] = useState<string | null>(null);
  const [openOrderList, setOpenOrderList] = useState<number | null>(null);
  const [openBatchList, setOpenBatchList] = useState<number | null>(null);
  const [newNumberRow, setNewNumberRow] = useState<number | null>(null);
  const [newNumberField, setNewNumberField] = useState<"order" | "batch">("order");
  const [newNumberValue, setNewNumberValue] = useState("");
  const orderRefs = useRef<(HTMLButtonElement | null)[]>([]);
  // Anchors for the Order/Batch list popups, portaled to <body> with fixed
  // coordinates below — rows sit inside a scrollable (overflow-y-auto) body, so
  // plain absolute-positioned dropdowns get clipped by that ancestor.
  const orderAnchorRefs = useRef<(HTMLDivElement | null)[]>([]);
  const batchAnchorRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [orderPos, setOrderPos] = useState<{ top: number; left: number } | null>(null);
  const [batchPos, setBatchPos] = useState<{ top: number; left: number } | null>(null);

  useEffect(() => {
    if (openOrderList === null && openBatchList === null) return;
    const reposition = () => {
      if (openOrderList !== null && orderAnchorRefs.current[openOrderList]) {
        const r = orderAnchorRefs.current[openOrderList]!.getBoundingClientRect();
        setOrderPos({ top: r.bottom + 2, left: r.left });
      } else setOrderPos(null);
      if (openBatchList !== null && batchAnchorRefs.current[openBatchList]) {
        const r = batchAnchorRefs.current[openBatchList]!.getBoundingClientRect();
        setBatchPos({ top: r.bottom + 2, left: r.left });
      } else setBatchPos(null);
    };
    reposition();
    window.addEventListener("scroll", reposition, true);
    window.addEventListener("resize", reposition);
    return () => {
      window.removeEventListener("scroll", reposition, true);
      window.removeEventListener("resize", reposition);
    };
  }, [openOrderList, openBatchList]);

  const update = (i: number, patch: Partial<BatchAllocation>) => {
    setError(null);
    setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  };
  const addRow = () => { setError(null); setRows((prev) => [...prev, emptyRow()]); };
  const removeRow = (i: number) => { if (rows.length === 1) return; setRows((prev) => prev.filter((_, idx) => idx !== i)); };

  const onRateEnter = (i: number) => {
    if (i === rows.length - 1) {
      addRow();
      setTimeout(() => orderRefs.current[i + 1]?.focus(), 30);
    }
  };

  const total = rows.reduce((s, r) => s + (Number(r.quantity) || 0), 0);
  const totalAmount = rows.reduce((s, r) => s + (Number(r.quantity) || 0) * (Number(r.rate) || 0), 0);
  const num = (v: number) => v ? v.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "";
  const existingOrders = Array.from(new Set(rows.map((r) => (r.order_no || "").trim()).filter(Boolean)));

  // In-session active batches (distinct), shown in the List of Active Batches.
  const batchMap = new Map<string, { name: string; expiry: string; balance: number }>();
  rows.forEach((r) => {
    const name = (r.batch_number || "").trim();
    if (name && !batchMap.has(name)) batchMap.set(name, { name, expiry: r.expiry_date || "", balance: Number(r.quantity) || 0 });
  });
  const existingBatches = Array.from(batchMap.values());

  const confirmNewNumber = () => {
    if (newNumberRow === null) return;
    const v = newNumberValue.trim();
    update(newNumberRow, newNumberField === "batch" ? { batch_number: v } : { order_no: v });
    setNewNumberRow(null);
  };

  const handleSave = useCallback(() => {
    if (total <= 0) { setError("Enter a quantity for at least one row."); return; }
    if (showBatch && rows.some((r) => (Number(r.quantity) || 0) > 0 && !(r.batch_number || "").trim())) {
      setError("Every allocation needs a Batch / Lot No.");
      return;
    }
    onSave(
      rows
        .filter((r) => (Number(r.quantity) || 0) > 0 || (r.order_no || "").trim())
        .map((r) => ({
          batch_number: showBatch ? (r.batch_number || "").trim() : "",
          order_no: (r.order_no || "").trim() || undefined,
          due_on: (r.due_on || "").trim() || undefined,
          component_of: r.component_of || undefined,
          consider_as_scrap: considerAsScrap,
          godown: r.godown || undefined,
          mfg_date: showBatch && trackMfg ? (r.mfg_date || undefined) : undefined,
          expiry_date: showBatch && trackExpiry ? (r.expiry_date || undefined) : undefined,
          quantity: Number(r.quantity) || 0,
          rate: Number(r.rate) || rate,
        }))
    );
  }, [rows, total, rate, considerAsScrap, showBatch, trackMfg, trackExpiry, onSave]);

  const cell = "text-sm border border-gray-400 px-1 py-0 outline-none focus:border-black bg-white";

  return (
    <>
      <VoucherPopupShell
        title="Item Allocations"
        headerRight={<span className="font-bold text-black">{itemName}</span>}
        onClose={onClose}
        onAccept={handleSave}
        bodyClassName="p-0"
        hint={<>Enter on Rate adds a new row &nbsp;&middot;&nbsp; Alt+A: Accept &nbsp;&middot;&nbsp; Esc: Close</>}
      >
        {/* Context block */}
        <div className="px-6 pt-3 pb-2 border-b border-gray-300 space-y-1 select-none">
          <div className="text-sm flex items-center gap-2">
            <span className="font-semibold">Item Allocations for</span>
            <span>:</span>
            <span className="font-bold">{itemName}</span>
          </div>
          <div className="text-sm flex items-center gap-2">
            <span>Consider as Scrap</span>
            <span>:</span>
            <button type="button" onClick={() => setConsiderAsScrap("Yes")} className={`px-2 border ${considerAsScrap === "Yes" ? "border-black font-bold" : "border-gray-400 text-gray-600"}`}>Yes</button>
            <button type="button" onClick={() => setConsiderAsScrap("No")} className={`px-2 border ${considerAsScrap === "No" ? "border-black font-bold" : "border-gray-400 text-gray-600"}`}>No</button>
          </div>
        </div>

        {/* Column headers */}
        <div className="flex px-6 pt-1 text-sm font-semibold text-black gap-2 select-none">
          <div className="flex-1">Godown</div>
          {showBatch && <div className={`${BATCH} text-center`}>Batch/Lot No.</div>}
          <div className={`${RIGHT} flex gap-2`}>
            <div className="flex-1 text-right">Quantity</div>
            <div className="w-20 text-right">Rate</div>
            <div className="w-10 text-center">per</div>
            <div className="w-28 text-right">Amount</div>
          </div>
          <div className="w-5" />
        </div>
        {showBatch ? (
          <div className="flex px-6 pb-1 border-b border-black text-xs text-gray-600 gap-2 select-none">
            <div className="flex-1" />
            <div className={`${BATCH} flex gap-1`}>
              <div className="w-24 shrink-0">{trackMfg ? "Mfg Dt." : ""}</div>
              <div className="flex-1">{trackExpiry ? "Expiry Date" : ""}</div>
            </div>
            <div className={RIGHT} />
            <div className="w-5" />
          </div>
        ) : (
          <div className="border-b border-black" />
        )}

        <div className="px-6 py-4">
          {error && (
            <div className="border border-black text-sm px-3 py-1.5 mb-2 font-bold">• {error}</div>
          )}

          {rows.map((row, i) => {
            const amount = (Number(row.quantity) || 0) * (Number(row.rate) || 0);
            const hasOrder = (row.order_no ?? "").trim() !== "";
            return (
              <div key={i} className="mb-2">
                {/* Order line — Due on / Component of appear only once an Order No. is entered */}
                <div className="flex items-center gap-2 text-xs italic text-gray-700">
                  <div className="flex-1 min-w-0 flex items-center gap-2">
                    <span className="shrink-0">Order No.:</span>
                    <div className="relative" ref={(el) => { orderAnchorRefs.current[i] = el; }}>
                      <button ref={(el) => { orderRefs.current[i] = el; }} type="button" onClick={() => setOpenOrderList(openOrderList === i ? null : i)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); setOpenOrderList(i); } }} className={`${cell} w-28 text-left not-italic truncate`}>
                        {row.order_no || NOT_APPLICABLE}
                      </button>
                      {openOrderList === i && orderPos && createPortal(
                        <>
                          <div className="fixed inset-0 z-20" onClick={() => setOpenOrderList(null)} />
                          <div style={{ position: "fixed", top: orderPos.top, left: orderPos.left }} className="z-30 w-[640px] bg-white border border-gray-500 shadow-xl not-italic">
                            <div className="bg-white text-black text-[11px] font-bold px-2 py-1 flex justify-between items-center border-b border-gray-300">
                              <span>List of Orders</span>
                              <button type="button" onClick={() => { setNewNumberValue(""); setNewNumberField("order"); setNewNumberRow(i); setOpenOrderList(null); }} className="underline hover:text-gray-600">New Number</button>
                            </div>
                            <div className={`${ORDER_COLS} px-2 py-0.5 text-[10px] font-semibold border-b border-gray-300 text-gray-700`}>
                              <span>Name</span><span>Batch</span><span>Godown</span><span>Due On</span><span className="text-right">Balance</span><span>Primary Item Name</span><span>Order Type</span>
                            </div>
                            <div className="max-h-48 overflow-y-auto">
                              <button type="button" onClick={() => { update(i, { order_no: "" }); setOpenOrderList(null); }} className={`${ORDER_COLS} w-full text-left px-2 py-1 text-xs hover:bg-gray-100`}>
                                <span>{NOT_APPLICABLE}</span><span /><span /><span /><span /><span /><span />
                              </button>
                              {existingOrders.map((o) => (
                                <button key={o} type="button" onClick={() => { update(i, { order_no: o }); setOpenOrderList(null); }} className={`${ORDER_COLS} w-full text-left px-2 py-1 text-xs hover:bg-gray-100`}>
                                  <span className="font-mono">{o}</span><span /><span className="truncate">{row.godown}</span><span>{row.due_on}</span><span /><span className="truncate">{itemName}</span><span>Job Work</span>
                                </button>
                              ))}
                            </div>
                          </div>
                        </>,
                        document.body
                      )}
                    </div>
                    {hasOrder && (
                      <>
                        <span className="shrink-0">Due on</span>
                        <input type="text" value={row.due_on ?? ""} onChange={(e) => update(i, { due_on: e.target.value })} placeholder="9 Days" className={`${cell} w-24 not-italic`} />
                      </>
                    )}
                  </div>
                  <div className={`${RIGHT} flex items-center gap-2`}>
                    {hasOrder && (
                      <>
                        <span className="shrink-0">Component of :</span>
                        <select value={row.component_of ?? ""} onChange={(e) => update(i, { component_of: e.target.value })} className={`${cell} flex-1 min-w-0 not-italic`}>
                          <option value={NOT_APPLICABLE}>{NOT_APPLICABLE}</option>
                          {stockItems.map((s) => <option key={s.item_id ?? s.name} value={s.name}>{s.name}</option>)}
                        </select>
                      </>
                    )}
                  </div>
                  <div className="w-5" />
                </div>

                {/* Allocation line */}
                <div className="flex items-start gap-2 mt-0.5">
                  <div className="flex-1 min-w-0">
                    {godowns.length > 0 ? (
                      <select value={row.godown ?? ""} onChange={(e) => update(i, { godown: e.target.value })} className={`${cell} w-full`}>
                        <option value="" />
                        {godowns.map((g) => <option key={g.godown_id ?? g.name} value={g.name}>{g.name}</option>)}
                      </select>
                    ) : (
                      <input type="text" value={row.godown ?? ""} onChange={(e) => update(i, { godown: e.target.value })} placeholder="Location" className={`${cell} w-full`} />
                    )}
                  </div>

                  {showBatch && (
                    <div className={BATCH}>
                      {/* Batch/Lot No. — opens List of Active Batches */}
                      <div className="relative" ref={(el) => { batchAnchorRefs.current[i] = el; }}>
                        <button type="button" onClick={() => setOpenBatchList(openBatchList === i ? null : i)} className={`${cell} w-full text-left font-semibold truncate ${row.batch_number ? "" : "text-gray-400 font-normal"}`}>
                          {row.batch_number || "New Number…"}
                        </button>
                        {openBatchList === i && batchPos && createPortal(
                          <>
                            <div className="fixed inset-0 z-20" onClick={() => setOpenBatchList(null)} />
                            <div style={{ position: "fixed", top: batchPos.top, left: batchPos.left }} className="z-30 w-72 bg-white border border-gray-500 shadow-xl">
                              <div className="bg-white text-black text-[11px] font-bold px-2 py-1 flex justify-between items-center border-b border-gray-300">
                                <span>List of Active Batches</span>
                                <button type="button" onClick={() => { setNewNumberValue(""); setNewNumberField("batch"); setNewNumberRow(i); setOpenBatchList(null); }} className="underline hover:text-gray-600">New Number</button>
                              </div>
                              <div className={`${BATCH_COLS} px-2 py-0.5 text-[10px] font-semibold border-b border-gray-300 text-gray-700`}>
                                <span>Name</span><span className="text-right">Expiry</span><span className="text-right">Balance</span>
                              </div>
                              <div className="max-h-48 overflow-y-auto">
                                {existingBatches.length === 0 && <div className="px-2 py-1 text-xs text-gray-400 italic">No active batches — use New Number</div>}
                                {existingBatches.map((b) => (
                                  <button key={b.name} type="button" onClick={() => { update(i, { batch_number: b.name, expiry_date: b.expiry || row.expiry_date }); setOpenBatchList(null); }} className={`${BATCH_COLS} w-full text-left px-2 py-1 text-xs hover:bg-gray-100`}>
                                    <span className="truncate font-semibold">{b.name}</span><span className="text-right font-mono">{b.expiry}</span><span className="text-right font-mono">{b.balance ? `${b.balance} ${unit}` : ""}</span>
                                  </button>
                                ))}
                              </div>
                            </div>
                          </>,
                          document.body
                        )}
                      </div>
                      {(trackMfg || trackExpiry) && (
                        <div className="flex gap-1 mt-0.5">
                          {trackMfg && <input type="date" value={row.mfg_date ?? ""} onChange={(e) => update(i, { mfg_date: e.target.value })} className={`${cell} w-24 shrink-0 font-mono`} />}
                          {trackExpiry && <input type="text" value={row.expiry_date ?? ""} onChange={(e) => update(i, { expiry_date: e.target.value })} placeholder="date / 6 Months / 2 Yrs" className={`${cell} flex-1 min-w-0 font-mono`} />}
                        </div>
                      )}
                    </div>
                  )}

                  <div className={`${RIGHT} flex items-start gap-2`}>
                    <div className="flex-1 flex items-center justify-end gap-1">
                      <input type="number" step="any" value={row.quantity || ""} onChange={(e) => update(i, { quantity: Number(e.target.value) || 0 })} className={`${cell} w-16 text-right font-mono`} />
                      <span className="text-xs text-gray-600 shrink-0 w-6">{unit}</span>
                    </div>
                    <div className="w-20">
                      <input type="number" step="any" value={row.rate || ""} onChange={(e) => update(i, { rate: Number(e.target.value) || 0 })} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); onRateEnter(i); } }} className={`${cell} w-full text-right font-mono`} />
                    </div>
                    <div className="w-10 text-center text-xs text-gray-600 font-mono pt-0.5">{unit}</div>
                    <div className="w-28 text-right text-sm font-mono font-semibold pt-0.5">{num(amount)}</div>
                  </div>
                  <div className="w-5 text-center pt-0.5">
                    <button type="button" onClick={() => removeRow(i)} className="text-gray-400 hover:text-black text-sm font-bold">&times;</button>
                  </div>
                </div>
              </div>
            );
          })}

          {/* Next-order prompt (adds a row) */}
          <div className="flex items-center gap-2 text-xs italic text-gray-500">
            <span className="shrink-0">Order No.:</span>
            <button type="button" onClick={addRow} className="hover:text-black">♦ End of List</button>
          </div>
        </div>

        {/* Totals */}
        <div className="flex px-6 py-1 border-t border-black text-sm font-bold font-mono gap-2">
          <div className="flex-1" />
          {showBatch && <div className={BATCH} />}
          <div className={`${RIGHT} flex gap-2`}>
            <div className="flex-1 text-right">{total ? `${total} ${unit}` : ""}</div>
            <div className="w-20" />
            <div className="w-10" />
            <div className="w-28 text-right">{num(totalAmount)}</div>
          </div>
          <div className="w-5" />
        </div>
      </VoucherPopupShell>

      {/* New Number — create a new order / batch number */}
      {newNumberRow !== null && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/30">
          <div className="bg-white border border-gray-300 shadow-2xl w-80">
            <div className="border-b border-gray-300 bg-white px-3 py-1.5 text-sm font-semibold text-black">New Number</div>
            <div className="p-4">
              <input autoFocus type="text" value={newNumberValue} onChange={(e) => setNewNumberValue(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); confirmNewNumber(); } if (e.key === "Escape") { e.preventDefault(); setNewNumberRow(null); } }} className="w-full text-sm border border-gray-400 px-1 py-1 outline-none focus:border-black bg-white" />
            </div>
            <div className="border-t border-gray-300 px-3 py-2 flex justify-end gap-2 bg-white">
              <button onClick={() => setNewNumberRow(null)} className="text-xs px-3 py-1 border border-black hover:bg-gray-100">Cancel</button>
              <button onClick={confirmNewNumber} className="text-xs px-4 py-1 bg-black text-white hover:bg-gray-800">Accept</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
