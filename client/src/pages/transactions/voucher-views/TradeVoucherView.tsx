import {
  type Voucher,
  type AdditionalRow,
  formatDate,
  ReadOnlyFieldRow,
  ReadOnlyStockTable,
  STOCK_TABLE_VARIANT,
} from './shared';

// Trade vouchers — Sales / Purchase / Credit Note / Debit Note.
// Credit Note mirrors Sales (party Cr, "Sales ledger"); Debit Note mirrors
// Purchase (party Dr, "Purchase ledger"). Layout (bug 9): header fields → ONE
// continuous table of item rows then tax/ledger rows (same columns, GST % in the
// Rate column) → a single bold Total → note details. Current balance is shown
// under the Party A/c name and the Sales/Purchase ledger (Tally invoice view).
export default function TradeVoucherView({
  voucher,
  balances,
}: {
  voucher: Voucher;
  balances: Record<number, string>;
}) {
  const t = voucher.voucher_type;
  const isSalesLike = ['Sales', 'Credit Note'].includes(t);
  const mainLedger =
    voucher.entries.find((e) => (isSalesLike ? e.type === 'Cr' : e.type === 'Dr')) || null;

  const stockSubtotal = voucher.stock_entries.reduce((s, e) => s + (e.amount || 0), 0);

  // Everything that isn't the party or the sales/purchase ledger is a tax / additional
  // ledger line. Show its GST % when it is a GST ledger — prefer the ledger's configured
  // rate, else derive it from amount ÷ taxable subtotal (many tax ledgers store rate 0).
  const additionalRows: AdditionalRow[] = (
    mainLedger
      ? voucher.entries.filter(
          (e) => e.ledger_name !== mainLedger.ledger_name && e.ledger_name !== voucher.party_name,
        )
      : []
  ).map((e) => {
    const isGst = e.type_of_duty_tax === 'GST' || !!e.gst_tax_type;
    const configured = Number(e.gst_tax_rate) || 0;
    const derived = stockSubtotal > 0 && e.amount ? (e.amount / stockSubtotal) * 100 : 0;
    const rate = configured > 0 ? configured : derived;
    return {
      name: e.ledger_name,
      ratePct: isGst && rate > 0 ? Number(rate.toFixed(2)) : null,
      amount: e.amount,
    };
  });

  const additionalTotal = additionalRows.reduce((s, r) => s + (r.amount || 0), 0);
  const grandTotal = stockSubtotal + additionalTotal;

  const noteDetails =
    t === 'Credit Note'
      ? voucher.credit_note_details
      : t === 'Debit Note'
        ? voucher.debit_note_details
        : null;
  const hasStock = voucher.stock_entries.length > 0;
  const stockTableVariant = STOCK_TABLE_VARIANT[t] ?? 'default';

  return (
    <>
      {t === 'Purchase' && (voucher.supplier_invoice_no || voucher.supplier_invoice_date) && (
        <div className="flex items-center border-b border-gray-300 shrink-0 px-3 py-1 gap-6 bg-white">
          {voucher.supplier_invoice_no && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-black shrink-0">Supplier Invoice No.</span>
              <span className="text-sm text-black shrink-0">:</span>
              <span className="text-sm font-semibold text-black">
                {voucher.supplier_invoice_no}
              </span>
            </div>
          )}
          {voucher.supplier_invoice_date && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-black shrink-0">Date</span>
              <span className="text-sm text-black shrink-0">:</span>
              <span className="text-sm font-semibold text-black">
                {formatDate(voucher.supplier_invoice_date)}
              </span>
            </div>
          )}
        </div>
      )}

      {voucher.place_of_supply && (
        <ReadOnlyFieldRow label="Place of Supply" value={voucher.place_of_supply} />
      )}

      {voucher.party_name && (
        <ReadOnlyFieldRow
          label="Party A/c name"
          value={voucher.party_name}
          balance={voucher.party_ledger_id != null ? balances[voucher.party_ledger_id] : undefined}
        />
      )}

      {mainLedger && (
        <ReadOnlyFieldRow
          label={isSalesLike ? 'Sales ledger' : 'Purchase ledger'}
          value={mainLedger.ledger_name}
          balance={balances[mainLedger.ledger_id]}
        />
      )}

      {(hasStock || voucher.entries.length > 0) && (
        <div className="border-b border-gray-300 shrink-0" />
      )}

      {hasStock && (
        <ReadOnlyStockTable
          entries={voucher.stock_entries}
          variant={stockTableVariant}
          additionalRows={stockTableVariant === 'default' ? additionalRows : []}
          grandTotal={stockTableVariant === 'default' ? grandTotal : undefined}
        />
      )}

      {noteDetails &&
        (noteDetails.reason_for_issuing_note ||
          noteDetails.original_invoice_no ||
          noteDetails.original_invoice_date) && (
          <div className="border-t border-gray-200 shrink-0 bg-white">
            {noteDetails.reason_for_issuing_note && (
              <ReadOnlyFieldRow
                label="Reason for issuing note"
                value={noteDetails.reason_for_issuing_note}
              />
            )}
            {noteDetails.original_invoice_no && (
              <ReadOnlyFieldRow
                label="Original Invoice No."
                value={noteDetails.original_invoice_no}
              />
            )}
            {noteDetails.original_invoice_date && (
              <ReadOnlyFieldRow
                label="Original Invoice Date"
                value={formatDate(noteDetails.original_invoice_date)}
              />
            )}
          </div>
        )}
    </>
  );
}
