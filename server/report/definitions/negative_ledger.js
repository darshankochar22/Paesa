const { db } = require('../../db/index');
const { sql } = require('drizzle-orm');
const { ledgers, groups, voucherEntries, vouchers } = require('../../db/schema');

module.exports = {
  run: async (company_id, fy_id, params = {}) => {
    try {
      const activeLedgers = await db.all(
        sql`SELECT l.ledger_id, l.name, l.opening_balance, l.opening_balance_type, g.nature
            FROM ${ledgers} l
            INNER JOIN ${groups} g ON g.group_id = l.group_id
            WHERE l.company_id = ${company_id} AND l.is_active = 1`,
      );

      const entries = await db.all(
        sql`SELECT e.ledger_id, e.amount, e.type
            FROM ${voucherEntries} e
            INNER JOIN ${vouchers} v ON v.voucher_id = e.voucher_id
            WHERE v.company_id = ${company_id} AND v.fy_id = ${fy_id} AND v.is_cancelled = 0
              AND COALESCE(v.is_optional, 0) = 0 AND COALESCE(v.is_post_dated, 0) = 0`,
      );

      const result = [];

      for (const l of activeLedgers) {
        const ledgerEntries = entries.filter((e) => e.ledger_id === l.ledger_id);
        const totalDr = ledgerEntries
          .filter((e) => e.type === 'Dr')
          .reduce((s, e) => s + e.amount, 0);
        const totalCr = ledgerEntries
          .filter((e) => e.type === 'Cr')
          .reduce((s, e) => s + e.amount, 0);

        const isDrNature = l.nature !== 'Liabilities' && l.nature !== 'Income';
        const rawOpening = Number(l.opening_balance) || 0;
        const effectiveOpening =
          rawOpening < 0 ? rawOpening : l.opening_balance_type === 'Cr' ? -rawOpening : rawOpening;

        const rawBalance = effectiveOpening + totalDr - totalCr;
        const balance = isDrNature ? rawBalance : -rawBalance;

        if (balance < 0) {
          result.push({
            ledger_id: l.ledger_id,
            ledger_name: l.name,
            nature: l.nature,
            opening_balance: Math.abs(effectiveOpening),
            opening_balance_type: effectiveOpening < 0 ? 'Cr' : 'Dr',
            total_dr: totalDr,
            total_cr: totalCr,
            balance: Math.abs(balance),
            balance_type: isDrNature ? 'Cr' : 'Dr', // opposite of normal nature
            expected_type: isDrNature ? 'Dr' : 'Cr',
          });
        }
      }

      // Table rows for the generic report runner: closing balance split into
      // Debit / Credit columns (a negative ledger shows under its abnormal side).
      const rows = result.map((r) => ({
        ledger_id: r.ledger_id,
        ledger_name: r.ledger_name,
        debit: r.balance_type === 'Dr' ? r.balance : null,
        credit: r.balance_type === 'Cr' ? r.balance : null,
      }));

      if (rows.length > 0) {
        const totalDebit = rows.reduce((s, r) => s + (r.debit || 0), 0);
        const totalCredit = rows.reduce((s, r) => s + (r.credit || 0), 0);
        rows.push({
          ledger_name: 'Grand Total',
          debit: totalDebit || null,
          credit: totalCredit || null,
          isTotal: true,
        });
      }

      return { success: true, rows, ledgers: result };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },
};
