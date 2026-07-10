import { cn } from '@/lib/utils';
import {
  formatAmount,
  formatDate,
  type VoucherEntry,
  type PayrollEntry,
  type AttendanceEntry,
  type BillReference,
} from './sharedTypes';

// Shared read-only building blocks for every voucher view. Data shapes +
// format helpers live in sharedTypes.ts; the stock/item tables live in
// sharedStockTables.tsx — both re-exported here so consumers keep importing
// from this file unchanged.
export * from './sharedTypes';
export * from './sharedStockTables';

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

/** Two-column party block used by tracking vouchers (Rejection In/Out): the
 *  ledger account on the left, the supplier's/customer's name & address on the
 *  right — mirrors TallyPrime's rejection/note voucher header. */
export function ReadOnlyLedgerPartyHeader({
  ledgerName,
  partyLabel,
  partyName,
  address,
}: {
  ledgerName: string;
  partyLabel: string;
  partyName: string;
  address?: string | null;
}) {
  return (
    <div className="flex border-b border-black shrink-0 bg-white">
      <div className="flex-1 border-r border-gray-300 px-3 py-1">
        <div className="text-center text-sm font-semibold text-black border-b border-gray-200 pb-0.5 mb-1">
          Ledger Account
        </div>
        <div className="text-sm font-bold text-black">{ledgerName || '—'}</div>
      </div>
      <div className="flex-1 px-3 py-1">
        <div className="text-center text-sm font-semibold text-black border-b border-gray-200 pb-0.5 mb-1">
          {partyLabel}
        </div>
        <div className="text-sm font-bold text-black">{partyName || '—'}</div>
        {address && (
          <div className="text-xs text-zinc-600 whitespace-pre-line leading-tight">{address}</div>
        )}
      </div>
    </div>
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
        <div className="w-48 text-sm font-semibold text-black">Employee Name</div>
        <div className="w-28 text-sm font-semibold text-black">Employee Number</div>
        <div className="w-44 text-sm font-semibold text-black">Attendance/Production Type</div>
        <div className="flex-1" />
        <div className="w-24 text-right text-sm font-semibold text-black">Value</div>
        <div className="w-16 text-right text-sm font-semibold text-black">Unit</div>
      </div>
      <div className="flex-1 overflow-y-auto min-h-0">
        {entries.map((a) => {
          // Tally renders attendance values without a forced ".00" (e.g. "30", "30.5").
          const unit = a.unit || 'Days';
          const fmtVal = (n: number | null | undefined) =>
            n == null ? '' : Number(n).toLocaleString('en-IN', { maximumFractionDigits: 2 });
          return (
            <div
              key={a.entry_id}
              className="flex items-center border-b border-gray-100 min-h-[22px] px-3 py-0"
            >
              <div className="w-48 text-sm text-black font-semibold truncate">
                {a.employee_name || '—'}
              </div>
              <div className="w-28 text-sm text-black">{a.employee_number || '—'}</div>
              <div className="w-44 text-sm text-black">{a.attendance_type_name || '—'}</div>
              <div className="flex-1 text-sm italic text-gray-600">
                {a.cur_bal != null ? `Cur Bal: ${fmtVal(a.cur_bal)} ${unit}` : ''}
              </div>
              <div className="w-24 text-right text-sm font-bold text-black">{fmtVal(a.value)}</div>
              <div className="w-16 text-right text-sm text-black">{unit}</div>
            </div>
          );
        })}
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
