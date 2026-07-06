import { cn } from '@/lib/utils';

export interface VoucherEntry {
  entry_id: number;
  ledger_id: number;
  ledger_name: string;
  type: 'Dr' | 'Cr';
  amount: number;
  amount_forex: number;
  currency: string;
  narration: string | null;
  // Enriched by getById (LEFT JOIN ledger_statutory_details) so tax ledgers show their rate.
  gst_tax_type?: string | null;
  gst_tax_rate?: number | null;
  type_of_duty_tax?: string | null;
}

export interface StockBatch {
  batch_id: number;
  batch_number: string;
  mfg_date?: string | null;
  expiry_date: string;
  quantity: number;
  actual_quantity?: number;
  rate: number;
  godown?: string | null;
}

export interface StockEntry {
  stock_entry_id: number;
  item_name: string;
  quantity: number;
  rate: number;
  amount: number;
  additional_amount: number;
  discount_amount: number;
  hsn_code: string;
  gst_rate: number;
  cgst_amount: number;
  sgst_amount: number;
  igst_amount: number;
  is_source: number;
  godown_name?: string | null;
  unit_symbol?: string | null;
  batches: StockBatch[];
}

export interface PayrollEntry {
  payroll_entry_id: number;
  employee_id: number;
  employee_name: string;
  employee_number: string;
  pay_head_id: number;
  pay_head_name: string;
  amount: number;
}

export interface AttendanceEntry {
  entry_id: number;
  employee_id: number;
  employee_name: string;
  employee_number: string;
  attendance_type_id: number;
  attendance_type_name: string;
  value: number;
}

export interface BillReference {
  bill_id: number;
  ledger_id: number;
  bill_name: string;
  bill_type: string;
  amount: number;
  credit_period: string;
  due_date: string;
}

export interface BankDetails {
  transaction_type: string;
  cheque_range: string;
  instrument_number: string;
  instrument_date: string;
  bank_name: string;
  branch: string;
  amount: number;
}

export interface CostCentreEntry {
  cost_centre_id: number;
  amount: number;
}

export interface CashDenomination {
  denomination: string;
  quantity: number;
  amount: number;
}

export interface ReceiptDetails {
  receipt_note_no: string;
  receipt_doc_no: string;
  dispatched_through: string;
  destination: string;
  carrier_name: string;
  bill_of_lading_no: string;
  bill_of_lading_date: string;
  motor_vehicle_no: string;
}

export interface PartyDetails {
  supplier_name: string;
  mailing_name: string;
  address: string;
  state: string;
  country: string;
}

export interface DispatchDetails {
  delivery_note_nos: string;
  dispatch_doc_no: string;
  dispatched_through: string;
  destination: string;
  carrier_name: string;
  bill_of_lading_no: string;
  bill_of_lading_date: string;
  motor_vehicle_no: string;
}

export interface NoteDetails {
  tracking_no: string;
  dispatch_doc_no: string;
  dispatched_through: string;
  destination: string;
  carrier_name: string;
  bill_of_lading_no: string;
  bill_of_lading_date: string;
  motor_vehicle_no: string;
  original_invoice_no: string;
  original_invoice_date: string;
  reason_for_issuing_note: string | null;
}

export interface OrderDetails {
  source_godown_name: string | null;
  order_nos: string | null;
}

export interface Voucher {
  voucher_id: number;
  voucher_type: string;
  voucher_number: string;
  date: string;
  status: string;
  supplier_invoice_no: string | null;
  supplier_invoice_date: string | null;
  reference_number: string | null;
  reference_date: string | null;
  narration: string | null;
  party_name: string | null;
  party_ledger_id: number | null;
  place_of_supply: string | null;
  is_invoice: number;
  is_accounting_voucher: number;
  is_inventory_voucher: number;
  is_order_voucher: number;
  is_cancelled: number;
  is_optional: number;
  is_post_dated: number;
  applicable_upto: string | null;
  created_at: string;
  updated_at: string;
  entries: VoucherEntry[];
  stock_entries: StockEntry[];
  payroll_entries: PayrollEntry[];
  attendance_entries?: AttendanceEntry[];
  bill_references: BillReference[];
  bank_details: BankDetails | null;
  cost_centres: CostCentreEntry[];
  cash_denominations: CashDenomination[];
  receipt_details: ReceiptDetails | null;
  party_details: PartyDetails | null;
  dispatch_details: DispatchDetails | null;
  credit_note_details: NoteDetails | null;
  debit_note_details: NoteDetails | null;
  order_details?: OrderDetails | null;
}

export const formatDate = (d: string | null) => {
  if (!d) return '—';
  const dt = new Date(d);
  return isNaN(dt.getTime())
    ? d
    : dt.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

export const formatDateBox = (d: string | null) => {
  if (!d) return { date: '—', day: '' };
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return { date: d, day: '' };
  return {
    date: dt.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' }),
    day: dt.toLocaleDateString('en-IN', { weekday: 'long' }),
  };
};

export const formatAmount = (n: number | null | undefined) => {
  if (!n) return '';
  return Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

export const formatQty = (n: number | null | undefined) => {
  if (!n) return '';
  return Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

export function ReadOnlyFieldRow({
  label,
  value,
  balance,
}: {
  label: string;
  value: string;
  balance?: string | null;
}) {
  return (
    <div className="border-b border-gray-300 shrink-0 py-1 px-3">
      <div className="flex items-center">
        <span className="text-sm text-black shrink-0 w-40">{label}</span>
        <span className="text-sm text-black shrink-0 mr-2">:</span>
        <span className="text-sm font-semibold text-black flex-1">{value || '—'}</span>
      </div>
      {balance && (
        <div className="pl-[10.5rem] text-xs italic">
          Cur Bal:{' '}
          <span
            className={
              balance.includes('Cr') ? 'text-black font-bold' : 'text-zinc-500 font-semibold'
            }
          >
            {balance}
          </span>
        </div>
      )}
    </div>
  );
}

/** Column layout per voucher type — mirrors the `config` object each Create
 *  form (StockTransferVoucherBody / PhysicalStockVoucher) passes at entry time,
 *  so the view never drifts from what was actually shown while typing it. */
export type StockTableVariant = 'default' | 'withGodown' | 'actualBilled' | 'physicalStock';

export const STOCK_TABLE_VARIANT: Record<string, StockTableVariant> = {
  'Delivery Note': 'withGodown',
  'Rejection In': 'withGodown',
  'Rejection Out': 'withGodown',
  'Job Work Out Order': 'withGodown',
  'Receipt Note': 'actualBilled',
  'Sales Order': 'actualBilled',
  'Purchase Order': 'actualBilled',
  'Physical Stock': 'physicalStock',
};

export function BatchSummaryLine({ batches }: { batches: StockBatch[] }) {
  if (!batches?.length) return null;
  return (
    <div className="px-6 py-1 bg-gray-50 border-b border-gray-100 text-[10px] text-gray-500 flex gap-4">
      {batches.map((b) => (
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

  if (variant === 'actualBilled') {
    // Actual/Billed mirror the same value — the Create form's "Billed" input
    // isn't persisted separately today (see plan notes), so both columns read
    // the one quantity that IS stored, matching what Tally shows when there's
    // no batch-level split.
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
          {total > 0 && (
            <div className="flex border-t border-gray-300 border-b border-gray-300 px-3 py-0.5 bg-white">
              <div className="flex-1 text-xs text-gray-700">Subtotal</div>
              <div className="w-32" />
              <div className="w-20" />
              <div className="w-10" />
              <div className="w-16" />
              <div className="w-28 text-right text-sm font-bold text-black">
                {formatAmount(total)}
              </div>
            </div>
          )}
        </div>
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
              <div className="w-20" />
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
              <div className="w-24 text-right text-sm text-black">{formatQty(item.quantity)}</div>
              <div className="w-32 text-right text-sm text-black">{formatAmount(item.rate)}</div>
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

        {additionalRows.length === 0 &&
          Array.from({ length: Math.max(0, 5 - entries.length) }).map((_, i) => (
            <div key={`sf-${i}`} className="flex border-b border-gray-50 min-h-[22px] px-3" />
          ))}

        {grandTotal != null
          ? grandTotal > 0 && (
              <div className="flex border-t border-black border-b border-gray-300 px-3 py-1 bg-white">
                <div className="flex-1 text-sm font-bold text-black">Total</div>
                {withGodown && <div className="w-28" />}
                <div className="w-24" />
                <div className="w-32" />
                <div className="w-32 text-right text-sm font-bold text-black">
                  {formatAmount(grandTotal)}
                </div>
              </div>
            )
          : total > 0 && (
              <div className="flex border-t border-gray-300 border-b border-gray-300 px-3 py-0.5 bg-white">
                <div className="flex-1 text-xs text-gray-700">Subtotal</div>
                {withGodown && <div className="w-28" />}
                <div className="w-24 text-right pr-1" />
                <div className="w-32 text-right pr-1" />
                <div className="w-32 text-right text-sm font-bold text-black">
                  {formatAmount(total)}
                </div>
              </div>
            )}
      </div>
    </>
  );
}

/** Stock Journal / Manufacturing Journal: the Create form is a dual pane
 *  (Source/Consumption left, Destination/Production right) with its own Godown
 *  column + subtotal per side (StockJournalVoucher.tsx / ManufacturingJournalVoucher.tsx).
 *  is_source already tags each saved line, so the split needs no backend change. */
export function ReadOnlySplitSection({ title, entries }: { title: string; entries: StockEntry[] }) {
  const total = entries.reduce((s, e) => s + (e.amount || 0), 0);
  return (
    <div className="border-b border-gray-300 shrink-0">
      <div className="bg-zinc-900 text-white text-xs font-bold uppercase tracking-wider text-center py-1">
        {title}
      </div>
      <div className="flex border-b border-gray-300 shrink-0 px-3 py-0.5 bg-white">
        <div className="flex-1 text-sm font-semibold text-black">Name of Item</div>
        <div className="w-28 text-sm font-semibold text-black">Godown</div>
        <div className="w-24 text-right text-sm font-semibold text-black">Quantity</div>
        <div className="w-24 text-right text-sm font-semibold text-black">Rate</div>
        <div className="w-32 text-right text-sm font-semibold text-black">Amount</div>
      </div>
      {entries.length === 0 ? (
        <div className="px-3 py-2 text-sm text-gray-400 italic">No items</div>
      ) : (
        entries.map((item) => (
          <div
            key={item.stock_entry_id}
            className="flex items-center border-b border-gray-100 min-h-[22px] px-3 py-0"
          >
            <div className="flex-1 text-sm text-black font-semibold">{item.item_name || '—'}</div>
            <div className="w-28 text-sm text-black">{item.godown_name || '—'}</div>
            <div className="w-24 text-right text-sm text-black">{formatQty(item.quantity)}</div>
            <div className="w-24 text-right text-sm text-black">{formatAmount(item.rate)}</div>
            <div className="w-32 text-right text-sm font-bold text-black">
              {formatAmount(item.amount)}
            </div>
          </div>
        ))
      )}
      <div className="flex px-3 py-0.5 bg-white">
        <div className="flex-1 text-xs text-gray-700">Subtotal</div>
        <div className="w-28" />
        <div className="w-24" />
        <div className="w-24" />
        <div className="w-32 text-right text-sm font-bold text-black">{formatAmount(total)}</div>
      </div>
    </div>
  );
}

export function ReadOnlySplitStockTable({ entries }: { entries: StockEntry[] }) {
  const source = entries.filter((e) => e.is_source === 1);
  const destination = entries.filter((e) => e.is_source !== 1);
  return (
    <>
      <ReadOnlySplitSection title="Source (Consumption)" entries={source} />
      <ReadOnlySplitSection title="Destination (Production)" entries={destination} />
    </>
  );
}

export function ReadOnlyParticularsTable({
  entries,
  bills = [],
}: {
  entries: VoucherEntry[];
  bills?: BillReference[];
}) {
  const total = entries.reduce((s, e) => s + (e.amount || 0), 0);
  // Bill-wise allocations grouped under their ledger, shown inline (Tally-style),
  // exactly like the entry screen — not in a separate block at the bottom.
  const billsByLedger = bills.reduce<Record<number, BillReference[]>>((acc, b) => {
    (acc[b.ledger_id] ??= []).push(b);
    return acc;
  }, {});
  return (
    <>
      <div className="flex border-b border-gray-300 shrink-0 px-3 py-0.5 bg-white">
        <div className="flex-1 text-sm font-semibold text-black">Particulars</div>
        <div className="w-40 text-right text-sm font-semibold text-black">Amount</div>
      </div>
      <div className="flex-1 overflow-y-auto min-h-0">
        {entries.map((row, idx) => (
          <div key={idx} className="border-b border-gray-100 px-3 py-0">
            <div className="flex items-center min-h-[22px]">
              <div className="flex-1 text-sm text-black">{row.ledger_name || '—'}</div>
              <div className="w-40 text-right text-sm font-semibold text-black">
                {formatAmount(row.amount)}
              </div>
            </div>
            {(billsByLedger[row.ledger_id] ?? []).map((b) => (
              <div
                key={b.bill_id}
                className="flex items-baseline pl-6 min-h-[18px] text-xs text-black"
              >
                <span className="w-24 text-gray-600">{b.bill_type || '—'}</span>
                <span className="flex-1 font-medium">{b.bill_name || '—'}</span>
                {b.due_date && (
                  <span className="text-gray-600 mr-3">Due: {formatDate(b.due_date)}</span>
                )}
                <span className="w-32 text-right tabular-nums font-semibold">
                  {formatAmount(b.amount)}
                </span>
              </div>
            ))}
          </div>
        ))}
        {Array.from({ length: Math.max(0, 6 - entries.length) }).map((_, i) => (
          <div key={`ep-${i}`} className="flex border-b border-gray-50 min-h-[22px]">
            <div className="flex-1 px-3" />
            <div className="w-40 pr-3" />
          </div>
        ))}
      </div>
      <div className="flex border-t border-gray-300 shrink-0 px-3 py-0.5 bg-white">
        <div className="flex-1 text-xs text-gray-600">{Math.abs(total) < 0.01 ? '' : 'Total:'}</div>
        <div className="w-40 text-right text-sm font-bold text-black pr-0">
          {total > 0 ? formatAmount(total) : ''}
        </div>
      </div>
    </>
  );
}

export function ReadOnlyBillReferences({
  bills,
  ledgerNames,
}: {
  bills: BillReference[];
  ledgerNames: Record<number, string>;
}) {
  // Group bill-wise allocations under their party ledger (Sundry Debtors/Creditors).
  const byLedger = bills.reduce<Record<number, BillReference[]>>((acc, b) => {
    (acc[b.ledger_id] ??= []).push(b);
    return acc;
  }, {});

  return (
    <div className="border-b border-gray-300 shrink-0 bg-gray-50">
      <div className="px-3 py-0.5 border-b border-gray-200 text-xs font-semibold text-gray-700">
        Bill-wise Details
      </div>
      {Object.entries(byLedger).map(([lid, rows]) => (
        <div key={lid} className="px-3 py-1">
          <div className="text-xs font-semibold text-black">
            {ledgerNames[Number(lid)] || `Ledger #${lid}`}
          </div>
          {rows.map((b) => (
            <div key={b.bill_id} className="flex items-center min-h-[20px] pl-4 text-xs text-black">
              <div className="w-28 text-gray-600">{b.bill_type || '—'}</div>
              <div className="flex-1 font-medium">{b.bill_name || '—'}</div>
              {b.due_date && (
                <div className="w-32 text-gray-600">Due: {formatDate(b.due_date)}</div>
              )}
              <div className="w-32 text-right font-bold">{formatAmount(b.amount)}</div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

export function ReadOnlyDoubleEntryTable({
  entries,
  balances,
  bills = [],
}: {
  entries: VoucherEntry[];
  balances: Record<number, string>;
  bills?: BillReference[];
}) {
  const drTotal = entries.filter((e) => e.type === 'Dr').reduce((s, e) => s + e.amount, 0);
  const crTotal = entries.filter((e) => e.type === 'Cr').reduce((s, e) => s + e.amount, 0);
  // Bill-wise allocations grouped under their party ledger, rendered inline (Tally-style).
  const billsByLedger = bills.reduce<Record<number, BillReference[]>>((acc, b) => {
    (acc[b.ledger_id] ??= []).push(b);
    return acc;
  }, {});

  return (
    <>
      <div className="flex border-b border-gray-300 shrink-0 px-3 py-1 bg-white">
        <div className="flex-1 text-sm font-semibold text-black">Particulars</div>
        <div className="w-36 text-right text-sm font-semibold text-black">Debit</div>
        <div className="w-36 text-right text-sm font-semibold text-black">Credit</div>
      </div>
      <div className="flex-1 overflow-y-auto min-h-0">
        {entries.map((entry) => {
          const bal = balances[entry.ledger_id];
          return (
            <div key={entry.entry_id} className="border-b border-gray-100 px-3 py-1.5">
              <div className="flex items-start">
                <div className="w-6 text-sm font-semibold text-black shrink-0">{entry.type}</div>
                <div className="flex-1 text-sm font-bold text-black">
                  {entry.ledger_name || `Ledger #${entry.ledger_id}`}
                </div>
                <div className="w-36 text-right text-sm font-bold text-black tabular-nums">
                  {entry.type === 'Dr' ? formatAmount(entry.amount) : ''}
                </div>
                <div className="w-36 text-right text-sm font-bold text-black tabular-nums">
                  {entry.type === 'Cr' ? formatAmount(entry.amount) : ''}
                </div>
              </div>
              {bal && (
                <div className="pl-6 text-xs italic">
                  Cur Bal:{' '}
                  <span
                    className={
                      bal.includes('Cr') ? 'text-black font-bold' : 'text-zinc-500 font-semibold'
                    }
                  >
                    {bal}
                  </span>
                </div>
              )}
              {(billsByLedger[entry.ledger_id] ?? []).map((b) => (
                <div key={b.bill_id} className="pl-6 flex items-baseline text-xs text-black">
                  <span className="text-gray-700">{b.bill_type || '—'}</span>
                  <span className="ml-2 font-medium">{b.bill_name || '—'}</span>
                  <span className="ml-6 tabular-nums font-semibold">{formatAmount(b.amount)}</span>
                  <span className="ml-1 text-gray-700">{entry.type}</span>
                </div>
              ))}
            </div>
          );
        })}
        {Array.from({ length: Math.max(0, 6 - entries.length) }).map((_, i) => (
          <div key={`de-${i}`} className="flex border-b border-gray-50 min-h-[28px]">
            <div className="w-6" />
            <div className="flex-1 px-3" />
            <div className="w-36 pr-3" />
            <div className="w-36 pr-3" />
          </div>
        ))}
      </div>
      <div className="flex border-t border-gray-300 shrink-0 px-3 py-1 bg-white">
        <div className="flex-1" />
        <div className="w-36 text-right text-sm font-bold text-black tabular-nums">
          {formatAmount(drTotal)}
        </div>
        <div className="w-36 text-right text-sm font-bold text-black tabular-nums">
          {formatAmount(crTotal)}
        </div>
      </div>
    </>
  );
}

export function ReadOnlyPayrollTable({ entries }: { entries: PayrollEntry[] }) {
  const total = entries.reduce((s, e) => s + (e.amount || 0), 0);
  return (
    <>
      <div className="flex border-b border-gray-300 shrink-0 px-3 py-0.5 bg-white">
        <div className="w-20 text-sm font-semibold text-black">Emp. Code</div>
        <div className="flex-1 text-sm font-semibold text-black">Employee Name</div>
        <div className="flex-1 text-sm font-semibold text-black">Pay Head</div>
        <div className="w-32 text-right text-sm font-semibold text-black">Amount</div>
      </div>
      <div className="flex-1 overflow-y-auto min-h-0">
        {entries.map((p) => (
          <div
            key={p.payroll_entry_id}
            className="flex items-center border-b border-gray-100 min-h-[22px] px-3 py-0"
          >
            <div className="w-20 text-sm text-black">{p.employee_number || '—'}</div>
            <div className="flex-1 text-sm text-black font-semibold">{p.employee_name || '—'}</div>
            <div className="flex-1 text-sm text-black">{p.pay_head_name || '—'}</div>
            <div className="w-32 text-right text-sm font-bold text-black">
              {formatAmount(p.amount)}
            </div>
          </div>
        ))}
        {Array.from({ length: Math.max(0, 5 - entries.length) }).map((_, i) => (
          <div key={`pe-${i}`} className="flex border-b border-gray-50 min-h-[22px] px-3" />
        ))}
      </div>
      {total > 0 && (
        <div className="flex border-t border-gray-300 shrink-0 px-3 py-0.5 bg-white">
          <div className="flex-1" />
          <div className="w-32 text-right text-sm font-bold text-black">{formatAmount(total)}</div>
        </div>
      )}
    </>
  );
}

export function ReadOnlyAttendanceTable({ entries }: { entries: AttendanceEntry[] }) {
  return (
    <>
      <div className="flex border-b border-gray-300 shrink-0 px-3 py-0.5 bg-white">
        <div className="w-20 text-sm font-semibold text-black">Emp. Code</div>
        <div className="flex-1 text-sm font-semibold text-black">Employee Name</div>
        <div className="flex-1 text-sm font-semibold text-black">Attendance/Production Type</div>
        <div className="w-32 text-right text-sm font-semibold text-black">Value</div>
      </div>
      <div className="flex-1 overflow-y-auto min-h-0">
        {entries.map((a) => (
          <div
            key={a.entry_id}
            className="flex items-center border-b border-gray-100 min-h-[22px] px-3 py-0"
          >
            <div className="w-20 text-sm text-black">{a.employee_number || '—'}</div>
            <div className="flex-1 text-sm text-black font-semibold">{a.employee_name || '—'}</div>
            <div className="flex-1 text-sm text-black">{a.attendance_type_name || '—'}</div>
            <div className="w-32 text-right text-sm font-bold text-black">{formatQty(a.value)}</div>
          </div>
        ))}
        {Array.from({ length: Math.max(0, 5 - entries.length) }).map((_, i) => (
          <div key={`ae-${i}`} className="flex border-b border-gray-50 min-h-[22px] px-3" />
        ))}
      </div>
    </>
  );
}

export function FKeyPanel({ voucherType }: { voucherType: string }) {
  const top = [
    ['F2', 'Date'],
    ['F3', 'Company/Tax Registration'],
    ['F4', 'Contra'],
    ['F5', 'Payment'],
    ['F6', 'Receipt'],
    ['F7', 'Journal'],
    ['F8', 'Sales'],
    ['F9', 'Purchase'],
    ['F10', 'Other Vouchers'],
  ];
  const bottom = [
    ['F', 'Autofill'],
    ['H', 'Change Mode'],
    ['I', 'More Details'],
    ['O', 'Related Reports'],
  ];
  const tail = [
    ['L', 'Optional'],
    ['T', 'Post-Dated'],
  ];

  const renderRow = ([key, label]: string[]) => {
    const active = label.toLowerCase() === voucherType.toLowerCase();
    return (
      <div
        key={key}
        className={cn(
          'flex items-center justify-between px-2 py-1.5 border-b border-zinc-100 text-xs',
          active ? 'bg-zinc-900 text-white font-bold' : 'text-zinc-700',
        )}
      >
        <span>
          <span className="underline">{key[0]}</span>
          {key.slice(1)}: {label}
        </span>
        <span className="text-zinc-400">‹</span>
      </div>
    );
  };

  return (
    <div className="w-56 shrink-0 border-l border-zinc-300 bg-gray-50 overflow-y-auto">
      <div className="py-1">{top.map(renderRow)}</div>
      <div className="py-1 border-t border-zinc-300">{bottom.map(renderRow)}</div>
      <div className="py-1 border-t border-zinc-300">{tail.map(renderRow)}</div>
    </div>
  );
}
