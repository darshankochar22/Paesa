const { db } = require('../db/index');
const { sql, eq } = require('drizzle-orm');
const { costCategories } = require('../db/schema');

const findRow = async (whereSql) => {
  const rows = await db.all(sql`SELECT * FROM ${costCategories} WHERE ${whereSql}`);
  return rows[0];
};

module.exports = {
  create: async (data) => {
    try {
      const exists = await db.all(
        sql`SELECT * FROM ${costCategories}
            WHERE ${costCategories.companyId} = ${data.company_id}
              AND LOWER(${costCategories.name}) = LOWER(${data.name})
              AND ${costCategories.isActive} = 1`
      );
      if (exists.length > 0) return { success: false, error: 'Cost Category with this name already exists' };

      const inserted = await db
        .insert(costCategories)
        .values({
          companyId: data.company_id,
          name: data.name,
          alias: data.alias || null,
          allocateRevenueItems: data.allocate_revenue_items ?? 1,
          allocateNonRevenueItems: data.allocate_non_revenue_items ?? 0,
          isActive: 1,
          isPredefined: 0,
        })
        .returning({ id: costCategories.ccCatId });

      const costCategory = await findRow(sql`${costCategories.ccCatId} = ${inserted[0].id}`);
      return { success: true, costCategory };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  getAll: async (company_id) => {
    try {
      const rows = await db.all(
        sql`SELECT * FROM ${costCategories}
            WHERE ${costCategories.companyId} = ${company_id}
              AND ${costCategories.isActive} = 1
            ORDER BY ${costCategories.name} ASC`
      );
      return { success: true, costCategories: rows };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  getById: async (id) => {
    try {
      const costCategory = await findRow(sql`${costCategories.ccCatId} = ${id}`);
      if (!costCategory) return { success: false, error: 'Cost Category not found' };
      return { success: true, costCategory };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  update: async (data) => {
    try {
      const current = await findRow(sql`${costCategories.ccCatId} = ${data.cc_cat_id}`);
      if (!current) return { success: false, error: 'Cost Category not found' };

      await db
        .update(costCategories)
        .set({
          name: data.name ?? current.name,
          alias: data.alias ?? current.alias,
          allocateRevenueItems: data.allocate_revenue_items ?? current.allocate_revenue_items,
          allocateNonRevenueItems: data.allocate_non_revenue_items ?? current.allocate_non_revenue_items,
          updatedAt: sql`datetime('now')`,
        })
        .where(eq(costCategories.ccCatId, data.cc_cat_id));

      const updated = await findRow(sql`${costCategories.ccCatId} = ${data.cc_cat_id}`);
      return { success: true, costCategory: updated };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  delete: async (id) => {
    try {
      const existing = await findRow(sql`${costCategories.ccCatId} = ${id}`);
      if (!existing) return { success: false, error: 'Cost Category not found' };
      if (existing.is_predefined) return { success: false, error: 'Cannot delete predefined Cost Category' };

      await db
        .update(costCategories)
        .set({ isActive: 0 })
        .where(eq(costCategories.ccCatId, id));
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },
};
