// ---------------------------------------------------------------------------
// Drizzle ORM conversion (follows the currencyService golden exemplar).
//
//   * Import the drizzle instance `db` and the `sql` template tag plus the
//     comparison helpers (`eq`, `and`) from drizzle-orm. Table objects come
//     from the dialect-switching schema barrel ('../db/schema').
//
//   * MUTATIONS use the query builder: db.insert(...).values(...),
//     db.update(...).set(...).where(...).
//
//   * READS THAT RETURN ROWS TO CALLERS use db.all(sql`SELECT * FROM ${table}
//     WHERE ...`) so the EXACT legacy return shape is preserved: snake_case
//     column keys (cc_id, parent_id, is_active, ...) and numeric 0/1 booleans,
//     which buildTree() and the test oracle assert against. Column identifiers
//     inside the template come from the schema (${costCentres.companyId}).
//
//   * New-row id after INSERT comes from .returning({ id: costCentres.ccId }).
// ---------------------------------------------------------------------------
const { db } = require('../db/index');
const { sql, eq, and } = require('drizzle-orm');
const { costCentres } = require('../db/schema');

const buildTree = (all, parentId = null) => {
  return all
    .filter(c => c.parent_id === parentId)
    .map(c => ({ ...c, children: buildTree(all, c.cc_id) }));
};

// Fetch a single cost centre row in the legacy snake_case shape (or undefined).
const findRow = async (whereSql) => {
  const rows = await db.all(sql`SELECT * FROM ${costCentres} WHERE ${whereSql}`);
  return rows[0];
};

module.exports = {
  create: async (data) => {
    try {
      const exists = await db.all(
        sql`SELECT * FROM ${costCentres}
            WHERE ${costCentres.companyId} = ${data.company_id}
              AND LOWER(${costCentres.name}) = LOWER(${data.name})
              AND ${costCentres.isActive} = 1`
      );
      if (exists.length > 0) return { success: false, error: 'Cost Centre already exists' };

      const inserted = await db
        .insert(costCentres)
        .values({
          companyId: data.company_id,
          name: data.name,
          alias: data.alias || null,
          parentId: data.parent_id || null,
          category: data.parent_id ? 'Secondary' : 'Primary',
          isActive: 1,
          isPredefined: 0,
        })
        .returning({ id: costCentres.ccId });

      const costCentre = await findRow(sql`${costCentres.ccId} = ${inserted[0].id}`);
      return { success: true, costCentre };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  getAll: async (company_id) => {
    try {
      const rows = await db.all(
        sql`SELECT * FROM ${costCentres}
            WHERE ${costCentres.companyId} = ${company_id}
              AND ${costCentres.isActive} = 1`
      );
      return { success: true, costCentres: rows };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  getById: async (id) => {
    try {
      const costCentre = await findRow(sql`${costCentres.ccId} = ${id}`);
      if (!costCentre) return { success: false, error: 'Cost Centre not found' };
      return { success: true, costCentre };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  getTree: async (company_id) => {
    try {
      const rows = await db.all(
        sql`SELECT * FROM ${costCentres}
            WHERE ${costCentres.companyId} = ${company_id}
              AND ${costCentres.isActive} = 1`
      );
      const tree = buildTree(rows);
      return { success: true, tree };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  update: async (data) => {
    try {
      const current = await findRow(sql`${costCentres.ccId} = ${data.cc_id}`);
      if (!current) return { success: false, error: 'Cost Centre not found' };

      await db
        .update(costCentres)
        .set({
          name: data.name ?? current.name,
          alias: data.alias ?? current.alias,
          parentId: data.parent_id ?? current.parent_id,
          category: data.parent_id ? 'Secondary' : 'Primary',
          updatedAt: sql`datetime('now')`,
        })
        .where(eq(costCentres.ccId, data.cc_id));

      const updated = await findRow(sql`${costCentres.ccId} = ${data.cc_id}`);
      return { success: true, costCentre: updated };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  delete: async (id) => {
    try {
      const existing = await findRow(sql`${costCentres.ccId} = ${id}`);
      if (!existing) return { success: false, error: 'Cost Centre not found' };

      const hasChildren = await db.all(
        sql`SELECT * FROM ${costCentres}
            WHERE ${costCentres.parentId} = ${id}
              AND ${costCentres.isActive} = 1`
      );
      if (hasChildren.length > 0) return { success: false, error: 'Cannot delete Cost Centre with sub-centres' };

      await db
        .update(costCentres)
        .set({ isActive: 0 })
        .where(eq(costCentres.ccId, id));
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },
};
