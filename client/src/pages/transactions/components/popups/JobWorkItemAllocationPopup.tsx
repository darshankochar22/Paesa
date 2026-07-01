import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import type { JobWorkItemAllocationRow, ComponentAllocationRow } from "../../types";
import ComponentsAllocationPopup from "./ComponentsAllocationPopup";

interface Props {
  itemName: string;
  orderNo?: string;
  unitSymbol?: string;
  voucherDate: string;
  allGodowns: any[];
  allStockItems: any[];
  allUnits: any[];
  initialAllocations?: JobWorkItemAllocationRow[];
  onClose: () => void;
  onSave: (rows: JobWorkItemAllocationRow[]) => void;
}

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
function fmtDate(iso: string) {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return `${d.getDate()}-${MONTHS[d.getMonth()]}-${String(d.getFullYear()).slice(-2)}`;
}

const num = (v: number) =>
  v ? v.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "";

interface AllocRow {
  id: number;
  due_on: string;
  godown: string;
  quantity: string;
  rate: string;
  amount: number;
  components?: ComponentAllocationRow[];
  showGodownDD?: boolean;
}

let _rowId = 0;
const newAllocRow = (voucherDate: string): AllocRow => ({
  id: ++_rowId,
  due_on: voucherDate,
  godown: "",
  quantity: "",
  rate: "",
  amount: 0,
  components: [],
  showGodownDD: false,
});

const focusEl = (sel: string) =>
  setTimeout(() => (document.querySelector(sel) as HTMLElement | null)?.focus(), 30);

export default function JobWorkItemAllocationPopup({
  itemName, orderNo, unitSymbol, voucherDate,
  allGodowns, allStockItems, allUnits,
  initialAllocations, onClose, onSave,
}: Props) {
  const [trackComponents, setTrackComponents] = useState<"Yes" | "No">("No");
  const [showTrackDD, setShowTrackDD] = useState(false);

  const [rows, setRows] = useState<AllocRow[]>(() => {
    if (initialAllocations?.length) {
      return initialAllocations.map((r) => ({
        id: ++_rowId,
        due_on: r.due_on || voucherDate,
        godown: r.godown,
        quantity: r.quantity ? String(r.quantity) : "",
        rate: r.rate ? String(r.rate) : "",
        amount: r.amount,
        components: r.components ?? [],
        showGodownDD: false,
      }));
    }
    return [newAllocRow(voucherDate)];
  });

  // For ComponentsAllocationPopup
  const [compPopupData, setCompPopupData] = useState<{
    rowId: number;
    forGodown: string;
    quantity: number;
  } | null>(null);

  // Track which quantity field triggered component popup (to re-focus after)
  const hasOpenedCompRef = useRef<Record<number, boolean>>({});

  const update = (id: number, patch: Partial<AllocRow>) =>
    setRows((prev) => prev.map((r) => r.id === id ? { ...r, ...patch } : r));

  // Godown dropdown anchors, portaled to <body> with fixed coordinates below —
  // rows sit inside a scrollable (overflow-y-auto) body, so a plain
  // absolute-positioned dropdown gets clipped by that ancestor.
  const godownAnchorRefs = useRef<Record<number, HTMLDivElement | null>>({});
  const [godownPos, setGodownPos] = useState<{ top: number; left: number; width: number } | null>(null);
  const openGodownRowId = rows.find((r) => r.showGodownDD)?.id ?? null;

  useEffect(() => {
    if (openGodownRowId === null) { setGodownPos(null); return; }
    const reposition = () => {
      const el = godownAnchorRefs.current[openGodownRowId];
      if (!el) return;
      const r = el.getBoundingClientRect();
      setGodownPos({ top: r.bottom + 2, left: r.left, width: 176 });
    };
    reposition();
    window.addEventListener("scroll", reposition, true);
    window.addEventListener("resize", reposition);
    return () => {
      window.removeEventListener("scroll", reposition, true);
      window.removeEventListener("resize", reposition);
    };
  }, [openGodownRowId]);

  const totalQty = rows.reduce((s, r) => s + (Number(r.quantity) || 0), 0);
  const totalAmount = rows.reduce((s, r) => s + r.amount, 0);

  const handleAccept = () => {
    const filled = rows.filter((r) => Number(r.quantity) > 0);
    onSave(filled.map((r): JobWorkItemAllocationRow => ({
      due_on: r.due_on,
      godown: r.godown,
      quantity: Number(r.quantity) || 0,
      rate: Number(r.rate) || 0,
      unit_symbol: unitSymbol,
      amount: r.amount,
      components: r.components,
    })));
  };

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (compPopupData) return; // Let child handle keys
      if (e.key === "Escape") { e.preventDefault(); onClose(); }
      if (e.altKey && (e.key === "a" || e.key === "A")) { e.preventDefault(); handleAccept(); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [rows, compPopupData]);

  const inputCls = "text-xs px-1 py-0.5 border border-zinc-300 w-full outline-none focus:border-zinc-800";

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/30 pt-10 select-none">
      <div className="bg-white border border-black shadow-2xl w-[680px] flex flex-col max-h-[85vh]">

        {/* Title */}
        <div className="relative border-b border-black px-4 py-2 bg-white">
          <span className="absolute left-3 top-2 text-[9px] font-bold uppercase tracking-wider text-zinc-400">Item Allocations</span>
          <button onClick={onClose} className="absolute right-3 top-1.5 text-zinc-500 hover:text-black font-bold text-sm">&times;</button>
        </div>

        {/* Info block */}
        <div className="px-4 pt-2 pb-1 text-xs space-y-0.5 border-b border-zinc-200">
          <div className="flex gap-2">
            <span className="w-44 text-zinc-600 shrink-0">Item Allocations for</span>
            <span className="font-bold">{itemName}</span>
          </div>
          {orderNo && (
            <div className="flex gap-2">
              <span className="w-44 text-zinc-600 shrink-0">For Order Number</span>
              <span className="font-semibold">{orderNo}</span>
            </div>
          )}
          <div className="flex items-center gap-2 py-0.5">
            <span className="w-44 text-zinc-600 shrink-0">Track Components</span>
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowTrackDD((v) => !v)}
                className="text-xs px-2 py-0.5 border border-zinc-400 bg-yellow-100 font-bold min-w-[52px] text-left"
              >
                {trackComponents}
              </button>
              {showTrackDD && (
                <div className="absolute left-0 top-full mt-0.5 w-20 bg-white border border-zinc-400 shadow-xl z-50">
                  <div className="bg-zinc-900 text-white text-[10px] font-bold px-2 py-0.5">Track Components</div>
                  {(["Yes", "No"] as const).map((opt) => (
                    <button key={opt} type="button"
                      onMouseDown={(e) => { e.preventDefault(); setTrackComponents(opt); setShowTrackDD(false); }}
                      className={`block w-full text-left text-[11px] px-2 py-1 hover:bg-zinc-100 border-b border-zinc-50 ${opt === trackComponents ? "font-bold" : ""}`}>
                      {opt === trackComponents ? `♦ ${opt}` : opt}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Column headers */}
        <div className="flex items-center border-b border-zinc-300 bg-zinc-100 px-4 py-1 gap-2 text-[10px] font-bold uppercase tracking-wide text-zinc-600">
          <div className="w-24 shrink-0">Godown</div>
          <div className="w-24 text-right shrink-0">Quantity</div>
          <div className="w-24 text-right shrink-0">Rate</div>
          <div className="w-10 text-center shrink-0">per</div>
          <div className="flex-1 text-right">Amount</div>
        </div>

        {/* Rows */}
        <div className="flex-1 overflow-y-auto min-h-0">
          {rows.map((row, idx) => (
            <div key={row.id} className="border-b border-zinc-100">
              {/* Due on sub-header */}
              <div className="px-4 pt-1 text-[10px] italic text-zinc-500 flex items-center gap-1">
                <span>Due on :</span>
                <input
                  type="date"
                  value={row.due_on}
                  onChange={(e) => update(row.id, { due_on: e.target.value })}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); focusEl(`[data-jw-godown="${idx}"]`); }}}
                  className="text-[10px] border-b border-zinc-300 outline-none bg-transparent ml-0.5"
                  title={fmtDate(row.due_on)}
                />
              </div>

              {/* Data row */}
              <div className="flex items-center px-4 pb-1 gap-2">
                {/* Godown */}
                <div className="w-24 shrink-0 relative" ref={(el) => { godownAnchorRefs.current[row.id] = el; }}>
                  <input
                    type="text"
                    data-jw-godown={idx}
                    autoFocus={idx === 0}
                    value={row.godown}
                    onChange={(e) => update(row.id, { godown: e.target.value })}
                    onFocus={() => update(row.id, { showGodownDD: true })}
                    onBlur={() => setTimeout(() => update(row.id, { showGodownDD: false }), 150)}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); focusEl(`[data-jw-qty="${idx}"]`); }}}
                    placeholder="Location"
                    className={inputCls}
                  />
                  {row.showGodownDD && godownPos && createPortal(
                    <div
                      style={{ position: "fixed", top: godownPos.top, left: godownPos.left, width: godownPos.width }}
                      className="bg-white border border-zinc-400 shadow-xl z-[60] max-h-40 overflow-y-auto"
                    >
                      <div className="bg-zinc-900 text-white text-[10px] font-bold px-2 py-0.5">List of Godowns</div>
                      {allGodowns
                        .filter((g) => !row.godown || g.name.toLowerCase().includes(row.godown.toLowerCase()))
                        .map((g: any) => (
                          <button key={g.godown_id ?? g.name} type="button"
                            onMouseDown={(e) => {
                              e.preventDefault();
                              update(row.id, { godown: g.name, showGodownDD: false });
                              focusEl(`[data-jw-qty="${idx}"]`);
                            }}
                            className="block w-full text-left text-[11px] px-2 py-1 hover:bg-zinc-100 border-b border-zinc-50 font-semibold">
                            {g.name}
                          </button>
                        ))}
                    </div>,
                    document.body
                  )}
                </div>

                {/* Quantity */}
                <div className="w-24 shrink-0">
                  <input
                    type="text"
                    inputMode="decimal"
                    data-jw-qty={idx}
                    value={row.quantity}
                    onChange={(e) => {
                      const v = e.target.value;
                      const amt = (Number(v) || 0) * (Number(row.rate) || 0);
                      update(row.id, { quantity: v, amount: amt });
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        const qty = Number(row.quantity) || 0;
                        if (trackComponents === "Yes" && qty > 0 && !hasOpenedCompRef.current[row.id]) {
                          hasOpenedCompRef.current[row.id] = true;
                          setCompPopupData({ rowId: row.id, forGodown: row.godown, quantity: qty });
                        } else {
                          focusEl(`[data-jw-rate="${idx}"]`);
                        }
                      }
                    }}
                    className={`${inputCls} text-right font-mono`}
                  />
                </div>

                {/* Rate */}
                <div className="w-24 shrink-0">
                  <input
                    type="text"
                    inputMode="decimal"
                    data-jw-rate={idx}
                    value={row.rate}
                    onChange={(e) => {
                      const v = e.target.value;
                      const amt = (Number(row.quantity) || 0) * (Number(v) || 0);
                      update(row.id, { rate: v, amount: amt });
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        if (idx === rows.length - 1) {
                          setRows((prev) => [...prev, newAllocRow(voucherDate)]);
                          setTimeout(() => focusEl(`[data-jw-godown="${idx + 1}"]`), 40);
                        } else {
                          focusEl(`[data-jw-godown="${idx + 1}"]`);
                        }
                      }
                    }}
                    className={`${inputCls} text-right font-mono`}
                  />
                </div>

                {/* per */}
                <div className="w-10 shrink-0 text-center text-[11px] text-zinc-600 font-mono">{unitSymbol}</div>

                {/* Amount */}
                <div className="flex-1 text-right text-xs font-mono font-semibold">
                  {row.amount > 0 ? num(row.amount) : ""}
                </div>
              </div>

              {/* Components indicator (if trackComponents=Yes and filled) */}
              {trackComponents === "Yes" && (row.components?.length ?? 0) > 0 && (
                <div className="px-4 pb-1 flex items-center gap-2">
                  <span className="text-[10px] text-zinc-500 italic">
                    {row.components!.length} component{row.components!.length > 1 ? "s" : ""} allocated
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      hasOpenedCompRef.current[row.id] = true;
                      setCompPopupData({ rowId: row.id, forGodown: row.godown, quantity: Number(row.quantity) || 0 });
                    }}
                    className="text-[10px] underline text-zinc-600 hover:text-black"
                  >
                    Edit
                  </button>
                </div>
              )}
            </div>
          ))}

          {Array.from({ length: Math.max(0, 4 - rows.length) }).map((_, i) => (
            <div key={`ef-${i}`} className="min-h-[52px] border-b border-zinc-50 px-4" />
          ))}
        </div>

        {/* Totals */}
        <div className="flex items-center border-t border-zinc-300 bg-zinc-100 px-4 py-1 gap-2 font-bold text-xs font-mono">
          <div className="w-24 shrink-0" />
          <div className="w-24 shrink-0 text-right">{totalQty > 0 ? totalQty : ""}</div>
          <div className="w-24 shrink-0" />
          <div className="w-10 shrink-0" />
          <div className="flex-1 text-right">{totalAmount > 0 ? num(totalAmount) : ""}</div>
        </div>

        {/* Footer */}
        <div className="border-t border-zinc-200 p-3 bg-zinc-50 flex justify-between items-center">
          <span className="text-[10px] text-zinc-500">Alt+A: Accept · Esc: Close</span>
          <div className="flex gap-2">
            <button onClick={onClose} className="text-xs px-3 py-1.5 border border-zinc-300 text-zinc-700 bg-white hover:bg-zinc-100 font-semibold">Cancel</button>
            <button onClick={handleAccept} className="text-xs px-5 py-1.5 bg-zinc-900 text-white hover:bg-zinc-700 font-semibold">Accept</button>
          </div>
        </div>
      </div>

      {/* Components Allocation popup (nested) */}
      {compPopupData && (
        <ComponentsAllocationPopup
          parentItemName={itemName}
          forGodown={compPopupData.forGodown}
          quantity={compPopupData.quantity}
          unitSymbol={unitSymbol}
          voucherDate={voucherDate}
          allStockItems={allStockItems}
          allGodowns={allGodowns}
          allUnits={allUnits}
          initialRows={rows.find((r) => r.id === compPopupData.rowId)?.components ?? []}
          onClose={() => setCompPopupData(null)}
          onSave={(compRows) => {
            // Autofill rate & amount from component totals
            const totalCompAmount = compRows.reduce((s, r) => s + (Number(r.amount) || 0), 0);
            const mainQty = compPopupData.quantity; // qty entered before opening popup
            const autoRate = mainQty > 0 ? totalCompAmount / mainQty : 0;
            update(compPopupData.rowId, {
              components: compRows,
              rate: String(Math.round(autoRate * 100) / 100),
              amount: totalCompAmount,
            });
            setCompPopupData(null);
          }}
        />
      )}
    </div>
  );
}
