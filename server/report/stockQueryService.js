const { db } = require('../db/index');
const { sql } = require('drizzle-orm');
const {
  stockItems, stockGroups, stockCategories,
  voucherStockEntries, vouchers, units, godowns,
  stockItemOpeningAllocations,
} = require('../db/schema');

const { inwardCondSql, outwardCondSql } = require('./services/stockMovement');

async function stockQuery(company_id, fy_id, item_id) {
  // ── 1. Item details ──────────────────────────────────────────────────────
  const itemRows = await db.all(sql`
    SELECT
      si.item_id, si.name, si.opening_quantity, si.opening_value, si.opening_rate,
      sg.name  AS group_name,
      sc.name  AS category_name,
      u.name   AS unit_name,
      si.category_id
    FROM ${stockItems} si
    LEFT JOIN ${stockGroups}     sg ON sg.sg_id       = si.group_id
    LEFT JOIN ${stockCategories} sc ON sc.sc_id = si.category_id
    LEFT JOIN ${units}           u  ON u.unit_id      = si.unit_id
    WHERE si.item_id    = ${item_id}
      AND si.company_id = ${company_id}
      AND si.is_active  = 1
  `);

  if (!itemRows.length) return { success: false, error: 'Item not found' };
  const item = itemRows[0];

  // ── 2. Closing balance (qty + value) ────────────────────────────────────
  const movRows = await db.all(sql`
    SELECT
      SUM(CASE WHEN ${inwardCondSql('v', 'vse')}
               THEN vse.quantity ELSE 0 END) AS inward_qty,
      SUM(CASE WHEN ${inwardCondSql('v', 'vse')}
               THEN vse.amount   ELSE 0 END) AS inward_value,
      SUM(CASE WHEN ${outwardCondSql('v', 'vse')}
               THEN vse.quantity ELSE 0 END) AS outward_qty,
      SUM(CASE WHEN ${outwardCondSql('v', 'vse')}
               THEN vse.amount   ELSE 0 END) AS outward_value
    FROM ${voucherStockEntries} vse
    INNER JOIN ${vouchers} v ON v.voucher_id = vse.voucher_id
    WHERE v.company_id  = ${company_id}
      AND v.fy_id       = ${fy_id}
      AND vse.stock_item_id = ${item_id}
      AND v.is_cancelled = 0
      AND COALESCE(v.is_optional, 0)   = 0
      AND COALESCE(v.is_post_dated, 0) = 0
  `);

  const mv = movRows[0] || {};
  const inward_qty    = mv.inward_qty    || 0;
  const inward_value  = mv.inward_value  || 0;
  const outward_qty   = mv.outward_qty   || 0;
  const outward_value = mv.outward_value || 0;
  const opening_qty   = item.opening_quantity || 0;
  const opening_value = item.opening_value    || 0;
  const closing_qty   = opening_qty + inward_qty - outward_qty;
  // Closing value at weighted-average COST — outward_value is sale revenue.
  const avgCostRate   = (opening_qty + inward_qty) > 0
    ? (opening_value + inward_value) / (opening_qty + inward_qty) : 0;
  const closing_value = closing_qty > 0 ? avgCostRate * closing_qty : 0;

  // ── 3. Last purchases ────────────────────────────────────────────────────
  const purchases = await db.all(sql`
    SELECT
      v.voucher_id   AS voucher_id,
      v.date         AS date,
      v.party_name   AS party_name,
      vse.quantity   AS quantity,
      vse.rate       AS rate,
      vse.discount_amount AS disc_amount,
      vse.amount     AS amount
    FROM ${voucherStockEntries} vse
    INNER JOIN ${vouchers} v ON v.voucher_id = vse.voucher_id
    WHERE v.company_id    = ${company_id}
      AND v.fy_id         = ${fy_id}
      AND vse.stock_item_id = ${item_id}
      AND v.voucher_type  = 'Purchase'
      AND v.is_cancelled  = 0
      AND COALESCE(v.is_optional, 0)   = 0
      AND COALESCE(v.is_post_dated, 0) = 0
    ORDER BY v.date DESC, v.voucher_id DESC
    LIMIT 10
  `);

  // ── 4. Last sales ────────────────────────────────────────────────────────
  const sales = await db.all(sql`
    SELECT
      v.voucher_id   AS voucher_id,
      v.date         AS date,
      v.party_name   AS party_name,
      vse.quantity   AS quantity,
      vse.rate       AS rate,
      vse.discount_amount AS disc_amount,
      vse.amount     AS amount
    FROM ${voucherStockEntries} vse
    INNER JOIN ${vouchers} v ON v.voucher_id = vse.voucher_id
    WHERE v.company_id    = ${company_id}
      AND v.fy_id         = ${fy_id}
      AND vse.stock_item_id = ${item_id}
      AND v.voucher_type  = 'Sales'
      AND v.is_cancelled  = 0
      AND COALESCE(v.is_optional, 0)   = 0
      AND COALESCE(v.is_post_dated, 0) = 0
    ORDER BY v.date DESC, v.voucher_id DESC
    LIMIT 10
  `);

  // ── 5. Last selling price ────────────────────────────────────────────────
  const lastSaleRate = sales.length > 0 ? sales[0].rate : null;

  // ── 6. Godown / batch details ────────────────────────────────────────────
  // Opening allocations per godown
  const openingGodownRows = await db.all(sql`
    SELECT
      a.godown_id,
      g.name AS godown_name,
      a.batch_number,
      SUM(a.quantity) AS qty
    FROM ${stockItemOpeningAllocations} a
    LEFT JOIN ${godowns} g ON g.godown_id = a.godown_id
    WHERE a.item_id = ${item_id}
    GROUP BY a.godown_id, a.batch_number
  `);

  // Movement per godown + batch from vouchers
  const godownMovRows = await db.all(sql`
    SELECT
      vse.godown_id,
      g.name AS godown_name,
      NULL   AS batch_number,
      SUM(CASE WHEN ${inwardCondSql('v', 'vse')}
               THEN vse.quantity ELSE 0 END)
      - SUM(CASE WHEN ${outwardCondSql('v', 'vse')}
               THEN vse.quantity ELSE 0 END) AS net_qty
    FROM ${voucherStockEntries} vse
    INNER JOIN ${vouchers} v ON v.voucher_id = vse.voucher_id
    LEFT JOIN ${godowns} g ON g.godown_id = vse.godown_id
    WHERE v.company_id    = ${company_id}
      AND v.fy_id         = ${fy_id}
      AND vse.stock_item_id = ${item_id}
      AND v.is_cancelled  = 0
      AND COALESCE(v.is_optional, 0)   = 0
      AND COALESCE(v.is_post_dated, 0) = 0
    GROUP BY vse.godown_id
  `);

  // Merge opening + movement by godown_id
  const godownMap = new Map();
  for (const r of openingGodownRows) {
    const key = r.godown_id ?? 'null';
    const existing = godownMap.get(key) || { godown_id: r.godown_id, godown_name: r.godown_name || 'Main Location', batch: r.batch_number || '', qty: 0 };
    existing.qty += r.qty || 0;
    godownMap.set(key, existing);
  }
  for (const r of godownMovRows) {
    const key = r.godown_id ?? 'null';
    const existing = godownMap.get(key) || { godown_id: r.godown_id, godown_name: r.godown_name || 'Main Location', batch: '', qty: 0 };
    existing.qty += r.net_qty || 0;
    godownMap.set(key, existing);
  }
  const godownDetails = Array.from(godownMap.values()).filter(g => g.qty !== 0);

  // ── 7. Items of same category ────────────────────────────────────────────
  let categoryItems = [];
  if (item.category_id) {
    const catRows = await db.all(sql`
      SELECT
        si.item_id,
        si.name          AS item_name,
        si.opening_quantity AS opening_qty,
        si.opening_value    AS opening_value,
        COALESCE(mv.inward_qty, 0)    AS inward_qty,
        COALESCE(mv.inward_value, 0)  AS inward_value,
        COALESCE(mv.outward_qty, 0)   AS outward_qty,
        COALESCE(mv.outward_value, 0) AS outward_value,
        COALESCE(mv.last_sale_rate, 0) AS last_sale_rate
      FROM ${stockItems} si
      LEFT JOIN (
        SELECT
          vse.stock_item_id,
          SUM(CASE WHEN ${inwardCondSql('v', 'vse')}
                   THEN vse.quantity ELSE 0 END) AS inward_qty,
          SUM(CASE WHEN ${inwardCondSql('v', 'vse')}
                   THEN vse.amount   ELSE 0 END) AS inward_value,
          SUM(CASE WHEN ${outwardCondSql('v', 'vse')}
                   THEN vse.quantity ELSE 0 END) AS outward_qty,
          SUM(CASE WHEN ${outwardCondSql('v', 'vse')}
                   THEN vse.amount   ELSE 0 END) AS outward_value,
          MAX(CASE WHEN v.voucher_type = 'Sales' THEN vse.rate ELSE NULL END) AS last_sale_rate
        FROM ${voucherStockEntries} vse
        INNER JOIN ${vouchers} v ON v.voucher_id = vse.voucher_id
        WHERE v.company_id  = ${company_id}
          AND v.fy_id       = ${fy_id}
          AND v.is_cancelled = 0
          AND COALESCE(v.is_optional, 0)   = 0
          AND COALESCE(v.is_post_dated, 0) = 0
        GROUP BY vse.stock_item_id
      ) mv ON mv.stock_item_id = si.item_id
      WHERE si.company_id   = ${company_id}
        AND si.category_id = ${item.category_id}
        AND si.is_active    = 1
      ORDER BY si.name ASC
    `);

    categoryItems = catRows.map(r => {
      const cq = (r.opening_qty || 0) + (r.inward_qty || 0) - (r.outward_qty || 0);
      const availQty = (r.opening_qty || 0) + (r.inward_qty || 0);
      const avgRate = availQty > 0 ? ((r.opening_value || 0) + (r.inward_value || 0)) / availQty : 0;
      const cv = cq > 0 ? avgRate * cq : 0;
      return {
        item_id: r.item_id,
        item_name: r.item_name,
        closing_qty: cq,
        closing_value: cv,
        last_sale_rate: r.last_sale_rate || 0,
      };
    });
  }

  // ── 8. Derived header fields (Tally Stock Query layout) ──────────────────
  // Not stored as masters — Tally shows sensible defaults / derived values.
  const cost_rate = closing_qty > 0 ? avgCostRate : (avgCostRate || item.opening_rate || 0);

  return {
    success: true,
    item: {
      item_id: item.item_id,
      name: item.name,
      group_name: item.group_name || 'Not Applicable',
      category_name: item.category_name || 'Not Applicable',
      unit_name: item.unit_name || '',
      closing_qty,
      closing_value,
      last_sale_rate: lastSaleRate,
      // Header block — left column
      cost_rate,                              // Cost price (per unit)
      costing_method: 'Avg. Cost',
      standard_cost: cost_rate,
      // Header block — right column
      part_no: '',
      std_selling_price: lastSaleRate,        // Standard selling price
      market_valuation_method: 'Avg. Price',
    },
    purchases,
    sales,
    godownDetails,
    categoryItems,
  };
}

module.exports = { stockQuery };
