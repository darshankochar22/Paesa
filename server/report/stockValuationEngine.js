const { db } = require('../db/index');
const { sql } = require('drizzle-orm');
const { stockItems, voucherStockEntries, vouchers } = require('../db/schema');
const { entryDirection, trackingBilledSql } = require('./services/stockMovement');

async function calculateClosingStock(company_id, fy_id, as_on_date = null, method = 'FIFO') {
  const items = await db.all(
    sql`SELECT item_id, name, opening_quantity, opening_rate, opening_value
        FROM ${stockItems}
        WHERE company_id = ${company_id} AND is_active = 1`
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
        ORDER BY v.date ASC, v.voucher_id ASC, vse.stock_entry_id ASC`
  );

  let totalValue = 0;
  const itemValuations = [];

  for (const item of items) {
    const itemId = item.item_id;
    const opQty = Number(item.opening_quantity) || 0;
    const opRate = Number(item.opening_rate) || 0;
    const opValue = Number(item.opening_value) || (opQty * opRate);

    const itemEntries = entries.filter(e => e.stock_item_id === itemId);

    let closingQty = opQty;
    let closingValue = 0;

    if (method === 'FIFO') {
      const lots = [];
      if (opQty > 0) {
        lots.push({ qty: opQty, rate: opRate });
      }

      for (const entry of itemEntries) {
        const qty = Number(entry.quantity) || 0;
        const rate = Number(entry.rate) || 0;

        const dir = entryDirection(entry.voucher_type, entry.is_source);
        const isInward = dir === 'in';
        const isOutward = dir === 'out';

        if (isInward) {
          lots.push({ qty, rate });
          closingQty += qty;
        } else if (isOutward) {
          let tempQty = qty;
          while (tempQty > 0 && lots.length > 0) {
            const lot = lots[0];
            if (lot.qty <= tempQty) {
              tempQty -= lot.qty;
              lots.shift();
            } else {
              lot.qty -= tempQty;
              tempQty = 0;
            }
          }
          closingQty -= qty;
        }
      }

      closingValue = lots.reduce((sum, lot) => sum + (lot.qty * lot.rate), 0);
      if (closingQty < 0) {
        closingValue = 0; // Negative stock valued at 0
      }
    } else {
      // Weighted Average
      let qty = opQty;
      let value = opValue;
      let avgRate = qty > 0 ? value / qty : 0;

      for (const entry of itemEntries) {
        const entryQty = Number(entry.quantity) || 0;
        const entryRate = Number(entry.rate) || 0;
        const entryAmt = Number(entry.amount) || (entryQty * entryRate);

        const dir = entryDirection(entry.voucher_type, entry.is_source);
        const isInward = dir === 'in';
        const isOutward = dir === 'out';

        if (isInward) {
          qty += entryQty;
          value += entryAmt;
          avgRate = qty > 0 ? value / qty : 0;
        } else if (isOutward) {
          const outValue = entryQty * avgRate;
          qty -= entryQty;
          value -= outValue;
          if (qty <= 0) {
            qty = 0;
            value = 0;
            avgRate = 0;
          }
        }
      }

      closingQty = qty;
      closingValue = value;
    }

    totalValue += closingValue;
    itemValuations.push({
      item_id: itemId,
      name: item.name,
      closing_qty: closingQty,
      closing_value: closingValue,
      valuation_method: method
    });
  }

  return {
    success: true,
    totalValue,
    items: itemValuations
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
        GROUP BY oa.godown_id, oa.item_id`
  );

  const entries = await db.all(
    sql`SELECT vse.godown_id AS godown_id, vse.stock_item_id AS item_id,
               vse.quantity, vse.amount, vse.is_source, v.voucher_type
        FROM ${voucherStockEntries} vse
        INNER JOIN ${vouchers} v ON v.voucher_id = vse.voucher_id
        WHERE v.company_id = ${company_id} AND v.fy_id = ${fy_id} AND v.is_cancelled = 0
          AND COALESCE(v.is_optional, 0) = 0 AND COALESCE(v.is_post_dated, 0) = 0${dateCond}
          AND NOT ${trackingBilledSql('v', 'vse')}
        ORDER BY v.date ASC, v.voucher_id ASC, vse.stock_entry_id ASC`
  );

  const states = new Map(); // `${godown_id}::${item_id}` -> { godown_id, item_id, qty, value }
  const stateFor = (godown_id, item_id) => {
    const key = `${godown_id ?? 'null'}::${item_id}`;
    if (!states.has(key)) states.set(key, { godown_id: godown_id ?? null, item_id, qty: 0, value: 0 });
    return states.get(key);
  };

  for (const o of openings) {
    const s = stateFor(o.godown_id, o.item_id);
    s.qty += Number(o.qty) || 0;
    s.value += Number(o.value) || 0;
  }
  for (const e of entries) {
    const dir = entryDirection(e.voucher_type, e.is_source);
    if (!dir) continue;
    const s = stateFor(e.godown_id, e.item_id);
    const qty = Number(e.quantity) || 0;
    if (dir === 'in') {
      s.qty += qty;
      s.value += Number(e.amount) || 0;
    } else {
      const avgRate = s.qty > 0 ? s.value / s.qty : 0;
      s.qty -= qty;
      s.value -= qty * avgRate;
      if (s.qty <= 0) s.value = 0;
    }
  }

  const byGodown = new Map();
  for (const s of states.values()) {
    const key = s.godown_id ?? null;
    if (!byGodown.has(key)) byGodown.set(key, { godown_id: key, item_count: 0, closing_qty: 0, closing_value: 0 });
    const g = byGodown.get(key);
    if (Math.abs(s.qty) > 1e-9 || Math.abs(s.value) > 1e-9) g.item_count += 1;
    g.closing_qty += s.qty;
    g.closing_value += s.value;
  }

  return { success: true, godowns: [...byGodown.values()] };
}

module.exports = {
  calculateClosingStock,
  calculateGodownClosing
};
