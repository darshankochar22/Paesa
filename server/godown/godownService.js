const { db } = require('../db/index');

const seedDefaultGodowns = async (company_id) => {
  await db.execute({
    sql: `INSERT INTO godowns (
            company_id, name, alias, parent_godown_id, address, city, state, pincode,
            is_primary, is_main_location, allow_storage_of_materials, is_active, is_predefined
          ) VALUES (?, 'Main Location', null, null, null, null, null, null, 1, 1, 1, 1, 1)`,
    args: [company_id],
  });
};

const buildTree = (all, parentId = null) => {
  return all
    .filter(g => (g.parent_godown_id ?? null) === parentId)
    .map(g => ({ ...g, children: buildTree(all, g.godown_id) }));
};

module.exports = {
  seedDefaultGodowns,

  create: async (data) => {
    try {
      const exists = await db.execute({
        sql: `SELECT * FROM godowns WHERE company_id = ? AND LOWER(name) = LOWER(?) AND is_active = 1`,
        args: [data.company_id, data.name],
      });
      if (exists.rows.length > 0) return { success: false, error: 'Godown already exists' };

      const result = await db.execute({
        sql: `INSERT INTO godowns (
                company_id, name, alias, parent_godown_id, address, city, state, pincode,
                is_primary, is_main_location, allow_storage_of_materials, is_active, is_predefined
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, 1, 0)`,
        args: [
          data.company_id,
          data.name,
          data.alias || null,
          data.parent_godown_id || null,
          data.address || null,
          data.city || null,
          data.state || null,
          data.pincode || null,
          data.parent_godown_id ? 0 : 1,
          data.allow_storage_of_materials ?? 1,
        ],
      });

      const godown = await db.execute({
        sql: `SELECT * FROM godowns WHERE godown_id = ?`,
        args: [Number(result.lastInsertRowid)],
      });
      return { success: true, godown: godown.rows[0] };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  getAll: async (company_id) => {
    try {
      const result = await db.execute({
        sql: `SELECT * FROM godowns WHERE company_id = ? AND is_active = 1`,
        args: [company_id],
      });
      return { success: true, godowns: result.rows };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  getById: async (id) => {
    try {
      const result = await db.execute({
        sql: `SELECT * FROM godowns WHERE godown_id = ?`,
        args: [id],
      });
      if (result.rows.length === 0) return { success: false, error: 'Godown not found' };
      return { success: true, godown: result.rows[0] };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  getTree: async (company_id) => {
    try {
      const result = await db.execute({
        sql: `SELECT * FROM godowns WHERE company_id = ? AND is_active = 1`,
        args: [company_id],
      });
      const tree = buildTree(result.rows);
      return { success: true, tree };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  update: async (data) => {
    try {
      const existing = await db.execute({
        sql: `SELECT * FROM godowns WHERE godown_id = ?`,
        args: [data.godown_id],
      });
      if (existing.rows.length === 0) return { success: false, error: 'Godown not found' };
      if (existing.rows[0].is_predefined) return { success: false, error: 'Cannot edit Main Location' };

      const current = existing.rows[0];

      // duplicate name check
      if (data.name && data.name.toLowerCase() !== current.name.toLowerCase()) {
        const dupe = await db.execute({
          sql: `SELECT * FROM godowns WHERE company_id = ? AND LOWER(name) = LOWER(?) AND is_active = 1 AND godown_id != ?`,
          args: [current.company_id, data.name, data.godown_id],
        });
        if (dupe.rows.length > 0) return { success: false, error: 'Godown name already exists' };
      }

      await db.execute({
        sql: `UPDATE godowns SET
                name = ?, alias = ?, parent_godown_id = ?, address = ?,
                city = ?, state = ?, pincode = ?,
                allow_storage_of_materials = ?, updated_at = datetime('now')
              WHERE godown_id = ?`,
        args: [
          data.name                       ?? current.name,
          data.alias                      ?? current.alias,
          data.parent_godown_id           ?? current.parent_godown_id,
          data.address                    ?? current.address,
          data.city                       ?? current.city,
          data.state                      ?? current.state,
          data.pincode                    ?? current.pincode,
          data.allow_storage_of_materials ?? current.allow_storage_of_materials,
          data.godown_id,
        ],
      });

      const updated = await db.execute({
        sql: `SELECT * FROM godowns WHERE godown_id = ?`,
        args: [data.godown_id],
      });
      return { success: true, godown: updated.rows[0] };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  delete: async (id) => {
    try {
      const existing = await db.execute({
        sql: `SELECT * FROM godowns WHERE godown_id = ?`,
        args: [id],
      });
      if (existing.rows.length === 0) return { success: false, error: 'Godown not found' };
      if (existing.rows[0].is_predefined) return { success: false, error: 'Cannot delete Main Location' };

      const hasChildren = await db.execute({
        sql: `SELECT * FROM godowns WHERE parent_godown_id = ? AND is_active = 1`,
        args: [id],
      });
      if (hasChildren.rows.length > 0) return { success: false, error: 'Cannot delete Godown with sub-godowns' };

      await db.execute({
        sql: `UPDATE godowns SET is_active = 0 WHERE godown_id = ?`,
        args: [id],
      });
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },
};