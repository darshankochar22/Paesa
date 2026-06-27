// ---------------------------------------------------------------------------
// Excise Duty Classification service — Drizzle ORM (follows the scenarioService
// exemplar).
//
//   * MUTATIONS use the query builder (db.insert / db.update).
//   * READS THAT RETURN ROWS use db.all(sql`SELECT * FROM ${table} ...`) so the
//     legacy snake_case shape (excise_duty_classification_id, duty_code, …) is
//     preserved for the frontend and audit trail.
//
// A classification carries a multi-row "Calculation method" list (one or more of
// "On Assessable Value" / "Basic Excise Duty", added until "End of List"):
//   calculation_methods -> excise_duty_calculation_methods
// create()/update() persist these atomically (update replaces all child rows).
// ---------------------------------------------------------------------------
const { db } = require('../db/index');
const { sql, eq } = require('drizzle-orm');
const {
  exciseDutyClassifications,
  exciseDutyCalculationMethods,
} = require('../db/schema');

const findRow = async (whereSql) => {
  const rows = await db.all(sql`SELECT * FROM ${exciseDutyClassifications} WHERE ${whereSql}`);
  return rows[0];
};

// Returns the calculation methods of a classification as an ordered string[].
const loadMethods = async (id) => {
  const rows = await db.all(
    sql`SELECT * FROM ${exciseDutyCalculationMethods}
        WHERE ${exciseDutyCalculationMethods.exciseDutyClassificationId} = ${id}
        ORDER BY ${exciseDutyCalculationMethods.sortOrder}, ${exciseDutyCalculationMethods.id}`
  );
  return rows.map((r) => r.method);
};

// Insert the calculation-method rows for a classification. Blank entries skipped.
const insertMethods = async (id, methods) => {
  const rows = (methods || [])
    .map((m) => (typeof m === 'string' ? m.trim() : ''))
    .filter(Boolean)
    .map((method, i) => ({ exciseDutyClassificationId: id, method, sortOrder: i }));
  if (rows.length) await db.insert(exciseDutyCalculationMethods).values(rows);
};

const deleteMethods = async (id) => {
  await db.delete(exciseDutyCalculationMethods).where(eq(exciseDutyCalculationMethods.exciseDutyClassificationId, id));
};

module.exports = {
  create: async (data) => {
    try {
      const exists = await db.all(
        sql`SELECT * FROM ${exciseDutyClassifications}
            WHERE ${exciseDutyClassifications.companyId} = ${data.company_id}
              AND LOWER(${exciseDutyClassifications.name}) = LOWER(${data.name})
              AND ${exciseDutyClassifications.isActive} = 1`
      );
      if (exists.length > 0) return { success: false, error: 'Excise Duty Classification already exists' };

      const inserted = await db
        .insert(exciseDutyClassifications)
        .values({
          companyId: data.company_id,
          name: data.name,
          dutyCode: data.duty_code ?? null,
          isActive: 1,
        })
        .returning({ id: exciseDutyClassifications.exciseDutyClassificationId });

      const id = inserted[0].id;
      await insertMethods(id, data.calculation_methods);

      const classification = await findRow(sql`${exciseDutyClassifications.exciseDutyClassificationId} = ${id}`);
      const calculation_methods = await loadMethods(id);
      return { success: true, classification: { ...classification, calculation_methods } };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  getAll: async (company_id) => {
    try {
      const rows = await db.all(
        sql`SELECT * FROM ${exciseDutyClassifications}
            WHERE ${exciseDutyClassifications.companyId} = ${company_id}
              AND ${exciseDutyClassifications.isActive} = 1`
      );
      const classifications = await Promise.all(
        rows.map(async (r) => ({
          ...r,
          calculation_methods: await loadMethods(r.excise_duty_classification_id),
        }))
      );
      return { success: true, classifications };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  getById: async (id) => {
    try {
      const classification = await findRow(sql`${exciseDutyClassifications.exciseDutyClassificationId} = ${id}`);
      if (!classification) return { success: false, error: 'Excise Duty Classification not found' };
      const calculation_methods = await loadMethods(id);
      return { success: true, classification: { ...classification, calculation_methods } };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  update: async (data) => {
    try {
      const current = await findRow(sql`${exciseDutyClassifications.exciseDutyClassificationId} = ${data.excise_duty_classification_id}`);
      if (!current) return { success: false, error: 'Excise Duty Classification not found' };

      await db
        .update(exciseDutyClassifications)
        .set({
          name: data.name ?? current.name,
          dutyCode: data.duty_code !== undefined ? data.duty_code : current.duty_code,
          updatedAt: sql`datetime('now')`,
        })
        .where(eq(exciseDutyClassifications.exciseDutyClassificationId, data.excise_duty_classification_id));

      // Replace the whole calculation-method list with the incoming set.
      if (data.calculation_methods !== undefined) {
        await deleteMethods(data.excise_duty_classification_id);
        await insertMethods(data.excise_duty_classification_id, data.calculation_methods);
      }

      const classification = await findRow(sql`${exciseDutyClassifications.exciseDutyClassificationId} = ${data.excise_duty_classification_id}`);
      const calculation_methods = await loadMethods(data.excise_duty_classification_id);
      return { success: true, classification: { ...classification, calculation_methods } };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  delete: async (id) => {
    try {
      const existing = await findRow(sql`${exciseDutyClassifications.exciseDutyClassificationId} = ${id}`);
      if (!existing) return { success: false, error: 'Excise Duty Classification not found' };

      await db.update(exciseDutyClassifications).set({ isActive: 0 }).where(eq(exciseDutyClassifications.exciseDutyClassificationId, id));
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },
};
