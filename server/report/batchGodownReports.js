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
const { buildVoucherRegister } = require('./stockRegisterBuilder');

module.exports = {
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
            GROUP BY name`,
      );
      // Opening-balance batches (carry mfg/expiry on the master allocation).
      const openRows = await db.all(
        sql`SELECT COALESCE(oa.batch_number, 'Primary Batch') AS name,
                   MAX(oa.mfg_date)    AS mfg_date,
                   MAX(oa.expiry_date) AS expiry_date
            FROM ${stockItemOpeningAllocations} oa
            WHERE oa.item_id = ${item_id}
              AND oa.batch_number IS NOT NULL AND oa.batch_number <> ''
            GROUP BY name`,
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
      return {
        success: true,
        batches: batches.length
          ? batches
          : [{ name: 'Primary Batch', mfg_date: null, expiry_date: null }],
      };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  // Voucher register for a single stock item + batch (Batch Vouchers report).
  batchVouchers: async (company_id, fy_id, item_id, batch, from_date, to_date) => {
    try {
      const { voucherBatches } = require('../db/schema');
      const dateFrom = from_date ? sql` AND v.date >= ${from_date}` : sql``;
      const dateTo = to_date ? sql` AND v.date <= ${to_date}` : sql``;

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
            ORDER BY v.date ASC, v.voucher_id ASC`,
      );

      // Closing stock is valued at weighted-average cost (inwards only), the way
      // TallyPrime shows it — e.g. 5 Box left of a 750-cost batch → 3,750, not
      // (inward value − sale value). Outward value still shows the sale amount.
      let runningQty = 0;
      let inwardQty = 0;
      let inwardValue = 0;
      const result = rows.map((r) => {
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
          inwards_qty: in_qty || null,
          inwards_value: in_qty ? in_value : null,
          outwards_qty: out_qty || null,
          outwards_value: out_qty ? out_value : null,
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
        sql`SELECT godown_id, name FROM godowns WHERE godown_id = ${godown_id} AND company_id = ${company_id}`,
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
            ORDER BY v.date ASC, v.voucher_id ASC, vse.stock_entry_id ASC`,
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
            GROUP BY soa.item_id, si.name, si.group_id, sg.name, u.name`,
      );

      const byItem = new Map();
      const seed = (r) => {
        if (!byItem.has(r.item_id)) {
          byItem.set(r.item_id, {
            item_id: r.item_id,
            item_name: r.item_name,
            group_id: r.group_id ?? null,
            group_name: r.group_name || null,
            unit_name: r.unit_name || '',
            wa: newWAState(0, 0),
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
        .filter((e) => e.wa.qty !== 0 || e.wa.value !== 0)
        .map((e) => ({
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
        sql`SELECT name FROM ${stockItems} WHERE item_id = ${item_id} AND company_id = ${company_id}`,
      );
      const item_name = itemRows.length ? itemRows[0].name : '';

      // Per-godown opening allocation seeds the running balance.
      const openRows = await db.all(
        sql`SELECT SUM(COALESCE(quantity, 0)) AS open_qty, SUM(COALESCE(amount, 0)) AS open_value
            FROM stock_item_opening_allocations
            WHERE item_id = ${item_id} AND godown_id = ${godown_id}`,
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
            ORDER BY v.date ASC, v.voucher_id ASC, vse.stock_entry_id ASC`,
      );

      // In/out columns show book values; the running closing value consumes
      // outward stock at weighted-average COST (see stockMovement.applyWA).
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
      const wa = newWAState(opening_qty, opening_value);
      const months = MONTH_NAMES.map((name, idx) => {
        let m = idx + 4,
          y = startYear;
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
          } else if (dir === 'out') {
            out_qty += qty;
            out_value += amt;
          } else {
            continue;
          }
          applyWA(wa, dir, qty, amt);
        }
        return {
          month: name,
          in_qty,
          in_value,
          out_qty,
          out_value,
          closing_qty: wa.qty,
          closing_value: wa.value,
        };
      });
      return {
        success: true,
        item_name,
        opening: { qty: opening_qty, value: opening_value },
        months,
      };
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
            WHERE item_id = ${item_id} AND godown_id = ${godown_id}`,
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
            ORDER BY v.date ASC, v.voucher_id ASC, vse.stock_entry_id ASC`,
      );

      const wa = newWAState(opening_qty, opening_value);
      const {
        openingQty,
        openingValue,
        rows: result,
      } = buildVoucherRegister(entries, wa, from_date, to_date, false);
      return { success: true, opening: { qty: openingQty, value: openingValue }, rows: result };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },
};
