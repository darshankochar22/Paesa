const { db } = require('../db/index');
const { sql } = require('drizzle-orm');
const { stockItems, stockGroups, voucherStockEntries, vouchers, units } = require('../db/schema');
const { calculateClosingStock } = require('./stockValuationEngine');


const INWARD_TYPES = ['Purchase', 'Receipt Note', 'Rejection In', 'Material In'];
const OUTWARD_TYPES = ['Sales', 'Delivery Note', 'Rejection Out', 'Material Out'];

module.exports = {

  stockGroupItems: async (company_id, fy_id, group_id) => {
    try {
      const { stockItems, stockGroups, voucherStockEntries, vouchers, units } = require('../db/schema');
      const INWARD_TYPES  = ['Purchase', 'Receipt Note', 'Rejection In', 'Material In'];
      const OUTWARD_TYPES = ['Sales', 'Delivery Note', 'Rejection Out', 'Material Out'];

      const rows = await db.all(
        sql`SELECT
              si.item_id        AS item_id,
              si.name           AS item_name,
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
                SUM(CASE WHEN v.voucher_type IN (${sql.join(INWARD_TYPES.map(t => sql`${t}`), sql`, `)})
                         THEN vse.quantity ELSE 0 END) AS inwards_qty,
                SUM(CASE WHEN v.voucher_type IN (${sql.join(INWARD_TYPES.map(t => sql`${t}`), sql`, `)})
                         THEN vse.amount ELSE 0 END) AS inwards_value,
                SUM(CASE WHEN v.voucher_type IN (${sql.join(OUTWARD_TYPES.map(t => sql`${t}`), sql`, `)})
                         THEN vse.quantity ELSE 0 END) AS outwards_qty,
                SUM(CASE WHEN v.voucher_type IN (${sql.join(OUTWARD_TYPES.map(t => sql`${t}`), sql`, `)})
                         THEN vse.amount ELSE 0 END) AS outwards_value
              FROM ${voucherStockEntries} vse
              INNER JOIN ${vouchers} v ON v.voucher_id = vse.voucher_id
              WHERE v.company_id = ${company_id}
                AND v.fy_id = ${fy_id}
                AND v.is_cancelled = 0
                AND COALESCE(v.is_optional, 0) = 0
                AND COALESCE(v.is_post_dated, 0) = 0
              GROUP BY vse.stock_item_id
            ) mv ON mv.stock_item_id = si.item_id
            WHERE si.company_id = ${company_id}
              AND si.is_active = 1
              AND si.group_id = ${group_id}
            ORDER BY si.name ASC`
      );

      const items = rows.map(r => {
        const opening_qty   = r.opening_qty   || 0;
        const opening_value = r.opening_value || 0;
        const inwards_qty   = r.inwards_qty   || 0;
        const inwards_value = r.inwards_value || 0;
        const outwards_qty  = r.outwards_qty  || 0;
        const outwards_value= r.outwards_value|| 0;
        const closing_qty   = opening_qty + inwards_qty - outwards_qty;
        const closing_value = opening_value + inwards_value - outwards_value;
        const rate = closing_qty !== 0 ? closing_value / closing_qty : 0;
        return {
          item_id: r.item_id,
          item_name: r.item_name,
          group_name: r.group_name || 'Ungrouped',
          unit_name: r.unit_name || '',
          closing_qty,
          closing_value,
          rate,
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
              u.name            AS unit_name,
              COALESCE(si.opening_quantity, 0) AS opening_qty,
              COALESCE(si.opening_value, 0)    AS opening_value,
              COALESCE(mv.inwards_qty, 0)      AS inwards_qty,
              COALESCE(mv.inwards_value, 0)    AS inwards_value,
              COALESCE(mv.outwards_qty, 0)     AS outwards_qty,
              COALESCE(mv.outwards_value, 0)   AS outwards_value
            FROM ${stockItems} si
            LEFT JOIN ${units} u ON u.unit_id = si.unit_id
            LEFT JOIN (
              SELECT
                vse.stock_item_id AS stock_item_id,
                SUM(CASE WHEN v.voucher_type IN (${sql.join(INWARD_TYPES.map(t => sql`${t}`), sql`, `)})
                         THEN vse.quantity ELSE 0 END) AS inwards_qty,
                SUM(CASE WHEN v.voucher_type IN (${sql.join(INWARD_TYPES.map(t => sql`${t}`), sql`, `)})
                         THEN vse.amount ELSE 0 END) AS inwards_value,
                SUM(CASE WHEN v.voucher_type IN (${sql.join(OUTWARD_TYPES.map(t => sql`${t}`), sql`, `)})
                         THEN vse.quantity ELSE 0 END) AS outwards_qty,
                SUM(CASE WHEN v.voucher_type IN (${sql.join(OUTWARD_TYPES.map(t => sql`${t}`), sql`, `)})
                         THEN vse.amount ELSE 0 END) AS outwards_value
              FROM ${voucherStockEntries} vse
              INNER JOIN ${vouchers} v ON v.voucher_id = vse.voucher_id
              WHERE v.company_id = ${company_id}
                AND v.fy_id = ${fy_id}
                AND v.is_cancelled = 0
                AND COALESCE(v.is_optional, 0) = 0
                AND COALESCE(v.is_post_dated, 0) = 0
              GROUP BY vse.stock_item_id
            ) mv ON mv.stock_item_id = si.item_id
            WHERE si.company_id = ${company_id}
              AND si.is_active = 1
              AND si.category_id = ${category_id}
            ORDER BY si.name ASC`
      );

      const items = rows.map(r => {
        const closing_qty   = (r.opening_qty || 0) + (r.inwards_qty || 0) - (r.outwards_qty || 0);
        const closing_value = (r.opening_value || 0) + (r.inwards_value || 0) - (r.outwards_value || 0);
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
      const { stockItems, voucherStockEntries, vouchers } = require('../db/schema');
      const INWARD_TYPES  = ['Purchase', 'Receipt Note', 'Rejection In', 'Material In'];
      const OUTWARD_TYPES = ['Sales', 'Delivery Note', 'Rejection Out', 'Material Out'];

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

      // Fetch all stock entries for this item in this FY
      const entries = await db.all(
        sql`SELECT v.date, v.voucher_type, vse.quantity, vse.amount
            FROM ${voucherStockEntries} vse
            INNER JOIN ${vouchers} v ON v.voucher_id = vse.voucher_id
            WHERE v.company_id = ${company_id}
              AND v.fy_id = ${fy_id}
              AND v.is_cancelled = 0
              AND COALESCE(v.is_optional, 0) = 0
              AND COALESCE(v.is_post_dated, 0) = 0
              AND vse.stock_item_id = ${item_id}`
      );

      // Build 12 months Apr → Mar
      const MONTH_NAMES = ['April','May','June','July','August','September','October','November','December','January','February','March'];
      let runningQty   = item.opening_quantity || 0;
      let runningValue = item.opening_value    || 0;

      const months = MONTH_NAMES.map((name, idx) => {
        let m = idx + 4;
        let y = startYear;
        if (m > 12) { m -= 12; y = startYear + 1; }
        const prefix = `${y}-${String(m).padStart(2, '0')}`;

        const monthEntries = entries.filter(e => e.date && e.date.startsWith(prefix));
        const inward  = monthEntries.filter(e => INWARD_TYPES.includes(e.voucher_type));
        const outward = monthEntries.filter(e => OUTWARD_TYPES.includes(e.voucher_type));

        const in_qty    = inward.reduce((s, e)  => s + (e.quantity || 0), 0);
        const in_value  = inward.reduce((s, e)  => s + (e.amount   || 0), 0);
        const out_qty   = outward.reduce((s, e) => s + (e.quantity || 0), 0);
        const out_value = outward.reduce((s, e) => s + (e.amount   || 0), 0);

        runningQty   += in_qty   - out_qty;
        runningValue += in_value - out_value;

        return {
          month: name,
          in_qty, in_value,
          out_qty, out_value,
          closing_qty: runningQty,
          closing_value: runningValue,
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
                   SUM(CASE WHEN v.voucher_type IN (${sql.join(INWARD_TYPES.map(t => sql`${t}`), sql`, `)})
                            THEN COALESCE(vb.quantity, 0) ELSE -COALESCE(vb.quantity, 0) END) AS balance
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
              SUM(COALESCE(vb.quantity, 0))                              AS qty,
              SUM(COALESCE(vb.quantity, 0) * COALESCE(vb.rate, vse.rate, 0)) AS value
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
        const isInward = INWARD_TYPES.includes(r.voucher_type);
        const qty = Number(r.qty) || 0;
        const value = Number(r.value) || 0;
        const inwards_qty   = isInward ? qty : null;
        const inwards_value = isInward ? value : null;
        const outwards_qty   = isInward ? null : qty;
        const outwards_value = isInward ? null : value;
        if (isInward) { inwardQty += qty; inwardValue += value; }
        runningQty += (inwards_qty || 0) - (outwards_qty || 0);
        const avgCost = inwardQty > 0 ? inwardValue / inwardQty : 0;
        return {
          voucher_id: r.voucher_id,
          date: r.date,
          particulars: r.particulars,
          voucher_type: r.voucher_type,
          voucher_number: r.voucher_number,
          inwards_qty, inwards_value,
          outwards_qty, outwards_value,
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

      // Per-item voucher movement (inwards − outwards) for this godown.
      const moveRows = await db.all(
        sql`SELECT
              vse.stock_item_id AS item_id,
              si.name           AS item_name,
              u.name            AS unit_name,
              SUM(CASE WHEN v.voucher_type IN (${sql.join(INWARD_TYPES.map(t => sql`${t}`), sql`, `)})
                       THEN vse.quantity ELSE 0 END)
              - SUM(CASE WHEN v.voucher_type IN (${sql.join(OUTWARD_TYPES.map(t => sql`${t}`), sql`, `)})
                       THEN vse.quantity ELSE 0 END) AS move_qty,
              SUM(CASE WHEN v.voucher_type IN (${sql.join(INWARD_TYPES.map(t => sql`${t}`), sql`, `)})
                       THEN vse.amount ELSE 0 END)
              - SUM(CASE WHEN v.voucher_type IN (${sql.join(OUTWARD_TYPES.map(t => sql`${t}`), sql`, `)})
                       THEN vse.amount ELSE 0 END) AS move_value
            FROM ${voucherStockEntries} vse
            INNER JOIN ${vouchers} v ON v.voucher_id = vse.voucher_id
            LEFT JOIN ${stockItems} si ON si.item_id = vse.stock_item_id
            LEFT JOIN ${units} u ON u.unit_id = si.unit_id
            WHERE v.company_id = ${company_id}
              AND v.fy_id = ${fy_id}
              AND vse.godown_id = ${godown_id}
              AND v.is_cancelled = 0
              AND COALESCE(v.is_optional, 0) = 0
              AND COALESCE(v.is_post_dated, 0) = 0${dateCond}
            GROUP BY vse.stock_item_id, si.name, u.name`
      );

      // Per-item opening allocation for this godown.
      const openRows = await db.all(
        sql`SELECT
              soa.item_id AS item_id,
              si.name     AS item_name,
              u.name      AS unit_name,
              SUM(COALESCE(soa.quantity, 0)) AS open_qty,
              SUM(COALESCE(soa.amount, 0))   AS open_value
            FROM stock_item_opening_allocations soa
            INNER JOIN ${stockItems} si ON si.item_id = soa.item_id
            LEFT JOIN ${units} u ON u.unit_id = si.unit_id
            WHERE si.company_id = ${company_id}
              AND soa.godown_id = ${godown_id}
            GROUP BY soa.item_id, si.name, u.name`
      );

      const byItem = new Map();
      const seed = (id, name, unit) => {
        if (!byItem.has(id)) byItem.set(id, { item_id: id, item_name: name, unit_name: unit || '', qty: 0, value: 0 });
        return byItem.get(id);
      };
      for (const r of openRows) {
        const e = seed(r.item_id, r.item_name, r.unit_name);
        e.qty += Number(r.open_qty) || 0;
        e.value += Number(r.open_value) || 0;
      }
      for (const r of moveRows) {
        const e = seed(r.item_id, r.item_name, r.unit_name);
        e.qty += Number(r.move_qty) || 0;
        e.value += Number(r.move_value) || 0;
      }

      const result = [...byItem.values()]
        .filter(e => e.qty !== 0 || e.value !== 0)
        .map(e => ({
          item_id: e.item_id,
          item_name: e.item_name,
          unit_name: e.unit_name,
          closing_qty: e.qty,
          rate: e.qty ? e.value / e.qty : 0,
          closing_value: e.value,
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
        sql`SELECT v.date, v.voucher_type, vse.quantity, vse.amount
            FROM ${voucherStockEntries} vse
            INNER JOIN ${vouchers} v ON v.voucher_id = vse.voucher_id
            WHERE v.company_id = ${company_id}
              AND v.fy_id = ${fy_id}
              AND vse.godown_id = ${godown_id}
              AND vse.stock_item_id = ${item_id}
              AND v.is_cancelled = 0
              AND COALESCE(v.is_optional, 0) = 0
              AND COALESCE(v.is_post_dated, 0) = 0`
      );

      const MONTH_NAMES = ['April','May','June','July','August','September','October','November','December','January','February','March'];
      let runningQty = opening_qty, runningValue = opening_value;
      const months = MONTH_NAMES.map((name, idx) => {
        let m = idx + 4, y = startYear;
        if (m > 12) { m -= 12; y = startYear + 1; }
        const prefix = `${y}-${String(m).padStart(2, '0')}`;
        const monthEntries = entries.filter(e => e.date && e.date.startsWith(prefix));
        const inward  = monthEntries.filter(e => INWARD_TYPES.includes(e.voucher_type));
        const outward = monthEntries.filter(e => OUTWARD_TYPES.includes(e.voucher_type));
        const in_qty    = inward.reduce((s, e)  => s + (e.quantity || 0), 0);
        const in_value  = inward.reduce((s, e)  => s + (e.amount   || 0), 0);
        const out_qty   = outward.reduce((s, e) => s + (e.quantity || 0), 0);
        const out_value = outward.reduce((s, e) => s + (e.amount   || 0), 0);
        runningQty   += in_qty   - out_qty;
        runningValue += in_value - out_value;
        return { month: name, in_qty, in_value, out_qty, out_value, closing_qty: runningQty, closing_value: runningValue };
      });
      return { success: true, item_name, opening: { qty: opening_qty, value: opening_value }, months };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  // ── Godown Vouchers: voucher register for a single godown + item ──────────
  godownVouchers: async (company_id, fy_id, godown_id, item_id, from_date, to_date) => {
    try {
      const dateFrom = from_date ? sql` AND v.date >= ${from_date}` : sql``;
      const dateTo   = to_date   ? sql` AND v.date <= ${to_date}`   : sql``;

      // Per-godown opening allocation — seeds the running balance and is shown
      // as the leading "Opening Balance" row (matches the report screenshots).
      const openRows = await db.all(
        sql`SELECT SUM(COALESCE(quantity, 0)) AS open_qty, SUM(COALESCE(amount, 0)) AS open_value
            FROM stock_item_opening_allocations
            WHERE item_id = ${item_id} AND godown_id = ${godown_id}`
      );
      const opening_qty = openRows.length ? Number(openRows[0].open_qty) || 0 : 0;
      const opening_value = openRows.length ? Number(openRows[0].open_value) || 0 : 0;

      const rows = await db.all(
        sql`SELECT
              v.voucher_id     AS voucher_id,
              v.date           AS date,
              COALESCE(v.party_name, v.narration, '') AS particulars,
              v.voucher_type   AS voucher_type,
              v.voucher_number AS voucher_number,
              SUM(COALESCE(vse.quantity, 0)) AS qty,
              SUM(COALESCE(vse.amount, 0))   AS value
            FROM ${voucherStockEntries} vse
            INNER JOIN ${vouchers} v ON v.voucher_id = vse.voucher_id
            WHERE v.company_id = ${company_id}
              AND v.fy_id = ${fy_id}
              AND vse.godown_id = ${godown_id}
              AND vse.stock_item_id = ${item_id}
              AND v.is_cancelled = 0
              AND COALESCE(v.is_optional, 0) = 0
              AND COALESCE(v.is_post_dated, 0) = 0
              ${dateFrom}${dateTo}
            GROUP BY v.voucher_id
            ORDER BY v.date ASC, v.voucher_id ASC`
      );

      let runningQty = opening_qty, runningValue = opening_value;
      const result = rows.map(r => {
        const isInward = INWARD_TYPES.includes(r.voucher_type);
        const qty = Number(r.qty) || 0;
        const value = Number(r.value) || 0;
        const inwards_qty   = isInward ? qty : null;
        const inwards_value = isInward ? value : null;
        const outwards_qty   = isInward ? null : qty;
        const outwards_value = isInward ? null : value;
        runningQty   += (inwards_qty || 0) - (outwards_qty || 0);
        runningValue += (inwards_value || 0) - (outwards_value || 0);
        return {
          voucher_id: r.voucher_id, date: r.date, particulars: r.particulars,
          voucher_type: r.voucher_type, voucher_number: r.voucher_number,
          inwards_qty, inwards_value, outwards_qty, outwards_value,
          closing_qty: runningQty, closing_value: runningValue,
        };
      });
      return { success: true, opening: { qty: opening_qty, value: opening_value }, rows: result };
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

      // Opening Balance = FY opening + net movement strictly BEFORE from_date, so a
      // month-scoped drill (e.g. March) opens with the running balance carried in,
      // not the FY-start opening. With no from_date it stays at the FY opening.
      let openingQty   = Number(item.opening_quantity) || 0;
      let openingValue = Number(item.opening_value) || 0;
      if (from_date) {
        const priorRows = await db.all(
          sql`SELECT
                COALESCE(SUM(CASE WHEN v.voucher_type IN (${sql.join(INWARD_TYPES.map(t => sql`${t}`), sql`, `)}) THEN vse.quantity ELSE -vse.quantity END), 0) AS net_qty,
                COALESCE(SUM(CASE WHEN v.voucher_type IN (${sql.join(INWARD_TYPES.map(t => sql`${t}`), sql`, `)}) THEN vse.amount   ELSE -vse.amount   END), 0) AS net_value
              FROM ${voucherStockEntries} vse
              INNER JOIN ${vouchers} v ON v.voucher_id = vse.voucher_id
              WHERE v.company_id = ${company_id}
                AND v.fy_id = ${fy_id}
                AND vse.stock_item_id = ${item_id}
                AND v.is_cancelled = 0
                AND COALESCE(v.is_optional, 0) = 0
                AND COALESCE(v.is_post_dated, 0) = 0
                AND v.date < ${from_date}`
        );
        openingQty   += Number(priorRows[0]?.net_qty)   || 0;
        openingValue += Number(priorRows[0]?.net_value) || 0;
      }

      const dateFrom = from_date ? sql` AND v.date >= ${from_date}` : sql``;
      const dateTo   = to_date   ? sql` AND v.date <= ${to_date}`   : sql``;
      const rows = await db.all(
        sql`SELECT
              v.voucher_id     AS voucher_id,
              v.date           AS date,
              COALESCE(v.party_name, v.narration, '') AS particulars,
              v.voucher_type   AS voucher_type,
              v.voucher_number AS voucher_number,
              SUM(COALESCE(vse.quantity, 0)) AS qty,
              SUM(COALESCE(vse.amount, 0))   AS value
            FROM ${voucherStockEntries} vse
            INNER JOIN ${vouchers} v ON v.voucher_id = vse.voucher_id
            WHERE v.company_id = ${company_id}
              AND v.fy_id = ${fy_id}
              AND vse.stock_item_id = ${item_id}
              AND v.is_cancelled = 0
              AND COALESCE(v.is_optional, 0) = 0
              AND COALESCE(v.is_post_dated, 0) = 0
              ${dateFrom}${dateTo}
            GROUP BY v.voucher_id
            ORDER BY v.date ASC, v.voucher_id ASC`
      );

      let runningQty = openingQty;
      let runningValue = openingValue;
      const result = [];

      // Opening Balance row (inwards side, mirrors TallyPrime).
      if (runningQty !== 0 || runningValue !== 0) {
        result.push({
          voucher_id: null,
          date: from_date || null,
          particulars: 'Opening Balance',
          voucher_type: '',
          voucher_number: '',
          inwards_qty: runningQty, inwards_value: runningValue,
          outwards_qty: null, outwards_value: null,
          closing_qty: runningQty, closing_value: runningValue,
        });
      }

      rows.forEach(r => {
        const isInward = INWARD_TYPES.includes(r.voucher_type);
        const qty = Number(r.qty) || 0;
        const value = Number(r.value) || 0;
        const inwards_qty   = isInward ? qty : null;
        const inwards_value = isInward ? value : null;
        const outwards_qty   = isInward ? null : qty;
        const outwards_value = isInward ? null : value;
        runningQty   += (inwards_qty || 0) - (outwards_qty || 0);
        runningValue += (inwards_value || 0) - (outwards_value || 0);
        result.push({
          voucher_id: r.voucher_id, date: r.date, particulars: r.particulars,
          voucher_type: r.voucher_type, voucher_number: r.voucher_number,
          inwards_qty, inwards_value, outwards_qty, outwards_value,
          closing_qty: runningQty, closing_value: runningValue,
        });
      });

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
  inventoryRegisterVouchers: async (company_id, fy_id, voucher_type, from_date, to_date) => {
    try {
      const dateFrom = from_date ? sql` AND v.date >= ${from_date}` : sql``;
      const dateTo   = to_date   ? sql` AND v.date <= ${to_date}`   : sql``;
      const rows = await db.all(
        sql`SELECT
              v.voucher_id     AS voucher_id,
              v.date           AS date,
              COALESCE(v.party_name, v.narration, '') AS particulars,
              v.voucher_type   AS voucher_type,
              v.voucher_number AS voucher_number,
              SUM(CASE WHEN COALESCE(vse.is_source, 0) = 0 THEN COALESCE(vse.quantity, 0) ELSE 0 END) AS inwards_qty,
              SUM(CASE WHEN COALESCE(vse.is_source, 0) = 1 THEN COALESCE(vse.quantity, 0) ELSE 0 END) AS outwards_qty
            FROM ${vouchers} v
            LEFT JOIN ${voucherStockEntries} vse ON vse.voucher_id = v.voucher_id
            WHERE v.company_id = ${company_id}
              AND v.fy_id = ${fy_id}
              AND v.voucher_type = ${voucher_type}
              AND v.is_cancelled = 0
              AND COALESCE(v.is_optional, 0) = 0
              AND COALESCE(v.is_post_dated, 0) = 0
              ${dateFrom}${dateTo}
            GROUP BY v.voucher_id
            ORDER BY v.date ASC, v.voucher_id ASC`
      );
      const result = rows.map(r => ({
        voucher_id: r.voucher_id,
        date: r.date,
        particulars: r.particulars,
        voucher_type: r.voucher_type,
        voucher_number: r.voucher_number,
        inwards_qty: Number(r.inwards_qty) || 0,
        outwards_qty: Number(r.outwards_qty) || 0,
      }));
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
                SUM(CASE WHEN v.voucher_type IN (${sql.join(INWARD_TYPES.map(t => sql`${t}`), sql`, `)})
                         THEN vse.quantity ELSE 0 END) AS inwards_qty,
                SUM(CASE WHEN v.voucher_type IN (${sql.join(INWARD_TYPES.map(t => sql`${t}`), sql`, `)})
                         THEN vse.amount ELSE 0 END) AS inwards_value,
                SUM(CASE WHEN v.voucher_type IN (${sql.join(OUTWARD_TYPES.map(t => sql`${t}`), sql`, `)})
                         THEN vse.quantity ELSE 0 END) AS outwards_qty,
                SUM(CASE WHEN v.voucher_type IN (${sql.join(OUTWARD_TYPES.map(t => sql`${t}`), sql`, `)})
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

      // Run valuation engine for true closing stock valuation
      const valuationData = await calculateClosingStock(company_id, fy_id, as_on_date, method);
      if (valuationData.success) {
        const valMap = new Map();
        for (const v of valuationData.items) {
          valMap.set(v.item_id, v.closing_value);
        }
        for (const it of items) {
          if (valMap.has(it.item_id)) {
            it.closing_value = valMap.get(it.item_id);
          }
        }
      } else {
        // Fallback to simple arithmetic if valuation fails
        for (const it of items) {
          it.closing_value = it.opening_value + it.inwards_value - it.outwards_value;
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