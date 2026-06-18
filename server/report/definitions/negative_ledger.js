const { db } = require('../../db/index');
const { sql } = require('drizzle-orm');
const { ledgers, groups, voucherEntries, vouchers } = require('../../db/schema');

module.exports = {
  run: async (company_id, fy_id, params = {}) => {
    try {
      const activeLedgers = await db.all(
        sql`SELECT l.ledger_id, l.name, l.opening_balance, g.nature
            FROM ${ledgers} l
            INNER JOIN ${groups} g ON g.group_id = l.group_id
            WHERE l.company_id = ${company_id} AND l.is_active = 1`
      );

      const entries = await db.all(
        sql`SELECT e.ledger_id, e.amount, e.type
            FROM ${voucherEntries} e
            INNER JOIN ${vouchers} v ON v.voucher_id = e.voucher_id
            WHERE v.company_id = ${company_id} AND v.fy_id = ${fy_id} AND v.is_cancelled = 0
              AND COALESCE(v.is_optional, 0) = 0 AND COALESCE(v.is_post_dated, 0) = 0`
      );

      const result = [];

      for (const l of activeLedgers) {
        const ledgerEntries = entries.filter(e => e.ledger_id === l.ledger_id);
        const totalDr = ledgerEntries.filter(e => e.type === 'Dr').reduce((s, e) => s + e.amount, 0);
        const totalCr = ledgerEntries.filter(e => e.type === 'Cr').reduce((s, e) => s + e.amount, 0);

        const isDrNature = l.nature !== 'Liabilities' && l.nature !== 'Income';
        const openingBal = Number(l.opening_balance) || 0;

        const balance = isDrNature
          ? openingBal + totalDr - totalCr
          : openingBal + totalCr - totalDr;

        if (balance < 0) {
          result.push({
            ledger_id: l.ledger_id,
            ledger_name: l.name,
            nature: l.nature,
            opening_balance: openingBal,
            total_dr: totalDr,
            total_cr: totalCr,
            balance: Math.abs(balance),
            balance_type: isDrNature ? 'Cr' : 'Dr', // opposite of normal nature
            expected_type: isDrNature ? 'Dr' : 'Cr'
          });
        }
      }

      return { success: true, ledgers: result };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }
};
