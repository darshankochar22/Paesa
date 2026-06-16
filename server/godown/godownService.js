// ---------------------------------------------------------------------------
// Drizzle ORM conversion — follows the GOLDEN EXEMPLAR (currencyService.js).
//
//   * MUTATIONS use the query builder: db.insert(...).values(...),
//     db.update(...).set(...).where(...), with eq()/and()/sql`` predicates.
//   * READS THAT RETURN ROWS TO CALLERS use db.all(sql`SELECT * FROM ${table}
//     WHERE ...`) to preserve the EXACT legacy snake_case row shape that the
//     controllers / test oracle assert against.
//   * New-row id after INSERT comes from .returning({ id: table.pkCol }).
// ---------------------------------------------------------------------------
const { db } = require('../db/index');
const { sql, eq, and } = require('drizzle-orm');
const { godowns } = require('../db/schema');

// Fetch a single godown row in the legacy snake_case shape (or undefined).
const findRow = async (whereSql) => {
  const rows = await db.all(sql`SELECT * FROM ${godowns} WHERE ${whereSql}`);
  return rows[0];
};

const seedDefaultGodowns = async (company_id) => {
  await db
    .insert(godowns)
    .values({
      companyId: company_id,
      name: 'Main Location',
      alias: null,
      parentGodownId: null,
      address: null,
      city: null,
      state: null,
      pincode: null,
      isPrimary: 1,
      isMainLocation: 1,
      allowStorageOfMaterials: 1,
      isActive: 1,
      isPredefined: 1,
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
      const exists = await db.all(
        sql`SELECT * FROM ${godowns}
            WHERE ${godowns.companyId} = ${data.company_id}
              AND LOWER(${godowns.name}) = LOWER(${data.name})
              AND ${godowns.isActive} = 1`
      );
      if (exists.length > 0) return { success: false, error: 'Godown already exists' };

      const inserted = await db
        .insert(godowns)
        .values({
          companyId: data.company_id,
          name: data.name,
          alias: data.alias || null,
          parentGodownId: data.parent_godown_id || null,
          address: data.address || null,
          city: data.city || null,
          state: data.state || null,
          pincode: data.pincode || null,
          isPrimary: data.parent_godown_id ? 0 : 1,
          isMainLocation: 0,
          allowStorageOfMaterials: data.allow_storage_of_materials ?? 1,
          isActive: 1,
          isPredefined: 0,
        })
        .returning({ id: godowns.godownId });

      const godown = await findRow(sql`${godowns.godownId} = ${inserted[0].id}`);
      return { success: true, godown };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  getAll: async (company_id) => {
    try {
      const rows = await db.all(
        sql`SELECT * FROM ${godowns}
            WHERE ${godowns.companyId} = ${company_id}
              AND ${godowns.isActive} = 1`
      );
      return { success: true, godowns: rows };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  getById: async (id) => {
    try {
      const godown = await findRow(sql`${godowns.godownId} = ${id}`);
      if (!godown) return { success: false, error: 'Godown not found' };
      return { success: true, godown };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  getTree: async (company_id) => {
    try {
      const rows = await db.all(
        sql`SELECT * FROM ${godowns}
            WHERE ${godowns.companyId} = ${company_id}
              AND ${godowns.isActive} = 1`
      );
      const tree = buildTree(rows);
      return { success: true, tree };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  update: async (data) => {
    try {
      const current = await findRow(sql`${godowns.godownId} = ${data.godown_id}`);
      if (!current) return { success: false, error: 'Godown not found' };
      if (current.is_predefined) return { success: false, error: 'Cannot edit Main Location' };

      // duplicate name check
      if (data.name && data.name.toLowerCase() !== current.name.toLowerCase()) {
        const dupe = await db.all(
          sql`SELECT * FROM ${godowns}
              WHERE ${godowns.companyId} = ${current.company_id}
                AND LOWER(${godowns.name}) = LOWER(${data.name})
                AND ${godowns.isActive} = 1
                AND ${godowns.godownId} != ${data.godown_id}`
        );
        if (dupe.length > 0) return { success: false, error: 'Godown name already exists' };
      }

      await db
        .update(godowns)
        .set({
          name: data.name ?? current.name,
          alias: data.alias ?? current.alias,
          parentGodownId: data.parent_godown_id ?? current.parent_godown_id,
          address: data.address ?? current.address,
          city: data.city ?? current.city,
          state: data.state ?? current.state,
          pincode: data.pincode ?? current.pincode,
          allowStorageOfMaterials:
            data.allow_storage_of_materials ?? current.allow_storage_of_materials,
          updatedAt: sql`datetime('now')`,
        })
        .where(eq(godowns.godownId, data.godown_id));

      const updated = await findRow(sql`${godowns.godownId} = ${data.godown_id}`);
      return { success: true, godown: updated };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  delete: async (id) => {
    try {
      const existing = await findRow(sql`${godowns.godownId} = ${id}`);
      if (!existing) return { success: false, error: 'Godown not found' };
      if (existing.is_predefined) return { success: false, error: 'Cannot delete Main Location' };

      const hasChildren = await db.all(
        sql`SELECT * FROM ${godowns}
            WHERE ${godowns.parentGodownId} = ${id}
              AND ${godowns.isActive} = 1`
      );
      if (hasChildren.length > 0) return { success: false, error: 'Cannot delete Godown with sub-godowns' };

      await db
        .update(godowns)
        .set({ isActive: 0 })
        .where(eq(godowns.godownId, id));
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },
};
