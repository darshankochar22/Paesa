/**
 * inventoryService.js
 *
 * Inventory reports:
 *   15. queryStockBalances -- stock balance queries with optional date ceiling (shared helper)
 *   16. getInventoryReport -- stock_summary, godown_summary, movement, ageing, reorder,
 *                             valuation, batch_summary
 */
const {
  db, sql,
  INWARD_TYPES, OUTWARD_TYPES, sqlIn,
  normalizeType,
  extractParams,
} = require('./reportHelpers');
const {
  vouchers,
  voucherStockEntries,
  voucherBatches,
  stockItems,
  stockGroups,
  godowns,
} = require('../../db/schema');

// ---------------------------------------------------------------------------
// queryStockBalances -- stock balance queries with optional date ceiling
// ---------------------------------------------------------------------------
const queryStockBalances = async (company_id, fy_id, as_on_date, filters = {}) => {
  try {
    const dateCond = as_on_date ? sql` AND v.date <= ${as_on_date}` : sql``;

    const itemConditions = [
      sql`si.company_id = ${company_id}`,
      sql`si.is_active = 1`,
    ];
    if (filters.stock_group_id) {
      itemConditions.push(sql`si.group_id = ${filters.stock_group_id}`);
    }
    if (filters.stock_category_id) {
      itemConditions.push(sql`si.category_id = ${filters.stock_category_id}`);
    }

    const godownCond = filters.godown_id
      ? sql` AND vse.godown_id = ${filters.godown_id}`
      : sql``;

    const rows = await db.all(
      sql`SELECT
            si.item_id,
            si.name AS item_name,
            sg.name AS group_name,
            COALESCE(si.opening_quantity, 0) AS opening_qty,
            COALESCE(si.opening_value, 0) AS opening_value,
            COALESCE(mv.in_qty, 0) AS inwards_qty,
            COALESCE(mv.in_value, 0) AS inwards_value,
            COALESCE(mv.out_qty, 0) AS outwards_qty,
            COALESCE(mv.out_value, 0) AS outwards_value
          FROM ${stockItems} si
          LEFT JOIN ${stockGroups} sg ON sg.sg_id = si.group_id
          LEFT JOIN (
            SELECT
              vse.stock_item_id,
              SUM(CASE WHEN v.voucher_type IN (${sqlIn(INWARD_TYPES)}) THEN vse.quantity ELSE 0 END) AS in_qty,
              SUM(CASE WHEN v.voucher_type IN (${sqlIn(INWARD_TYPES)}) THEN vse.amount ELSE 0 END) AS in_value,
              SUM(CASE WHEN v.voucher_type IN (${sqlIn(OUTWARD_TYPES)}) THEN vse.quantity ELSE 0 END) AS out_qty,
              SUM(CASE WHEN v.voucher_type IN (${sqlIn(OUTWARD_TYPES)}) THEN vse.amount ELSE 0 END) AS out_value
            FROM ${voucherStockEntries} vse
            INNER JOIN ${vouchers} v ON v.voucher_id = vse.voucher_id
            WHERE v.company_id = ${company_id}
              AND v.fy_id = ${fy_id}
              AND v.is_cancelled = 0
              AND COALESCE(v.is_optional, 0) = 0
              AND COALESCE(v.is_post_dated, 0) = 0${dateCond}${godownCond}
            GROUP BY vse.stock_item_id
          ) mv ON mv.stock_item_id = si.item_id
          WHERE ${sql.join(itemConditions, sql` AND `)}
          ORDER BY sg.name ASC, si.name ASC`
    );

    const mapped = rows.map(r => {
      const opening_qty = Number(r.opening_qty) || 0;
      const opening_value = Number(r.opening_value) || 0;
      const in_qty = Number(r.inwards_qty) || 0;
      const in_val = Number(r.inwards_value) || 0;
      const out_qty = Number(r.outwards_qty) || 0;
      const out_val = Number(r.outwards_value) || 0;
      const closing_qty = opening_qty + in_qty - out_qty;
      const closing_value = opening_value + in_val - out_val;
      return {
        item_id: r.item_id,
        item_name: r.item_name,
        group_name: r.group_name || 'Ungrouped',
        opening_qty,
        opening_value,
        inwards_qty: in_qty,
        inwards_value: in_val,
        outwards_qty: out_qty,
        outwards_value: out_val,
        closing_qty,
        closing_value,
        closing_rate: closing_qty > 0 ? (closing_value / closing_qty) : 0,
      };
    });

    return { success: true, rows: mapped };
  } catch (err) {
    return { success: false, error: err.message };
  }
};

// ---------------------------------------------------------------------------
// 16. getInventoryReport -- inventory-specific reports
//     reportType: 'stock_summary' | 'godown_summary' | 'movement' | 'ageing' |
//                 'reorder' | 'valuation' | 'batch_summary'
//     params: { as_on_date, stock_group_id, godown_id, method }
// ---------------------------------------------------------------------------
const getInventoryReport = async (company_id, fy_id, reportTypeArg = 'stock_summary', paramsArg = {}) => {
  try {
    const reportType = normalizeType(reportTypeArg, 'stock_summary', {
      'stock-summary': 'stock_summary', 'stock-item-ledger': 'stock_summary',
      'stock-group-ledger': 'stock_summary', 'godown-summary': 'godown_summary',
      'godown-item': 'godown_summary', 'godown-batch': 'godown_summary',
      'stock-query': 'stock_summary', 'movement': 'movement',
      'stock-ageing': 'ageing', 'ageing-analysis': 'ageing', 'to-be-expired': 'ageing', 'expired': 'ageing',
      'reorder': 'reorder', 'reorder-quantity': 'reorder',
      'stock-valuation': 'valuation', 'fifo': 'valuation', 'average-cost': 'valuation',
      'last-purchase': 'valuation', 'standard-cost': 'valuation',
      'batch': 'batch_summary', 'batch-wise': 'batch_summary', 'mrp-wise': 'batch_summary',
      'negative-stock': 'stock_summary', 'zero-stock': 'stock_summary', 'low-stock': 'stock_summary',
      'fast-moving': 'movement', 'slow-moving': 'movement', 'non-moving': 'movement',
      'physical-stock': 'stock_summary', 'stock-journal': 'stock_summary',
      'stock-transfer': 'stock_summary', 'inter-godown': 'stock_summary',
      'material-in': 'stock_summary', 'material-out': 'stock_summary',
      'inventory-voucher': 'stock_summary', 'stock-item-profitability': 'stock_summary',
      'stock-category-summary': 'stock_summary', 'stock-category-movement': 'movement',
      'stock-group-profitability': 'stock_summary', 'stock-item-cost': 'stock_summary',
      'stock-item-sales-trend': 'movement', 'stock-item-purchase-trend': 'movement',
      'inventory-exception': 'stock_summary',
    });
    const params = extractParams(reportTypeArg) || paramsArg;
    const as_on_date = params.as_on_date || null;
    const dateCond = as_on_date ? sql` AND v.date <= ${as_on_date}` : sql``;

    let rows;

    switch (reportType) {
      case 'stock_summary': {
        return queryStockBalances(company_id, fy_id, as_on_date, {
          stock_group_id: params.stock_group_id,
          godown_id: params.godown_id,
          stock_category_id: params.stock_category_id,
        });
      }

      case 'godown_summary': {
        rows = await db.all(
          sql`SELECT
                g.godown_id,
                COALESCE(g.name, 'Main Location') AS godown_name,
                g.address,
                g.city,
                g.state,
                COUNT(DISTINCT vse.stock_item_id) AS item_count,
                COALESCE(SUM(CASE WHEN v.voucher_type IN (${sqlIn(INWARD_TYPES)}) THEN vse.quantity ELSE 0 END), 0)
                  - COALESCE(SUM(CASE WHEN v.voucher_type IN (${sqlIn(OUTWARD_TYPES)}) THEN vse.quantity ELSE 0 END), 0) AS net_qty,
                COALESCE(SUM(CASE WHEN v.voucher_type IN (${sqlIn(INWARD_TYPES)}) THEN vse.amount ELSE 0 END), 0)
                  - COALESCE(SUM(CASE WHEN v.voucher_type IN (${sqlIn(OUTWARD_TYPES)}) THEN vse.amount ELSE 0 END), 0) AS net_value
              FROM ${godowns} g
              LEFT JOIN ${voucherStockEntries} vse ON vse.godown_id = g.godown_id
              LEFT JOIN ${vouchers} v ON v.voucher_id = vse.voucher_id
                AND v.company_id = ${company_id} AND v.fy_id = ${fy_id}
                AND v.is_cancelled = 0
                AND COALESCE(v.is_optional, 0) = 0
                AND COALESCE(v.is_post_dated, 0) = 0${dateCond}
              WHERE g.company_id = ${company_id} AND g.is_active = 1
              GROUP BY g.godown_id, g.name, g.address, g.city, g.state
              ORDER BY g.name ASC`
        );
        break;
      }

      case 'movement': {
        const itemCond = params.stock_group_id
          ? sql` AND si.group_id = ${params.stock_group_id}`
          : sql``;

        rows = await db.all(
          sql`SELECT
                si.item_id,
                si.name AS item_name,
                sg.name AS group_name,
                COALESCE(SUM(CASE WHEN v.voucher_type IN (${sqlIn(INWARD_TYPES)}) THEN vse.quantity ELSE 0 END), 0) AS in_qty,
                COALESCE(SUM(CASE WHEN v.voucher_type IN (${sqlIn(INWARD_TYPES)}) THEN vse.amount ELSE 0 END), 0) AS in_value,
                COALESCE(SUM(CASE WHEN v.voucher_type IN (${sqlIn(OUTWARD_TYPES)}) THEN vse.quantity ELSE 0 END), 0) AS out_qty,
                COALESCE(SUM(CASE WHEN v.voucher_type IN (${sqlIn(OUTWARD_TYPES)}) THEN vse.amount ELSE 0 END), 0) AS out_value,
                COALESCE(SUM(CASE WHEN v.voucher_type IN (${sqlIn(INWARD_TYPES)}) THEN vse.quantity ELSE 0 END), 0)
                  - COALESCE(SUM(CASE WHEN v.voucher_type IN (${sqlIn(OUTWARD_TYPES)}) THEN vse.quantity ELSE 0 END), 0) AS net_qty,
                COALESCE(SUM(CASE WHEN v.voucher_type IN (${sqlIn(INWARD_TYPES)}) THEN vse.amount ELSE 0 END), 0)
                  - COALESCE(SUM(CASE WHEN v.voucher_type IN (${sqlIn(OUTWARD_TYPES)}) THEN vse.amount ELSE 0 END), 0) AS net_value
              FROM ${stockItems} si
              LEFT JOIN ${stockGroups} sg ON sg.sg_id = si.group_id
              LEFT JOIN ${voucherStockEntries} vse ON vse.stock_item_id = si.item_id
              LEFT JOIN ${vouchers} v ON v.voucher_id = vse.voucher_id
                AND v.company_id = ${company_id} AND v.fy_id = ${fy_id}
                AND v.is_cancelled = 0
                AND COALESCE(v.is_optional, 0) = 0
                AND COALESCE(v.is_post_dated, 0) = 0${dateCond}
              WHERE si.company_id = ${company_id} AND si.is_active = 1${itemCond}
              GROUP BY si.item_id, si.name, sg.name
              ORDER BY si.name ASC`
        );
        break;
      }

      case 'ageing': {
        rows = await db.all(
          sql`SELECT
                si.item_id,
                si.name AS item_name,
                sg.name AS group_name,
                COALESCE(si.opening_quantity, 0) +
                  COALESCE((SELECT SUM(vse2.quantity) FROM ${voucherStockEntries} vse2
                    INNER JOIN ${vouchers} v2 ON v2.voucher_id = vse2.voucher_id
                    WHERE vse2.stock_item_id = si.item_id AND v2.company_id = ${company_id} AND v2.fy_id = ${fy_id}
                      AND v2.voucher_type IN (${sqlIn(INWARD_TYPES)}) AND v2.is_cancelled = 0
                      AND COALESCE(v2.is_optional, 0) = 0 AND COALESCE(v2.is_post_dated, 0) = 0), 0) -
                  COALESCE((SELECT SUM(vse3.quantity) FROM ${voucherStockEntries} vse3
                    INNER JOIN ${vouchers} v3 ON v3.voucher_id = vse3.voucher_id
                    WHERE vse3.stock_item_id = si.item_id AND v3.company_id = ${company_id} AND v3.fy_id = ${fy_id}
                      AND v3.voucher_type IN (${sqlIn(OUTWARD_TYPES)}) AND v3.is_cancelled = 0
                      AND COALESCE(v3.is_optional, 0) = 0 AND COALESCE(v3.is_post_dated, 0) = 0), 0) AS closing_qty,
                MAX(CASE WHEN v.voucher_type IN (${sqlIn(INWARD_TYPES)}) THEN v.date ELSE NULL END) AS last_inward_date,
                CAST(julianday('now') - julianday(MAX(CASE WHEN v.voucher_type IN (${sqlIn(INWARD_TYPES)}) THEN v.date ELSE NULL END)) AS INTEGER) AS days_since_inward
              FROM ${stockItems} si
              LEFT JOIN ${stockGroups} sg ON sg.sg_id = si.group_id
              LEFT JOIN ${voucherStockEntries} vse ON vse.stock_item_id = si.item_id
              LEFT JOIN ${vouchers} v ON v.voucher_id = vse.voucher_id
                AND v.company_id = ${company_id} AND v.fy_id = ${fy_id}
                AND v.is_cancelled = 0
                AND COALESCE(v.is_optional, 0) = 0
                AND COALESCE(v.is_post_dated, 0) = 0${dateCond}
              WHERE si.company_id = ${company_id} AND si.is_active = 1
              GROUP BY si.item_id, si.name, sg.name
              HAVING closing_qty > 0
              ORDER BY days_since_inward DESC`
        );
        break;
      }

      case 'reorder': {
        rows = await db.all(
          sql`SELECT
                si.item_id,
                si.name AS item_name,
                sg.name AS group_name,
                COALESCE(si.reorder_level, 0) AS reorder_level,
                COALESCE(si.reorder_quantity, 0) AS reorder_qty,
                COALESCE(si.opening_quantity, 0) +
                  COALESCE((SELECT SUM(vse2.quantity) FROM ${voucherStockEntries} vse2
                    INNER JOIN ${vouchers} v2 ON v2.voucher_id = vse2.voucher_id
                    WHERE vse2.stock_item_id = si.item_id AND v2.company_id = ${company_id} AND v2.fy_id = ${fy_id}
                      AND v2.voucher_type IN (${sqlIn(INWARD_TYPES)}) AND v2.is_cancelled = 0
                      AND COALESCE(v2.is_optional, 0) = 0 AND COALESCE(v2.is_post_dated, 0) = 0), 0) -
                  COALESCE((SELECT SUM(vse3.quantity) FROM ${voucherStockEntries} vse3
                    INNER JOIN ${vouchers} v3 ON v3.voucher_id = vse3.voucher_id
                    WHERE vse3.stock_item_id = si.item_id AND v3.company_id = ${company_id} AND v3.fy_id = ${fy_id}
                      AND v3.voucher_type IN (${sqlIn(OUTWARD_TYPES)}) AND v3.is_cancelled = 0
                      AND COALESCE(v3.is_optional, 0) = 0 AND COALESCE(v3.is_post_dated, 0) = 0), 0) AS closing_qty
              FROM ${stockItems} si
              LEFT JOIN ${stockGroups} sg ON sg.sg_id = si.group_id
              WHERE si.company_id = ${company_id} AND si.is_active = 1
                AND COALESCE(si.reorder_level, 0) > 0
              ORDER BY si.name ASC`
        );
        rows = rows.map(r => {
          const closing = Number(r.closing_qty) || 0;
          const level = Number(r.reorder_level) || 0;
          const reorderQty = Number(r.reorder_qty) || 0;
          const shortage = closing < level ? level - closing : 0;
          return {
            ...r,
            closing_qty: closing,
            reorder_level: level,
            reorder_qty: reorderQty,
            shortage,
            status: closing < level ? 'Below Reorder' : closing <= level * 1.1 ? 'Near Reorder' : 'OK',
          };
        });
        break;
      }

      case 'valuation': {
        rows = await db.all(
          sql`SELECT
                si.item_id,
                si.name AS item_name,
                sg.name AS group_name,
                COALESCE(si.opening_quantity, 0) AS opening_qty,
                COALESCE(si.opening_value, 0) AS opening_value,
                COALESCE(si.opening_rate, 0) AS opening_rate,
                COALESCE(mv.in_qty, 0) AS in_qty,
                COALESCE(mv.in_value, 0) AS in_value,
                COALESCE(mv.out_qty, 0) AS out_qty,
                COALESCE(mv.out_value, 0) AS out_value
              FROM ${stockItems} si
              LEFT JOIN ${stockGroups} sg ON sg.sg_id = si.group_id
              LEFT JOIN (
                SELECT
                  vse.stock_item_id,
                  SUM(CASE WHEN v.voucher_type IN (${sqlIn(INWARD_TYPES)}) THEN vse.quantity ELSE 0 END) AS in_qty,
                  SUM(CASE WHEN v.voucher_type IN (${sqlIn(INWARD_TYPES)}) THEN vse.amount ELSE 0 END) AS in_value,
                  SUM(CASE WHEN v.voucher_type IN (${sqlIn(OUTWARD_TYPES)}) THEN vse.quantity ELSE 0 END) AS out_qty,
                  SUM(CASE WHEN v.voucher_type IN (${sqlIn(OUTWARD_TYPES)}) THEN vse.amount ELSE 0 END) AS out_value
                FROM ${voucherStockEntries} vse
                INNER JOIN ${vouchers} v ON v.voucher_id = vse.voucher_id
                WHERE v.company_id = ${company_id} AND v.fy_id = ${fy_id}
                  AND v.is_cancelled = 0
                  AND COALESCE(v.is_optional, 0) = 0
                  AND COALESCE(v.is_post_dated, 0) = 0${dateCond}
                GROUP BY vse.stock_item_id
              ) mv ON mv.stock_item_id = si.item_id
              WHERE si.company_id = ${company_id} AND si.is_active = 1
              ORDER BY sg.name ASC, si.name ASC`
        );
        rows = rows.map(r => {
          const oq = Number(r.opening_qty) || 0;
          const ov = Number(r.opening_value) || 0;
          const iq = Number(r.in_qty) || 0;
          const iv = Number(r.in_value) || 0;
          const oqq = Number(r.out_qty) || 0;
          const closingQty = oq + iq - oqq;
          // Value remaining stock at weighted-average COST. The old code did
          // `opening_value + in_value - out_value`, but out_value is sale
          // REVENUE, not cost — subtracting it understated closing inventory.
          const avgRate = (oq + iq) > 0 ? (ov + iv) / (oq + iq) : 0;
          const closingValue = avgRate * closingQty;
          return {
            item_id: r.item_id,
            item_name: r.item_name,
            group_name: r.group_name || 'Ungrouped',
            closing_qty: closingQty,
            closing_value: closingValue,
            avg_rate: avgRate,
            fifo_value: closingValue,
          };
        });
        break;
      }

      case 'batch_summary': {
        rows = await db.all(
          sql`SELECT
                vb.batch_number,
                vb.expiry_date,
                si.name AS item_name,
                SUM(vb.quantity) AS total_qty,
                COALESCE(vb.rate, 0) AS rate,
                SUM(vb.quantity) * COALESCE(vb.rate, 0) AS value
              FROM ${voucherBatches} vb
              INNER JOIN ${voucherStockEntries} vse ON vse.stock_entry_id = vb.stock_entry_id
              INNER JOIN ${vouchers} v ON v.voucher_id = vb.voucher_id
              LEFT JOIN ${stockItems} si ON si.item_id = vse.stock_item_id
              WHERE v.company_id = ${company_id} AND v.fy_id = ${fy_id}
                AND v.is_cancelled = 0
                AND COALESCE(v.is_optional, 0) = 0
                AND COALESCE(v.is_post_dated, 0) = 0
              GROUP BY vb.batch_number, vb.expiry_date, si.name, vb.rate
              HAVING total_qty > 0
              ORDER BY si.name ASC, vb.batch_number ASC`
        );
        break;
      }

      default: {
        const rows = await db.all(
          sql`SELECT si.item_id, si.name AS item_name,
                     sg.name AS group_name,
                     COALESCE(si.opening_quantity, 0) AS opening_qty,
                     COALESCE(si.opening_rate, 0) AS rate,
                     COALESCE(si.opening_value, 0) AS opening_value,
                     si.hsn_code, si.gst_rate,
                     COALESCE(si.reorder_level, 0) AS reorder_level
              FROM ${stockItems} si
              LEFT JOIN ${stockGroups} sg ON sg.sg_id = si.group_id
              WHERE si.company_id = ${company_id} AND si.is_active = 1
              ORDER BY sg.name, si.name`
        );
        return { success: true, rows: rows || [] };
      }
    }

    return { success: true, rows };
  } catch (err) {
    return { success: false, error: err.message };
  }
};

module.exports = {
  queryStockBalances,
  getInventoryReport,
};
