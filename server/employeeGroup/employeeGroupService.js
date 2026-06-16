const { db } = require('../db/index');
const { sql, eq, and } = require('drizzle-orm');
const { employeeGroups, employees } = require('../db/schema');

const buildTree = (all, parentId = null) => {
  return all
    .filter(g => g.parent_group_id === parentId)
    .map(g => ({ ...g, children: buildTree(all, g.employee_group_id) }));
};

// Fetch a single employee_groups row in the legacy snake_case shape (or undefined).
const findRow = async (whereSql) => {
  const rows = await db.all(sql`SELECT * FROM ${employeeGroups} WHERE ${whereSql}`);
  return rows[0];
};

const seedDefaultEmployeeGroups = async (company_id) => {
  const defaults = ['Primary', 'Management', 'Staff', 'Workers'];
  for (const name of defaults) {
    await db
      .insert(employeeGroups)
      .values({
        companyId: company_id,
        name,
        alias: null,
        parentGroupId: null,
        isActive: 1,
        isPredefined: 1,
      });
  }
};

module.exports = {
  seedDefaultEmployeeGroups,

  create: async (data) => {
    try {
      const exists = await db.all(
        sql`SELECT * FROM ${employeeGroups}
            WHERE ${employeeGroups.companyId} = ${data.company_id}
              AND LOWER(${employeeGroups.name}) = LOWER(${data.name})
              AND ${employeeGroups.isActive} = 1`
      );
      if (exists.length > 0) return { success: false, error: 'Employee Group already exists' };

      const inserted = await db
        .insert(employeeGroups)
        .values({
          companyId: data.company_id,
          name: data.name,
          alias: data.alias || null,
          parentGroupId: data.parent_group_id || null,
          isActive: 1,
          isPredefined: 0,
        })
        .returning({ id: employeeGroups.employeeGroupId });

      const group = await findRow(sql`${employeeGroups.employeeGroupId} = ${inserted[0].id}`);
      return { success: true, group };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  getAll: async (company_id) => {
    try {
      const rows = await db.all(
        sql`SELECT * FROM ${employeeGroups}
            WHERE ${employeeGroups.companyId} = ${company_id}
              AND ${employeeGroups.isActive} = 1`
      );
      return { success: true, employeeGroups: rows };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  getById: async (id) => {
    try {
      const group = await findRow(sql`${employeeGroups.employeeGroupId} = ${id}`);
      if (!group) return { success: false, error: 'Employee Group not found' };
      return { success: true, group };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  getTree: async (company_id) => {
    try {
      const rows = await db.all(
        sql`SELECT * FROM ${employeeGroups}
            WHERE ${employeeGroups.companyId} = ${company_id}
              AND ${employeeGroups.isActive} = 1`
      );
      const tree = buildTree(rows);
      return { success: true, tree };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  update: async (data) => {
    try {
      const current = await findRow(sql`${employeeGroups.employeeGroupId} = ${data.employee_group_id}`);
      if (!current) return { success: false, error: 'Employee Group not found' };
      if (current.is_predefined) return { success: false, error: 'Cannot edit predefined employee groups' };

      await db
        .update(employeeGroups)
        .set({
          name: data.name ?? current.name,
          alias: data.alias ?? current.alias,
          parentGroupId: data.parent_group_id ?? current.parent_group_id,
          updatedAt: sql`datetime('now')`,
        })
        .where(eq(employeeGroups.employeeGroupId, data.employee_group_id));

      const updated = await findRow(sql`${employeeGroups.employeeGroupId} = ${data.employee_group_id}`);
      return { success: true, group: updated };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  delete: async (id) => {
    try {
      const existing = await findRow(sql`${employeeGroups.employeeGroupId} = ${id}`);
      if (!existing) return { success: false, error: 'Employee Group not found' };
      if (existing.is_predefined) return { success: false, error: 'Cannot delete predefined employee groups' };

      const hasChildren = await db.all(
        sql`SELECT * FROM ${employeeGroups}
            WHERE ${employeeGroups.parentGroupId} = ${id}
              AND ${employeeGroups.isActive} = 1`
      );
      if (hasChildren.length > 0) return { success: false, error: 'Cannot delete group with sub-groups' };

      const hasEmployees = await db.all(
        sql`SELECT * FROM ${employees}
            WHERE ${employees.employeeGroupId} = ${id}
              AND ${employees.isActive} = 1`
      );
      if (hasEmployees.length > 0) return { success: false, error: 'Cannot delete group with employees' };

      await db
        .update(employeeGroups)
        .set({ isActive: 0 })
        .where(eq(employeeGroups.employeeGroupId, id));
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },
};
