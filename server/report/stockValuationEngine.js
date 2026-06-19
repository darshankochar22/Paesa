const { db } = require('../db/index');
const { sql } = require('drizzle-orm');
const { stockItems, voucherStockEntries, vouchers } = require('../db/schema');

const INWARD_TYPES = ['Purchase', 'Receipt Note', 'Rejection In', 'Material In', 'Credit Note'];
const OUTWARD_TYPES = ['Sales', 'Delivery Note', 'Rejection Out', 'Material Out', 'Debit Note'];

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
        const type = entry.voucher_type;
        const qty = Number(entry.quantity) || 0;
        const rate = Number(entry.rate) || 0;
        const isSource = Number(entry.is_source) || 0;

        let isInward = false;
        let isOutward = false;

        if (INWARD_TYPES.includes(type)) {
          isInward = true;
        } else if (OUTWARD_TYPES.includes(type)) {
          isOutward = true;
        } else if (type === 'Stock Journal' || type === 'Manufacturing Journal') {
          if (isSource === 0) isInward = true;
          else isOutward = true;
        }

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
        const type = entry.voucher_type;
        const entryQty = Number(entry.quantity) || 0;
        const entryRate = Number(entry.rate) || 0;
        const entryAmt = Number(entry.amount) || (entryQty * entryRate);
        const isSource = Number(entry.is_source) || 0;

        let isInward = false;
        let isOutward = false;

        if (INWARD_TYPES.includes(type)) {
          isInward = true;
        } else if (OUTWARD_TYPES.includes(type)) {
          isOutward = true;
        } else if (type === 'Stock Journal' || type === 'Manufacturing Journal') {
          if (isSource === 0) isInward = true;
          else isOutward = true;
        }

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

module.exports = {
  calculateClosingStock
};
