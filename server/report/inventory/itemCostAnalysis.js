const { db } = require('../../db/index');
const { sql } = require('drizzle-orm');

const INWARD  = ['Purchase', 'Receipt Note', 'Rejection In', 'Material In'];
const OUTWARD = ['Sales', 'Delivery Note', 'Rejection Out', 'Material Out'];

// Per stock item: opening + inward = Cost (Expense); outward = Revenue (Income);
// nett = Balance at Cost. Profit/(Loss) = Revenue - (Cost - Balance at Cost).
const itemMovementSelect = (company_id, fy_id) => sql`
  SELECT
    si.item_id,
    si.name                              AS item_name,
    si.group_id                          AS group_id,
    u.name                               AS unit_name,
    COALESCE(si.opening_quantity, 0)                                     AS opening_qty,
    COALESCE(si.opening_quantity, 0) * COALESCE(si.opening_rate, 0)      AS opening_value,
    COALESCE(mv.in_qty, 0)               AS in_qty,
    COALESCE(mv.in_value, 0)             AS in_value,
    COALESCE(mv.out_qty, 0)              AS out_qty,
    COALESCE(mv.out_value, 0)            AS out_value
  FROM stock_items si
  LEFT JOIN units u ON u.unit_id = si.unit_id
  LEFT JOIN (
    SELECT vse.stock_item_id,
      SUM(CASE WHEN v.voucher_type IN (${sql.join(INWARD.map(t => sql`${t}`), sql`, `)})  THEN vse.quantity ELSE 0 END) AS in_qty,
      SUM(CASE WHEN v.voucher_type IN (${sql.join(INWARD.map(t => sql`${t}`), sql`, `)})  THEN vse.amount   ELSE 0 END) AS in_value,
      SUM(CASE WHEN v.voucher_type IN (${sql.join(OUTWARD.map(t => sql`${t}`), sql`, `)}) THEN vse.quantity ELSE 0 END) AS out_qty,
      SUM(CASE WHEN v.voucher_type IN (${sql.join(OUTWARD.map(t => sql`${t}`), sql`, `)}) THEN vse.amount   ELSE 0 END) AS out_value
    FROM voucher_stock_entries vse
    INNER JOIN vouchers v ON v.voucher_id = vse.voucher_id
    WHERE v.company_id = ${company_id} AND v.fy_id = ${fy_id}
      AND v.is_cancelled = 0 AND COALESCE(v.is_optional, 0) = 0 AND COALESCE(v.is_post_dated, 0) = 0
    GROUP BY vse.stock_item_id
  ) mv ON mv.stock_item_id = si.item_id
`;

const toRow = (r) => {
  const costQty   = (r.opening_qty || 0) + (r.in_qty || 0);
  const costValue = (r.opening_value || 0) + (r.in_value || 0);
  const revQty    = r.out_qty   || 0;
  const revValue  = r.out_value || 0;
  const balQty    = costQty - revQty;
  const costRate  = costQty ? costValue / costQty : 0;
  const balValue  = balQty * costRate;
  const profit    = revValue - (costValue - balValue);
  return {
    id: r.item_id,
    name: r.item_name,
    unit: r.unit_name || '',
    cost:    { qty: costQty, value: costValue },
    revenue: { qty: revQty,  value: revValue },
    balance: { qty: balQty,  value: balValue },
    profit,
  };
};

/**
 * Item Cost Analysis — TallyPrime "Stock Group / Stock Item Cost Analysis".
 * mode: 'group' (ref_id = group_id, -1 = all), 'item' (ref_id = item_id),
 *       'track' (cost-track break-up — no stored cost-track data, returns empty).
 */
const itemCostAnalysis = async (company_id, fy_id, mode, ref_id) => {
  try {
    if (mode === 'track') return { success: true, rows: [] };

    let rows;
    if (mode === 'item') {
      rows = await db.all(sql`${itemMovementSelect(company_id, fy_id)}
        WHERE si.company_id = ${company_id} AND si.is_active = 1 AND si.item_id = ${ref_id}`);
    } else {
      const allGroups = Number(ref_id) === -1;
      rows = await db.all(sql`${itemMovementSelect(company_id, fy_id)}
        WHERE si.company_id = ${company_id} AND si.is_active = 1
        ${allGroups ? sql`` : sql`AND si.group_id = ${ref_id}`}
        ORDER BY si.name ASC`);
    }

    return { success: true, rows: rows.map(toRow) };
  } catch (err) {
    return { success: false, error: err.message };
  }
};

module.exports = { itemCostAnalysis };
