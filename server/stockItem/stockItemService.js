const { db } = require('../db/index');

module.exports = {
  create: async (data) => {
    try {
      const exists = await db.execute({
        sql: `SELECT * FROM stock_items WHERE company_id = ? AND LOWER(name) = LOWER(?) AND is_active = 1`,
        args: [data.company_id, data.name],
      });
      if (exists.rows.length > 0) return { success: false, error: 'Stock Item already exists' };

      const opening_value = (data.opening_quantity || 0) * (data.opening_rate || 0);

      const result = await db.execute({
        sql: `INSERT INTO stock_items (
                company_id, name, alias, group_id, category_id, unit_id,
                gst_applicable, hsn_code, sac_code,
                gst_rate, cgst_rate, sgst_rate, igst_rate,
                type_of_supply, rate_of_duty, statutory_details,
                opening_quantity, opening_rate, opening_value,
                reorder_level, reorder_quantity,
                track_batches, track_expiry, is_active
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
        args: [
          data.company_id,
          data.name,
          data.alias || null,
          data.group_id || null,
          data.category_id || null,
          data.unit_id || null,
          data.gst_applicable || 'Not Applicable',
          data.hsn_code || null,
          data.sac_code || null,
          data.gst_rate || 0,
          data.cgst_rate || 0,
          data.sgst_rate || 0,
          data.igst_rate || 0,
          data.type_of_supply || 'Goods',
          data.rate_of_duty || 0,
          data.statutory_details || null,
          data.opening_quantity || 0,
          data.opening_rate || 0,
          opening_value,
          data.reorder_level || 0,
          data.reorder_quantity || 0,
          data.track_batches ? 1 : 0,
          data.track_expiry ? 1 : 0,
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

  getAll: async (company_id) => {
    try {
      const result = await db.execute({
        sql: `SELECT * FROM stock_items WHERE company_id = ? AND is_active = 1`,
        args: [company_id],
      });
      return { success: true, stockItems: result.rows };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  getById: async (id) => {
    try {
      const result = await db.execute({
        sql: `SELECT * FROM stock_items WHERE item_id = ?`,
        args: [id],
      });
      if (result.rows.length === 0) return { success: false, error: 'Stock Item not found' };
      return { success: true, item: result.rows[0] };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  getByGroup: async (company_id, group_id) => {
    try {
      const result = await db.execute({
        sql: `SELECT * FROM stock_items WHERE company_id = ? AND group_id = ? AND is_active = 1`,
        args: [company_id, group_id],
      });
      return { success: true, stockItems: result.rows };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  getByCategory: async (company_id, category_id) => {
    try {
      const result = await db.execute({
        sql: `SELECT * FROM stock_items WHERE company_id = ? AND category_id = ? AND is_active = 1`,
        args: [company_id, category_id],
      });
      return { success: true, stockItems: result.rows };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  update: async (data) => {
    try {
      const existing = await db.execute({
        sql: `SELECT * FROM stock_items WHERE item_id = ?`,
        args: [data.item_id],
      });
      if (existing.rows.length === 0) return { success: false, error: 'Stock Item not found' };

      const current = existing.rows[0];

      // duplicate name check
      if (data.name && data.name.toLowerCase() !== current.name.toLowerCase()) {
        const dupe = await db.execute({
          sql: `SELECT * FROM stock_items WHERE company_id = ? AND LOWER(name) = LOWER(?) AND is_active = 1 AND item_id != ?`,
          args: [current.company_id, data.name, data.item_id],
        });
        if (dupe.rows.length > 0) return { success: false, error: 'Stock Item name already exists' };
      }

      const qty          = data.opening_quantity ?? current.opening_quantity;
      const rate         = data.opening_rate     ?? current.opening_rate;
      const opening_value = qty * rate;

      await db.execute({
        sql: `UPDATE stock_items SET
                name = ?, alias = ?, group_id = ?, category_id = ?, unit_id = ?,
                gst_applicable = ?, hsn_code = ?, sac_code = ?,
                gst_rate = ?, cgst_rate = ?, sgst_rate = ?, igst_rate = ?,
                type_of_supply = ?, rate_of_duty = ?, statutory_details = ?,
                opening_quantity = ?, opening_rate = ?, opening_value = ?,
                reorder_level = ?, reorder_quantity = ?,
                track_batches = ?, track_expiry = ?,
                updated_at = datetime('now')
              WHERE item_id = ?`,
        args: [
          data.name              ?? current.name,
          data.alias             ?? current.alias,
          data.group_id          ?? current.group_id,
          data.category_id       ?? current.category_id,
          data.unit_id           ?? current.unit_id,
          data.gst_applicable    ?? current.gst_applicable,
          data.hsn_code          ?? current.hsn_code,
          data.sac_code          ?? current.sac_code,
          data.gst_rate          ?? current.gst_rate,
          data.cgst_rate         ?? current.cgst_rate,
          data.sgst_rate         ?? current.sgst_rate,
          data.igst_rate         ?? current.igst_rate,
          data.type_of_supply    ?? current.type_of_supply,
          data.rate_of_duty      ?? current.rate_of_duty,
          data.statutory_details ?? current.statutory_details,
          qty, rate, opening_value,
          data.reorder_level     ?? current.reorder_level,
          data.reorder_quantity  ?? current.reorder_quantity,
          // fix: don't reset to 0 if field not provided
          data.track_batches !== undefined ? (data.track_batches ? 1 : 0) : current.track_batches,
          data.track_expiry  !== undefined ? (data.track_expiry  ? 1 : 0) : current.track_expiry,
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

  delete: async (id) => {
    try {
      const existing = await db.execute({
        sql: `SELECT * FROM stock_items WHERE item_id = ?`,
        args: [id],
      });
      if (existing.rows.length === 0) return { success: false, error: 'Stock Item not found' };

      // future-proof: uncomment when voucher tables exist
      // const inUse = await db.execute({
      //   sql: `SELECT 1 FROM voucher_items WHERE item_id = ? LIMIT 1`,
      //   args: [id],
      // });
      // if (inUse.rows.length > 0) return { success: false, error: 'Item is used in transactions, cannot delete' };

      await db.execute({
        sql: `UPDATE stock_items SET is_active = 0 WHERE item_id = ?`,
        args: [id],
      });
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },
};