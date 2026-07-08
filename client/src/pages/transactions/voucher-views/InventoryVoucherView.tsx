import {
  type Voucher,
  formatDate,
  ReadOnlyFieldRow,
  ReadOnlyStockTable,
  ReadOnlySplitStockTable,
  ReadOnlyDoubleEntryTable,
  ReadOnlyBillReferences,
  ReadOnlyLedgerPartyHeader,
  ReadOnlyTrackingStockTable,
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
  // Rejection In/Out use Tally's tracking layout — a two-column Ledger Account /
  // party name & address header + Actual/Billed item table with a godown sub-row.
  const isTracking = t === 'Rejection In' || t === 'Rejection Out';
  const trackingPartyLabel =
    t === 'Rejection Out' ? "Supplier's Name and Address" : "Customer's Name and Address";
  const trackingAddress =
    [voucher.party_details?.address, voucher.party_details?.state, voucher.party_details?.country]
      .filter(Boolean)
      .join('\n') || null;
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

      {voucher.party_name &&
        (isTracking ? (
          <ReadOnlyLedgerPartyHeader
            ledgerName={voucher.party_name}
            partyLabel={trackingPartyLabel}
            partyName={
              voucher.party_details?.mailing_name ||
              voucher.party_details?.supplier_name ||
              voucher.party_name
            }
            address={trackingAddress}
          />
        ) : (
          <ReadOnlyFieldRow
            label="Party A/c name"
            value={voucher.party_name}
            balance={
              voucher.party_ledger_id != null ? balances[voucher.party_ledger_id] : undefined
            }
          />
        ))}

      {voucher.sales_purchase_ledger_name && (
        <ReadOnlyFieldRow
          label={t === 'Sales Order' || t === 'Delivery Note' ? 'Sales ledger' : 'Purchase ledger'}
          value={voucher.sales_purchase_ledger_name}
          balance={
            voucher.sales_purchase_ledger_id != null
              ? balances[voucher.sales_purchase_ledger_id]
              : undefined
          }
        />
      )}

      {sourceGodownRowLabel && voucher.order_details?.source_godown_name && (
        <ReadOnlyFieldRow
          label={sourceGodownRowLabel}
          value={voucher.order_details.source_godown_name}
        />
      )}

      {(() => {
        const isJobWork = t === 'Job Work In Order' || t === 'Job Work Out Order';
        const isOrder = t === 'Sales Order' || t === 'Purchase Order';
        if (!isJobWork && !isOrder) return null;
        // Job Work orders mirror Tally — Order no. defaults to the voucher number
        // when it wasn't explicitly captured. Sales/Purchase Orders show it only
        // when set.
        const orderNo =
          voucher.order_details?.order_nos || (isJobWork ? voucher.voucher_number : '');
        return orderNo ? <ReadOnlyFieldRow label="Order no." value={orderNo} /> : null;
      })()}

      {(hasStock || hasEntries) && <div className="border-b border-gray-300 shrink-0" />}

      {hasStock &&
        (isSplitStock ? (
          <ReadOnlySplitStockTable
            entries={voucher.stock_entries}
            heading={t === 'Manufacturing Journal' ? 'Manufacturing' : 'Transfer of Materials'}
          />
        ) : isTracking ? (
          <ReadOnlyTrackingStockTable entries={voucher.stock_entries} />
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
