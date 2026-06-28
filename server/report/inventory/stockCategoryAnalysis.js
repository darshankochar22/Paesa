const { db } = require('../../db/index');
const { sql } = require('drizzle-orm');
const { vouchers, stockItems, stockCategories, voucherStockEntries, units } = require('../../db/schema');

const INWARD  = ['Purchase', 'Receipt Note', 'Rejection In', 'Material In'];
const OUTWARD = ['Sales', 'Delivery Note', 'Rejection Out', 'Material Out'];

/** Stock Category Analysis — movement (opening/inward/outward/closing qty+value) per stock category. */
const stockCategoryAnalysis = async (company_id, fy_id) => {
  try {
    const rows = await db.all(sql`
      SELECT
        sc.sc_id        AS category_id,
        sc.name         AS category_name,
        COALESCE(SUM(COALESCE(si.opening_quantity, 0)), 0)                                         AS opening_qty,
        COALESCE(SUM(COALESCE(si.opening_quantity, 0) * COALESCE(si.opening_rate, 0)), 0)          AS opening_value,
        COALESCE(SUM(COALESCE(mv.inwards_qty, 0)), 0)                                              AS in_qty,
        COALESCE(SUM(COALESCE(mv.inwards_value, 0)), 0)                                            AS in_value,
        COALESCE(SUM(COALESCE(mv.outwards_qty, 0)), 0)                                             AS out_qty,
        COALESCE(SUM(COALESCE(mv.outwards_value, 0)), 0)                                           AS out_value
      FROM ${stockCategories} sc
      LEFT JOIN ${stockItems} si
        ON si.category_id = sc.sc_id AND si.company_id = ${company_id} AND si.is_active = 1
      LEFT JOIN (
        SELECT
          vse.stock_item_id,
          SUM(CASE WHEN v.voucher_type IN (${sql.join(INWARD.map(t => sql`${t}`), sql`, `)})
                   THEN vse.quantity ELSE 0 END) AS inwards_qty,
          SUM(CASE WHEN v.voucher_type IN (${sql.join(INWARD.map(t => sql`${t}`), sql`, `)})
                   THEN vse.amount ELSE 0 END) AS inwards_value,
          SUM(CASE WHEN v.voucher_type IN (${sql.join(OUTWARD.map(t => sql`${t}`), sql`, `)})
                   THEN vse.quantity ELSE 0 END) AS outwards_qty,
          SUM(CASE WHEN v.voucher_type IN (${sql.join(OUTWARD.map(t => sql`${t}`), sql`, `)})
                   THEN vse.amount ELSE 0 END) AS outwards_value
        FROM ${voucherStockEntries} vse
        INNER JOIN ${vouchers} v ON v.voucher_id = vse.voucher_id
        WHERE v.company_id = ${company_id}
          AND v.fy_id = ${fy_id}
          AND v.is_cancelled = 0
          AND COALESCE(v.is_optional, 0) = 0
          AND COALESCE(v.is_post_dated, 0) = 0
        GROUP BY vse.stock_item_id
      ) mv ON mv.stock_item_id = si.item_id
      WHERE sc.company_id = ${company_id} AND sc.is_active = 1
      GROUP BY sc.sc_id, sc.name
      ORDER BY sc.name ASC
    `);

    const categories = rows.map(r => {
      const opening_qty   = r.opening_qty   || 0;
      const opening_value = r.opening_value || 0;
      const in_qty        = r.in_qty        || 0;
      const in_value      = r.in_value      || 0;
      const out_qty       = r.out_qty       || 0;
      const out_value     = r.out_value     || 0;
      const closing_qty   = opening_qty + in_qty - out_qty;
      const closing_value = opening_value + in_value - out_value;
      return { category_id: r.category_id, category_name: r.category_name, opening_qty, opening_value, in_qty, in_value, out_qty, out_value, closing_qty, closing_value };
    });

    return { success: true, categories };
  } catch (err) {
    return { success: false, error: err.message };
  }
};

/** Items within a stock category with full movement data. */
const stockCategoryAnalysisItems = async (company_id, fy_id, category_id) => {
  try {
    const rows = await db.all(sql`
      SELECT
        si.item_id,
        si.name AS item_name,
        u.name  AS unit_name,
        COALESCE(si.opening_quantity, 0)                                              AS opening_qty,
        COALESCE(si.opening_quantity, 0) * COALESCE(si.opening_rate, 0)              AS opening_value,
        COALESCE(mv.inwards_qty, 0)                                                   AS in_qty,
        COALESCE(mv.inwards_value, 0)                                                 AS in_value,
        COALESCE(mv.outwards_qty, 0)                                                  AS out_qty,
        COALESCE(mv.outwards_value, 0)                                                AS out_value
      FROM ${stockItems} si
      LEFT JOIN ${units} u ON u.unit_id = si.unit_id
      LEFT JOIN (
        SELECT
          vse.stock_item_id,
          SUM(CASE WHEN v.voucher_type IN (${sql.join(INWARD.map(t => sql`${t}`), sql`, `)})
                   THEN vse.quantity ELSE 0 END) AS inwards_qty,
          SUM(CASE WHEN v.voucher_type IN (${sql.join(INWARD.map(t => sql`${t}`), sql`, `)})
                   THEN vse.amount ELSE 0 END) AS inwards_value,
          SUM(CASE WHEN v.voucher_type IN (${sql.join(OUTWARD.map(t => sql`${t}`), sql`, `)})
                   THEN vse.quantity ELSE 0 END) AS outwards_qty,
          SUM(CASE WHEN v.voucher_type IN (${sql.join(OUTWARD.map(t => sql`${t}`), sql`, `)})
                   THEN vse.amount ELSE 0 END) AS outwards_value
        FROM ${voucherStockEntries} vse
        INNER JOIN ${vouchers} v ON v.voucher_id = vse.voucher_id
        WHERE v.company_id = ${company_id}
          AND v.fy_id = ${fy_id}
          AND v.is_cancelled = 0
          AND COALESCE(v.is_optional, 0) = 0
          AND COALESCE(v.is_post_dated, 0) = 0
        GROUP BY vse.stock_item_id
      ) mv ON mv.stock_item_id = si.item_id
      WHERE si.company_id = ${company_id} AND si.is_active = 1
        ${category_id != null ? sql`AND si.category_id = ${category_id}` : sql``}
      ORDER BY si.name ASC
    `);

    const items = rows.map(r => {
      const opening_qty   = r.opening_qty   || 0;
      const opening_value = r.opening_value || 0;
      const in_qty        = r.in_qty        || 0;
      const in_value      = r.in_value      || 0;
      const out_qty       = r.out_qty       || 0;
      const out_value     = r.out_value     || 0;
      const closing_qty   = opening_qty + in_qty - out_qty;
      const closing_value = opening_value + in_value - out_value;
      return { item_id: r.item_id, item_name: r.item_name, unit_name: r.unit_name || '', opening_qty, opening_value, in_qty, in_value, out_qty, out_value, closing_qty, closing_value };
    });

    return { success: true, items };
  } catch (err) {
    return { success: false, error: err.message };
  }
};

module.exports = { stockCategoryAnalysis, stockCategoryAnalysisItems };
