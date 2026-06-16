const { db } = require('../db/index');
const { sql } = require('drizzle-orm');
const { voucherEntries, vouchers, ledgers } = require('../db/schema');

// ---------------------------------------------------------------------------
// Cash Flow statement
//
// Tracks money moving through the company's Cash & Bank ledgers over a period.
// A cash/bank ledger that is DEBITED means money has come IN (inflow); when it
// is CREDITED money has gone OUT (outflow). The opposite side of each such
// voucher (the counter-ledgers) tells us the source / application of the funds.
//
// We therefore:
//   1. Resolve the set of Cash & Bank ledgers for the company.
//   2. Find every non-cancelled voucher in [from_date, to_date] that touches at
//      least one of those ledgers.
//   3. For each of those vouchers, take the COUNTER entries (lines whose ledger
//      is NOT a cash/bank ledger) and classify them as inflow / outflow based on
//      the net cash/bank movement of that voucher.
//
// Read-only: mirrors the db / sql / schema query patterns in reportService.js.
// ---------------------------------------------------------------------------

const cashFlow = async (company_id, fy_id, from_date, to_date) => {
  try {
    // 1. Cash & Bank ledgers for this company.
    const cashBankLedgers = await db.all(
      sql`SELECT ${ledgers.ledgerId} AS ledger_id, ${ledgers.name} AS name,
                 ${ledgers.ledgerType} AS ledger_type
          FROM ${ledgers}
          WHERE ${ledgers.companyId} = ${company_id}
            AND ${ledgers.isActive} = 1
            AND ${ledgers.ledgerType} IN ('Cash', 'Bank')`
    );

    if (cashBankLedgers.length === 0) {
      return { success: false, error: 'No Cash or Bank ledgers found' };
    }

    const cashBankIds = cashBankLedgers.map(l => l.ledger_id);
    const cashBankIdSet = new Set(cashBankIds);
    const idList = sql.join(cashBankIds.map(id => sql`${id}`), sql`, `);

    // 2. Pull every entry of every non-cancelled voucher (in range) that touches
    //    a cash/bank ledger. We fetch ALL entries of those vouchers so we can see
    //    both the cash/bank side and the counter (source/application) side.
    const conditions = [
      sql`v.company_id = ${company_id}`,
      sql`v.fy_id = ${fy_id}`,
      sql`v.is_cancelled = 0`,
      sql`COALESCE(v.is_optional, 0) = 0`,
      sql`COALESCE(v.is_post_dated, 0) = 0`,
    ];
    if (from_date) conditions.push(sql`v.date >= ${from_date}`);
    if (to_date)   conditions.push(sql`v.date <= ${to_date}`);

    const rows = await db.all(
      sql`SELECT e.voucher_id, e.ledger_id, e.ledger_name, e.type, e.amount,
                 v.voucher_type, v.date
          FROM ${voucherEntries} e
          INNER JOIN ${vouchers} v ON v.voucher_id = e.voucher_id
          WHERE ${sql.join(conditions, sql` AND `)}
            AND e.voucher_id IN (
              SELECT DISTINCT ce.voucher_id
              FROM ${voucherEntries} ce
              WHERE ce.ledger_id IN (${idList})
            )
          ORDER BY v.date ASC, e.voucher_id ASC`
    );

    // 3. Group entries by voucher so each voucher's net cash movement and its
    //    counter-ledger lines can be evaluated together.
    const byVoucher = new Map();
    for (const r of rows) {
      if (!byVoucher.has(r.voucher_id)) {
        byVoucher.set(r.voucher_id, {
          voucher_type: r.voucher_type,
          date: r.date,
          cashEntries: [],
          counterEntries: [],
        });
      }
      const v = byVoucher.get(r.voucher_id);
      if (cashBankIdSet.has(r.ledger_id)) v.cashEntries.push(r);
      else v.counterEntries.push(r);
    }

    // Accumulators keyed by counter-ledger and by voucher_type.
    const ledgerMap = new Map();        // ledger_id -> { ledger_name, inflow, outflow }
    const voucherTypeMap = new Map();   // voucher_type -> { inflow, outflow }
    let totalInflow = 0;
    let totalOutflow = 0;

    const signed = (e) => (e.type === 'Dr' ? e.amount : -e.amount);

    for (const v of byVoucher.values()) {
      // Net cash/bank movement: positive => cash came IN, negative => cash went OUT.
      const netCash = v.cashEntries.reduce((s, e) => s + signed(e), 0);
      if (netCash === 0) continue; // contra within cash/bank only, or balanced — no net flow

      const isInflow = netCash > 0;

      for (const ce of v.counterEntries) {
        const amount = Math.abs(ce.amount);
        if (amount === 0) continue;

        if (!ledgerMap.has(ce.ledger_id)) {
          ledgerMap.set(ce.ledger_id, {
            ledger_id: ce.ledger_id,
            ledger_name: ce.ledger_name,
            inflow: 0,
            outflow: 0,
          });
        }
        const lm = ledgerMap.get(ce.ledger_id);

        if (!voucherTypeMap.has(v.voucher_type)) {
          voucherTypeMap.set(v.voucher_type, {
            voucher_type: v.voucher_type,
            inflow: 0,
            outflow: 0,
          });
        }
        const vt = voucherTypeMap.get(v.voucher_type);

        if (isInflow) {
          lm.inflow += amount;
          vt.inflow += amount;
          totalInflow += amount;
        } else {
          lm.outflow += amount;
          vt.outflow += amount;
          totalOutflow += amount;
        }
      }
    }

    const byCounterLedger = Array.from(ledgerMap.values())
      .map(l => ({ ...l, net: l.inflow - l.outflow }))
      .sort((a, b) => (b.inflow + b.outflow) - (a.inflow + a.outflow));

    const byVoucherType = Array.from(voucherTypeMap.values())
      .map(t => ({ ...t, net: t.inflow - t.outflow }))
      .sort((a, b) => (b.inflow + b.outflow) - (a.inflow + a.outflow));

    return {
      success: true,
      from_date: from_date || null,
      to_date: to_date || null,
      cashBankLedgers: cashBankLedgers.map(l => ({
        ledger_id: l.ledger_id,
        ledger_name: l.name,
        ledger_type: l.ledger_type,
      })),
      byCounterLedger,
      byVoucherType,
      totalInflow,
      totalOutflow,
      netCashFlow: totalInflow - totalOutflow,
    };
  } catch (err) {
    return { success: false, error: err.message };
  }
};

module.exports = {
  cashFlow,
};
