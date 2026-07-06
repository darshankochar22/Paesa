import {
  type Voucher,
  formatDate,
  ReadOnlyFieldRow,
  ReadOnlyStockTable,
  ReadOnlySplitStockTable,
  ReadOnlyDoubleEntryTable,
  ReadOnlyBillReferences,
  STOCK_TABLE_VARIANT,
} from './shared';

// Inventory-only vouchers — Delivery/Receipt Note, Rejection In/Out, Material
// In/Out, Physical Stock, Stock Journal, Manufacturing Journal, Sales/Purchase
// Order, Job Work orders. The item table's columns vary by type (see
// STOCK_TABLE_VARIANT); Stock/Mfg Journal split into Source/Destination panes.
export default function InventoryVoucherView({
  voucher,
  balances,
}: {
  voucher: Voucher;
  balances: Record<number, string>;
}) {
  const t = voucher.voucher_type;
  const isReceiptNote = t === 'Receipt Note';
  const isSplitStock = ['Stock Journal', 'Manufacturing Journal'].includes(t);
  const stockTableVariant = STOCK_TABLE_VARIANT[t] ?? 'default';
  const sourceGodownRowLabel =
    t === 'Material In' ? 'Source Godown' : t === 'Material Out' ? 'Destination Godown' : null;
  const hasStock = voucher.stock_entries.length > 0;
  const hasEntries = voucher.entries.length > 0;
  const showDoubleEntryTable = hasEntries; // inventory voucher carrying ledger entries
  const ledgerNames = voucher.entries.reduce<Record<number, string>>((acc, e) => {
    if (e.ledger_id) acc[e.ledger_id] = e.ledger_name;
    return acc;
  }, {});

  return (
    <>
      {isReceiptNote && (voucher.reference_number || voucher.reference_date) && (
        <div className="flex items-center border-b border-gray-300 shrink-0 px-3 py-1 bg-white gap-6">
          {voucher.reference_number && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-black shrink-0">Reference No.</span>
              <span className="text-sm text-black shrink-0">:</span>
              <span className="text-sm font-semibold text-black">{voucher.reference_number}</span>
            </div>
          )}
          {voucher.reference_date && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-black shrink-0">Date</span>
              <span className="text-sm text-black shrink-0">:</span>
              <span className="text-sm font-semibold text-black">
                {formatDate(voucher.reference_date)}
              </span>
            </div>
          )}
        </div>
      )}

      {voucher.party_name && (
        <ReadOnlyFieldRow
          label="Party A/c name"
          value={voucher.party_name}
          balance={voucher.party_ledger_id != null ? balances[voucher.party_ledger_id] : undefined}
        />
      )}

      {sourceGodownRowLabel && voucher.order_details?.source_godown_name && (
        <ReadOnlyFieldRow
          label={sourceGodownRowLabel}
          value={voucher.order_details.source_godown_name}
        />
      )}

      {['Sales Order', 'Purchase Order', 'Job Work In Order'].includes(t) &&
        voucher.order_details?.order_nos && (
          <ReadOnlyFieldRow label="Order no." value={voucher.order_details.order_nos} />
        )}

      {(hasStock || hasEntries) && <div className="border-b border-gray-300 shrink-0" />}

      {hasStock &&
        (isSplitStock ? (
          <ReadOnlySplitStockTable entries={voucher.stock_entries} />
        ) : (
          <ReadOnlyStockTable entries={voucher.stock_entries} variant={stockTableVariant} />
        ))}

      {showDoubleEntryTable && (
        <ReadOnlyDoubleEntryTable
          entries={voucher.entries}
          balances={balances}
          bills={voucher.bill_references}
        />
      )}

      {voucher.bill_references?.length > 0 && !showDoubleEntryTable && (
        <ReadOnlyBillReferences bills={voucher.bill_references} ledgerNames={ledgerNames} />
      )}
    </>
  );
}
