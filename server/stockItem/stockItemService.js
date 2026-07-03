// ---------------------------------------------------------------------------
// Drizzle ORM conversion (pattern: currencyService golden exemplar).
//
//   * MUTATIONS use the query builder: db.insert(...).values(...),
//     db.update(...).set(...).where(...), db.delete(...).where(...).
//   * READS THAT RETURN ROWS TO CALLERS use db.all(sql`SELECT * FROM ${table}
//     WHERE ...`) so the legacy snake_case row shape (item_id, opening_quantity,
//     numeric 0/1 booleans, ...) is preserved exactly for the test oracle.
//   * The getStockBalances analytical query (multi-join, GROUP BY, CASE,
//     dynamic IN lists, COALESCE/SUM) is kept as a typed `sql` query via
//     db.all — still Drizzle and parameterized. Column/table identifiers come
//     from the schema objects.
//   * New-row id after INSERT comes from .returning({ id: table.pkCol }).
// ---------------------------------------------------------------------------
const { db } = require('../db/index');
const { sql, eq, and } = require('drizzle-orm');
const {
  stockItems,
  stockItemOpeningAllocations,
  vouchers,
  voucherStockEntries,
  physicalStockEntries,
  physicalStockEntryLines,
} = require('../db/schema');
const { trackingBilledExpr } = require('../report/services/stockMovement');
// Goods billed by a Purchase/Sales that were already brought in by a linked
// Receipt/Delivery Note must not be counted again (see stockMovement.js). The
// analytical balance queries below reference the tables by full name, so the
// expression is built with those as the "aliases".
const TRACKING_BILLED = trackingBilledExpr('vouchers', 'voucher_stock_entries');

// Fetch stock_items rows in the legacy snake_case shape.
const findItemRow = async (whereSql) => {
  const rows = await db.all(sql`SELECT * FROM ${stockItems} WHERE ${whereSql}`);
  return rows[0];
};

const getAllocations = async (item_id) =>
  db.all(
    sql`SELECT * FROM ${stockItemOpeningAllocations}
        WHERE ${stockItemOpeningAllocations.itemId} = ${item_id}`
  );

const insertAllocation = async (item_id, alloc) => {
  const qty = Number(alloc.quantity) || 0;
  const rate = Number(alloc.rate) || 0;
  const amt = qty * rate;
  await db.insert(stockItemOpeningAllocations).values({
    itemId: item_id,
    godownId: alloc.godown_id ? Number(alloc.godown_id) : null,
    batchNumber: alloc.batch_number || null,
    mfgDate: alloc.mfg_date || null,
    expiryDate: alloc.expiry_date || null,
    quantity: qty,
    rate: rate,
    amount: amt,
  });
};

module.exports = {

  // ── CREATE ─────────────────────────────────────────────────────────────────
  create: async (data) => {
    try {
      const exists = await db.all(
        sql`SELECT ${stockItems.itemId} FROM ${stockItems}
            WHERE ${stockItems.companyId} = ${data.company_id}
              AND LOWER(${stockItems.name}) = LOWER(${data.name})
              AND ${stockItems.isActive} = 1`
      );
      if (exists.length > 0)
        return { success: false, error: 'Stock Item already exists' };

      const opening_value = (data.opening_quantity || 0) * (data.opening_rate || 0);

      const inserted = await db
        .insert(stockItems)
        .values({
          companyId: data.company_id,
          name: data.name,
          alias: data.alias || null,

          groupId: data.group_id || null,
          categoryId: data.category_id || null,
          unitId: data.unit_id || null,

          gstApplicable: data.gst_applicable || 'Not Applicable',

          hsnSac: data.hsn_sac || null,
          sourceOfDetails: data.source_of_details || 'As per Company/Stock Group',
          hsnSacDescription: data.hsn_sac_description || null,
          // keep legacy cols in sync if caller passes them
          hsnCode: data.hsn_code || data.hsn_sac || null,
          sacCode: data.sac_code || null,

          gstRateDetails: data.gst_rate_details || null,
          sourceOfGstRate: data.source_of_gst_rate || 'As per Company/Stock Group',
          taxabilityType: data.taxability_type || null,
          gstRate: data.gst_rate || 0,
          cgstRate: data.cgst_rate || 0,
          sgstRate: data.sgst_rate || 0,
          igstRate: data.igst_rate || 0,

          typeOfSupply: data.type_of_supply || 'Goods',

          rateOfDuty: data.rate_of_duty || 0,
          statutoryDetails: data.statutory_details || null,

          openingQuantity: data.opening_quantity || 0,
          openingRate: data.opening_rate || 0,
          openingValue: opening_value,

          reorderLevel: data.reorder_level || 0,
          reorderQuantity: data.reorder_quantity || 0,

          trackBatches: data.track_batches ? 1 : 0,
          trackExpiry: data.track_expiry ? 1 : 0,

          trackDateOfManufacturing: data.track_date_of_manufacturing ? 1 : 0,
          enableCostTracking: data.enable_cost_tracking ? 1 : 0,

          hasBom: data.has_bom ? 1 : 0,
          bomName: data.bom_name || null,

          exciseApplicable: data.excise_applicable || 'Not Applicable',
          exciseDetails: data.excise_details || null,
          exciseTariffName: data.excise_tariff_name || null,
          exciseTariffHsnCode: data.excise_tariff_hsn_code || null,
          exciseTariffUom: data.excise_tariff_uom || 'Undefined',
          exciseTariffValuationType: data.excise_tariff_valuation_type || 'Undefined',
          exciseTariffRate: data.excise_tariff_rate || 0,
          exciseTariffRatePerUnit: data.excise_tariff_rate_per_unit || 0,
          vatApplicable: data.vat_applicable || 'Applicable',
          vatDetails: data.vat_details || null,

          isActive: 1,
        })
        .returning({ id: stockItems.itemId });

      const itemId = Number(inserted[0].id);

      if (Array.isArray(data.allocations) && data.allocations.length > 0) {
        for (const alloc of data.allocations) {
          await insertAllocation(itemId, alloc);
        }
      }

      const itemData = await findItemRow(sql`${stockItems.itemId} = ${itemId}`);
      itemData.allocations = await getAllocations(itemId);

      return { success: true, item: itemData };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  // ── GET ALL ────────────────────────────────────────────────────────────────
  getAll: async (company_id) => {
    try {
      const rows = await db.all(
        sql`SELECT * FROM ${stockItems}
            WHERE ${stockItems.companyId} = ${company_id} AND ${stockItems.isActive} = 1
            ORDER BY ${stockItems.name} ASC`
      );
      return { success: true, stockItems: rows };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  // ── GET BY ID ──────────────────────────────────────────────────────────────
  getById: async (id) => {
    try {
      const item = await findItemRow(sql`${stockItems.itemId} = ${id}`);
      if (!item)
        return { success: false, error: 'Stock Item not found' };

      item.allocations = await getAllocations(id);

      return { success: true, item };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  // ── GET BY GROUP ───────────────────────────────────────────────────────────
  getByGroup: async (company_id, group_id) => {
    try {
      const rows = await db.all(
        sql`SELECT * FROM ${stockItems}
            WHERE ${stockItems.companyId} = ${company_id}
              AND ${stockItems.groupId} = ${group_id}
              AND ${stockItems.isActive} = 1
            ORDER BY ${stockItems.name} ASC`
      );
      return { success: true, stockItems: rows };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  // ── GET BY CATEGORY ────────────────────────────────────────────────────────
  getByCategory: async (company_id, category_id) => {
    try {
      const rows = await db.all(
        sql`SELECT * FROM ${stockItems}
            WHERE ${stockItems.companyId} = ${company_id}
              AND ${stockItems.categoryId} = ${category_id}
              AND ${stockItems.isActive} = 1
            ORDER BY ${stockItems.name} ASC`
      );
      return { success: true, stockItems: rows };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  // ── UPDATE ─────────────────────────────────────────────────────────────────
  update: async (data) => {
    try {
      const cur = await findItemRow(sql`${stockItems.itemId} = ${data.item_id}`);
      if (!cur)
        return { success: false, error: 'Stock Item not found' };

      // duplicate name check
      if (data.name && data.name.toLowerCase() !== cur.name.toLowerCase()) {
        const dupe = await db.all(
          sql`SELECT ${stockItems.itemId} FROM ${stockItems}
              WHERE ${stockItems.companyId} = ${cur.company_id}
                AND LOWER(${stockItems.name}) = LOWER(${data.name})
                AND ${stockItems.isActive} = 1
                AND ${stockItems.itemId} != ${data.item_id}`
        );
        if (dupe.length > 0)
          return { success: false, error: 'Stock Item name already exists' };
      }

      const qty = data.opening_quantity ?? cur.opening_quantity;
      const rate = data.opening_rate ?? cur.opening_rate;
      const opening_value = qty * rate;

      // resolve hsn_sac: new field takes priority, fall back to legacy hsn_code
      const hsn_sac = data.hsn_sac ?? cur.hsn_sac ?? cur.hsn_code ?? null;

      await db
        .update(stockItems)
        .set({
          name: data.name ?? cur.name,
          alias: data.alias ?? cur.alias,

          groupId: data.group_id ?? cur.group_id,
          categoryId: data.category_id ?? cur.category_id,
          unitId: data.unit_id ?? cur.unit_id,

          gstApplicable: data.gst_applicable ?? cur.gst_applicable,

          hsnSac: hsn_sac,
          sourceOfDetails: data.source_of_details ?? cur.source_of_details,
          hsnSacDescription: data.hsn_sac_description ?? cur.hsn_sac_description,
          hsnCode: data.hsn_code ?? hsn_sac, // keep legacy in sync
          sacCode: data.sac_code ?? cur.sac_code,

          gstRateDetails: data.gst_rate_details ?? cur.gst_rate_details,
          sourceOfGstRate: data.source_of_gst_rate ?? cur.source_of_gst_rate,
          taxabilityType: data.taxability_type ?? cur.taxability_type,
          gstRate: data.gst_rate ?? cur.gst_rate,
          cgstRate: data.cgst_rate ?? cur.cgst_rate,
          sgstRate: data.sgst_rate ?? cur.sgst_rate,
          igstRate: data.igst_rate ?? cur.igst_rate,

          typeOfSupply: data.type_of_supply ?? cur.type_of_supply,

          rateOfDuty: data.rate_of_duty ?? cur.rate_of_duty,
          statutoryDetails: data.statutory_details ?? cur.statutory_details,

          openingQuantity: qty,
          openingRate: rate,
          openingValue: opening_value,

          reorderLevel: data.reorder_level ?? cur.reorder_level,
          reorderQuantity: data.reorder_quantity ?? cur.reorder_quantity,

          trackBatches:
            data.track_batches !== undefined
              ? (data.track_batches ? 1 : 0)
              : cur.track_batches,
          trackExpiry:
            data.track_expiry !== undefined
              ? (data.track_expiry ? 1 : 0)
              : cur.track_expiry,

          trackDateOfManufacturing:
            data.track_date_of_manufacturing !== undefined
              ? (data.track_date_of_manufacturing ? 1 : 0)
              : cur.track_date_of_manufacturing,
          enableCostTracking:
            data.enable_cost_tracking !== undefined
              ? (data.enable_cost_tracking ? 1 : 0)
              : cur.enable_cost_tracking,

          hasBom:
            data.has_bom !== undefined
              ? (data.has_bom ? 1 : 0)
              : cur.has_bom,
          bomName: data.bom_name ?? cur.bom_name,

          exciseApplicable: data.excise_applicable ?? cur.excise_applicable,
          exciseDetails: data.excise_details ?? cur.excise_details,
          exciseTariffName: data.excise_tariff_name ?? cur.excise_tariff_name,
          exciseTariffHsnCode: data.excise_tariff_hsn_code ?? cur.excise_tariff_hsn_code,
          exciseTariffUom: data.excise_tariff_uom ?? cur.excise_tariff_uom,
          exciseTariffValuationType:
            data.excise_tariff_valuation_type ?? cur.excise_tariff_valuation_type,
          exciseTariffRate: data.excise_tariff_rate ?? cur.excise_tariff_rate,
          exciseTariffRatePerUnit:
            data.excise_tariff_rate_per_unit ?? cur.excise_tariff_rate_per_unit,
          vatApplicable: data.vat_applicable ?? cur.vat_applicable,
          vatDetails: data.vat_details ?? cur.vat_details,

          updatedAt: sql`datetime('now')`,
        })
        .where(eq(stockItems.itemId, data.item_id));

      if (data.allocations !== undefined) {
        await db
          .delete(stockItemOpeningAllocations)
          .where(eq(stockItemOpeningAllocations.itemId, data.item_id));

        if (Array.isArray(data.allocations) && data.allocations.length > 0) {
          for (const alloc of data.allocations) {
            await insertAllocation(data.item_id, alloc);
          }
        }
      }

      const item = await findItemRow(sql`${stockItems.itemId} = ${data.item_id}`);
      item.allocations = await getAllocations(data.item_id);

      return { success: true, item };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  // ── DELETE (soft) ──────────────────────────────────────────────────────────
  delete: async (id) => {
    try {
      const existing = await findItemRow(sql`${stockItems.itemId} = ${id}`);
      if (!existing)
        return { success: false, error: 'Stock Item not found' };

      await db
        .update(stockItems)
        .set({ isActive: 0 })
        .where(eq(stockItems.itemId, id));
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  // ── GET STOCK BALANCES ─────────────────────────────────────────────────────
  getStockBalances: async (company_id) => {
    try {
      // Voucher types that increase stock quantity
      const stockInTypes = [
        'Purchase', 'Receipt Note', 'Rejection In', 'Material In', 'Credit Note',
      ];

      // Voucher types that decrease stock quantity
      const stockOutTypes = [
        'Sales', 'Delivery Note', 'Rejection Out', 'Material Out', 'Debit Note',
      ];

      // Complex analytical query kept as typed `sql` (multi-join, GROUP BY, CASE,
      // dynamic IN lists). Identifiers come from the schema objects; the IN-list
      // values and company_id are bound parameters.
      const result = await db.all(
        sql`
          SELECT
            ${stockItems.itemId} AS item_id,
            ${stockItems.openingQuantity} AS opening_quantity,
            COALESCE(SUM(
              CASE
                WHEN ${sql.raw(TRACKING_BILLED)} THEN 0
                WHEN ${vouchers.voucherType} IN (${sql.join(stockInTypes.map((t) => sql`${t}`), sql`, `)})
                  THEN ${voucherStockEntries.quantity}
                WHEN ${vouchers.voucherType} IN (${sql.join(stockOutTypes.map((t) => sql`${t}`), sql`, `)})
                  THEN -${voucherStockEntries.quantity}
                WHEN ${vouchers.voucherType} IN ('Stock Journal', 'Manufacturing Journal') AND ${voucherStockEntries.isSource} = 0
                  THEN ${voucherStockEntries.quantity}
                WHEN ${vouchers.voucherType} IN ('Stock Journal', 'Manufacturing Journal') AND ${voucherStockEntries.isSource} = 1
                  THEN -${voucherStockEntries.quantity}
                ELSE 0
              END
            ), 0) AS movement_qty
          FROM ${stockItems}
          LEFT JOIN ${voucherStockEntries} ON ${voucherStockEntries.stockItemId} = ${stockItems.itemId}
          LEFT JOIN ${vouchers} ON ${vouchers.voucherId} = ${voucherStockEntries.voucherId} AND ${vouchers.isCancelled} = 0
          WHERE ${stockItems.companyId} = ${company_id} AND ${stockItems.isActive} = 1
          GROUP BY ${stockItems.itemId}
          ORDER BY ${stockItems.name} ASC
        `
      );

      const balances = {};
      for (const row of result) {
        const opening = Number(row.opening_quantity) || 0;
        const movement = Number(row.movement_qty) || 0;
        balances[row.item_id] = opening + movement;
      }

      // ── Apply Physical Stock adjustments ──────────────────────────────────
      // Latest physical stock entry overrides the computed balance for that item.
      // Voucher movements after the physical stock date are added on top.
      try {
        const physResult = await db.all(
          sql`
            SELECT ${physicalStockEntryLines.stockItemId} AS stock_item_id,
                   ${physicalStockEntryLines.quantity} AS quantity,
                   ${physicalStockEntries.voucherDate} AS voucher_date
            FROM ${physicalStockEntryLines}
            JOIN ${physicalStockEntries} ON ${physicalStockEntries.physicalStockEntryId} = ${physicalStockEntryLines.physicalStockEntryId}
            WHERE ${physicalStockEntries.companyId} = ${company_id} AND ${physicalStockEntryLines.stockItemId} IS NOT NULL
            ORDER BY ${physicalStockEntries.voucherDate} DESC
          `
        );

        const seenItems = new Set();
        for (const ph of physResult) {
          const itemId = ph.stock_item_id;
          if (seenItems.has(itemId)) continue;
          seenItems.add(itemId);

          const physicalQty = Number(ph.quantity) || 0;
          const physDate = ph.voucher_date;

          // Compute voucher movement after physical stock date for this item
          if (physDate) {
            const postPhysResult = await db.all(
              sql`
                SELECT COALESCE(SUM(
                  CASE
                    WHEN ${vouchers.voucherType} IN (${sql.join(stockInTypes.map((t) => sql`${t}`), sql`, `)})
                      THEN ${voucherStockEntries.quantity}
                    WHEN ${vouchers.voucherType} IN (${sql.join(stockOutTypes.map((t) => sql`${t}`), sql`, `)})
                      THEN -${voucherStockEntries.quantity}
                    WHEN ${vouchers.voucherType} IN ('Stock Journal', 'Manufacturing Journal') AND ${voucherStockEntries.isSource} = 0
                      THEN ${voucherStockEntries.quantity}
                    WHEN ${vouchers.voucherType} IN ('Stock Journal', 'Manufacturing Journal') AND ${voucherStockEntries.isSource} = 1
                      THEN -${voucherStockEntries.quantity}
                    ELSE 0
                  END
                ), 0) AS post_qty
                FROM ${voucherStockEntries}
                JOIN ${vouchers} ON ${vouchers.voucherId} = ${voucherStockEntries.voucherId} AND ${vouchers.isCancelled} = 0
                WHERE ${voucherStockEntries.stockItemId} = ${itemId} AND ${vouchers.date} > ${physDate}
              `
            );
            const postMovement = Number(postPhysResult[0]?.post_qty) || 0;
            balances[itemId] = physicalQty + postMovement;
          } else {
            balances[itemId] = physicalQty;
          }
        }
      } catch (_physErr) { /* keep voucher-only balances */ }

      return { success: true, balances };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  // Per-godown closing balance for ONE stock item — drives the "List of Godowns"
  // quantity column on the Physical Stock voucher. Mirrors getStockBalances'
  // movement signs, grouped by godown, with the latest Physical Stock count
  // overriding a godown's balance (plus post-count movements).
  getStockBalancesByGodown: async (company_id, item_id) => {
    try {
      const stockInTypes = ['Purchase', 'Receipt Note', 'Rejection In', 'Material In', 'Credit Note'];
      const stockOutTypes = ['Sales', 'Delivery Note', 'Rejection Out', 'Material Out', 'Debit Note'];

      const moveRows = await db.all(
        sql`
          SELECT ${voucherStockEntries.godownId} AS godown_id,
            COALESCE(SUM(
              CASE
                WHEN ${sql.raw(TRACKING_BILLED)} THEN 0
                WHEN ${vouchers.voucherType} IN (${sql.join(stockInTypes.map((t) => sql`${t}`), sql`, `)})
                  THEN ${voucherStockEntries.quantity}
                WHEN ${vouchers.voucherType} IN (${sql.join(stockOutTypes.map((t) => sql`${t}`), sql`, `)})
                  THEN -${voucherStockEntries.quantity}
                WHEN ${vouchers.voucherType} IN ('Stock Journal', 'Manufacturing Journal') AND ${voucherStockEntries.isSource} = 0
                  THEN ${voucherStockEntries.quantity}
                WHEN ${vouchers.voucherType} IN ('Stock Journal', 'Manufacturing Journal') AND ${voucherStockEntries.isSource} = 1
                  THEN -${voucherStockEntries.quantity}
                ELSE 0
              END
            ), 0) AS qty
          FROM ${voucherStockEntries}
          JOIN ${vouchers} ON ${vouchers.voucherId} = ${voucherStockEntries.voucherId} AND ${vouchers.isCancelled} = 0
          WHERE ${voucherStockEntries.stockItemId} = ${item_id}
            AND ${vouchers.companyId} = ${company_id}
            AND ${voucherStockEntries.godownId} IS NOT NULL
          GROUP BY ${voucherStockEntries.godownId}
        `
      );

      const balances = {};
      for (const r of moveRows) {
        if (r.godown_id != null) balances[r.godown_id] = Number(r.qty) || 0;
      }

      // Physical Stock overrides per godown (latest count wins, + post-count movement).
      try {
        const physRows = await db.all(
          sql`
            SELECT ${physicalStockEntryLines.godownId} AS godown_id,
                   ${physicalStockEntryLines.quantity} AS quantity,
                   ${physicalStockEntries.voucherDate} AS voucher_date
            FROM ${physicalStockEntryLines}
            JOIN ${physicalStockEntries} ON ${physicalStockEntries.physicalStockEntryId} = ${physicalStockEntryLines.physicalStockEntryId}
            WHERE ${physicalStockEntries.companyId} = ${company_id}
              AND ${physicalStockEntryLines.stockItemId} = ${item_id}
              AND ${physicalStockEntryLines.godownId} IS NOT NULL
            ORDER BY ${physicalStockEntries.voucherDate} DESC
          `
        );
        const seen = new Set();
        for (const ph of physRows) {
          const g = ph.godown_id;
          if (seen.has(g)) continue;
          seen.add(g);
          const physQty = Number(ph.quantity) || 0;
          const physDate = ph.voucher_date;
          if (physDate) {
            const post = await db.all(
              sql`
                SELECT COALESCE(SUM(
                  CASE
                    WHEN ${vouchers.voucherType} IN (${sql.join(stockInTypes.map((t) => sql`${t}`), sql`, `)})
                      THEN ${voucherStockEntries.quantity}
                    WHEN ${vouchers.voucherType} IN (${sql.join(stockOutTypes.map((t) => sql`${t}`), sql`, `)})
                      THEN -${voucherStockEntries.quantity}
                    WHEN ${vouchers.voucherType} IN ('Stock Journal', 'Manufacturing Journal') AND ${voucherStockEntries.isSource} = 0
                      THEN ${voucherStockEntries.quantity}
                    WHEN ${vouchers.voucherType} IN ('Stock Journal', 'Manufacturing Journal') AND ${voucherStockEntries.isSource} = 1
                      THEN -${voucherStockEntries.quantity}
                    ELSE 0
                  END
                ), 0) AS post_qty
                FROM ${voucherStockEntries}
                JOIN ${vouchers} ON ${vouchers.voucherId} = ${voucherStockEntries.voucherId} AND ${vouchers.isCancelled} = 0
                WHERE ${voucherStockEntries.stockItemId} = ${item_id}
                  AND ${voucherStockEntries.godownId} = ${g}
                  AND ${vouchers.date} > ${physDate}
              `
            );
            balances[g] = physQty + (Number(post[0]?.post_qty) || 0);
          } else {
            balances[g] = physQty;
          }
        }
      } catch (_physErr) { /* keep voucher-only balances */ }

      return { success: true, balances };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  // Rate from the item's purchase history — the most recent Purchase voucher line
  // (with a positive rate). Used to auto-fill the rate in Stock Journal entry.
  // Returns { rate: null } when the item has never been purchased.
  getLastPurchaseRate: async (company_id, item_id) => {
    try {
      const rows = await db.all(
        sql`
          SELECT ${voucherStockEntries.rate} AS rate
          FROM ${voucherStockEntries}
          JOIN ${vouchers} ON ${vouchers.voucherId} = ${voucherStockEntries.voucherId}
          WHERE ${voucherStockEntries.stockItemId} = ${item_id}
            AND ${vouchers.companyId} = ${company_id}
            AND ${vouchers.voucherType} = 'Purchase'
            AND ${vouchers.isCancelled} = 0
            AND COALESCE(${vouchers.isOptional}, 0) = 0
            AND COALESCE(${vouchers.isPostDated}, 0) = 0
            AND ${voucherStockEntries.rate} > 0
          ORDER BY ${vouchers.date} DESC, ${vouchers.voucherId} DESC
          LIMIT 1
        `
      );
      const rate = rows.length ? Number(rows[0].rate) || 0 : 0;
      return { success: true, rate: rate > 0 ? rate : null };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  // Active batches for ONE stock item — drives the Physical Stock "List of Active
  // Batches" picker (Name / Expiry / Balance). Balance is each batch's signed
  // movement across vouchers.
  getActiveBatches: async (company_id, item_id) => {
    try {
      const stockInTypes = ['Purchase', 'Receipt Note', 'Rejection In', 'Material In', 'Credit Note'];
      const stockOutTypes = ['Sales', 'Delivery Note', 'Rejection Out', 'Material Out', 'Debit Note'];
      const rows = await db.all(
        sql`
          SELECT vb.batch_number AS name,
                 MAX(vb.expiry_date) AS expiry,
                 COALESCE(SUM(
                   CASE
                     WHEN ${vouchers.voucherType} IN (${sql.join(stockInTypes.map((t) => sql`${t}`), sql`, `)})
                       THEN vb.quantity
                     WHEN ${vouchers.voucherType} IN (${sql.join(stockOutTypes.map((t) => sql`${t}`), sql`, `)})
                       THEN -vb.quantity
                     ELSE 0
                   END
                 ), 0) AS balance
          FROM voucher_batches vb
          JOIN ${voucherStockEntries} ON ${voucherStockEntries.stockEntryId} = vb.stock_entry_id
          JOIN ${vouchers} ON ${vouchers.voucherId} = ${voucherStockEntries.voucherId} AND ${vouchers.isCancelled} = 0
          WHERE ${voucherStockEntries.stockItemId} = ${item_id}
            AND ${vouchers.companyId} = ${company_id}
            AND vb.batch_number IS NOT NULL AND vb.batch_number != ''
          GROUP BY vb.batch_number
          ORDER BY vb.batch_number ASC
        `
      );
      const batches = rows.map((r) => ({ name: r.name, expiry: r.expiry || '', balance: Number(r.balance) || 0 }));
      return { success: true, batches };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },
};
