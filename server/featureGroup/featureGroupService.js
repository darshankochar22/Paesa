const { db } = require('../db/index');
const { sql, eq } = require('drizzle-orm');
const { featureGroups } = require('../db/schema');

module.exports = {
  getAll: async () => {
    try {
      const rows = await db.all(
        sql`SELECT * FROM ${featureGroups}
            WHERE ${featureGroups.isActive} = 1
            ORDER BY ${featureGroups.displayOrder} ASC`
      );
      return { success: true, featureGroups: rows };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  getById: async (id) => {
    try {
      const rows = await db.all(
        sql`SELECT * FROM ${featureGroups}
            WHERE ${featureGroups.featureGroupId} = ${id}`
      );
      if (rows.length === 0) return { success: false, error: 'Feature Group not found' };
      return { success: true, group: rows[0] };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },
};
