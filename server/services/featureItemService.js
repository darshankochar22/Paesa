const { db } = require('../db/index');

module.exports = {
  getAll: async () => {
    try {
      const result = await db.execute(
        `SELECT fi.*, fg.group_key, fg.group_name
         FROM feature_items fi
         INNER JOIN feature_groups fg ON fg.feature_group_id = fi.feature_group_id
         WHERE fi.is_active = 1
         ORDER BY fi.feature_group_id ASC, fi.display_order ASC`
      );
      return { success: true, featureItems: result.rows };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  getById: async (id) => {
    try {
      const result = await db.execute(
        `SELECT * FROM feature_items WHERE feature_item_id = ?`,
        [id]
      );
      if (result.rows.length === 0) return { success: false, error: 'Feature Item not found' };
      return { success: true, item: result.rows[0] };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  getByGroup: async (feature_group_id) => {
    try {
      const result = await db.execute(
        `SELECT * FROM feature_items WHERE feature_group_id = ? AND is_active = 1 ORDER BY display_order ASC`,
        [feature_group_id]
      );
      return { success: true, featureItems: result.rows };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },
};