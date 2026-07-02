const { db } = require('../db/index');
const { sql } = require('drizzle-orm');
const { voucherBillReferences, vouchers, ledgers, groups, voucherEntries, voucherStockEntries, units } = require('../db/schema');
const { getBillsWithSettlements, pendingAmount } = require('./services/billSettlementService');

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
//
// Pending amounts come from the shared bill-settlement engine
// (services/billSettlementService) — the SAME New Ref/Advance origin +
// Agst Ref settlement grouping and floor-at-0 pending math the Interest and
// Ledger-Confirmation reports use — so partial-payment handling can't drift
// between reports.
const buildOutstanding = async (company_id, fy_id, groupName) => {
  // Today's date as the ageing reference point (ISO yyyy-mm-dd).
  const asOnDate = new Date().toISOString().slice(0, 10);

  const bucketTotals = AGEING_BUCKETS.reduce((acc, b) => { acc[b] = 0; return acc; }, {});

  // Party ledgers whose *direct* group is this predefined group and that carry
  // bill-wise details — the same ledger set the old JOIN (ledgers -> groups by
  // name, is_bill_wise = 1) selected.
  const ledgerRows = await db.all(
    sql`
      SELECT l.ledger_id AS ledger_id
      FROM ${ledgers} l
      JOIN ${groups} g ON g.group_id = l.group_id
      WHERE l.company_id = ${company_id}
        AND g.company_id = ${company_id}
        AND g.name = ${groupName}
        AND l.is_bill_wise = 1
    `
  );
  const ledgerIds = ledgerRows.map((r) => r.ledger_id);
  if (ledgerIds.length === 0) {
    return { rows: [], total: 0, bucketTotals, as_on: asOnDate };
  }

  const bills = await getBillsWithSettlements(company_id, fy_id, { ledger_ids: ledgerIds });

  const resultRows = bills
    .map((bill) => {
      const balance = pendingAmount(bill, null);
      // Overdue days: positive once the due date has passed. Bills with no due
      // date or a future due date are treated as current (0 overdue days).
      const overdueDays = bill.due_date ? Math.max(0, dayDiff(bill.due_date, asOnDate)) : 0;
      // Latest voucher touching the bill (origin or settlement) — drives the
      // "most recent first" ordering the old MAX(v.date) DESC produced.
      const lastActivity = bill.settlements.reduce(
        (mx, s) => (s.date > mx ? s.date : mx),
        bill.bill_date || ''
      );
      return {
        ledger_id: bill.ledger_id,
        party: bill.party_name,
        bill: bill.bill_name,
        bill_date: bill.bill_date,
        due_date: bill.due_date,
        credit_period: bill.credit_period,
        overdue_days: overdueDays,
        balance,
        ageing: bucketFor(overdueDays),
        _lastActivity: lastActivity,
      };
    })
    .filter((r) => r.balance > 0.01)
    .sort((a, b) => {
      const byParty = String(a.party).localeCompare(String(b.party));
      if (byParty !== 0) return byParty;
      return a._lastActivity < b._lastActivity ? 1 : a._lastActivity > b._lastActivity ? -1 : 0;
    });

  for (const r of resultRows) {
    bucketTotals[r.ageing] += r.balance;
    delete r._lastActivity;
  }

  const total = resultRows.reduce((s, r) => s + r.balance, 0);

  return { rows: resultRows, total, bucketTotals, as_on: asOnDate };
};

// Pending bills for a single ledger (used by Ledger Outstandings report).
//
// Mirrors TallyPrime's Ledger Outstandings columns: each bill shows an Opening
// Amount (the original New Ref / Advance value) and a Pending Amount (the net
// still outstanding after Agst Ref settlements). Amounts are signed off the
// party ledger's Dr/Cr direction in each voucher (Dr = +, Cr = -) so the client
// can render the "Dr" / "Cr" suffix directly. Unallocated amounts (bill_type
// 'On Account') are summed separately into a single On Account line.
const buildLedgerOutstanding = async (company_id, fy_id, ledger_id) => {
  const asOnDate = new Date().toISOString().slice(0, 10);

  const rows = await db.all(
    sql`
      SELECT
        vbr.bill_name            AS bill_name,
        COALESCE(MAX(CASE WHEN vbr.bill_type IN ('New Ref', 'Advance') THEN v.date ELSE NULL END), MAX(v.date)) AS bill_date,
        MAX(CASE WHEN vbr.bill_type IN ('New Ref', 'Advance') THEN vbr.due_date ELSE NULL END) AS due_date,
        MAX(CASE WHEN vbr.bill_type IN ('New Ref', 'Advance') THEN vbr.credit_period ELSE NULL END) AS credit_period,
        SUM(
          CASE WHEN vbr.bill_type IN ('New Ref', 'Advance')
               THEN (CASE WHEN ve.entry_type = 'Dr' THEN vbr.amount ELSE -vbr.amount END)
               ELSE 0 END
        ) AS opening_amount,
        SUM(CASE WHEN ve.entry_type = 'Dr' THEN vbr.amount ELSE -vbr.amount END) AS pending_amount
      FROM ${voucherBillReferences} vbr
      JOIN ${vouchers} v ON v.voucher_id = vbr.voucher_id
      JOIN ${ledgers} l  ON l.ledger_id = vbr.ledger_id
      LEFT JOIN (
        SELECT voucher_id, ledger_id, CASE WHEN SUM(CASE WHEN type = 'Dr' THEN amount ELSE -amount END) >= 0 THEN 'Dr' ELSE 'Cr' END AS entry_type
        FROM ${voucherEntries}
        GROUP BY voucher_id, ledger_id
      ) ve ON ve.voucher_id = vbr.voucher_id AND ve.ledger_id = vbr.ledger_id
      WHERE v.company_id = ${company_id}
        AND v.fy_id = ${fy_id}
        AND v.is_cancelled = 0
        AND COALESCE(v.is_optional, 0) = 0
        AND COALESCE(v.is_post_dated, 0) = 0
        AND vbr.bill_type IN ('New Ref', 'Advance', 'Agst Ref')
        AND vbr.ledger_id = ${ledger_id}
        AND l.is_bill_wise = 1
      GROUP BY vbr.bill_name
      HAVING SUM(CASE WHEN vbr.bill_type IN ('New Ref', 'Advance') THEN 1 ELSE 0 END) > 0
         AND ABS(pending_amount) > 0.01
      ORDER BY bill_date ASC
    `
  );

  // On Account: amounts booked to the party but not tied to any bill reference.
  const onAcc = await db.all(
    sql`
      SELECT
        MAX(v.date) AS date,
        SUM(CASE WHEN ve.entry_type = 'Dr' THEN vbr.amount ELSE -vbr.amount END) AS amount
      FROM ${voucherBillReferences} vbr
      JOIN ${vouchers} v ON v.voucher_id = vbr.voucher_id
      JOIN ${ledgers} l  ON l.ledger_id = vbr.ledger_id
      LEFT JOIN (
        SELECT voucher_id, ledger_id, CASE WHEN SUM(CASE WHEN type = 'Dr' THEN amount ELSE -amount END) >= 0 THEN 'Dr' ELSE 'Cr' END AS entry_type
        FROM ${voucherEntries}
        GROUP BY voucher_id, ledger_id
      ) ve ON ve.voucher_id = vbr.voucher_id AND ve.ledger_id = vbr.ledger_id
      WHERE v.company_id = ${company_id}
        AND v.fy_id = ${fy_id}
        AND v.is_cancelled = 0
        AND COALESCE(v.is_optional, 0) = 0
        AND COALESCE(v.is_post_dated, 0) = 0
        AND vbr.bill_type = 'On Account'
        AND vbr.ledger_id = ${ledger_id}
        AND l.is_bill_wise = 1
    `
  );

  const resultRows = rows.map((row) => {
    const opening = Number(row.opening_amount) || 0;
    const pending = Number(row.pending_amount) || 0;
    const overdueDays = row.due_date ? Math.max(0, dayDiff(row.due_date, asOnDate)) : 0;
    return {
      bill: row.bill_name,
      bill_date: row.bill_date,
      due_date: row.due_date,
      credit_period: row.credit_period,
      overdue_days: overdueDays,
      opening_amount: opening,
      pending_amount: pending,
    };
  });

  const oa = onAcc[0] || {};
  const onAccountAmt = Number(oa.amount) || 0;
  const on_account = Math.abs(onAccountAmt) > 0.01 ? { date: oa.date, amount: onAccountAmt } : null;

  const subOpening = resultRows.reduce((s, r) => s + r.opening_amount, 0);
  const subPending = resultRows.reduce((s, r) => s + r.pending_amount, 0);
  const total = subPending + (on_account ? on_account.amount : 0);

  return {
    rows: resultRows,
    sub_total: { opening: subOpening, pending: subPending },
    on_account,
    total,
    as_on: asOnDate,
  };
};

// Vouchers that make up a single bill (original bill + subsequent Agst Ref settlements)
// — the drill-down from a Bills Receivable/Payable row before opening a specific voucher.
const buildBillVouchers = async (company_id, fy_id, ledger_id, bill_name) => {
  const rows = await db.all(
    sql`
      SELECT
        v.voucher_id     AS voucher_id,
        v.date           AS date,
        v.voucher_type   AS voucher_type,
        v.voucher_number AS voucher_number,
        vbr.bill_type    AS bill_type,
        vbr.amount       AS amount,
        ve.entry_type    AS entry_type
      FROM ${voucherBillReferences} vbr
      JOIN ${vouchers} v ON v.voucher_id = vbr.voucher_id
      LEFT JOIN (
        SELECT voucher_id, ledger_id, CASE WHEN SUM(CASE WHEN type = 'Dr' THEN amount ELSE -amount END) >= 0 THEN 'Dr' ELSE 'Cr' END AS entry_type
        FROM ${voucherEntries}
        GROUP BY voucher_id, ledger_id
      ) ve ON ve.voucher_id = vbr.voucher_id AND ve.ledger_id = vbr.ledger_id
      WHERE vbr.ledger_id = ${ledger_id}
        AND vbr.bill_name = ${bill_name}
        AND v.company_id = ${company_id}
        AND v.fy_id = ${fy_id}
        AND v.is_cancelled = 0
        AND COALESCE(v.is_optional, 0) = 0
        AND COALESCE(v.is_post_dated, 0) = 0
      ORDER BY v.date ASC, v.voucher_id ASC
    `
  );

  // Stock item lines (qty + unit symbol, item name, rate) for each of those vouchers,
  // shown indented under each voucher line exactly like TallyPrime's expanded bill view.
  const voucherIds = rows.map((r) => r.voucher_id);
  let stockByVoucher = {};
  if (voucherIds.length > 0) {
    const stockRows = await db.all(
      sql`
        SELECT
          vse.voucher_id  AS voucher_id,
          vse.item_name   AS item_name,
          vse.quantity    AS quantity,
          vse.rate        AS rate,
          u.symbol        AS unit_symbol
        FROM ${voucherStockEntries} vse
        LEFT JOIN ${units} u ON u.unit_id = vse.unit_id
        WHERE vse.voucher_id IN (${sql.join(voucherIds.map((id) => sql`${id}`), sql`, `)})
        ORDER BY vse.stock_entry_id ASC
      `
    );
    for (const s of stockRows) {
      (stockByVoucher[s.voucher_id] ||= []).push({
        item_name: s.item_name || '',
        quantity: Number(s.quantity) || 0,
        rate: Number(s.rate) || 0,
        unit_symbol: s.unit_symbol || '',
      });
    }
  }

  return rows.map((r) => ({
    voucher_id: r.voucher_id,
    date: r.date,
    voucher_type: r.voucher_type,
    voucher_number: r.voucher_number,
    bill_type: r.bill_type,
    amount: Number(r.amount) || 0,
    entry_type: r.entry_type || 'Dr',
    stock_items: stockByVoucher[r.voucher_id] || [],
  }));
};

// Group Outstandings, TallyPrime-style: every party under a group (recursively
// through its sub-groups) as one Particulars row with a Debit / Credit split of
// its net pending. Direct ledgers list individually (with their bills for inline
// expansion); each direct sub-group rolls up its descendants into a single
// drillable aggregate row.
//
// Balances are the raw Dr(+)/Cr(-) net off the party's entries — a Dr net lands
// in the Debit column, a Cr net in the Credit column — and include On Account
// amounts so a party's figure reconciles with its Ledger Outstandings total.
const splitDrCr = (net) => (net >= 0
  ? { debit: net, credit: 0 }
  : { debit: 0, credit: -net });

const buildGroupOutstanding = async (company_id, fy_id, group_id) => {
  const asOnDate = new Date().toISOString().slice(0, 10);
  const gid = Number(group_id);
  const empty = { rows: [], totalDebit: 0, totalCredit: 0, as_on: asOnDate };

  // Group hierarchy for the company — used to roll each ledger up to the direct
  // sub-group (or "direct ledger") bucket under the selected group.
  const allGroups = await db.all(
    sql`SELECT group_id, name, parent_group_id FROM ${groups} WHERE company_id = ${company_id}`
  );
  const byId = new Map(allGroups.map((g) => [g.group_id, g]));
  if (!byId.has(gid)) return empty;

  // For a ledger's group, climb to the direct child of the selected group.
  // Returns { direct: true } when the ledger sits straight under the selected
  // group, else { childGroupId } naming the sub-group it belongs to.
  const bucketOf = (ledgerGroupId) => {
    let node = byId.get(ledgerGroupId);
    const guard = new Set();
    while (node && node.group_id !== gid && node.parent_group_id !== gid) {
      if (guard.has(node.group_id)) return null;
      guard.add(node.group_id);
      node = byId.get(node.parent_group_id);
    }
    if (!node) return null;
    return node.group_id === gid ? { direct: true } : { childGroupId: node.group_id };
  };

  // One signed-pending figure per (ledger, bill) for every ledger recursively
  // under the selected group.
  const rows = await db.all(
    sql`
      WITH RECURSIVE sub_groups AS (
        SELECT group_id FROM ${groups} WHERE group_id = ${gid} AND company_id = ${company_id}
        UNION ALL
        SELECT g.group_id FROM ${groups} g
        INNER JOIN sub_groups sg ON g.parent_group_id = sg.group_id
        WHERE g.company_id = ${company_id}
      )
      SELECT
        l.ledger_id              AS ledger_id,
        l.name                   AS party_name,
        l.group_id               AS ledger_group_id,
        vbr.bill_name            AS bill_name,
        COALESCE(MAX(CASE WHEN vbr.bill_type IN ('New Ref', 'Advance') THEN v.date ELSE NULL END), MAX(v.date)) AS bill_date,
        MAX(CASE WHEN vbr.bill_type IN ('New Ref', 'Advance') THEN vbr.due_date ELSE NULL END) AS due_date,
        SUM(CASE WHEN ve.entry_type = 'Dr' THEN vbr.amount ELSE -vbr.amount END) AS net_drcr
      FROM ${voucherBillReferences} vbr
      JOIN ${vouchers} v ON v.voucher_id = vbr.voucher_id
      JOIN ${ledgers} l  ON l.ledger_id = vbr.ledger_id
      LEFT JOIN (
        SELECT voucher_id, ledger_id, CASE WHEN SUM(CASE WHEN type = 'Dr' THEN amount ELSE -amount END) >= 0 THEN 'Dr' ELSE 'Cr' END AS entry_type
        FROM ${voucherEntries}
        GROUP BY voucher_id, ledger_id
      ) ve ON ve.voucher_id = vbr.voucher_id AND ve.ledger_id = vbr.ledger_id
      WHERE v.company_id = ${company_id}
        AND v.fy_id = ${fy_id}
        AND v.is_cancelled = 0
        AND COALESCE(v.is_optional, 0) = 0
        AND COALESCE(v.is_post_dated, 0) = 0
        AND vbr.bill_type IN ('New Ref', 'Advance', 'Agst Ref', 'On Account')
        AND l.company_id = ${company_id}
        AND l.is_bill_wise = 1
        AND l.group_id IN (SELECT group_id FROM sub_groups)
      GROUP BY l.ledger_id, l.name, l.group_id, vbr.bill_name
      ORDER BY l.name ASC, bill_date ASC
    `
  );

  // Assemble per-ledger figures + bills.
  const ledgerMap = new Map();
  for (const r of rows) {
    const net = Number(r.net_drcr) || 0;
    let led = ledgerMap.get(r.ledger_id);
    if (!led) {
      led = { ledger_id: r.ledger_id, party: r.party_name, group_id: r.ledger_group_id, net: 0, bills: [] };
      ledgerMap.set(r.ledger_id, led);
    }
    led.net += net;
    if (Math.abs(net) > 0.01) {
      const overdueDays = r.due_date ? Math.max(0, dayDiff(r.due_date, asOnDate)) : 0;
      led.bills.push({
        bill: r.bill_name,
        bill_date: r.bill_date,
        due_date: r.due_date,
        overdue_days: overdueDays,
        ...splitDrCr(net),
      });
    }
  }

  // Split each ledger into a direct row or fold it into its sub-group aggregate.
  const directLedgers = [];
  const subGroupMap = new Map();
  for (const led of ledgerMap.values()) {
    if (Math.abs(led.net) <= 0.01 && led.bills.length === 0) continue;
    const bucket = bucketOf(led.group_id);
    if (!bucket) continue;
    if (bucket.direct) {
      directLedgers.push({ type: 'ledger', ledger_id: led.ledger_id, party: led.party, ...splitDrCr(led.net), bills: led.bills });
    } else {
      let agg = subGroupMap.get(bucket.childGroupId);
      if (!agg) {
        agg = { type: 'group', group_id: bucket.childGroupId, party: byId.get(bucket.childGroupId)?.name || '', net: 0 };
        subGroupMap.set(bucket.childGroupId, agg);
      }
      agg.net += led.net;
    }
  }

  const subGroupRows = [...subGroupMap.values()]
    .filter((g) => Math.abs(g.net) > 0.01)
    .map((g) => ({ type: 'group', group_id: g.group_id, party: g.party, ...splitDrCr(g.net) }));

  const resultRows = [...directLedgers, ...subGroupRows]
    .filter((r) => r.debit > 0.01 || r.credit > 0.01)
    .sort((a, b) => String(a.party).localeCompare(String(b.party)));

  const totalDebit = resultRows.reduce((s, r) => s + r.debit, 0);
  const totalCredit = resultRows.reduce((s, r) => s + r.credit, 0);
  return { rows: resultRows, totalDebit, totalCredit, as_on: asOnDate };
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

  ledgerOutstandings: async (company_id, fy_id, ledger_id) => {
    try {
      const { rows, sub_total, on_account, total, as_on } =
        await buildLedgerOutstanding(company_id, fy_id, ledger_id);
      return { success: true, as_on, rows, sub_total, on_account, total };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  groupOutstandings: async (company_id, fy_id, group_id) => {
    try {
      const { rows, totalDebit, totalCredit, as_on } =
        await buildGroupOutstanding(company_id, fy_id, group_id);
      return { success: true, as_on, rows, totalDebit, totalCredit };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  billVouchers: async (company_id, fy_id, ledger_id, bill_name) => {
    try {
      const rows = await buildBillVouchers(company_id, fy_id, ledger_id, bill_name);
      return { success: true, rows };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },
};