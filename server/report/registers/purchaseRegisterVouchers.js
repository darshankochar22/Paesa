const { db } = require('../../db/index');
const { sql } = require('drizzle-orm');
const { vouchers, voucherEntries } = require('../../db/schema');
const purchaseRegisterVouchers = async (company_id, fy_id, from_date, to_date) => {
  try {
    const voucherRows = await db.all(
      sql`SELECT * FROM ${vouchers} v
          WHERE v.company_id = ${company_id}
            AND v.fy_id = ${fy_id}
            AND v.voucher_type = 'Purchase'
            AND v.is_cancelled = 0
            AND v.is_optional = 0
            AND v.is_post_dated = 0
            AND v.date >= ${from_date}
            AND v.date <= ${to_date}
          ORDER BY v.date ASC, v.voucher_id ASC`,
    );
    const rows = [];
    for (const v of voucherRows) {
      const entries = await db.all(
        sql`SELECT * FROM ${voucherEntries} WHERE voucher_id = ${v.voucher_id}`,
      );
      const creditTotal = entries
        .filter((e) => e.type === 'Cr')
        .reduce((sum, e) => sum + (e.amount || 0), 0);
      const debitTotal = entries
        .filter((e) => e.type === 'Dr')
        .reduce((sum, e) => sum + (e.amount || 0), 0);
      const creditEntry = entries.find((e) => e.type === 'Cr');
      const debitEntry = entries.find((e) => e.type === 'Dr');
      // Purchase voucher: the credited ledger (cash/bank/creditor source) is
      // the Particulars, and the amount belongs in the Credit column — matching
      // TallyPrime's Purchase Register. The debit side is the Purchase account.
      rows.push({
        id: v.voucher_id,
        voucher_id: v.voucher_id,
        date: v.date,
        particulars: creditEntry?.ledger_name || debitEntry?.ledger_name || '—',
        voucher_type: v.voucher_type,
        voucher_number: v.voucher_number,
        debit: 0,
        credit: creditTotal || debitTotal,
      });
    }
    return { success: true, rows };
  } catch (err) {
    return { success: false, error: err.message };
  }
};
module.exports = { purchaseRegisterVouchers };
