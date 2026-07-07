// MSME (Micro, Small & Medium Enterprises) statutory reports.
//
// MSME Form 1 Statement — amounts payable to Micro/Small enterprise suppliers that
// remain unpaid beyond the MSME due date (MSMED Act §15: 45 days from acceptance,
// or the agreed credit period if shorter). This is the half-yearly MCA MSME-1 return.
//
// Pending amounts reuse the SHARED bill-settlement engine (services/billSettlementService)
// — the same New Ref/Advance origin + Agst Ref settlement grouping the Outstandings,
// Interest and Ledger-Confirmation reports use — so partial-payment handling can't drift.
//
// Only parties classified as Micro or Small (via Update Party MSME Details) qualify —
// the MSMED Act §15 delayed-payment provisions exclude Medium enterprises.

const { db } = require('../db/index');
const { sql } = require('drizzle-orm');
const { ledgers, groups } = require('../db/schema');
const { getBillsWithSettlements, pendingAmount } = require('../report/services/billSettlementService');

// MSMED Act §15 default payment window when no shorter period is agreed in writing.
const MSME_DUE_DAYS = 45;

const dayDiff = (fromDate, toDate) => {
  if (!fromDate || !toDate) return 0;
  const a = new Date(fromDate);
  const b = new Date(toDate);
  if (isNaN(a.getTime()) || isNaN(b.getTime())) return 0;
  return Math.floor((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24));
};

const addDays = (dateStr, days) => {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return null;
  d.setDate(d.getDate() + (Number(days) || 0));
  return d.toISOString().slice(0, 10);
};

// MSME-registered (Micro/Small) party ledgers on the payables side. Default: parties
// under the predefined "Sundry Creditors" group. When a group_id is supplied (F4: Group
// filter), restrict to that group and its sub-groups recursively.
const getCreditorLedgers = async (company_id, group_id) => {
  if (group_id) {
    return db.all(sql`
      WITH RECURSIVE sub_groups AS (
        SELECT group_id FROM ${groups} WHERE group_id = ${group_id} AND company_id = ${company_id}
        UNION ALL
        SELECT g.group_id FROM ${groups} g
        INNER JOIN sub_groups sg ON g.parent_group_id = sg.group_id
        WHERE g.company_id = ${company_id}
      )
      SELECT l.ledger_id AS ledger_id, l.name AS name, l.pan AS pan
      FROM ${ledgers} l
      WHERE l.company_id = ${company_id}
        AND l.msme_type_of_enterprise IN ('Micro', 'Small')
        AND l.group_id IN (SELECT group_id FROM sub_groups)
    `);
  }
  return db.all(sql`
    SELECT l.ledger_id AS ledger_id, l.name AS name, l.pan AS pan
    FROM ${ledgers} l
    JOIN ${groups} g ON g.group_id = l.group_id
    WHERE l.company_id = ${company_id}
      AND g.company_id = ${company_id}
      AND g.name = 'Sundry Creditors'
      AND l.msme_type_of_enterprise IN ('Micro', 'Small')
  `);
};

// MSME Form 1 Statement.
//   to_date  — report horizon ("as on"); pending + overdue are measured at this date.
//   group_id — optional group filter (null = All Items / all Sundry Creditors).
const getMsmeForm1 = async (company_id, fy_id, { to_date = null, group_id = null } = {}) => {
  const asOn = to_date || new Date().toISOString().slice(0, 10);

  const ledgerRows = await getCreditorLedgers(company_id, group_id);
  if (ledgerRows.length === 0) {
    return { success: true, payload: { rows: [], total: 0, as_on: asOn } };
  }

  const panByLedger = new Map(ledgerRows.map((l) => [l.ledger_id, l.pan]));
  const ledgerIds = ledgerRows.map((l) => l.ledger_id);

  const bills = await getBillsWithSettlements(company_id, fy_id, {
    ledger_ids: ledgerIds,
    toDate: asOn,
  });

  const rows = bills
    .map((bill) => {
      const amountPending = pendingAmount(bill, asOn);
      // MSME due date: the bill's own due date if set, else bill date + 45 days.
      const dueOn = bill.due_date || addDays(bill.bill_date, bill.credit_period || MSME_DUE_DAYS);
      const overdueDays = dueOn ? Math.max(0, dayDiff(dueOn, asOn)) : 0;
      return {
        ledger_id: bill.ledger_id,
        date: bill.bill_date,
        ref_no: bill.bill_name,
        party: bill.party_name,
        pan: panByLedger.get(bill.ledger_id) || '',
        amount_pending: amountPending,
        due_on: dueOn,
        overdue_days: overdueDays,
      };
    })
    // MSME Form 1 lists dues still unpaid *after* the MSME due date.
    .filter((r) => r.amount_pending > 0.01 && r.overdue_days > 0)
    .sort((a, b) => {
      const byParty = String(a.party).localeCompare(String(b.party));
      if (byParty !== 0) return byParty;
      return String(a.date).localeCompare(String(b.date));
    });

  const total = rows.reduce((s, r) => s + r.amount_pending, 0);
  return { success: true, payload: { rows, total, as_on: asOn } };
};

module.exports = { getMsmeForm1 };
