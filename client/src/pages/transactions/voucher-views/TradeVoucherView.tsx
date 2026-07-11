import {
  type Voucher,
  type AdditionalRow,
  formatDate,
  ReadOnlyFieldRow,
  ReadOnlyStockTable,
  STOCK_TABLE_VARIANT,
} from './shared';
import { gstComponentOf } from '../utils/gstRow';

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

  // A tax ledger: tagged as a GST duty ledger in statutory details, OR its name
  // resolves to a GST component (Input CGST / SGST / IGST / Cess) — the latter
  // catches ledgers that carry the rate in their name but have no statutory tag,
  // which is why their Rate % was previously blank on the voucher view.
  const isTaxEntry = (e: (typeof voucher.entries)[number]) =>
    e.type_of_duty_tax === 'GST' ||
    !!e.gst_tax_type ||
    gstComponentOf({ gst_tax_type: e.gst_tax_type, name: e.ledger_name }) !== null;
  const isParty = (e: (typeof voucher.entries)[number]) =>
    e.ledger_id === voucher.party_ledger_id || e.ledger_name === voucher.party_name;

  // The main sales/purchase ledger is the non-party, non-tax accounting entry.
  // Picking by Dr/Cr type is wrong: on a Debit/Credit Note the party sits on the
  // same side as the main ledger, so type-matching grabs the party by mistake and
  // the real ledger leaks into the additional rows (double-counting the total).
  const nonPartyEntries = voucher.entries.filter((e) => !isParty(e));
  const mainLedger = nonPartyEntries.find((e) => !isTaxEntry(e)) || nonPartyEntries[0] || null;

  const stockSubtotal = voucher.stock_entries.reduce((s, e) => s + (e.amount || 0), 0);

  // Everything that isn't the party or the sales/purchase ledger is a tax / additional
  // ledger line. Show its GST % when it is a GST ledger — prefer the ledger's configured
  // rate, else derive it from amount ÷ taxable subtotal (many tax ledgers store rate 0).
  const additionalRows: AdditionalRow[] = nonPartyEntries
    .filter((e) => e !== mainLedger)
    .map((e) => {
      const isGst = isTaxEntry(e);
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

  // Price Level — header field shown on the invoice (Tally always renders it,
  // "♦ Not Applicable" when none). Not persisted on the voucher yet, so it reads
  // from the record defensively and falls back to the default label.
  const priceLevel = (voucher as { price_level?: string | null }).price_level || '';

  const noteDetails =
    t === 'Credit Note'
      ? voucher.credit_note_details
      : t === 'Debit Note'
        ? voucher.debit_note_details
        : null;
  const hasStock = voucher.stock_entries.length > 0;
  // Trade vouchers render the Tally accounting-invoice layout: Actual/Billed
  // quantity, Rate + per unit, tax rows continuing the table, one bold total.
  const stockTableVariant = STOCK_TABLE_VARIANT[t] ?? 'invoice';

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

      {t !== 'Purchase' && voucher.place_of_supply && (
        <ReadOnlyFieldRow label="Place of Supply" value={voucher.place_of_supply} />
      )}

      {voucher.party_name && (
        <div className="relative">
          <ReadOnlyFieldRow
            label="Party A/c name"
            value={voucher.party_name}
            balance={
              voucher.party_ledger_id != null ? balances[voucher.party_ledger_id] : undefined
            }
          />
          {/* Price Level — right side of the party band (TallyPrime invoice header). */}
          <div className="absolute top-1 right-3 flex items-center gap-2 text-sm">
            <span className="text-black">Price Level</span>
            <span className="text-black">:</span>
            <span className="font-semibold text-black">{priceLevel || '♦ Not Applicable'}</span>
          </div>
        </div>
      )}

      {mainLedger && (
        <ReadOnlyFieldRow
          label="Ledger account"
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
          additionalRows={
            stockTableVariant === 'default' || stockTableVariant === 'invoice' ? additionalRows : []
          }
          grandTotal={
            stockTableVariant === 'default' || stockTableVariant === 'invoice'
              ? grandTotal
              : undefined
          }
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
