const { db } = require('../db/index');

module.exports = {
  create: async (data) => {
    try {
      const exists = await db.execute({
        sql: `SELECT * FROM stock_categories WHERE company_id = ? AND LOWER(name) = LOWER(?) AND is_active = 1`,
        args: [data.company_id, data.name],
      });
      if (exists.rows.length > 0) return { success: false, error: 'Stock Category already exists' };

      const result = await db.execute({
        sql: `INSERT INTO stock_categories (company_id, name, description, parent_category_id, is_active)
              VALUES (?, ?, ?, ?, 1)`,
        args: [
          data.company_id,
          data.name,
          data.description || null,
          data.parent_category_id || null,
        ],
      });

      const category = await db.execute({
        sql: `SELECT * FROM stock_categories WHERE sc_id = ?`,
        args: [Number(result.lastInsertRowid)],
      });
      return { success: true, category: category.rows[0] };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  getAll: async (company_id) => {
    try {
      const result = await db.execute({
        sql: `SELECT * FROM stock_categories WHERE company_id = ? AND is_active = 1`,
        args: [company_id],
      });
      return { success: true, stockCategories: result.rows };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  getById: async (id) => {
    try {
      const result = await db.execute({
        sql: `SELECT * FROM stock_categories WHERE sc_id = ?`,
        args: [id],
      });
      if (result.rows.length === 0) return { success: false, error: 'Stock Category not found' };
      return { success: true, category: result.rows[0] };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  update: async (data) => {
    try {
      const existing = await db.execute({
        sql: `SELECT * FROM stock_categories WHERE sc_id = ?`,
        args: [data.sc_id],
      });
      if (existing.rows.length === 0) return { success: false, error: 'Stock Category not found' };

      const current = existing.rows[0];

      if (data.name && data.name.toLowerCase() !== current.name.toLowerCase()) {
        const dupe = await db.execute({
          sql: `SELECT * FROM stock_categories WHERE company_id = ? AND LOWER(name) = LOWER(?) AND is_active = 1 AND sc_id != ?`,
          args: [current.company_id, data.name, data.sc_id],
        });
        if (dupe.rows.length > 0) return { success: false, error: 'Stock Category name already exists' };
      }

      await db.execute({
        sql: `UPDATE stock_categories SET
                name = ?, description = ?, parent_category_id = ?,
                updated_at = datetime('now')
              WHERE sc_id = ?`,
        args: [
          data.name               ?? current.name,
          data.description        ?? current.description,
          data.parent_category_id ?? current.parent_category_id,
          data.sc_id,
        ],
      });

      const updated = await db.execute({
        sql: `SELECT * FROM stock_categories WHERE sc_id = ?`,
        args: [data.sc_id],
      });
      return { success: true, category: updated.rows[0] };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  delete: async (id) => {
    try {
      const existing = await db.execute({
        sql: `SELECT * FROM stock_categories WHERE sc_id = ?`,
        args: [id],
      });
      if (existing.rows.length === 0) return { success: false, error: 'Stock Category not found' };

      const hasChildren = await db.execute({
        sql: `SELECT * FROM stock_categories WHERE parent_category_id = ? AND is_active = 1`,
        args: [id],
      });
      if (hasChildren.rows.length > 0) return { success: false, error: 'Cannot delete category with subcategories' };

      // future-proof: uncomment when stock items reference categories
      // const inUse = await db.execute({
      //   sql: `SELECT 1 FROM stock_items WHERE category_id = ? AND is_active = 1 LIMIT 1`,
      //   args: [id],
      // });
      // if (inUse.rows.length > 0) return { success: false, error: 'Category is used by stock items' };

      await db.execute({
        sql: `UPDATE stock_categories SET is_active = 0 WHERE sc_id = ?`,
        args: [id],
      });
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },
};