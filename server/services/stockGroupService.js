const db = require("../db/index");

const seedDefaultStockGroups = (company_id) => {
  const defaults = [
    { name: "Primary", is_primary: 1, parent_group_id: null },
    { name: "All Items", is_primary: 0, parent_group_id: null },
  ];

  const stmt = db.execute(`
    INSERT INTO stock_groups (
      company_id, name, alias, parent_group_id, should_quantities_be_added,
      hsn_sac_code, hsn_sac_description, gst_rate, cgst_rate, sgst_rate,
      statutory_details, is_primary, is_active, is_predefined
    ) VALUES (
      @company_id, @name, @alias, @parent_group_id, @should_quantities_be_added,
      @hsn_sac_code, @hsn_sac_description, @gst_rate, @cgst_rate, @sgst_rate,
      @statutory_details, @is_primary, @is_active, @is_predefined
    )
  `);

  defaults.forEach((g) => {
    stmt.run({
      company_id: company_id,
      name: g.name,
      alias: null,
      parent_group_id: g.parent_group_id,
      should_quantities_be_added: 1,
      hsn_sac_code: null,
      hsn_sac_description: null,
      gst_rate: 0,
      cgst_rate: 0,
      sgst_rate: 0,
      statutory_details: null,
      is_primary: g.is_primary,
      is_active: 1,
      is_predefined: 1,
    });
  });
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
      const exists = db
        .execute(
          `
        SELECT * FROM stock_groups
        WHERE company_id = ? AND LOWER(name) = LOWER(?) AND is_active = 1
      `,
        )
        .get(data.company_id, data.name);
      if (exists)
        return { success: false, error: "Stock Group already exists" };

      const result = db
        .execute(
          `
        INSERT INTO stock_groups (
          company_id, name, alias, parent_group_id, should_quantities_be_added,
          hsn_sac_code, hsn_sac_description, gst_rate, cgst_rate, sgst_rate,
          statutory_details, is_primary, is_active, is_predefined
        ) VALUES (
          @company_id, @name, @alias, @parent_group_id, @should_quantities_be_added,
          @hsn_sac_code, @hsn_sac_description, @gst_rate, @cgst_rate, @sgst_rate,
          @statutory_details, @is_primary, @is_active, @is_predefined
        )
      `,
        )
        .run({
          company_id: data.company_id,
          name: data.name,
          alias: data.alias || null,
          parent_group_id: data.parent_group_id || null,
          should_quantities_be_added: data.should_quantities_be_added ?? 1,
          hsn_sac_code: data.hsn_sac_code || null,
          hsn_sac_description: data.hsn_sac_description || null,
          gst_rate: data.gst_rate || 0,
          cgst_rate: data.cgst_rate || 0,
          sgst_rate: data.sgst_rate || 0,
          statutory_details: data.statutory_details || null,
          is_primary: 0,
          is_active: 1,
          is_predefined: 0,
        });

      const group = db
        .execute(`SELECT * FROM stock_groups WHERE sg_id = ?`)
        .get(result.lastInsertRowid);
      return { success: true, group };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  getAll: async (company_id) => {
    try {
      const stockGroups = db
        .execute(
          `
        SELECT * FROM stock_groups WHERE company_id = ? AND is_active = 1
      `,
        )
        .all(company_id);
      return { success: true, stockGroups };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  getById: async (id) => {
    try {
      const group = db
        .execute(`SELECT * FROM stock_groups WHERE sg_id = ?`)
        .get(id);
      if (!group) return { success: false, error: "Stock Group not found" };
      return { success: true, group };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  getTree: async (company_id) => {
    try {
      const all = db
        .execute(
          `
        SELECT * FROM stock_groups WHERE company_id = ? AND is_active = 1
      `,
        )
        .all(company_id);
      const tree = buildTree(all);
      return { success: true, tree };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  update: async (data) => {
    try {
      const group = db
        .execute(`SELECT * FROM stock_groups WHERE sg_id = ?`)
        .get(data.sg_id);
      if (!group) return { success: false, error: "Stock Group not found" };
      if (group.is_predefined)
        return { success: false, error: "Cannot edit predefined stock groups" };

      db.execute(
        `
        UPDATE stock_groups SET
          name = @name, alias = @alias, parent_group_id = @parent_group_id,
          should_quantities_be_added = @should_quantities_be_added,
          hsn_sac_code = @hsn_sac_code, hsn_sac_description = @hsn_sac_description,
          gst_rate = @gst_rate, cgst_rate = @cgst_rate, sgst_rate = @sgst_rate,
          statutory_details = @statutory_details, updated_at = datetime('now')
        WHERE sg_id = @sg_id
      `,
      ).run({
        sg_id: data.sg_id,
        name: data.name ?? group.name,
        alias: data.alias ?? group.alias,
        parent_group_id: data.parent_group_id ?? group.parent_group_id,
        should_quantities_be_added:
          data.should_quantities_be_added ?? group.should_quantities_be_added,
        hsn_sac_code: data.hsn_sac_code ?? group.hsn_sac_code,
        hsn_sac_description:
          data.hsn_sac_description ?? group.hsn_sac_description,
        gst_rate: data.gst_rate ?? group.gst_rate,
        cgst_rate: data.cgst_rate ?? group.cgst_rate,
        sgst_rate: data.sgst_rate ?? group.sgst_rate,
        statutory_details: data.statutory_details ?? group.statutory_details,
      });

      const updated = db
        .execute(`SELECT * FROM stock_groups WHERE sg_id = ?`)
        .get(data.sg_id);
      return { success: true, group: updated };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  delete: async (id) => {
    try {
      const group = db
        .execute(`SELECT * FROM stock_groups WHERE sg_id = ?`)
        .get(id);
      if (!group) return { success: false, error: "Stock Group not found" };
      if (group.is_predefined)
        return {
          success: false,
          error: "Cannot delete predefined stock groups",
        };

      const hasChildren = db
        .execute(
          `
        SELECT * FROM stock_groups WHERE parent_group_id = ? AND is_active = 1
      `,
        )
        .get(id);
      if (hasChildren)
        return {
          success: false,
          error: "Cannot delete Stock Group with subgroups",
        };

      db.execute(`UPDATE stock_groups SET is_active = 0 WHERE sg_id = ?`).run(
        id,
      );
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },
};
