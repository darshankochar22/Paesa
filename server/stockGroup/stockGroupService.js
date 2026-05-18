const { db } = require("../db/index");

const seedDefaultStockGroups = async (company_id) => {
  const defaults = [
    { name: "Primary", is_primary: 1, parent_group_id: null },
    { name: "All Items", is_primary: 0, parent_group_id: null },
  ];

  for (const g of defaults) {
    await db.execute({
      sql: `INSERT INTO stock_groups (
              company_id, name, alias, parent_group_id, should_quantities_be_added,
              hsn_sac_code, hsn_sac_description, gst_rate, cgst_rate, sgst_rate,
              statutory_details, is_primary, is_active, is_predefined
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [company_id, g.name, null, g.parent_group_id, 1, null, null, 0, 0, 0, null, g.is_primary, 1, 1],
    });
  }
};

const buildTree = (all, parentId = null) => {
  return all
    .filter((g) => g.parent_group_id === parentId)
    .map((g) => ({ ...g, children: buildTree(all, g.sg_id) }));
};

module.exports = {
  seedDefaultStockGroups,

  create: async (data) => {
    try {
      const exists = await db.execute({
        sql: `SELECT * FROM stock_groups WHERE company_id = ? AND LOWER(name) = LOWER(?) AND is_active = 1`,
        args: [data.company_id, data.name],
      });
      if (exists.rows.length > 0) return { success: false, error: "Stock Group already exists" };

      const result = await db.execute({
        sql: `INSERT INTO stock_groups (
                company_id, name, alias, parent_group_id, should_quantities_be_added,
                hsn_sac_code, hsn_sac_description, gst_rate, cgst_rate, sgst_rate,
                statutory_details, is_primary, is_active, is_predefined
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          data.company_id, data.name, data.alias || null,
          data.parent_group_id || null,
          data.should_quantities_be_added ?? 1,
          data.hsn_sac_code || null,
          data.hsn_sac_description || null,
          data.gst_rate || 0,
          data.cgst_rate || 0,
          data.sgst_rate || 0,
          data.statutory_details || null,
          0, 1, 0,
        ],
      });

      const group = await db.execute({
        sql: `SELECT * FROM stock_groups WHERE sg_id = ?`,
        args: [Number(result.lastInsertRowid)],
      });
      return { success: true, group: group.rows[0] };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  getAll: async (company_id) => {
    try {
      const result = await db.execute({
        sql: `SELECT * FROM stock_groups WHERE company_id = ? AND is_active = 1`,
        args: [company_id],
      });
      return { success: true, stockGroups: result.rows };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  getById: async (id) => {
    try {
      const result = await db.execute({
        sql: `SELECT * FROM stock_groups WHERE sg_id = ?`,
        args: [id],
      });
      if (result.rows.length === 0) return { success: false, error: "Stock Group not found" };
      return { success: true, group: result.rows[0] };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  getTree: async (company_id) => {
    try {
      const result = await db.execute({
        sql: `SELECT * FROM stock_groups WHERE company_id = ? AND is_active = 1`,
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
        sql: `SELECT * FROM stock_groups WHERE sg_id = ?`,
        args: [data.sg_id],
      });
      if (existing.rows.length === 0) return { success: false, error: "Stock Group not found" };
      const group = existing.rows[0];
      if (group.is_predefined) return { success: false, error: "Cannot edit predefined stock groups" };

      await db.execute({
        sql: `UPDATE stock_groups SET
                name = ?, alias = ?, parent_group_id = ?, should_quantities_be_added = ?,
                hsn_sac_code = ?, hsn_sac_description = ?, gst_rate = ?, cgst_rate = ?,
                sgst_rate = ?, statutory_details = ?, updated_at = datetime('now')
              WHERE sg_id = ?`,
        args: [
          data.name ?? group.name,
          data.alias ?? group.alias,
          data.parent_group_id ?? group.parent_group_id,
          data.should_quantities_be_added ?? group.should_quantities_be_added,
          data.hsn_sac_code ?? group.hsn_sac_code,
          data.hsn_sac_description ?? group.hsn_sac_description,
          data.gst_rate ?? group.gst_rate,
          data.cgst_rate ?? group.cgst_rate,
          data.sgst_rate ?? group.sgst_rate,
          data.statutory_details ?? group.statutory_details,
          data.sg_id,
        ],
      });

      const updated = await db.execute({
        sql: `SELECT * FROM stock_groups WHERE sg_id = ?`,
        args: [data.sg_id],
      });
      return { success: true, group: updated.rows[0] };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  delete: async (id) => {
    try {
      const existing = await db.execute({
        sql: `SELECT * FROM stock_groups WHERE sg_id = ?`,
        args: [id],
      });
      if (existing.rows.length === 0) return { success: false, error: "Stock Group not found" };
      if (existing.rows[0].is_predefined) return { success: false, error: "Cannot delete predefined stock groups" };

      const hasChildren = await db.execute({
        sql: `SELECT * FROM stock_groups WHERE parent_group_id = ? AND is_active = 1`,
        args: [id],
      });
      if (hasChildren.rows.length > 0) return { success: false, error: "Cannot delete Stock Group with subgroups" };

      await db.execute({
        sql: `UPDATE stock_groups SET is_active = 0 WHERE sg_id = ?`,
        args: [id],
      });
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },
};