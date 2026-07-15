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

/**
 * Nest a flat list of stock items into the stock-group tree and roll up
 * qty/value totals — the shared shape consumed by both the (closing) Stock
 * Summary and the Opening Stock Summary, so the two can never drift apart.
 *
 * `items` must already carry: group_id, closing_qty, closing_value, unit_name
 * (the "closing_*" keys hold whatever balance the caller is reporting —
 * closing for Stock Summary, opening for Opening Stock Summary).
 * `allGroups` rows must carry: group_id, group_name, parent_group_id.
 *
 * Returns { rootItems, groups, totalClosingQty, totalQtyDisplayable, totalClosingValue }.
 */
function nestStockItemsIntoGroups(items, allGroups) {
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
      .map((id) => allGroups.find((g) => g.group_id === id))
      .filter(Boolean)
      .map(buildNode);

    let closing_qty = directItems.reduce((s, it) => s + it.closing_qty, 0);
    let closing_value = directItems.reduce((s, it) => s + it.closing_value, 0);
    let item_count = directItems.length;
    const unitSet = new Set(directItems.map((it) => it.unit_name || ''));
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

  // Tally's default "Primary" group is never rendered as a wrapper row: the
  // items sitting directly under it appear at the top level of Stock Summary,
  // and any real sub-groups under Primary are promoted to root. So Primary is
  // flattened away here (its direct items join rootItems, its children become
  // root groups) — the summary opens as a flat item list, exactly like Tally,
  // instead of forcing a drill into a "Primary" group first.
  const isPrimary = (g) => (g.group_name || '').trim().toLowerCase() === 'primary';
  const topLevelGroups = allGroups.filter((g) => g.parent_group_id == null);
  const rootGroupNodes = [];
  const rootItems = [...(directItemsByGroup.get('ungrouped') || [])];
  for (const g of topLevelGroups) {
    const node = buildNode(g);
    if (isPrimary(g)) {
      rootItems.push(...node.items);
      rootGroupNodes.push(...node.childGroups);
    } else {
      rootGroupNodes.push(node);
    }
  }

  const stripInternal = (node) => {
    const { unit_set, ...rest } = node;
    return { ...rest, childGroups: rest.childGroups.map(stripInternal) };
  };

  const groups = rootGroupNodes
    .map(stripInternal)
    .sort((a, b) => (a.group_name || '').localeCompare(b.group_name || ''));

  const topLevelUnitSet = new Set([
    ...rootItems.map((it) => it.unit_name || '').filter((u) => u !== ''),
    ...groups
      .filter((g) => g.qty_displayable)
      .map((g) => g.unit_name || '')
      .filter((u) => u !== ''),
  ]);
  const totalQtyDisplayable = topLevelUnitSet.size <= 1;
  const totalClosingQty = totalQtyDisplayable
    ? rootItems.reduce((s, it) => s + it.closing_qty, 0) +
      groups.reduce((s, g) => s + g.closing_qty, 0)
    : 0;
  const totalClosingValue = items.reduce((s, it) => s + it.closing_value, 0);

  return { rootItems, groups, totalClosingQty, totalQtyDisplayable, totalClosingValue };
}

module.exports = {
  // ── Stock Item Vouchers: voucher register for a single item (all godowns) ─
  stockItemVouchers: async (company_id, fy_id, item_id, from_date, to_date) => {
    try {
      const itemRows = await db.all(
        sql`SELECT name, COALESCE(opening_quantity, 0) AS opening_quantity, COALESCE(opening_value, 0) AS opening_value
            FROM ${stockItems} WHERE item_id = ${item_id} AND company_id = ${company_id}`,
      );
      const item = itemRows.length
        ? itemRows[0]
        : { name: '', opening_quantity: 0, opening_value: 0 };

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
            ORDER BY v.date ASC, v.voucher_id ASC, vse.stock_entry_id ASC`,
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
            WHERE v.company_id = ${company_id} AND v.fy_id = ${fy_id} AND v.voucher_type = ${voucher_type}`,
      );

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
      const months = MONTH_NAMES.map((name, idx) => {
        let m = idx + 4,
          y = startYear;
        if (m > 12) {
          m -= 12;
          y = startYear + 1;
        }
        const prefix = `${y}-${String(m).padStart(2, '0')}`;
        const monthVouchers = voucherRows.filter((v) => v.date && v.date.startsWith(prefix));
        const active = monthVouchers.filter(
          (v) => v.is_cancelled === 0 && v.is_optional === 0 && v.is_post_dated === 0,
        );
        const cancelled = monthVouchers.filter((v) => v.is_cancelled === 1);
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
      const dateTo = to_date ? sql` AND v.date <= ${to_date}` : sql``;
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
            ORDER BY date ASC, voucher_id ASC`,
      );
      const result = rows.map((r) => {
        const qty = Number(r.quantity) || 0;
        let inwards_qty = 0,
          outwards_qty = 0;
        if (r.voucher_type === 'Rejection In') {
          outwards_qty = -qty; // reversing: negative Outward
        } else if (r.voucher_type === 'Rejection Out') {
          inwards_qty = -qty; // reversing: negative Inward
        } else {
          const dir = entryDirection(r.voucher_type, r.is_source);
          if (dir === 'out') outwards_qty = qty;
          else inwards_qty = qty; // 'in' or non-movement fallback
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
            WHERE company_id = ${company_id} AND is_active = 1`,
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
            ORDER BY sg.name ASC, si.name ASC`,
      );

      const items = rows.map((r) => {
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
          rate: 0, // derived after valuation below
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

      const nested = nestStockItemsIntoGroups(items, allGroups);

      return {
        success: true,
        as_on_date: as_on_date || null,
        items,
        ...nested,
      };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  // ── Opening Stock Summary: the stock items' own opening balances, nested into
  // the stock-group tree — the drill target for "Opening Stock" on the P&L /
  // Trading account. This is a static snapshot (no movements), so it always
  // totals SUM(opening_value) exactly like the P&L Opening Stock line — never
  // the closing valuation (which includes inwards/outwards). Same return shape
  // as stockSummary so the client renders it with the same layout. ────────────
  openingStockSummary: async (company_id, fy_id) => {
    try {
      const allGroups = await db.all(
        sql`SELECT sg_id AS group_id, name AS group_name, parent_group_id
            FROM ${stockGroups}
            WHERE company_id = ${company_id} AND is_active = 1`,
      );

      const rows = await db.all(
        sql`SELECT
              si.item_id  AS item_id,
              si.name     AS item_name,
              si.group_id AS group_id,
              sg.name     AS group_name,
              u.name      AS unit_name,
              COALESCE(si.opening_quantity, 0) AS opening_qty,
              COALESCE(si.opening_value, 0)    AS opening_value
            FROM ${stockItems} si
            LEFT JOIN ${stockGroups} sg ON sg.sg_id = si.group_id
            LEFT JOIN ${units} u ON u.unit_id = si.unit_id
            WHERE si.company_id = ${company_id}
              AND si.is_active = 1
            ORDER BY sg.name ASC, si.name ASC`,
      );

      // Report opening qty/value under the shared "closing_*" keys the nesting
      // helper and the client layout expect; rate is opening value / opening qty.
      const items = rows.map((r) => {
        const opening_qty = Number(r.opening_qty) || 0;
        const opening_value = Number(r.opening_value) || 0;
        return {
          item_id: r.item_id,
          item_name: r.item_name,
          group_id: r.group_id,
          group_name: r.group_name || 'Ungrouped',
          unit_name: r.unit_name || '',
          closing_qty: opening_qty,
          closing_value: opening_value,
          rate: opening_qty !== 0 ? opening_value / opening_qty : 0,
        };
      });

      const nested = nestStockItemsIntoGroups(items, allGroups);

      return {
        success: true,
        as_on_date: null,
        items,
        ...nested,
      };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },
};
