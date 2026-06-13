const { db } = require('../db/index');

module.exports = {

    getPriceLevels: async (company_id) => {
    try {
      const result = await db.execute(
        `SELECT level_index, name
           FROM price_levels
          WHERE company_id = ?
          ORDER BY level_index ASC`,
        [company_id]
      );

      if (result.rows.length === 0) return { success: true, data: [] };

      const maxIndex = Math.max(...result.rows.map((r) => r.level_index));
      const data = Array(maxIndex + 1).fill('');
      result.rows.forEach((row) => {
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
      await db.execute(
        `DELETE FROM price_levels WHERE company_id = ?`,
        [company_id]
      );

      for (let i = 0; i < levels.length; i++) {
        const name = typeof levels[i] === 'string' ? levels[i].trim() : '';
        await db.execute(
          `INSERT INTO price_levels (company_id, level_index, name, updated_at)
                VALUES (?, ?, ?, datetime('now'))`,
          [company_id, i, name]
        );
      }

      const saved = await db.execute(
        `SELECT level_index, name
           FROM price_levels
          WHERE company_id = ?
          ORDER BY level_index ASC`,
        [company_id]
      );

      const savedData = Array(levels.length).fill('');
      saved.rows.forEach((row) => {
        savedData[row.level_index] = row.name ?? '';
      });

      return { success: true, data: savedData };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

    deletePriceLevels: async (company_id) => {
    try {
      const existing = await db.execute(
        `SELECT price_level_id FROM price_levels WHERE company_id = ?`,
        [company_id]
      );
      if (existing.rows.length === 0) return { success: false, error: 'No price levels found for this company.' };

      await db.execute(
        `DELETE FROM price_levels WHERE company_id = ?`,
        [company_id]
      );
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

};