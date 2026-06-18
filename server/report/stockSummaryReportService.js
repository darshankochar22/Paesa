const { db } = require('../db/index');
const { sql } = require('drizzle-orm');
const { stockItems, stockGroups, voucherStockEntries, vouchers } = require('../db/schema');
const { calculateClosingStock } = require('./stockValuationEngine');

// Inwards / outwards voucher-type conventions, mirroring voucherService.getDaybook
// and getById (CASE WHEN v.voucher_type IN (...)) so inventory movement direction
// stays consistent across the app.
const INWARD_TYPES = ['Purchase', 'Receipt Note', 'Rejection In', 'Material In'];
const OUTWARD_TYPES = ['Sales', 'Delivery Note', 'Rejection Out', 'Material Out'];

module.exports = {
  // Stock Summary: closing quantity + value per stock item (with stock-group
  // attribution), built from voucher_stock_entries movements layered on top of
  // each item's opening balance. Read-only.
  //
  //   closing_qty   = opening_quantity + SUM(inwards qty) - SUM(outwards qty)
  //   closing_value = opening_value    + SUM(inwards amt) - SUM(outwards amt)
  //
  //
  // as_on_date (optional, 'YYYY-MM-DD') caps movements at v.date <= as_on_date.
  // method (optional, default 'FIFO') uses the valuation engine to compute true closing value.
  stockSummary: async (company_id, fy_id, as_on_date, method = 'FIFO') => {
    try {
      // Optional date ceiling on the movement sub-aggregate.
      const dateCond = as_on_date ? sql` AND v.date <= ${as_on_date}` : sql``;

      const rows = await db.all(
        sql`SELECT
              si.item_id        AS item_id,
              si.name           AS item_name,
              si.group_id       AS group_id,
              sg.name           AS group_name,
              COALESCE(si.opening_quantity, 0) AS opening_qty,
              COALESCE(si.opening_value, 0)    AS opening_value,
              COALESCE(mv.inwards_qty, 0)      AS inwards_qty,
              COALESCE(mv.inwards_value, 0)    AS inwards_value,
              COALESCE(mv.outwards_qty, 0)     AS outwards_qty,
              COALESCE(mv.outwards_value, 0)   AS outwards_value
            FROM ${stockItems} si
            LEFT JOIN ${stockGroups} sg ON sg.sg_id = si.group_id
            LEFT JOIN (
              SELECT
                vse.stock_item_id AS stock_item_id,
                SUM(CASE WHEN v.voucher_type IN (${sql.join(INWARD_TYPES.map(t => sql`${t}`), sql`, `)})
                         THEN vse.quantity ELSE 0 END) AS inwards_qty,
                SUM(CASE WHEN v.voucher_type IN (${sql.join(INWARD_TYPES.map(t => sql`${t}`), sql`, `)})
                         THEN vse.amount ELSE 0 END) AS inwards_value,
                SUM(CASE WHEN v.voucher_type IN (${sql.join(OUTWARD_TYPES.map(t => sql`${t}`), sql`, `)})
                         THEN vse.quantity ELSE 0 END) AS outwards_qty,
                SUM(CASE WHEN v.voucher_type IN (${sql.join(OUTWARD_TYPES.map(t => sql`${t}`), sql`, `)})
                         THEN vse.amount ELSE 0 END) AS outwards_value
              FROM ${voucherStockEntries} vse
              INNER JOIN ${vouchers} v ON v.voucher_id = vse.voucher_id
              WHERE v.company_id = ${company_id}
                AND v.fy_id = ${fy_id}
                AND v.is_cancelled = 0
                AND COALESCE(v.is_optional, 0) = 0
                AND COALESCE(v.is_post_dated, 0) = 0${dateCond}
              GROUP BY vse.stock_item_id
            ) mv ON mv.stock_item_id = si.item_id
            WHERE si.company_id = ${company_id}
              AND si.is_active = 1
            ORDER BY sg.name ASC, si.name ASC`
      );

      const items = rows.map(r => {
        const opening_qty = r.opening_qty || 0;
        const opening_value = r.opening_value || 0;
        const inwards_qty = r.inwards_qty || 0;
        const inwards_value = r.inwards_value || 0;
        const outwards_qty = r.outwards_qty || 0;
        const outwards_value = r.outwards_value || 0;
        return {
          item_id: r.item_id,
          item_name: r.item_name,
          group_id: r.group_id,
          group_name: r.group_name || 'Ungrouped',
          opening_qty,
          opening_value,
          inwards_qty,
          inwards_value,
          outwards_qty,
          outwards_value,
          closing_qty: opening_qty + inwards_qty - outwards_qty,
          closing_value: 0, // Will be overridden by valuation engine
        };
      });

      // Run valuation engine for true closing stock valuation
      const valuationData = await calculateClosingStock(company_id, fy_id, as_on_date, method);
      if (valuationData.success) {
        const valMap = new Map();
        for (const v of valuationData.items) {
          valMap.set(v.item_id, v.closing_value);
        }
        for (const it of items) {
          if (valMap.has(it.item_id)) {
            it.closing_value = valMap.get(it.item_id);
          }
        }
      } else {
        // Fallback to simple arithmetic if valuation fails
        for (const it of items) {
          it.closing_value = it.opening_value + it.inwards_value - it.outwards_value;
        }
      }

      // Group-level rollup of closing quantity + value.
      const groupMap = new Map();
      for (const it of items) {
        const key = it.group_id == null ? 'ungrouped' : it.group_id;
        if (!groupMap.has(key)) {
          groupMap.set(key, {
            group_id: it.group_id,
            group_name: it.group_name,
            closing_qty: 0,
            closing_value: 0,
            item_count: 0,
          });
        }
        const g = groupMap.get(key);
        g.closing_qty += it.closing_qty;
        g.closing_value += it.closing_value;
        g.item_count += 1;
      }
      const groups = Array.from(groupMap.values())
        .sort((a, b) => (a.group_name || '').localeCompare(b.group_name || ''));

      const totalClosingQty = items.reduce((s, it) => s + it.closing_qty, 0);
      const totalClosingValue = items.reduce((s, it) => s + it.closing_value, 0);

      return {
        success: true,
        as_on_date: as_on_date || null,
        items,
        groups,
        totalClosingQty,
        totalClosingValue,
      };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },
};
