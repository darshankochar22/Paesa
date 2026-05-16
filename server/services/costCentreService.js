const { db } = require('../db/index');

const buildTree = (all, parentId = null) => {
  return all
    .filter(c => c.parent_id === parentId)
    .map(c => ({ ...c, children: buildTree(all, c.cc_id) }));
};

module.exports = {
  create: async (data) => {
    try {
      const exists = await db.execute(
        `SELECT * FROM cost_centres WHERE company_id = ? AND LOWER(name) = LOWER(?) AND is_active = 1`,
        [data.company_id, data.name]
      );
      if (exists.rows.length > 0) return { success: false, error: 'Cost Centre already exists' };

      const result = await db.execute(
        `INSERT INTO cost_centres (company_id, name, alias, parent_id, category, is_active, is_predefined)
         VALUES (?, ?, ?, ?, ?, 1, 0)`,
        [
          data.company_id,
          data.name,
          data.alias || null,
          data.parent_id || null,
          data.parent_id ? 'Secondary' : 'Primary',
        ]
      );

      const costCentre = await db.execute(
        `SELECT * FROM cost_centres WHERE cc_id = ?`,
        [result.lastInsertRowid]
      );
      return { success: true, costCentre: costCentre.rows[0] };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  getAll: async (company_id) => {
    try {
      const result = await db.execute(
        `SELECT * FROM cost_centres WHERE company_id = ? AND is_active = 1`,
        [company_id]
      );
      return { success: true, costCentres: result.rows };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  getById: async (id) => {
    try {
      const result = await db.execute(
        `SELECT * FROM cost_centres WHERE cc_id = ?`,
        [id]
      );
      if (result.rows.length === 0) return { success: false, error: 'Cost Centre not found' };
      return { success: true, costCentre: result.rows[0] };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  getTree: async (company_id) => {
    try {
      const result = await db.execute(
        `SELECT * FROM cost_centres WHERE company_id = ? AND is_active = 1`,
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
        `SELECT * FROM cost_centres WHERE cc_id = ?`,
        [data.cc_id]
      );
      if (existing.rows.length === 0) return { success: false, error: 'Cost Centre not found' };

      const current = existing.rows[0];
      await db.execute(
        `UPDATE cost_centres SET
          name = ?, alias = ?, parent_id = ?, category = ?,
          updated_at = datetime('now')
         WHERE cc_id = ?`,
        [
          data.name ?? current.name,
          data.alias ?? current.alias,
          data.parent_id ?? current.parent_id,
          data.parent_id ? 'Secondary' : 'Primary',
          data.cc_id,
        ]
      );

      const updated = await db.execute(
        `SELECT * FROM cost_centres WHERE cc_id = ?`,
        [data.cc_id]
      );
      return { success: true, costCentre: updated.rows[0] };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  delete: async (id) => {
    try {
      const existing = await db.execute(
        `SELECT * FROM cost_centres WHERE cc_id = ?`,
        [id]
      );
      if (existing.rows.length === 0) return { success: false, error: 'Cost Centre not found' };

      const hasChildren = await db.execute(
        `SELECT * FROM cost_centres WHERE parent_id = ? AND is_active = 1`,
        [id]
      );
      if (hasChildren.rows.length > 0) return { success: false, error: 'Cannot delete Cost Centre with sub-centres' };

      await db.execute(
        `UPDATE cost_centres SET is_active = 0 WHERE cc_id = ?`,
        [id]
      );
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },
};