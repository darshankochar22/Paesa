const { db } = require('../../db/index');
const { sql } = require('drizzle-orm');
const { vouchers, voucherEntries } = require('../../db/schema');

const contraRegisterVouchers = async (company_id, fy_id, from_date, to_date) => {
  try {
    const voucherRows = await db.all(
      sql`SELECT * FROM ${vouchers} v
          WHERE v.company_id = ${company_id}
            AND v.fy_id = ${fy_id}
            AND v.voucher_type = 'Contra'
            AND v.is_cancelled = 0
            AND v.is_optional = 0
            AND v.is_post_dated = 0
            AND v.date >= ${from_date}
            AND v.date <= ${to_date}
          ORDER BY v.date ASC, v.voucher_id ASC`
    );

    const rows = [];

    for (const v of voucherRows) {
      const entries = await db.all(
        sql`SELECT * FROM ${voucherEntries} WHERE voucher_id = ${v.voucher_id}`
      );

      const creditEntry = entries.find((e) => e.type === 'Cr');
      const debitEntry = entries.find((e) => e.type === 'Dr');

      const amount = creditEntry?.amount || debitEntry?.amount || 0;

      rows.push({
        id: v.voucher_id,
        voucher_id: v.voucher_id,
        date: v.date,
        particulars: creditEntry?.ledger_name || debitEntry?.ledger_name || '—',
        voucher_type: v.voucher_type,
        voucher_number: v.voucher_number,
        debit: 0,
        credit: amount,
      });
    }

    return { success: true, rows };
  } catch (err) {
    return { success: false, error: err.message };
  }
};

module.exports = { contraRegisterVouchers };