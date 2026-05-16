const { db } = require('../db/index');

module.exports = {
  create: async (data) => {
    try {
      const exists = await db.execute(
        `SELECT * FROM stock_categories WHERE company_id = ? AND LOWER(name) = LOWER(?) AND is_active = 1`,
        [data.company_id, data.name]
      );
      if (exists.rows.length > 0) return { success: false, error: 'Stock Category already exists' };

      const result = await db.execute(
        `INSERT INTO stock_categories (company_id, name, description, parent_category_id, is_active)
         VALUES (?, ?, ?, ?, 1)`,
        [data.company_id, data.name, data.description || null, data.parent_category_id || null]
      );

      const category = await db.execute(
        `SELECT * FROM stock_categories WHERE sc_id = ?`,
        [result.lastInsertRowid]
      );
      return { success: true, category: category.rows[0] };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  getAll: async (company_id) => {
    try {
      const result = await db.execute(
        `SELECT * FROM stock_categories WHERE company_id = ? AND is_active = 1`,
        [company_id]
      );
      return { success: true, stockCategories: result.rows };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  getById: async (id) => {
    try {
      const result = await db.execute(
        `SELECT * FROM stock_categories WHERE sc_id = ?`,
        [id]
      );
      if (result.rows.length === 0) return { success: false, error: 'Stock Category not found' };
      return { success: true, category: result.rows[0] };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  update: async (data) => {
    try {
      const existing = await db.execute(
        `SELECT * FROM stock_categories WHERE sc_id = ?`,
        [data.sc_id]
      );
      if (existing.rows.length === 0) return { success: false, error: 'Stock Category not found' };

      const current = existing.rows[0];
      await db.execute(
        `UPDATE stock_categories SET
          name = ?, description = ?, parent_category_id = ?, updated_at = datetime('now')
         WHERE sc_id = ?`,
        [
          data.name ?? current.name,
          data.description ?? current.description,
          data.parent_category_id ?? current.parent_category_id,
          data.sc_id,
        ]
      );

      const updated = await db.execute(
        `SELECT * FROM stock_categories WHERE sc_id = ?`,
        [data.sc_id]
      );
      return { success: true, category: updated.rows[0] };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  delete: async (id) => {
    try {
      const existing = await db.execute(
        `SELECT * FROM stock_categories WHERE sc_id = ?`,
        [id]
      );
      if (existing.rows.length === 0) return { success: false, error: 'Stock Category not found' };

      const hasChildren = await db.execute(
        `SELECT * FROM stock_categories WHERE parent_category_id = ? AND is_active = 1`,
        [id]
      );
      if (hasChildren.rows.length > 0) return { success: false, error: 'Cannot delete category with subcategories' };

      await db.execute(
        `UPDATE stock_categories SET is_active = 0 WHERE sc_id = ?`,
        [id]
      );
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },
};