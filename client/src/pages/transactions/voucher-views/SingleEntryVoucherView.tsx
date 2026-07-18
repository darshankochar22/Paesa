import { type Voucher, formatDate, ReadOnlyFieldRow, ReadOnlyDoubleEntryTable } from './shared';

// Single-entry accounting vouchers — Contra / Payment / Receipt / Journal /
// Reversing Journal / Memorandum. Rendered in TallyPrime's double-entry
// alteration format: every line is prefixed Dr/Cr, with separate Debit and
// Credit columns and the ledger's running balance (Cur Bal) beneath it. This
// mirrors the "Accounting Voucher Alteration" view Tally shows when you drill
// into a voucher from a report — no single "Party A/c name" header, no single
// "Amount" column — even when the voucher posts to several ledgers (e.g. a bank
// payment split across multiple fixed assets). Bill-wise refs render inline
// under their ledger.
export default function SingleEntryVoucherView({
  voucher,
  balances,
}: {
  voucher: Voucher;
  balances: Record<number, string>;
}) {
  const bills = voucher.bill_references;
  const hasEntries = voucher.entries.length > 0;

  return (
    <>
      {voucher.voucher_type === 'Reversing Journal' && voucher.applicable_upto && (
        <ReadOnlyFieldRow label="Applicable Upto" value={formatDate(voucher.applicable_upto)} />
      )}

      {hasEntries && (
        <ReadOnlyDoubleEntryTable entries={voucher.entries} balances={balances} bills={bills} />
      )}
    </>
  );
}
