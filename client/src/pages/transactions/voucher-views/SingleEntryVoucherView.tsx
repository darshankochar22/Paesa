import {
  type Voucher,
  formatDate,
  ReadOnlyFieldRow, ReadOnlyParticularsTable, ReadOnlyDoubleEntryTable, ReadOnlyBillReferences,
} from "./shared";

// Single-entry accounting vouchers — Contra / Payment / Receipt / Journal /
// Reversing Journal / Memorandum. With ≤2 lines they render as a Debit/Credit
// double-entry table; with more, the primary account heads the block and the
// rest list under Particulars. Bill-wise refs render inline under their ledger.
export default function SingleEntryVoucherView({ voucher, balances }: { voucher: Voucher; balances: Record<number, string> }) {
  const bills = voucher.bill_references;
  const hasEntries = voucher.entries.length > 0;
  const accountLedger = voucher.entries.find(e => e.type === "Dr") || voucher.entries[0];
  const particulars = hasEntries && voucher.entries.length > 1
    ? voucher.entries.filter(e => e.ledger_name !== accountLedger?.ledger_name)
    : [];
  const showDoubleEntryTable = hasEntries && voucher.entries.length <= 2;
  const ledgerNames = voucher.entries.reduce<Record<number, string>>((acc, e) => {
    if (e.ledger_id) acc[e.ledger_id] = e.ledger_name;
    return acc;
  }, {});

  return (
    <>
      {voucher.voucher_type === "Reversing Journal" && voucher.applicable_upto && (
        <ReadOnlyFieldRow label="Applicable Upto" value={formatDate(voucher.applicable_upto)} />
      )}

      {voucher.party_name && <ReadOnlyFieldRow label="Party A/c name" value={voucher.party_name} />}

      {hasEntries && <div className="border-b border-gray-300 shrink-0" />}

      {particulars.length > 0 && !showDoubleEntryTable && (
        <ReadOnlyParticularsTable entries={particulars} bills={bills} />
      )}

      {showDoubleEntryTable && (
        <ReadOnlyDoubleEntryTable entries={voucher.entries} balances={balances} bills={bills} />
      )}

      {bills?.length > 0 && !showDoubleEntryTable && particulars.length === 0 && (
        <ReadOnlyBillReferences bills={bills} ledgerNames={ledgerNames} />
      )}
    </>
  );
}
