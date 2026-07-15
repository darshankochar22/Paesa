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
} = require('./services/stockMovement');

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
            ORDER BY si.name ASC`,
      );

      // Closing qty/value from the shared valuation engine — the same source
      // Stock Summary uses, so the group drill always matches the summary.
      const valuation = await calculateClosingStock(company_id, fy_id, null, 'FIFO');
      const valMap = new Map((valuation.items || []).map((v) => [v.item_id, v]));

      const items = rows.map((r) => {
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

      const totalClosingQty = items.reduce((s, it) => s + it.closing_qty, 0);
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
            ORDER BY si.name ASC`,
      );

      // Same engine as Stock Summary — category drill matches the summary.
      const valuation = await calculateClosingStock(company_id, fy_id, null, 'FIFO');
      const valMap = new Map((valuation.items || []).map((v) => [v.item_id, v]));

      const items = rows.map((r) => {
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
      const totalClosingQty = items.reduce((s, it) => s + it.closing_qty, 0);
      const totalClosingValue = items.reduce((s, it) => s + it.closing_value, 0);
      return { success: true, items, totalClosingQty, totalClosingValue };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  // Full Stock Summary (Closing Stock) — every item's Opening / Inwards /
  // Outwards / Closing for the FY, using the SAME direction + pooled-avg-cost
  // math as stockItemMonthly: Debit Note = negative Inward, Credit Note =
  // negative Outward, and closing is valued at weighted-average COST (negative
  // stock kept). So a sales-return with no purchase basis (e.g. an item whose
  // only movement is a Credit Note) shows its returned quantity but ZERO closing
  // value — exactly as TallyPrime excludes it from the closing-stock total.
  // All-zero items (no opening, no movement, no closing) are dropped, matching
  // Tally's default of hiding them. This is the list the Closing-Stock drill
  // (Funds Flow → Current Assets → Closing Stock) renders.
  stockClosingSummary: async (company_id, fy_id) => {
    try {
      const itemRows = await db.all(
        sql`SELECT si.item_id, si.name, si.opening_quantity, si.opening_value,
                   u.name AS unit_name
            FROM ${stockItems} si
            LEFT JOIN ${units} u ON u.unit_id = si.unit_id
            WHERE si.company_id = ${company_id} AND si.is_active = 1
            ORDER BY si.name ASC`,
      );

      const entries = await db.all(
        sql`SELECT vse.stock_item_id AS item_id, v.voucher_type,
                   vse.quantity, vse.amount, vse.is_source
            FROM ${voucherStockEntries} vse
            INNER JOIN ${vouchers} v ON v.voucher_id = vse.voucher_id
            WHERE v.company_id = ${company_id} AND v.fy_id = ${fy_id}
              AND v.is_cancelled = 0
              AND COALESCE(v.is_optional, 0) = 0
              AND COALESCE(v.is_post_dated, 0) = 0
              AND NOT ${trackingBilledSql('v', 'vse')}`,
      );
      const byItem = new Map();
      for (const e of entries) {
        if (!byItem.has(e.item_id)) byItem.set(e.item_id, []);
        byItem.get(e.item_id).push(e);
      }

      const items = [];
      for (const it of itemRows) {
        const opening_qty = Number(it.opening_quantity) || 0;
        const opening_value = Number(it.opening_value) || 0;
        let in_qty = 0,
          in_value = 0,
          out_qty = 0,
          out_value = 0;
        let runQty = opening_qty;
        let cumInQty = opening_qty;
        let cumInVal = opening_value;
        for (const e of byItem.get(it.item_id) || []) {
          const { dir, sign } = registerDirection(e.voucher_type, e.is_source);
          if (!dir) continue;
          const qty = (Number(e.quantity) || 0) * sign;
          const amt = (Number(e.amount) || 0) * sign;
          if (dir === 'in') {
            in_qty += qty;
            in_value += amt;
            runQty += qty;
            cumInQty += qty;
            cumInVal += amt;
          } else {
            out_qty += qty;
            out_value += amt;
            runQty -= qty;
          }
        }
        const rate = cumInQty !== 0 ? cumInVal / cumInQty : 0;
        const closing_qty = runQty;
        const closing_value = runQty * rate;
        if (
          opening_qty === 0 &&
          in_qty === 0 &&
          out_qty === 0 &&
          closing_qty === 0 &&
          opening_value === 0 &&
          closing_value === 0
        )
          continue;
        items.push({
          item_id: it.item_id,
          item_name: it.name,
          unit_name: it.unit_name || '',
          opening_qty,
          opening_value,
          in_qty,
          in_value,
          out_qty,
          out_value,
          closing_qty,
          closing_value,
        });
      }

      return {
        success: true,
        items,
        totalOpeningValue: items.reduce((s, r) => s + r.opening_value, 0),
        totalInValue: items.reduce((s, r) => s + r.in_value, 0),
        totalOutValue: items.reduce((s, r) => s + r.out_value, 0),
        totalClosingValue: items.reduce((s, r) => s + r.closing_value, 0),
      };
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

      // Fetch item meta (opening balance + base unit for the qty columns)
      const itemRows = await db.all(
        sql`SELECT si.item_id, si.name, si.opening_quantity, si.opening_value,
                   u.name AS unit_name
            FROM ${stockItems} si
            LEFT JOIN ${units} u ON u.unit_id = si.unit_id
            WHERE si.item_id = ${item_id} AND si.company_id = ${company_id}`,
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
            ORDER BY v.date ASC, v.voucher_id ASC, vse.stock_entry_id ASC`,
      );

      // Build 12 months Apr → Mar. Inwards/Outwards columns show BOOK values
      // (what the vouchers say — sales at sale price); the running closing
      // value consumes outward stock at weighted-average COST so the closing
      // column is a true inventory value, never cost-minus-revenue.
      const MONTH_NAMES = [
        'April',
        'May',
        'June',
        'July',
        'August',
        'September',
        'October',
        'November',
        'December',
        'January',
        'February',
        'March',
      ];
      // Running closing balance. Quantity is the plain physical running total.
      // Value is the closing quantity × weighted-average COST rate, where the
      // rate pools opening + every inward (outwards consume at that rate and
      // don't change it). This equals TallyPrime's closing value AND, unlike a
      // zero-floored average, still values NEGATIVE stock at cost — so an item
      // that goes negative shows e.g. −136 kg × ₹16 = (−)2,176.00 instead of a
      // blank. For positive stock it is identical to the weighted-average value.
      let runQty = Number(item.opening_quantity) || 0;
      let cumInQty = runQty; // opening counts as the first "inward" lot
      let cumInVal = Number(item.opening_value) || 0;

      const months = MONTH_NAMES.map((name, idx) => {
        let m = idx + 4;
        let y = startYear;
        if (m > 12) {
          m -= 12;
          y = startYear + 1;
        }
        const prefix = `${y}-${String(m).padStart(2, '0')}`;

        let in_qty = 0,
          in_value = 0,
          out_qty = 0,
          out_value = 0;
        for (const e of entries) {
          if (!e.date || !e.date.startsWith(prefix)) continue;
          // Returns (Debit/Credit Note) show as a negative movement in the
          // opposite column: Debit Note = neg Inward, Credit Note = neg Outward.
          const { dir, sign } = registerDirection(e.voucher_type, e.is_source);
          const qty = (Number(e.quantity) || 0) * sign;
          const amt = (Number(e.amount) || 0) * sign;
          if (dir === 'in') {
            in_qty += qty;
            in_value += amt;
            runQty += qty;
            cumInQty += qty;
            cumInVal += amt;
          } else if (dir === 'out') {
            out_qty += qty;
            out_value += amt;
            runQty -= qty;
          } else {
            continue;
          }
        }

        const rate = cumInQty !== 0 ? cumInVal / cumInQty : 0;
        return {
          month: name,
          in_qty,
          in_value,
          out_qty,
          out_value,
          closing_qty: runQty,
          closing_value: runQty * rate,
        };
      });

      return {
        success: true,
        item_name: item.name,
        unit_name: item.unit_name || '',
        opening_qty: item.opening_quantity || 0,
        opening_value: item.opening_value || 0,
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
            ORDER BY si.name ASC`,
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
            GROUP BY name`,
      );
      const openRows = await db.all(
        sql`SELECT COALESCE(oa.batch_number, 'Primary Batch') AS name,
                   MAX(oa.mfg_date)    AS mfg_date,
                   MAX(oa.expiry_date) AS expiry_date,
                   SUM(COALESCE(oa.quantity, 0)) AS balance
            FROM ${stockItemOpeningAllocations} oa
            WHERE oa.item_id = ${item_id}
              AND oa.batch_number IS NOT NULL AND oa.batch_number <> ''
            GROUP BY name`,
      );
      const byName = new Map();
      for (const r of [...openRows, ...txRows]) {
        const prev = byName.get(r.name) || {
          name: r.name,
          mfg_date: null,
          expiry_date: null,
          balance: 0,
        };
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
};
