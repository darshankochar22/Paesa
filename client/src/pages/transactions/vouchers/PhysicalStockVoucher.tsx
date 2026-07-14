import { useState } from 'react';
import type { useVoucherForm } from '../hooks/useVoucherForm';
import { isFeatureEnabled } from '@/lib/companyFeatures';

interface Props {
  form: ReturnType<typeof useVoucherForm>;
  focusStockQty: (idx: number) => void;
  focusStockRate: (idx: number) => void;
  proceedToNextStockRow: (idx: number) => void;
  /** Enter on Quantity → add another godown row for the SAME item (Tally flow). */
  physicalStockQtyEnter: (idx: number) => void;
}

export default function PhysicalStockVoucher({ form, physicalStockQtyEnter }: Props) {
  const [openBatchRow, setOpenBatchRow] = useState<string | null>(null);
  const [newBatchRow, setNewBatchRow] = useState<string | null>(null);
  const [newBatchValue, setNewBatchValue] = useState('');
  const confirmNewBatch = () => {
    if (newBatchRow === null) return;
    const idx = form.stockEntries.findIndex((r) => r.id === newBatchRow);
    form.handleUpdateStockRow(newBatchRow, { batchNo: newBatchValue.trim() });
    setNewBatchRow(null);
    setTimeout(() => {
      (document.querySelector(`[data-stock-mfg="${idx + 1}"]`) as HTMLInputElement | null)?.focus();
    }, 30);
  };
  return (
    <>
      {/* Voucher heading */}
      <div className="text-center font-bold text-sm py-1 border-b border-zinc-300 shrink-0 bg-white">
        Physical Stock Verification
      </div>

      {/* Physical Stock Table Header */}
      <div className="flex border-b border-black shrink-0 px-3 py-0.5 bg-zinc-100 text-xs font-bold text-zinc-800">
        <div className="flex-1 min-w-[200px]">Name of Item</div>
        <div className="w-32">Godown</div>
        <div className="w-24">Batch / Lot</div>
        <div className="w-24">Mfg Date</div>
        <div className="w-24">Expiry Date</div>
        <div className="w-24 text-right">Quantity</div>
        <div className="w-28 text-right">Amount</div>
      </div>

      <div className="flex-1 overflow-y-auto min-h-0 bg-white">
        {form.stockEntries.map((row, idx) => {
          const isActive =
            form.activeField?.type === 'stockItem' && form.activeField.rowId === row.id;
          const isGodownActive =
            form.activeField?.type === 'stockGodown' && form.activeField.rowId === row.id;

          // Item name shows once per consecutive same-item group; the godown rows
          // beneath it inherit the item. Batch columns only for batch-tracked items.
          const prevRow = idx > 0 ? form.stockEntries[idx - 1] : null;
          const isFirstOfGroup =
            !prevRow || !prevRow.stockItem || prevRow.stockItem.item_id !== row.stockItem?.item_id;
          // F11 gate: batch column only when "Enable Batches" is on AND the item is
          // batch-tracked; expiry column additionally needs the expiry-date flag.
          const isBatch =
            isFeatureEnabled(form.features, 'enable_batches') &&
            Number((row.stockItem as any)?.track_batches) === 1;
          const showExpiry =
            isBatch && isFeatureEnabled(form.features, 'maintain_expiry_date_for_batches');

          return (
            <div
              key={row.id}
              className="flex items-center border-b border-zinc-100 min-h-[26px] group px-3 py-1 hover:bg-zinc-50"
            >
              {/* Item Name — only on the first row of each item group */}
              <div className="flex-1 min-w-[200px] flex items-center gap-1">
                {isFirstOfGroup ? (
                  <input
                    data-stock-item={idx + 1}
                    type="text"
                    className="flex-1 text-xs bg-transparent outline-none px-1 border border-transparent focus:border-zinc-800 font-mono font-semibold"
                    value={isActive ? form.stockSearchTerm : (row.stockItem?.name ?? '')}
                    placeholder={idx === 0 ? 'Select Item…' : ''}
                    onFocus={() => form.handleFieldFocus({ type: 'stockItem', rowId: row.id })}
                    onChange={(e) => {
                      form.setStockSearchTerm(e.target.value);
                      if (!row.stockItem)
                        form.handleFieldFocus({ type: 'stockItem', rowId: row.id });
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && row.stockItem) {
                        e.preventDefault();
                        (
                          document.querySelector(
                            `[data-stock-godown="${idx + 1}"]`,
                          ) as HTMLInputElement | null
                        )?.focus();
                      }
                    }}
                    autoComplete="off"
                  />
                ) : (
                  <span className="flex-1 px-1" />
                )}
                {form.stockEntries.length > 1 && (
                  <button
                    type="button"
                    tabIndex={-1}
                    onClick={() => form.handleRemoveStockRow(row.id)}
                    className="text-xs text-zinc-300 hover:text-red-500 opacity-0 group-hover:opacity-100 shrink-0"
                  >
                    &times;
                  </button>
                )}
              </div>

              {/* Godown */}
              <div className="w-32">
                <input
                  data-stock-godown={idx + 1}
                  type="text"
                  className="w-full text-xs bg-transparent outline-none px-1 border border-transparent focus:border-zinc-800 font-mono"
                  value={isGodownActive ? form.ledgerSearchTerm : (row.godown?.name ?? '')}
                  placeholder="Select Godown…"
                  onFocus={() => form.handleFieldFocus({ type: 'stockGodown', rowId: row.id })}
                  onChange={(e) => form.setLedgerSearchTerm(e.target.value)}
                  onKeyDown={(e) => {
                    // Godown picked → next field. Enter on an EMPTY godown is handled by
                    // the List of Godowns (onEnterEmpty → next item; End of List → narration).
                    if (e.key === 'Enter' && row.godown) {
                      e.preventDefault();
                      const sel = isBatch
                        ? `[data-stock-batch="${idx + 1}"]`
                        : `[data-stock-qty="${idx + 1}"]`;
                      (document.querySelector(sel) as HTMLInputElement | null)?.focus();
                    }
                  }}
                  autoComplete="off"
                />
              </div>

              {/* Batch / Lot — batch-tracked items only; opens List of Active Batches */}
              <div className="w-24 relative">
                {isBatch && (
                  <>
                    <input
                      data-stock-batch={idx + 1}
                      type="text"
                      className="w-full text-xs bg-transparent outline-none px-1 border border-transparent focus:border-zinc-800 font-mono"
                      value={row.batchNo || ''}
                      placeholder="Batch No…"
                      onFocus={() => {
                        setOpenBatchRow(row.id);
                        form.fetchActiveBatches(row.stockItem?.item_id);
                      }}
                      onChange={(e) =>
                        form.handleUpdateStockRow(row.id, { batchNo: e.target.value })
                      }
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          setOpenBatchRow(null);
                          (
                            document.querySelector(
                              `[data-stock-mfg="${idx + 1}"]`,
                            ) as HTMLInputElement | null
                          )?.focus();
                        }
                        if (e.key === 'Escape') setOpenBatchRow(null);
                      }}
                      autoComplete="off"
                    />
                    {openBatchRow === row.id && (
                      <>
                        <div className="fixed inset-0 z-20" onClick={() => setOpenBatchRow(null)} />
                        <div className="absolute left-0 top-full mt-0.5 z-30 w-64 bg-white border border-zinc-500 shadow-xl">
                          <div className="bg-zinc-800 text-white text-[11px] font-bold px-2 py-1 flex justify-between items-center">
                            <span>List of Active Batches</span>
                            <button
                              type="button"
                              onMouseDown={(e) => {
                                e.preventDefault();
                                setOpenBatchRow(null);
                                setNewBatchValue('');
                                setNewBatchRow(row.id);
                              }}
                              className="hover:underline"
                            >
                              New Number
                            </button>
                          </div>
                          <div className="grid grid-cols-[1fr_auto_auto] gap-x-3 px-2 py-0.5 text-[10px] font-semibold border-b border-zinc-300 text-zinc-700">
                            <span>Name</span>
                            <span className="text-right">Expiry</span>
                            <span className="text-right">Balance</span>
                          </div>
                          <div className="max-h-48 overflow-y-auto">
                            {form.activeBatches.filter(
                              (b) =>
                                !row.batchNo ||
                                b.name.toLowerCase().includes((row.batchNo || '').toLowerCase()),
                            ).length === 0 && (
                              <div className="px-2 py-1 text-xs text-zinc-400 italic">
                                No active batches — type a New Number
                              </div>
                            )}
                            {form.activeBatches
                              .filter(
                                (b) =>
                                  !row.batchNo ||
                                  b.name.toLowerCase().includes((row.batchNo || '').toLowerCase()),
                              )
                              .map((b) => (
                                <button
                                  key={b.name}
                                  type="button"
                                  onMouseDown={(e) => {
                                    e.preventDefault();
                                    form.handleUpdateStockRow(row.id, {
                                      batchNo: b.name,
                                      expiryDate: b.expiry || row.expiryDate,
                                    });
                                    setOpenBatchRow(null);
                                    (
                                      document.querySelector(
                                        `[data-stock-mfg="${idx + 1}"]`,
                                      ) as HTMLInputElement | null
                                    )?.focus();
                                  }}
                                  className="grid grid-cols-[1fr_auto_auto] gap-x-3 w-full text-left px-2 py-1 text-xs hover:bg-zinc-100"
                                >
                                  <span className="truncate font-semibold">{b.name}</span>
                                  <span className="text-right font-mono">{b.expiry}</span>
                                  <span className="text-right font-mono">
                                    {b.balance
                                      ? `${b.balance.toLocaleString('en-IN')}${row.unit?.symbol ? ` ${row.unit.symbol}` : ''}`
                                      : ''}
                                  </span>
                                </button>
                              ))}
                          </div>
                        </div>
                      </>
                    )}
                  </>
                )}
              </div>

              {/* Mfg Date — batch-tracked items only */}
              <div className="w-24">
                {isBatch && (
                  <input
                    data-stock-mfg={idx + 1}
                    type="text"
                    className="w-full text-xs bg-transparent outline-none px-1 border border-transparent focus:border-zinc-800 font-mono"
                    value={row.mfgDate || ''}
                    placeholder="YYYY-MM-DD"
                    onChange={(e) => form.handleUpdateStockRow(row.id, { mfgDate: e.target.value })}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        // Skip to Quantity when the Expiry column is hidden (F11 off).
                        const sel = showExpiry
                          ? `[data-stock-expiry="${idx + 1}"]`
                          : `[data-stock-qty="${idx + 1}"]`;
                        (document.querySelector(sel) as HTMLInputElement | null)?.focus();
                      }
                    }}
                  />
                )}
              </div>

              {/* Expiry Date — batch-tracked items only, F11 expiry flag on */}
              <div className="w-24">
                {showExpiry && (
                  <input
                    data-stock-expiry={idx + 1}
                    type="text"
                    className="w-full text-xs bg-transparent outline-none px-1 border border-transparent focus:border-zinc-800 font-mono"
                    value={row.expiryDate || ''}
                    placeholder="date / 6 Months"
                    onChange={(e) =>
                      form.handleUpdateStockRow(row.id, { expiryDate: e.target.value })
                    }
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        (
                          document.querySelector(
                            `[data-stock-qty="${idx + 1}"]`,
                          ) as HTMLInputElement | null
                        )?.focus();
                      }
                    }}
                  />
                )}
              </div>

              {/* Quantity */}
              <div className="w-24 text-right pr-1">
                <input
                  data-stock-qty={idx + 1}
                  type="text"
                  inputMode="decimal"
                  className="w-full text-right text-xs bg-transparent outline-none px-1 border border-transparent focus:border-zinc-800 font-mono font-semibold"
                  value={row.quantityRaw}
                  onChange={(e) =>
                    form.handleUpdateStockRow(row.id, { quantityRaw: e.target.value })
                  }
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      // Tally flow: do not go to Amount — add another godown row for this item.
                      physicalStockQtyEnter(idx);
                    }
                  }}
                />
              </div>

              {/* Amount */}
              <div className="w-28 text-right text-xs font-semibold font-mono text-zinc-900 select-none">
                {row.amountRaw
                  ? Number(row.amountRaw).toLocaleString('en-IN', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })
                  : ''}
              </div>
            </div>
          );
        })}

        {/* Filler rows */}
        {Array.from({ length: Math.max(0, 8 - form.stockEntries.length) }).map((_, i) => (
          <div key={`sf-${i}`} className="flex border-b border-zinc-50 min-h-[26px] px-3" />
        ))}
      </div>

      {/* New Number — create a new batch number */}
      {newBatchRow !== null && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/30">
          <div className="bg-white border border-black shadow-2xl w-80">
            <div className="border-b border-black px-3 py-1 text-center text-sm font-bold">
              New Number
            </div>
            <div className="p-4">
              <input
                autoFocus
                type="text"
                value={newBatchValue}
                onChange={(e) => setNewBatchValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    confirmNewBatch();
                  }
                  if (e.key === 'Escape') {
                    e.preventDefault();
                    setNewBatchRow(null);
                  }
                }}
                className="w-full text-sm border border-gray-400 px-1 py-1 outline-none focus:border-black bg-yellow-50"
              />
            </div>
            <div className="border-t border-black px-3 py-2 flex justify-end gap-2 bg-gray-50">
              <button
                onClick={() => setNewBatchRow(null)}
                className="text-xs px-3 py-1 border border-black hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                onClick={confirmNewBatch}
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
