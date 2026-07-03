const { db } = require('../../db/index');
const { sql } = require('drizzle-orm');
const { stockItems, voucherStockEntries, vouchers, units } = require('../../db/schema');
const { inwardCondSql, outwardCondSql } = require('../services/stockMovement');

const PRIMARY_ID = -1; // sentinel: analyse every stock item

/**
 * Reorder Status — for each stock item in scope (a Stock Group or Stock
 * Category, or Primary = all): Closing Stock, Purchase Orders Pending, Sales
 * Orders Due, Nett Available, Re-order Level, Short fall, Min Reorder Qty and
 * Order to be Placed.
 *
 * @param {'group'|'category'|'primary'} scope_type
 * @param {number} scope_id  group/category id; -1 (Primary) => all items
 */
const reorderStatus = async (company_id, fy_id, scope_type, scope_id) => {
  try {
    const isPrimary = scope_id == null || scope_id === PRIMARY_ID;
    const scopeCond = isPrimary
      ? sql``
      : scope_type === 'category'
        ? sql` AND si.category_id = ${scope_id}`
        : sql` AND si.group_id = ${scope_id}`;

    // Per-item movement sub-selects reused below.
    const inwardQty = (extra = sql``) => sql`COALESCE((
      SELECT SUM(vse.quantity) FROM ${voucherStockEntries} vse
      JOIN ${vouchers} v ON v.voucher_id = vse.voucher_id
      WHERE vse.stock_item_id = si.item_id AND v.company_id = ${company_id} AND v.fy_id = ${fy_id}
        AND v.is_cancelled = 0 AND COALESCE(v.is_optional, 0) = 0 AND COALESCE(v.is_post_dated, 0) = 0
        ${extra}), 0)`;

    const typeQty = (vtype) => sql`COALESCE((
      SELECT SUM(vse.quantity) FROM ${voucherStockEntries} vse
      JOIN ${vouchers} v ON v.voucher_id = vse.voucher_id
      WHERE vse.stock_item_id = si.item_id AND v.company_id = ${company_id} AND v.fy_id = ${fy_id}
        AND v.voucher_type = ${vtype} AND v.is_cancelled = 0), 0)`;

    const rows = await db.all(sql`
      SELECT
        si.item_id,
        si.name AS item_name,
        u.name  AS unit_name,
        COALESCE(si.opening_quantity, 0)
          + ${inwardQty(sql`AND ${inwardCondSql('v', 'vse')}`)}
          - ${inwardQty(sql`AND ${outwardCondSql('v', 'vse')}`)} AS closing_qty,
        ${typeQty('Purchase Order')} - ${typeQty('Receipt Note')}   AS po_pending,
        ${typeQty('Sales Order')}    - ${typeQty('Delivery Note')}  AS so_due,
        COALESCE(si.reorder_level, 0)    AS reorder_level,
        COALESCE(si.reorder_quantity, 0) AS min_reorder_qty
      FROM ${stockItems} si
      LEFT JOIN ${units} u ON u.unit_id = si.unit_id
      WHERE si.company_id = ${company_id} AND si.is_active = 1${scopeCond}
      ORDER BY si.name ASC
    `);

    const items = rows.map(r => {
      const closing = r.closing_qty || 0;
      const po = Math.max(0, r.po_pending || 0);
      const so = Math.max(0, r.so_due || 0);
      const nett = closing + po - so;
      const level = r.reorder_level || 0;
      const minQty = r.min_reorder_qty || 0;
      // No reorder level set → no shortfall / order (matches Tally's blank columns).
      const shortfall = level > 0 ? Math.max(0, level - nett) : 0;
      const toOrder = shortfall > 0 ? Math.max(shortfall, minQty) : 0;
      return {
        item_id: r.item_id,
        item_name: r.item_name,
        unit_name: r.unit_name || '',
        closing_qty: closing,
        po_pending: po,
        so_due: so,
        nett_available: nett,
        reorder_level: level,
        shortfall,
        min_reorder_qty: minQty,
        to_order: toOrder,
      };
    });

    return { success: true, items };
  } catch (err) {
    return { success: false, error: err.message };
  }
};

module.exports = { reorderStatus };
