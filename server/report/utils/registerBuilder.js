const { db } = require('../../db/index');
const { sql } = require('drizzle-orm');
const { vouchers } = require('../../db/schema');

const getRegisterData = async (company_id, fy_id, voucher_type) => {
  const fyRows = await db.all(
    sql`SELECT * FROM financial_years WHERE fy_id = ${fy_id}`
  );
  if (fyRows.length === 0) {
    throw new Error('Financial year not found');
  }
  const fy = fyRows[0];
  const startYear = new Date(fy.start_date).getFullYear();

  const monthNames = [
    'April', 'May', 'June', 'July', 'August', 'September',
    'October', 'November', 'December', 'January', 'February', 'March'
  ];

  const months = monthNames.map((name, idx) => {
    let m = idx + 4; // April is 4 (1-indexed)
    let y = startYear;
    if (m > 12) {
      m = m - 12; // Jan is 1, Feb is 2, Mar is 3
      y = startYear + 1;
    }
    const yearStr = String(y);
    const monthStr = String(m).padStart(2, '0');
    return {
      name,
      prefix: `${yearStr}-${monthStr}`,
      year: y,
      month: m
    };
  });

  const voucherRows = await db.all(
    sql`SELECT v.*,
               COALESCE((SELECT SUM(amount) FROM voucher_entries WHERE voucher_id = v.voucher_id AND type = 'Dr'), 0) AS amount
        FROM ${vouchers} v
        WHERE v.company_id = ${company_id} AND v.fy_id = ${fy_id} AND v.voucher_type = ${voucher_type}`
  );

  let cumulativeBalance = 0;
  const rows = months.map(m => {
    const monthVouchers = voucherRows.filter(v => v.date.startsWith(m.prefix));
    // Memorandum and Reversing Journal vouchers are non-posting and are stored with
    // is_optional = 1 so they stay out of ledger/balance reports — but their own
    // registers must still list them, so don't exclude optional vouchers for those types.
    const includeOptional = voucher_type === 'Memorandum' || voucher_type === 'Reversing Journal';
    const active = monthVouchers.filter(v => v.is_cancelled === 0 && (includeOptional || v.is_optional == null || v.is_optional === 0) && (v.is_post_dated == null || v.is_post_dated === 0));
    const cancelled = monthVouchers.filter(v => v.is_cancelled === 1);

    const count = active.length;
    const totalAmount = active.reduce((sum, v) => sum + (v.amount || 0), 0);

    let debit = 0;
    let credit = 0;
    if (voucher_type === 'Purchase') {
      debit = totalAmount;
      cumulativeBalance += totalAmount;
    } else if (voucher_type === 'Sales') {
      credit = totalAmount;
      cumulativeBalance += totalAmount;
    } else if (voucher_type === 'Debit Note') {
      debit = totalAmount;
      cumulativeBalance += totalAmount;
    } else if (voucher_type === 'Credit Note') {
      credit = totalAmount;
      cumulativeBalance += totalAmount;
    } else if (voucher_type === 'Payment') {
     debit = totalAmount;
     cumulativeBalance += totalAmount;
   } else if (voucher_type === 'Receipt') {
     credit = totalAmount;
     cumulativeBalance += totalAmount;
   } else if (voucher_type === 'Journal') {
     debit = totalAmount;
     credit = totalAmount;
   } else if (voucher_type === 'Contra') {
     debit = totalAmount;
     credit = totalAmount;
   }

    return {
      month: m.name,
      total_vouchers: count,
      cancelled: cancelled.length,
      debit,
      credit,
      closing_balance: cumulativeBalance,
      value: totalAmount,
    };
  });

  return rows;
};

module.exports = { getRegisterData };