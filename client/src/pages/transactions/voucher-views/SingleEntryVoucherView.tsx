import {
  type Voucher,
  formatDate,
  ReadOnlyFieldRow,
  ReadOnlyParticularsTable,
  ReadOnlyDoubleEntryTable,
} from './shared';

// Single-entry accounting vouchers — Contra / Payment / Receipt / Journal /
// Reversing Journal / Memorandum. Rendered in the SAME mode the voucher was
// entered in (TallyPrime does the same on alteration):
//
// - Double-entry: every line prefixed Dr/Cr with separate Debit/Credit columns
//   and the ledger's running balance beneath it (also the fallback for any
//   voucher with no stored entry_mode, e.g. imports/legacy rows).
// - Single-entry: an "Account" header (the single cash/bank leg) plus a
//   Particulars/Amount grid, each particular showing its "Cur Bal:" — matching
//   the single-entry entry screen. The account is the leg on the money side
//   (Receipt → Dr, Payment/Contra/Journal → Cr); every other line is a particular.
export default function SingleEntryVoucherView({
  voucher,
  balances,
}: {
  voucher: Voucher;
  balances: Record<number, string>;
}) {
  const bills = voucher.bill_references;
  const entries = voucher.entries;
  const hasEntries = entries.length > 0;

  const accountSide = voucher.voucher_type === 'Receipt' ? 'Dr' : 'Cr';
  const accountEntries = entries.filter((e) => e.type === accountSide);
  const particularEntries = entries.filter((e) => e.type !== accountSide);
  // The single-entry (Account + Particulars) layout needs exactly one leg on the
  // money side and at least one particular.
  const shapeFits = accountEntries.length === 1 && particularEntries.length > 0;
  // Render single-entry when the voucher was keyed that way (entry_mode === 'single'),
  // OR — for vouchers saved before entry_mode was recorded (null) — for the types
  // Tally shows single-entry by default (Receipt/Payment/Contra). An explicit
  // 'double' always stays double, and Journal-style types stay double.
  const DERIVE_TYPES = ['Receipt', 'Payment', 'Contra'];
  const isSingle =
    shapeFits &&
    (voucher.entry_mode === 'single' ||
      (voucher.entry_mode == null && DERIVE_TYPES.includes(voucher.voucher_type)));

  return (
    <>
      {voucher.voucher_type === 'Reversing Journal' && voucher.applicable_upto && (
        <ReadOnlyFieldRow label="Applicable Upto" value={formatDate(voucher.applicable_upto)} />
      )}

      {isSingle ? (
        <>
          <ReadOnlyFieldRow
            label="Account"
            value={accountEntries[0].ledger_name}
            balance={balances[accountEntries[0].ledger_id]}
            balanceLabel="Current balance"
          />
          <ReadOnlyParticularsTable entries={particularEntries} bills={bills} balances={balances} />
        </>
      ) : (
        hasEntries && (
          <ReadOnlyDoubleEntryTable entries={entries} balances={balances} bills={bills} />
        )
      )}
    </>
  );
}
