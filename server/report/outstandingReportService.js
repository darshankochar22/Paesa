const { db } = require('../db/index');
const { sql } = require('drizzle-orm');
const {
  voucherBillReferences,
  vouchers,
  ledgers,
  groups,
  voucherEntries,
  voucherStockEntries,
  units,
} = require('../db/schema');
const { getBillsWithSettlements, pendingAmount } = require('./services/billSettlementService');

// ---------------------------------------------------------------------------
// Derived bills for bill-wise party ledgers that carry NO bill references (e.g.
// TallyPrime-imported data, whose BILLALLOCATIONS weren't captured, or vouchers
// entered without a ref). Each accounting voucher touching the party becomes one
// open bill (name = voucher number), drillable to that voucher. A debtor's bill
// is pending when its net is Dr (>0); a creditor's when its net is Cr (<0), so
// reducing entries (a credit note to a debtor, a debit note to a creditor) net
// the other way and drop — matching TallyPrime's pending view.
const deriveEntryBills = async (company_id, fy_id, ledger_ids, groupName) => {
  if (!Array.isArray(ledger_ids) || ledger_ids.length === 0) return [];
  const rows = await db.all(
    sql`
      SELECT
        ve.ledger_id     AS ledger_id,
        l.name           AS party_name,
        v.voucher_id     AS voucher_id,
        v.voucher_number AS voucher_number,
        v.date           AS date,
        SUM(CASE WHEN ve.type = 'Dr' THEN ve.amount ELSE -ve.amount END) AS net
      FROM ${voucherEntries} ve
      JOIN ${vouchers} v ON v.voucher_id = ve.voucher_id
      JOIN ${ledgers} l  ON l.ledger_id = ve.ledger_id
      WHERE v.company_id = ${company_id}
        AND v.fy_id = ${fy_id}
        AND v.is_cancelled = 0
        AND COALESCE(v.is_optional, 0) = 0
        AND COALESCE(v.is_post_dated, 0) = 0
        AND ve.ledger_id IN (${sql.join(
          ledger_ids.map((id) => sql`${id}`),
          sql`, `,
        )})
      GROUP BY ve.ledger_id, v.voucher_id
    `,
  );
  const isDebtors = groupName === 'Sundry Debtors';
  return rows
    .map((r) => {
      const net = Number(r.net) || 0;
      const balance = isDebtors ? net : -net;
      return {
        ledger_id: r.ledger_id,
        party: r.party_name,
        bill: r.voucher_number || String(r.voucher_id),
        voucher_id: r.voucher_id,
        bill_date: r.date,
        // Derived bill has no credit period → due on its own date (Tally parity).
        due_date: r.date,
        credit_period: null,
        overdue_days: 0,
        balance,
        ageing: '0-30',
        _lastActivity: r.date || '',
      };
    })
    .filter((r) => r.balance > 0.01);
};

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

// FY start date — opening-balance bills are dated on the first day of the year,
// the way TallyPrime dates a party's opening outstanding.
const fyStartDate = async (company_id, fy_id) => {
  const r = await db.all(
    sql`SELECT start_date FROM financial_years WHERE fy_id = ${fy_id} AND company_id = ${company_id}`,
  );
  return r[0]?.start_date || null;
};

// Day before an ISO date — the Opening Balance detail line under On Account is
// dated the last day of the previous year (e.g. 31-Mar-26 for a 1-Apr-26 start),
// exactly like TallyPrime.
const prevDayISO = (iso) => {
  if (!iso) return null;
  const d = new Date(`${iso}T00:00:00Z`);
  if (isNaN(d.getTime())) return null;
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
};

// Natural balance direction of a party ledger: +1 for a debtor (Dr-natural,
// under an Assets/Expenses group) and -1 for a creditor (Cr-natural, Liabilities/
// Income). Climbs the group chain to the nearest group that declares a nature.
// Used to tell, for an un-allocated voucher, whether it OPENS a bill (posting in
// the natural direction — a sale/purchase) or merely REDUCES the outstanding (a
// receipt / credit note / debit note), which TallyPrime shows under On Account.
const ledgerNaturalSign = async (company_id, ledger_id) => {
  const rows = await db.all(
    sql`
      WITH RECURSIVE chain AS (
        SELECT g.group_id, g.parent_group_id, g.nature, 0 AS depth
        FROM ${ledgers} l JOIN ${groups} g ON g.group_id = l.group_id
        WHERE l.ledger_id = ${ledger_id} AND l.company_id = ${company_id}
        UNION ALL
        SELECT g.group_id, g.parent_group_id, g.nature, c.depth + 1
        FROM ${groups} g JOIN chain c ON g.group_id = c.parent_group_id
        WHERE g.company_id = ${company_id}
      )
      SELECT nature FROM chain WHERE nature IS NOT NULL ORDER BY depth ASC LIMIT 1
    `,
  );
  const nature = rows[0]?.nature || 'Assets';
  return nature === 'Liabilities' || nature === 'Income' ? -1 : 1;
};

// Shared engine for Bills Receivable ('Sundry Debtors') / Bills Payable
// ('Sundry Creditors'). A voucher is listed only when it meets EVERY condition:
//   1. it posts to a party under this group (recursively, incl. sub-groups);
//   2. that party has Maintain Balances Bill-by-Bill = Yes (is_bill_wise = 1);
//   3. it carries a bill reference (New Ref / Agst Ref …) — or, for data whose
//      references were never captured (imports), a reference derived from the
//      voucher, one bill per voucher (see deriveEntryBills);
//   4. it is a credit transaction that INCREASES the outstanding — i.e. the
//      party's net posting is in its natural direction (Dr for a debtor, Cr for
//      a creditor). Settlements / reversals (a receipt, a credit note to a
//      debtor, a debit note to a creditor) net the other way and are dropped;
//   5. a pending balance remains after settlement (balance > 0).
//
// Pending amounts come from the shared bill-settlement engine
// (services/billSettlementService) — the SAME New Ref/Advance origin +
// Agst Ref settlement grouping and floor-at-0 pending math the Interest and
// Ledger-Confirmation reports use — so partial-payment handling can't drift
// between reports.
const buildOutstanding = async (company_id, fy_id, groupName) => {
  // Today's date as the ageing reference point (ISO yyyy-mm-dd).
  const asOnDate = new Date().toISOString().slice(0, 10);

  const bucketTotals = AGEING_BUCKETS.reduce((acc, b) => {
    acc[b] = 0;
    return acc;
  }, {});

  // Condition 1 + 2: bill-wise party ledgers anywhere under this group —
  // recursively through its sub-groups, so a debtor/creditor filed in a
  // sub-group of Sundry Debtors/Creditors is still included (Tally parity).
  const ledgerRows = await db.all(
    sql`
      WITH RECURSIVE sub_groups AS (
        SELECT group_id FROM ${groups} WHERE company_id = ${company_id} AND name = ${groupName}
        UNION ALL
        SELECT g.group_id FROM ${groups} g
        INNER JOIN sub_groups sg ON g.parent_group_id = sg.group_id
        WHERE g.company_id = ${company_id}
      )
      SELECT l.ledger_id AS ledger_id
      FROM ${ledgers} l
      WHERE l.company_id = ${company_id}
        AND l.is_bill_wise = 1
        AND l.group_id IN (SELECT group_id FROM sub_groups)
    `,
  );
  const ledgerIds = ledgerRows.map((r) => r.ledger_id);
  if (ledgerIds.length === 0) {
    return { rows: [], total: 0, bucketTotals, as_on: asOnDate };
  }

  const bills = await getBillsWithSettlements(company_id, fy_id, { ledger_ids: ledgerIds });

  // Ledgers with stored bill references go through the settlement engine; the
  // rest (references never captured — imports / un-allocated entries) fall back
  // to one derived bill per voucher so the report still reflects reality.
  const ledgersWithRefs = new Set(bills.map((b) => b.ledger_id));
  const ledgersWithoutRefs = ledgerIds.filter((id) => !ledgersWithRefs.has(id));
  const derivedRows = await deriveEntryBills(company_id, fy_id, ledgersWithoutRefs, groupName);

  // NOTE: opening balances are deliberately NOT listed here. Bills Receivable /
  // Payable shows itemised BILLS only (referenced or voucher-derived); an
  // unallocated opening balance is "On Account", so it surfaces in Ledger /
  // Group Outstandings — never as a pending bill — exactly like TallyPrime.

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
        bill.bill_date || '',
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
    .concat(derivedRows)
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
  const fyStart = await fyStartDate(company_id, fy_id);

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
    `,
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
    `,
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

  // Derived bills: party voucher postings that carry NO bill reference each
  // become one open bill (Ref No = the voucher number) that drills to the
  // voucher — exactly how TallyPrime lists an un-allocated transaction as its
  // own pending bill (e.g. a Purchase / Sales the user entered without a ref).
  const derived = await db.all(
    sql`
      SELECT v.voucher_id AS voucher_id, v.voucher_type AS voucher_type,
             v.voucher_number AS voucher_number, v.date AS date,
             SUM(CASE WHEN ve.type = 'Dr' THEN ve.amount ELSE -ve.amount END) AS net
      FROM ${voucherEntries} ve
      JOIN ${vouchers} v ON v.voucher_id = ve.voucher_id
      WHERE ve.ledger_id = ${ledger_id}
        AND v.company_id = ${company_id}
        AND v.fy_id = ${fy_id}
        AND v.is_cancelled = 0
        AND COALESCE(v.is_optional, 0) = 0
        AND COALESCE(v.is_post_dated, 0) = 0
        AND NOT EXISTS (
          SELECT 1 FROM ${voucherBillReferences} vbr
          WHERE vbr.voucher_id = ve.voucher_id AND vbr.ledger_id = ve.ledger_id
        )
      GROUP BY v.voucher_id
      HAVING ABS(net) > 0.01
      ORDER BY v.date ASC, v.voucher_id ASC
    `,
  );
  // A derived voucher OPENS its own bill only when it posts in the party's
  // natural direction (a sale for a debtor, a purchase for a creditor). A posting
  // the other way (receipt / credit note / debit note) with no allocation is a
  // reduction that TallyPrime shows under On Account, not as its own Ref No.
  const naturalSign = await ledgerNaturalSign(company_id, ledger_id);
  let onAccountFromVouchers = 0;
  const reducingVouchers = []; // fold into On Account, shown as its detail lines
  for (const d of derived) {
    const net = Number(d.net) || 0;
    if (net * naturalSign > 0.01) {
      resultRows.push({
        bill: d.voucher_number || String(d.voucher_id),
        // Exact voucher for the drill-down (the ref/bill name — a voucher number —
        // is not unique per ledger across voucher types).
        voucher_id: d.voucher_id,
        bill_date: d.date,
        // No credit period on a derived bill, so it's due on its own date —
        // TallyPrime shows "Due on" = the transaction date.
        due_date: d.date,
        credit_period: null,
        overdue_days: 0,
        opening_amount: net,
        pending_amount: net,
      });
    } else {
      onAccountFromVouchers += net;
      reducingVouchers.push({
        voucher_id: d.voucher_id,
        voucher_type: d.voucher_type,
        voucher_number: d.voucher_number,
        date: d.date,
        amount: net,
      });
    }
  }

  // Stock lines for the reducing vouchers, so On Account shows the item detail
  // (e.g. "1,077 pcs Non Woven Bags 18% @ 10.00/pcs") exactly like TallyPrime.
  const reducingIds = reducingVouchers.map((r) => r.voucher_id);
  const stockByVoucher = {};
  if (reducingIds.length > 0) {
    const stockRows = await db.all(
      sql`
        SELECT vse.voucher_id AS voucher_id, vse.item_name AS item_name,
               vse.quantity AS quantity, vse.rate AS rate, u.symbol AS unit_symbol
        FROM ${voucherStockEntries} vse
        LEFT JOIN ${units} u ON u.unit_id = vse.unit_id
        WHERE vse.voucher_id IN (${sql.join(
          reducingIds.map((id) => sql`${id}`),
          sql`, `,
        )})
        ORDER BY vse.stock_entry_id ASC
      `,
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

  // Opening balance — booked to the party but not tied to any bill, so it goes
  // under On Account (dated the first day of the year), exactly like Tally.
  const openLed = await db.all(
    sql`SELECT opening_balance, opening_balance_type
        FROM ${ledgers}
        WHERE ledger_id = ${ledger_id} AND company_id = ${company_id}
          AND is_bill_wise = 1 AND COALESCE(opening_balance, 0) <> 0`,
  );
  const openingSigned = openLed.length
    ? (openLed[0].opening_balance_type === 'Cr' ? -1 : 1) *
      (Number(openLed[0].opening_balance) || 0)
    : 0;

  // On Account = explicit 'On Account' bill references (onAcc above) + the
  // opening balance + un-allocated reducing vouchers (see above). It expands to
  // its component lines — the Opening Balance (dated the prior year-end) shows
  // as its own drill line, exactly like TallyPrime.
  const oa = onAcc[0] || {};
  const oaRefs = Number(oa.amount) || 0;
  const onAccountAmt = oaRefs + onAccountFromVouchers + openingSigned;

  // On Account expands into its component lines, in Tally's order: the Opening
  // Balance (dated the prior year-end) first, then each un-allocated voucher
  // shown as its real transaction (voucher type + number + Dr/Cr + stock items),
  // then any explicit 'On Account' bill-reference remainder.
  const details = [];
  if (Math.abs(openingSigned) > 0.01) {
    details.push({
      date: prevDayISO(fyStart),
      label: 'Opening Balance',
      ref: '',
      amount: openingSigned,
      stock_items: [],
    });
  }
  for (const rv of reducingVouchers) {
    details.push({
      voucher_id: rv.voucher_id,
      date: rv.date,
      label: rv.voucher_type || 'On Account',
      ref: rv.voucher_number != null ? String(rv.voucher_number) : '',
      amount: rv.amount,
      stock_items: stockByVoucher[rv.voucher_id] || [],
    });
  }
  if (Math.abs(oaRefs) > 0.01) {
    details.push({
      date: oa.date || fyStart,
      label: 'On Account',
      ref: '',
      amount: oaRefs,
      stock_items: [],
    });
  }
  const on_account =
    Math.abs(onAccountAmt) > 0.01
      ? { date: oa.date || fyStart, amount: onAccountAmt, details }
      : null;

  const subOpening = resultRows.reduce((s, r) => s + r.opening_amount, 0);
  const subPending = resultRows.reduce((s, r) => s + r.pending_amount, 0);
  const onAcctTotal = on_account ? on_account.amount : 0;
  const total = subPending + onAcctTotal;

  return {
    rows: resultRows,
    sub_total: { opening: subOpening, pending: subPending },
    on_account,
    // Grand Total shown at the bottom (both Opening and Pending columns), the
    // way TallyPrime foots the report.
    grand_total: { opening: subOpening + onAcctTotal, pending: subPending + onAcctTotal },
    total,
    as_on: asOnDate,
  };
};

// Vouchers that make up a single bill (original bill + subsequent Agst Ref settlements)
// — the drill-down from a Bills Receivable/Payable row before opening a specific voucher.
const buildBillVouchers = async (company_id, fy_id, ledger_id, bill_name, voucher_id = null) => {
  let rows = await db.all(
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
    `,
  );

  // Fallback for a derived bill (a party voucher with no stored reference — see
  // buildLedgerOutstanding): it IS a single voucher. The report row carries its
  // exact voucher_id (the bill name — a voucher number — is not unique per
  // ledger across voucher types), so resolve by voucher_id when given, else fall
  // back to (ledger_id, voucher_number).
  if (rows.length === 0) {
    const scope =
      voucher_id != null ? sql`v.voucher_id = ${voucher_id}` : sql`v.voucher_number = ${bill_name}`;
    rows = await db.all(
      sql`
        SELECT
          v.voucher_id     AS voucher_id,
          v.date           AS date,
          v.voucher_type   AS voucher_type,
          v.voucher_number AS voucher_number,
          v.voucher_type   AS bill_type,
          SUM(ve.amount)   AS amount,
          CASE WHEN SUM(CASE WHEN ve.type = 'Dr' THEN ve.amount ELSE -ve.amount END) >= 0 THEN 'Dr' ELSE 'Cr' END AS entry_type
        FROM ${voucherEntries} ve
        JOIN ${vouchers} v ON v.voucher_id = ve.voucher_id
        WHERE ve.ledger_id = ${ledger_id}
          AND ${scope}
          AND v.company_id = ${company_id}
          AND v.fy_id = ${fy_id}
          AND v.is_cancelled = 0
          AND COALESCE(v.is_optional, 0) = 0
          AND COALESCE(v.is_post_dated, 0) = 0
        GROUP BY v.voucher_id
        ORDER BY v.date ASC, v.voucher_id ASC
      `,
    );
  }

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
        WHERE vse.voucher_id IN (${sql.join(
          voucherIds.map((id) => sql`${id}`),
          sql`, `,
        )})
        ORDER BY vse.stock_entry_id ASC
      `,
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
const splitDrCr = (net) => (net >= 0 ? { debit: net, credit: 0 } : { debit: 0, credit: -net });

const buildGroupOutstanding = async (company_id, fy_id, group_id) => {
  const asOnDate = new Date().toISOString().slice(0, 10);
  const fyStart = await fyStartDate(company_id, fy_id);
  const gid = Number(group_id);
  const empty = { rows: [], totalDebit: 0, totalCredit: 0, as_on: asOnDate };

  // Group hierarchy for the company — used to roll each ledger up to the direct
  // sub-group (or "direct ledger") bucket under the selected group.
  const allGroups = await db.all(
    sql`SELECT group_id, name, parent_group_id FROM ${groups} WHERE company_id = ${company_id}`,
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
    `,
  );

  // Every bill-wise party under the selected group (recursively). Seeded FIRST
  // so a party shows even with zero bill references — its opening balance and
  // any unallocated ('On Account') voucher postings still surface. bucketOf
  // filters to the ledgers that actually roll up under the selected group.
  const allBillwise = await db.all(
    sql`SELECT ledger_id, name AS party_name, group_id AS ledger_group_id, opening_balance, opening_balance_type
        FROM ${ledgers} WHERE company_id = ${company_id} AND is_bill_wise = 1`,
  );
  const partyLedgers = allBillwise.filter((l) => bucketOf(l.ledger_group_id) != null);
  const partyIds = partyLedgers.map((l) => l.ledger_id);

  // Voucher postings on a party that carry no bill reference (imported / un-
  // allocated entries the ref-only query missed). Tally defaults an un-referenced
  // Sales / Purchase to a fresh bill ("New Ref") — a distinct pending bill on its
  // own side — while every other voucher type (Payment, Receipt, Debit/Credit
  // Note, Journal, Contra) defaults to "On Account", adjusting the party's running
  // balance. So we split the un-referenced postings into two buckets: the netted
  // On-Account amount, and the gross Sales/Purchase new-bill amounts per side.
  const unrefRows = partyIds.length
    ? await db.all(
        sql`
          SELECT ve.ledger_id AS ledger_id,
                 SUM(CASE WHEN v.voucher_type IN ('Sales', 'Purchase') THEN 0
                          ELSE (CASE WHEN ve.type = 'Dr' THEN ve.amount ELSE -ve.amount END) END) AS onaccount_net,
                 SUM(CASE WHEN v.voucher_type IN ('Sales', 'Purchase') AND ve.type = 'Dr' THEN ve.amount ELSE 0 END) AS newbill_debit,
                 SUM(CASE WHEN v.voucher_type IN ('Sales', 'Purchase') AND ve.type = 'Cr' THEN ve.amount ELSE 0 END) AS newbill_credit,
                 MAX(v.date) AS date
          FROM ${voucherEntries} ve
          JOIN ${vouchers} v ON v.voucher_id = ve.voucher_id
          WHERE v.company_id = ${company_id}
            AND v.fy_id = ${fy_id}
            AND v.is_cancelled = 0
            AND COALESCE(v.is_optional, 0) = 0
            AND COALESCE(v.is_post_dated, 0) = 0
            AND ve.ledger_id IN (${sql.join(
              partyIds.map((id) => sql`${id}`),
              sql`, `,
            )})
            AND NOT EXISTS (
              SELECT 1 FROM ${voucherBillReferences} vbr
              WHERE vbr.voucher_id = ve.voucher_id AND vbr.ledger_id = ve.ledger_id
            )
          GROUP BY ve.ledger_id`,
      )
    : [];
  const unrefMap = new Map(
    unrefRows.map((r) => [
      r.ledger_id,
      {
        onaccountNet: Number(r.onaccount_net) || 0,
        newDebit: Number(r.newbill_debit) || 0,
        newCredit: Number(r.newbill_credit) || 0,
        date: r.date,
      },
    ]),
  );

  // Assemble per-ledger figures + bills.
  const ledgerMap = new Map();
  for (const p of partyLedgers) {
    const led = {
      ledger_id: p.ledger_id,
      party: p.party_name,
      group_id: p.ledger_group_id,
      net: 0,
      bills: [],
    };
    const amt = Number(p.opening_balance) || 0;
    const signedOpen = p.opening_balance_type === 'Cr' ? -amt : amt;
    if (Math.abs(signedOpen) > 0.01) {
      led.net += signedOpen;
      led.bills.push({
        bill: 'Opening Balance',
        bill_date: fyStart,
        due_date: null,
        overdue_days: 0,
        ...splitDrCr(signedOpen),
      });
    }
    const u = unrefMap.get(p.ledger_id);
    if (u) {
      if (Math.abs(u.onaccountNet) > 0.01) {
        led.net += u.onaccountNet;
        led.bills.push({
          bill: 'On Account',
          bill_date: u.date || fyStart,
          due_date: null,
          overdue_days: 0,
          ...splitDrCr(u.onaccountNet),
        });
      }
      // Un-referenced Sales / Purchase → fresh New-Ref bills, kept gross on their
      // own side (ledgerDrCr treats any bill not named Opening Balance / On
      // Account as a distinct pending bill).
      if (u.newDebit > 0.01) {
        led.net += u.newDebit;
        led.bills.push({
          bill: 'New Ref',
          bill_date: u.date || fyStart,
          due_date: null,
          overdue_days: 0,
          debit: u.newDebit,
          credit: 0,
        });
      }
      if (u.newCredit > 0.01) {
        led.net -= u.newCredit;
        led.bills.push({
          bill: 'New Ref',
          bill_date: u.date || fyStart,
          due_date: null,
          overdue_days: 0,
          debit: 0,
          credit: u.newCredit,
        });
      }
    }
    ledgerMap.set(p.ledger_id, led);
  }
  for (const r of rows) {
    const net = Number(r.net_drcr) || 0;
    let led = ledgerMap.get(r.ledger_id);
    if (!led) {
      led = {
        ledger_id: r.ledger_id,
        party: r.party_name,
        group_id: r.ledger_group_id,
        net: 0,
        bills: [],
      };
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

  // Debit / Credit columns for a party, TallyPrime-style: each distinct pending
  // BILL sits on its own side (a Dr bill in Debit, a Cr bill in Credit) and is NOT
  // netted against the party's other bills — so a debit note / advance / return
  // against a party that also has credit bills stays visible on the Debit side
  // instead of being swallowed into a single net figure. Only the unallocated
  // pseudo-entries (Opening Balance + On Account, which have no bill reference)
  // net together, exactly as Tally collapses a party's un-referenced balance.
  const ledgerDrCr = (led) => {
    let unallocated = 0;
    let debit = 0;
    let credit = 0;
    for (const b of led.bills) {
      const bal = (b.debit || 0) - (b.credit || 0);
      if (b.bill === 'Opening Balance' || b.bill === 'On Account') {
        unallocated += bal;
      } else if (bal >= 0) {
        debit += bal;
      } else {
        credit += -bal;
      }
    }
    if (unallocated >= 0) debit += unallocated;
    else credit += -unallocated;
    return { debit, credit };
  };

  // Split each ledger into a direct row or fold it into its sub-group aggregate.
  const directLedgers = [];
  const subGroupMap = new Map();
  for (const led of ledgerMap.values()) {
    if (Math.abs(led.net) <= 0.01 && led.bills.length === 0) continue;
    const bucket = bucketOf(led.group_id);
    if (!bucket) continue;
    const { debit, credit } = ledgerDrCr(led);
    if (bucket.direct) {
      directLedgers.push({
        type: 'ledger',
        ledger_id: led.ledger_id,
        party: led.party,
        debit,
        credit,
        bills: led.bills,
      });
    } else {
      let agg = subGroupMap.get(bucket.childGroupId);
      if (!agg) {
        agg = {
          type: 'group',
          group_id: bucket.childGroupId,
          party: byId.get(bucket.childGroupId)?.name || '',
          debit: 0,
          credit: 0,
        };
        subGroupMap.set(bucket.childGroupId, agg);
      }
      agg.debit += debit;
      agg.credit += credit;
    }
  }

  const subGroupRows = [...subGroupMap.values()]
    .filter((g) => g.debit > 0.01 || g.credit > 0.01)
    .map((g) => ({
      type: 'group',
      group_id: g.group_id,
      party: g.party,
      debit: g.debit,
      credit: g.credit,
    }));

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
      const { rows, total, bucketTotals, as_on } = await buildOutstanding(
        company_id,
        fy_id,
        'Sundry Debtors',
      );
      return { success: true, as_on, rows, total, bucketTotals };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  billsPayable: async (company_id, fy_id) => {
    try {
      const { rows, total, bucketTotals, as_on } = await buildOutstanding(
        company_id,
        fy_id,
        'Sundry Creditors',
      );
      return { success: true, as_on, rows, total, bucketTotals };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  ledgerOutstandings: async (company_id, fy_id, ledger_id) => {
    try {
      const { rows, sub_total, on_account, grand_total, total, as_on } =
        await buildLedgerOutstanding(company_id, fy_id, ledger_id);
      return { success: true, as_on, rows, sub_total, on_account, grand_total, total };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  groupOutstandings: async (company_id, fy_id, group_id) => {
    try {
      const { rows, totalDebit, totalCredit, as_on } = await buildGroupOutstanding(
        company_id,
        fy_id,
        group_id,
      );
      return { success: true, as_on, rows, totalDebit, totalCredit };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  billVouchers: async (company_id, fy_id, ledger_id, bill_name, voucher_id = null) => {
    try {
      const rows = await buildBillVouchers(company_id, fy_id, ledger_id, bill_name, voucher_id);
      return { success: true, rows };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },
};
