const { db } = require('../db/index');

module.exports = {
  getAll: async () => {
    try {
      const result = await db.execute(
        `SELECT * FROM feature_groups WHERE is_active = 1 ORDER BY display_order ASC`
      );
      return { success: true, featureGroups: result.rows };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  getById: async (id) => {
    try {
      const result = await db.execute(
        `SELECT * FROM feature_groups WHERE feature_group_id = ?`,
        [id]
      );
      if (result.rows.length === 0) return { success: false, error: 'Feature Group not found' };
      return { success: true, group: result.rows[0] };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },
};