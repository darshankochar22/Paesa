const { db } = require('../db/index');

module.exports = {

  // ── CREATE ─────────────────────────────────────────────────────────────────
  create: async (data) => {
    try {
      const exists = await db.execute({
        sql: `SELECT item_id FROM stock_items
              WHERE company_id = ? AND LOWER(name) = LOWER(?) AND is_active = 1`,
        args: [data.company_id, data.name],
      });
      if (exists.rows.length > 0)
        return { success: false, error: 'Stock Item already exists' };

      const opening_value = (data.opening_quantity || 0) * (data.opening_rate || 0);

      const result = await db.execute({
        sql: `INSERT INTO stock_items (
                company_id, name, alias,
                group_id, category_id, unit_id,

                gst_applicable,
                hsn_sac, source_of_details, hsn_sac_description,
                hsn_code, sac_code,
                gst_rate_details, source_of_gst_rate, taxability_type,
                gst_rate, cgst_rate, sgst_rate, igst_rate,
                type_of_supply,

                rate_of_duty, statutory_details,

                opening_quantity, opening_rate, opening_value,
                reorder_level, reorder_quantity,
                track_batches, track_expiry,
                has_bom, bom_name,
                is_active
              )
              VALUES (
                ?, ?, ?,
                ?, ?, ?,
                ?,
                ?, ?, ?,
                ?, ?,
                ?, ?, ?,
                ?, ?, ?, ?,
                ?,
                ?, ?,
                ?, ?, ?,
                ?, ?,
                ?, ?,
                ?, ?,
                1
              )`,
        args: [
          data.company_id,
          data.name,
          data.alias || null,

          data.group_id    || null,
          data.category_id || null,
          data.unit_id     || null,

          data.gst_applicable   || 'Not Applicable',

          data.hsn_sac              || null,
          data.source_of_details    || 'As per Company/Stock Group',
          data.hsn_sac_description  || null,
          // keep legacy cols in sync if caller passes them
          data.hsn_code || data.hsn_sac || null,
          data.sac_code || null,

          data.gst_rate_details   || null,
          data.source_of_gst_rate || 'As per Company/Stock Group',
          data.taxability_type    || null,
          data.gst_rate   || 0,
          data.cgst_rate  || 0,
          data.sgst_rate  || 0,
          data.igst_rate  || 0,

          data.type_of_supply || 'Goods',

          data.rate_of_duty     || 0,
          data.statutory_details || null,

          data.opening_quantity || 0,
          data.opening_rate     || 0,
          opening_value,

          data.reorder_level    || 0,
          data.reorder_quantity || 0,

          data.track_batches ? 1 : 0,
          data.track_expiry  ? 1 : 0,

          data.has_bom ? 1 : 0,
          data.bom_name || null,
        ],
      });

      const item = await db.execute({
        sql: `SELECT * FROM stock_items WHERE item_id = ?`,
        args: [Number(result.lastInsertRowid)],
      });
      return { success: true, item: item.rows[0] };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  // ── GET ALL ────────────────────────────────────────────────────────────────
  getAll: async (company_id) => {
    try {
      const result = await db.execute({
        sql: `SELECT * FROM stock_items
              WHERE company_id = ? AND is_active = 1
              ORDER BY name ASC`,
        args: [company_id],
      });
      return { success: true, stockItems: result.rows };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  // ── GET BY ID ──────────────────────────────────────────────────────────────
  getById: async (id) => {
    try {
      const result = await db.execute({
        sql: `SELECT * FROM stock_items WHERE item_id = ?`,
        args: [id],
      });
      if (result.rows.length === 0)
        return { success: false, error: 'Stock Item not found' };
      return { success: true, item: result.rows[0] };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  // ── GET BY GROUP ───────────────────────────────────────────────────────────
  getByGroup: async (company_id, group_id) => {
    try {
      const result = await db.execute({
        sql: `SELECT * FROM stock_items
              WHERE company_id = ? AND group_id = ? AND is_active = 1
              ORDER BY name ASC`,
        args: [company_id, group_id],
      });
      return { success: true, stockItems: result.rows };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  // ── GET BY CATEGORY ────────────────────────────────────────────────────────
  getByCategory: async (company_id, category_id) => {
    try {
      const result = await db.execute({
        sql: `SELECT * FROM stock_items
              WHERE company_id = ? AND category_id = ? AND is_active = 1
              ORDER BY name ASC`,
        args: [company_id, category_id],
      });
      return { success: true, stockItems: result.rows };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  // ── UPDATE ─────────────────────────────────────────────────────────────────
  update: async (data) => {
    try {
      const existing = await db.execute({
        sql: `SELECT * FROM stock_items WHERE item_id = ?`,
        args: [data.item_id],
      });
      if (existing.rows.length === 0)
        return { success: false, error: 'Stock Item not found' };

      const cur = existing.rows[0];

      // duplicate name check
      if (data.name && data.name.toLowerCase() !== cur.name.toLowerCase()) {
        const dupe = await db.execute({
          sql: `SELECT item_id FROM stock_items
                WHERE company_id = ? AND LOWER(name) = LOWER(?)
                  AND is_active = 1 AND item_id != ?`,
          args: [cur.company_id, data.name, data.item_id],
        });
        if (dupe.rows.length > 0)
          return { success: false, error: 'Stock Item name already exists' };
      }

      const qty           = data.opening_quantity ?? cur.opening_quantity;
      const rate          = data.opening_rate     ?? cur.opening_rate;
      const opening_value = qty * rate;

      // resolve hsn_sac: new field takes priority, fall back to legacy hsn_code
      const hsn_sac = data.hsn_sac ?? cur.hsn_sac ?? cur.hsn_code ?? null;

      await db.execute({
        sql: `UPDATE stock_items SET
                name = ?, alias = ?,
                group_id = ?, category_id = ?, unit_id = ?,

                gst_applicable = ?,
                hsn_sac = ?, source_of_details = ?, hsn_sac_description = ?,
                hsn_code = ?, sac_code = ?,
                gst_rate_details = ?, source_of_gst_rate = ?, taxability_type = ?,
                gst_rate = ?, cgst_rate = ?, sgst_rate = ?, igst_rate = ?,
                type_of_supply = ?,

                rate_of_duty = ?, statutory_details = ?,

                opening_quantity = ?, opening_rate = ?, opening_value = ?,
                reorder_level = ?, reorder_quantity = ?,
                track_batches = ?, track_expiry = ?,
                has_bom = ?, bom_name = ?,

                updated_at = datetime('now')
              WHERE item_id = ?`,
        args: [
          data.name  ?? cur.name,
          data.alias ?? cur.alias,

          data.group_id    ?? cur.group_id,
          data.category_id ?? cur.category_id,
          data.unit_id     ?? cur.unit_id,

          data.gst_applicable  ?? cur.gst_applicable,

          hsn_sac,
          data.source_of_details   ?? cur.source_of_details,
          data.hsn_sac_description ?? cur.hsn_sac_description,
          data.hsn_code ?? hsn_sac,   // keep legacy in sync
          data.sac_code ?? cur.sac_code,

          data.gst_rate_details   ?? cur.gst_rate_details,
          data.source_of_gst_rate ?? cur.source_of_gst_rate,
          data.taxability_type    ?? cur.taxability_type,
          data.gst_rate  ?? cur.gst_rate,
          data.cgst_rate ?? cur.cgst_rate,
          data.sgst_rate ?? cur.sgst_rate,
          data.igst_rate ?? cur.igst_rate,

          data.type_of_supply ?? cur.type_of_supply,

          data.rate_of_duty     ?? cur.rate_of_duty,
          data.statutory_details ?? cur.statutory_details,

          qty, rate, opening_value,

          data.reorder_level    ?? cur.reorder_level,
          data.reorder_quantity ?? cur.reorder_quantity,

          data.track_batches !== undefined
            ? (data.track_batches ? 1 : 0)
            : cur.track_batches,
          data.track_expiry !== undefined
            ? (data.track_expiry ? 1 : 0)
            : cur.track_expiry,

          data.has_bom !== undefined
            ? (data.has_bom ? 1 : 0)
            : cur.has_bom,
          data.bom_name ?? cur.bom_name,

          data.item_id,
        ],
      });

      const updated = await db.execute({
        sql: `SELECT * FROM stock_items WHERE item_id = ?`,
        args: [data.item_id],
      });
      return { success: true, item: updated.rows[0] };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  // ── DELETE (soft) ──────────────────────────────────────────────────────────
  delete: async (id) => {
    try {
      const existing = await db.execute({
        sql: `SELECT item_id FROM stock_items WHERE item_id = ?`,
        args: [id],
      });
      if (existing.rows.length === 0)
        return { success: false, error: 'Stock Item not found' };

      await db.execute({
        sql: `UPDATE stock_items SET is_active = 0 WHERE item_id = ?`,
        args: [id],
      });
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

      const result = await db.execute({
        sql: `
          SELECT
            si.item_id,
            si.opening_quantity,
            COALESCE(SUM(
              CASE
                WHEN v.voucher_type IN (${stockInTypes.map(() => '?').join(',')})
                  THEN vse.quantity
                WHEN v.voucher_type IN (${stockOutTypes.map(() => '?').join(',')})
                  THEN -vse.quantity
                WHEN v.voucher_type IN ('Stock Journal', 'Manufacturing Journal') AND vse.is_source = 0
                  THEN vse.quantity
                WHEN v.voucher_type IN ('Stock Journal', 'Manufacturing Journal') AND vse.is_source = 1
                  THEN -vse.quantity
                ELSE 0
              END
            ), 0) AS movement_qty
          FROM stock_items si
          LEFT JOIN voucher_stock_entries vse ON vse.stock_item_id = si.item_id
          LEFT JOIN vouchers v ON v.voucher_id = vse.voucher_id AND v.is_cancelled = 0
          WHERE si.company_id = ? AND si.is_active = 1
          GROUP BY si.item_id
          ORDER BY si.name ASC
        `,
        args: [...stockInTypes, ...stockOutTypes, company_id],
      });

      const balances = {};
      for (const row of result.rows) {
        const opening = Number(row.opening_quantity) || 0;
        const movement = Number(row.movement_qty) || 0;
        balances[row.item_id] = opening + movement;
      }

      // ── Apply Physical Stock adjustments ──────────────────────────────────
      // Latest physical stock entry overrides the computed balance for that item.
      // Voucher movements after the physical stock date are added on top.
      try {
        const physResult = await db.execute({
          sql: `
            SELECT psel.stock_item_id, psel.quantity, pse.voucher_date
            FROM physical_stock_entry_lines psel
            JOIN physical_stock_entries pse ON pse.physical_stock_entry_id = psel.physical_stock_entry_id
            WHERE pse.company_id = ? AND psel.stock_item_id IS NOT NULL
            ORDER BY pse.voucher_date DESC
          `,
          args: [company_id],
        });

        const seenItems = new Set();
        for (const ph of physResult.rows) {
          const itemId = ph.stock_item_id;
          if (seenItems.has(itemId)) continue;
          seenItems.add(itemId);

          const physicalQty = Number(ph.quantity) || 0;
          const physDate = ph.voucher_date;

          // Compute voucher movement after physical stock date for this item
          if (physDate) {
            const postPhysResult = await db.execute({
              sql: `
                SELECT COALESCE(SUM(
                  CASE
                    WHEN v.voucher_type IN (${stockInTypes.map(() => '?').join(',')})
                      THEN vse.quantity
                    WHEN v.voucher_type IN (${stockOutTypes.map(() => '?').join(',')})
                      THEN -vse.quantity
                    WHEN v.voucher_type IN ('Stock Journal', 'Manufacturing Journal') AND vse.is_source = 0
                      THEN vse.quantity
                    WHEN v.voucher_type IN ('Stock Journal', 'Manufacturing Journal') AND vse.is_source = 1
                      THEN -vse.quantity
                    ELSE 0
                  END
                ), 0) AS post_qty
                FROM voucher_stock_entries vse
                JOIN vouchers v ON v.voucher_id = vse.voucher_id AND v.is_cancelled = 0
                WHERE vse.stock_item_id = ? AND v.date > ?
              `,
              args: [...stockInTypes, ...stockOutTypes, itemId, physDate],
            });
            const postMovement = Number(postPhysResult.rows[0]?.post_qty) || 0;
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
};