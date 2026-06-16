// ---------------------------------------------------------------------------
// Drizzle ORM conversion (see currencyService.js golden exemplar).
//
//   * Mutations use the query builder: db.insert(...).values(...),
//     db.delete(...).where(...).
//   * Reads that return rows to callers use db.all(sql`SELECT ...`) so the
//     legacy snake_case column keys (level_index, name, price_level_id) are
//     preserved exactly — the service logic reads row.level_index / row.name.
//     Column identifiers inside the template come from the schema object
//     (${priceLevels.levelIndex}) rather than hardcoded strings.
// ---------------------------------------------------------------------------
const { db } = require('../db/index');
const { sql, eq } = require('drizzle-orm');
const { priceLevels } = require('../db/schema');

module.exports = {

  getPriceLevels: async (company_id) => {
    try {
      const rows = await db.all(
        sql`SELECT ${priceLevels.levelIndex}, ${priceLevels.name}
              FROM ${priceLevels}
             WHERE ${priceLevels.companyId} = ${company_id}
             ORDER BY ${priceLevels.levelIndex} ASC`
      );

      if (rows.length === 0) return { success: true, data: [] };

      const maxIndex = Math.max(...rows.map((r) => r.level_index));
      const data = Array(maxIndex + 1).fill('');
      rows.forEach((row) => {
        data[row.level_index] = row.name ?? '';
      });

      return { success: true, data };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  savePriceLevels: async (data) => {
    try {
      const { company_id, levels } = data;

      if (!company_id)            return { success: false, error: 'company_id is required.' };
      if (!Array.isArray(levels)) return { success: false, error: 'levels must be an array.' };

      const filled = levels.filter((l) => typeof l === 'string' && l.trim() !== '');
      if (filled.length === 0)    return { success: false, error: 'At least one price level name is required.' };

      // Delete all then re-insert — cleanly handles list shrinking
      await db.delete(priceLevels).where(eq(priceLevels.companyId, company_id));

      for (let i = 0; i < levels.length; i++) {
        const name = typeof levels[i] === 'string' ? levels[i].trim() : '';
        await db
          .insert(priceLevels)
          .values({
            companyId: company_id,
            levelIndex: i,
            name,
            updatedAt: sql`datetime('now')`,
          });
      }

      const saved = await db.all(
        sql`SELECT ${priceLevels.levelIndex}, ${priceLevels.name}
              FROM ${priceLevels}
             WHERE ${priceLevels.companyId} = ${company_id}
             ORDER BY ${priceLevels.levelIndex} ASC`
      );

      const savedData = Array(levels.length).fill('');
      saved.forEach((row) => {
        savedData[row.level_index] = row.name ?? '';
      });

      return { success: true, data: savedData };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  deletePriceLevels: async (company_id) => {
    try {
      const existing = await db.all(
        sql`SELECT ${priceLevels.priceLevelId}
              FROM ${priceLevels}
             WHERE ${priceLevels.companyId} = ${company_id}`
      );
      if (existing.length === 0) return { success: false, error: 'No price levels found for this company.' };

      await db.delete(priceLevels).where(eq(priceLevels.companyId, company_id));
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

};
