const { db } = require("../db/index");
const { sql, eq, and } = require("drizzle-orm");
const { stockGroups } = require("../db/schema");

// Fetch a single stock_groups row in the legacy snake_case shape (or undefined).
const findRow = async (whereSql) => {
  const rows = await db.all(sql`SELECT * FROM ${stockGroups} WHERE ${whereSql}`);
  return rows[0];
};

const seedDefaultStockGroups = async (company_id) => {
  const defaults = [
    { name: "Primary",   is_primary: 1, parent_group_id: null },
    { name: "All Items", is_primary: 0, parent_group_id: null },
  ];

  for (const g of defaults) {
    await db
      .insert(stockGroups)
      .values({
        companyId: company_id,
        name: g.name,
        alias: null,
        parentGroupId: g.parent_group_id,
        shouldQuantitiesBeAdded: 0,
        hsnSacCode: null,
        hsnSacDescription: null,
        gstRate: 0,
        cgstRate: 0,
        sgstRate: 0,
        taxabilityType: null,
        statutoryDetails: null,
        isPrimary: g.is_primary,
        isActive: 1,
        isPredefined: 1,
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
      const exists = await db.all(
        sql`SELECT ${stockGroups.sgId} FROM ${stockGroups}
            WHERE ${stockGroups.companyId} = ${data.company_id}
              AND LOWER(${stockGroups.name}) = LOWER(${data.name})
              AND ${stockGroups.isActive} = 1`
      );
      if (exists.length > 0) return { success: false, error: "Stock Group already exists" };

      const inserted = await db
        .insert(stockGroups)
        .values({
          companyId: data.company_id,
          name: data.name,
          alias: data.alias || null,
          parentGroupId: data.parent_group_id || null,
          shouldQuantitiesBeAdded: data.should_quantities_be_added ?? 0,
          hsnSacCode: data.hsn_sac_code || null,
          hsnSacDescription: data.hsn_sac_description || null,
          gstRate: data.gst_rate || 0,
          cgstRate: data.cgst_rate || 0,
          sgstRate: data.sgst_rate || 0,
          taxabilityType: data.taxability_type || null,
          statutoryDetails: data.statutory_details || null,
          isPrimary: 0,
          isActive: 1,
          isPredefined: 0,
        })
        .returning({ id: stockGroups.sgId });

      const group = await findRow(sql`${stockGroups.sgId} = ${Number(inserted[0].id)}`);
      return { success: true, group };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  getAll: async (company_id) => {
    try {
      const rows = await db.all(
        sql`SELECT * FROM ${stockGroups}
            WHERE ${stockGroups.companyId} = ${company_id}
              AND ${stockGroups.isActive} = 1`
      );
      return { success: true, stockGroups: rows };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  getById: async (id) => {
    try {
      const group = await findRow(sql`${stockGroups.sgId} = ${id}`);
      if (!group) return { success: false, error: "Stock Group not found" };
      return { success: true, group };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  getTree: async (company_id) => {
    try {
      const rows = await db.all(
        sql`SELECT * FROM ${stockGroups}
            WHERE ${stockGroups.companyId} = ${company_id}
              AND ${stockGroups.isActive} = 1`
      );
      return { success: true, tree: buildTree(rows) };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  update: async (data) => {
    try {
      const group = await findRow(sql`${stockGroups.sgId} = ${data.sg_id}`);
      if (!group) return { success: false, error: "Stock Group not found" };
      if (group.is_predefined) return { success: false, error: "Cannot edit predefined stock groups" };

      await db
        .update(stockGroups)
        .set({
          name: data.name ?? group.name,
          alias: data.alias ?? group.alias,
          parentGroupId: data.parent_group_id ?? group.parent_group_id,
          shouldQuantitiesBeAdded: data.should_quantities_be_added ?? group.should_quantities_be_added,
          hsnSacCode: data.hsn_sac_code ?? group.hsn_sac_code,
          hsnSacDescription: data.hsn_sac_description ?? group.hsn_sac_description,
          gstRate: data.gst_rate ?? group.gst_rate,
          cgstRate: data.cgst_rate ?? group.cgst_rate,
          sgstRate: data.sgst_rate ?? group.sgst_rate,
          taxabilityType: data.taxability_type ?? group.taxability_type,
          statutoryDetails: data.statutory_details ?? group.statutory_details,
          updatedAt: sql`datetime('now')`,
        })
        .where(eq(stockGroups.sgId, data.sg_id));

      const updated = await findRow(sql`${stockGroups.sgId} = ${data.sg_id}`);
      return { success: true, group: updated };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  delete: async (id) => {
    try {
      const existing = await findRow(sql`${stockGroups.sgId} = ${id}`);
      if (!existing) return { success: false, error: "Stock Group not found" };
      if (existing.is_predefined) return { success: false, error: "Cannot delete predefined stock groups" };

      const hasChildren = await db.all(
        sql`SELECT ${stockGroups.sgId} FROM ${stockGroups}
            WHERE ${stockGroups.parentGroupId} = ${id}
              AND ${stockGroups.isActive} = 1`
      );
      if (hasChildren.length > 0) return { success: false, error: "Cannot delete Stock Group with subgroups" };

      await db
        .update(stockGroups)
        .set({ isActive: 0 })
        .where(eq(stockGroups.sgId, id));
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },
};
