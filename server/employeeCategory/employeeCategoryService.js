const { db } = require('../db/index');

const seedDefaultEmployeeCategory = async (company_id) => {
  await db.execute(
    `INSERT INTO employee_categories (company_id, name, alias, allocate_revenue, allocate_non_revenue, is_active, is_predefined)
     VALUES (?, ?, null, 0, 0, 1, 1)`,
    [company_id, 'Primary Employee Category']
  );
};

module.exports = {
  seedDefaultEmployeeCategory,

  create: async (data) => {
    try {
      const exists = await db.execute(
        `SELECT * FROM employee_categories WHERE company_id = ? AND LOWER(name) = LOWER(?) AND is_active = 1`,
        [data.company_id, data.name]
      );
      if (exists.rows.length > 0) return { success: false, error: 'Employee Category already exists' };

      const result = await db.execute(
        `INSERT INTO employee_categories (company_id, name, alias, allocate_revenue, allocate_non_revenue, is_active, is_predefined)
         VALUES (?, ?, ?, ?, ?, 1, 0)`,
        [
          data.company_id,
          data.name,
          data.alias || null,
          data.allocate_revenue ? 1 : 0,
          data.allocate_non_revenue ? 1 : 0
        ]
      );

      const category = await db.execute(
        `SELECT * FROM employee_categories WHERE employee_category_id = ?`,
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
        `SELECT * FROM employee_categories WHERE company_id = ? AND is_active = 1`,
        [company_id]
      );
      return { success: true, employeeCategories: result.rows };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  getById: async (id) => {
    try {
      const result = await db.execute(
        `SELECT * FROM employee_categories WHERE employee_category_id = ?`,
        [id]
      );
      if (result.rows.length === 0) return { success: false, error: 'Employee Category not found' };
      return { success: true, category: result.rows[0] };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  update: async (data) => {
    try {
      const existing = await db.execute(
        `SELECT * FROM employee_categories WHERE employee_category_id = ?`,
        [data.employee_category_id]
      );
      if (existing.rows.length === 0) return { success: false, error: 'Employee Category not found' };
      if (existing.rows[0].is_predefined) return { success: false, error: 'Cannot edit predefined employee categories' };

      const current = existing.rows[0];
      await db.execute(
        `UPDATE employee_categories SET
          name = ?, alias = ?, allocate_revenue = ?, allocate_non_revenue = ?,
          updated_at = datetime('now')
         WHERE employee_category_id = ?`,
        [
          data.name ?? current.name,
          data.alias ?? current.alias,
          data.allocate_revenue !== undefined ? (data.allocate_revenue ? 1 : 0) : current.allocate_revenue,
          data.allocate_non_revenue !== undefined ? (data.allocate_non_revenue ? 1 : 0) : current.allocate_non_revenue,
          data.employee_category_id,
        ]
      );

      const updated = await db.execute(
        `SELECT * FROM employee_categories WHERE employee_category_id = ?`,
        [data.employee_category_id]
      );
      return { success: true, category: updated.rows[0] };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  delete: async (id) => {
    try {
      const existing = await db.execute(
        `SELECT * FROM employee_categories WHERE employee_category_id = ?`,
        [id]
      );
      if (existing.rows.length === 0) return { success: false, error: 'Employee Category not found' };
      if (existing.rows[0].is_predefined) return { success: false, error: 'Cannot delete predefined employee categories' };

      // Check if any employee groups are using it
      const hasGroups = await db.execute(
        `SELECT * FROM employee_groups WHERE employee_category_id = ? AND is_active = 1`,
        [id]
      );
      if (hasGroups.rows.length > 0) return { success: false, error: 'Cannot delete category with active employee groups' };

      // Check if any employees are using it
      const hasEmployees = await db.execute(
        `SELECT * FROM employees WHERE employee_category_id = ? AND is_active = 1`,
        [id]
      );
      if (hasEmployees.rows.length > 0) return { success: false, error: 'Cannot delete category with active employees' };

      await db.execute(
        `UPDATE employee_categories SET is_active = 0 WHERE employee_category_id = ?`,
        [id]
      );
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },
};
