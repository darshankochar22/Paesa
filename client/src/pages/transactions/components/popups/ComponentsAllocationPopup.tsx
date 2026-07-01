import { useState } from "react";
import type { ComponentAllocationRow } from "../../types";
import { VoucherPopupShell } from "@/components/tally-ui/VoucherPopupShell";

interface GodownOption { godown_id?: number; name: string; }

interface Props {
  parentItemName: string;
  forGodown: string;
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

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
function fmtDate(iso: string) {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return `${d.getDate()}-${MONTHS[d.getMonth()]}-${String(d.getFullYear()).slice(-2)}`;
}

const TRACK_OPTIONS = ["Pending to Issue", "Pending to Receive"] as const;
const FILL_OPTIONS = ["♦ Not Applicable"] as const;

interface CompRow {
  id: number;
  item_name: string;
  unit_symbol: string;
  isBatch: boolean;
  showTrackDD: boolean;
  showGodownDD: boolean;
  track: "Pending to Issue" | "Pending to Receive" | "";
  due_on: string;
  godown: string;
  batch_lot: string;
  actual_qty: string;
  as_per_bom: string;
  rate: string;
  amount: number;
}

let _cRowId = 0;
const newRow = (voucherDate: string): CompRow => ({
  id: ++_cRowId,
  item_name: "",
  unit_symbol: "",
  isBatch: false,
  showTrackDD: false,
  showGodownDD: false,
  track: "",
  due_on: voucherDate,
  godown: "",
  batch_lot: "",
  actual_qty: "",
  as_per_bom: "",
  rate: "",
  amount: 0,
});

const num = (v: number) =>
  v ? v.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "";

const focusEl = (sel: string) =>
  setTimeout(() => (document.querySelector(sel) as HTMLElement | null)?.focus(), 30);

export default function ComponentsAllocationPopup({
  parentItemName, forGodown, quantity, unitSymbol,
  voucherDate, allStockItems, allGodowns, allUnits,
  initialRows, onClose, onSave,
}: Props) {
  const [fillUsing, setFillUsing] = useState("♦ Not Applicable");
  const [showFillDD, setShowFillDD] = useState(false);

  const [rows, setRows] = useState<CompRow[]>(() => {
    if (initialRows?.length) {
      return initialRows.map((r) => {
        const si = allStockItems.find((s: any) => s.name === r.item_name);
        return {
          id: ++_cRowId,
          item_name: r.item_name,
          unit_symbol: r.unit_symbol ?? "",
          isBatch: si ? Boolean(Number(si.track_batches)) : false,
          showTrackDD: false,
          showGodownDD: false,
          track: r.track || "",
          due_on: r.due_on || voucherDate,
          godown: r.godown,
          batch_lot: r.batch_lot ?? "",
          actual_qty: r.actual_qty ? String(r.actual_qty) : "",
          as_per_bom: r.as_per_bom ? String(r.as_per_bom) : "",
          rate: r.rate ? String(r.rate) : "",
          amount: r.amount,
        };
      });
    }
    return [newRow(voucherDate)];
  });

  const [showItemDD, setShowItemDD] = useState<number | null>(null);
  const [itemSearch, setItemSearch] = useState<Record<number, string>>({});

  const update = (id: number, patch: Partial<CompRow>) =>
    setRows((prev) => prev.map((r) => r.id === id ? { ...r, ...patch } : r));

  const totalActual = rows.reduce((s, r) => s + (Number(r.actual_qty) || 0), 0);
  const totalBoM = rows.reduce((s, r) => s + (Number(r.as_per_bom) || 0), 0);
  const totalAmount = rows.reduce((s, r) => s + (r.amount || 0), 0);

  const handleAccept = () => {
    const filled = rows.filter((r) => r.item_name.trim());
    onSave(filled.map((r): ComponentAllocationRow => ({
      item_name: r.item_name,
      track: (r.track || "Pending to Issue") as "Pending to Issue" | "Pending to Receive",
      due_on: r.due_on,
      godown: r.godown,
      batch_lot: r.batch_lot || undefined,
      actual_qty: Number(r.actual_qty) || 0,
      as_per_bom: Number(r.as_per_bom) || 0,
      rate: Number(r.rate) || 0,
      unit_symbol: r.unit_symbol || undefined,
      amount: r.amount,
    })));
  };

  const filteredItems = (id: number) => {
    const q = (itemSearch[id] ?? "").trim().toLowerCase();
    return allStockItems.filter((s: any) => !q || s.name.toLowerCase().includes(q));
  };

  const inputCls = "text-xs px-1 py-0.5 bg-white border border-gray-400 w-full outline-none focus:border-black";
  const ddHeadCls = "bg-white text-black text-[10px] font-bold px-2 py-1 border-b border-gray-400";
  const W = {
    name: "w-28", track: "w-28", godown: "w-24", batch: "w-20",
    qty: "w-16", rate: "w-20", per: "w-8", amount: "w-24",
  };
  const cell = "shrink-0";

  return (
    <VoucherPopupShell
      title="Components Allocation"
      headerRight={<span>Components Allocations for <span className="font-bold text-black">{parentItemName}</span></span>}
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
        <div className="flex gap-2">
          <span className="w-52 text-gray-600 shrink-0">Quantity</span>
          <span className="font-semibold">{quantity} {unitSymbol ?? ""}</span>
        </div>
      </div>

      {/* Fill Components using */}
      <div className="flex items-center gap-2 px-6 py-1.5 border-b border-gray-300 text-xs relative">
        <span className="w-52 text-gray-600 shrink-0">Fill Components using</span>
        <span className="text-gray-400 shrink-0">:</span>
        <div className="relative">
          <button type="button" onClick={() => setShowFillDD((v) => !v)}
            className="text-xs px-2 py-0.5 border border-gray-400 bg-white min-w-[160px] text-left focus:border-black outline-none">
            {fillUsing}
          </button>
          {showFillDD && (
            <div className="absolute left-0 top-full mt-0.5 w-48 bg-white border border-gray-400 shadow-xl z-40">
              <div className={ddHeadCls}>Fill Components using</div>
              {FILL_OPTIONS.map((o) => (
                <button key={o} type="button" onMouseDown={(e) => { e.preventDefault(); setFillUsing(o); setShowFillDD(false); }}
                  className="block w-full text-left text-[11px] px-2 py-1 hover:bg-gray-100 border-b border-gray-100">
                  {o}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

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
                  value={showItemDD === idx ? (itemSearch[row.id] ?? "") : row.item_name}
                  onChange={(e) => {
                    setItemSearch((p) => ({ ...p, [row.id]: e.target.value }));
                    update(row.id, { item_name: "" });
                    setShowItemDD(idx);
                  }}
                  onFocus={() => { setShowItemDD(idx); setItemSearch((p) => ({ ...p, [row.id]: "" })); }}
                  onBlur={() => setTimeout(() => setShowItemDD(null), 150)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      if (!row.item_name.trim()) {
                        const filled = rows.filter((r) => r.item_name.trim());
                        if (filled.length > 0) { handleAccept(); return; }
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
                      <button key={s.item_id} type="button"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          const unit = allUnits.find((u: any) => u.unit_id === s.unit_id);
                          const autoRate = (s as any).purchase_rate || (s as any).last_cost || (s as any).standard_rate || 0;
                          update(row.id, {
                            item_name: s.name,
                            unit_symbol: unit?.symbol ?? "",
                            isBatch: Boolean(Number(s.track_batches)),
                            rate: autoRate ? String(autoRate) : "",
                          });
                          setShowItemDD(null);
                          focusEl(`[data-ca-track="${idx}"]`);
                        }}
                        className="block w-full text-left text-[11px] px-2 py-1 hover:bg-gray-100 border-b border-gray-100 font-semibold">
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
                  className={`${inputCls} text-left ${row.track ? "font-semibold" : "text-gray-400"}`}
                >
                  {row.track || "Type of Component"}
                </button>
                {row.showTrackDD && (
                  <div className="absolute left-0 top-full mt-0.5 w-44 bg-white border border-gray-400 shadow-xl z-50">
                    <div className={ddHeadCls}>Type of Component</div>
                    {TRACK_OPTIONS.map((t) => (
                      <button key={t} type="button"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          update(row.id, { track: t, showTrackDD: false });
                          focusEl(`[data-ca-godown="${idx}"]`);
                        }}
                        className={`block w-full text-left text-[11px] px-2 py-1 hover:bg-gray-100 border-b border-gray-100 ${t === row.track ? "font-bold" : ""}`}>
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
              <div className={`${cell} ${W.name} text-[10px] text-gray-600 italic flex items-center gap-0.5 shrink-0`}>
                <span className="shrink-0">Due on :</span>
                <input
                  type="date"
                  data-ca-due={idx}
                  value={row.due_on}
                  onChange={(e) => update(row.id, { due_on: e.target.value })}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); focusEl(`[data-ca-godown="${idx}"]`); }}}
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
                  onFocus={() => update(row.id, { showGodownDD: true })}
                  onBlur={() => setTimeout(() => update(row.id, { showGodownDD: false }), 150)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      focusEl(row.isBatch ? `[data-ca-batch="${idx}"]` : `[data-ca-actual="${idx}"]`);
                    }
                  }}
                  placeholder="Location"
                  className={inputCls}
                />
                {row.showGodownDD && (
                  <div className="absolute left-0 top-full mt-0.5 w-44 bg-white border border-gray-400 shadow-xl z-40 max-h-40 overflow-y-auto">
                    <div className={ddHeadCls}>List of Godowns</div>
                    {allGodowns
                      .filter((g) => !row.godown || g.name.toLowerCase().includes(row.godown.toLowerCase()))
                      .map((g: any) => (
                        <button key={g.godown_id ?? g.name} type="button"
                          onMouseDown={(e) => {
                            e.preventDefault();
                            update(row.id, { godown: g.name, showGodownDD: false });
                            focusEl(row.isBatch ? `[data-ca-batch="${idx}"]` : `[data-ca-actual="${idx}"]`);
                          }}
                          className="block w-full text-left text-[11px] px-2 py-1 hover:bg-gray-100 border-b border-gray-100 font-semibold">
                          {g.name}
                        </button>
                      ))}
                  </div>
                )}
              </div>

              {/* Batch/Lot No. — only active for batch-tracked component items */}
              <div className={`${cell} ${W.batch}`}>
                {row.isBatch ? (
                  <input
                    type="text"
                    data-ca-batch={idx}
                    value={row.batch_lot}
                    onChange={(e) => update(row.id, { batch_lot: e.target.value })}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); focusEl(`[data-ca-actual="${idx}"]`); }}}
                    placeholder="Any"
                    className={inputCls}
                  />
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
                    update(row.id, { actual_qty: v, as_per_bom: row.as_per_bom || v, amount: amt });
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      // If rate already autofilled, skip BoM and rate and go to next row/accept
                      if (row.rate) {
                        const amt = (Number(e.currentTarget.value) || 0) * (Number(row.rate) || 0);
                        update(row.id, { as_per_bom: e.currentTarget.value, amount: amt });
                        if (idx === rows.length - 1) {
                          setRows((prev) => [...prev, newRow(voucherDate)]);
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
                    const v = e.target.value;
                    const amt = (Number(v) || Number(row.actual_qty) || 0) * (Number(row.rate) || 0);
                    update(row.id, { as_per_bom: v, amount: amt });
                  }}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); focusEl(`[data-ca-rate="${idx}"]`); }}}
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
                    const qty = Number(row.as_per_bom) || Number(row.actual_qty) || 0;
                    update(row.id, { rate: v, amount: qty * (Number(v) || 0) });
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      if (idx === rows.length - 1) {
                        setRows((prev) => [...prev, newRow(voucherDate)]);
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
              <div className={`${cell} ${W.per} text-center text-[11px] text-gray-600 font-mono`}>{row.unit_symbol}</div>

              {/* Amount */}
              <div className={`${cell} ${W.amount} text-right text-xs font-mono font-semibold`}>{row.amount > 0 ? num(row.amount) : ""}</div>
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
        <div className={`${cell} ${W.qty} text-right`}>{totalActual > 0 ? totalActual : ""}</div>
        <div className={`${cell} ${W.qty} text-right`}>{totalBoM > 0 ? totalBoM : ""}</div>
        <div className={`${cell} ${W.rate}`} />
        <div className={`${cell} ${W.per}`} />
        <div className={`${cell} ${W.amount} text-right`}>{totalAmount > 0 ? num(totalAmount) : ""}</div>
      </div>
    </VoucherPopupShell>
  );
}
