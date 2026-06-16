const { db } = require('../db/index');
const { sql } = require('drizzle-orm');
const { voucherBillReferences, vouchers, ledgers, groups } = require('../db/schema');

// ---------------------------------------------------------------------------
// Outstanding Report Service  (READ-ONLY)
//
// Bills Receivable (Sundry Debtors) & Bills Payable (Sundry Creditors) with
// ageing buckets: 0-30 / 31-60 / 61-90 / 90+ days.
//
// Reuses the pending-bills logic from voucherService.getPendingBills:
//   bills of bill_type IN ('New Ref','Advance') on non-cancelled vouchers,
//   grouped by (ledger_id, bill_name), summed amount, kept when total > 0.01.
// ---------------------------------------------------------------------------

// Ageing buckets keyed off how many days a bill is overdue relative to today.
// A bill not yet due (due_date in the future / null) sits in the 0-30 bucket
// as "not overdue / current".
const AGEING_BUCKETS = ['0-30', '31-60', '61-90', '90+'];

const dayDiff = (fromDate, toDate) => {
  if (!fromDate) return 0;
  const a = new Date(fromDate);
  const b = new Date(toDate);
  if (isNaN(a.getTime()) || isNaN(b.getTime())) return 0;
  return Math.floor((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24));
};

const bucketFor = (overdueDays) => {
  if (overdueDays <= 30) return '0-30';
  if (overdueDays <= 60) return '31-60';
  if (overdueDays <= 90) return '61-90';
  return '90+';
};

// Shared engine. groupName is the predefined group ('Sundry Debtors' /
// 'Sundry Creditors') whose ledgers are the parties for this report.
const buildOutstanding = async (company_id, fy_id, groupName) => {
  // Today's date as the ageing reference point (ISO yyyy-mm-dd).
  const asOnDate = new Date().toISOString().slice(0, 10);

  // Pending bills for every party ledger that belongs to the given group.
  // Mirrors voucherService.getPendingBills, generalised across all ledgers in
  // the group via a JOIN on ledgers -> groups (matched by group name).
  const rows = await db.all(
    sql`
      SELECT
        l.ledger_id              AS ledger_id,
        l.name                   AS party_name,
        vbr.bill_name            AS bill_name,
        MAX(v.date)              AS bill_date,
        MAX(vbr.due_date)        AS due_date,
        MAX(vbr.credit_period)   AS credit_period,
        SUM(vbr.amount)          AS total_amount
      FROM ${voucherBillReferences} vbr
      JOIN ${vouchers} v ON v.voucher_id = vbr.voucher_id
      JOIN ${ledgers} l  ON l.ledger_id = vbr.ledger_id
      JOIN ${groups} g   ON g.group_id = l.group_id
      WHERE v.company_id = ${company_id}
        AND v.fy_id = ${fy_id}
        AND v.is_cancelled = 0
        AND vbr.bill_type IN ('New Ref', 'Advance')
        AND g.company_id = ${company_id}
        AND g.name = ${groupName}
      GROUP BY l.ledger_id, l.name, vbr.bill_name
      HAVING total_amount > 0.01
      ORDER BY l.name ASC, MAX(v.date) DESC
    `
  );

  // Per-bucket totals scaffold.
  const bucketTotals = AGEING_BUCKETS.reduce((acc, b) => { acc[b] = 0; return acc; }, {});

  const resultRows = rows.map((row) => {
    const balance = Number(row.total_amount) || 0;
    // Overdue days: positive once the due date has passed. Bills with no due
    // date or a future due date are treated as current (0 overdue days).
    const overdueDays = row.due_date ? Math.max(0, dayDiff(row.due_date, asOnDate)) : 0;
    const ageing = bucketFor(overdueDays);

    bucketTotals[ageing] += balance;

    return {
      ledger_id: row.ledger_id,
      party: row.party_name,
      bill: row.bill_name,
      bill_date: row.bill_date,
      due_date: row.due_date,
      credit_period: row.credit_period,
      overdue_days: overdueDays,
      balance,
      ageing,
    };
  });

  const total = resultRows.reduce((s, r) => s + r.balance, 0);

  return { rows: resultRows, total, bucketTotals, as_on: asOnDate };
};

module.exports = {
  billsReceivable: async (company_id, fy_id) => {
    try {
      const { rows, total, bucketTotals, as_on } =
        await buildOutstanding(company_id, fy_id, 'Sundry Debtors');
      return { success: true, as_on, rows, total, bucketTotals };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  billsPayable: async (company_id, fy_id) => {
    try {
      const { rows, total, bucketTotals, as_on } =
        await buildOutstanding(company_id, fy_id, 'Sundry Creditors');
      return { success: true, as_on, rows, total, bucketTotals };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },
};
