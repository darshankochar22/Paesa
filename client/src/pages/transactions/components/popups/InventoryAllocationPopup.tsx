import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import type { StockItemType, GodownType, UnitType } from '@/types/api';
import type { BatchAllocation, InventoryAllocationItem } from '../../types';
import BatchAllocationPopup from './BatchAllocationPopup';
import CostCentreAllocationPopup from './CostCentreAllocationPopup';
import { VoucherPopupShell } from '@/components/tally-ui/VoucherPopupShell';
import { useCompany } from '@/context/CompanyContext';

// TallyPrime "Inventory Allocations for : <ledger>" sub-screen. Opened when an
// inventory-affecting ledger (Purchase/Sales A/c) is selected in a Journal /
// Reversing Journal. Holds the stock lines for that ledger; each item drills into
// the Item Allocations (godown/batch) popup and then the Cost Centre popup, both
// reused as-is. Strict grayscale per UI.md.

interface Props {
  companyId: number;
  ledgerName: string;
  dcType: 'Dr' | 'Cr';
  /** Purchase ledger brings stock in (inward); Sales sends it out (outward). Only
   *  affects the batch popup's New-Number label. */
  isInward: boolean;
  /** Ledger has "cost centres are applicable" — chain into the Cost Centre popup
   *  after each item's allocation (Tally only prompts cost centres when enabled). */
  allowCostCentres: boolean;
  voucherDate: string; // ISO yyyy-mm-dd
  allStockItems: StockItemType[];
  allGodowns: GodownType[];
  allUnits: UnitType[];
  initialItems?: InventoryAllocationItem[];
  onClose: () => void;
  onSave: (items: InventoryAllocationItem[]) => void;
}

const num = (v: number) =>
  v ? v.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '';

export default function InventoryAllocationPopup({
  companyId,
  ledgerName,
  dcType,
  isInward,
  allowCostCentres,
  voucherDate,
  allStockItems,
  allGodowns,
  allUnits,
  initialItems = [],
  onClose,
  onSave,
}: Props) {
  const [items, setItems] = useState<InventoryAllocationItem[]>(
    initialItems.map((i) => ({ ...i })),
  );
  const [search, setSearch] = useState('');
  const [showList, setShowList] = useState(false);
  // F11 "Use separate Actual and Billed Quantity columns" — single qty column when No.
  const { features } = useCompany();
  const showBilled = features?.use_separate_actual_billed_qty !== 0;
  // Item Allocations (godown/batch) popup context. editIndex = row being edited,
  // or null when the item is being freshly added.
  const [batchFor, setBatchFor] = useState<{
    item: StockItemType;
    editIndex: number | null;
  } | null>(null);
  // Cost Centre popup for items[index].
  const [costFor, setCostFor] = useState<{ index: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ccNames, setCcNames] = useState<Record<number, string>>({});
  const listRef = useRef<HTMLDivElement | null>(null);
  const dropdownRef = useRef<HTMLDivElement | null>(null);
  // Portaled to <body> with fixed coordinates (below) — the "Select item…" row
  // sits inside a scrollable (overflow-y-auto) body, so a plain absolute-positioned
  // dropdown gets clipped by that ancestor instead of floating over the popup.
  const [dropdownPos, setDropdownPos] = useState<{
    top: number;
    left: number;
    width: number;
  } | null>(null);

  // Cost-centre names, for enriching allocations so the main voucher can show them.
  useEffect(() => {
    if (!companyId) return;
    window.api.costCentre
      .getAll(companyId)
      .then((res: any) => {
        if (res?.success) {
          const map: Record<number, string> = {};
          (res.costCentres ?? []).forEach((c: any) => {
            map[c.cc_id] = c.name;
          });
          setCcNames(map);
        }
      })
      .catch(() => {});
  }, [companyId]);

  useEffect(() => {
    if (!showList) return;
    const onDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        listRef.current &&
        !listRef.current.contains(target) &&
        dropdownRef.current &&
        !dropdownRef.current.contains(target)
      ) {
        setShowList(false);
      }
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [showList]);

  // Recompute the portaled dropdown's position whenever it opens, and while the
  // popup's scrollable body (or the window) moves it — otherwise the list would
  // float in a stale spot instead of tracking the "Select item…" row.
  useEffect(() => {
    if (!showList) {
      setDropdownPos(null);
      return;
    }
    const reposition = () => {
      const el = listRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      setDropdownPos({ top: r.bottom + 4, left: r.left, width: 280 });
    };
    reposition();
    window.addEventListener('scroll', reposition, true);
    window.addEventListener('resize', reposition);
    return () => {
      window.removeEventListener('scroll', reposition, true);
      window.removeEventListener('resize', reposition);
    };
  }, [showList]);

  const totalActual = items.reduce((s, i) => s + (Number(i.actual_quantity) || 0), 0);
  const totalBilled = items.reduce((s, i) => s + (Number(i.quantity) || 0), 0);
  const totalAmount = items.reduce((s, i) => s + (Number(i.amount) || 0), 0);
  // Quantity totals only make sense in one unit — blank them for mixed units.
  const mixedUnits = new Set(items.map((i) => i.unit_symbol ?? '')).size > 1;

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return allStockItems.filter((s) => !q || s.name.toLowerCase().includes(q));
  }, [allStockItems, search]);

  // Build an item line from its godown/batch split. Amount is explicit
  // rate × qty × (1 − disc%); the line keeps the *entered* (gross) rate and the
  // discount separately instead of folding the discount into a net rate.
  const buildItem = useCallback(
    (
      stockItem: StockItemType,
      allocations: BatchAllocation[],
      keepCostCentres?: InventoryAllocationItem['cost_centres'],
    ): InventoryAllocationItem & { disc_percent?: number } => {
      const actual = allocations.reduce(
        (s, a) => s + (Number(a.actual_quantity ?? a.quantity) || 0),
        0,
      );
      const billed = allocations.reduce((s, a) => s + (Number(a.quantity) || 0), 0);
      const gross = allocations.reduce(
        (s, a) => s + (Number(a.quantity) || 0) * (Number(a.rate) || 0),
        0,
      );
      const amount = allocations.reduce(
        (s, a) =>
          s +
          (Number(a.quantity) || 0) *
            (Number(a.rate) || 0) *
            (1 - (Number(a.disc_percent) || 0) / 100),
        0,
      );
      // Entered rate (qty-weighted across the split), not the discount-net rate.
      const rate = billed > 0 ? gross / billed : 0;
      // Effective discount across the split (additive key on the saved line).
      const discPercent = gross > 0 ? Math.round((1 - amount / gross) * 10000) / 100 : 0;
      const firstGodown = allocations.find((a) => a.godown)?.godown;
      const godown = firstGodown ? allGodowns.find((g) => g.name === firstGodown) : null;
      const unit = allUnits.find((u) => u.unit_id === stockItem.unit_id) ?? null;
      return {
        stock_item_id: stockItem.item_id ?? 0,
        item_name: stockItem.name,
        godown_id: godown?.godown_id ?? null,
        unit_id: unit?.unit_id ?? null,
        unit_symbol: unit?.symbol,
        actual_quantity: actual,
        quantity: billed,
        rate,
        amount,
        disc_percent: discPercent || undefined,
        batches: allocations,
        cost_centres: keepCostCentres,
      };
    },
    [allGodowns, allUnits],
  );

  const pickItem = (stockItem: StockItemType) => {
    setSearch('');
    setShowList(false);
    setError(null);
    setBatchFor({ item: stockItem, editIndex: null });
  };

  const editItem = (index: number) => {
    const it = items[index];
    const stockItem = allStockItems.find((s) => s.item_id === it.stock_item_id);
    if (stockItem) setBatchFor({ item: stockItem, editIndex: index });
  };

  const removeItem = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleBatchSave = (allocations: BatchAllocation[]) => {
    if (!batchFor) return;
    const { item, editIndex } = batchFor;
    const prevCostCentres = editIndex !== null ? items[editIndex]?.cost_centres : undefined;
    const built = buildItem(item, allocations, prevCostCentres);
    let targetIndex: number;
    if (editIndex !== null) {
      setItems((prev) => prev.map((r, i) => (i === editIndex ? built : r)));
      targetIndex = editIndex;
    } else {
      targetIndex = items.length;
      setItems((prev) => [...prev, built]);
    }
    setBatchFor(null);
    // Chain into Cost Centre allocation only when the ledger has cost centres
    // applicable (Tally prompts them per-ledger) and the company actually has some.
    if (allowCostCentres && Object.keys(ccNames).length > 0) setCostFor({ index: targetIndex });
  };

  const handleCostSave = (ccs: { cost_centre_id: number; amount: number }[]) => {
    if (!costFor) return;
    const enriched = ccs.map((c) => ({ ...c, cost_centre_name: ccNames[c.cost_centre_id] }));
    setItems((prev) =>
      prev.map((r, i) => (i === costFor.index ? { ...r, cost_centres: enriched } : r)),
    );
    setCostFor(null);
  };

  const handleAccept = useCallback(() => {
    if (items.length === 0) {
      setError('Add at least one stock item.');
      return;
    }
    onSave(items);
  }, [items, onSave]);

  // Shell handles Esc / Alt+A; suppress both while a child popup (batch / cost
  // centre) is open so its own keys don't also close/accept this parent.
  const shellClose = () => {
    if (!batchFor && !costFor) onClose();
  };
  const shellAccept = () => {
    if (!batchFor && !costFor) handleAccept();
  };

  const cell = 'shrink-0';
  const W = {
    name: 'flex-1 min-w-[160px]',
    qty: 'w-40',
    rate: 'w-24',
    per: 'w-10',
    amount: 'w-28',
    del: 'w-5',
  };

  return (
    <>
      <VoucherPopupShell
        title="Inventory Allocations"
        headerRight={
          <span>
            for : <span className="font-bold text-black">{ledgerName}</span>
          </span>
        }
        onClose={shellClose}
        onAccept={shellAccept}
      >
        <div className="space-y-3">
          {error && (
            <div className="border border-black text-black text-xs px-3 py-2 flex justify-between items-center font-bold">
              <span>• {error}</span>
              <button onClick={() => setError(null)} className="font-bold">
                &times;
              </button>
            </div>
          )}

          <div className="border border-gray-300">
            {/* Header row 1 */}
            <div className="flex bg-white px-3 pt-1.5 text-[10px] font-bold uppercase tracking-wide text-black gap-2 select-none">
              <div className={`${cell} ${W.name}`}>Name of Item</div>
              <div className={`${cell} ${W.qty} text-center`}>Quantity</div>
              <div className={`${cell} ${W.rate} text-right`}>Rate</div>
              <div className={`${cell} ${W.per} text-center`}>per</div>
              <div className={`${cell} ${W.amount} text-right`}>Amount</div>
              <div className={`${cell} ${W.del}`} />
            </div>
            {/* Header row 2 */}
            <div className="flex bg-white border-b border-gray-400 px-3 pb-1.5 text-[9px] font-bold uppercase tracking-wide text-gray-600 gap-2 select-none">
              <div className={`${cell} ${W.name}`} />
              <div className={`${cell} ${W.qty} flex gap-1`}>
                {showBilled ? (
                  <>
                    <div className="flex-1 text-right">Actual</div>
                    <div className="flex-1 text-right">Billed</div>
                  </>
                ) : (
                  <div className="flex-1 text-right">Quantity</div>
                )}
              </div>
              <div className={`${cell} ${W.rate}`} />
              <div className={`${cell} ${W.per}`} />
              <div className={`${cell} ${W.amount}`} />
              <div className={`${cell} ${W.del}`} />
            </div>

            {/* Item rows */}
            <div className="divide-y divide-gray-200">
              {items.map((it, i) => (
                <div key={i}>
                  <div className="flex items-center px-3 py-1.5 gap-2 text-xs">
                    <button
                      type="button"
                      onClick={() => editItem(i)}
                      className={`${cell} ${W.name} text-left font-semibold text-black hover:underline`}
                    >
                      {it.item_name}
                    </button>
                    <div className={`${cell} ${W.qty} flex gap-1 font-mono`}>
                      {showBilled && (
                        <div className="flex-1 text-right">
                          {it.actual_quantity
                            ? `${it.actual_quantity} ${it.unit_symbol ?? ''}`.trim()
                            : ''}
                        </div>
                      )}
                      <div className="flex-1 text-right">
                        {it.quantity ? `${it.quantity} ${it.unit_symbol ?? ''}`.trim() : ''}
                      </div>
                    </div>
                    <div className={`${cell} ${W.rate} text-right font-mono`}>{num(it.rate)}</div>
                    <div className={`${cell} ${W.per} text-center font-mono text-gray-600`}>
                      {it.unit_symbol ?? ''}
                    </div>
                    <div className={`${cell} ${W.amount} text-right font-mono font-semibold`}>
                      {num(it.amount)}
                    </div>
                    <div className={`${cell} ${W.del} text-center`}>
                      <button
                        type="button"
                        onClick={() => removeItem(i)}
                        className="text-gray-400 hover:text-black text-sm font-bold"
                      >
                        &times;
                      </button>
                    </div>
                  </div>
                  {/* Cost centre sub-lines */}
                  {it.cost_centres?.length ? (
                    <div className="pl-4 pb-1.5 text-[10px] text-gray-600 leading-tight">
                      <div className="italic text-gray-500">Primary Cost Category</div>
                      {it.cost_centres.map((cc, ci) => (
                        <div key={ci} className="flex justify-between pr-16">
                          <span className="pl-3 font-semibold">
                            {cc.cost_centre_name ??
                              ccNames[cc.cost_centre_id] ??
                              `#${cc.cost_centre_id}`}
                          </span>
                          <span className="font-mono">
                            {num(cc.amount)} {dcType}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>
              ))}

              {/* New-item entry row */}
              <div className="flex items-center px-3 py-1.5 gap-2 relative" ref={listRef}>
                <div className={`${cell} ${W.name}`}>
                  <input
                    type="text"
                    value={search}
                    placeholder="Select item…"
                    onChange={(e) => {
                      setSearch(e.target.value);
                      setShowList(true);
                    }}
                    onFocus={() => setShowList(true)}
                    className="w-full text-xs px-1.5 py-1 border border-gray-400 outline-none focus:border-black bg-white"
                    autoComplete="off"
                  />
                  {showList &&
                    dropdownPos &&
                    createPortal(
                      <div
                        ref={dropdownRef}
                        style={{
                          position: 'fixed',
                          top: dropdownPos.top,
                          left: dropdownPos.left,
                          width: dropdownPos.width,
                        }}
                        className="bg-white border border-gray-400 shadow-xl z-[60] max-h-56 overflow-y-auto"
                      >
                        <div className="bg-white text-black text-[10px] font-bold px-2 py-1 border-b border-gray-300 sticky top-0">
                          List of Stock Items
                        </div>
                        {filtered.length === 0 ? (
                          <div className="px-2 py-2 text-[11px] text-gray-500 italic">No items</div>
                        ) : (
                          filtered.map((s) => (
                            <button
                              key={s.item_id ?? s.name}
                              type="button"
                              onClick={() => pickItem(s)}
                              className="flex w-full text-left text-[11px] px-2 py-1 hover:bg-gray-100 border-b border-gray-100 font-semibold"
                            >
                              {s.name}
                            </button>
                          ))
                        )}
                      </div>,
                      document.body,
                    )}
                </div>
                <div className={`${cell} ${W.qty}`} />
                <div className={`${cell} ${W.rate}`} />
                <div className={`${cell} ${W.per}`} />
                <div className={`${cell} ${W.amount}`} />
                <div className={`${cell} ${W.del}`} />
              </div>
            </div>

            {/* Totals row */}
            <div className="flex items-center px-3 py-2 border-t border-black gap-2 font-bold text-xs font-mono">
              <div className={`${cell} ${W.name}`} />
              <div className={`${cell} ${W.qty} flex gap-1`}>
                {showBilled && (
                  <div className="flex-1 text-right">{mixedUnits ? '' : totalActual || ''}</div>
                )}
                <div className="flex-1 text-right">{mixedUnits ? '' : totalBilled || ''}</div>
              </div>
              <div className={`${cell} ${W.rate}`} />
              <div className={`${cell} ${W.per}`} />
              <div className={`${cell} ${W.amount} text-right`}>{num(totalAmount)}</div>
              <div className={`${cell} ${W.del}`} />
            </div>
          </div>
        </div>
      </VoucherPopupShell>

      {/* Item Allocations (godown / batch) — reused as-is. Batch column shown only
          for items that maintain batches (showBatch), godown-only otherwise. */}
      {batchFor && (
        <BatchAllocationPopup
          companyId={companyId}
          itemId={batchFor.item.item_id ?? 0}
          itemName={batchFor.item.name}
          // Seed from the line being edited (its saved qty/rate), or for a fresh
          // item from the master's opening_rate — never a hardcoded 0.
          totalQuantity={
            batchFor.editIndex !== null ? (items[batchFor.editIndex]?.quantity ?? 0) : 0
          }
          rate={
            batchFor.editIndex !== null
              ? (items[batchFor.editIndex]?.rate ?? (Number(batchFor.item.opening_rate) || 0))
              : Number(batchFor.item.opening_rate) || 0
          }
          unitSymbol={allUnits.find((u) => u.unit_id === batchFor.item.unit_id)?.symbol}
          voucherDate={voucherDate}
          trackMfg={Number(batchFor.item.track_date_of_manufacturing) === 1}
          trackExpiry={Number(batchFor.item.track_expiry) === 1}
          isInward={isInward}
          godowns={allGodowns.map((g) => ({ godown_id: g.godown_id, name: g.name }))}
          initialAllocations={
            batchFor.editIndex !== null ? items[batchFor.editIndex]?.batches : undefined
          }
          quantityDriven
          showBatch={Number(batchFor.item.track_batches) === 1}
          onClose={() => setBatchFor(null)}
          onSave={handleBatchSave}
        />
      )}

      {/* Cost Centre allocation — reused as-is. Opens right after Item Allocations. */}
      {costFor && (
        <CostCentreAllocationPopup
          companyId={companyId}
          ledgerName={items[costFor.index]?.item_name ?? ledgerName}
          totalAmount={items[costFor.index]?.amount ?? 0}
          initialAllocations={items[costFor.index]?.cost_centres?.map((c) => ({
            cost_centre_id: c.cost_centre_id,
            amount: c.amount,
          }))}
          onClose={() => setCostFor(null)}
          onSave={handleCostSave}
        />
      )}
    </>
  );
}
