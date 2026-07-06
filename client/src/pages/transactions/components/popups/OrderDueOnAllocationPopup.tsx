import { useState, useEffect, useCallback, useRef } from 'react';
import type { BatchAllocation } from '../../types';
import NewNumberPopup from './NewNumberPopup';
import { parseDueOn } from '@/lib/dueDate';
import { VoucherPopupShell } from '@/components/tally-ui/VoucherPopupShell';
import { useCompany } from '@/context/CompanyContext';

// Stock Item Allocations sub-screen for ORDER vouchers (Purchase / Sales Order).
// Tally layout (screenshot-faithful): each allocation is a "Due on <period/date>"
// line over a Godown / Batch-Lot / Actual / Billed / Rate / Disc / Amount line.
// No Tracking No. / Order No. — those belong to Receipt/Delivery Notes.
//   • Godown field opens a "List of Godowns" (♦ Any + real godowns w/ balances).
//   • Batch/Lot field opens a "List of Active Batches" (♦ Any + New Number +
//     existing batches fetched for the item + lots created this session);
//     New Number opens a small popup to type the lot, which then joins the list.
// Strict grayscale per UI.md.

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
  voucherDate: string; // ISO yyyy-mm-dd — default "Due on"
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

const ANY = '♦ Any';
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function fmtDate(iso?: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return `${d.getDate()}-${MONTHS[d.getMonth()]}-${String(d.getFullYear()).slice(-2)}`;
}

const num = (v: number | undefined) =>
  v ? v.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '';

const round2 = (n: number) => Math.round(n * 100) / 100;

/** Row state = saved shape + a UI-only flag: once Billed is edited on its own,
 *  Actual stops driving it. The flag is not included in the saved payload. */
type Row = BatchAllocation & { billedTouched?: boolean };

interface ActiveBatch {
  name: string;
  mfg_date?: string | null;
  expiry_date?: string | null;
  balance?: number;
}

const focusSel = (sel: string) =>
  setTimeout(() => (document.querySelector(sel) as HTMLElement | null)?.focus(), 30);

export default function OrderDueOnAllocationPopup({
  companyId,
  itemId,
  itemName,
  rate,
  unitSymbol,
  voucherDate,
  trackMfg,
  trackExpiry,
  isInward,
  godowns = [],
  initialAllocations = [],
  showBatch = true,
  onClose,
  onSave,
}: Props) {
  const defaultGodown =
    godowns.find((g) => g.name === 'Main Location')?.name ?? godowns[0]?.name ?? '';
  const defaultDue = fmtDate(voucherDate);

  // F11 flags — hide Billed / Disc % columns when the respective flag is No.
  const { features } = useCompany();
  const showBilled = features?.use_separate_actual_billed_qty !== 0;
  const showDisc = features?.use_discount_column_in_invoices !== 0;

  const emptyRow = (): Row => ({
    batch_number: '',
    godown: defaultGodown,
    quantity: 0,
    actual_quantity: 0,
    rate,
    disc_percent: 0,
    due_on: defaultDue,
  });

  const [rows, setRows] = useState<Row[]>(
    initialAllocations.length
      ? initialAllocations.map((a) => ({
          ...a,
          // Billed differing from Actual on hydrate means it was set on its own.
          billedTouched: a.actual_quantity != null && a.actual_quantity !== a.quantity,
        }))
      : [emptyRow()],
  );
  // Existing batches for this item (fetched) — the List of Active Batches.
  const [activeBatches, setActiveBatches] = useState<ActiveBatch[]>([]);
  // Lots the user creates here (New Number) also join the list (blank balance).
  const [createdBatches, setCreatedBatches] = useState<string[]>([]);
  const [godownBal, setGodownBal] = useState<Record<number, number>>({});
  const [openListRow, setOpenListRow] = useState<number | null>(null); // batch list
  const [openGodownRow, setOpenGodownRow] = useState<number | null>(null); // godown list
  const [newBatchRow, setNewBatchRow] = useState<number | null>(null); // New Number popup
  const [error, setError] = useState<string | null>(null);
  const [fetchNotice, setFetchNotice] = useState<string | null>(null);
  const batchRefs = useRef<(HTMLDivElement | null)[]>([]);
  const godownRefs = useRef<(HTMLDivElement | null)[]>([]);

  const subPopupOpen = newBatchRow !== null;

  // Per-godown balances for this item — shown in the List of Godowns.
  useEffect(() => {
    if (!companyId || !itemId) return;
    const p = (window as any).api.stockItem.getStockBalancesByGodown?.({
      company_id: companyId,
      item_id: itemId,
    });
    if (!p) return;
    p.then((res: any) => {
      if (res?.success && res.balances) setGodownBal(res.balances);
      else if (res && res.success === false) setFetchNotice('Godown balances unavailable.');
    }).catch(() => setFetchNotice('Godown balances unavailable.'));
  }, [companyId, itemId]);

  // Existing batches (with expiry + balance) for the List of Active Batches.
  useEffect(() => {
    if (!showBatch || !companyId || !itemId) return;
    (window as any).api.report
      .batchBalances?.(companyId, itemId)
      .then((res: any) => {
        if (res?.success) setActiveBatches(res.batches ?? []);
      })
      .catch(() => {});
  }, [companyId, itemId, showBatch]);

  useEffect(() => {
    if (openListRow === null && openGodownRow === null) return;
    const onDown = (e: MouseEvent) => {
      const bel = openListRow !== null ? batchRefs.current[openListRow] : null;
      const gel = openGodownRow !== null ? godownRefs.current[openGodownRow] : null;
      if (bel && !bel.contains(e.target as Node)) setOpenListRow(null);
      if (gel && !gel.contains(e.target as Node)) setOpenGodownRow(null);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [openListRow, openGodownRow]);

  const billed = (r: BatchAllocation) => Number(r.quantity) || 0;
  const actual = (r: BatchAllocation) => Number(r.actual_quantity ?? r.quantity) || 0;
  const lineAmount = (r: BatchAllocation) =>
    round2(billed(r) * (Number(r.rate) || 0) * (1 - (Number(r.disc_percent) || 0) / 100));

  const totalActual = rows.reduce((s, r) => s + actual(r), 0);
  const totalBilled = rows.reduce((s, r) => s + billed(r), 0);
  const totalAmount = round2(rows.reduce((s, r) => s + lineAmount(r), 0));

  // Godown balance label — negatives as "(-)9 Box" (Tally), blank when zero.
  const fmtQty = (q?: number) => {
    if (!q) return '';
    const u = unitSymbol || '';
    return q < 0 ? `(-)${Math.abs(q)} ${u}`.trim() : `${q} ${u}`.trim();
  };
  const update = (i: number, patch: Partial<Row>) => {
    setError(null);
    setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  };

  // Actual drives Billed until Billed is explicitly edited on its own.
  const setActual = (i: number, v: number) => {
    setError(null);
    setRows((prev) =>
      prev.map((r, idx) => {
        if (idx !== i) return r;
        return { ...r, actual_quantity: v, quantity: r.billedTouched ? r.quantity : v };
      }),
    );
  };

  const addRow = () => {
    setError(null);
    setRows((prev) => [...prev, emptyRow()]);
  };
  const removeRow = (i: number) => {
    if (rows.length === 1) {
      setError('At least one allocation row is required.');
      return;
    }
    setError(null);
    setRows((prev) => prev.filter((_, idx) => idx !== i));
  };

  // Enter on the last field (Disc) appends a fresh allocation and lands on its
  // "Due on"; a subsequent Enter walks Due on → Godown → … again.
  const completeRow = (i: number) => {
    if (i === rows.length - 1) addRow();
    focusSel(`[data-oa-due="${i + 1}"]`);
  };

  const handleSave = useCallback(() => {
    if (showBatch && rows.some((r) => !(r.batch_number || '').trim())) {
      setError('Every row needs a Batch / Lot No. (pick Any or a New Number).');
      return;
    }
    if (totalBilled <= 0) {
      setError('Enter a quantity for at least one allocation.');
      return;
    }
    const isAny = (s: string) => s.trim().toLowerCase() === 'any';
    onSave(
      rows.map((r): BatchAllocation & { due_on_date?: string | null } => {
        const batch = (r.batch_number || '').trim();
        const dueText = r.due_on || defaultDue;
        return {
          // "Any" is display-only — persist no specific batch/godown.
          batch_number: isAny(batch) ? '' : batch,
          godown: r.godown && !isAny(r.godown) ? r.godown : undefined,
          due_on: dueText,
          // Resolved ISO date for reports / order-outstanding logic.
          due_on_date: parseDueOn(dueText, voucherDate),
          mfg_date: trackMfg ? r.mfg_date || undefined : undefined,
          expiry_date: trackExpiry ? r.expiry_date || undefined : undefined,
          quantity: Number(r.quantity) || 0,
          actual_quantity: Number(r.actual_quantity ?? r.quantity) || 0,
          rate: Number(r.rate) || rate,
          disc_percent: Number(r.disc_percent) || 0,
        };
      }),
    );
  }, [rows, totalBilled, trackMfg, trackExpiry, rate, defaultDue, showBatch, voucherDate, onSave]);

  const enter = (fn: () => void) => (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      fn();
    }
  };

  const pickGodown = (i: number, name: string) => {
    update(i, { godown: name });
    setOpenGodownRow(null);
    focusSel(showBatch ? `[data-oa-batch="${i}"]` : `[data-oa-actual="${i}"]`);
  };
  const pickBatch = (i: number, name: string) => {
    update(i, { batch_number: name });
    setOpenListRow(null);
    focusSel(`[data-oa-actual="${i}"]`);
  };

  const cell = 'shrink-0';
  const W = {
    godown: 'w-28',
    batch: 'w-28',
    qty: 'w-14',
    rate: 'w-16',
    per: 'w-8',
    disc: 'w-12',
    amount: 'w-20',
    del: 'w-4',
  };
  const inputCls =
    'text-xs px-1 py-0.5 bg-white border border-gray-400 w-full outline-none focus:border-black';
  const ddCls =
    'absolute left-0 top-full mt-1 w-60 bg-white border border-gray-400 shadow-xl z-30 max-h-52 overflow-y-auto';
  const ddHeadCls =
    'bg-white text-black text-[10px] font-bold px-2 py-1 sticky top-0 border-b border-gray-400';

  return (
    <VoucherPopupShell
      title="Stock Item Allocations"
      headerRight={
        <span>
          Item Allocations for : <span className="font-bold text-black">{itemName}</span>
        </span>
      }
      onClose={() => {
        if (!subPopupOpen) onClose();
      }}
      onAccept={() => {
        if (!subPopupOpen) handleSave();
      }}
    >
      <div className="space-y-3">
        {error && (
          <div className="border border-gray-400 border-l-2 border-l-black text-black text-xs px-3 py-2 flex justify-between items-center font-semibold">
            <span>• {error}</span>
            <button onClick={() => setError(null)} className="font-bold">
              &times;
            </button>
          </div>
        )}
        {fetchNotice && <div className="text-[10px] text-gray-600 italic px-1">{fetchNotice}</div>}

        <div className="border border-gray-300">
          {/* Column headers */}
          <div className="flex bg-white px-3 pt-1.5 text-[10px] font-bold uppercase tracking-wide text-black gap-2">
            <div className={`${cell} ${W.godown}`}>Godown</div>
            {showBatch && <div className={`${cell} ${W.batch} text-center`}>Batch / Lot No.</div>}
            {showBilled ? (
              <>
                <div className={`${cell} ${W.qty} text-right`}>Actual</div>
                <div className={`${cell} ${W.qty} text-right`}>Billed</div>
              </>
            ) : (
              <div className={`${cell} ${W.qty} text-right`}>Quantity</div>
            )}
            <div className={`${cell} ${W.rate} text-right`}>Rate</div>
            <div className={`${cell} ${W.per} text-center`}>per</div>
            {showDisc && <div className={`${cell} ${W.disc} text-right`}>Disc %</div>}
            <div className={`${cell} ${W.amount} text-right`}>Amount</div>
            <div className={`${cell} ${W.del}`} />
          </div>
          <div className="flex bg-white border-b border-gray-400 px-3 pb-1.5 text-[9px] font-bold uppercase tracking-wide text-gray-600 gap-2">
            <div className={`${cell} ${W.godown}`} />
            {showBatch && (
              <div className={`${cell} ${W.batch} flex gap-1`}>
                <div className="flex-1">{trackMfg ? 'Mfg Dt.' : ''}</div>
                <div className="flex-1">{trackExpiry ? 'Expiry Date' : ''}</div>
              </div>
            )}
            <div className={`${cell} ${W.qty}`} />
            {showBilled && <div className={`${cell} ${W.qty}`} />}
            <div className={`${cell} ${W.rate}`} />
            <div className={`${cell} ${W.per}`} />
            {showDisc && <div className={`${cell} ${W.disc}`} />}
            <div className={`${cell} ${W.amount}`} />
            <div className={`${cell} ${W.del}`} />
          </div>

          {/* Allocations — each is a "Due on <period/date>" line + a data line */}
          <div>
            {rows.map((row, i) => (
              <div key={i} className="border-b border-gray-200">
                {/* Due on — editable (a date like 1-Jul-26 or a period like "9 Days") */}
                <div className="flex items-center px-3 pt-1.5 gap-2 text-[11px]">
                  <span className="italic text-gray-600">Due on</span>
                  <input
                    type="text"
                    data-oa-due={i}
                    value={row.due_on ?? ''}
                    onChange={(e) => update(i, { due_on: e.target.value })}
                    onKeyDown={enter(() => {
                      setOpenGodownRow(i);
                      focusSel(`[data-oa-godown="${i}"]`);
                    })}
                    placeholder="9 Days / 1-Jul-26"
                    className="text-[11px] px-1 py-0.5 bg-white border border-gray-400 outline-none focus:border-black font-mono w-28"
                  />
                </div>

                {/* Data line */}
                <div className="flex items-start px-3 py-1.5 gap-2">
                  {/* Godown — opens the List of Godowns */}
                  <div
                    className={`${cell} ${W.godown} relative`}
                    ref={(el) => {
                      godownRefs.current[i] = el;
                    }}
                  >
                    <button
                      type="button"
                      data-oa-godown={i}
                      onClick={() => setOpenGodownRow((r) => (r === i ? null : i))}
                      onKeyDown={enter(() => setOpenGodownRow(i))}
                      className={`${inputCls} text-left font-semibold truncate`}
                    >
                      {row.godown || 'Select…'}
                    </button>
                    {openGodownRow === i && (
                      <div className={ddCls}>
                        <div className={ddHeadCls}>List of Godowns</div>
                        <button
                          type="button"
                          onClick={() => pickGodown(i, 'Any')}
                          className="flex w-full text-left text-[11px] px-2 py-1 hover:bg-gray-100 border-b border-gray-100 font-semibold"
                        >
                          {ANY}
                        </button>
                        {godowns.map((g) => (
                          <button
                            key={g.godown_id ?? g.name}
                            type="button"
                            onClick={() => pickGodown(i, g.name)}
                            className="flex w-full items-center text-left text-[11px] px-2 py-1 hover:bg-gray-100 border-b border-gray-100"
                          >
                            <div className="flex-1 font-semibold truncate">{g.name}</div>
                            <div className="w-16 text-right font-mono text-gray-600">
                              {g.godown_id ? fmtQty(godownBal[g.godown_id]) : ''}
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Batch / Lot No. (+ Mfg / Expiry stacked) */}
                  {showBatch && (
                    <div
                      className={`${cell} ${W.batch} relative`}
                      ref={(el) => {
                        batchRefs.current[i] = el;
                      }}
                    >
                      <input
                        type="text"
                        data-oa-batch={i}
                        value={row.batch_number}
                        onChange={(e) => update(i, { batch_number: e.target.value })}
                        onFocus={() => setOpenListRow(i)}
                        onKeyDown={enter(() => {
                          setOpenListRow(null);
                          focusSel(`[data-oa-actual="${i}"]`);
                        })}
                        placeholder="Any / New Number…"
                        className={`${inputCls} font-semibold`}
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
                                type="date"
                                value={row.expiry_date ?? ''}
                                onChange={(e) => update(i, { expiry_date: e.target.value })}
                                className={`${inputCls} font-mono`}
                              />
                            )}
                          </div>
                        </div>
                      )}
                      {openListRow === i && (
                        <div className={ddCls}>
                          <div className={ddHeadCls}>List of Active Batches</div>
                          <div className="flex bg-white text-[9px] font-bold text-gray-600 px-2 py-1 border-b border-gray-300">
                            <div className="flex-1">Name</div>
                            <div className="w-16">Expiry</div>
                            <div className="w-14 text-right">Balance</div>
                          </div>
                          {/* New Number — opens the New Number popup to type a fresh lot (inward only). */}
                          {isInward && (
                            <button
                              type="button"
                              onClick={() => {
                                setOpenListRow(null);
                                setNewBatchRow(i);
                              }}
                              className="flex w-full justify-end text-[11px] px-2 py-1 hover:bg-gray-100 border-b border-gray-100 font-semibold"
                            >
                              New Number
                            </button>
                          )}
                          {/* Any — no specific lot. */}
                          <button
                            type="button"
                            onClick={() => pickBatch(i, 'Any')}
                            className="flex w-full text-left text-[11px] px-2 py-1 hover:bg-gray-100 border-b border-gray-100"
                          >
                            <div className="flex-1 font-semibold">{ANY}</div>
                          </button>
                          {/* Existing batches for this item (fetched). */}
                          {activeBatches.map((b) => (
                            <button
                              key={`b-${b.name}`}
                              type="button"
                              onClick={() => pickBatch(i, b.name)}
                              className="flex w-full text-left text-[11px] px-2 py-1 hover:bg-gray-100 border-b border-gray-100"
                            >
                              <div className="flex-1 font-semibold truncate">{b.name}</div>
                              <div className="w-16 font-mono text-gray-600">
                                {fmtDate(b.expiry_date)}
                              </div>
                              <div className="w-14 text-right font-mono text-gray-600">
                                {b.balance ? fmtQty(b.balance) : ''}
                              </div>
                            </button>
                          ))}
                          {/* Lots created here this session (no balance yet). */}
                          {createdBatches
                            .filter((n) => !activeBatches.some((b) => b.name === n))
                            .map((n) => (
                              <button
                                key={`c-${n}`}
                                type="button"
                                onClick={() => pickBatch(i, n)}
                                className="flex w-full text-left text-[11px] px-2 py-1 hover:bg-gray-100 border-b border-gray-100"
                              >
                                <div className="flex-1 font-semibold truncate">{n}</div>
                                <div className="w-16" />
                                <div className="w-14" />
                              </button>
                            ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Actual (single Quantity when Billed is hidden) */}
                  <div className={`${cell} ${W.qty}`}>
                    <input
                      type="number"
                      step="any"
                      data-oa-actual={i}
                      value={row.actual_quantity || ''}
                      onChange={(e) => setActual(i, Number(e.target.value) || 0)}
                      onKeyDown={enter(() =>
                        focusSel(`[data-oa-${showBilled ? 'billed' : 'rate'}="${i}"]`),
                      )}
                      className={`${inputCls} text-right font-mono`}
                    />
                  </div>
                  {/* Billed */}
                  {showBilled && (
                    <div className={`${cell} ${W.qty}`}>
                      <input
                        type="number"
                        step="any"
                        data-oa-billed={i}
                        value={row.quantity || ''}
                        onChange={(e) =>
                          update(i, { quantity: Number(e.target.value) || 0, billedTouched: true })
                        }
                        onKeyDown={enter(() => focusSel(`[data-oa-rate="${i}"]`))}
                        className={`${inputCls} text-right font-mono`}
                      />
                    </div>
                  )}
                  {/* Rate */}
                  <div className={`${cell} ${W.rate}`}>
                    <input
                      type="number"
                      step="any"
                      data-oa-rate={i}
                      value={row.rate || ''}
                      onChange={(e) => update(i, { rate: Number(e.target.value) || 0 })}
                      onKeyDown={enter(() =>
                        showDisc ? focusSel(`[data-oa-disc="${i}"]`) : completeRow(i),
                      )}
                      className={`${inputCls} text-right font-mono`}
                    />
                  </div>
                  {/* per */}
                  <div
                    className={`${cell} ${W.per} text-center text-[11px] text-gray-600 pt-1 font-mono`}
                  >
                    {unitSymbol ?? ''}
                  </div>
                  {/* Disc % — Enter completes the row → new "Due on". */}
                  {showDisc && (
                    <div className={`${cell} ${W.disc}`}>
                      <input
                        type="number"
                        step="any"
                        data-oa-disc={i}
                        value={row.disc_percent || ''}
                        onChange={(e) => update(i, { disc_percent: Number(e.target.value) || 0 })}
                        onKeyDown={enter(() => completeRow(i))}
                        className={`${inputCls} text-right font-mono`}
                      />
                    </div>
                  )}
                  {/* Amount */}
                  <div
                    className={`${cell} ${W.amount} text-right text-xs font-mono font-semibold pt-1`}
                  >
                    {num(lineAmount(row))}
                  </div>
                  {/* Remove */}
                  <div className={`${cell} ${W.del} text-center pt-0.5`}>
                    <button
                      type="button"
                      onClick={() => removeRow(i)}
                      className="text-gray-400 hover:text-black text-sm font-bold"
                    >
                      &times;
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Totals */}
          <div className="flex items-center px-3 py-2 bg-white border-t border-black gap-2 font-bold text-xs font-mono">
            <div className={`${cell} ${W.godown}`} />
            {showBatch && <div className={`${cell} ${W.batch}`} />}
            {showBilled && <div className={`${cell} ${W.qty} text-right`}>{totalActual || ''}</div>}
            <div className={`${cell} ${W.qty} text-right`}>{totalBilled || ''}</div>
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
            className="text-[10px] uppercase tracking-wide font-bold text-gray-600 hover:text-black border border-gray-400 px-2.5 py-1 hover:bg-gray-100"
          >
            + Add Allocation
          </button>
          <span className="text-xs font-mono font-semibold text-black">
            Total: {totalBilled} {unitSymbol ?? ''}
          </span>
        </div>
      </div>

      {/* New Number — type a fresh batch/lot; it then joins the List of Active Batches. */}
      {newBatchRow !== null && (
        <NewNumberPopup
          title="New Number"
          label="Batch / Lot No."
          onConfirm={(v) => {
            const i = newBatchRow;
            setCreatedBatches((prev) => (prev.includes(v) ? prev : [...prev, v]));
            update(i, { batch_number: v });
            setNewBatchRow(null);
            focusSel(`[data-oa-actual="${i}"]`);
          }}
          onClose={() => setNewBatchRow(null)}
        />
      )}
    </VoucherPopupShell>
  );
}
