const { db } = require('../db/index');
const { sql, eq, and } = require('drizzle-orm');
const { stockCategories } = require('../db/schema');

// Fetch a single stock category row in the legacy snake_case shape (or undefined).
const findRow = async (whereSql) => {
  const rows = await db.all(sql`SELECT * FROM ${stockCategories} WHERE ${whereSql}`);
  return rows[0];
};

module.exports = {
  create: async (data) => {
    try {
      const exists = await db.all(
        sql`SELECT * FROM ${stockCategories}
            WHERE ${stockCategories.companyId} = ${data.company_id}
              AND LOWER(${stockCategories.name}) = LOWER(${data.name})
              AND ${stockCategories.isActive} = 1`
      );
      if (exists.length > 0) return { success: false, error: 'Stock Category already exists' };

      const inserted = await db
        .insert(stockCategories)
        .values({
          companyId: data.company_id,
          name: data.name,
          alias: data.alias || null,
          description: data.description || null,
          parentCategoryId: data.parent_category_id || null,
          isActive: 1,
        })
        .returning({ id: stockCategories.scId });

      const category = await findRow(sql`${stockCategories.scId} = ${inserted[0].id}`);
      return { success: true, category };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  getAll: async (company_id) => {
    try {
      const rows = await db.all(
        sql`SELECT * FROM ${stockCategories}
            WHERE ${stockCategories.companyId} = ${company_id}
              AND ${stockCategories.isActive} = 1`
      );
      return { success: true, stockCategories: rows };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  getById: async (id) => {
    try {
      const category = await findRow(sql`${stockCategories.scId} = ${id}`);
      if (!category) return { success: false, error: 'Stock Category not found' };
      return { success: true, category };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  update: async (data) => {
    try {
      const current = await findRow(sql`${stockCategories.scId} = ${data.sc_id}`);
      if (!current) return { success: false, error: 'Stock Category not found' };

      if (data.name && data.name.toLowerCase() !== current.name.toLowerCase()) {
        const dupe = await db.all(
          sql`SELECT * FROM ${stockCategories}
              WHERE ${stockCategories.companyId} = ${current.company_id}
                AND LOWER(${stockCategories.name}) = LOWER(${data.name})
                AND ${stockCategories.isActive} = 1
                AND ${stockCategories.scId} != ${data.sc_id}`
        );
        if (dupe.length > 0) return { success: false, error: 'Stock Category name already exists' };
      }

      await db
        .update(stockCategories)
        .set({
          name: data.name ?? current.name,
          alias: data.alias ?? current.alias,
          description: data.description ?? current.description,
          parentCategoryId: data.parent_category_id ?? current.parent_category_id,
          updatedAt: sql`datetime('now')`,
        })
        .where(eq(stockCategories.scId, data.sc_id));

      const updated = await findRow(sql`${stockCategories.scId} = ${data.sc_id}`);
      return { success: true, category: updated };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  delete: async (id) => {
    try {
      const existing = await findRow(sql`${stockCategories.scId} = ${id}`);
      if (!existing) return { success: false, error: 'Stock Category not found' };

      const hasChildren = await db.all(
        sql`SELECT * FROM ${stockCategories}
            WHERE ${stockCategories.parentCategoryId} = ${id}
              AND ${stockCategories.isActive} = 1`
      );
      if (hasChildren.length > 0) return { success: false, error: 'Cannot delete category with subcategories' };

      // future-proof: uncomment when stock items reference categories
      // const inUse = await db.all(
      //   sql`SELECT 1 FROM stock_items WHERE category_id = ${id} AND is_active = 1 LIMIT 1`
      // );
      // if (inUse.length > 0) return { success: false, error: 'Category is used by stock items' };

      await db
        .update(stockCategories)
        .set({ isActive: 0 })
        .where(eq(stockCategories.scId, id));
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },
};
