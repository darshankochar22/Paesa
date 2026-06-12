const { db } = require('../db/index');

module.exports = {
  create: async (data) => {
    try {
      const exists = await db.execute(
        `SELECT * FROM tds_nature_of_payment WHERE company_id = ? AND LOWER(name) = LOWER(?) AND is_active = 1`,
        [data.company_id, data.name]
      );
      if (exists.rows.length > 0) return { success: false, error: 'TDS Nature of Payment already exists' };

      const result = await db.execute(
        `INSERT INTO tds_nature_of_payment (
          company_id, name, section, payment_code, remittance_code,
          rate_individual_with_pan, rate_other_with_pan,
          is_zero_rated, threshold_limit, is_predefined, is_active
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 1)`,
        [
          data.company_id,
          data.name,
          data.section || null,
          data.payment_code || null,
          data.remittance_code || null,
          data.rate_individual_with_pan ?? 0,
          data.rate_other_with_pan ?? 0,
          data.is_zero_rated ?? 0,
          data.threshold_limit ?? 0,
        ]
      );

      const record = await db.execute(
        `SELECT * FROM tds_nature_of_payment WHERE tds_id = ?`,
        [result.lastInsertRowid]
      );
      return { success: true, tdsNatureOfPayment: record.rows[0] };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  getAll: async (company_id) => {
    try {
      const result = await db.execute(
        `SELECT * FROM tds_nature_of_payment WHERE company_id = ? AND is_active = 1`,
        [company_id]
      );
      return {
        success: true,
        tdsNatureOfPaymentList: result.rows,
      };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  getById: async (id) => {
    try {
      const result = await db.execute(
        `SELECT * FROM tds_nature_of_payment WHERE tds_id = ?`,
        [id]
      );
      if (result.rows.length === 0) return { success: false, error: 'TDS Nature of Payment not found' };
      return { success: true, tdsNatureOfPayment: result.rows[0] };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  update: async (data) => {
    try {
      const existing = await db.execute(
        `SELECT * FROM tds_nature_of_payment WHERE tds_id = ?`,
        [data.tds_id]
      );
      if (existing.rows.length === 0) return { success: false, error: 'TDS Nature of Payment not found' };

      const c = existing.rows[0];
      await db.execute(
        `UPDATE tds_nature_of_payment SET
          name = ?,
          section = ?,
          payment_code = ?,
          remittance_code = ?,
          rate_individual_with_pan = ?,
          rate_other_with_pan = ?,
          is_zero_rated = ?,
          threshold_limit = ?,
          updated_at = datetime('now')
        WHERE tds_id = ?`,
        [
          data.name ?? c.name,
          data.section ?? c.section,
          data.payment_code ?? c.payment_code,
          data.remittance_code ?? c.remittance_code,
          data.rate_individual_with_pan ?? c.rate_individual_with_pan,
          data.rate_other_with_pan ?? c.rate_other_with_pan,
          data.is_zero_rated ?? c.is_zero_rated,
          data.threshold_limit ?? c.threshold_limit,
          data.tds_id,
        ]
      );

      const updated = await db.execute(
        `SELECT * FROM tds_nature_of_payment WHERE tds_id = ?`,
        [data.tds_id]
      );
      return { success: true, tdsNatureOfPayment: updated.rows[0] };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  delete: async (id) => {
    try {
      const existing = await db.execute(
        `SELECT * FROM tds_nature_of_payment WHERE tds_id = ?`,
        [id]
      );
      if (existing.rows.length === 0) return { success: false, error: 'TDS Nature of Payment not found' };

      await db.execute(
        `UPDATE tds_nature_of_payment SET is_active = 0 WHERE tds_id = ?`,
        [id]
      );
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },
};
