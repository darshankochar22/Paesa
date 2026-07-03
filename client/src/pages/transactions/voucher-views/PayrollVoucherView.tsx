import { type Voucher, ReadOnlyFieldRow, ReadOnlyDoubleEntryTable, ReadOnlyPayrollTable } from "./shared";

// Payroll voucher — employee pay-head lines, plus its accounting posting (if any).
export default function PayrollVoucherView({ voucher, balances }: { voucher: Voucher; balances: Record<number, string> }) {
  const hasEntries = voucher.entries.length > 0;
  return (
    <>
      {voucher.party_name && <ReadOnlyFieldRow label="Party A/c name" value={voucher.party_name} />}
      {hasEntries && <div className="border-b border-gray-300 shrink-0" />}
      {hasEntries && (
        <ReadOnlyDoubleEntryTable entries={voucher.entries} balances={balances} bills={voucher.bill_references} />
      )}
      {voucher.payroll_entries?.length > 0 && <ReadOnlyPayrollTable entries={voucher.payroll_entries} />}
    </>
  );
}
