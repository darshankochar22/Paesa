const { db } = require('../db/index');
const { sql } = require('drizzle-orm');
const { featureItems, featureGroups } = require('../db/schema');

module.exports = {
  getAll: async () => {
    try {
      const rows = await db.all(
        sql`SELECT fi.*, fg.group_key, fg.group_name
            FROM ${featureItems} fi
            INNER JOIN ${featureGroups} fg ON fg.feature_group_id = fi.feature_group_id
            WHERE fi.is_active = 1
            ORDER BY fi.feature_group_id ASC, fi.display_order ASC`
      );
      return { success: true, featureItems: rows };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  getById: async (id) => {
    try {
      const rows = await db.all(
        sql`SELECT * FROM ${featureItems} WHERE ${featureItems.featureItemId} = ${id}`
      );
      if (rows.length === 0) return { success: false, error: 'Feature Item not found' };
      return { success: true, item: rows[0] };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  getByGroup: async (feature_group_id) => {
    try {
      const rows = await db.all(
        sql`SELECT * FROM ${featureItems}
            WHERE ${featureItems.featureGroupId} = ${feature_group_id}
              AND ${featureItems.isActive} = 1
            ORDER BY ${featureItems.displayOrder} ASC`
      );
      return { success: true, featureItems: rows };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },
};
