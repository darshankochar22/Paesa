const { db } = require('../../db/index');
const { sql } = require('drizzle-orm');
const { vouchers, voucherEntries } = require('../../db/schema');

const memorandumRegisterVouchers = async (company_id, fy_id, from_date, to_date) => {
  try {
    const voucherRows = await db.all(
      // Memorandum vouchers are non-accounting and stored with is_optional = 1, so we
      // do NOT filter on is_optional here — that flag is inherent to the type and
      // filtering it out would hide every memorandum voucher from its own register.
      sql`SELECT * FROM ${vouchers} v
          WHERE v.company_id = ${company_id}
            AND v.fy_id = ${fy_id}
            AND v.voucher_type = 'Memorandum'
            AND v.is_cancelled = 0
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

      const debitTotal = entries.filter(e => e.type === 'Dr').reduce((s, e) => s + (e.amount || 0), 0);
      const creditTotal = entries.filter(e => e.type === 'Cr').reduce((s, e) => s + (e.amount || 0), 0);
      const drEntry = entries.find(e => e.type === 'Dr');
      const crEntry = entries.find(e => e.type === 'Cr');

      rows.push({
        id: v.voucher_id,
        voucher_id: v.voucher_id,
        date: v.date,
        particulars: drEntry?.ledger_name || crEntry?.ledger_name || '—',
        voucher_type: v.voucher_type,
        voucher_number: v.voucher_number,
        debit: debitTotal,
        credit: creditTotal,
      });
    }

    return { success: true, rows };
  } catch (err) {
    return { success: false, error: err.message };
  }
};

module.exports = { memorandumRegisterVouchers };
