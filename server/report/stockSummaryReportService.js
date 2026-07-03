const { db } = require('../db/index');
const { sql } = require('drizzle-orm');
const { stockItems, stockGroups, voucherStockEntries, vouchers, units } = require('../db/schema');
const { calculateClosingStock } = require('./stockValuationEngine');
const {
  entryDirection, inwardCondSql, outwardCondSql, trackingBilledSql, newWAState, applyWA,
} = require('./services/stockMovement');

// Shared row-builder for the voucher registers (Stock Item Vouchers / Godown
// Vouchers). `entries` must be chronological rows of
// { voucher_id, date, particulars, voucher_type, voucher_number, quantity, amount, is_source }.
// Entries before from_date roll into the weighted-average opening state; the
// rest group into one row per voucher with PER-ENTRY direction (so a Stock
// Journal shows its inward and outward legs instead of everything-as-outward),
// and the running closing value consumes outward stock at weighted-average
// COST — never at the voucher's sales value. In/out columns keep book values.
const buildVoucherRegister = (entries, wa, from_date, to_date, includeOpeningRow) => {
  for (const e of entries) {
    if (!from_date || !e.date || e.date >= from_date) continue;
    const dir = entryDirection(e.voucher_type, e.is_source);
    if (dir) applyWA(wa, dir, e.quantity, e.amount);
  }
  const openingQty = wa.qty;
  const openingValue = wa.value;

  const rows = [];
  if (includeOpeningRow && (openingQty !== 0 || openingValue !== 0)) {
    rows.push({
      voucher_id: null, date: from_date || null, particulars: 'Opening Balance',
      voucher_type: '', voucher_number: '',
      inwards_qty: openingQty, inwards_value: openingValue,
      outwards_qty: null, outwards_value: null,
      addl_cost: 0,
      closing_qty: openingQty, closing_value: openingValue,
    });
  }

  let current = null;
  const flush = () => { if (current) { rows.push(current); current = null; } };
  for (const e of entries) {
    if (from_date && e.date && e.date < from_date) continue;
    if (to_date && e.date && e.date > to_date) continue;
    const dir = entryDirection(e.voucher_type, e.is_source);
    if (!dir) continue;
    if (!current || current.voucher_id !== e.voucher_id) {
      flush();
      current = {
        voucher_id: e.voucher_id, date: e.date, particulars: e.particulars,
        voucher_type: e.voucher_type, voucher_number: e.voucher_number,
        inwards_qty: null, inwards_value: null,
        outwards_qty: null, outwards_value: null,
        addl_cost: 0,
        closing_qty: wa.qty, closing_value: wa.value,
      };
    }
    const qty = Number(e.quantity) || 0;
    const amt = Number(e.amount) || 0;
    current.addl_cost += Number(e.additional_amount) || 0;
    if (dir === 'in') {
      current.inwards_qty = (current.inwards_qty || 0) + qty;
      current.inwards_value = (current.inwards_value || 0) + amt;
    } else {
      current.outwards_qty = (current.outwards_qty || 0) + qty;
      current.outwards_value = (current.outwards_value || 0) + amt;
    }
    applyWA(wa, dir, qty, amt);
    current.closing_qty = wa.qty;
    current.closing_value = wa.value;
  }
  flush();
  return { openingQty, openingValue, rows };
};

module.exports = {

  stockGroupItems: async (company_id, fy_id, group_id) => {
    try {
      const rows = await db.all(
        sql`SELECT
              si.item_id        AS item_id,
              si.name           AS item_name,
              sg.name           AS group_name,
              u.name            AS unit_name
            FROM ${stockItems} si
            LEFT JOIN ${stockGroups} sg ON sg.sg_id = si.group_id
            LEFT JOIN ${units} u ON u.unit_id = si.unit_id
            WHERE si.company_id = ${company_id}
              AND si.is_active = 1
              AND si.group_id = ${group_id}
            ORDER BY si.name ASC`
      );

      // Closing qty/value from the shared valuation engine — the same source
      // Stock Summary uses, so the group drill always matches the summary.
      const valuation = await calculateClosingStock(company_id, fy_id, null, 'FIFO');
      const valMap = new Map((valuation.items || []).map(v => [v.item_id, v]));

      const items = rows.map(r => {
        const v = valMap.get(r.item_id) || { closing_qty: 0, closing_value: 0 };
        const closing_qty = v.closing_qty || 0;
        const closing_value = v.closing_value || 0;
        return {
          item_id: r.item_id,
          item_name: r.item_name,
          group_name: r.group_name || 'Ungrouped',
          unit_name: r.unit_name || '',
          closing_qty,
          closing_value,
          rate: closing_qty !== 0 ? closing_value / closing_qty : 0,
        };
      });

      const totalClosingQty   = items.reduce((s, it) => s + it.closing_qty,   0);
      const totalClosingValue = items.reduce((s, it) => s + it.closing_value, 0);

      return { success: true, items, totalClosingQty, totalClosingValue };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },


  // Closing stock per item for a single stock category (Stock Category Summary).
  stockCategoryItems: async (company_id, fy_id, category_id) => {
    try {
      const rows = await db.all(
        sql`SELECT
              si.item_id        AS item_id,
              si.name           AS item_name,
              u.name            AS unit_name
            FROM ${stockItems} si
            LEFT JOIN ${units} u ON u.unit_id = si.unit_id
            WHERE si.company_id = ${company_id}
              AND si.is_active = 1
              AND si.category_id = ${category_id}
            ORDER BY si.name ASC`
      );

      // Same engine as Stock Summary — category drill matches the summary.
      const valuation = await calculateClosingStock(company_id, fy_id, null, 'FIFO');
      const valMap = new Map((valuation.items || []).map(v => [v.item_id, v]));

      const items = rows.map(r => {
        const v = valMap.get(r.item_id) || { closing_qty: 0, closing_value: 0 };
        const closing_qty = v.closing_qty || 0;
        const closing_value = v.closing_value || 0;
        return {
          item_id: r.item_id,
          item_name: r.item_name,
          unit_name: r.unit_name || '',
          closing_qty,
          closing_value,
          rate: closing_qty !== 0 ? closing_value / closing_qty : 0,
        };
      });
      const totalClosingQty   = items.reduce((s, it) => s + it.closing_qty,   0);
      const totalClosingValue = items.reduce((s, it) => s + it.closing_value, 0);
      return { success: true, items, totalClosingQty, totalClosingValue };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  stockItemMonthly: async (company_id, fy_id, item_id) => {
    try {
      // Fetch financial year boundaries
      const fyRows = await db.all(sql`SELECT * FROM financial_years WHERE fy_id = ${fy_id}`);
      if (fyRows.length === 0) return { success: false, error: 'Financial year not found' };
      const fy = fyRows[0];
      const startYear = new Date(fy.start_date).getFullYear();

      // Fetch item meta (opening balance)
      const itemRows = await db.all(
        sql`SELECT item_id, name, opening_quantity, opening_value FROM ${stockItems}
            WHERE item_id = ${item_id} AND company_id = ${company_id}`
      );
      if (itemRows.length === 0) return { success: false, error: 'Stock item not found' };
      const item = itemRows[0];

      // All stock entries for this item in this FY, chronological (order
      // matters for the running weighted-average cost below).
      const entries = await db.all(
        sql`SELECT v.date, v.voucher_type, vse.quantity, vse.amount, vse.is_source
            FROM ${voucherStockEntries} vse
            INNER JOIN ${vouchers} v ON v.voucher_id = vse.voucher_id
            WHERE v.company_id = ${company_id}
              AND v.fy_id = ${fy_id}
              AND v.is_cancelled = 0
              AND COALESCE(v.is_optional, 0) = 0
              AND COALESCE(v.is_post_dated, 0) = 0
              AND vse.stock_item_id = ${item_id}
            ORDER BY v.date ASC, v.voucher_id ASC, vse.stock_entry_id ASC`
      );

      // Build 12 months Apr → Mar. Inwards/Outwards columns show BOOK values
      // (what the vouchers say — sales at sale price); the running closing
      // value consumes outward stock at weighted-average COST so the closing
      // column is a true inventory value, never cost-minus-revenue.
      const MONTH_NAMES = ['April','May','June','July','August','September','October','November','December','January','February','March'];
      const wa = newWAState(item.opening_quantity || 0, item.opening_value || 0);

      const months = MONTH_NAMES.map((name, idx) => {
        let m = idx + 4;
        let y = startYear;
        if (m > 12) { m -= 12; y = startYear + 1; }
        const prefix = `${y}-${String(m).padStart(2, '0')}`;

        let in_qty = 0, in_value = 0, out_qty = 0, out_value = 0;
        for (const e of entries) {
          if (!e.date || !e.date.startsWith(prefix)) continue;
          const dir = entryDirection(e.voucher_type, e.is_source);
          if (dir === 'in') {
            in_qty += Number(e.quantity) || 0;
            in_value += Number(e.amount) || 0;
          } else if (dir === 'out') {
            out_qty += Number(e.quantity) || 0;
            out_value += Number(e.amount) || 0;
          } else {
            continue;
          }
          applyWA(wa, dir, e.quantity, e.amount);
        }

        return {
          month: name,
          in_qty, in_value,
          out_qty, out_value,
          closing_qty: wa.qty,
          closing_value: wa.value,
        };
      });

      return {
        success: true,
        item_name: item.name,
        opening_qty: item.opening_quantity || 0,
        opening_value: item.opening_value  || 0,
        months,
      };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  // Stock items that maintain batches (Level-1 "List of Items" for the Batch
  // report). An item qualifies if it is flagged "Maintain in batches" OR it has
  // any batch allocation (transactional or opening). Matches TallyPrime, which
  // only lists batch-bearing items here.
  batchItems: async (company_id) => {
    try {
      const { voucherBatches, stockItemOpeningAllocations } = require('../db/schema');
      const rows = await db.all(
        sql`SELECT si.item_id AS item_id, si.name AS name, si.alias AS alias
            FROM ${stockItems} si
            WHERE si.company_id = ${company_id}
              AND COALESCE(si.is_active, 1) = 1
              AND (
                COALESCE(si.track_batches, 0) = 1
                OR EXISTS (
                  SELECT 1 FROM ${voucherBatches} vb
                  INNER JOIN ${voucherStockEntries} vse ON vse.stock_entry_id = vb.stock_entry_id
                  INNER JOIN ${vouchers} v ON v.voucher_id = vb.voucher_id
                  WHERE vse.stock_item_id = si.item_id
                    AND v.company_id = ${company_id}
                    AND v.is_cancelled = 0
                )
                OR EXISTS (
                  SELECT 1 FROM ${stockItemOpeningAllocations} oa
                  WHERE oa.item_id = si.item_id
                    AND oa.batch_number IS NOT NULL AND oa.batch_number <> ''
                )
              )
            ORDER BY si.name ASC`
      );
      return { success: true, items: rows };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  // Active batches for a stock item with their on-hand balance — feeds the
  // "List of Active Batches" (Name | Expiry | Balance) shown while allocating a
  // batch during voucher entry (img 27). Balance = inwards − outwards (+ opening).
  batchBalances: async (company_id, item_id) => {
    try {
      const { voucherBatches, stockItemOpeningAllocations } = require('../db/schema');
      const txRows = await db.all(
        sql`SELECT COALESCE(vb.batch_number, 'Primary Batch') AS name,
                   MAX(vb.mfg_date)    AS mfg_date,
                   MAX(vb.expiry_date) AS expiry_date,
                   SUM(CASE WHEN ${inwardCondSql('v', 'vse')} THEN COALESCE(vb.quantity, 0)
                            WHEN ${outwardCondSql('v', 'vse')} THEN -COALESCE(vb.quantity, 0)
                            ELSE 0 END) AS balance
            FROM ${voucherBatches} vb
            INNER JOIN ${voucherStockEntries} vse ON vse.stock_entry_id = vb.stock_entry_id
            INNER JOIN ${vouchers} v ON v.voucher_id = vb.voucher_id
            WHERE v.company_id = ${company_id}
              AND vse.stock_item_id = ${item_id}
              AND v.is_cancelled = 0
              AND COALESCE(v.is_optional, 0) = 0
              AND COALESCE(v.is_post_dated, 0) = 0
            GROUP BY name`
      );
      const openRows = await db.all(
        sql`SELECT COALESCE(oa.batch_number, 'Primary Batch') AS name,
                   MAX(oa.mfg_date)    AS mfg_date,
                   MAX(oa.expiry_date) AS expiry_date,
                   SUM(COALESCE(oa.quantity, 0)) AS balance
            FROM ${stockItemOpeningAllocations} oa
            WHERE oa.item_id = ${item_id}
              AND oa.batch_number IS NOT NULL AND oa.batch_number <> ''
            GROUP BY name`
      );
      const byName = new Map();
      for (const r of [...openRows, ...txRows]) {
        const prev = byName.get(r.name) || { name: r.name, mfg_date: null, expiry_date: null, balance: 0 };
        byName.set(r.name, {
          name: r.name,
          mfg_date: r.mfg_date ?? prev.mfg_date,
          expiry_date: r.expiry_date ?? prev.expiry_date,
          balance: (Number(prev.balance) || 0) + (Number(r.balance) || 0),
        });
      }
      const batches = [...byName.values()].sort((a, b) => a.name.localeCompare(b.name));
      return { success: true, batches };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  // Voucher-level order numbers of Purchase/Sales Orders carrying an item (the
  // "Order no." typed on the order voucher's header). Quantities and rates come
  // from the order's stock lines, godown/due-on from its batch rows. Shared by
  // the Tracking No. and Order No. lists — Tally offers the pending order number
  // in both on the follow-up voucher's Stock Item Allocations.
  _orderNosForItem: async (company_id, item_id) => {
    const { voucherOrderDetails, voucherBatches } = require('../db/schema');
    const vodRows = await db.all(
      sql`SELECT vod.order_nos AS name,
                 MAX(g.name)   AS godown,
                 MAX(v.date)   AS order_date,
                 MAX(vse.rate) AS rate,
                 SUM(COALESCE(vse.quantity, 0)) AS balance
          FROM ${vouchers} v
          INNER JOIN ${voucherOrderDetails} vod ON vod.voucher_id = v.voucher_id
          INNER JOIN ${voucherStockEntries} vse ON vse.voucher_id = v.voucher_id
          LEFT JOIN godowns g ON g.godown_id = vse.godown_id
          WHERE v.company_id = ${company_id}
            AND vse.stock_item_id = ${item_id}
            AND v.voucher_type IN ('Purchase Order', 'Sales Order')
            AND vod.order_nos IS NOT NULL AND vod.order_nos <> ''
            AND v.is_cancelled = 0
            AND COALESCE(v.is_optional, 0) = 0
          GROUP BY vod.order_nos`
    );
    const vodBatchRows = await db.all(
      sql`SELECT vod.order_nos AS name,
                 MAX(vb.godown) AS godown,
                 MAX(vb.due_on) AS due_on,
                 MAX(vb.rate)   AS rate
          FROM ${vouchers} v
          INNER JOIN ${voucherOrderDetails} vod ON vod.voucher_id = v.voucher_id
          INNER JOIN ${voucherStockEntries} vse ON vse.voucher_id = v.voucher_id
          INNER JOIN ${voucherBatches} vb ON vb.stock_entry_id = vse.stock_entry_id
          WHERE v.company_id = ${company_id}
            AND vse.stock_item_id = ${item_id}
            AND v.voucher_type IN ('Purchase Order', 'Sales Order')
            AND vod.order_nos IS NOT NULL AND vod.order_nos <> ''
            AND v.is_cancelled = 0
            AND COALESCE(v.is_optional, 0) = 0
          GROUP BY vod.order_nos`
    );
    const vodBatch = new Map(vodBatchRows.map((r) => [r.name, r]));
    // Net off what has already been received/billed against each order — the
    // pending balance is ordered minus fulfilled (Tally's order outstanding).
    const consumedRows = await db.all(
      sql`SELECT vb.order_no AS name,
                 SUM(COALESCE(vb.quantity, 0)) AS qty
          FROM ${voucherBatches} vb
          INNER JOIN ${voucherStockEntries} vse ON vse.stock_entry_id = vb.stock_entry_id
          INNER JOIN ${vouchers} v ON v.voucher_id = vb.voucher_id
          WHERE v.company_id = ${company_id}
            AND vse.stock_item_id = ${item_id}
            AND vb.order_no IS NOT NULL AND vb.order_no <> ''
            AND v.voucher_type IN ('Receipt Note', 'Delivery Note', 'Purchase', 'Sales')
            AND v.is_cancelled = 0
            AND COALESCE(v.is_optional, 0) = 0
          GROUP BY vb.order_no`
    );
    const consumed = new Map(consumedRows.map((r) => [r.name, Number(r.qty) || 0]));
    // Balance may be <= 0 for fully-fulfilled orders — callers filter, but need
    // the full name list so a settled order doesn't resurface via batch rows.
    return vodRows.map((r) => {
      const b = vodBatch.get(r.name);
      return {
        name: r.name,
        batch: null,
        godown: b?.godown ?? r.godown ?? null,
        date: r.order_date ?? null,
        due_on: b?.due_on ?? r.order_date ?? null,
        rate: Number(b?.rate ?? r.rate) || 0,
        balance: (Number(r.balance) || 0) - (consumed.get(r.name) || 0),
      };
    });
  },

  // Distinct tracking numbers used for an item (TallyPrime "List of Tracking
  // Numbers" in the Stock Item Allocations sub-screen). Balance = total tracked
  // quantity so far; godown/date/rate are the most recent values seen.
  trackingNumbers: async (company_id, item_id) => {
    try {
      const { voucherBatches } = require('../db/schema');
      // Base: quantities booked on Receipt/Delivery Notes under each tracking
      // number. Consumers (invoices / rejections billed against the number)
      // are netted off below — the list shows PENDING balances (Tally).
      const rows = await db.all(
        sql`SELECT vb.tracking_no      AS name,
                   MAX(vb.batch_number) AS batch,
                   MAX(vb.godown)      AS godown,
                   MAX(v.date)         AS date,
                   MAX(vb.rate)        AS rate,
                   SUM(COALESCE(vb.quantity, 0)) AS balance
            FROM ${voucherBatches} vb
            INNER JOIN ${voucherStockEntries} vse ON vse.stock_entry_id = vb.stock_entry_id
            INNER JOIN ${vouchers} v ON v.voucher_id = vb.voucher_id
            WHERE v.company_id = ${company_id}
              AND vse.stock_item_id = ${item_id}
              AND vb.tracking_no IS NOT NULL AND vb.tracking_no <> ''
              AND v.voucher_type IN ('Receipt Note', 'Delivery Note')
              AND v.is_cancelled = 0
              AND COALESCE(v.is_optional, 0) = 0
              AND COALESCE(v.is_post_dated, 0) = 0
            GROUP BY vb.tracking_no
            ORDER BY vb.tracking_no`
      );
      // Quantities already settled against each tracking number by follow-up
      // vouchers (invoice or rejection of the received goods).
      const consumedRows = await db.all(
        sql`SELECT vb.tracking_no AS name,
                   SUM(COALESCE(vb.quantity, 0)) AS qty
            FROM ${voucherBatches} vb
            INNER JOIN ${voucherStockEntries} vse ON vse.stock_entry_id = vb.stock_entry_id
            INNER JOIN ${vouchers} v ON v.voucher_id = vb.voucher_id
            WHERE v.company_id = ${company_id}
              AND vse.stock_item_id = ${item_id}
              AND vb.tracking_no IS NOT NULL AND vb.tracking_no <> ''
              AND v.voucher_type IN ('Purchase', 'Sales', 'Credit Note', 'Debit Note', 'Rejection In', 'Rejection Out')
              AND v.is_cancelled = 0
              AND COALESCE(v.is_optional, 0) = 0
            GROUP BY vb.tracking_no`
      );
      const consumed = new Map(consumedRows.map((r) => [r.name, Number(r.qty) || 0]));
      const trackingNumbers = rows.map((r) => ({
        name: r.name,
        batch: r.batch ?? null,
        godown: r.godown ?? null,
        date: r.date ?? null,
        rate: Number(r.rate) || 0,
        balance: (Number(r.balance) || 0) - (consumed.get(r.name) || 0),
      }));

      // Reference numbers of Receipt/Delivery Notes carrying this item — Tally
      // offers the note's reference number as a tracking number to the follow-up
      // voucher (invoice / Rejection Out) even when none was typed per batch.
      const refRows = await db.all(
        sql`SELECT v.reference_number AS name,
                   MAX(g.name)   AS godown,
                   MAX(v.date)   AS date,
                   MAX(vse.rate) AS rate,
                   SUM(COALESCE(vse.quantity, 0)) AS balance
            FROM ${vouchers} v
            INNER JOIN ${voucherStockEntries} vse ON vse.voucher_id = v.voucher_id
            LEFT JOIN godowns g ON g.godown_id = vse.godown_id
            WHERE v.company_id = ${company_id}
              AND vse.stock_item_id = ${item_id}
              AND v.voucher_type IN ('Receipt Note', 'Delivery Note')
              AND v.reference_number IS NOT NULL AND v.reference_number <> ''
              AND v.is_cancelled = 0
              AND COALESCE(v.is_optional, 0) = 0
              AND COALESCE(v.is_post_dated, 0) = 0
            GROUP BY v.reference_number`
      );
      // Godown fallback — receipt/delivery lines usually carry the godown on
      // their batch rows (text), not on the stock entry's godown_id.
      const refBatchRows = await db.all(
        sql`SELECT v.reference_number AS name,
                   MAX(vb.godown) AS godown
            FROM ${vouchers} v
            INNER JOIN ${voucherStockEntries} vse ON vse.voucher_id = v.voucher_id
            INNER JOIN ${voucherBatches} vb ON vb.stock_entry_id = vse.stock_entry_id
            WHERE v.company_id = ${company_id}
              AND vse.stock_item_id = ${item_id}
              AND v.voucher_type IN ('Receipt Note', 'Delivery Note')
              AND v.reference_number IS NOT NULL AND v.reference_number <> ''
              AND vb.godown IS NOT NULL AND vb.godown <> ''
              AND v.is_cancelled = 0
              AND COALESCE(v.is_optional, 0) = 0
              AND COALESCE(v.is_post_dated, 0) = 0
            GROUP BY v.reference_number`
      );
      const refGodown = new Map(refBatchRows.map((r) => [r.name, r.godown]));
      for (const r of refRows) {
        if (trackingNumbers.some((t) => t.name === r.name)) continue;
        trackingNumbers.push({
          name: r.name,
          batch: null,
          godown: r.godown ?? refGodown.get(r.name) ?? null,
          date: r.date ?? null,
          rate: Number(r.rate) || 0,
          balance: (Number(r.balance) || 0) - (consumed.get(r.name) || 0),
        });
      }
      // Pending order numbers for the item too — Tally offers the Purchase/Sales
      // Order number in the tracking list as well, so a note can be tracked
      // directly against the order it fulfils.
      const orderNos = await module.exports._orderNosForItem(company_id, item_id);
      for (const o of orderNos) {
        if (trackingNumbers.some((t) => t.name === o.name)) continue;
        trackingNumbers.push({
          name: o.name,
          batch: null,
          godown: o.godown,
          date: o.date,
          rate: o.rate,
          balance: o.balance,
        });
      }
      const pending = trackingNumbers.filter((t) => t.balance > 0);
      pending.sort((a, b) => String(a.name).localeCompare(String(b.name)));
      return { success: true, trackingNumbers: pending };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  // Distinct order numbers used for an item (TallyPrime "List of Orders" in the
  // Stock Item Allocations sub-screen). Balance = total ordered quantity so far;
  // godown/due_on are the most recent values seen.
  orderNumbers: async (company_id, item_id) => {
    try {
      const { voucherBatches } = require('../db/schema');
      const rows = await db.all(
        sql`SELECT vb.order_no       AS name,
                   MAX(vb.batch_number) AS batch,
                   MAX(vb.godown)    AS godown,
                   MAX(vb.due_on)    AS due_on,
                   MAX(vb.rate)      AS rate,
                   SUM(COALESCE(vb.quantity, 0)) AS balance
            FROM ${voucherBatches} vb
            INNER JOIN ${voucherStockEntries} vse ON vse.stock_entry_id = vb.stock_entry_id
            INNER JOIN ${vouchers} v ON v.voucher_id = vb.voucher_id
            WHERE v.company_id = ${company_id}
              AND vse.stock_item_id = ${item_id}
              AND vb.order_no IS NOT NULL AND vb.order_no <> ''
              AND v.is_cancelled = 0
              AND COALESCE(v.is_optional, 0) = 0
            GROUP BY vb.order_no
            ORDER BY vb.order_no`
      );
      // Real order vouchers first (net pending balances) — an order number that
      // also appears on follow-up batch rows must show its PENDING quantity, not
      // the raw sum of every batch that mentions it.
      const orderNos = await module.exports._orderNosForItem(company_id, item_id);
      const orders = orderNos.map((o) => ({
        name: o.name,
        batch: null,
        godown: o.godown,
        due_on: o.due_on,
        rate: o.rate,
        balance: o.balance,
      }));
      // Ad-hoc order numbers typed on batch rows with no order voucher behind them.
      for (const r of rows) {
        if (orders.some((x) => x.name === r.name)) continue;
        orders.push({
          name: r.name,
          batch: r.batch ?? null,
          godown: r.godown ?? null,
          due_on: r.due_on ?? null,
          rate: Number(r.rate) || 0,
          balance: Number(r.balance) || 0,
        });
      }
      const pendingOrders = orders.filter((o) => o.balance > 0);
      pendingOrders.sort((a, b) => String(a.name).localeCompare(String(b.name)));
      return { success: true, orders: pendingOrders };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  // A party's saved Receipt/Delivery Notes — the "List of Tracking Numbers" on
  // the Purchase/Sales voucher's Receipt/Dispatch Details sub-screen. Selecting
  // one imports the note's still-pending items into the invoice. A note is
  // labelled by its reference number, or (Delivery Notes often carry none) by
  // its voucher number — never drop a note just because it has no reference,
  // otherwise it can't be invoiced against.
  partyTrackingNumbers: async (company_id, party_ledger_id, voucher_type) => {
    try {
      const rows = await db.all(
        sql`SELECT v.voucher_id,
                   COALESCE(NULLIF(v.reference_number, ''), 'No. ' || v.voucher_number) AS tracking_no,
                   v.date
            FROM ${vouchers} v
            WHERE v.company_id = ${company_id}
              AND v.party_ledger_id = ${party_ledger_id}
              AND v.voucher_type = ${voucher_type}
              AND v.is_cancelled = 0
              AND COALESCE(v.is_optional, 0) = 0
              AND COALESCE(v.is_post_dated, 0) = 0
            ORDER BY v.date, v.voucher_id`
      );
      return { success: true, trackingNumbers: rows };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  // Items of a saved order voucher / receipt note with NET pending quantities —
  // what a follow-up voucher should import.
  //   mode 'tracking' (source = Receipt/Delivery Note): the goods actually
  //     received/delivered, net of rejections and anything already invoiced.
  //   mode 'order' (source = Purchase/Sales Order): the invoice bills what was
  //     RECEIVED/DELIVERED against the order (net of rejections) — not the
  //     ordered-but-undelivered remainder. So the order is routed to the
  //     Receipt/Delivery Note(s) that fulfil it and their net-pending items are
  //     summed. If the order has no fulfilling note yet (billed directly), it
  //     falls back to ordered − already-billed.
  pendingVoucherItems: async (company_id, voucher_id, mode) => {
    try {
      const { voucherBatches, voucherOrderDetails } = require('../db/schema');
      const src = await db.all(
        sql`SELECT v.voucher_id, v.reference_number, vod.order_nos
            FROM ${vouchers} v
            LEFT JOIN ${voucherOrderDetails} vod ON vod.voucher_id = v.voucher_id
            WHERE v.voucher_id = ${voucher_id}`
      );
      if (!src.length) return { success: false, error: 'Voucher not found' };

      // Order mode → sum the net-pending items of the notes that fulfil it.
      if (mode === 'order' && src[0].order_nos) {
        const orderNo = src[0].order_nos;
        const noteRows = await db.all(
          sql`SELECT DISTINCT v.voucher_id
              FROM ${vouchers} v
              INNER JOIN ${voucherStockEntries} vse ON vse.voucher_id = v.voucher_id
              INNER JOIN ${voucherBatches} vb ON vb.stock_entry_id = vse.stock_entry_id
              WHERE v.company_id = ${company_id}
                AND vb.order_no = ${orderNo}
                AND v.voucher_type IN ('Receipt Note', 'Delivery Note')
                AND v.is_cancelled = 0
                AND COALESCE(v.is_optional, 0) = 0`
        );
        if (noteRows.length) {
          const agg = new Map();
          for (const nr of noteRows) {
            const sub = await module.exports.pendingVoucherItems(company_id, nr.voucher_id, 'tracking');
            if (!sub.success) continue;
            for (const it of sub.items) {
              const cur = agg.get(it.stock_item_id);
              if (cur) { cur.quantity += it.quantity; cur.amount = cur.quantity * cur.rate; }
              else agg.set(it.stock_item_id, { ...it });
            }
          }
          const merged = [...agg.values()].filter((it) => it.quantity > 0);
          if (merged.length) return { success: true, items: merged };
        }
        // No fulfilling note (direct order→invoice): fall through to the loop,
        // which yields ordered − already-billed.
      }

      const entries = await db.all(
        sql`SELECT vse.stock_entry_id, vse.stock_item_id, vse.item_name, vse.godown_id,
                   vse.unit_id, vse.quantity, vse.rate
            FROM ${voucherStockEntries} vse
            WHERE vse.voucher_id = ${voucher_id}`
      );
      const srcBatches = await db.all(
        sql`SELECT vb.stock_entry_id, vb.batch_number, vb.godown, vb.tracking_no,
                   vb.order_no, vb.due_on
            FROM ${voucherBatches} vb
            WHERE vb.voucher_id = ${voucher_id}`
      );
      const isOrder = mode === 'order';
      const headerNo = isOrder ? src[0].order_nos : src[0].reference_number;
      const items = [];
      for (const e of entries) {
        const eb = srcBatches.filter((b) => b.stock_entry_id === e.stock_entry_id);
        const linkNos = new Set();
        for (const b of eb) {
          const n = isOrder ? b.order_no : b.tracking_no;
          if (n) linkNos.add(n);
        }
        if (headerNo) linkNos.add(headerNo);
        // Quantity already consumed against any of this entry's link numbers by
        // follow-up vouchers. Each consumer batch carries exactly one number, so
        // summing per number cannot double-count.
        let consumedQty = 0;
        for (const no of linkNos) {
          const cr = isOrder
            ? await db.all(
                sql`SELECT SUM(COALESCE(vb.quantity, 0)) AS qty
                    FROM ${voucherBatches} vb
                    INNER JOIN ${voucherStockEntries} vse ON vse.stock_entry_id = vb.stock_entry_id
                    INNER JOIN ${vouchers} v ON v.voucher_id = vb.voucher_id
                    WHERE v.company_id = ${company_id}
                      AND v.voucher_id <> ${voucher_id}
                      AND vse.stock_item_id = ${e.stock_item_id}
                      AND vb.order_no = ${no}
                      AND v.voucher_type IN ('Receipt Note', 'Delivery Note', 'Purchase', 'Sales')
                      AND v.is_cancelled = 0
                      AND COALESCE(v.is_optional, 0) = 0`
              )
            : await db.all(
                sql`SELECT SUM(COALESCE(vb.quantity, 0)) AS qty
                    FROM ${voucherBatches} vb
                    INNER JOIN ${voucherStockEntries} vse ON vse.stock_entry_id = vb.stock_entry_id
                    INNER JOIN ${vouchers} v ON v.voucher_id = vb.voucher_id
                    WHERE v.company_id = ${company_id}
                      AND v.voucher_id <> ${voucher_id}
                      AND vse.stock_item_id = ${e.stock_item_id}
                      AND vb.tracking_no = ${no}
                      AND v.voucher_type IN ('Purchase', 'Sales', 'Credit Note', 'Debit Note', 'Rejection In', 'Rejection Out')
                      AND v.is_cancelled = 0
                      AND COALESCE(v.is_optional, 0) = 0`
              );
          consumedQty += Number(cr[0]?.qty) || 0;
        }
        const net = (Number(e.quantity) || 0) - consumedQty;
        if (net <= 0) continue;
        const b = eb[0] || null;
        items.push({
          stock_item_id: e.stock_item_id,
          item_name: e.item_name,
          godown_id: e.godown_id ?? null,
          unit_id: e.unit_id ?? null,
          quantity: net,
          rate: Number(e.rate) || 0,
          amount: net * (Number(e.rate) || 0),
          batch: b
            ? {
                batch_number: b.batch_number ?? '',
                godown: b.godown ?? null,
                tracking_no: b.tracking_no ?? null,
                order_no: b.order_no ?? null,
                due_on: b.due_on ?? null,
              }
            : null,
        });
      }
      return { success: true, items };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  // Order numbers written on a party's saved order vouchers (Purchase Order for
  // inward notes, Sales Order for outward) — the "List of Orders" on the Order
  // Details sub-screen. Selecting one lets the caller import the order's items.
  partyOrders: async (company_id, party_ledger_id, voucher_type) => {
    try {
      const { voucherOrderDetails } = require('../db/schema');
      const rows = await db.all(
        sql`SELECT v.voucher_id, vod.order_nos AS order_no, v.date
            FROM ${vouchers} v
            INNER JOIN ${voucherOrderDetails} vod ON vod.voucher_id = v.voucher_id
            WHERE v.company_id = ${company_id}
              AND v.party_ledger_id = ${party_ledger_id}
              AND v.voucher_type = ${voucher_type}
              AND vod.order_nos IS NOT NULL AND vod.order_nos <> ''
              AND v.is_cancelled = 0
              AND COALESCE(v.is_optional, 0) = 0
            ORDER BY v.date, vod.order_nos`
      );
      return { success: true, orders: rows };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  // Distinct batches recorded against a stock item, each with its manufacturing
  // and expiry dates (Level-2 "List of Batches": Name | Mfg Date | Expiry Date).
  batchesForItem: async (company_id, item_id) => {
    try {
      const { voucherBatches, stockItemOpeningAllocations } = require('../db/schema');
      // Transactional batches.
      const txRows = await db.all(
        sql`SELECT COALESCE(vb.batch_number, 'Primary Batch') AS name,
                   MAX(vb.mfg_date)    AS mfg_date,
                   MAX(vb.expiry_date) AS expiry_date
            FROM ${voucherBatches} vb
            INNER JOIN ${voucherStockEntries} vse ON vse.stock_entry_id = vb.stock_entry_id
            INNER JOIN ${vouchers} v ON v.voucher_id = vb.voucher_id
            WHERE v.company_id = ${company_id}
              AND vse.stock_item_id = ${item_id}
              AND v.is_cancelled = 0
              AND COALESCE(v.is_optional, 0) = 0
              AND COALESCE(v.is_post_dated, 0) = 0
            GROUP BY name`
      );
      // Opening-balance batches (carry mfg/expiry on the master allocation).
      const openRows = await db.all(
        sql`SELECT COALESCE(oa.batch_number, 'Primary Batch') AS name,
                   MAX(oa.mfg_date)    AS mfg_date,
                   MAX(oa.expiry_date) AS expiry_date
            FROM ${stockItemOpeningAllocations} oa
            WHERE oa.item_id = ${item_id}
              AND oa.batch_number IS NOT NULL AND oa.batch_number <> ''
            GROUP BY name`
      );

      // Merge by name; transactional dates win, opening fills any gaps.
      const byName = new Map();
      for (const r of [...openRows, ...txRows]) {
        const prev = byName.get(r.name) || { name: r.name, mfg_date: null, expiry_date: null };
        byName.set(r.name, {
          name: r.name,
          mfg_date: r.mfg_date ?? prev.mfg_date,
          expiry_date: r.expiry_date ?? prev.expiry_date,
        });
      }
      const batches = [...byName.values()].sort((a, b) => a.name.localeCompare(b.name));
      return { success: true, batches: batches.length ? batches : [{ name: 'Primary Batch', mfg_date: null, expiry_date: null }] };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  // Voucher register for a single stock item + batch (Batch Vouchers report).
  batchVouchers: async (company_id, fy_id, item_id, batch, from_date, to_date) => {
    try {
      const { voucherBatches } = require('../db/schema');
      const dateFrom = from_date ? sql` AND v.date >= ${from_date}` : sql``;
      const dateTo   = to_date   ? sql` AND v.date <= ${to_date}`   : sql``;

      const rows = await db.all(
        sql`SELECT
              v.voucher_id        AS voucher_id,
              v.date              AS date,
              COALESCE(v.party_name, v.narration, '') AS particulars,
              v.voucher_type      AS voucher_type,
              v.voucher_number    AS voucher_number,
              SUM(CASE WHEN ${inwardCondSql('v', 'vse')} THEN COALESCE(vb.quantity, 0) ELSE 0 END) AS in_qty,
              SUM(CASE WHEN ${inwardCondSql('v', 'vse')} THEN COALESCE(vb.quantity, 0) * COALESCE(vb.rate, vse.rate, 0) ELSE 0 END) AS in_value,
              SUM(CASE WHEN ${outwardCondSql('v', 'vse')} THEN COALESCE(vb.quantity, 0) ELSE 0 END) AS out_qty,
              SUM(CASE WHEN ${outwardCondSql('v', 'vse')} THEN COALESCE(vb.quantity, 0) * COALESCE(vb.rate, vse.rate, 0) ELSE 0 END) AS out_value
            FROM ${voucherBatches} vb
            INNER JOIN ${voucherStockEntries} vse ON vse.stock_entry_id = vb.stock_entry_id
            INNER JOIN ${vouchers} v ON v.voucher_id = vb.voucher_id
            WHERE v.company_id = ${company_id}
              AND v.fy_id = ${fy_id}
              AND vse.stock_item_id = ${item_id}
              AND COALESCE(vb.batch_number, 'Primary Batch') = ${batch}
              AND v.is_cancelled = 0
              AND COALESCE(v.is_optional, 0) = 0
              AND COALESCE(v.is_post_dated, 0) = 0
              ${dateFrom}${dateTo}
            GROUP BY v.voucher_id
            ORDER BY v.date ASC, v.voucher_id ASC`
      );

      // Closing stock is valued at weighted-average cost (inwards only), the way
      // TallyPrime shows it — e.g. 5 Box left of a 750-cost batch → 3,750, not
      // (inward value − sale value). Outward value still shows the sale amount.
      let runningQty = 0;
      let inwardQty = 0;
      let inwardValue = 0;
      const result = rows.map(r => {
        const in_qty = Number(r.in_qty) || 0;
        const in_value = Number(r.in_value) || 0;
        const out_qty = Number(r.out_qty) || 0;
        const out_value = Number(r.out_value) || 0;
        inwardQty += in_qty;
        inwardValue += in_value;
        runningQty += in_qty - out_qty;
        const avgCost = inwardQty > 0 ? inwardValue / inwardQty : 0;
        return {
          voucher_id: r.voucher_id,
          date: r.date,
          particulars: r.particulars,
          voucher_type: r.voucher_type,
          voucher_number: r.voucher_number,
          inwards_qty: in_qty || null, inwards_value: in_qty ? in_value : null,
          outwards_qty: out_qty || null, outwards_value: out_qty ? out_value : null,
          closing_qty: runningQty,
          closing_value: runningQty * avgCost,
        };
      });

      return { success: true, rows: result };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  // ── Godown Summary: closing stock per item for a single godown ────────────
  // Closing = per-godown opening allocation + inwards − outwards. The opening
  // allocation (stock_item_opening_allocations) is the ONLY source for items
  // that have an opening balance in a godown but no vouchers (e.g. Burari).
  godownItems: async (company_id, fy_id, godown_id, as_on_date) => {
    try {
      const godownRows = await db.all(
        sql`SELECT godown_id, name FROM godowns WHERE godown_id = ${godown_id} AND company_id = ${company_id}`
      );
      const godown_name = godownRows.length ? godownRows[0].name : '';
      const dateCond = as_on_date ? sql` AND v.date <= ${as_on_date}` : sql``;

      // Per-item voucher entries for this godown, chronological — direction per
      // entry (Stock Journal source/destination via is_source), running
      // weighted-average COST so godown values never mix cost with revenue.
      const moveRows = await db.all(
        sql`SELECT
              vse.stock_item_id AS item_id,
              si.name           AS item_name,
              si.group_id       AS group_id,
              sg.name           AS group_name,
              u.name            AS unit_name,
              v.date            AS date,
              v.voucher_type    AS voucher_type,
              vse.is_source     AS is_source,
              vse.quantity      AS quantity,
              vse.amount        AS amount
            FROM ${voucherStockEntries} vse
            INNER JOIN ${vouchers} v ON v.voucher_id = vse.voucher_id
            LEFT JOIN ${stockItems} si ON si.item_id = vse.stock_item_id
            LEFT JOIN ${stockGroups} sg ON sg.sg_id = si.group_id
            LEFT JOIN ${units} u ON u.unit_id = si.unit_id
            WHERE v.company_id = ${company_id}
              AND v.fy_id = ${fy_id}
              AND vse.godown_id = ${godown_id}
              AND v.is_cancelled = 0
              AND COALESCE(v.is_optional, 0) = 0
              AND COALESCE(v.is_post_dated, 0) = 0${dateCond}
            ORDER BY v.date ASC, v.voucher_id ASC, vse.stock_entry_id ASC`
      );

      // Per-item opening allocation for this godown.
      const openRows = await db.all(
        sql`SELECT
              soa.item_id AS item_id,
              si.name     AS item_name,
              si.group_id AS group_id,
              sg.name     AS group_name,
              u.name      AS unit_name,
              SUM(COALESCE(soa.quantity, 0)) AS open_qty,
              SUM(COALESCE(soa.amount, 0))   AS open_value
            FROM stock_item_opening_allocations soa
            INNER JOIN ${stockItems} si ON si.item_id = soa.item_id
            LEFT JOIN ${stockGroups} sg ON sg.sg_id = si.group_id
            LEFT JOIN ${units} u ON u.unit_id = si.unit_id
            WHERE si.company_id = ${company_id}
              AND soa.godown_id = ${godown_id}
            GROUP BY soa.item_id, si.name, si.group_id, sg.name, u.name`
      );

      const byItem = new Map();
      const seed = (r) => {
        if (!byItem.has(r.item_id)) {
          byItem.set(r.item_id, {
            item_id: r.item_id, item_name: r.item_name,
            group_id: r.group_id ?? null, group_name: r.group_name || null,
            unit_name: r.unit_name || '', wa: newWAState(0, 0),
          });
        }
        return byItem.get(r.item_id);
      };
      for (const r of openRows) {
        const e = seed(r);
        e.wa.qty += Number(r.open_qty) || 0;
        e.wa.value += Number(r.open_value) || 0;
      }
      for (const r of moveRows) {
        const dir = entryDirection(r.voucher_type, r.is_source);
        if (!dir) continue;
        applyWA(seed(r).wa, dir, r.quantity, r.amount);
      }

      const result = [...byItem.values()]
        .filter(e => e.wa.qty !== 0 || e.wa.value !== 0)
        .map(e => ({
          item_id: e.item_id,
          item_name: e.item_name,
          group_id: e.group_id,
          group_name: e.group_name,
          unit_name: e.unit_name,
          closing_qty: e.wa.qty,
          rate: e.wa.qty ? e.wa.value / e.wa.qty : 0,
          closing_value: e.wa.value,
        }))
        .sort((a, b) => (a.item_name || '').localeCompare(b.item_name || ''));

      return { success: true, godown_name, rows: result };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  // ── Godown Monthly Summary: 12-month inwards/outwards/closing for item ────
  godownItemMonthly: async (company_id, fy_id, godown_id, item_id) => {
    try {
      const fyRows = await db.all(sql`SELECT * FROM financial_years WHERE fy_id = ${fy_id}`);
      if (fyRows.length === 0) return { success: false, error: 'Financial year not found' };
      const startYear = new Date(fyRows[0].start_date).getFullYear();

      const itemRows = await db.all(
        sql`SELECT name FROM ${stockItems} WHERE item_id = ${item_id} AND company_id = ${company_id}`
      );
      const item_name = itemRows.length ? itemRows[0].name : '';

      // Per-godown opening allocation seeds the running balance.
      const openRows = await db.all(
        sql`SELECT SUM(COALESCE(quantity, 0)) AS open_qty, SUM(COALESCE(amount, 0)) AS open_value
            FROM stock_item_opening_allocations
            WHERE item_id = ${item_id} AND godown_id = ${godown_id}`
      );
      const opening_qty = openRows.length ? Number(openRows[0].open_qty) || 0 : 0;
      const opening_value = openRows.length ? Number(openRows[0].open_value) || 0 : 0;

      const entries = await db.all(
        sql`SELECT v.date, v.voucher_type, vse.quantity, vse.amount, vse.is_source
            FROM ${voucherStockEntries} vse
            INNER JOIN ${vouchers} v ON v.voucher_id = vse.voucher_id
            WHERE v.company_id = ${company_id}
              AND v.fy_id = ${fy_id}
              AND vse.godown_id = ${godown_id}
              AND vse.stock_item_id = ${item_id}
              AND v.is_cancelled = 0
              AND COALESCE(v.is_optional, 0) = 0
              AND COALESCE(v.is_post_dated, 0) = 0
            ORDER BY v.date ASC, v.voucher_id ASC, vse.stock_entry_id ASC`
      );

      // In/out columns show book values; the running closing value consumes
      // outward stock at weighted-average COST (see stockMovement.applyWA).
      const MONTH_NAMES = ['April','May','June','July','August','September','October','November','December','January','February','March'];
      const wa = newWAState(opening_qty, opening_value);
      const months = MONTH_NAMES.map((name, idx) => {
        let m = idx + 4, y = startYear;
        if (m > 12) { m -= 12; y = startYear + 1; }
        const prefix = `${y}-${String(m).padStart(2, '0')}`;
        let in_qty = 0, in_value = 0, out_qty = 0, out_value = 0;
        for (const e of entries) {
          if (!e.date || !e.date.startsWith(prefix)) continue;
          const dir = entryDirection(e.voucher_type, e.is_source);
          if (dir === 'in') {
            in_qty += Number(e.quantity) || 0;
            in_value += Number(e.amount) || 0;
          } else if (dir === 'out') {
            out_qty += Number(e.quantity) || 0;
            out_value += Number(e.amount) || 0;
          } else {
            continue;
          }
          applyWA(wa, dir, e.quantity, e.amount);
        }
        return { month: name, in_qty, in_value, out_qty, out_value, closing_qty: wa.qty, closing_value: wa.value };
      });
      return { success: true, item_name, opening: { qty: opening_qty, value: opening_value }, months };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  // ── Godown Vouchers: voucher register for a single godown + item ──────────
  godownVouchers: async (company_id, fy_id, godown_id, item_id, from_date, to_date) => {
    try {
      const dateTo = to_date ? sql` AND v.date <= ${to_date}` : sql``;

      // Per-godown opening allocation — seeds the running balance and is shown
      // as the leading "Opening Balance" row (matches the report screenshots).
      const openRows = await db.all(
        sql`SELECT SUM(COALESCE(quantity, 0)) AS open_qty, SUM(COALESCE(amount, 0)) AS open_value
            FROM stock_item_opening_allocations
            WHERE item_id = ${item_id} AND godown_id = ${godown_id}`
      );
      const opening_qty = openRows.length ? Number(openRows[0].open_qty) || 0 : 0;
      const opening_value = openRows.length ? Number(openRows[0].open_value) || 0 : 0;

      // ALL FY entries for this godown+item (per-entry, chronological) — the
      // register builder rolls pre-from_date movements into the opening.
      const entries = await db.all(
        sql`SELECT
              v.voucher_id     AS voucher_id,
              v.date           AS date,
              COALESCE(v.party_name, v.narration, '') AS particulars,
              v.voucher_type   AS voucher_type,
              v.voucher_number AS voucher_number,
              vse.quantity     AS quantity,
              vse.amount       AS amount,
              vse.is_source    AS is_source
            FROM ${voucherStockEntries} vse
            INNER JOIN ${vouchers} v ON v.voucher_id = vse.voucher_id
            WHERE v.company_id = ${company_id}
              AND v.fy_id = ${fy_id}
              AND vse.godown_id = ${godown_id}
              AND vse.stock_item_id = ${item_id}
              AND v.is_cancelled = 0
              AND COALESCE(v.is_optional, 0) = 0
              AND COALESCE(v.is_post_dated, 0) = 0
              AND NOT ${trackingBilledSql('v', 'vse')}
              ${dateTo}
            ORDER BY v.date ASC, v.voucher_id ASC, vse.stock_entry_id ASC`
      );

      const wa = newWAState(opening_qty, opening_value);
      const { openingQty, openingValue, rows: result } =
        buildVoucherRegister(entries, wa, from_date, to_date, false);
      return { success: true, opening: { qty: openingQty, value: openingValue }, rows: result };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  // ── Stock Item Vouchers: voucher register for a single item (all godowns) ─
  stockItemVouchers: async (company_id, fy_id, item_id, from_date, to_date) => {
    try {
      const itemRows = await db.all(
        sql`SELECT name, COALESCE(opening_quantity, 0) AS opening_quantity, COALESCE(opening_value, 0) AS opening_value
            FROM ${stockItems} WHERE item_id = ${item_id} AND company_id = ${company_id}`
      );
      const item = itemRows.length ? itemRows[0] : { name: '', opening_quantity: 0, opening_value: 0 };

      // ALL FY entries for this item (per-entry, chronological). The register
      // builder rolls pre-from_date movements into the Opening Balance (so a
      // month-scoped drill opens with the carried-in running balance), splits
      // each voucher into its inward/outward legs (Stock Journal, Credit Note
      // handled correctly), and values outward consumption at weighted-average
      // cost for the running closing column.
      const dateTo = to_date ? sql` AND v.date <= ${to_date}` : sql``;
      const entries = await db.all(
        sql`SELECT
              v.voucher_id     AS voucher_id,
              v.date           AS date,
              COALESCE(v.party_name, v.narration, '') AS particulars,
              v.voucher_type   AS voucher_type,
              v.voucher_number AS voucher_number,
              vse.quantity     AS quantity,
              vse.amount       AS amount,
              vse.additional_amount AS additional_amount,
              vse.is_source    AS is_source
            FROM ${voucherStockEntries} vse
            INNER JOIN ${vouchers} v ON v.voucher_id = vse.voucher_id
            WHERE v.company_id = ${company_id}
              AND v.fy_id = ${fy_id}
              AND vse.stock_item_id = ${item_id}
              AND v.is_cancelled = 0
              AND COALESCE(v.is_optional, 0) = 0
              AND COALESCE(v.is_post_dated, 0) = 0
              AND NOT ${trackingBilledSql('v', 'vse')}
              ${dateTo}
            ORDER BY v.date ASC, v.voucher_id ASC, vse.stock_entry_id ASC`
      );

      const wa = newWAState(item.opening_quantity, item.opening_value);
      const { rows: result } = buildVoucherRegister(entries, wa, from_date, to_date, true);

      return { success: true, item_name: item.name, rows: result };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  // ── Inventory voucher-type register, monthly counts (Stock Journal / Physical Stock) ──
  inventoryRegisterMonthly: async (company_id, fy_id, voucher_type) => {
    try {
      const fyRows = await db.all(sql`SELECT * FROM financial_years WHERE fy_id = ${fy_id}`);
      if (fyRows.length === 0) return { success: false, error: 'Financial year not found' };
      const startYear = new Date(fyRows[0].start_date).getFullYear();

      const voucherRows = await db.all(
        sql`SELECT v.date, v.is_cancelled, COALESCE(v.is_optional, 0) AS is_optional, COALESCE(v.is_post_dated, 0) AS is_post_dated
            FROM ${vouchers} v
            WHERE v.company_id = ${company_id} AND v.fy_id = ${fy_id} AND v.voucher_type = ${voucher_type}`
      );

      const MONTH_NAMES = ['April','May','June','July','August','September','October','November','December','January','February','March'];
      const months = MONTH_NAMES.map((name, idx) => {
        let m = idx + 4, y = startYear;
        if (m > 12) { m -= 12; y = startYear + 1; }
        const prefix = `${y}-${String(m).padStart(2, '0')}`;
        const monthVouchers = voucherRows.filter(v => v.date && v.date.startsWith(prefix));
        const active = monthVouchers.filter(v => v.is_cancelled === 0 && v.is_optional === 0 && v.is_post_dated === 0);
        const cancelled = monthVouchers.filter(v => v.is_cancelled === 1);
        return { month: name, total_vouchers: active.length, cancelled: cancelled.length };
      });
      return { success: true, rows: months };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  // ── Inventory voucher-type register, voucher list with inwards/outwards qty ──
  // Tally's Voucher Register: Particulars shows the FIRST stock item of the
  // voucher (not the party) and the quantity column shows THAT item's qty (not
  // the voucher total). Rejection notes carry a reversing sign — Rejections In
  // shows as a negative Outward, Rejections Out as a negative Inward.
  inventoryRegisterVouchers: async (company_id, fy_id, voucher_type, from_date, to_date) => {
    try {
      const dateFrom = from_date ? sql` AND v.date >= ${from_date}` : sql``;
      const dateTo   = to_date   ? sql` AND v.date <= ${to_date}`   : sql``;
      // One row per voucher = its first stock line (lowest stock_entry_id).
      const rows = await db.all(
        sql`SELECT * FROM (
              SELECT
                v.voucher_id     AS voucher_id,
                v.date           AS date,
                v.party_name     AS party_name,
                v.narration      AS narration,
                v.voucher_type   AS voucher_type,
                v.voucher_number AS voucher_number,
                vse.item_name    AS item_name,
                vse.is_source    AS is_source,
                COALESCE(vse.quantity, 0) AS quantity,
                u.symbol         AS unit_symbol,
                ROW_NUMBER() OVER (PARTITION BY v.voucher_id ORDER BY vse.stock_entry_id ASC) AS rn
              FROM ${vouchers} v
              LEFT JOIN ${voucherStockEntries} vse ON vse.voucher_id = v.voucher_id
              LEFT JOIN ${units} u ON u.unit_id = vse.unit_id
              WHERE v.company_id = ${company_id}
                AND v.fy_id = ${fy_id}
                AND v.voucher_type = ${voucher_type}
                AND v.is_cancelled = 0
                AND COALESCE(v.is_optional, 0) = 0
                AND COALESCE(v.is_post_dated, 0) = 0
                ${dateFrom}${dateTo}
            )
            WHERE rn = 1
            ORDER BY date ASC, voucher_id ASC`
      );
      const result = rows.map(r => {
        const qty = Number(r.quantity) || 0;
        let inwards_qty = 0, outwards_qty = 0;
        if (r.voucher_type === 'Rejection In') {
          outwards_qty = -qty;               // reversing: negative Outward
        } else if (r.voucher_type === 'Rejection Out') {
          inwards_qty = -qty;                // reversing: negative Inward
        } else {
          const dir = entryDirection(r.voucher_type, r.is_source);
          if (dir === 'out') outwards_qty = qty;
          else inwards_qty = qty;            // 'in' or non-movement fallback
        }
        return {
          voucher_id: r.voucher_id,
          date: r.date,
          particulars: r.item_name || r.party_name || r.narration || '',
          voucher_type: r.voucher_type,
          voucher_number: r.voucher_number,
          unit_symbol: r.unit_symbol || '',
          inwards_qty,
          outwards_qty,
        };
      });
      return { success: true, rows: result };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  stockSummary: async (company_id, fy_id, as_on_date, method = 'FIFO') => {
    try {
      const dateCond = as_on_date ? sql` AND v.date <= ${as_on_date}` : sql``;

      const allGroups = await db.all(
        sql`SELECT sg_id AS group_id, name AS group_name, parent_group_id
            FROM ${stockGroups}
            WHERE company_id = ${company_id} AND is_active = 1`
      );

      const rows = await db.all(
        sql`SELECT
              si.item_id        AS item_id,
              si.name           AS item_name,
              si.group_id       AS group_id,
              sg.name           AS group_name,
              u.name            AS unit_name,
              COALESCE(si.opening_quantity, 0) AS opening_qty,
              COALESCE(si.opening_value, 0)    AS opening_value,
              COALESCE(mv.inwards_qty, 0)      AS inwards_qty,
              COALESCE(mv.inwards_value, 0)    AS inwards_value,
              COALESCE(mv.outwards_qty, 0)     AS outwards_qty,
              COALESCE(mv.outwards_value, 0)   AS outwards_value
            FROM ${stockItems} si
            LEFT JOIN ${stockGroups} sg ON sg.sg_id = si.group_id
            LEFT JOIN ${units} u ON u.unit_id = si.unit_id
            LEFT JOIN (
              SELECT
                vse.stock_item_id AS stock_item_id,
                SUM(CASE WHEN ${inwardCondSql('v', 'vse')}
                         THEN vse.quantity ELSE 0 END) AS inwards_qty,
                SUM(CASE WHEN ${inwardCondSql('v', 'vse')}
                         THEN vse.amount ELSE 0 END) AS inwards_value,
                SUM(CASE WHEN ${outwardCondSql('v', 'vse')}
                         THEN vse.quantity ELSE 0 END) AS outwards_qty,
                SUM(CASE WHEN ${outwardCondSql('v', 'vse')}
                         THEN vse.amount ELSE 0 END) AS outwards_value
              FROM ${voucherStockEntries} vse
              INNER JOIN ${vouchers} v ON v.voucher_id = vse.voucher_id
              WHERE v.company_id = ${company_id}
                AND v.fy_id = ${fy_id}
                AND v.is_cancelled = 0
                AND COALESCE(v.is_optional, 0) = 0
                AND COALESCE(v.is_post_dated, 0) = 0${dateCond}
              GROUP BY vse.stock_item_id
            ) mv ON mv.stock_item_id = si.item_id
            WHERE si.company_id = ${company_id}
              AND si.is_active = 1
            ORDER BY sg.name ASC, si.name ASC`
      );

      const items = rows.map(r => {
        const opening_qty = r.opening_qty || 0;
        const opening_value = r.opening_value || 0;
        const inwards_qty = r.inwards_qty || 0;
        const inwards_value = r.inwards_value || 0;
        const outwards_qty = r.outwards_qty || 0;
        const outwards_value = r.outwards_value || 0;
        return {
          item_id: r.item_id,
          item_name: r.item_name,
          group_id: r.group_id,
          group_name: r.group_name || 'Ungrouped',
          unit_name: r.unit_name || '',
          opening_qty,
          opening_value,
          inwards_qty,
          inwards_value,
          outwards_qty,
          outwards_value,
          closing_qty: opening_qty + inwards_qty - outwards_qty,
          closing_value: 0, // Will be overridden by valuation engine
          rate: 0,           // derived after valuation below
        };
      });

      // Closing qty AND value both come from the valuation engine so they are
      // computed from the SAME movement classification — the SQL arithmetic
      // above only feeds the Inwards/Outwards display columns. (Taking qty
      // from one source and value from another made rate = value/qty nonsense
      // whenever a Stock Journal / Credit Note existed.)
      const valuationData = await calculateClosingStock(company_id, fy_id, as_on_date, method);
      if (valuationData.success) {
        const valMap = new Map();
        for (const v of valuationData.items) {
          valMap.set(v.item_id, v);
        }
        for (const it of items) {
          const v = valMap.get(it.item_id);
          if (v) {
            it.closing_qty = v.closing_qty;
            it.closing_value = v.closing_value;
          }
        }
      } else {
        // Fallback if valuation fails: qty from the (already correctly
        // classified) movement columns; value at weighted-average COST —
        // never opening + inwards − outwards(sales revenue).
        for (const it of items) {
          const availQty = it.opening_qty + it.inwards_qty;
          const avgRate = availQty > 0 ? (it.opening_value + it.inwards_value) / availQty : 0;
          it.closing_value = it.closing_qty > 0 ? avgRate * it.closing_qty : 0;
        }
      }

      for (const it of items) {
        it.rate = it.closing_qty !== 0 ? it.closing_value / it.closing_qty : 0;
      }


      const childrenOf = new Map(); // group_id -> [child group_id, ...]
      for (const g of allGroups) {
        if (g.parent_group_id == null) continue;
        if (!childrenOf.has(g.parent_group_id)) childrenOf.set(g.parent_group_id, []);
        childrenOf.get(g.parent_group_id).push(g.group_id);
      }

      const directItemsByGroup = new Map(); // group_id|'ungrouped' -> ItemRow[]
      for (const it of items) {
        const key = it.group_id == null ? 'ungrouped' : it.group_id;
        if (!directItemsByGroup.has(key)) directItemsByGroup.set(key, []);
        directItemsByGroup.get(key).push(it);
      }

      const buildNode = (group) => {
        const directItems = directItemsByGroup.get(group.group_id) || [];
        const childGroupIds = childrenOf.get(group.group_id) || [];
        const childNodes = childGroupIds
          .map(id => allGroups.find(g => g.group_id === id))
          .filter(Boolean)
          .map(buildNode);

        let closing_qty = directItems.reduce((s, it) => s + it.closing_qty, 0);
        let closing_value = directItems.reduce((s, it) => s + it.closing_value, 0);
        let item_count = directItems.length;
        const unitSet = new Set(directItems.map(it => it.unit_name || ''));
        for (const child of childNodes) {
          closing_qty += child.closing_qty;
          closing_value += child.closing_value;
          item_count += child.item_count;
          for (const u of child.unit_set) unitSet.add(u);
        }

        const qtyDisplayable = unitSet.size === 1;

        return {
          group_id: group.group_id,
          group_name: group.group_name,
          closing_qty: qtyDisplayable ? closing_qty : 0,
          closing_value,
          item_count,
          qty_displayable: qtyDisplayable,
          unit_name: qtyDisplayable ? [...unitSet][0] : '',
          items: directItems,
          childGroups: childNodes,
          unit_set: unitSet, // internal only, stripped before returning to the client
        };
      };

      const topLevelGroups = allGroups.filter(g => g.parent_group_id == null);
      const rootGroupNodes = topLevelGroups.map(buildNode);
      const rootItems = directItemsByGroup.get('ungrouped') || [];

      const stripInternal = (node) => {
        const { unit_set, ...rest } = node;
        return { ...rest, childGroups: rest.childGroups.map(stripInternal) };
      };

      const groups = rootGroupNodes
        .map(stripInternal)
        .sort((a, b) => (a.group_name || '').localeCompare(b.group_name || ''));

      const topLevelUnitSet = new Set([
        ...rootItems.map(it => it.unit_name || '').filter(u => u !== ''),
        ...groups.filter(g => g.qty_displayable).map(g => g.unit_name || '').filter(u => u !== ''),
      ]);
      const totalQtyDisplayable = topLevelUnitSet.size <= 1;
      const totalClosingQty = totalQtyDisplayable
        ? rootItems.reduce((s, it) => s + it.closing_qty, 0) + groups.reduce((s, g) => s + g.closing_qty, 0)
        : 0;
      const totalClosingValue = items.reduce((s, it) => s + it.closing_value, 0);

      return {
        success: true,
        as_on_date: as_on_date || null,
        items,
        rootItems,
        groups,
        totalClosingQty,
        totalQtyDisplayable,
        totalClosingValue,
      };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },
};