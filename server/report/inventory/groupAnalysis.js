const { db } = require('../../db/index');
const { sql } = require('drizzle-orm');
const {
  vouchers,
  stockItems,
  ledgers,
  voucherEntries,
  voucherStockEntries,
  units,
} = require('../../db/schema');
const { entryDirection } = require('../services/stockMovement');
// Party (Group/Ledger) Analysis is a purchase-side vs sales-side view — use the
// canonical document-type lists from reportHelpers rather than a local copy (and
// NOT stockMovement's physical-flow entryDirection, which would put a sales-return
// Credit Note on the purchase side). The per-voucher drill below still uses
// entryDirection for physical goods direction.
const { INWARD_TYPES, OUTWARD_TYPES } = require('../services/reportHelpers');

/**
 * Shared core: per stock-item purchase & sales movement, restricted to vouchers
 * whose accounting entries reference a ledger matching `ledgerFilter`.
 */
const partyMovementAnalysis = async (company_id, fy_id, ledgerFilter) => {
  const rows = await db.all(sql`
    SELECT
      si.item_id,
      si.name      AS item_name,
      u.name       AS unit_name,
      SUM(CASE WHEN v.voucher_type IN (${sql.join(
        INWARD_TYPES.map((t) => sql`${t}`),
        sql`, `,
      )})
               THEN COALESCE(vse.quantity, 0) ELSE 0 END) AS purchase_qty,
      SUM(CASE WHEN v.voucher_type IN (${sql.join(
        INWARD_TYPES.map((t) => sql`${t}`),
        sql`, `,
      )})
               THEN COALESCE(vse.amount, 0)   ELSE 0 END) AS purchase_value,
      SUM(CASE WHEN v.voucher_type IN (${sql.join(
        OUTWARD_TYPES.map((t) => sql`${t}`),
        sql`, `,
      )})
               THEN COALESCE(vse.quantity, 0) ELSE 0 END) AS sales_qty,
      SUM(CASE WHEN v.voucher_type IN (${sql.join(
        OUTWARD_TYPES.map((t) => sql`${t}`),
        sql`, `,
      )})
               THEN COALESCE(vse.amount, 0)   ELSE 0 END) AS sales_value
    FROM ${voucherStockEntries} vse
    INNER JOIN ${vouchers} v ON v.voucher_id = vse.voucher_id
    INNER JOIN ${stockItems} si ON si.item_id = vse.stock_item_id
    LEFT JOIN ${units} u ON u.unit_id = si.unit_id
    WHERE v.company_id = ${company_id}
      AND v.fy_id = ${fy_id}
      AND v.is_cancelled = 0
      AND COALESCE(v.is_optional, 0) = 0
      AND COALESCE(v.is_post_dated, 0) = 0
      AND EXISTS (
        SELECT 1 FROM ${voucherEntries} ve
        INNER JOIN ${ledgers} l ON l.ledger_id = ve.ledger_id
        WHERE ve.voucher_id = v.voucher_id AND ${ledgerFilter}
      )
    GROUP BY si.item_id, si.name, u.name
    HAVING (purchase_qty > 0 OR sales_qty > 0)
    ORDER BY si.name ASC
  `);

  return rows.map((r) => ({
    item_id: r.item_id,
    item_name: r.item_name,
    unit_name: r.unit_name || '',
    purchase_qty: r.purchase_qty || 0,
    purchase_value: r.purchase_value || 0,
    purchase_rate: r.purchase_qty ? r.purchase_value / r.purchase_qty : 0,
    sales_qty: r.sales_qty || 0,
    sales_value: r.sales_value || 0,
    sales_rate: r.sales_qty ? r.sales_value / r.sales_qty : 0,
  }));
};

/** Group Analysis — movement for all items transacted with any ledger in a ledger group. */
const groupAnalysis = async (company_id, fy_id, group_id) => {
  try {
    const items = await partyMovementAnalysis(company_id, fy_id, sql`l.group_id = ${group_id}`);
    return { success: true, items };
  } catch (err) {
    return { success: false, error: err.message };
  }
};

/** Ledger Analysis — movement for all items transacted with a single ledger. */
const ledgerAnalysis = async (company_id, fy_id, ledger_id) => {
  try {
    const items = await partyMovementAnalysis(company_id, fy_id, sql`l.ledger_id = ${ledger_id}`);
    return { success: true, items };
  } catch (err) {
    return { success: false, error: err.message };
  }
};

/**
 * Item Voucher Analysis rows for a single stock item, restricted to vouchers
 * whose accounting entries reference a ledger matching `ledgerFilter` (a ledger
 * group or a single ledger). Each row = one voucher; `particulars` is the
 * matching party ledger; legs carry goods direction (the frontend sections by
 * voucher-type family and nets returns).
 */
const partyItemVouchers = async (company_id, fy_id, ledgerFilter, item_id) => {
  const rows = await db.all(sql`
    SELECT
      v.voucher_id     AS voucher_id,
      v.date           AS date,
      v.voucher_type   AS voucher_type,
      v.voucher_number AS voucher_number,
      iv.qty           AS quantity,
      iv.amount        AS amount,
      iv.addl          AS additional_amount,
      iv.is_source     AS is_source,
      (SELECT l.name FROM ${voucherEntries} ve
         INNER JOIN ${ledgers} l ON l.ledger_id = ve.ledger_id
        WHERE ve.voucher_id = v.voucher_id AND ${ledgerFilter}
        LIMIT 1) AS particulars
    FROM (
      SELECT vse.voucher_id AS voucher_id,
             SUM(COALESCE(vse.quantity, 0))          AS qty,
             SUM(COALESCE(vse.amount, 0))            AS amount,
             SUM(COALESCE(vse.additional_amount, 0)) AS addl,
             MAX(COALESCE(vse.is_source, 0))         AS is_source
      FROM ${voucherStockEntries} vse
      WHERE vse.stock_item_id = ${item_id}
      GROUP BY vse.voucher_id
    ) iv
    INNER JOIN ${vouchers} v ON v.voucher_id = iv.voucher_id
    WHERE v.company_id = ${company_id}
      AND v.fy_id = ${fy_id}
      AND v.is_cancelled = 0
      AND COALESCE(v.is_optional, 0) = 0
      AND COALESCE(v.is_post_dated, 0) = 0
      AND EXISTS (
        SELECT 1 FROM ${voucherEntries} ve
        INNER JOIN ${ledgers} l ON l.ledger_id = ve.ledger_id
        WHERE ve.voucher_id = v.voucher_id AND ${ledgerFilter})
    ORDER BY v.date ASC, v.voucher_id ASC
  `);

  const out = [];
  for (const r of rows) {
    const dir = entryDirection(r.voucher_type, r.is_source);
    if (!dir) continue;
    const qty = Number(r.quantity) || 0,
      amt = Number(r.amount) || 0,
      addl = Number(r.additional_amount) || 0;
    out.push({
      voucher_id: r.voucher_id,
      date: r.date,
      particulars: r.particulars || '',
      voucher_type: r.voucher_type,
      voucher_number: r.voucher_number,
      inwards_qty: dir === 'in' ? qty : null,
      inwards_value: dir === 'in' ? amt : null,
      outwards_qty: dir === 'out' ? qty : null,
      outwards_value: dir === 'out' ? amt : null,
      addl_cost: addl,
      closing_qty: 0,
      closing_value: 0,
    });
  }
  return out;
};

/** Item Voucher Analysis under a ledger group (drill from Group Analysis). */
const groupItemVouchers = async (company_id, fy_id, group_id, item_id) => {
  try {
    const itemRow = await db.all(
      sql`SELECT name FROM ${stockItems} WHERE item_id = ${item_id} AND company_id = ${company_id}`,
    );
    const rows = await partyItemVouchers(company_id, fy_id, sql`l.group_id = ${group_id}`, item_id);
    return { success: true, item_name: itemRow.length ? itemRow[0].name : '', rows };
  } catch (err) {
    return { success: false, error: err.message };
  }
};

/** Item Voucher Analysis under a single ledger (drill from Ledger Analysis). */
const ledgerItemVouchers = async (company_id, fy_id, ledger_id, item_id) => {
  try {
    const itemRow = await db.all(
      sql`SELECT name FROM ${stockItems} WHERE item_id = ${item_id} AND company_id = ${company_id}`,
    );
    const rows = await partyItemVouchers(
      company_id,
      fy_id,
      sql`l.ledger_id = ${ledger_id}`,
      item_id,
    );
    return { success: true, item_name: itemRow.length ? itemRow[0].name : '', rows };
  } catch (err) {
    return { success: false, error: err.message };
  }
};

module.exports = { groupAnalysis, ledgerAnalysis, groupItemVouchers, ledgerItemVouchers };
