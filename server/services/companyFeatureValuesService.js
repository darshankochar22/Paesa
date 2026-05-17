const { db } = require('../db/index');

const DEFAULT_VALUES = [
  { feature_item_id: 1,  value_boolean: 1, is_enabled: 1 },
  { feature_item_id: 2,  value_boolean: 0, is_enabled: 0 },
  { feature_item_id: 3,  value_boolean: 0, is_enabled: 0 },
  { feature_item_id: 4,  value_boolean: 1, is_enabled: 1 },
  { feature_item_id: 5,  value_boolean: 1, is_enabled: 1 },
  { feature_item_id: 6,  value_boolean: 0, is_enabled: 0 },
  { feature_item_id: 7,  value_boolean: 0, is_enabled: 0 },
  { feature_item_id: 8,  value_boolean: 0, is_enabled: 0 },
  { feature_item_id: 9,  value_boolean: 0, is_enabled: 0 },
  { feature_item_id: 10, value_boolean: 0, is_enabled: 0 },
  { feature_item_id: 11, value_boolean: 0, is_enabled: 0 },
  { feature_item_id: 12, value_boolean: 0, is_enabled: 0 },
  { feature_item_id: 13, value_boolean: 0, is_enabled: 0 },
  { feature_item_id: 14, value_boolean: 0, is_enabled: 0 },
  { feature_item_id: 15, value_boolean: 0, is_enabled: 0 },
  { feature_item_id: 16, value_boolean: 0, is_enabled: 0 },
  { feature_item_id: 17, value_boolean: 0, is_enabled: 0 },
  { feature_item_id: 18, value_boolean: 0, is_enabled: 0 },
  { feature_item_id: 19, value_boolean: 0, is_enabled: 0 },
];

const seedCompanyFeatureValues = async (company_id) => {
  for (const v of DEFAULT_VALUES) {
    await db.execute(
      `INSERT INTO company_feature_values (
        company_id, feature_item_id, value_boolean,
        value_text, value_number, value_date, is_enabled
      ) VALUES (?, ?, ?, null, null, null, ?)`,
      [company_id, v.feature_item_id, v.value_boolean, v.is_enabled]
    );
  }
};

module.exports = {
  seedCompanyFeatureValues,

  get: async (company_id) => {
    try {
      const result = await db.execute(
        `SELECT cfv.*, fi.feature_key, fi.feature_name, fi.feature_group_id
         FROM company_feature_values cfv
         INNER JOIN feature_items fi ON fi.feature_item_id = cfv.feature_item_id
         WHERE cfv.company_id = ?`,
        [company_id]
      );
      if (result.rows.length === 0) return { success: false, error: 'No feature values found' };
      return { success: true, values: result.rows };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  getByGroup: async (company_id, feature_group_id) => {
    try {
      const result = await db.execute(
        `SELECT cfv.*, fi.feature_key, fi.feature_name
         FROM company_feature_values cfv
         INNER JOIN feature_items fi ON fi.feature_item_id = cfv.feature_item_id
         WHERE cfv.company_id = ? AND fi.feature_group_id = ?`,
        [company_id, feature_group_id]
      );
      return { success: true, values: result.rows };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  update: async (data) => {
    try {
      const existing = await db.execute(
        `SELECT * FROM company_feature_values WHERE company_id = ? AND feature_item_id = ?`,
        [data.company_id, data.feature_item_id]
      );
      if (existing.rows.length === 0) return { success: false, error: 'Feature value not found' };

      const current = existing.rows[0];
      await db.execute(
        `UPDATE company_feature_values SET
          value_boolean = ?, value_text = ?, value_number = ?,
          value_date = ?, is_enabled = ?, updated_at = datetime('now')
         WHERE company_id = ? AND feature_item_id = ?`,
        [
          data.value_boolean ?? current.value_boolean,
          data.value_text ?? current.value_text,
          data.value_number ?? current.value_number,
          data.value_date ?? current.value_date,
          data.is_enabled ?? current.is_enabled,
          data.company_id,
          data.feature_item_id,
        ]
      );

      const updated = await db.execute(
        `SELECT * FROM company_feature_values WHERE company_id = ? AND feature_item_id = ?`,
        [data.company_id, data.feature_item_id]
      );
      return { success: true, value: updated.rows[0] };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  updateBulk: async (company_id, values) => {
    try {
      const updated = [];
      for (const v of values) {
        const existing = await db.execute(
          `SELECT * FROM company_feature_values WHERE company_id = ? AND feature_item_id = ?`,
          [company_id, v.feature_item_id]
        );
        if (existing.rows.length === 0) continue;

        const current = existing.rows[0];
        await db.execute(
          `UPDATE company_feature_values SET
            value_boolean = ?, value_text = ?, value_number = ?,
            value_date = ?, is_enabled = ?, updated_at = datetime('now')
           WHERE company_id = ? AND feature_item_id = ?`,
          [
            v.value_boolean ?? current.value_boolean,
            v.value_text ?? current.value_text,
            v.value_number ?? current.value_number,
            v.value_date ?? current.value_date,
            v.is_enabled ?? current.is_enabled,
            company_id,
            v.feature_item_id,
          ]
        );

        const updatedRow = await db.execute(
          `SELECT * FROM company_feature_values WHERE company_id = ? AND feature_item_id = ?`,
          [company_id, v.feature_item_id]
        );
        updated.push(updatedRow.rows[0]);
      }
      return { success: true, updated };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },
};