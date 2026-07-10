import {
  formatAmount,
  formatQty,
  formatDate,
  type StockEntry,
  type StockBatch,
} from './sharedTypes';

// Read-only stock/item tables of the voucher views (single, tracking, and
// Stock-Journal split variants) — extracted from shared.tsx (unchanged);
// shared.tsx re-exports everything.

/** Rejection In/Out item table (TallyPrime layout): Actual/Billed quantity, with
 *  a per-godown detail line indented beneath each item. Item and godown lines show
 *  the same figures when there's a single godown — matching Tally. */
export function ReadOnlyTrackingStockTable({ entries }: { entries: StockEntry[] }) {
  const total = entries.reduce((s, e) => s + (e.amount || 0), 0);
  const qtyTotal = entries.reduce((s, e) => s + (e.quantity || 0), 0);
  const units = Array.from(new Set(entries.map((e) => e.unit_symbol).filter(Boolean)));
  const qtyUnit = units.length === 1 ? (units[0] as string) : '';
  const withUnit = (q: number | null | undefined, u?: string | null) => {
    const s = formatQty(q);
    return s ? `${s}${u ? ` ${u}` : ''}` : '';
  };
  return (
    <>
      <div className="border-b border-gray-300 shrink-0 bg-white">
        <div className="flex px-3 py-0.5 gap-4">
          <div className="flex-1 text-sm font-semibold text-black">Name of Item</div>
          <div className="w-60 text-center text-sm font-semibold text-black">Quantity</div>
          <div className="w-28 text-right text-sm font-semibold text-black">Rate</div>
          <div className="w-10 text-center text-sm font-semibold text-black">per</div>
          <div className="w-36 text-right text-sm font-semibold text-black">Amount</div>
        </div>
        <div className="flex px-3 pb-0.5 gap-4 text-[10px] text-gray-500">
          <div className="flex-1" />
          <div className="w-60 flex gap-4">
            <div className="flex-1 text-right">Actual</div>
            <div className="flex-1 text-right">Billed</div>
          </div>
          <div className="w-28" />
          <div className="w-10" />
          <div className="w-36" />
        </div>
      </div>
      <div className="flex-1 overflow-y-auto min-h-0">
        {entries.map((item) => (
          <div key={item.stock_entry_id}>
            {/* Item summary line */}
            <div className="flex items-center min-h-[22px] px-3 py-0 gap-4">
              <div className="flex-1 text-sm text-black font-semibold">{item.item_name || '—'}</div>
              <div className="w-60 flex gap-4">
                <div className="flex-1 text-right text-sm font-semibold text-black">
                  {withUnit(item.quantity, item.unit_symbol)}
                </div>
                <div className="flex-1 text-right text-sm font-semibold text-black">
                  {withUnit(item.quantity, item.unit_symbol)}
                </div>
              </div>
              <div className="w-28 text-right text-sm font-semibold text-black">
                {formatAmount(item.rate)}
              </div>
              <div className="w-10 text-center text-sm text-black">{item.unit_symbol || ''}</div>
              <div className="w-36 text-right text-sm font-bold text-black">
                {formatAmount(item.amount)}
              </div>
            </div>
            {/* Per-godown detail line, indented under the item (Tally) */}
            <div className="flex items-center border-b border-gray-100 min-h-[20px] px-3 py-0 gap-4">
              <div className="flex-1 text-sm text-zinc-600 pl-6">
                {item.godown_name || 'Main Location'}
              </div>
              <div className="w-60 flex gap-4">
                <div className="flex-1 text-right text-sm text-zinc-600">
                  {withUnit(item.quantity, item.unit_symbol)}
                </div>
                <div className="flex-1 text-right text-sm text-zinc-600">
                  {withUnit(item.quantity, item.unit_symbol)}
                </div>
              </div>
              <div className="w-28 text-right text-sm text-zinc-600">{formatAmount(item.rate)}</div>
              <div className="w-10 text-center text-sm text-zinc-600">{item.unit_symbol || ''}</div>
              <div className="w-36 text-right text-sm text-zinc-600">
                {formatAmount(item.amount)}
              </div>
            </div>
            <BatchSummaryLine batches={item.batches} />
          </div>
        ))}
      </div>
      {total > 0 && (
        <div className="flex border-t border-black px-3 py-1 bg-white shrink-0 gap-4 font-bold text-sm text-black">
          <div className="flex-1" />
          <div className="w-60 flex gap-4">
            <div className="flex-1 text-right">{withUnit(qtyTotal, qtyUnit)}</div>
            <div className="flex-1 text-right">{withUnit(qtyTotal, qtyUnit)}</div>
          </div>
          <div className="w-28" />
          <div className="w-10" />
          <div className="w-36 text-right">{formatAmount(total)}</div>
        </div>
      )}
    </>
  );
}

/** Column layout per voucher type — mirrors the `config` object each Create
 *  form (StockTransferVoucherBody / PhysicalStockVoucher) passes at entry time,
 *  so the view never drifts from what was actually shown while typing it. */
export type StockTableVariant =
  'default' | 'invoice' | 'withGodown' | 'actualBilled' | 'physicalStock';

export const STOCK_TABLE_VARIANT: Record<string, StockTableVariant> = {
  // Delivery Note hides the Godown column at entry (Tally shows Name/Quantity/
  // Rate/Amount only) — the view mirrors that with the plain 'default' layout.
  'Delivery Note': 'default',
  'Rejection In': 'withGodown',
  'Rejection Out': 'withGodown',
  // Job Work In/Out Order hide the Godown column at entry (hideGodownColumn) —
  // the view mirrors that with the plain (no-godown) 'default' layout.
  'Receipt Note': 'actualBilled',
  'Sales Order': 'actualBilled',
  'Purchase Order': 'actualBilled',
  'Physical Stock': 'physicalStock',
};

export function BatchSummaryLine({ batches }: { batches: StockBatch[] }) {
  // Only real batch/lot allocations — a blank batch_number is a plain godown
  // line for a non-batch item and must not render as an empty "Batch:" row.
  const named = (batches ?? []).filter((b) => b.batch_number && b.batch_number.trim() !== '');
  if (!named.length) return null;
  return (
    <div className="px-6 py-1 bg-gray-50 border-b border-gray-100 text-[10px] text-gray-500 flex gap-4">
      {named.map((b) => (
        <span key={b.batch_id}>
          Batch: <strong>{b.batch_number}</strong>
          {b.expiry_date && <> | Expiry: {formatDate(b.expiry_date)}</>}
          {b.quantity ? <> | Qty: {formatQty(b.quantity)}</> : null}
        </span>
      ))}
    </div>
  );
}

/** Tax / additional ledger line shown continuing the item table (bug 9 voucher view). */
export interface AdditionalRow {
  name: string;
  ratePct?: number | null;
  amount: number;
}

export function ReadOnlyStockTable({
  entries,
  variant = 'default',
  additionalRows = [],
  grandTotal,
}: {
  entries: StockEntry[];
  variant?: StockTableVariant;
  /** Tax/ledger rows rendered directly under the item rows (default variant only). */
  additionalRows?: AdditionalRow[];
  /** When provided, a single bold "Total" row (item subtotal + tax) replaces the plain subtotal. */
  grandTotal?: number;
}) {
  const total = entries.reduce((s, e) => s + (e.amount || 0), 0);

  if (variant === 'invoice') {
    // Tally accounting-invoice layout — Name | Quantity (Actual/Billed) | Rate |
    // per | Amount. Billed isn't stored separately, so both columns show the one
    // saved quantity (matching Tally when there's no batch-level split). Tax /
    // additional ledger lines continue the same table; one bold Total at the end.
    const qtyTotal = entries.reduce((s, e) => s + (e.quantity || 0), 0);
    const units = Array.from(new Set(entries.map((e) => e.unit_symbol).filter(Boolean)));
    const qtyUnit = units.length === 1 ? (units[0] as string) : '';
    const withUnit = (q: number | null | undefined, u?: string | null) => {
      const s = formatQty(q);
      return s ? `${s}${u ? ` ${u}` : ''}` : '';
    };
    const footTotal = grandTotal != null ? grandTotal : total;
    return (
      <>
        <div className="border-b border-gray-300 shrink-0 bg-white">
          <div className="flex px-3 py-0.5">
            <div className="flex-1 text-sm font-semibold text-black">Name of Item</div>
            <div className="w-44 text-center text-sm font-semibold text-black">Quantity</div>
            <div className="w-20 text-right text-sm font-semibold text-black">Rate</div>
            <div className="w-12 text-center text-sm font-semibold text-black">per</div>
            <div className="w-32 text-right text-sm font-semibold text-black">Amount</div>
          </div>
          <div className="flex px-3 pb-0.5 text-[10px] text-gray-500">
            <div className="flex-1" />
            <div className="w-44 flex">
              <div className="flex-1 text-right">Actual</div>
              <div className="flex-1 text-right">Billed</div>
            </div>
            <div className="w-20" />
            <div className="w-12" />
            <div className="w-32" />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto min-h-0">
          {entries.map((item) => (
            <div key={item.stock_entry_id}>
              <div className="flex items-center border-b border-gray-100 min-h-[22px] px-3 py-0">
                <div className="flex-1 text-sm text-black font-semibold">
                  {item.item_name || '—'}
                </div>
                <div className="w-44 flex">
                  <div className="flex-1 text-right text-sm text-black">
                    {withUnit(item.quantity, item.unit_symbol)}
                  </div>
                  <div className="flex-1 text-right text-sm text-black">
                    {withUnit(item.quantity, item.unit_symbol)}
                  </div>
                </div>
                <div className="w-20 text-right text-sm text-black">{formatAmount(item.rate)}</div>
                <div className="w-12 text-center text-sm text-black">{item.unit_symbol || ''}</div>
                <div className="w-32 text-right text-sm font-bold text-black">
                  {formatAmount(item.amount)}
                </div>
              </div>
              <BatchSummaryLine batches={item.batches} />
            </div>
          ))}

          {/* Tax / additional ledger rows continue the SAME table — ledger name in
              the item column, its GST % in the Rate column, amount in Amount. */}
          {additionalRows.map((row, idx) => (
            <div
              key={`ar-${idx}`}
              className="flex items-center border-b border-gray-100 min-h-[22px] px-3 py-0"
            >
              <div className="flex-1 text-sm text-black">{row.name || '—'}</div>
              <div className="w-44" />
              <div className="w-20 text-right text-sm text-black">
                {row.ratePct != null && row.ratePct > 0 ? `${Number(row.ratePct)}%` : ''}
              </div>
              <div className="w-12" />
              <div className="w-32 text-right text-sm font-bold text-black">
                {formatAmount(row.amount)}
              </div>
            </div>
          ))}
        </div>

        {/* Total pinned to the bottom (Tally-style): quantity totals + grand total. */}
        {footTotal > 0 && (
          <div className="flex border-t border-black px-3 py-1 bg-white shrink-0 font-bold text-sm text-black">
            <div className="flex-1" />
            <div className="w-44 flex">
              <div className="flex-1 text-right">{withUnit(qtyTotal, qtyUnit)}</div>
              <div className="flex-1 text-right">{withUnit(qtyTotal, qtyUnit)}</div>
            </div>
            <div className="w-20" />
            <div className="w-12" />
            <div className="w-32 text-right">{formatAmount(footTotal)}</div>
          </div>
        )}
      </>
    );
  }

  if (variant === 'actualBilled') {
    // Actual/Billed mirror the same value — the Create form's "Billed" input
    // isn't persisted separately today (see plan notes), so both columns read
    // the one quantity that IS stored, matching what Tally shows when there's
    // no batch-level split.
    const qtyTotal = entries.reduce((s, e) => s + (e.quantity || 0), 0);
    const abUnits = Array.from(new Set(entries.map((e) => e.unit_symbol).filter(Boolean)));
    const abUnit = abUnits.length === 1 ? (abUnits[0] as string) : '';
    const abQtyLabel = qtyTotal ? `${formatQty(qtyTotal)}${abUnit ? ` ${abUnit}` : ''}` : '';
    return (
      <>
        <div className="border-b border-gray-300 shrink-0 bg-white">
          <div className="flex px-3 py-0.5">
            <div className="flex-1 text-sm font-semibold text-black">Name of Item</div>
            <div className="w-32 text-center text-sm font-semibold text-black">Quantity</div>
            <div className="w-20 text-right text-sm font-semibold text-black">Rate</div>
            <div className="w-10 text-center text-sm font-semibold text-black">per</div>
            <div className="w-16 text-right text-sm font-semibold text-black">Disc %</div>
            <div className="w-28 text-right text-sm font-semibold text-black">Amount</div>
          </div>
          <div className="flex px-3 pb-0.5 text-[10px] text-gray-500">
            <div className="flex-1" />
            <div className="w-32 flex">
              <div className="flex-1 text-center">Actual</div>
              <div className="flex-1 text-center">Billed</div>
            </div>
            <div className="w-20" />
            <div className="w-10" />
            <div className="w-16" />
            <div className="w-28" />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto min-h-0">
          {entries.map((item) => {
            const base = (item.quantity || 0) * (item.rate || 0);
            const discPercent =
              base > 0 && item.discount_amount ? (item.discount_amount / base) * 100 : 0;
            return (
              <div key={item.stock_entry_id}>
                <div className="flex items-center border-b border-gray-100 min-h-[22px] px-3 py-0">
                  <div className="flex-1 text-sm text-black font-semibold">
                    {item.item_name || '—'}
                  </div>
                  <div className="w-32 flex">
                    <div className="flex-1 text-right text-sm text-black">
                      {formatQty(item.quantity)}
                    </div>
                    <div className="flex-1 text-right text-sm text-black">
                      {formatQty(item.quantity)}
                    </div>
                  </div>
                  <div className="w-20 text-right text-sm text-black">
                    {formatAmount(item.rate)}
                  </div>
                  <div className="w-10 text-center text-sm text-black">
                    {item.unit_symbol || ''}
                  </div>
                  <div className="w-16 text-right text-sm text-black">
                    {discPercent ? discPercent.toFixed(2) : ''}
                  </div>
                  <div className="w-28 text-right text-sm font-bold text-black">
                    {formatAmount(item.amount)}
                  </div>
                </div>
                <BatchSummaryLine batches={item.batches} />
              </div>
            );
          })}
          {Array.from({ length: Math.max(0, 5 - entries.length) }).map((_, i) => (
            <div key={`sf-${i}`} className="flex border-b border-gray-50 min-h-[22px] px-3" />
          ))}
        </div>
        {/* Subtotal pinned to the bottom of the panel (Tally-style), below the
            empty item space — not floating right under the last item row. */}
        {total > 0 && (
          <div className="flex border-t border-gray-300 border-b border-gray-300 px-3 py-0.5 bg-white shrink-0">
            <div className="flex-1 text-xs text-gray-700">Subtotal</div>
            <div className="w-32 flex">
              <div className="flex-1 text-right text-sm font-bold text-black">{abQtyLabel}</div>
              <div className="flex-1 text-right text-sm font-bold text-black">{abQtyLabel}</div>
            </div>
            <div className="w-20" />
            <div className="w-10" />
            <div className="w-16" />
            <div className="w-28 text-right text-sm font-bold text-black">
              {formatAmount(total)}
            </div>
          </div>
        )}
      </>
    );
  }

  if (variant === 'physicalStock') {
    // No Rate column — Physical Stock never captures one; Amount is the
    // stock ledger's computed value, per PhysicalStockVoucher.tsx.
    return (
      <>
        <div className="flex border-b border-gray-300 shrink-0 px-3 py-0.5 bg-white">
          <div className="flex-1 text-sm font-semibold text-black">Name of Item</div>
          <div className="w-28 text-sm font-semibold text-black">Godown</div>
          <div className="w-24 text-sm font-semibold text-black">Batch / Lot</div>
          <div className="w-24 text-sm font-semibold text-black">Mfg Date</div>
          <div className="w-24 text-sm font-semibold text-black">Expiry Date</div>
          <div className="w-20 text-right text-sm font-semibold text-black">Quantity</div>
          <div className="w-28 text-right text-sm font-semibold text-black">Amount</div>
        </div>
        <div className="flex-1 overflow-y-auto min-h-0">
          {entries.map((item) => {
            const batch = item.batches?.[0];
            return (
              <div
                key={item.stock_entry_id}
                className="flex items-center border-b border-gray-100 min-h-[22px] px-3 py-0"
              >
                <div className="flex-1 text-sm text-black font-semibold">
                  {item.item_name || '—'}
                </div>
                <div className="w-28 text-sm text-black">{item.godown_name || '—'}</div>
                <div className="w-24 text-sm text-black">{batch?.batch_number || ''}</div>
                <div className="w-24 text-sm text-black">
                  {batch?.mfg_date ? formatDate(batch.mfg_date) : ''}
                </div>
                <div className="w-24 text-sm text-black">
                  {batch?.expiry_date ? formatDate(batch.expiry_date) : ''}
                </div>
                <div className="w-20 text-right text-sm text-black">{formatQty(item.quantity)}</div>
                <div className="w-28 text-right text-sm font-bold text-black">
                  {formatAmount(item.amount)}
                </div>
              </div>
            );
          })}
          {Array.from({ length: Math.max(0, 5 - entries.length) }).map((_, i) => (
            <div key={`sf-${i}`} className="flex border-b border-gray-50 min-h-[22px] px-3" />
          ))}
          {total > 0 && (
            <div className="flex border-t border-gray-300 border-b border-gray-300 px-3 py-0.5 bg-white">
              <div className="flex-1 text-xs text-gray-700">Subtotal</div>
              <div className="w-28" />
              <div className="w-24" />
              <div className="w-24" />
              <div className="w-24" />
              <div className="w-20 text-right text-sm font-bold text-black">
                {formatQty(entries.reduce((s, e) => s + (e.quantity || 0), 0))}
              </div>
              <div className="w-28 text-right text-sm font-bold text-black">
                {formatAmount(total)}
              </div>
            </div>
          )}
        </div>
      </>
    );
  }

  const withGodown = variant === 'withGodown';
  // Total quantity shown in the bottom Total/Subtotal row (Tally-style, e.g.
  // "2 nos"). The unit is only appended when the whole table shares one unit.
  const qtyTotal = entries.reduce((s, e) => s + (e.quantity || 0), 0);
  const qtyUnits = Array.from(new Set(entries.map((e) => e.unit_symbol).filter(Boolean)));
  const qtyUnit = qtyUnits.length === 1 ? (qtyUnits[0] as string) : '';
  const qtyTotalLabel = qtyTotal ? `${formatQty(qtyTotal)}${qtyUnit ? ` ${qtyUnit}` : ''}` : '';
  return (
    <>
      <div className="flex border-b border-gray-300 shrink-0 px-3 py-0.5 bg-white">
        <div className="flex-1 text-sm font-semibold text-black">Name of Item</div>
        {withGodown && <div className="w-28 text-sm font-semibold text-black">Godown</div>}
        <div className="w-24 text-right text-sm font-semibold text-black">Quantity</div>
        <div className="w-32 text-right text-sm font-semibold text-black">Rate per</div>
        <div className="w-32 text-right text-sm font-semibold text-black">Amount</div>
      </div>
      <div className="flex-1 overflow-y-auto min-h-0">
        {entries.map((item) => (
          <div key={item.stock_entry_id}>
            <div className="flex items-center border-b border-gray-100 min-h-[22px] px-3 py-0">
              <div className="flex-1 text-sm text-black font-semibold">{item.item_name || '—'}</div>
              {withGodown && (
                <div className="w-28 text-sm text-black">{item.godown_name || '—'}</div>
              )}
              <div className="w-24 text-right text-sm text-black">
                {formatQty(item.quantity)}
                {item.unit_symbol ? ` ${item.unit_symbol}` : ''}
              </div>
              <div className="w-32 text-right text-sm text-black">
                {formatAmount(item.rate)}
                {item.unit_symbol ? ` ${item.unit_symbol}` : ''}
              </div>
              <div className="w-32 text-right text-sm font-bold text-black">
                {formatAmount(item.amount)}
              </div>
            </div>
            <BatchSummaryLine batches={item.batches} />
          </div>
        ))}

        {/* Bug 9 (voucher view): tax / additional ledger rows continue the SAME table —
            ledger name in the item column, its GST % in the Rate column, amount in Amount. */}
        {additionalRows.map((row, idx) => (
          <div
            key={`ar-${idx}`}
            className="flex items-center border-b border-gray-100 min-h-[22px] px-3 py-0"
          >
            <div className="flex-1 text-sm text-black">{row.name || '—'}</div>
            {withGodown && <div className="w-28" />}
            <div className="w-24" />
            <div className="w-32 text-right text-sm text-black">
              {row.ratePct != null && row.ratePct > 0 ? `${Number(row.ratePct)}%` : ''}
            </div>
            <div className="w-32 text-right text-sm font-bold text-black">
              {formatAmount(row.amount)}
            </div>
          </div>
        ))}
      </div>

      {/* Total pinned to the bottom of the panel (Tally-style), below the empty item space. */}
      {grandTotal != null
        ? grandTotal > 0 && (
            <div className="flex border-t border-black border-b border-gray-300 px-3 py-1 bg-white shrink-0">
              <div className="flex-1 text-sm font-bold text-black">Total</div>
              {withGodown && <div className="w-28" />}
              <div className="w-24 text-right text-sm font-bold text-black">{qtyTotalLabel}</div>
              <div className="w-32" />
              <div className="w-32 text-right text-sm font-bold text-black">
                {formatAmount(grandTotal)}
              </div>
            </div>
          )
        : total > 0 && (
            <div className="flex border-t border-gray-300 border-b border-gray-300 px-3 py-0.5 bg-white shrink-0">
              <div className="flex-1 text-xs text-gray-700">Subtotal</div>
              {withGodown && <div className="w-28" />}
              <div className="w-24 text-right pr-1 text-sm font-bold text-black">
                {qtyTotalLabel}
              </div>
              <div className="w-32 text-right pr-1" />
              <div className="w-32 text-right text-sm font-bold text-black">
                {formatAmount(total)}
              </div>
            </div>
          )}
    </>
  );
}

/** Stock Journal / Manufacturing Journal: the Create form is a dual pane
 *  (Source/Consumption left, Destination/Production right) with its own Godown
 *  column + subtotal per side (StockJournalVoucher.tsx / ManufacturingJournalVoucher.tsx).
 *  is_source already tags each saved line, so the split needs no backend change. */
export function ReadOnlySplitSection({
  title,
  entries,
  className,
}: {
  title: string;
  entries: StockEntry[];
  className?: string;
}) {
  const totalAmount = entries.reduce((s, e) => s + (e.amount || 0), 0);
  const totalQty = entries.reduce((s, e) => s + (e.quantity || 0), 0);
  // Tally shows the total quantity with its unit ("8 nos") only when the whole
  // side shares one unit; mixed units drop the symbol to avoid a wrong total.
  const units = Array.from(new Set(entries.map((e) => e.unit_symbol).filter(Boolean)));
  const qtyUnit = units.length === 1 ? units[0] : '';
  return (
    <div className={`flex flex-col ${className ?? ''}`}>
      <div className="bg-zinc-900 text-white text-xs font-bold uppercase tracking-wider text-center py-1 shrink-0">
        {title}
      </div>
      <div className="flex gap-3 border-b border-gray-300 px-3 py-0.5 bg-white shrink-0">
        <div className="flex-1 min-w-0 text-sm font-semibold text-black">Name of Item</div>
        <div className="w-24 shrink-0 text-sm font-semibold text-black truncate">Godown</div>
        <div className="w-20 shrink-0 text-right text-sm font-semibold text-black">Quantity</div>
        <div className="w-24 shrink-0 text-right text-sm font-semibold text-black">Rate</div>
        <div className="w-28 shrink-0 text-right text-sm font-semibold text-black">Amount</div>
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto">
        {entries.length === 0 ? (
          <div className="px-3 py-2 text-sm text-gray-400 italic">No items</div>
        ) : (
          entries.map((item) => (
            <div
              key={item.stock_entry_id}
              className="flex gap-3 items-center border-b border-gray-100 min-h-[22px] px-3 py-0"
            >
              <div className="flex-1 min-w-0 text-sm text-black font-semibold truncate">
                {item.item_name || '—'}
              </div>
              <div className="w-24 shrink-0 text-sm text-black truncate">
                {item.godown_name || '—'}
              </div>
              <div className="w-20 shrink-0 text-right text-sm text-black tabular-nums">
                {formatQty(item.quantity)}
              </div>
              <div className="w-24 shrink-0 text-right text-sm text-black tabular-nums">
                {formatAmount(item.rate)}
              </div>
              <div className="w-28 shrink-0 text-right text-sm font-bold text-black tabular-nums">
                {formatAmount(item.amount)}
              </div>
            </div>
          ))
        )}
      </div>
      <div className="flex gap-3 items-center border-t border-gray-300 px-3 py-0.5 bg-white shrink-0">
        <div className="flex-1 min-w-0" />
        <div className="w-24 shrink-0" />
        <div className="w-20 shrink-0 text-right text-sm font-bold text-black tabular-nums">
          {totalQty ? `${formatQty(totalQty)}${qtyUnit ? ` ${qtyUnit}` : ''}` : ''}
        </div>
        <div className="w-24 shrink-0" />
        <div className="w-28 shrink-0 text-right text-sm font-bold text-black tabular-nums">
          {formatAmount(totalAmount)}
        </div>
      </div>
    </div>
  );
}

/** Stock Journal / Manufacturing Journal read-only view: Source (Consumption)
 *  and Destination (Production) sit SIDE BY SIDE — matching TallyPrime's dual
 *  pane — rather than stacked, with a per-side quantity + amount total row.
 *  A centered caption ("Transfer of Materials") sits above both panes, as Tally
 *  shows for the default stock-journal class. */
export function ReadOnlySplitStockTable({
  entries,
  heading = 'Transfer of Materials',
}: {
  entries: StockEntry[];
  heading?: string;
}) {
  const source = entries.filter((e) => e.is_source === 1);
  const destination = entries.filter((e) => e.is_source !== 1);
  return (
    <div className="flex flex-col flex-1 min-h-0 border-b border-gray-300">
      <div className="text-center text-sm font-semibold text-black py-1 bg-white shrink-0 border-b border-gray-200">
        {heading}
      </div>
      <div className="flex items-stretch flex-1 min-h-0">
        <ReadOnlySplitSection
          title="Source (Consumption)"
          entries={source}
          className="flex-1 border-r border-gray-300"
        />
        <ReadOnlySplitSection
          title="Destination (Production)"
          entries={destination}
          className="flex-1"
        />
      </div>
    </div>
  );
}
