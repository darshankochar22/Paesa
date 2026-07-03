const { db } = require('../../db/index');
const { sql } = require('drizzle-orm');
const { vouchers, stockItems, voucherStockEntries, units } = require('../../db/schema');

/**
 * Transfer Analysis — for a transfer voucher type (e.g. Stock Journal), per stock
 * item the Goods In (Production / destination, is_source = 0) and Goods Out
 * (Consumption / source, is_source = 1) quantity & value.
 */
const transferAnalysis = async (company_id, fy_id, voucher_type) => {
  try {
    const rows = await db.all(sql`
      SELECT
        si.item_id,
        si.name AS item_name,
        u.name  AS unit_name,
        SUM(CASE WHEN COALESCE(vse.is_source, 0) = 0 THEN COALESCE(vse.quantity, 0) ELSE 0 END) AS in_qty,
        SUM(CASE WHEN COALESCE(vse.is_source, 0) = 0 THEN COALESCE(vse.amount, 0)   ELSE 0 END) AS in_value,
        SUM(CASE WHEN COALESCE(vse.is_source, 0) = 1 THEN COALESCE(vse.quantity, 0) ELSE 0 END) AS out_qty,
        SUM(CASE WHEN COALESCE(vse.is_source, 0) = 1 THEN COALESCE(vse.amount, 0)   ELSE 0 END) AS out_value
      FROM ${voucherStockEntries} vse
      INNER JOIN ${vouchers} v ON v.voucher_id = vse.voucher_id
      INNER JOIN ${stockItems} si ON si.item_id = vse.stock_item_id
      LEFT JOIN ${units} u ON u.unit_id = si.unit_id
      WHERE v.company_id = ${company_id}
        AND v.fy_id = ${fy_id}
        AND v.voucher_type = ${voucher_type}
        AND v.is_cancelled = 0
        AND COALESCE(v.is_optional, 0) = 0
        AND COALESCE(v.is_post_dated, 0) = 0
      GROUP BY si.item_id, si.name, u.name
      HAVING (in_qty <> 0 OR out_qty <> 0)
      ORDER BY si.name ASC
    `);

    const items = rows.map(r => ({
      item_id:    r.item_id,
      item_name:  r.item_name,
      unit_name:  r.unit_name || '',
      in_qty:     r.in_qty    || 0,
      in_value:   r.in_value  || 0,
      out_qty:    r.out_qty   || 0,
      out_value:  r.out_value || 0,
    }));

    return { success: true, items };
  } catch (err) {
    return { success: false, error: err.message };
  }
};

/**
 * Item Voucher Analysis for a transfer voucher type + stock item: one row per
 * (voucher, leg). is_source = 0 → Goods In (Production) inward leg;
 * is_source = 1 → Goods Out (Consumption) outward leg.
 */
const transferItemVouchers = async (company_id, fy_id, voucher_type, item_id) => {
  try {
    const itemRow = await db.all(sql`SELECT name FROM ${stockItems} WHERE item_id = ${item_id} AND company_id = ${company_id}`);
    const raw = await db.all(sql`
      SELECT
        v.voucher_id     AS voucher_id,
        v.date           AS date,
        v.voucher_type   AS voucher_type,
        v.voucher_number AS voucher_number,
        COALESCE(vse.is_source, 0)              AS is_source,
        SUM(COALESCE(vse.quantity, 0))          AS qty,
        SUM(COALESCE(vse.amount, 0))            AS amount,
        SUM(COALESCE(vse.additional_amount, 0)) AS addl
      FROM ${voucherStockEntries} vse
      INNER JOIN ${vouchers} v ON v.voucher_id = vse.voucher_id
      WHERE v.company_id = ${company_id}
        AND v.fy_id = ${fy_id}
        AND v.voucher_type = ${voucher_type}
        AND vse.stock_item_id = ${item_id}
        AND v.is_cancelled = 0
        AND COALESCE(v.is_optional, 0) = 0
        AND COALESCE(v.is_post_dated, 0) = 0
      GROUP BY v.voucher_id, COALESCE(vse.is_source, 0)
      ORDER BY COALESCE(vse.is_source, 0) ASC, v.date ASC, v.voucher_id ASC
    `);

    const rows = raw.map(r => {
      const isOut = Number(r.is_source) === 1;
      const qty = Number(r.qty) || 0, amt = Number(r.amount) || 0, addl = Number(r.addl) || 0;
      return {
        voucher_id: r.voucher_id, date: r.date, particulars: r.voucher_type,
        voucher_type: r.voucher_type, voucher_number: r.voucher_number,
        inwards_qty:  isOut ? null : qty, inwards_value:  isOut ? null : amt,
        outwards_qty: isOut ? qty : null, outwards_value: isOut ? amt : null,
        addl_cost: addl, closing_qty: 0, closing_value: 0,
      };
    });

    return { success: true, item_name: itemRow.length ? itemRow[0].name : '', rows };
  } catch (err) {
    return { success: false, error: err.message };
  }
};

module.exports = { transferAnalysis, transferItemVouchers };
