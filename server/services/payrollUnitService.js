const { db } = require('../db/index');

const seedDefaultPayrollUnits = async (company_id) => {
  const defaults = [
    { name: 'Days',    symbol: 'Days', unit_type: 'Simple', decimal_places: 0 },
    { name: 'Hours',   symbol: 'Hrs',  unit_type: 'Simple', decimal_places: 2 },
    { name: 'Minutes', symbol: 'Min',  unit_type: 'Simple', decimal_places: 0 },
    { name: 'Months',  symbol: 'Mth',  unit_type: 'Simple', decimal_places: 0 },
    { name: 'Pieces',  symbol: 'Pcs',  unit_type: 'Simple', decimal_places: 0 },
  ];

  for (const u of defaults) {
    await db.execute(
      `INSERT INTO payroll_units (company_id, name, symbol, unit_type, decimal_places, is_active, is_predefined)
       VALUES (?, ?, ?, ?, ?, 1, 1)`,
      [company_id, u.name, u.symbol, u.unit_type, u.decimal_places]
    );
  }
};

module.exports = {
  seedDefaultPayrollUnits,

  create: async (data) => {
    try {
      const exists = await db.execute(
        `SELECT * FROM payroll_units WHERE company_id = ? AND LOWER(name) = LOWER(?) AND is_active = 1`,
        [data.company_id, data.name]
      );
      if (exists.rows.length > 0) return { success: false, error: 'Payroll Unit already exists' };

      const result = await db.execute(
        `INSERT INTO payroll_units (company_id, name, symbol, unit_type, decimal_places, is_active, is_predefined)
         VALUES (?, ?, ?, ?, ?, 1, 0)`,
        [
          data.company_id,
          data.name,
          data.symbol,
          data.unit_type || 'Simple',
          data.decimal_places ?? 0,
        ]
      );

      const unit = await db.execute(
        `SELECT * FROM payroll_units WHERE payroll_unit_id = ?`,
        [result.lastInsertRowid]
      );
      return { success: true, unit: unit.rows[0] };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  getAll: async (company_id) => {
    try {
      const result = await db.execute(
        `SELECT * FROM payroll_units WHERE company_id = ? AND is_active = 1`,
        [company_id]
      );
      return { success: true, payrollUnits: result.rows };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  getById: async (id) => {
    try {
      const result = await db.execute(
        `SELECT * FROM payroll_units WHERE payroll_unit_id = ?`,
        [id]
      );
      if (result.rows.length === 0) return { success: false, error: 'Payroll Unit not found' };
      return { success: true, unit: result.rows[0] };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  update: async (data) => {
    try {
      const existing = await db.execute(
        `SELECT * FROM payroll_units WHERE payroll_unit_id = ?`,
        [data.payroll_unit_id]
      );
      if (existing.rows.length === 0) return { success: false, error: 'Payroll Unit not found' };
      if (existing.rows[0].is_predefined) return { success: false, error: 'Cannot edit predefined payroll units' };

      const current = existing.rows[0];
      await db.execute(
        `UPDATE payroll_units SET
          name = ?, symbol = ?, unit_type = ?, decimal_places = ?,
          updated_at = datetime('now')
         WHERE payroll_unit_id = ?`,
        [
          data.name ?? current.name,
          data.symbol ?? current.symbol,
          data.unit_type ?? current.unit_type,
          data.decimal_places ?? current.decimal_places,
          data.payroll_unit_id,
        ]
      );

      const updated = await db.execute(
        `SELECT * FROM payroll_units WHERE payroll_unit_id = ?`,
        [data.payroll_unit_id]
      );
      return { success: true, unit: updated.rows[0] };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  delete: async (id) => {
    try {
      const existing = await db.execute(
        `SELECT * FROM payroll_units WHERE payroll_unit_id = ?`,
        [id]
      );
      if (existing.rows.length === 0) return { success: false, error: 'Payroll Unit not found' };
      if (existing.rows[0].is_predefined) return { success: false, error: 'Cannot delete predefined payroll units' };

      await db.execute(
        `UPDATE payroll_units SET is_active = 0 WHERE payroll_unit_id = ?`,
        [id]
      );
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },
};