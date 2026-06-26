const { db } = require('../../db/index');
const { sql } = require('drizzle-orm');
const { vouchers, stockItems, stockGroups, units, voucherStockEntries } = require('../../db/schema');

/** Stock Item Summary - per-item inward/outward quantities and closing balance. */
const stockItemSummary = async (company_id, fy_id) => {
  try {
    const INWARD = ['Purchase', 'Receipt Note', 'Rejection In', 'Material In'];
    const OUTWARD = ['Sales', 'Delivery Note', 'Rejection Out', 'Material Out'];
    const rows = await db.all(sql`
      SELECT si.item_id AS item_id,
             si.name AS item_name,
             sg.name AS group_name,
             u.name AS unit_name,
             COALESCE(SUM(CASE WHEN v.voucher_type IN (${sql.join(INWARD.map(t => sql`${t}`), sql`, `)}) THEN vse.quantity ELSE 0 END), 0) AS in_qty,
             COALESCE(SUM(CASE WHEN v.voucher_type IN (${sql.join(INWARD.map(t => sql`${t}`), sql`, `)}) THEN vse.amount ELSE 0 END), 0) AS in_value,
             COALESCE(SUM(CASE WHEN v.voucher_type IN (${sql.join(OUTWARD.map(t => sql`${t}`), sql`, `)}) THEN vse.quantity ELSE 0 END), 0) AS out_qty,
             COALESCE(SUM(CASE WHEN v.voucher_type IN (${sql.join(OUTWARD.map(t => sql`${t}`), sql`, `)}) THEN vse.amount ELSE 0 END), 0) AS out_value,
             COALESCE(si.opening_quantity, 0) +
             COALESCE(SUM(CASE WHEN v.voucher_type IN (${sql.join(INWARD.map(t => sql`${t}`), sql`, `)}) THEN vse.quantity ELSE 0 END), 0) -
             COALESCE(SUM(CASE WHEN v.voucher_type IN (${sql.join(OUTWARD.map(t => sql`${t}`), sql`, `)}) THEN vse.quantity ELSE 0 END), 0) AS closing_qty,
             COALESCE(si.opening_quantity, 0) * COALESCE(si.opening_rate, 0) +
             COALESCE(SUM(CASE WHEN v.voucher_type IN (${sql.join(INWARD.map(t => sql`${t}`), sql`, `)}) THEN vse.amount ELSE 0 END), 0) -
             COALESCE(SUM(CASE WHEN v.voucher_type IN (${sql.join(OUTWARD.map(t => sql`${t}`), sql`, `)}) THEN vse.amount ELSE 0 END), 0) AS closing_value
      FROM ${stockItems} si
      LEFT JOIN ${stockGroups} sg ON sg.sg_id = si.group_id
      LEFT JOIN ${units} u ON u.unit_id = si.unit_id
      LEFT JOIN ${voucherStockEntries} vse ON vse.stock_item_id = si.item_id
      LEFT JOIN ${vouchers} v ON v.voucher_id = vse.voucher_id
        AND v.company_id = ${company_id} AND v.fy_id = ${fy_id} AND v.is_cancelled = 0
        AND COALESCE(v.is_optional, 0) = 0 AND COALESCE(v.is_post_dated, 0) = 0
      WHERE si.company_id = ${company_id} AND si.is_active = 1
      GROUP BY si.item_id, si.name, sg.name, u.name, si.opening_quantity, si.opening_rate
      ORDER BY si.name ASC`
    );
    const mapped = rows.map(r => ({
      ...r,
      rate: r.closing_qty ? r.closing_value / r.closing_qty : 0,
    }));
    return { success: true, rows: mapped };
  } catch (err) {
    return { success: false, error: err.message };
  }
};

module.exports = { stockItemSummary };
