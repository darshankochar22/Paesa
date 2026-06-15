const { db } = require('../db/index');

module.exports = {
  create: async (data) => {
    try {
      const exists = await db.execute(
        `SELECT * FROM tcs_nature_of_goods WHERE company_id = ? AND LOWER(name) = LOWER(?) AND is_active = 1`,
        [data.company_id, data.name]
      );
      if (exists.rows.length > 0) return { success: false, error: 'TCS Nature of Goods already exists' };

      const result = await db.execute(
        `INSERT INTO tcs_nature_of_goods (
          company_id, name, section, payment_code,
          rate_individual_with_pan, rate_individual_without_pan,
          rate_other_with_pan, rate_other_without_pan,
          is_own_status, tax_on_receipt_or_realization,
          threshold_level, is_zero_rated, is_predefined, is_active
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 1)`,
        [
          data.company_id,
          data.name,
          data.section || null,
          data.payment_code || null,
          data.rate_individual_with_pan ?? 0,
          data.rate_individual_without_pan ?? 0,
          data.rate_other_with_pan ?? 0,
          data.rate_other_without_pan ?? 0,
          data.is_own_status ?? 0,
          data.tax_on_receipt_or_realization || 'Tax Calculated on Receipt',
          data.threshold_level ?? 0,
          data.is_zero_rated ?? 0,
        ]
      );

      const record = await db.execute(
        `SELECT * FROM tcs_nature_of_goods WHERE tcs_id = ?`,
        [result.lastInsertRowid]
      );
      return { success: true, tcsNatureOfGoods: record.rows[0] };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  getAll: async (company_id) => {
    try {
      const result = await db.execute(
        `SELECT * FROM tcs_nature_of_goods WHERE company_id = ? AND is_active = 1`,
        [company_id]
      );
      return {
        success: true,
        tcsNatureOfGoodsList: result.rows,
      };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  getById: async (id) => {
    try {
      const result = await db.execute(
        `SELECT * FROM tcs_nature_of_goods WHERE tcs_id = ?`,
        [id]
      );
      if (result.rows.length === 0) return { success: false, error: 'TCS Nature of Goods not found' };
      return { success: true, tcsNatureOfGoods: result.rows[0] };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  update: async (data) => {
    try {
      const existing = await db.execute(
        `SELECT * FROM tcs_nature_of_goods WHERE tcs_id = ?`,
        [data.tcs_id]
      );
      if (existing.rows.length === 0) return { success: false, error: 'TCS Nature of Goods not found' };

      const c = existing.rows[0];
      await db.execute(
        `UPDATE tcs_nature_of_goods SET
          name = ?,
          section = ?,
          payment_code = ?,
          rate_individual_with_pan = ?,
          rate_individual_without_pan = ?,
          rate_other_with_pan = ?,
          rate_other_without_pan = ?,
          is_own_status = ?,
          tax_on_receipt_or_realization = ?,
          threshold_level = ?,
          is_zero_rated = ?,
          updated_at = datetime('now')
        WHERE tcs_id = ?`,
        [
          data.name ?? c.name,
          data.section ?? c.section,
          data.payment_code ?? c.payment_code,
          data.rate_individual_with_pan ?? c.rate_individual_with_pan,
          data.rate_individual_without_pan ?? c.rate_individual_without_pan,
          data.rate_other_with_pan ?? c.rate_other_with_pan,
          data.rate_other_without_pan ?? c.rate_other_without_pan,
          data.is_own_status ?? c.is_own_status,
          data.tax_on_receipt_or_realization ?? c.tax_on_receipt_or_realization,
          data.threshold_level ?? c.threshold_level,
          data.is_zero_rated ?? c.is_zero_rated,
          data.tcs_id,
        ]
      );

      const updated = await db.execute(
        `SELECT * FROM tcs_nature_of_goods WHERE tcs_id = ?`,
        [data.tcs_id]
      );
      return { success: true, tcsNatureOfGoods: updated.rows[0] };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  delete: async (id) => {
    try {
      const existing = await db.execute(
        `SELECT * FROM tcs_nature_of_goods WHERE tcs_id = ?`,
        [id]
      );
      if (existing.rows.length === 0) return { success: false, error: 'TCS Nature of Goods not found' };

      await db.execute(
        `UPDATE tcs_nature_of_goods SET is_active = 0 WHERE tcs_id = ?`,
        [id]
      );
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },
};
