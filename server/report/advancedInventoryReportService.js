const { db } = require('../db/index');
const { sql } = require('drizzle-orm');
const { godowns, voucherStockEntries, vouchers, stockItems, voucherBatches } = require('../db/schema');
const { inwardCondSql, outwardCondSql } = require('./services/stockMovement');
const { calculateGodownClosing } = require('./stockValuationEngine');

module.exports = {
  godownSummary: async (company_id, fy_id, as_on_date) => {
    try {
      // Weighted-average COST per godown via the shared engine — Stock Journal
      // legs land in their own godowns, opening allocations included, outward
      // consumption at cost (never inward amount − sale amount).
      const godownRows = await db.all(
        sql`SELECT g.godown_id, COALESCE(g.name, 'Main Location') AS godown_name
            FROM ${godowns} g
            WHERE g.company_id = ${company_id} AND g.is_active = 1
            ORDER BY godown_name ASC`
      );
      const closing = await calculateGodownClosing(company_id, fy_id, as_on_date);
      const byGodown = new Map((closing.godowns || []).map(g => [g.godown_id, g]));
      const rows = godownRows.map(g => {
        const c = byGodown.get(g.godown_id) || { item_count: 0, closing_value: 0 };
        return {
          godown_id: g.godown_id,
          godown_name: g.godown_name,
          item_count: c.item_count,
          value: c.closing_value,
        };
      });
      return { success: true, rows };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  stockAgeing: async (company_id, fy_id, as_on_date) => {
    try {
      // Simplified Ageing Analysis based on last inwards.
      // Age is measured against the report's as-on date — NOT today — so a
      // back-dated report buckets purchases the way they stood on that date.
      const asOn = as_on_date || new Date().toISOString().slice(0, 10);
      const dateCond = as_on_date ? sql` AND v.date <= ${as_on_date}` : sql``;

      const rows = await db.all(
        sql`SELECT
              si.item_id,
              si.name AS item_name,
              SUM(CASE WHEN ${inwardCondSql('v', 'vse')} THEN vse.amount ELSE 0 END) -
              SUM(CASE WHEN ${outwardCondSql('v', 'vse')} THEN vse.amount ELSE 0 END) AS value,
              SUM(CASE WHEN (julianday(${asOn}) - julianday(v.date)) <= 30 AND ${inwardCondSql('v', 'vse')} THEN vse.amount ELSE 0 END) AS days30,
              SUM(CASE WHEN (julianday(${asOn}) - julianday(v.date)) > 30 AND (julianday(${asOn}) - julianday(v.date)) <= 60 AND ${inwardCondSql('v', 'vse')} THEN vse.amount ELSE 0 END) AS days60,
              SUM(CASE WHEN (julianday(${asOn}) - julianday(v.date)) > 60 AND ${inwardCondSql('v', 'vse')} THEN vse.amount ELSE 0 END) AS daysOver
            FROM ${stockItems} si
            LEFT JOIN ${voucherStockEntries} vse ON vse.stock_item_id = si.item_id
            LEFT JOIN ${vouchers} v ON v.voucher_id = vse.voucher_id
            WHERE si.company_id = ${company_id} AND si.is_active = 1
              AND (v.company_id IS NULL OR (v.company_id = ${company_id} AND v.fy_id = ${fy_id} AND v.is_cancelled = 0
              AND COALESCE(v.is_optional, 0) = 0 AND COALESCE(v.is_post_dated, 0) = 0${dateCond}))
            GROUP BY si.item_id, si.name
            HAVING value > 0
            ORDER BY si.name ASC`
      );
      return { success: true, rows };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  movementAnalysis: async (company_id, fy_id, as_on_date) => {
    try {
      const dateCond = as_on_date ? sql` AND v.date <= ${as_on_date}` : sql``;
      const rows = await db.all(
        sql`SELECT
              si.name AS name,
              SUM(CASE WHEN ${inwardCondSql('v', 'vse')} THEN vse.quantity ELSE 0 END) AS in_qty,
              SUM(CASE WHEN ${outwardCondSql('v', 'vse')} THEN vse.quantity ELSE 0 END) AS out_qty
            FROM ${stockItems} si
            LEFT JOIN ${voucherStockEntries} vse ON vse.stock_item_id = si.item_id
            LEFT JOIN ${vouchers} v ON v.voucher_id = vse.voucher_id
            WHERE si.company_id = ${company_id} AND si.is_active = 1
              AND (v.company_id IS NULL OR (v.company_id = ${company_id} AND v.fy_id = ${fy_id} AND v.is_cancelled = 0
              AND COALESCE(v.is_optional, 0) = 0 AND COALESCE(v.is_post_dated, 0) = 0${dateCond}))
            GROUP BY si.item_id, si.name
            ORDER BY si.name ASC`
      );
      return { success: true, rows };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  // Reorder Status (Tally): per item — closing stock, purchase orders pending
  // (ordered − received against the order no.), total available, reorder level,
  // shortfall vs level, and the qty to order (max of shortfall and the master's
  // minimum reorder quantity). Quantities carry the item's real unit.
  reorderStatus: async (company_id, fy_id) => {
    try {
      const rows = await db.all(
        sql`SELECT
              si.item_id,
              si.name AS item_name,
              u.name  AS unit_name,
              COALESCE(si.opening_quantity, 0) +
              COALESCE((SELECT SUM(vse.quantity) FROM ${voucherStockEntries} vse JOIN ${vouchers} v ON v.voucher_id = vse.voucher_id WHERE vse.stock_item_id = si.item_id AND v.company_id = ${company_id} AND v.fy_id = ${fy_id} AND v.is_cancelled = 0 AND COALESCE(v.is_optional, 0) = 0 AND COALESCE(v.is_post_dated, 0) = 0 AND ${inwardCondSql('v', 'vse')}), 0) -
              COALESCE((SELECT SUM(vse.quantity) FROM ${voucherStockEntries} vse JOIN ${vouchers} v ON v.voucher_id = vse.voucher_id WHERE vse.stock_item_id = si.item_id AND v.company_id = ${company_id} AND v.fy_id = ${fy_id} AND v.is_cancelled = 0 AND COALESCE(v.is_optional, 0) = 0 AND COALESCE(v.is_post_dated, 0) = 0 AND ${outwardCondSql('v', 'vse')}), 0) AS closing_qty,
              COALESCE((SELECT SUM(vse.quantity) FROM ${voucherStockEntries} vse JOIN ${vouchers} v ON v.voucher_id = vse.voucher_id WHERE vse.stock_item_id = si.item_id AND v.company_id = ${company_id} AND v.fy_id = ${fy_id} AND v.voucher_type = 'Purchase Order' AND v.is_cancelled = 0), 0) -
              COALESCE((SELECT SUM(vse.quantity) FROM ${voucherStockEntries} vse JOIN ${vouchers} v ON v.voucher_id = vse.voucher_id WHERE vse.stock_item_id = si.item_id AND v.company_id = ${company_id} AND v.fy_id = ${fy_id} AND v.voucher_type = 'Receipt Note' AND v.is_cancelled = 0), 0) AS po_pending,
              COALESCE(si.reorder_level, 0)    AS reorder_level,
              COALESCE(si.reorder_quantity, 0) AS reorder_qty
            FROM ${stockItems} si
            LEFT JOIN units u ON u.unit_id = si.unit_id
            WHERE si.company_id = ${company_id} AND si.is_active = 1
            ORDER BY si.name ASC`
      );
      const withUnit = (n, unit) => unit ? `${n} ${unit}` : String(n);
      const processed = rows.map(r => {
        const poPending = Math.max(0, r.po_pending || 0);
        const total     = (r.closing_qty || 0) + poPending;
        const shortfall = Math.max(0, (r.reorder_level || 0) - total);
        const toOrder   = shortfall > 0 ? Math.max(shortfall, r.reorder_qty || 0) : 0;
        return {
          item_id: r.item_id,
          item_name: r.item_name,
          closing: withUnit(r.closing_qty || 0, r.unit_name),
          po_pending: poPending ? withUnit(poPending, r.unit_name) : "",
          total_available: withUnit(total, r.unit_name),
          level: withUnit(r.reorder_level || 0, r.unit_name),
          shortage: shortfall ? withUnit(shortfall, r.unit_name) : "",
          to_order: toOrder ? withUnit(toOrder, r.unit_name) : "",
        };
      });
      return { success: true, rows: processed };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  // Order Outstandings (Sales/Purchase). Returns outstanding order LINES with a
  // balance (pending) quantity = ordered − fulfilled, matched by order number +
  // item against the fulfilling voucher (Delivery Note / Receipt Note).
  //   dimension: 'all' | 'stock-item' | 'stock-group' | 'stock-category'
  //              | 'ledger' | 'group'   (with selection_id for the chosen entity)
  orderOutstanding: async (company_id, fy_id, type, dimension = 'all', selection_id = null) => {
    try {
      const orderType  = type === 'sales' ? 'Sales Order'  : 'Purchase Order';
      const fulfilType = type === 'sales' ? 'Delivery Note' : 'Receipt Note';

      // Dimension filter — join stock_items only when filtering on stock attributes.
      const needsItemJoin = dimension === 'stock-group' || dimension === 'stock-category';
      const dimJoin = needsItemJoin
        ? sql` INNER JOIN ${stockItems} si ON si.item_id = vse.stock_item_id`
        : sql``;
      let dimCond = sql``;
      if (dimension === 'stock-item'     && selection_id) dimCond = sql` AND vse.stock_item_id = ${selection_id}`;
      // Stock Group is hierarchical — include the chosen group AND all its
      // descendant groups (Tally shows a group's whole sub-tree). Primary/"All
      // Stock Groups" arrives as selection_id = null → no filter.
      else if (dimension === 'stock-group'    && selection_id) dimCond = sql` AND si.group_id IN (
        WITH RECURSIVE grp(id) AS (
          SELECT ${selection_id}
          UNION ALL
          SELECT sg.sg_id FROM stock_groups sg INNER JOIN grp ON sg.parent_group_id = grp.id
        )
        SELECT id FROM grp
      )`;
      // Stock Category is hierarchical too — include the chosen category and all
      // its descendants. Primary/"All Stock Categories" arrives as null → no filter.
      else if (dimension === 'stock-category' && selection_id) dimCond = sql` AND si.category_id IN (
        WITH RECURSIVE cat(id) AS (
          SELECT ${selection_id}
          UNION ALL
          SELECT sc.sc_id FROM stock_categories sc INNER JOIN cat ON sc.parent_category_id = cat.id
        )
        SELECT id FROM cat
      )`;
      else if (dimension === 'ledger'         && selection_id) dimCond = sql` AND v.party_ledger_id = ${selection_id}`;
      else if (dimension === 'group'          && selection_id) dimCond = sql` AND v.party_ledger_id IN (SELECT ledger_id FROM ledgers WHERE group_id = ${selection_id})`;

      const rows = await db.all(sql`
        SELECT
          v.voucher_id      AS voucher_id,
          v.date            AS date,
          v.voucher_number  AS order_no,
          v.party_name      AS party_name,
          v.party_ledger_id AS party_ledger_id,
          vse.stock_item_id AS stock_item_id,
          vse.item_name     AS item_name,
          COALESCE(um.symbol, um2.symbol) AS unit,
          (SELECT COALESCE(NULLIF(vb0.due_on_date, ''), vb0.due_on)
             FROM voucher_batches vb0
            WHERE vb0.stock_entry_id = vse.stock_entry_id LIMIT 1) AS due_on,
          vse.quantity      AS ordered_qty,
          vse.rate          AS rate,
          (
            SELECT COALESCE(SUM(vb2.quantity), 0)
            FROM ${voucherBatches} vb2
            INNER JOIN ${vouchers} v2             ON v2.voucher_id  = vb2.voucher_id
            INNER JOIN ${voucherStockEntries} vse2 ON vse2.stock_entry_id = vb2.stock_entry_id
            WHERE v2.company_id   = ${company_id}
              AND v2.fy_id        = ${fy_id}
              AND v2.voucher_type = ${fulfilType}
              AND v2.is_cancelled = 0
              AND vb2.order_no    = v.voucher_number
              AND vse2.stock_item_id = vse.stock_item_id
          ) AS fulfilled_qty
        FROM ${vouchers} v
        INNER JOIN ${voucherStockEntries} vse ON vse.voucher_id = v.voucher_id${dimJoin}
        LEFT JOIN units um  ON um.unit_id  = vse.unit_id
        LEFT JOIN ${stockItems} siu ON siu.item_id = vse.stock_item_id
        LEFT JOIN units um2 ON um2.unit_id = siu.unit_id
        WHERE v.company_id   = ${company_id}
          AND v.fy_id        = ${fy_id}
          AND v.voucher_type = ${orderType}
          AND v.is_cancelled = 0${dimCond}
        ORDER BY v.date ASC, v.voucher_id ASC
      `);

      const processed = rows
        .map(r => {
          const ordered = r.ordered_qty || 0;
          const balance = ordered - (r.fulfilled_qty || 0);
          return {
            voucher_id: r.voucher_id,
            date: r.date,
            order_no: r.order_no,
            party_name: r.party_name,
            party_ledger_id: r.party_ledger_id,
            stock_item_id: r.stock_item_id,
            item_name: r.item_name,
            unit: r.unit || "",
            due_on: r.due_on || "",
            ordered_qty: ordered,
            balance_qty: balance,
            rate: r.rate || 0,
            value: balance * (r.rate || 0),
          };
        })
        .filter(r => Math.abs(r.balance_qty) > 1e-9);

      return { success: true, rows: processed };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  // Bills Pending (Tally: tracking-number reconciliation).
  //  type 'sales'    → "Bills Made but Goods not Delivered":  Sales lines carrying
  //                    a tracking number, less any Delivery Note against that number.
  //  type 'purchase' → "Bills Received but Goods not Received": Purchase lines less
  //                    any Receipt Note against the same tracking number.
  // Pending quantity = billed − fulfilled (matched by tracking_no). Rows with a
  // remaining pending qty are returned. Empty when no tracking numbers are used.
  billsPending: async (company_id, fy_id, type) => {
    try {
      const billType    = type === 'purchase' ? 'Purchase' : 'Sales';
      const fulfilType  = type === 'purchase' ? 'Receipt Note' : 'Delivery Note';

      const rows = await db.all(sql`
        SELECT
          MAX(v.voucher_id) AS voucher_id,
          v.date            AS date,
          vb.tracking_no    AS tracking_no,
          vse.item_name     AS item_name,
          v.party_name      AS party_name,
          SUM(vb.quantity)  AS initial_qty,
          MAX(vse.rate)     AS rate,
          MAX(vse.discount_amount) AS disc_amount,
          (
            SELECT COALESCE(SUM(vb2.quantity), 0)
            FROM ${voucherBatches} vb2
            INNER JOIN ${vouchers} v2              ON v2.voucher_id       = vb2.voucher_id
            INNER JOIN ${voucherStockEntries} vse2 ON vse2.stock_entry_id = vb2.stock_entry_id
            WHERE v2.company_id  = ${company_id}
              AND v2.fy_id       = ${fy_id}
              AND v2.voucher_type = ${fulfilType}
              AND v2.is_cancelled = 0
              AND vb2.tracking_no = vb.tracking_no
              AND vse2.stock_item_id = vse.stock_item_id
          ) AS fulfilled_qty
        FROM ${voucherBatches} vb
        INNER JOIN ${vouchers} v            ON v.voucher_id       = vb.voucher_id
        INNER JOIN ${voucherStockEntries} vse ON vse.stock_entry_id = vb.stock_entry_id
        WHERE v.company_id   = ${company_id}
          AND v.fy_id        = ${fy_id}
          AND v.voucher_type = ${billType}
          AND v.is_cancelled = 0
          AND vb.tracking_no IS NOT NULL
          AND TRIM(vb.tracking_no) <> ''
        GROUP BY vb.tracking_no, vse.stock_entry_id
        ORDER BY v.date ASC
      `);

      const processed = rows
        .map(r => {
          const initial = r.initial_qty || 0;
          const pending = initial - (r.fulfilled_qty || 0);
          return {
            voucher_id: r.voucher_id,
            date: r.date,
            tracking_no: r.tracking_no,
            item_name: r.item_name,
            party_name: r.party_name,
            initial_qty: initial,
            pending_qty: pending,
            rate: r.rate || 0,
            disc_amount: r.disc_amount || 0,
            value: pending * (r.rate || 0),
          };
        })
        .filter(r => Math.abs(r.pending_qty) > 1e-9);

      return { success: true, rows: processed };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }
};
