const { db } = require('../db/index');
const { sql } = require('drizzle-orm');
const { godowns, voucherStockEntries, vouchers, stockItems } = require('../db/schema');

const INWARD_TYPES = ['Purchase', 'Receipt Note', 'Rejection In', 'Material In'];
const OUTWARD_TYPES = ['Sales', 'Delivery Note', 'Rejection Out', 'Material Out'];

module.exports = {
  godownSummary: async (company_id, fy_id, as_on_date) => {
    try {
      const dateCond = as_on_date ? sql` AND v.date <= ${as_on_date}` : sql``;
      const rows = await db.all(
        sql`SELECT
              g.godown_id,
              COALESCE(g.name, 'Main Location') AS godown_name,
              COUNT(DISTINCT vse.stock_item_id) AS item_count,
              SUM(CASE WHEN v.voucher_type IN (${sql.join(INWARD_TYPES.map(t => sql`${t}`), sql`, `)}) THEN vse.amount ELSE 0 END) -
              SUM(CASE WHEN v.voucher_type IN (${sql.join(OUTWARD_TYPES.map(t => sql`${t}`), sql`, `)}) THEN vse.amount ELSE 0 END) AS value
            FROM ${voucherStockEntries} vse
            INNER JOIN ${vouchers} v ON v.voucher_id = vse.voucher_id
            LEFT JOIN ${godowns} g ON g.godown_id = vse.godown_id
            WHERE v.company_id = ${company_id} AND v.fy_id = ${fy_id} AND v.is_cancelled = 0
              AND COALESCE(v.is_optional, 0) = 0 AND COALESCE(v.is_post_dated, 0) = 0${dateCond}
            GROUP BY g.godown_id, g.name
            ORDER BY godown_name ASC`
      );
      return { success: true, rows };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  stockAgeing: async (company_id, fy_id, as_on_date) => {
    try {
      // Simplified Ageing Analysis based on last inwards
      const dateCond = as_on_date ? sql` AND v.date <= ${as_on_date}` : sql``;
      
      const rows = await db.all(
        sql`SELECT
              si.item_id,
              si.name AS item_name,
              SUM(CASE WHEN v.voucher_type IN (${sql.join(INWARD_TYPES.map(t => sql`${t}`), sql`, `)}) THEN vse.amount ELSE 0 END) -
              SUM(CASE WHEN v.voucher_type IN (${sql.join(OUTWARD_TYPES.map(t => sql`${t}`), sql`, `)}) THEN vse.amount ELSE 0 END) AS value,
              SUM(CASE WHEN (julianday('now') - julianday(v.date)) <= 30 AND v.voucher_type IN (${sql.join(INWARD_TYPES.map(t => sql`${t}`), sql`, `)}) THEN vse.amount ELSE 0 END) AS days30,
              SUM(CASE WHEN (julianday('now') - julianday(v.date)) > 30 AND (julianday('now') - julianday(v.date)) <= 60 AND v.voucher_type IN (${sql.join(INWARD_TYPES.map(t => sql`${t}`), sql`, `)}) THEN vse.amount ELSE 0 END) AS days60,
              SUM(CASE WHEN (julianday('now') - julianday(v.date)) > 60 AND v.voucher_type IN (${sql.join(INWARD_TYPES.map(t => sql`${t}`), sql`, `)}) THEN vse.amount ELSE 0 END) AS daysOver
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
              SUM(CASE WHEN v.voucher_type IN (${sql.join(INWARD_TYPES.map(t => sql`${t}`), sql`, `)}) THEN vse.quantity ELSE 0 END) AS in_qty,
              SUM(CASE WHEN v.voucher_type IN (${sql.join(OUTWARD_TYPES.map(t => sql`${t}`), sql`, `)}) THEN vse.quantity ELSE 0 END) AS out_qty
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

  reorderStatus: async (company_id, fy_id) => {
    try {
      const rows = await db.all(
        sql`SELECT
              si.name AS item_name,
              COALESCE(si.opening_quantity, 0) +
              COALESCE((SELECT SUM(vse.quantity) FROM ${voucherStockEntries} vse JOIN ${vouchers} v ON v.voucher_id = vse.voucher_id WHERE vse.stock_item_id = si.item_id AND v.voucher_type IN (${sql.join(INWARD_TYPES.map(t => sql`${t}`), sql`, `)})), 0) -
              COALESCE((SELECT SUM(vse.quantity) FROM ${voucherStockEntries} vse JOIN ${vouchers} v ON v.voucher_id = vse.voucher_id WHERE vse.stock_item_id = si.item_id AND v.voucher_type IN (${sql.join(OUTWARD_TYPES.map(t => sql`${t}`), sql`, `)})), 0) AS closing,
              25 AS level,
              0 AS shortage
            FROM ${stockItems} si
            WHERE si.company_id = ${company_id} AND si.is_active = 1`
      );
      const processed = rows.map(r => {
        const shortage = r.closing < r.level ? r.level - r.closing : 0;
        return {
          ...r,
          closing: r.closing + " Pcs",
          level: r.level + " Pcs",
          shortage: shortage + " Pcs"
        };
      });
      return { success: true, rows: processed };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  orderOutstanding: async (company_id, fy_id, type) => {
    try {
      const targetType = type === 'sales' ? 'Sales Order' : 'Purchase Order';
      const rows = await db.all(
        sql`SELECT
              v.date,
              v.voucher_number AS ref_no,
              v.party_name,
              SUM(vse.amount) AS value
            FROM ${vouchers} v
            LEFT JOIN ${voucherStockEntries} vse ON vse.voucher_id = v.voucher_id
            WHERE v.company_id = ${company_id} AND v.fy_id = ${fy_id}
              AND v.voucher_type = ${targetType} AND v.is_cancelled = 0
            GROUP BY v.voucher_id
            ORDER BY v.date DESC`
      );
      return { success: true, rows };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }
};
