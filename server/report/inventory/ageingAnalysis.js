const { db } = require('../../db/index');
const { sql } = require('drizzle-orm');
const { vouchers, stockItems, voucherStockEntries, units } = require('../../db/schema');

// Voucher types that ADD on-hand stock (a "purchase" lot, aged by its date).
const INWARD  = ['Purchase', 'Receipt Note', 'Rejection In', 'Material In'];
// Voucher types that REMOVE on-hand stock (consumed FIFO, oldest first).
const OUTWARD = ['Sales', 'Delivery Note', 'Rejection Out', 'Material Out'];

// Default ageing band boundaries (in days): <45, 45-90, 90-180, >180.
const DEFAULT_PERIODS = [45, 90, 180];

const PRIMARY_ID = -1; // sentinel: analyse every stock item in the company

const dayDiff = (asAt, d) => {
  if (!d) return Number.MAX_SAFE_INTEGER; // undated lot => oldest
  const a = new Date(`${asAt}T00:00:00`).getTime();
  const b = new Date(`${d}T00:00:00`).getTime();
  if (Number.isNaN(a) || Number.isNaN(b)) return Number.MAX_SAFE_INTEGER;
  return Math.floor((a - b) / 86400000);
};

/**
 * Stock Ageing Analysis — on-hand stock aged by date of purchase (FIFO).
 *
 * For each item we build purchase lots oldest→newest (opening balance, then each
 * inward voucher line), consume the total outward quantity from the oldest lots,
 * and bucket whatever remains by how old each surviving lot is relative to
 * `as_at`. Items whose net on-hand is negative report into the Negative column.
 *
 * @param {number} company_id
 * @param {number} fy_id
 * @param {number} group_id   stock group filter; -1 => Primary (all items)
 * @param {string} as_at      ISO date the stock is aged against (e.g. FY end)
 * @param {string} fy_start   ISO date used to age the opening-balance lot
 * @param {number[]} periods  band boundaries in days (default [45,90,180])
 */
const stockAgeingAnalysis = async (company_id, fy_id, group_id, as_at, fy_start, periods, opts = {}) => {
  try {
    // Job Work variants reuse this engine but age stock built only from
    // Material In/Out transfer lots (no opening balance). `opts.inwardTypes` /
    // `opts.outwardTypes` override which voucher types add/remove a lot, and
    // `opts.includeOpening === false` suppresses the opening-balance lot.
    const inwardTypes  = Array.isArray(opts.inwardTypes)  && opts.inwardTypes.length  ? opts.inwardTypes  : INWARD;
    const outwardTypes = Array.isArray(opts.outwardTypes) && opts.outwardTypes.length ? opts.outwardTypes : OUTWARD;
    const includeOpening = opts.includeOpening !== false;
    const bands = Array.isArray(periods) && periods.length === 3 ? periods : DEFAULT_PERIODS;
    const asAt = as_at || new Date().toISOString().slice(0, 10);
    const openDate = fy_start || null;
    const isPrimary = group_id == null || group_id === PRIMARY_ID;

    // 1. Items in scope (with opening balance).
    const items = await db.all(sql`
      SELECT
        si.item_id                       AS item_id,
        si.name                          AS item_name,
        u.name                           AS unit_name,
        COALESCE(si.opening_quantity, 0) AS opening_qty,
        COALESCE(si.opening_rate, 0)     AS opening_rate
      FROM ${stockItems} si
      LEFT JOIN ${units} u ON u.unit_id = si.unit_id
      WHERE si.company_id = ${company_id} AND si.is_active = 1
        ${isPrimary ? sql`` : sql`AND si.group_id = ${group_id}`}
      ORDER BY si.name ASC
    `);

    if (items.length === 0) return { success: true, rows: [], bands, as_at: asAt };

    // 2. Inward (purchase) lots per item, oldest first.
    const inLots = await db.all(sql`
      SELECT
        vse.stock_item_id AS item_id,
        v.date            AS date,
        COALESCE(vse.quantity, 0) AS qty,
        COALESCE(vse.rate, 0)     AS rate,
        COALESCE(vse.amount, 0)   AS amount
      FROM ${voucherStockEntries} vse
      INNER JOIN ${vouchers} v ON v.voucher_id = vse.voucher_id
      WHERE v.company_id = ${company_id}
        AND v.fy_id = ${fy_id}
        AND v.is_cancelled = 0
        AND COALESCE(v.is_optional, 0) = 0
        AND COALESCE(v.is_post_dated, 0) = 0
        AND v.voucher_type IN (${sql.join(inwardTypes.map(t => sql`${t}`), sql`, `)})
      ORDER BY v.date ASC, vse.stock_entry_id ASC
    `);

    // 3. Total outward quantity per item.
    const outRows = await db.all(sql`
      SELECT
        vse.stock_item_id AS item_id,
        COALESCE(SUM(vse.quantity), 0) AS out_qty
      FROM ${voucherStockEntries} vse
      INNER JOIN ${vouchers} v ON v.voucher_id = vse.voucher_id
      WHERE v.company_id = ${company_id}
        AND v.fy_id = ${fy_id}
        AND v.is_cancelled = 0
        AND COALESCE(v.is_optional, 0) = 0
        AND COALESCE(v.is_post_dated, 0) = 0
        AND v.voucher_type IN (${sql.join(outwardTypes.map(t => sql`${t}`), sql`, `)})
      GROUP BY vse.stock_item_id
    `);

    const lotsByItem = new Map();
    for (const l of inLots) {
      if (!lotsByItem.has(l.item_id)) lotsByItem.set(l.item_id, []);
      lotsByItem.get(l.item_id).push({ qty: l.qty || 0, rate: l.rate || 0, date: l.date });
    }
    const outByItem = new Map(outRows.map(r => [r.item_id, r.out_qty || 0]));

    const bandOf = (age) => {
      if (age < bands[0]) return 0;
      if (age < bands[1]) return 1;
      if (age < bands[2]) return 2;
      return 3;
    };

    const rows = [];
    for (const it of items) {
      // Build lots oldest→newest: opening balance lot, then inward lots.
      const lots = [];
      if (includeOpening && (it.opening_qty || 0) > 0) {
        lots.push({ qty: it.opening_qty, rate: it.opening_rate || 0, date: openDate });
      }
      for (const l of (lotsByItem.get(it.item_id) || [])) lots.push({ ...l });

      const totalIn = lots.reduce((s, l) => s + l.qty, 0);
      const outQty = outByItem.get(it.item_id) || 0;
      const onHand = totalIn - outQty;

      const row = {
        item_id: it.item_id,
        item_name: it.item_name,
        unit_name: it.unit_name || '',
        expiry_date: '',
        total_qty: 0,
        total_value: 0,
        buckets: [
          { qty: 0, value: 0 },
          { qty: 0, value: 0 },
          { qty: 0, value: 0 },
          { qty: 0, value: 0 },
        ],
        neg_qty: 0,
        neg_value: 0,
      };

      if (onHand < 0) {
        // Oversold — entire net goes to the Negative Stock column (unvalued).
        row.neg_qty = onHand;
        row.total_qty = onHand;
      } else if (onHand > 0) {
        // Consume outward qty from the oldest lots first (FIFO).
        let toRemove = outQty;
        for (const lot of lots) {
          if (toRemove <= 0) break;
          const take = Math.min(lot.qty, toRemove);
          lot.qty -= take;
          toRemove -= take;
        }
        // Remaining lots are the on-hand stock — age each surviving lot.
        for (const lot of lots) {
          if (lot.qty <= 0) continue;
          const b = bandOf(dayDiff(asAt, lot.date));
          const value = lot.qty * lot.rate;
          row.buckets[b].qty += lot.qty;
          row.buckets[b].value += value;
          row.total_qty += lot.qty;
          row.total_value += value;
        }
      }

      // Skip items with no on-hand stock (matches Tally's stock-only view).
      if (row.total_qty === 0 && row.neg_qty === 0) continue;
      rows.push(row);
    }

    return { success: true, rows, bands, as_at: asAt };
  } catch (err) {
    return { success: false, error: err.message };
  }
};

module.exports = { stockAgeingAnalysis };
