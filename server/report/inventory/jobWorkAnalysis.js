const { db } = require('../../db/index');
const { sql } = require('drizzle-orm');

const INWARD  = ['Purchase', 'Receipt Note', 'Rejection In', 'Material In'];
const OUTWARD = ['Sales', 'Delivery Note', 'Rejection Out', 'Material Out'];

/**
 * Job Work Analysis — stock movement of a single Job / Project (Cost Centre).
 *
 * A job is a Cost Centre; material consumed (inward to job) and produced/issued
 * (outward) is tied to vouchers allocated to that cost centre via
 * voucher_cost_centres. Lists each stock item moved on those vouchers.
 */
const jobWorkAnalysis = async (company_id, fy_id, cc_id) => {
  try {
    const rows = await db.all(sql`
      SELECT
        si.item_id,
        si.name AS item_name,
        u.name  AS unit_name,
        SUM(CASE WHEN v.voucher_type IN (${sql.join(INWARD.map(t => sql`${t}`), sql`, `)})  THEN vse.quantity ELSE 0 END) AS in_qty,
        SUM(CASE WHEN v.voucher_type IN (${sql.join(INWARD.map(t => sql`${t}`), sql`, `)})  THEN vse.amount   ELSE 0 END) AS in_value,
        SUM(CASE WHEN v.voucher_type IN (${sql.join(OUTWARD.map(t => sql`${t}`), sql`, `)}) THEN vse.quantity ELSE 0 END) AS out_qty,
        SUM(CASE WHEN v.voucher_type IN (${sql.join(OUTWARD.map(t => sql`${t}`), sql`, `)}) THEN vse.amount   ELSE 0 END) AS out_value
      FROM voucher_cost_centres vcc
      INNER JOIN vouchers v ON v.voucher_id = vcc.voucher_id
      INNER JOIN voucher_stock_entries vse ON vse.voucher_id = vcc.voucher_id
      INNER JOIN stock_items si ON si.item_id = vse.stock_item_id
      LEFT JOIN units u ON u.unit_id = si.unit_id
      WHERE v.company_id = ${company_id} AND v.fy_id = ${fy_id}
        AND vcc.cost_centre_id = ${cc_id}
        AND v.is_cancelled = 0 AND COALESCE(v.is_optional, 0) = 0 AND COALESCE(v.is_post_dated, 0) = 0
      GROUP BY si.item_id, si.name, u.name
      ORDER BY si.name ASC
    `);

    const items = rows.map(r => ({
      item_id: r.item_id,
      item_name: r.item_name,
      unit_name: r.unit_name || '',
      in_qty: r.in_qty || 0,
      in_value: r.in_value || 0,
      out_qty: r.out_qty || 0,
      out_value: r.out_value || 0,
    }));

    return { success: true, items };
  } catch (err) {
    return { success: false, error: err.message };
  }
};

module.exports = { jobWorkAnalysis };
