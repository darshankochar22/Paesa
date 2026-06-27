const { db } = require('../../db/index');
const { sql } = require('drizzle-orm');
const { vouchers, stockItems, voucherStockEntries, units, bomComponents } = require('../../db/schema');

// ── Job Work direction ──────────────────────────────────────────────────────
// 'in'  → Job Work IN: we are the job worker. Principal issues us material
//          (Material In); we return finished goods (Material Out).
// 'out' → Job Work OUT: we outsource. We issue material to a job worker
//          (Material Out); we receive finished goods back (Material In).
const DIR = (direction) => {
  const out = direction === 'out';
  return {
    orderType:   out ? 'Job Work Out Order' : 'Job Work In Order',
    // For an OUT order, "received" = finished goods back = Material In;
    // for an IN order, "delivered" = finished goods out = Material Out.
    fulfilType:  out ? 'Material In' : 'Material Out',
    issueType:   out ? 'Material Out' : 'Material In',
    receiptType: out ? 'Material In' : 'Material Out',
    label:       out ? 'Job Work Out' : 'Job Work In',
  };
};

const ACTIVE = sql`v.is_cancelled = 0 AND COALESCE(v.is_optional, 0) = 0 AND COALESCE(v.is_post_dated, 0) = 0`;

const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;

// Sum stock-entry quantity per item for one voucher type within the FY.
const sumByItem = async (company_id, fy_id, voucher_type) => {
  const rows = await db.all(sql`
    SELECT vse.stock_item_id AS item_id,
           COALESCE(SUM(vse.quantity), 0) AS qty,
           COALESCE(SUM(vse.amount), 0)   AS value
    FROM ${voucherStockEntries} vse
    INNER JOIN ${vouchers} v ON v.voucher_id = vse.voucher_id
    WHERE v.company_id = ${company_id} AND v.fy_id = ${fy_id}
      AND v.voucher_type = ${voucher_type} AND ${ACTIVE}
    GROUP BY vse.stock_item_id
  `);
  const map = new Map();
  for (const r of rows) map.set(r.item_id, { qty: Number(r.qty) || 0, value: Number(r.value) || 0 });
  return map;
};

const itemMeta = async (company_id) => {
  const rows = await db.all(sql`
    SELECT si.item_id AS item_id, si.name AS item_name, u.name AS unit_name
    FROM ${stockItems} si
    LEFT JOIN ${units} u ON u.unit_id = si.unit_id
    WHERE si.company_id = ${company_id}
  `);
  const map = new Map();
  for (const r of rows) map.set(r.item_id, { item_name: r.item_name, unit_name: r.unit_name || '' });
  return map;
};

/**
 * Order Outstandings — Orders. Ordered vs balance quantity per ordered item.
 * Balance = ordered not yet cleared by the matching fulfilment voucher type.
 */
const jobWorkOrders = async (company_id, fy_id, direction = 'in') => {
  try {
    const d = DIR(direction);
    const ordered = await sumByItem(company_id, fy_id, d.orderType);
    const fulfilled = await sumByItem(company_id, fy_id, d.fulfilType);
    const meta = await itemMeta(company_id);
    const items = [];
    for (const [item_id, o] of ordered) {
      const done = fulfilled.get(item_id)?.qty || 0;
      const balance = Math.max(0, o.qty - done);
      const m = meta.get(item_id) || { item_name: `#${item_id}`, unit_name: '' };
      items.push({ item_id, item_name: m.item_name, unit_name: m.unit_name, ordered_qty: round2(o.qty), balance_qty: round2(balance) });
    }
    items.sort((a, b) => a.item_name.localeCompare(b.item_name));
    return { success: true, items, basis: d.label };
  } catch (err) {
    return { success: false, error: err.message };
  }
};

/**
 * Order Outstandings — Components. Expands each ordered item's Bill of Materials;
 * component ordered/balance = parent ordered/balance × per-unit component qty.
 */
const jobWorkComponents = async (company_id, fy_id, direction = 'in') => {
  try {
    const d = DIR(direction);
    const ordered = await sumByItem(company_id, fy_id, d.orderType);
    const fulfilled = await sumByItem(company_id, fy_id, d.fulfilType);
    const meta = await itemMeta(company_id);

    const boms = await db.all(sql`
      SELECT bc.item_id AS parent_id, bc.component_item_id AS component_id, COALESCE(bc.quantity, 0) AS per_qty
      FROM ${bomComponents} bc
      WHERE bc.company_id = ${company_id}
    `);
    const bomByParent = new Map();
    for (const b of boms) {
      if (!bomByParent.has(b.parent_id)) bomByParent.set(b.parent_id, []);
      bomByParent.get(b.parent_id).push({ component_id: b.component_id, per_qty: Number(b.per_qty) || 0 });
    }

    const agg = new Map(); // component_id → { ordered, balance }
    for (const [parent_id, o] of ordered) {
      const done = fulfilled.get(parent_id)?.qty || 0;
      const parentBal = Math.max(0, o.qty - done);
      for (const c of (bomByParent.get(parent_id) || [])) {
        const cur = agg.get(c.component_id) || { ordered: 0, balance: 0 };
        cur.ordered += o.qty * c.per_qty;
        cur.balance += parentBal * c.per_qty;
        agg.set(c.component_id, cur);
      }
    }

    const items = [];
    for (const [item_id, v] of agg) {
      const m = meta.get(item_id) || { item_name: `#${item_id}`, unit_name: '' };
      items.push({ item_id, item_name: m.item_name, unit_name: m.unit_name, ordered_qty: round2(v.ordered), balance_qty: round2(v.balance) });
    }
    items.sort((a, b) => a.item_name.localeCompare(b.item_name));
    return { success: true, items, basis: d.label };
  } catch (err) {
    return { success: false, error: err.message };
  }
};

/**
 * Order register voucher drill — Job Work In/Out Orders Book.
 * One row per order voucher with its order reference and order value.
 */
const jobWorkOrderVouchers = async (company_id, fy_id, voucher_type, from_date, to_date) => {
  try {
    const dateFrom = from_date ? sql` AND v.date >= ${from_date}` : sql``;
    const dateTo   = to_date   ? sql` AND v.date <= ${to_date}`   : sql``;
    const rows = await db.all(sql`
      SELECT v.voucher_id AS voucher_id,
             v.date AS date,
             COALESCE(v.party_name, v.narration, '') AS particulars,
             v.voucher_type AS voucher_type,
             v.voucher_number AS voucher_number,
             COALESCE(v.reference_number, '') AS order_ref,
             COALESCE(SUM(vse.amount), 0) AS order_amount
      FROM ${vouchers} v
      LEFT JOIN ${voucherStockEntries} vse ON vse.voucher_id = v.voucher_id
      WHERE v.company_id = ${company_id} AND v.fy_id = ${fy_id}
        AND v.voucher_type = ${voucher_type} AND ${ACTIVE}
        ${dateFrom}${dateTo}
      GROUP BY v.voucher_id
      ORDER BY v.date ASC, v.voucher_id ASC
    `);
    return {
      success: true,
      rows: rows.map(r => ({
        voucher_id: r.voucher_id, date: r.date, particulars: r.particulars,
        voucher_type: r.voucher_type, voucher_number: r.voucher_number,
        order_ref: r.order_ref, order_amount: round2(r.order_amount),
      })),
    };
  } catch (err) {
    return { success: false, error: err.message };
  }
};

/**
 * Stock — From Party / With Job Worker. Closing balance of material that has
 * moved under job work but not yet returned.
 *   from-party        → Material In  − Material Out (held by us, owned by party)
 *   with-job-worker   → Material Out − Material In  (sent out, held by worker)
 */
const jobWorkStock = async (company_id, fy_id, mode = 'from-party') => {
  try {
    const matIn  = await sumByItem(company_id, fy_id, 'Material In');
    const matOut = await sumByItem(company_id, fy_id, 'Material Out');
    const meta = await itemMeta(company_id);
    const ids = new Set([...matIn.keys(), ...matOut.keys()]);
    const fromParty = mode !== 'with-job-worker';

    const items = [];
    for (const item_id of ids) {
      const a = matIn.get(item_id) || { qty: 0, value: 0 };
      const b = matOut.get(item_id) || { qty: 0, value: 0 };
      const qty   = fromParty ? a.qty - b.qty   : b.qty - a.qty;
      const value = fromParty ? a.value - b.value : b.value - a.value;
      if (round2(qty) === 0 && round2(value) === 0) continue;
      const m = meta.get(item_id) || { item_name: `#${item_id}`, unit_name: '' };
      items.push({
        item_id, item_name: m.item_name, unit_name: m.unit_name,
        qty: round2(qty), rate: qty ? round2(value / qty) : 0, value: round2(value),
      });
    }
    items.sort((a, b) => a.item_name.localeCompare(b.item_name));
    return { success: true, items };
  } catch (err) {
    return { success: false, error: err.message };
  }
};

/**
 * Variance Analysis — Issue / Receipt.
 *   issue   → component ordered (via BOM) vs material actually issued
 *   receipt → parent ordered vs finished goods actually received
 */
const jobWorkVariance = async (company_id, fy_id, kind = 'issue', direction = 'in') => {
  try {
    const d = DIR(direction);
    const ordered = await sumByItem(company_id, fy_id, d.orderType);
    const meta = await itemMeta(company_id);
    const isIssue = kind !== 'receipt';

    let expected; // Map item_id → ordered qty
    if (isIssue) {
      const boms = await db.all(sql`
        SELECT bc.item_id AS parent_id, bc.component_item_id AS component_id, COALESCE(bc.quantity, 0) AS per_qty
        FROM ${bomComponents} bc WHERE bc.company_id = ${company_id}
      `);
      expected = new Map();
      for (const b of boms) {
        const parentQty = ordered.get(b.parent_id)?.qty || 0;
        if (!parentQty) continue;
        expected.set(b.component_id, (expected.get(b.component_id) || 0) + parentQty * (Number(b.per_qty) || 0));
      }
    } else {
      expected = new Map([...ordered].map(([id, v]) => [id, v.qty]));
    }

    const actualMap = await sumByItem(company_id, fy_id, isIssue ? d.issueType : d.receiptType);
    const ids = new Set([...expected.keys(), ...actualMap.keys()]);

    const items = [];
    for (const item_id of ids) {
      const orderedQty = expected.get(item_id) || 0;
      const actualQty = actualMap.get(item_id)?.qty || 0;
      const variance = orderedQty - actualQty;
      if (round2(orderedQty) === 0 && round2(actualQty) === 0) continue;
      const m = meta.get(item_id) || { item_name: `#${item_id}`, unit_name: '' };
      items.push({
        item_id, item_name: m.item_name, unit_name: m.unit_name,
        ordered_qty: round2(orderedQty), actual_qty: round2(actualQty),
        variance_qty: round2(variance),
        variance_pct: orderedQty ? round2((variance / orderedQty) * 100) : 0,
      });
    }
    items.sort((a, b) => a.item_name.localeCompare(b.item_name));
    return { success: true, items, basis: d.label };
  } catch (err) {
    return { success: false, error: err.message };
  }
};

/**
 * Jobwork Annexure IV / V — excise challan register for an excise (tax) unit.
 * IV → goods sent for job work (Material Out); V → goods received (Material In).
 */
const jobWorkAnnexure = async (company_id, fy_id, annexure = 'IV', excise_unit_id) => {
  try {
    const voucherType = String(annexure).toUpperCase() === 'V' ? 'Material In' : 'Material Out';
    const rows = await db.all(sql`
      SELECT v.voucher_id AS voucher_id,
             v.date AS date,
             v.voucher_number AS voucher_number,
             COALESCE(v.party_name, '') AS party,
             si.name AS item_name,
             COALESCE(u.name, '') AS unit_name,
             COALESCE(vse.quantity, 0) AS quantity,
             COALESCE(vse.amount, 0) AS amount
      FROM ${vouchers} v
      INNER JOIN ${voucherStockEntries} vse ON vse.voucher_id = v.voucher_id
      INNER JOIN ${stockItems} si ON si.item_id = vse.stock_item_id
      LEFT JOIN ${units} u ON u.unit_id = si.unit_id
      WHERE v.company_id = ${company_id} AND v.fy_id = ${fy_id}
        AND v.voucher_type = ${voucherType} AND ${ACTIVE}
      ORDER BY v.date ASC, v.voucher_id ASC
    `);
    return {
      success: true,
      annexure: String(annexure).toUpperCase(),
      rows: rows.map(r => ({
        voucher_id: r.voucher_id, date: r.date, voucher_number: r.voucher_number,
        party: r.party, item_name: r.item_name, unit_name: r.unit_name,
        quantity: round2(r.quantity), amount: round2(r.amount),
      })),
    };
  } catch (err) {
    return { success: false, error: err.message };
  }
};

module.exports = {
  jobWorkOrders,
  jobWorkComponents,
  jobWorkOrderVouchers,
  jobWorkStock,
  jobWorkVariance,
  jobWorkAnnexure,
};
