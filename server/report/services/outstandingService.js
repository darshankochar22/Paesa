/**
 * outstandingService.js
 *
 * Outstanding / ageing reports:
 *   5. calculateOutstanding -- receivables / payables outstanding
 *   6. calculateAgeing      -- ageing analysis with configurable buckets
 */
const {
  db, sql,
  resolveOutstandingSide,
} = require('./reportHelpers');
const {
  vouchers,
  voucherEntries,
  voucherBillReferences,
  ledgers,
  groups,
} = require('../../db/schema');

// ---------------------------------------------------------------------------
// 5. calculateOutstanding -- receivables / payables outstanding
//    type: 'receivable' | 'payable' | { reportId, outstandingType, ... }
// ---------------------------------------------------------------------------
const calculateOutstanding = async (company_id, fy_id, type = 'receivable') => {
  try {
    const isPayable = resolveOutstandingSide(type) === 'payable';
    const groupName = isPayable ? 'Sundry Creditors' : 'Sundry Debtors';

    const rows = await db.all(
      sql`SELECT
            l.ledger_id,
            l.name AS party_name,
            vbr.bill_name,
            COALESCE(MAX(CASE WHEN vbr.bill_type IN ('New Ref', 'Advance') THEN v.date ELSE NULL END), MAX(v.date)) AS bill_date,
            MAX(CASE WHEN vbr.bill_type IN ('New Ref', 'Advance') THEN vbr.due_date ELSE NULL END) AS due_date,
            MAX(CASE WHEN vbr.bill_type IN ('New Ref', 'Advance') THEN vbr.credit_period ELSE NULL END) AS credit_period,
            SUM(
              CASE
                WHEN ${isPayable ? sql`ve.entry_type = 'Dr'` : sql`ve.entry_type = 'Cr'`} THEN -vbr.amount
                ELSE vbr.amount
              END
            ) AS total_amount
          FROM ${voucherBillReferences} vbr
          INNER JOIN ${vouchers} v ON v.voucher_id = vbr.voucher_id
          INNER JOIN ${ledgers} l ON l.ledger_id = vbr.ledger_id
          INNER JOIN ${groups} g ON g.group_id = l.group_id
          LEFT JOIN (
            SELECT voucher_id, ledger_id,
              CASE WHEN SUM(CASE WHEN type = 'Dr' THEN amount ELSE -amount END) >= 0 THEN 'Dr' ELSE 'Cr' END AS entry_type
            FROM ${voucherEntries}
            GROUP BY voucher_id, ledger_id
          ) ve ON ve.voucher_id = vbr.voucher_id AND ve.ledger_id = vbr.ledger_id
          WHERE v.company_id = ${company_id}
            AND v.fy_id = ${fy_id}
            AND v.is_cancelled = 0
            AND COALESCE(v.is_optional, 0) = 0
            AND COALESCE(v.is_post_dated, 0) = 0
            AND vbr.bill_type IN ('New Ref', 'Advance', 'Agst Ref')
            AND l.is_bill_wise = 1
            AND g.company_id = ${company_id}
            AND g.name = ${groupName}
          GROUP BY l.ledger_id, l.name, vbr.bill_name
          HAVING SUM(CASE WHEN vbr.bill_type IN ('New Ref', 'Advance') THEN 1 ELSE 0 END) > 0
             AND ABS(total_amount) > 0.01
          ORDER BY l.name ASC, MAX(v.date) DESC`
    );

    const total = rows.reduce((s, r) => s + (Number(r.total_amount) || 0), 0);

    const mapped = rows.map(r => ({
      ledger_id: r.ledger_id,
      party_name: r.party_name,
      bill_name: r.bill_name,
      bill_date: r.bill_date,
      due_date: r.due_date,
      credit_period: r.credit_period,
      amount: Number(r.total_amount) || 0,
    }));

    return { success: true, rows: mapped, total };
  } catch (err) {
    return { success: false, error: err.message };
  }
};

// ---------------------------------------------------------------------------
// 6. calculateAgeing -- ageing analysis with configurable buckets
//    type: 'receivable' | 'payable'
//    buckets: array of { label, minDays, maxDays }
// ---------------------------------------------------------------------------
const calculateAgeing = async (company_id, fy_id, type = 'receivable', buckets = null) => {
  try {
    const defaultBuckets = [
      { label: '0-30', minDays: 0, maxDays: 30 },
      { label: '31-60', minDays: 31, maxDays: 60 },
      { label: '61-90', minDays: 61, maxDays: 90 },
      { label: '90+', minDays: 91, maxDays: 999999 },
    ];
    const ageingBuckets = buckets && buckets.length > 0 ? buckets : defaultBuckets;
    const asOnDate = new Date().toISOString().slice(0, 10);
    const isPayable = resolveOutstandingSide(type) === 'payable';
    const groupName = isPayable ? 'Sundry Creditors' : 'Sundry Debtors';

    const rows = await db.all(
      sql`SELECT
            l.ledger_id,
            l.name AS party_name,
            vbr.bill_name,
            COALESCE(MAX(CASE WHEN vbr.bill_type IN ('New Ref', 'Advance') THEN v.date ELSE NULL END), MAX(v.date)) AS bill_date,
            MAX(CASE WHEN vbr.bill_type IN ('New Ref', 'Advance') THEN vbr.due_date ELSE NULL END) AS due_date,
            SUM(
              CASE
                WHEN ${isPayable ? sql`ve.entry_type = 'Dr'` : sql`ve.entry_type = 'Cr'`} THEN -vbr.amount
                ELSE vbr.amount
              END
            ) AS total_amount
          FROM ${voucherBillReferences} vbr
          INNER JOIN ${vouchers} v ON v.voucher_id = vbr.voucher_id
          INNER JOIN ${ledgers} l ON l.ledger_id = vbr.ledger_id
          INNER JOIN ${groups} g ON g.group_id = l.group_id
          LEFT JOIN (
            SELECT voucher_id, ledger_id,
              CASE WHEN SUM(CASE WHEN type = 'Dr' THEN amount ELSE -amount END) >= 0 THEN 'Dr' ELSE 'Cr' END AS entry_type
            FROM ${voucherEntries}
            GROUP BY voucher_id, ledger_id
          ) ve ON ve.voucher_id = vbr.voucher_id AND ve.ledger_id = vbr.ledger_id
          WHERE v.company_id = ${company_id}
            AND v.fy_id = ${fy_id}
            AND v.is_cancelled = 0
            AND COALESCE(v.is_optional, 0) = 0
            AND COALESCE(v.is_post_dated, 0) = 0
            AND vbr.bill_type IN ('New Ref', 'Advance', 'Agst Ref')
            AND l.is_bill_wise = 1
            AND g.company_id = ${company_id}
            AND g.name = ${groupName}
          GROUP BY l.ledger_id, l.name, vbr.bill_name
          HAVING SUM(CASE WHEN vbr.bill_type IN ('New Ref', 'Advance') THEN 1 ELSE 0 END) > 0
             AND ABS(total_amount) > 0.01
          ORDER BY l.name ASC`
    );

    // Compute overdue days and assign each bill to a bucket.
    const bucketTotals = {};
    for (const b of ageingBuckets) {
      bucketTotals[b.label] = 0;
    }

    const mapped = rows.map(r => {
      const amount = Number(r.total_amount) || 0;
      const overdueDays = r.due_date
        ? Math.max(0, Math.floor((new Date(asOnDate).getTime() - new Date(r.due_date).getTime()) / (1000 * 60 * 60 * 24)))
        : 0;

      let assignedBucket = ageingBuckets[ageingBuckets.length - 1].label;
      for (const b of ageingBuckets) {
        if (overdueDays >= b.minDays && overdueDays <= b.maxDays) {
          assignedBucket = b.label;
          break;
        }
      }
      bucketTotals[assignedBucket] += amount;

      return {
        ledger_id: r.ledger_id,
        party_name: r.party_name,
        bill_name: r.bill_name,
        bill_date: r.bill_date,
        due_date: r.due_date,
        overdue_days: overdueDays,
        amount,
        bucket: assignedBucket,
      };
    });

    const total = mapped.reduce((s, r) => s + r.amount, 0);

    return { success: true, rows: mapped, total, bucketTotals, as_on: asOnDate };
  } catch (err) {
    return { success: false, error: err.message };
  }
};

module.exports = {
  calculateOutstanding,
  calculateAgeing,
};
