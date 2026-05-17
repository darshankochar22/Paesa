const { db } = require('../db/index');

const seedCompanyCreationSuccess = async (company_id) => {
  await db.execute(
    `INSERT INTO company_creation_success (
      company_id, created_successfully, success_screen_shown,
      show_more_features, show_all_features, default_features_loaded, feature_setup_completed
    ) VALUES (?, 1, 0, 0, 0, 1, 0)`,
    [company_id]
  );
};

module.exports = {
  seedCompanyCreationSuccess,

  get: async (company_id) => {
    try {
      const result = await db.execute(
        `SELECT * FROM company_creation_success WHERE company_id = ?`,
        [company_id]
      );
      if (result.rows.length === 0) return { success: false, error: 'Record not found' };
      return { success: true, record: result.rows[0] };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  update: async (data) => {
    try {
      const existing = await db.execute(
        `SELECT * FROM company_creation_success WHERE company_id = ?`,
        [data.company_id]
      );
      if (existing.rows.length === 0) return { success: false, error: 'Record not found' };

      const current = existing.rows[0];
      await db.execute(
        `UPDATE company_creation_success SET
          created_successfully = ?,
          success_screen_shown = ?,
          show_more_features = ?,
          show_all_features = ?,
          default_features_loaded = ?,
          feature_setup_completed = ?,
          updated_at = datetime('now')
         WHERE company_id = ?`,
        [
          data.created_successfully ?? current.created_successfully,
          data.success_screen_shown ?? current.success_screen_shown,
          data.show_more_features ?? current.show_more_features,
          data.show_all_features ?? current.show_all_features,
          data.default_features_loaded ?? current.default_features_loaded,
          data.feature_setup_completed ?? current.feature_setup_completed,
          data.company_id,
        ]
      );

      const updated = await db.execute(
        `SELECT * FROM company_creation_success WHERE company_id = ?`,
        [data.company_id]
      );
      return { success: true, record: updated.rows[0] };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },
};