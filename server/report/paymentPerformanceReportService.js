const { db } = require('../db/index');
const { sql } = require('drizzle-orm');
const { voucherEntries, vouchers, ledgers, groups } = require('../db/schema');
const { getBillsWithSettlements, pendingAmount } = require('./services/billSettlementService');

// ---------------------------------------------------------------------------
// Payment Performance of Debtors / Creditors  (READ-ONLY)
//
// This is the drill-down behind the Ratio Analysis "Recv. Turnover in days"
// line. TallyPrime opens a Group Payment Performance report (one row per party
// under the group) and, from a party, a Ledger Payment Performance report that
// spells out the formula.
//
// Two measures per party:
//   • Using Receivables Formula  = (Closing Balance / Total Sales) × Number of Days
//   • Using Actual Bill Clearance Dates = amount-weighted average of the days each
//     fully-cleared bill actually took to settle (0 when nothing has cleared)
//
// The group figure Tally shows in Ratio Analysis is the SUM of the per-party
// receivables-formula performances — so ratioAnalysisReportService reuses this
// service to keep the headline and the drill-down reconciled exactly.
// No schema, migration or write paths are touched.
// ---------------------------------------------------------------------------

const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;

// Whole days between two ISO dates (b - a). Used for actual-clearance ageing.
const dayDiff = (fromDate, toDate) => {
  if (!fromDate || !toDate) return 0;
  const a = new Date(fromDate);
  const b = new Date(toDate);
  if (isNaN(a.getTime()) || isNaN(b.getTime())) return 0;
  return Math.floor((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24));
};

// Number of days in the period, counting both endpoints — the way Tally derives
// "* Number of Days" (e.g. 1-Apr-26 → 2-Mar-27 = 336).
const daysInclusive = (fromISO, toISO) => {
  const d = dayDiff(fromISO, toISO);
  return d > 0 ? d + 1 : 0;
};

// FY start / end for the period.
const fyBounds = async (company_id, fy_id) => {
  const r = await db.all(
    sql`SELECT start_date, end_date FROM financial_years WHERE fy_id = ${fy_id} AND company_id = ${company_id}`,
  );
  return { start: r[0]?.start_date || null, end: r[0]?.end_date || null };
};

// Latest posted voucher date in the FY — Tally's period auto-extends to the last
// transaction, which is what makes "Number of Days" 336 rather than a full 365.
const lastVoucherDate = async (company_id, fy_id) => {
  const r = await db.all(
    sql`SELECT MAX(v.date) AS d FROM ${vouchers} v
        WHERE v.company_id = ${company_id} AND v.fy_id = ${fy_id}
          AND v.is_cancelled = 0 AND COALESCE(v.is_optional, 0) = 0
          AND COALESCE(v.is_post_dated, 0) = 0`,
  );
  return r[0]?.d || null;
};

// Per-party closing balance + total sales for every ledger (recursively) under a
// group. Closing = signed opening + net posted (Dr − Cr). Total Sales = the
// party's Dr postings on Sales vouchers (the invoiced value), the denominator in
// the receivables formula.
const buildPartyFigures = async (company_id, fy_id, group_id) => {
  const rows = await db.all(
    sql`
      WITH RECURSIVE sub_groups AS (
        SELECT group_id FROM ${groups} WHERE group_id = ${group_id} AND company_id = ${company_id}
        UNION ALL
        SELECT g.group_id FROM ${groups} g
        INNER JOIN sub_groups sg ON g.parent_group_id = sg.group_id
        WHERE g.company_id = ${company_id}
      )
      SELECT
        l.ledger_id                         AS ledger_id,
        l.name                              AS party,
        l.opening_balance                   AS opening_balance,
        l.opening_balance_type              AS opening_balance_type,
        COALESCE(p.net_posted, 0)           AS net_posted,
        COALESCE(p.total_sales, 0)          AS total_sales
      FROM ${ledgers} l
      LEFT JOIN (
        SELECT ve.ledger_id AS ledger_id,
               SUM(CASE WHEN ve.type = 'Dr' THEN ve.amount ELSE -ve.amount END) AS net_posted,
               SUM(CASE WHEN v.voucher_type = 'Sales'
                        THEN (CASE WHEN ve.type = 'Dr' THEN ve.amount ELSE -ve.amount END)
                        ELSE 0 END) AS total_sales
        FROM ${voucherEntries} ve
        JOIN ${vouchers} v ON v.voucher_id = ve.voucher_id
        WHERE v.company_id = ${company_id} AND v.fy_id = ${fy_id}
          AND v.is_cancelled = 0 AND COALESCE(v.is_optional, 0) = 0
          AND COALESCE(v.is_post_dated, 0) = 0
        GROUP BY ve.ledger_id
      ) p ON p.ledger_id = l.ledger_id
      WHERE l.company_id = ${company_id} AND l.is_active = 1
        AND l.group_id IN (SELECT group_id FROM sub_groups)
      ORDER BY l.name ASC
    `,
  );

  return rows.map((r) => {
    const opening = Number(r.opening_balance) || 0;
    const signedOpening = r.opening_balance_type === 'Cr' ? -opening : opening;
    const closing = signedOpening + (Number(r.net_posted) || 0);
    return {
      ledger_id: r.ledger_id,
      party: r.party,
      closing, // signed: Dr = +, Cr = −
      total_sales: Number(r.total_sales) || 0, // signed; Dr = +
    };
  });
};

// Amount-weighted average clearance days, from actual settlement dates. Only
// bills fully cleared as on `asOn` contribute; a bill's clearance date is its
// last settlement. Returns { byLedger: Map<ledger_id, days>, global: days } —
// the per-party figure and the whole-group weighted average.
const actualClearanceByLedger = async (company_id, fy_id, ledgerIds, asOn) => {
  const out = new Map();
  if (!Array.isArray(ledgerIds) || ledgerIds.length === 0) return { byLedger: out, global: 0 };
  const bills = await getBillsWithSettlements(company_id, fy_id, {
    ledger_ids: ledgerIds,
    toDate: asOn || null,
  });
  const acc = new Map(); // ledger_id → { weighted, weight }
  let gWeighted = 0;
  let gWeight = 0;
  for (const bill of bills) {
    const original = Math.abs(Number(bill.original_amount) || 0);
    if (original < 0.01 || bill.settlements.length === 0) continue;
    // Cleared only when nothing is left pending as on the report date.
    if (pendingAmount(bill, asOn || null) > 0.01) continue;
    const clearanceDate = bill.settlements[bill.settlements.length - 1].date;
    const days = Math.max(0, dayDiff(bill.bill_date, clearanceDate));
    const cur = acc.get(bill.ledger_id) || { weighted: 0, weight: 0 };
    cur.weighted += days * original;
    cur.weight += original;
    acc.set(bill.ledger_id, cur);
    gWeighted += days * original;
    gWeight += original;
  }
  for (const [ledger_id, { weighted, weight }] of acc) {
    out.set(ledger_id, weight > 0 ? weighted / weight : 0);
  }
  return { byLedger: out, global: gWeight > 0 ? gWeighted / gWeight : 0 };
};

// Core builder shared by the group and single-ledger views.
const buildPaymentPerformance = async (company_id, fy_id, group_id) => {
  const [{ start, end }, lastDate] = await Promise.all([
    fyBounds(company_id, fy_id),
    lastVoucherDate(company_id, fy_id),
  ]);
  const asOn = lastDate || end;
  const numberOfDays = daysInclusive(start, asOn);

  const parties = await buildPartyFigures(company_id, fy_id, group_id);
  const clearance = await actualClearanceByLedger(
    company_id,
    fy_id,
    parties.map((p) => p.ledger_id),
    asOn,
  );

  const rows = parties.map((p) => {
    const receivablesDays = p.total_sales !== 0 ? (p.closing / p.total_sales) * numberOfDays : 0;
    return {
      ledger_id: p.ledger_id,
      party: p.party,
      closing: round2(p.closing),
      total_sales: round2(p.total_sales),
      receivables_days: round2(receivablesDays),
      actual_days: round2(clearance.byLedger.get(p.ledger_id) || 0),
    };
  });

  // Group figure applies the SAME formula at the group level — (Σ Closing /
  // Σ Total Sales) × Number of Days — NOT a sum of the per-party days. This is
  // what Tally foots the report with and shows as the Ratio Analysis headline.
  const sumClosing = parties.reduce((s, p) => s + p.closing, 0);
  const sumSales = parties.reduce((s, p) => s + p.total_sales, 0);
  const totalReceivables = round2(sumSales !== 0 ? (sumClosing / sumSales) * numberOfDays : 0);
  const totalActual = round2(clearance.global);

  return { rows, totalReceivables, totalActual, number_of_days: numberOfDays, as_on: asOn };
};

module.exports = {
  // Sum of the per-party receivables-formula performance for a group — the value
  // the Ratio Analysis "Recv. Turnover in days" headline shows. Reused by
  // ratioAnalysisReportService so headline and drill-down agree.
  groupPaymentPerformanceTotal: async (company_id, fy_id, group_id) => {
    try {
      const { totalReceivables } = await buildPaymentPerformance(company_id, fy_id, group_id);
      return totalReceivables;
    } catch {
      return null;
    }
  },

  // Group Payment Performance report: one row per party, both measures + totals.
  groupPaymentPerformance: async (company_id, fy_id, group_id) => {
    try {
      const { rows, totalReceivables, totalActual, number_of_days, as_on } =
        await buildPaymentPerformance(company_id, fy_id, group_id);
      return {
        success: true,
        rows,
        totalReceivables,
        totalActual,
        number_of_days,
        as_on,
      };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  // Ledger Payment Performance: the formula breakdown for a single party.
  //   Performance = (Closing Balance / Total Sales) × Number of Days
  ledgerPaymentPerformance: async (company_id, fy_id, ledger_id) => {
    try {
      const led = await db.all(
        sql`SELECT ledger_id, name, group_id FROM ${ledgers}
            WHERE ledger_id = ${ledger_id} AND company_id = ${company_id}`,
      );
      if (!led.length) return { success: false, error: 'Ledger not found.' };

      const { start, end } = await fyBounds(company_id, fy_id);
      const lastDate = await lastVoucherDate(company_id, fy_id);
      const asOn = lastDate || end;
      const numberOfDays = daysInclusive(start, asOn);

      // Reuse the party-figure engine scoped to just this ledger's group so the
      // closing/sales numbers match the group report exactly, then pick this row.
      const parties = await buildPartyFigures(company_id, fy_id, led[0].group_id);
      const me = parties.find((p) => p.ledger_id === Number(ledger_id));
      const closing = me ? me.closing : 0;
      const totalSales = me ? me.total_sales : 0;
      const days = totalSales !== 0 ? (closing / totalSales) * numberOfDays : 0;

      const clearance = await actualClearanceByLedger(company_id, fy_id, [Number(ledger_id)], asOn);

      return {
        success: true,
        ledger_name: led[0].name,
        closing_balance: round2(closing),
        total_sales: round2(totalSales),
        number_of_days: numberOfDays,
        receivables_days: round2(days),
        actual_days: round2(clearance.byLedger.get(Number(ledger_id)) || 0),
        as_on: asOn,
      };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },
};
