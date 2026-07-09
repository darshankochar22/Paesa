import { type Voucher, formatAmount, ReadOnlyDoubleEntryTable } from './shared';

// Payroll voucher — mirrors TallyPrime's Payroll Voucher view:
//   Account: <bank/cash ledger>  (Cur Bal)
//   Particulars ................................................ Amount
//   Primary Cost Category ................................  <total> Dr
//     <Employee> ..........................................  <total> Dr
//       <Pay Head>   <amt> Dr   Cur Bal: <bal>
//   -----------------------------------------------------------------
//                                                          <total> Cr
// The employee → pay-head breakdown comes from payroll_entries; each pay head's
// Dr/Cr direction and current balance are looked up from the accounting entries
// by ledger name (earnings post Dr, deductions Cr). Falls back to the plain
// double-entry table when a payroll voucher carries no employee lines.
export default function PayrollVoucherView({
  voucher,
  balances,
}: {
  voucher: Voucher;
  balances: Record<number, string>;
}) {
  const payroll = voucher.payroll_entries ?? [];

  // Fallback — a payroll voucher with only accounting lines.
  if (payroll.length === 0) {
    const hasEntries = voucher.entries.length > 0;
    return (
      <>
        {voucher.party_name && <AccountRow name={voucher.party_name} bal={undefined} />}
        {hasEntries && <div className="border-b border-gray-300 shrink-0" />}
        {hasEntries && (
          <ReadOnlyDoubleEntryTable
            entries={voucher.entries}
            balances={balances}
            bills={voucher.bill_references}
          />
        )}
      </>
    );
  }

  // Pay-head ledger name → { type, bal } from the accounting entries, so each
  // pay-head line can show its Dr/Cr direction and current balance (Tally style).
  const byLedgerName = voucher.entries.reduce<Record<string, { type: 'Dr' | 'Cr'; bal?: string }>>(
    (acc, e) => {
      if (e.ledger_name) acc[e.ledger_name] = { type: e.type, bal: balances[e.ledger_id] };
      return acc;
    },
    {},
  );

  // The "Account" ledger is the bank/cash the net pay is credited to — the party,
  // or failing that the sole non-pay-head credit entry.
  const accountName =
    voucher.party_name || voucher.entries.find((e) => e.type === 'Cr')?.ledger_name || '';
  const accountBal =
    voucher.party_ledger_id != null
      ? balances[voucher.party_ledger_id]
      : (() => {
          const cr = voucher.entries.find((e) => e.type === 'Cr');
          return cr ? balances[cr.ledger_id] : undefined;
        })();

  // Group pay-head lines by employee, preserving first-seen order. Earnings add,
  // deductions subtract, so each employee/category total nets correctly.
  const signed = (amt: number, type: 'Dr' | 'Cr') => (type === 'Cr' ? -amt : amt);
  const order: string[] = [];
  const groups: Record<
    string,
    {
      name: string;
      number: string;
      lines: { name: string; amount: number; type: 'Dr' | 'Cr'; bal?: string }[];
    }
  > = {};
  for (const pe of payroll) {
    const key = String(pe.employee_id ?? pe.employee_number ?? pe.employee_name);
    if (!groups[key]) {
      groups[key] = { name: pe.employee_name || '—', number: pe.employee_number || '', lines: [] };
      order.push(key);
    }
    const meta = byLedgerName[pe.pay_head_name] || { type: 'Dr' as const, bal: undefined };
    groups[key].lines.push({
      name: pe.pay_head_name || '—',
      amount: pe.amount || 0,
      type: meta.type,
      bal: meta.bal,
    });
  }

  const employees = order.map((k) => groups[k]);
  const empTotal = (e: (typeof employees)[number]) =>
    e.lines.reduce((s, l) => s + signed(l.amount, l.type), 0);
  const categoryTotal = employees.reduce((s, e) => s + empTotal(e), 0);

  const drcr = (amt: number, type: 'Dr' | 'Cr') => `${formatAmount(Math.abs(amt))} ${type}`;
  const netType = (n: number): 'Dr' | 'Cr' => (n < 0 ? 'Cr' : 'Dr');

  return (
    <>
      <AccountRow name={accountName} bal={accountBal} />

      {/* Particulars / Amount header */}
      <div className="flex border-b border-gray-300 shrink-0 px-3 py-1 bg-white">
        <div className="flex-1 text-sm font-semibold text-black">Particulars</div>
        <div className="w-40 text-right text-sm font-semibold text-black">Amount</div>
      </div>

      <div className="flex-1 overflow-y-auto min-h-0">
        {/* Cost category (Tally defaults employees to the Primary Cost Category) */}
        <div className="flex items-center px-3 py-1">
          <div className="flex-1 text-sm font-bold text-black">Primary Cost Category</div>
          <div className="w-40 text-right text-sm font-bold text-black tabular-nums">
            {drcr(categoryTotal, netType(categoryTotal))}
          </div>
        </div>

        {employees.map((emp, ei) => {
          const total = empTotal(emp);
          return (
            <div key={ei}>
              <div className="flex items-center px-3 min-h-[22px]">
                <div className="flex-1 text-sm font-semibold text-black pl-4">{emp.name}</div>
                <div className="w-40 text-right text-sm font-semibold text-black tabular-nums">
                  {drcr(total, netType(total))}
                </div>
              </div>
              {emp.lines.map((l, li) => (
                <div key={li} className="flex items-baseline px-3 min-h-[20px]">
                  <div className="w-56 text-sm text-black pl-10">{l.name}</div>
                  <div className="w-28 text-right text-sm text-black tabular-nums">
                    {drcr(l.amount, l.type)}
                  </div>
                  <div className="flex-1 pl-3 text-xs italic">
                    {l.bal && (
                      <>
                        Cur Bal:{' '}
                        <span
                          className={
                            l.bal.includes('Cr')
                              ? 'text-black font-bold'
                              : 'text-zinc-500 font-semibold'
                          }
                        >
                          {l.bal}
                        </span>
                      </>
                    )}
                  </div>
                  <div className="w-40" />
                </div>
              ))}
            </div>
          );
        })}
      </div>

      {/* Bottom total — the amount credited to the Account ledger. */}
      <div className="flex border-t border-black shrink-0 px-3 py-1 bg-white">
        <div className="flex-1" />
        <div className="w-40 text-right text-sm font-bold text-black tabular-nums">
          {drcr(categoryTotal, 'Cr')}
        </div>
      </div>
    </>
  );
}

/** "Account: <ledger>" band with an optional current-balance sub-line — the
 *  Payroll voucher's counterpart to the Party A/c name row. */
function AccountRow({ name, bal }: { name: string; bal?: string }) {
  return (
    <div className="border-b border-gray-300 shrink-0 py-1 px-3">
      <div className="flex items-center">
        <span className="text-sm text-black shrink-0 w-40">Account</span>
        <span className="text-sm text-black shrink-0 mr-2">:</span>
        <span className="text-sm font-semibold text-black flex-1">{name || '—'}</span>
      </div>
      {bal && (
        <div className="pl-[10.5rem] text-xs italic">
          Cur Bal:{' '}
          <span
            className={bal.includes('Cr') ? 'text-black font-bold' : 'text-zinc-500 font-semibold'}
          >
            {bal}
          </span>
        </div>
      )}
    </div>
  );
}
