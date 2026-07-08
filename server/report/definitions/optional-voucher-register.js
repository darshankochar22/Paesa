const { db } = require('../../db/index');
const { sql } = require('drizzle-orm');
const { vouchers, voucherEntries } = require('../../db/schema');

// Optional Voucher Register — flat list of vouchers a user explicitly marked
// Optional (L:Optional) in the period. Shape mirrors the memorandum register
// voucher list so it renders through the shared ReportTable (Date, Particulars,
// Vch Type, Vch No., Debit, Credit) with drill-down to the voucher.
//
// Memorandum and Reversing Journal are stored with is_optional = 1 too (an
// implementation detail so they stay out of the books), but they are NOT
// "Optional" vouchers — each has its own dedicated register — so they are
// excluded here to match Tally, where only user-marked-Optional vouchers list.
const EXCLUDED_TYPES = ['Memorandum', 'Reversing Journal'];

module.exports = {
  run: async (company_id, fy_id, params = {}) => {
    try {
      const { from_date, to_date } = params;
      const dateFilter =
        from_date && to_date
          ? sql`AND v.date >= ${from_date} AND v.date <= ${to_date}`
          : sql``;

      const voucherRows = await db.all(
        sql`SELECT v.voucher_id, v.date, v.voucher_type, v.voucher_number, v.party_name
            FROM ${vouchers} v
            WHERE v.company_id = ${company_id}
              AND v.fy_id = ${fy_id}
              AND v.is_cancelled = 0
              AND COALESCE(v.is_optional, 0) = 1
              AND v.voucher_type NOT IN (${sql.join(EXCLUDED_TYPES.map((t) => sql`${t}`), sql`, `)})
              ${dateFilter}
            ORDER BY v.date ASC, v.voucher_id ASC`
      );

      const rows = [];
      let totalDebit = 0;
      let totalCredit = 0;

      for (const v of voucherRows) {
        const entries = await db.all(
          sql`SELECT type, amount, ledger_name FROM ${voucherEntries} WHERE voucher_id = ${v.voucher_id}`
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
