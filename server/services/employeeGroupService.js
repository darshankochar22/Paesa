const { db } = require('../db/index');

const buildTree = (all, parentId = null) => {
  return all
    .filter(g => g.parent_group_id === parentId)
    .map(g => ({ ...g, children: buildTree(all, g.employee_group_id) }));
};

const seedDefaultEmployeeGroups = async (company_id) => {
  const defaults = ['Primary', 'Management', 'Staff', 'Workers'];
  for (const name of defaults) {
    await db.execute(
      `INSERT INTO employee_groups (company_id, name, alias, parent_group_id, is_active, is_predefined)
       VALUES (?, ?, null, null, 1, 1)`,
      [company_id, name]
    );
  }
};

module.exports = {
  seedDefaultEmployeeGroups,

  create: async (data) => {
    try {
      const exists = await db.execute(
        `SELECT * FROM employee_groups WHERE company_id = ? AND LOWER(name) = LOWER(?) AND is_active = 1`,
        [data.company_id, data.name]
      );
      if (exists.rows.length > 0) return { success: false, error: 'Employee Group already exists' };

      const result = await db.execute(
        `INSERT INTO employee_groups (company_id, name, alias, parent_group_id, is_active, is_predefined)
         VALUES (?, ?, ?, ?, 1, 0)`,
        [data.company_id, data.name, data.alias || null, data.parent_group_id || null]
      );

      const group = await db.execute(
        `SELECT * FROM employee_groups WHERE employee_group_id = ?`,
        [result.lastInsertRowid]
      );
      return { success: true, group: group.rows[0] };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  getAll: async (company_id) => {
    try {
      const result = await db.execute(
        `SELECT * FROM employee_groups WHERE company_id = ? AND is_active = 1`,
        [company_id]
      );
      return { success: true, employeeGroups: result.rows };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  getById: async (id) => {
    try {
      const result = await db.execute(
        `SELECT * FROM employee_groups WHERE employee_group_id = ?`,
        [id]
      );
      if (result.rows.length === 0) return { success: false, error: 'Employee Group not found' };
      return { success: true, group: result.rows[0] };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  getTree: async (company_id) => {
    try {
      const result = await db.execute(
        `SELECT * FROM employee_groups WHERE company_id = ? AND is_active = 1`,
        [company_id]
      );
      const tree = buildTree(result.rows);
      return { success: true, tree };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  update: async (data) => {
    try {
      const existing = await db.execute(
        `SELECT * FROM employee_groups WHERE employee_group_id = ?`,
        [data.employee_group_id]
      );
      if (existing.rows.length === 0) return { success: false, error: 'Employee Group not found' };
      if (existing.rows[0].is_predefined) return { success: false, error: 'Cannot edit predefined employee groups' };

      const current = existing.rows[0];
      await db.execute(
        `UPDATE employee_groups SET
          name = ?, alias = ?, parent_group_id = ?,
          updated_at = datetime('now')
         WHERE employee_group_id = ?`,
        [
          data.name ?? current.name,
          data.alias ?? current.alias,
          data.parent_group_id ?? current.parent_group_id,
          data.employee_group_id,
        ]
      );

      const updated = await db.execute(
        `SELECT * FROM employee_groups WHERE employee_group_id = ?`,
        [data.employee_group_id]
      );
      return { success: true, group: updated.rows[0] };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  delete: async (id) => {
    try {
      const existing = await db.execute(
        `SELECT * FROM employee_groups WHERE employee_group_id = ?`,
        [id]
      );
      if (existing.rows.length === 0) return { success: false, error: 'Employee Group not found' };
      if (existing.rows[0].is_predefined) return { success: false, error: 'Cannot delete predefined employee groups' };

      const hasChildren = await db.execute(
        `SELECT * FROM employee_groups WHERE parent_group_id = ? AND is_active = 1`,
        [id]
      );
      if (hasChildren.rows.length > 0) return { success: false, error: 'Cannot delete group with sub-groups' };

      const hasEmployees = await db.execute(
        `SELECT * FROM employees WHERE employee_group_id = ? AND is_active = 1`,
        [id]
      );
      if (hasEmployees.rows.length > 0) return { success: false, error: 'Cannot delete group with employees' };

      await db.execute(
        `UPDATE employee_groups SET is_active = 0 WHERE employee_group_id = ?`,
        [id]
      );
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },
};