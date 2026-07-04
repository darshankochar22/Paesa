const { db } = require('../db/index');
const { sql } = require('drizzle-orm');
const { stockItems, stockGroups, voucherStockEntries, vouchers, units } = require('../db/schema');
const { calculateClosingStock } = require('./stockValuationEngine');
const {
  entryDirection,
  registerDirection,
  inwardCondSql,
  outwardCondSql,
  trackingBilledSql,
  newWAState,
  applyWA,
} = require('./services/stockMovement');

module.exports = {
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
          GROUP BY vod.order_nos`,
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
          GROUP BY vod.order_nos`,
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
          GROUP BY vb.order_no`,
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
            ORDER BY vb.tracking_no`,
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
            GROUP BY vb.tracking_no`,
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
            GROUP BY v.reference_number`,
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
            GROUP BY v.reference_number`,
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
            ORDER BY vb.order_no`,
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
            ORDER BY v.date, v.voucher_id`,
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
            WHERE v.voucher_id = ${voucher_id}`,
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
                AND COALESCE(v.is_optional, 0) = 0`,
        );
        if (noteRows.length) {
          const agg = new Map();
          for (const nr of noteRows) {
            const sub = await module.exports.pendingVoucherItems(
              company_id,
              nr.voucher_id,
              'tracking',
            );
            if (!sub.success) continue;
            for (const it of sub.items) {
              const cur = agg.get(it.stock_item_id);
              if (cur) {
                cur.quantity += it.quantity;
                cur.amount = cur.quantity * cur.rate;
              } else agg.set(it.stock_item_id, { ...it });
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
            WHERE vse.voucher_id = ${voucher_id}`,
      );
      const srcBatches = await db.all(
        sql`SELECT vb.stock_entry_id, vb.batch_number, vb.godown, vb.tracking_no,
                   vb.order_no, vb.due_on
            FROM ${voucherBatches} vb
            WHERE vb.voucher_id = ${voucher_id}`,
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
                      AND COALESCE(v.is_optional, 0) = 0`,
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
                      AND COALESCE(v.is_optional, 0) = 0`,
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
            ORDER BY v.date, vod.order_nos`,
      );
      return { success: true, orders: rows };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },
};
