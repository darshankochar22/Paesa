const { db } = require('../../db/index');
const { sql } = require('drizzle-orm');
const { ledgers, voucherEntries, vouchers } = require('../../db/schema');
const { getOpeningBalances } = require('../utils/ledgerBalance');

const ledgerReport = async (company_id, fy_id, ledger_id, from_date, to_date) => {
  try {
    if (!ledger_id) {
      const firstLedger = await db.all(
        sql`SELECT ${ledgers.ledgerId} AS ledger_id FROM ${ledgers}
            WHERE ${ledgers.companyId} = ${company_id} AND ${ledgers.isActive} = 1
            LIMIT 1`,
      );
      if (firstLedger.length === 0) return { success: true, rows: [] };
      ledger_id = firstLedger[0].ledger_id;
    }
    const ledgerRows = await db.all(
      sql`SELECT * FROM ${ledgers} WHERE ${ledgers.ledgerId} = ${ledger_id}`,
    );
    if (ledgerRows.length === 0) return { success: false, error: 'Ledger not found' };

    // Opening carried forward from prior years (Tally-style), as of this FY's
    // start. For a mid-year from_date, fold in this year's movements before the
    // window so the "Opening Balance" line matches Tally's brought-forward figure.
    const { openings } = await getOpeningBalances(company_id, fy_id);
    let effectiveOpening = openings[ledger_id] || 0;
    if (from_date) {
      const fyRow = await db.get(
        sql`SELECT start_date FROM financial_years WHERE fy_id = ${fy_id}`,
      );
      const fyStart = fyRow && fyRow.start_date ? String(fyRow.start_date).slice(0, 10) : null;
      if (fyStart && from_date > fyStart) {
        const pre = await db.all(
          sql`SELECT e.type, e.amount
              FROM ${voucherEntries} e
              INNER JOIN ${vouchers} v ON v.voucher_id = e.voucher_id
              WHERE v.company_id = ${company_id} AND v.fy_id = ${fy_id}
                AND e.ledger_id = ${ledger_id}
                AND v.date >= ${fyStart} AND v.date < ${from_date}
                AND v.is_cancelled = 0
                AND COALESCE(v.is_optional, 0) = 0
                AND COALESCE(v.is_post_dated, 0) = 0`,
        );
        for (const e of pre)
          effectiveOpening += e.type === 'Dr' ? Number(e.amount) : -Number(e.amount);
      }
    }

    // Build the entry query with optional date bounds, mirroring the legacy
    // conditional WHERE clauses. sql.join lets us append predicates only when
    // the corresponding date filter is supplied.
    const conditions = [
      sql`v.company_id = ${company_id}`,
      sql`v.fy_id = ${fy_id}`,
      sql`e.ledger_id = ${ledger_id}`,
      sql`v.is_cancelled = 0`,
      sql`COALESCE(v.is_optional, 0) = 0`,
      sql`COALESCE(v.is_post_dated, 0) = 0`,
    ];
    if (from_date) conditions.push(sql`v.date >= ${from_date}`);
    if (to_date) conditions.push(sql`v.date <= ${to_date}`);

    const result = await db.all(
      sql`SELECT e.*, v.date, v.voucher_type, v.voucher_number, v.narration as voucher_narration
          FROM ${voucherEntries} e
          INNER JOIN ${vouchers} v ON v.voucher_id = e.voucher_id
          WHERE ${sql.join(conditions, sql` AND `)}
          ORDER BY v.date ASC`,
    );

    const vIds = Array.from(new Set(result.map((r) => r.voucher_id)));
    let entryMap = {};
    if (vIds.length > 0) {
      const allEntries = await db.all(
        sql`SELECT e.voucher_id, e.type, e.amount, e.ledger_id, COALESCE(e.ledger_name, l.name) AS ledger_name
            FROM ${voucherEntries} e
            LEFT JOIN ${ledgers} l ON l.ledger_id = e.ledger_id
            WHERE e.voucher_id IN (${sql.join(vIds, sql`, `)})`,
      );
      for (const ent of allEntries) {
        if (!entryMap[ent.voucher_id]) {
          entryMap[ent.voucher_id] = [];
        }
        entryMap[ent.voucher_id].push(ent);
      }
    }

    let runningBalance = effectiveOpening;
    const rows = result.map((e) => {
      runningBalance += e.type === 'Dr' ? e.amount : -e.amount;

      const entries = entryMap[e.voucher_id] || [];
      // Tally names the single opposing ledger in Particulars. When a voucher
      // posts to MORE than one counter-ledger (e.g. a bank payment split across
      // several fixed-asset accounts), it shows "(as per details)" and lists the
      // individual counter-ledgers as an indented breakdown below the row.
      const others = entries.filter((ent) => ent.ledger_id !== ledger_id);
      let particulars = '';
      let details = null;
      if (others.length === 1) {
        particulars = others[0].ledger_name;
      } else if (others.length > 1) {
        particulars = '(as per details)';
        details = others.map((ent) => ({
          ledger_name: ent.ledger_name,
          amount: Math.abs(Number(ent.amount)) || 0,
          type: ent.type, // 'Dr' | 'Cr'
        }));
      } else {
        particulars = e.ledger_name || '';
      }

      return {
        voucher_id: e.voucher_id,
        date: e.date,
        particulars,
        details,
        voucher_type: e.voucher_type,
        voucher_number: e.voucher_number,
        debit: e.type === 'Dr' ? e.amount : 0,
        credit: e.type === 'Cr' ? e.amount : 0,
        balance: runningBalance,
        narration: e.narration || e.voucher_narration,
      };
    });

    return {
      success: true,
      ledger_name: ledgerRows[0].name,
      opening_balance: effectiveOpening,
      rows,
      closing_balance: runningBalance,
    };
  } catch (err) {
    return { success: false, error: err.message };
  }
};

module.exports = ledgerReport;
