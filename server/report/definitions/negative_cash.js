const { db } = require('../../db/index');
const { sql } = require('drizzle-orm');
const { ledgers, groups, voucherEntries, vouchers } = require('../../db/schema');

module.exports = {
  run: async (company_id, fy_id, params = {}) => {
    try {
      const cashLedgers = await db.all(
        sql`SELECT l.ledger_id, l.name, l.opening_balance
            FROM ${ledgers} l
            INNER JOIN ${groups} g ON g.group_id = l.group_id
            WHERE l.company_id = ${company_id} AND l.is_active = 1
              AND (g.name = 'Cash-in-Hand' OR g.name = 'Cash-in-hand' OR l.name LIKE '%Cash%')`
      );

      const result = [];

      for (const ledger of cashLedgers) {
        const entries = await db.all(
          sql`SELECT e.amount, e.type, v.date, v.voucher_number, v.voucher_type
              FROM ${voucherEntries} e
              INNER JOIN ${vouchers} v ON v.voucher_id = e.voucher_id
              WHERE v.company_id = ${company_id} AND v.fy_id = ${fy_id} AND e.ledger_id = ${ledger.ledger_id}
                AND v.is_cancelled = 0 AND COALESCE(v.is_optional, 0) = 0 AND COALESCE(v.is_post_dated, 0) = 0
              ORDER BY v.date ASC, v.voucher_id ASC, e.entry_id ASC`
        );

        let running = Number(ledger.opening_balance) || 0;
        const negativeDates = [];

        for (const entry of entries) {
          running += entry.type === 'Dr' ? entry.amount : -entry.amount;
          if (running < 0) {
            negativeDates.push({
              date: entry.date,
              voucher_type: entry.voucher_type,
              voucher_number: entry.voucher_number,
              amount: entry.amount,
              type: entry.type,
              balance: running
            });
          }
        }

        result.push({
          ledger_id: ledger.ledger_id,
          ledger_name: ledger.name,
          current_balance: running,
          negative_instances: negativeDates
        });
      }

      return { success: true, ledgers: result };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }
};
