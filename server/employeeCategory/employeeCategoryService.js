const { db } = require('../db/index');
const { sql, eq, and } = require('drizzle-orm');
const { employeeCategories, employeeGroups, employees } = require('../db/schema');

// Fetch a single employee_categories row in the legacy snake_case shape (or undefined).
const findRow = async (whereSql) => {
  const rows = await db.all(sql`SELECT * FROM ${employeeCategories} WHERE ${whereSql}`);
  return rows[0];
};

const seedDefaultEmployeeCategory = async (company_id) => {
  await db
    .insert(employeeCategories)
    .values({
      companyId: company_id,
      name: 'Primary Employee Category',
      alias: null,
      allocateRevenue: 0,
      allocateNonRevenue: 0,
      isActive: 1,
      isPredefined: 1,
    });
};

module.exports = {
  seedDefaultEmployeeCategory,

  create: async (data) => {
    try {
      const exists = await db.all(
        sql`SELECT * FROM ${employeeCategories}
            WHERE ${employeeCategories.companyId} = ${data.company_id}
              AND LOWER(${employeeCategories.name}) = LOWER(${data.name})
              AND ${employeeCategories.isActive} = 1`
      );
      if (exists.length > 0) return { success: false, error: 'Employee Category already exists' };

      const inserted = await db
        .insert(employeeCategories)
        .values({
          companyId: data.company_id,
          name: data.name,
          alias: data.alias || null,
          allocateRevenue: data.allocate_revenue ? 1 : 0,
          allocateNonRevenue: data.allocate_non_revenue ? 1 : 0,
          isActive: 1,
          isPredefined: 0,
        })
        .returning({ id: employeeCategories.employeeCategoryId });

      const category = await findRow(
        sql`${employeeCategories.employeeCategoryId} = ${inserted[0].id}`
      );
      return { success: true, category };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  getAll: async (company_id) => {
    try {
      const rows = await db.all(
        sql`SELECT * FROM ${employeeCategories}
            WHERE ${employeeCategories.companyId} = ${company_id}
              AND ${employeeCategories.isActive} = 1`
      );
      return { success: true, employeeCategories: rows };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  getById: async (id) => {
    try {
      const category = await findRow(sql`${employeeCategories.employeeCategoryId} = ${id}`);
      if (!category) return { success: false, error: 'Employee Category not found' };
      return { success: true, category };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  update: async (data) => {
    try {
      const current = await findRow(
        sql`${employeeCategories.employeeCategoryId} = ${data.employee_category_id}`
      );
      if (!current) return { success: false, error: 'Employee Category not found' };
      if (current.is_predefined)
        return { success: false, error: 'Cannot edit predefined employee categories' };

      await db
        .update(employeeCategories)
        .set({
          name: data.name ?? current.name,
          alias: data.alias ?? current.alias,
          allocateRevenue:
            data.allocate_revenue !== undefined
              ? data.allocate_revenue
                ? 1
                : 0
              : current.allocate_revenue,
          allocateNonRevenue:
            data.allocate_non_revenue !== undefined
              ? data.allocate_non_revenue
                ? 1
                : 0
              : current.allocate_non_revenue,
          updatedAt: sql`datetime('now')`,
        })
        .where(eq(employeeCategories.employeeCategoryId, data.employee_category_id));

      const updated = await findRow(
        sql`${employeeCategories.employeeCategoryId} = ${data.employee_category_id}`
      );
      return { success: true, category: updated };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  delete: async (id) => {
    try {
      const existing = await findRow(sql`${employeeCategories.employeeCategoryId} = ${id}`);
      if (!existing) return { success: false, error: 'Employee Category not found' };
      if (existing.is_predefined)
        return { success: false, error: 'Cannot delete predefined employee categories' };

      // Check if any employee groups are using it
      const hasGroups = await db.all(
        sql`SELECT * FROM ${employeeGroups}
            WHERE ${employeeGroups.employeeCategoryId} = ${id}
              AND ${employeeGroups.isActive} = 1`
      );
      if (hasGroups.length > 0)
        return { success: false, error: 'Cannot delete category with active employee groups' };

      // Check if any employees are using it
      const hasEmployees = await db.all(
        sql`SELECT * FROM ${employees}
            WHERE ${employees.employeeCategoryId} = ${id}
              AND ${employees.isActive} = 1`
      );
      if (hasEmployees.length > 0)
        return { success: false, error: 'Cannot delete category with active employees' };

      await db
        .update(employeeCategories)
        .set({ isActive: 0 })
        .where(eq(employeeCategories.employeeCategoryId, id));
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },
};
