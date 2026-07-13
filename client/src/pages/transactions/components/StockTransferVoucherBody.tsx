import { useRef, useState } from 'react';
import type { useVoucherForm } from '../hooks/useVoucherForm';
import { useCompany } from '@/context/CompanyContext';
import { isFeatureEnabled } from '@/lib/companyFeatures';

/**
 * Shared body for the flex stock-grid vouchers (Material In/Out, Delivery/Receipt
 * Note, Rejection In/Out). They all render an identical Party field + stock-items
 * table + total; the only variation is an optional Sales/Purchase ledger row.
 */
export interface StockTransferVoucherConfig {
  /** When set, renders a Sales/Purchase ledger row under Party with this label. */
  salesPurchaseLabel?: string;
  /** When set, renders a header Source Godown selector with this label. */
  sourceGodownLabel?: string;
  /** Hide the per-row Godown column (godown chosen in the allocation popup). */
  hideGodownColumn?: boolean;
  /** Purchase-style grid: Quantity split into Actual/Billed, plus per & Disc %
   *  columns (used by Receipt Note — qty/rate flow through the allocation popup). */
  showActualBilled?: boolean;
  /** Order vouchers: show an "Order no." field on the right of the Party row. */
  showOrderNo?: boolean;
  /** Sales Order: show a "Price Level" dropdown just above the Order no. field. */
  showPriceLevel?: boolean;
  /** Receipt Note: render a "Reference No. / Date" row under the voucher header,
   *  and show ledger balances as Tally-style "Current balance" sub-rows. */
  showReferenceRow?: boolean;
}

// Raw signed balance (e.g. "-242000") → Tally label "2,42,000.00 Cr".
// Backend convention: positive = Dr, negative = Cr (voucherLedgerHelpers.js).
function fmtBalance(raw: string | number | null | undefined): string {
  if (raw === '' || raw == null) return '';
  const n = Number(raw);
  if (!isFinite(n)) return String(raw);
  if (Math.abs(n) < 0.01) return '0.00';
  const amt = Math.abs(n).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `${amt} ${n > 0 ? 'Dr' : 'Cr'}`;
}

interface Props {
  form: ReturnType<typeof useVoucherForm>;
  focusStockQty: (idx: number) => void;
  focusStockRate: (idx: number) => void;
  proceedToNextStockRow: (idx: number) => void;
  config?: StockTransferVoucherConfig;
}

export default function StockTransferVoucherBody({
  form,
  focusStockQty,
  focusStockRate,
  proceedToNextStockRow,
  config,
}: Props) {
  const [showGodownList, setShowGodownList] = useState(false);
  const [showPriceLevelList, setShowPriceLevelList] = useState(false);
  const priceLevelRef = useRef<HTMLDivElement>(null);

  // F11 gates — these order/note/material vouchers must respect the same flags as
  // Sales/Purchase. When off, the Actual/Billed split collapses to a single
  // Quantity column and the Price Level prompt is hidden.
  const { features } = useCompany();
  const showActualBilled =
    !!config?.showActualBilled && isFeatureEnabled(features, 'use_separate_actual_billed_qty');
  const showPriceLevel =
    !!config?.showPriceLevel && isFeatureEnabled(features, 'enable_multiple_price_levels');
  return (
    <>
      {/* Reference No. / Date (Receipt Note) */}
      {config?.showReferenceRow && (
        <div className="flex items-center border-b border-zinc-200 px-3 py-1 bg-white shrink-0">
          <span className="text-xs text-zinc-600 w-24 shrink-0">Reference No.</span>
          <span className="text-xs text-zinc-400 mr-2">:</span>
          <input
            type="text"
            className="w-44 text-xs bg-transparent outline-none px-1 border-b border-zinc-300 focus:border-zinc-800 font-mono font-semibold"
            value={form.referenceNumber ?? ''}
            onChange={(e) => form.setReferenceNumber(e.target.value)}
            autoComplete="off"
          />
          <span className="text-xs text-zinc-600 ml-8 mr-2 shrink-0">Date</span>
          <span className="text-xs text-zinc-400 mr-2">:</span>
          <input
            type="date"
            className="text-xs bg-transparent outline-none px-1 border-b border-zinc-300 focus:border-zinc-800 font-mono"
            value={form.referenceDate ?? ''}
            onChange={(e) => form.setReferenceDate(e.target.value)}
          />
        </div>
      )}

      {/* Party A/c Name */}
      <div className="flex items-center border-b border-zinc-200 px-3 py-1 bg-white shrink-0">
        <span className="text-xs text-zinc-600 w-24 shrink-0">Party A/c Name</span>
        <span className="text-xs text-zinc-400 mr-2">:</span>
        <input
          type="text"
          className="flex-1 text-xs bg-transparent outline-none px-1 border border-transparent focus:border-zinc-800 font-mono font-semibold"
          value={form.partyLedger?.name ?? ''}
          placeholder="Select Party…"
          onFocus={() => form.handleFieldFocus({ type: 'party' })}
          onChange={(_e) => {
            if (!form.partyLedger) form.handleFieldFocus({ type: 'party' });
          }}
          autoComplete="off"
        />
        {!config?.showReferenceRow && form.partyBalance && (
          <span className="text-xs text-zinc-500 ml-2 shrink-0 tabular-nums">
            {fmtBalance(form.partyBalance)}
          </span>
        )}
        {(showPriceLevel || config?.showOrderNo) && (
          <div className="flex flex-col gap-0.5 ml-4 shrink-0">
            {showPriceLevel && (
              <div className="flex items-center relative" ref={priceLevelRef}>
                <span className="text-xs text-zinc-600 mr-2 shrink-0">Price Level</span>
                <span className="text-xs text-zinc-400 mr-1">:</span>
                <button
                  type="button"
                  className="text-xs bg-transparent outline-none font-mono font-semibold text-zinc-700 hover:underline"
                  onClick={() => setShowPriceLevelList((v) => !v)}
                >
                  {form.priceLevel || '♦ Not Applicable'}
                </button>
                {showPriceLevelList && (
                  <div className="absolute right-0 top-full z-50 w-52 bg-white border border-zinc-400 shadow-xl">
                    <div className="bg-zinc-900 text-white text-[11px] font-bold px-2 py-1">
                      List of Price Levels
                    </div>
                    <div className="max-h-48 overflow-y-auto">
                      <div
                        className="px-2 py-1 text-xs hover:bg-zinc-100 cursor-pointer"
                        onClick={() => {
                          form.setPriceLevel('');
                          setShowPriceLevelList(false);
                        }}
                      >
                        ♦ Not Applicable
                      </div>
                      {(form.allPriceLevels ?? []).map((name: string) => (
                        <div
                          key={name}
                          className="px-2 py-1 text-xs hover:bg-zinc-100 cursor-pointer"
                          onClick={() => {
                            form.setPriceLevel(name);
                            setShowPriceLevelList(false);
                          }}
                        >
                          {name}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
            {config?.showOrderNo && (
              <div className="flex items-center">
                <span className="text-xs text-zinc-600 mr-2 shrink-0">Order no.</span>
                <input
                  type="text"
                  className="w-24 text-xs bg-transparent outline-none px-1 border-b border-zinc-300 focus:border-zinc-800 font-mono font-semibold text-right"
                  value={form.orderDetails?.order_nos ?? ''}
                  onChange={(e) =>
                    form.setOrderDetails({
                      ...(form.orderDetails || {}),
                      order_nos: e.target.value,
                    })
                  }
                  placeholder="1"
                  autoComplete="off"
                />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Current balance (Tally sub-row) */}
      {config?.showReferenceRow && form.partyBalance && (
        <div className="flex items-center border-b border-zinc-200 px-3 py-0.5 bg-white shrink-0">
          <span className="text-xs italic text-zinc-500 w-24 shrink-0 pl-2">Current balance</span>
          <span className="text-xs text-zinc-400 mr-2">:</span>
          <span className="text-xs text-zinc-600 font-mono tabular-nums">
            {fmtBalance(form.partyBalance)}
          </span>
        </div>
      )}

      {/* Source Godown (optional) */}
      {config?.sourceGodownLabel && (
        <div className="flex items-center border-b border-zinc-200 px-3 py-1 bg-white shrink-0 relative">
          <span className="text-xs text-zinc-600 w-24 shrink-0">{config.sourceGodownLabel}</span>
          <span className="text-xs text-zinc-400 mr-2">:</span>
          <button
            type="button"
            onClick={() => setShowGodownList((s) => !s)}
            className="flex-1 text-left text-xs bg-transparent outline-none px-1 border border-transparent focus:border-zinc-800 font-mono font-semibold"
          >
            {form.sourceGodown?.name ?? '♦ Not Applicable'}
          </button>
          {showGodownList && (
            <div className="absolute left-28 top-full z-50 w-56 bg-white border border-zinc-400 shadow-xl">
              <div className="bg-zinc-900 text-white text-[11px] font-bold px-2 py-1">
                List of Godowns
              </div>
              <div className="max-h-60 overflow-y-auto">
                <div
                  className="px-2 py-1 text-xs hover:bg-zinc-100 cursor-pointer"
                  onClick={() => {
                    form.setSourceGodown(null);
                    setShowGodownList(false);
                  }}
                >
                  ♦ Not Applicable
                </div>
                {form.allGodowns.map((g: any) => (
                  <div
                    key={g.godown_id ?? g.name}
                    className="px-2 py-1 text-xs hover:bg-zinc-100 cursor-pointer"
                    onClick={() => {
                      form.setSourceGodown(g);
                      setShowGodownList(false);
                    }}
                  >
                    {g.name}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Sales / Purchase Ledger (optional) */}
      {config?.salesPurchaseLabel && (
        <>
          <div className="flex items-center border-b border-zinc-200 px-3 py-1 bg-white shrink-0">
            <span className="text-xs text-zinc-600 w-24 shrink-0">{config.salesPurchaseLabel}</span>
            <span className="text-xs text-zinc-400 mr-2">:</span>
            <input
              type="text"
              className="flex-1 text-xs bg-transparent outline-none px-1 border border-transparent focus:border-zinc-800 font-mono font-semibold"
              value={form.salesPurchaseLedger?.name ?? ''}
              placeholder={`Select ${config.salesPurchaseLabel}…`}
              onFocus={() => form.handleFieldFocus({ type: 'salesPurchase' })}
              onChange={(_e) => {
                if (!form.salesPurchaseLedger) form.handleFieldFocus({ type: 'salesPurchase' });
              }}
              autoComplete="off"
            />
            {!config?.showReferenceRow && form.salesPurchaseBalance && (
              <span className="text-xs text-zinc-500 ml-2 shrink-0 tabular-nums">
                {fmtBalance(form.salesPurchaseBalance)}
              </span>
            )}
          </div>
          {config?.showReferenceRow && form.salesPurchaseBalance && (
            <div className="flex items-center border-b border-zinc-200 px-3 py-0.5 bg-white shrink-0">
              <span className="text-xs italic text-zinc-500 w-24 shrink-0 pl-2">
                Current balance
              </span>
              <span className="text-xs text-zinc-400 mr-2">:</span>
              <span className="text-xs text-zinc-600 font-mono tabular-nums">
                {fmtBalance(form.salesPurchaseBalance)}
              </span>
            </div>
          )}
        </>
      )}

      {/* Stock Items Table Header */}
      {showActualBilled ? (
        <div className="border-b border-black shrink-0 bg-zinc-100 text-zinc-800">
          <div className="flex px-3 py-0.5 text-xs font-bold">
            <div className="flex-1 min-w-[200px]">Name of Item</div>
            <div className="w-44 text-center">Quantity</div>
            <div className="w-20 text-right">Rate</div>
            <div className="w-12 text-center">per</div>
            <div className="w-16 text-right">Disc %</div>
            <div className="w-24 text-right">Amount</div>
          </div>
          <div className="flex px-3 py-0.5 border-t border-zinc-200 text-[11px] text-zinc-600">
            <div className="flex-1 min-w-[200px]" />
            <div className="w-44 flex">
              <div className="flex-1 text-center">Actual</div>
              <div className="flex-1 text-center">Billed</div>
            </div>
            <div className="w-20" />
            <div className="w-12" />
            <div className="w-16" />
            <div className="w-24" />
          </div>
        </div>
      ) : (
        <div className="flex border-b border-black shrink-0 px-3 py-0.5 bg-zinc-100 text-xs font-bold text-zinc-800">
          <div className="flex-1 min-w-[200px]">Name of Item</div>
          {!config?.hideGodownColumn && <div className="w-24">Godown</div>}
          <div className="w-20 text-right">Quantity</div>
          <div className="w-20 text-right">Rate</div>
          <div className="w-24 text-right">Amount</div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto min-h-0 bg-white">
        {form.stockEntries.map((row, idx) => {
          const isItemActive =
            form.activeField?.type === 'stockItem' && form.activeField.rowId === row.id;
          const isGodownActive =
            form.activeField?.type === 'stockGodown' && form.activeField.rowId === row.id;

          return (
            <div
              key={row.id}
              className="flex items-center border-b border-zinc-100 min-h-[26px] group px-3 py-1 hover:bg-zinc-50"
            >
              {/* Item Name */}
              <div className="flex-1 min-w-[200px] flex items-center gap-1">
                <input
                  data-stock-item={idx + 1}
                  type="text"
                  className="flex-1 text-xs bg-transparent outline-none px-1 border border-transparent focus:border-zinc-800 font-mono"
                  value={isItemActive ? form.stockSearchTerm : (row.stockItem?.name ?? '')}
                  placeholder={idx === 0 ? 'Select Item…' : ''}
                  onFocus={() => form.handleFieldFocus({ type: 'stockItem', rowId: row.id })}
                  onChange={(e) => {
                    form.setStockSearchTerm(e.target.value);
                    if (!row.stockItem) form.handleFieldFocus({ type: 'stockItem', rowId: row.id });
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && row.stockItem) {
                      e.preventDefault();
                      if (config?.hideGodownColumn) {
                        focusStockQty(idx);
                        return;
                      }
                      const nextEl = document.querySelector(
                        `[data-stock-godown="${idx + 1}"]`,
                      ) as HTMLInputElement;
                      if (nextEl) nextEl.focus();
                    }
                  }}
                  autoComplete="off"
                />
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
              {!config?.hideGodownColumn && (
                <div className="w-24">
                  <input
                    data-stock-godown={idx + 1}
                    type="text"
                    className="w-full text-xs bg-transparent outline-none px-1 border border-transparent focus:border-zinc-800 font-mono"
                    value={isGodownActive ? form.ledgerSearchTerm : (row.godown?.name ?? '')}
                    placeholder="Godown…"
                    onFocus={() => form.handleFieldFocus({ type: 'stockGodown', rowId: row.id })}
                    onChange={(e) => {
                      form.setLedgerSearchTerm(e.target.value);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        focusStockQty(idx);
                      }
                    }}
                    autoComplete="off"
                  />
                </div>
              )}

              {showActualBilled ? (
                <>
                  {/* Quantity: Actual / Billed split (entry flows through the allocation popup) */}
                  <div className="w-44 flex">
                    <div className="flex-1 text-right pr-1">
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
                            setTimeout(() => {
                              (
                                document.querySelector(
                                  `[data-stock-billed="${idx + 1}"]`,
                                ) as HTMLInputElement | null
                              )?.focus();
                            }, 50);
                          }
                        }}
                      />
                    </div>
                    <div className="flex-1 text-right pr-1">
                      <input
                        data-stock-billed={idx + 1}
                        type="text"
                        inputMode="decimal"
                        className="w-full text-right text-xs bg-transparent outline-none px-1 border border-transparent focus:border-zinc-800 font-mono"
                        value={row.billedQtyRaw ?? row.quantityRaw}
                        onChange={(e) =>
                          form.handleUpdateStockRow(row.id, { billedQtyRaw: e.target.value })
                        }
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            focusStockRate(idx);
                          }
                        }}
                      />
                    </div>
                  </div>

                  {/* Rate */}
                  <div className="w-20 text-right pr-1">
                    <input
                      data-stock-rate={idx + 1}
                      type="text"
                      inputMode="decimal"
                      className="w-full text-right text-xs bg-transparent outline-none px-1 border border-transparent focus:border-zinc-800 font-mono"
                      value={row.rateRaw}
                      onChange={(e) =>
                        form.handleUpdateStockRow(row.id, { rateRaw: e.target.value })
                      }
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          setTimeout(() => {
                            (
                              document.querySelector(
                                `[data-stock-disc="${idx + 1}"]`,
                              ) as HTMLInputElement | null
                            )?.focus();
                          }, 50);
                        }
                      }}
                    />
                  </div>

                  {/* per (unit) */}
                  <div className="w-12 text-center text-xs text-zinc-500">
                    {row.unit?.symbol ?? ''}
                  </div>

                  {/* Disc % */}
                  <div className="w-16 text-right pr-1">
                    <input
                      data-stock-disc={idx + 1}
                      type="text"
                      inputMode="decimal"
                      className="w-full text-right text-xs bg-transparent outline-none px-1 border border-transparent focus:border-zinc-800 font-mono"
                      value={row.discPercentRaw ?? ''}
                      onChange={(e) =>
                        form.handleUpdateStockRow(row.id, { discPercentRaw: e.target.value })
                      }
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          proceedToNextStockRow(idx);
                        }
                      }}
                    />
                  </div>

                  {/* Amount */}
                  <div className="w-24 text-right text-xs font-semibold font-mono text-zinc-900 select-none">
                    {row.amountRaw
                      ? Number(row.amountRaw).toLocaleString('en-IN', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })
                      : ''}
                  </div>
                </>
              ) : (
                <>
                  {/* Quantity */}
                  <div className="w-20 text-right pr-1">
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
                          focusStockRate(idx);
                        }
                      }}
                    />
                  </div>

                  {/* Rate */}
                  <div className="w-20 text-right pr-1">
                    <input
                      data-stock-rate={idx + 1}
                      type="text"
                      inputMode="decimal"
                      className="w-full text-right text-xs bg-transparent outline-none px-1 border border-transparent focus:border-zinc-800 font-mono"
                      value={row.rateRaw}
                      onChange={(e) =>
                        form.handleUpdateStockRow(row.id, { rateRaw: e.target.value })
                      }
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          proceedToNextStockRow(idx);
                        }
                      }}
                    />
                  </div>

                  {/* Amount */}
                  <div className="w-24 text-right text-xs font-semibold font-mono text-zinc-900 select-none">
                    {row.amountRaw
                      ? Number(row.amountRaw).toLocaleString('en-IN', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })
                      : ''}
                  </div>
                </>
              )}
            </div>
          );
        })}

        {Array.from({ length: Math.max(0, 8 - form.stockEntries.length) }).map((_, i) => (
          <div key={`sf-${i}`} className="flex border-b border-zinc-50 min-h-[26px] px-3" />
        ))}
      </div>

      {/* Grand total footer */}
      <div className="flex border-t border-zinc-300 shrink-0 px-3 py-1 bg-zinc-50 border-b border-zinc-200">
        <div className="flex-1 text-xs font-bold text-zinc-700">Total</div>
        <div className="w-24 text-right text-xs font-bold font-mono text-zinc-900 pr-0">
          {form.totalAmount > 0
            ? form.totalAmount.toLocaleString('en-IN', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })
            : '0.00'}
        </div>
      </div>
    </>
  );
}
