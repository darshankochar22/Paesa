const { db } = require('../db/index');
const { sql } = require('drizzle-orm');
const { stockItems, voucherStockEntries, vouchers } = require('../db/schema');
const { registerDirection, trackingBilledSql } = require('./services/stockMovement');

/**
 * Closing stock valuation — TallyPrime "Avg. Cost" model, IDENTICAL to the
 * running valuation in stockRegisterBuilder.buildVoucherRegister so the engine
 * (P&L / Balance Sheet / Stock Summary) and the drill-down registers can never
 * disagree.
 *
 * closing value = closing quantity × pooled average cost, where the cost pool
 * is (opening + every INWARD at its book amount) using registerDirection:
 *   - Purchase / Receipt / Material In / Rejection In / Stock-Journal-in → inward, adds to pool
 *   - Debit Note (purchase return) → NEGATIVE inward, removes from pool at its own amount
 *   - Sales / Delivery / Material Out / Stock-Journal-out → outward, consumes qty at avg cost
 *   - Credit Note (sales return) → NEGATIVE outward, returns qty at avg cost (NOT its note rate)
 * Outwards never change the rate, and there is NO zero-floor: negative stock is
 * still valued at cost (e.g. −63 × ₹30 = −₹1,890), matching Tally — unlike a
 * FIFO/zero-floored average which collapses to 0 or the last voucher's own rate.
 *
 * The `method` arg is retained for signature compatibility; valuation follows
 * Tally's default average cost regardless.
 */
async function calculateClosingStock(company_id, fy_id, as_on_date = null, method = 'Avg. Cost') {
  const items = await db.all(
    sql`SELECT item_id, name, opening_quantity, opening_rate, opening_value
        FROM ${stockItems}
        WHERE company_id = ${company_id} AND is_active = 1`,
  );

  const dateCond = as_on_date ? sql` AND v.date <= ${as_on_date}` : sql``;

  const entries = await db.all(
    sql`SELECT vse.stock_item_id, vse.quantity, vse.rate, vse.amount, vse.is_source,
               v.date, v.voucher_type, v.voucher_id
        FROM ${voucherStockEntries} vse
        INNER JOIN ${vouchers} v ON v.voucher_id = vse.voucher_id
        WHERE v.company_id = ${company_id} AND v.fy_id = ${fy_id} AND v.is_cancelled = 0
          AND COALESCE(v.is_optional, 0) = 0 AND COALESCE(v.is_post_dated, 0) = 0${dateCond}
          AND NOT ${trackingBilledSql('v', 'vse')}
        ORDER BY v.date ASC, v.voucher_id ASC, vse.stock_entry_id ASC`,
  );

  let totalValue = 0;
  const itemValuations = [];

  for (const item of items) {
    const itemId = item.item_id;
    const opQty = Number(item.opening_quantity) || 0;
    const opRate = Number(item.opening_rate) || 0;
    const opValue = Number(item.opening_value) || opQty * opRate;

    const itemEntries = entries.filter((e) => e.stock_item_id === itemId);

    // Pooled weighted-average (see buildVoucherRegister — same math):
    //   runQty  — net physical balance (inwards +, outwards −)
    //   cumInQty/cumInVal — opening + every inward, giving the avg cost rate.
    // Outwards consume qty at that rate but never change it; no zero-floor, so
    // negative stock is still valued at cost.
    let runQty = opQty;
    let cumInQty = opQty;
    let cumInVal = opValue;

    for (const entry of itemEntries) {
      const { dir, sign } = registerDirection(entry.voucher_type, entry.is_source);
      if (!dir) continue;
      const baseQty = Number(entry.quantity) || 0;
      const baseAmt = Number.isFinite(Number(entry.amount))
        ? Number(entry.amount)
        : baseQty * (Number(entry.rate) || 0);
      const qty = baseQty * sign;
      const amt = baseAmt * sign;
      if (dir === 'in') {
        runQty += qty;
        cumInQty += qty;
        cumInVal += amt;
      } else {
        runQty -= qty;
      }
    }

    const avgRate = cumInQty !== 0 ? cumInVal / cumInQty : 0;
    const closingQty = runQty;
    const closingValue = runQty * avgRate;

    totalValue += closingValue;
    itemValuations.push({
      item_id: itemId,
      name: item.name,
      closing_qty: closingQty,
      closing_value: closingValue,
      valuation_method: method,
    });
  }

  return {
    success: true,
    totalValue,
    items: itemValuations,
  };
}

/**
 * Per-godown closing stock at weighted-average COST.
 *
 * Runs a WA state per (godown, item): opening allocations seed it, every
 * stock entry moves it per the shared direction rules (Stock Journal legs go
 * to their own godowns), and outward consumption is valued at average cost —
 * never at the voucher's sales amount.
 *
 * Returns { success, godowns: [{ godown_id, item_count, closing_qty, closing_value }] }
 * (godown_id may be null for entries without a godown).
 */
async function calculateGodownClosing(company_id, fy_id, as_on_date = null) {
  const dateCond = as_on_date ? sql` AND v.date <= ${as_on_date}` : sql``;

  const openings = await db.all(
    sql`SELECT oa.godown_id AS godown_id, oa.item_id AS item_id,
               SUM(COALESCE(oa.quantity, 0)) AS qty, SUM(COALESCE(oa.amount, 0)) AS value
        FROM stock_item_opening_allocations oa
        INNER JOIN ${stockItems} si ON si.item_id = oa.item_id
        WHERE si.company_id = ${company_id} AND si.is_active = 1
        GROUP BY oa.godown_id, oa.item_id`,
  );

  const entries = await db.all(
    sql`SELECT vse.godown_id AS godown_id, vse.stock_item_id AS item_id,
               vse.quantity, vse.amount, vse.is_source, v.voucher_type
        FROM ${voucherStockEntries} vse
        INNER JOIN ${vouchers} v ON v.voucher_id = vse.voucher_id
        WHERE v.company_id = ${company_id} AND v.fy_id = ${fy_id} AND v.is_cancelled = 0
          AND COALESCE(v.is_optional, 0) = 0 AND COALESCE(v.is_post_dated, 0) = 0${dateCond}
          AND NOT ${trackingBilledSql('v', 'vse')}
        ORDER BY v.date ASC, v.voucher_id ASC, vse.stock_entry_id ASC`,
  );

  // Same pooled avg-cost model as calculateClosingStock, per (godown, item):
  //   qty  — net physical balance;  cumInQty/cumInVal — opening + every inward.
  // registerDirection makes Debit Notes NEGATIVE inwards and Credit Notes
  // NEGATIVE outwards, so the pool never absorbs a sale/return at its sell rate.
  // No zero-floor: negative stock is still valued at the pooled cost rate.
  const states = new Map(); // `${godown_id}::${item_id}` -> { godown_id, item_id, qty, cumInQty, cumInVal }
  const stateFor = (godown_id, item_id) => {
    const key = `${godown_id ?? 'null'}::${item_id}`;
    if (!states.has(key))
      states.set(key, { godown_id: godown_id ?? null, item_id, qty: 0, cumInQty: 0, cumInVal: 0 });
    return states.get(key);
  };

  for (const o of openings) {
    const s = stateFor(o.godown_id, o.item_id);
    const q = Number(o.qty) || 0;
    s.qty += q;
    s.cumInQty += q;
    s.cumInVal += Number(o.value) || 0;
  }
  for (const e of entries) {
    const { dir, sign } = registerDirection(e.voucher_type, e.is_source);
    if (!dir) continue;
    const s = stateFor(e.godown_id, e.item_id);
    const qty = (Number(e.quantity) || 0) * sign;
    const amt = (Number(e.amount) || 0) * sign;
    if (dir === 'in') {
      s.qty += qty;
      s.cumInQty += qty;
      s.cumInVal += amt;
    } else {
      s.qty -= qty;
    }
  }

  const byGodown = new Map();
  for (const s of states.values()) {
    const rate = s.cumInQty !== 0 ? s.cumInVal / s.cumInQty : 0;
    const value = s.qty * rate;
    const key = s.godown_id ?? null;
    if (!byGodown.has(key))
      byGodown.set(key, { godown_id: key, item_count: 0, closing_qty: 0, closing_value: 0 });
    const g = byGodown.get(key);
    if (Math.abs(s.qty) > 1e-9 || Math.abs(value) > 1e-9) g.item_count += 1;
    g.closing_qty += s.qty;
    g.closing_value += value;
  }

  return { success: true, godowns: [...byGodown.values()] };
}

module.exports = {
  calculateClosingStock,
  calculateGodownClosing,
};
