const { db } = require('../../db/index');
const { sql } = require('drizzle-orm');
const { vouchers, voucherEntries } = require('../../db/schema');

// Marked Voucher Register — Gateway → Display More Reports → Exception Reports
// → Marked Vouchers. A flat register of every voucher in the period (Date,
// Particulars, Vch Type, Vch No., Debit, Credit) that a user can mark/act on,
// mirroring Tally's Marked Vouchers Register. Optional vouchers are flagged so
// the frontend can render them in italic exactly like Tally. Drills to the
// voucher. Shape matches optional-voucher-register so it renders identically.
module.exports = {
  run: async (company_id, fy_id, params = {}) => {
    try {
      const { from_date, to_date } = params;
      const dateFilter =
        from_date && to_date ? sql`AND v.date >= ${from_date} AND v.date <= ${to_date}` : sql``;

      const voucherRows = await db.all(
        sql`SELECT v.voucher_id, v.date, v.voucher_type, v.voucher_number,
                   v.party_name, COALESCE(v.is_optional, 0) AS is_optional
            FROM ${vouchers} v
            WHERE v.company_id = ${company_id}
              AND v.fy_id = ${fy_id}
              AND v.is_cancelled = 0
              ${dateFilter}
            ORDER BY v.date ASC, v.voucher_id ASC`,
      );

      const rows = [];
      let totalDebit = 0;
      let totalCredit = 0;

      for (const v of voucherRows) {
        const entries = await db.all(
          sql`SELECT type, amount, ledger_name FROM ${voucherEntries} WHERE voucher_id = ${v.voucher_id}`,
        );
        const debit = entries
          .filter((e) => e.type === 'Dr')
          .reduce((s, e) => s + (e.amount || 0), 0);
        const credit = entries
          .filter((e) => e.type === 'Cr')
          .reduce((s, e) => s + (e.amount || 0), 0);
        const drEntry = entries.find((e) => e.type === 'Dr');
        const crEntry = entries.find((e) => e.type === 'Cr');
        totalDebit += debit;
        totalCredit += credit;

        rows.push({
          id: v.voucher_id,
          voucher_id: v.voucher_id,
          date: v.date,
          particulars: drEntry?.ledger_name || crEntry?.ledger_name || v.party_name || '—',
          voucher_type: v.voucher_type,
          voucher_number: v.voucher_number,
          is_optional: Number(v.is_optional) === 1,
          debit,
          credit,
        });
      }

      return {
        success: true,
        rows,
        count: rows.length,
        totals: { debit: totalDebit, credit: totalCredit },
      };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },
};
