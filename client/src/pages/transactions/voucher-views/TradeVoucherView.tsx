import { Badge } from "@/components/shadcn/badge";
import {
  type Voucher,
  formatDate, formatAmount,
  ReadOnlyFieldRow, ReadOnlyStockTable, ReadOnlyBillReferences,
  STOCK_TABLE_VARIANT,
} from "./shared";

// Trade vouchers — Sales / Purchase / Credit Note / Debit Note.
// Credit Note mirrors Sales (party Cr, "Sales ledger"); Debit Note mirrors
// Purchase (party Dr, "Purchase ledger"). Layout: header fields → item table →
// additional ledger lines → note details → bill-wise refs.
export default function TradeVoucherView({ voucher }: { voucher: Voucher; balances: Record<number, string> }) {
  const t = voucher.voucher_type;
  const isSalesLike = ["Sales", "Credit Note"].includes(t);
  const mainLedger = voucher.entries.find(e => (isSalesLike ? e.type === "Cr" : e.type === "Dr")) || null;
  const additionalEntries = mainLedger
    ? voucher.entries.filter(e => e.ledger_name !== mainLedger.ledger_name && e.ledger_name !== voucher.party_name)
    : [];
  const noteDetails = t === "Credit Note" ? voucher.credit_note_details
    : t === "Debit Note" ? voucher.debit_note_details : null;
  const ledgerNames = voucher.entries.reduce<Record<number, string>>((acc, e) => {
    if (e.ledger_id) acc[e.ledger_id] = e.ledger_name;
    return acc;
  }, {});
  const hasStock = voucher.stock_entries.length > 0;
  const stockTableVariant = STOCK_TABLE_VARIANT[t] ?? "default";

  return (
    <>
      {t === "Purchase" && (voucher.supplier_invoice_no || voucher.supplier_invoice_date) && (
        <div className="flex items-center border-b border-gray-300 shrink-0 px-3 py-1 gap-6 bg-white">
          {voucher.supplier_invoice_no && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-black shrink-0">Supplier Invoice No.</span>
              <span className="text-sm text-black shrink-0">:</span>
              <span className="text-sm font-semibold text-black">{voucher.supplier_invoice_no}</span>
            </div>
          )}
          {voucher.supplier_invoice_date && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-black shrink-0">Date</span>
              <span className="text-sm text-black shrink-0">:</span>
              <span className="text-sm font-semibold text-black">{formatDate(voucher.supplier_invoice_date)}</span>
            </div>
          )}
        </div>
      )}

      {voucher.place_of_supply && <ReadOnlyFieldRow label="Place of Supply" value={voucher.place_of_supply} />}

      {voucher.party_name && <ReadOnlyFieldRow label="Party A/c name" value={voucher.party_name} />}

      {mainLedger && (
        <ReadOnlyFieldRow label={isSalesLike ? "Sales ledger" : "Purchase ledger"} value={mainLedger.ledger_name} />
      )}

      {(hasStock || voucher.entries.length > 0) && <div className="border-b border-gray-300 shrink-0" />}

      {hasStock && <ReadOnlyStockTable entries={voucher.stock_entries} variant={stockTableVariant} />}

      {additionalEntries.length > 0 && (
        <div className="border-b border-gray-300 shrink-0">
          {additionalEntries.map((row, idx) => (
            <div key={idx} className="flex items-center border-b border-gray-100 min-h-[22px] px-3 py-0">
              <div className="w-10 text-center">
                <Badge variant="outline" className="h-auto rounded border-0 bg-transparent px-0 py-0 text-xs font-semibold text-black">
                  {row.type}
                </Badge>
              </div>
              <div className="flex-1 text-sm text-black pl-2">{row.ledger_name || "—"}</div>
              <div className="w-32 text-right text-sm font-bold text-black">{formatAmount(row.amount)}</div>
            </div>
          ))}
        </div>
      )}

      {noteDetails && (noteDetails.reason_for_issuing_note || noteDetails.original_invoice_no || noteDetails.original_invoice_date) && (
        <div className="border-t border-gray-200 shrink-0 bg-white">
          {noteDetails.reason_for_issuing_note && (
            <ReadOnlyFieldRow label="Reason for issuing note" value={noteDetails.reason_for_issuing_note} />
          )}
          {noteDetails.original_invoice_no && (
            <ReadOnlyFieldRow label="Original Invoice No." value={noteDetails.original_invoice_no} />
          )}
          {noteDetails.original_invoice_date && (
            <ReadOnlyFieldRow label="Original Invoice Date" value={formatDate(noteDetails.original_invoice_date)} />
          )}
        </div>
      )}

      {voucher.bill_references?.length > 0 && (
        <ReadOnlyBillReferences bills={voucher.bill_references} ledgerNames={ledgerNames} />
      )}
    </>
  );
}
