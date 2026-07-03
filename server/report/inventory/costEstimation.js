const { db } = require('../../db/index');
const { sql } = require('drizzle-orm');

const { inwardCondSql, outwardCondSql } = require('../services/stockMovement');

// PRIMARY (-1) means "all stock groups" (Items Under: Primary).

/**
 * Cost Estimation — TallyPrime "Item Estimates" report.
 *
 * Lists every stock item that carries a Bill of Materials under the chosen
 * stock group, with its estimated unit cost and amount. Each item expands to
 * its BoM components (component item, consumption qty, rate, amount).
 *
 * Estimated cost per unit = (sum of component amounts) / BoM output qty, falling
 * back to the item's own standard (opening) rate when it has no stored
 * components. Amount = closing qty x cost.
 */
const costEstimation = async (company_id, fy_id, group_id) => {
  try {
    const allGroups = Number(group_id) === -1;

    // BoM items under the group, with unit + closing quantity (opening + inward - outward).
    const items = await db.all(sql`
      SELECT
        si.item_id,
        si.name                                  AS item_name,
        si.bom_name                              AS bom_name,
        u.name                                   AS unit_name,
        COALESCE(si.opening_quantity, 0)         AS opening_qty,
        COALESCE(si.opening_rate, 0)             AS opening_rate,
        COALESCE(mv.in_qty, 0)                   AS in_qty,
        COALESCE(mv.out_qty, 0)                  AS out_qty
      FROM stock_items si
      LEFT JOIN units u ON u.unit_id = si.unit_id
      LEFT JOIN (
        SELECT vse.stock_item_id,
          SUM(CASE WHEN ${inwardCondSql('v', 'vse')} THEN vse.quantity ELSE 0 END) AS in_qty,
          SUM(CASE WHEN ${outwardCondSql('v', 'vse')} THEN vse.quantity ELSE 0 END) AS out_qty
        FROM voucher_stock_entries vse
        INNER JOIN vouchers v ON v.voucher_id = vse.voucher_id
        WHERE v.company_id = ${company_id} AND v.fy_id = ${fy_id}
          AND v.is_cancelled = 0 AND COALESCE(v.is_optional, 0) = 0 AND COALESCE(v.is_post_dated, 0) = 0
        GROUP BY vse.stock_item_id
      ) mv ON mv.stock_item_id = si.item_id
      WHERE si.company_id = ${company_id} AND si.is_active = 1 AND COALESCE(si.has_bom, 0) = 1
        ${allGroups ? sql`` : sql`AND si.group_id = ${group_id}`}
      ORDER BY si.name ASC
    `);

    if (items.length === 0) return { success: true, rows: [] };

    // BoM components (if any have been defined) for the listed items.
    const ids = items.map(i => i.item_id);
    const comps = await db.all(sql`
      SELECT
        bc.item_id,
        ci.name                          AS component_name,
        u.name                           AS unit_name,
        COALESCE(bc.quantity, 0)         AS quantity,
        COALESCE(ci.opening_rate, 0)     AS rate
      FROM bom_components bc
      LEFT JOIN stock_items ci ON ci.item_id = bc.component_item_id
      LEFT JOIN units u ON u.unit_id = ci.unit_id
      WHERE bc.company_id = ${company_id} AND bc.item_id IN (${sql.join(ids.map(id => sql`${id}`), sql`, `)})
      ORDER BY ci.name ASC
    `);

    const byItem = new Map();
    for (const c of comps) {
      const list = byItem.get(c.item_id) || [];
      list.push({
        name: c.component_name || '',
        unit: c.unit_name || '',
        qty: c.quantity || 0,
        rate: c.rate || 0,
        amount: (c.quantity || 0) * (c.rate || 0),
      });
      byItem.set(c.item_id, list);
    }

    const rows = items.map(it => {
      const components = byItem.get(it.item_id) || [];
      const closing_qty = (it.opening_qty || 0) + (it.in_qty || 0) - (it.out_qty || 0);
      const compTotal = components.reduce((s, c) => s + c.amount, 0);
      // Estimated per-unit cost = total BoM component amount / output (closing) qty.
      // Falls back to the item's own standard (opening) rate when it has no
      // stored components. Amount = closing qty x per-unit cost (Tally: qty x cost).
      const cost = compTotal > 0 && closing_qty > 0
        ? compTotal / closing_qty
        : (it.opening_rate || 0);
      const amount = closing_qty * cost;
      return {
        item_id: it.item_id,
        name: it.item_name,
        unit: it.unit_name || '',
        bom_name: it.bom_name || '',
        qty: closing_qty,
        cost,
        amount,
        components,
      };
    });

    return { success: true, rows };
  } catch (err) {
    return { success: false, error: err.message };
  }
};

module.exports = { costEstimation };
