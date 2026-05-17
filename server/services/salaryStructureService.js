const { db } = require('../db/index');

module.exports = {
  create: async (data) => {
    try {
      const exists = await db.execute(
        `SELECT * FROM salary_structures WHERE company_id = ? AND employee_id = ? AND effective_from = ? AND pay_head_id = ? AND is_active = 1`,
        [data.company_id, data.employee_id, data.effective_from, data.pay_head_id]
      );
      if (exists.rows.length > 0) return { success: false, error: 'Salary structure already exists for this date' };

      const result = await db.execute(
        `INSERT INTO salary_structures (company_id, employee_id, effective_from, pay_head_id, amount, calculation_mode, is_active)
         VALUES (?, ?, ?, ?, ?, ?, 1)`,
        [
          data.company_id, data.employee_id, data.effective_from,
          data.pay_head_id, data.amount || 0, data.calculation_mode || 'Flat Rate',
        ]
      );

      const structure = await db.execute(
        `SELECT * FROM salary_structures WHERE structure_id = ?`,
        [result.lastInsertRowid]
      );
      return { success: true, structure: structure.rows[0] };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  createBulk: async (company_id, employee_id, effective_from, entries) => {
    try {
      const created = [];
      for (const entry of entries) {
        const result = await db.execute(
          `INSERT INTO salary_structures (company_id, employee_id, effective_from, pay_head_id, amount, calculation_mode, is_active)
           VALUES (?, ?, ?, ?, ?, ?, 1)`,
          [company_id, employee_id, effective_from, entry.pay_head_id, entry.amount || 0, entry.calculation_mode || 'Flat Rate']
        );
        const structure = await db.execute(
          `SELECT * FROM salary_structures WHERE structure_id = ?`,
          [result.lastInsertRowid]
        );
        created.push(structure.rows[0]);
      }
      return { success: true, structures: created };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  getAll: async (company_id) => {
    try {
      const result = await db.execute(
        `SELECT * FROM salary_structures WHERE company_id = ? AND is_active = 1`,
        [company_id]
      );
      return { success: true, salaryStructures: result.rows };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  getById: async (id) => {
    try {
      const result = await db.execute(
        `SELECT * FROM salary_structures WHERE structure_id = ?`, [id]
      );
      if (result.rows.length === 0) return { success: false, error: 'Salary Structure not found' };
      return { success: true, structure: result.rows[0] };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  getByEmployee: async (company_id, employee_id) => {
    try {
      const result = await db.execute(
        `SELECT * FROM salary_structures WHERE company_id = ? AND employee_id = ? AND is_active = 1 ORDER BY effective_from DESC`,
        [company_id, employee_id]
      );

      const grouped = result.rows.reduce((acc, s) => {
        if (!acc[s.effective_from]) acc[s.effective_from] = [];
        acc[s.effective_from].push(s);
        return acc;
      }, {});

      const sorted = Object.keys(grouped)
        .sort((a, b) => new Date(b) - new Date(a))
        .map(date => ({ effective_from: date, pay_heads: grouped[date] }));

      return { success: true, salaryStructures: sorted };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  update: async (data) => {
    try {
      const existing = await db.execute(
        `SELECT * FROM salary_structures WHERE structure_id = ?`, [data.structure_id]
      );
      if (existing.rows.length === 0) return { success: false, error: 'Salary Structure not found' };

      const current = existing.rows[0];
      await db.execute(
        `UPDATE salary_structures SET
          amount = ?, calculation_mode = ?, updated_at = datetime('now')
         WHERE structure_id = ?`,
        [
          data.amount ?? current.amount,
          data.calculation_mode ?? current.calculation_mode,
          data.structure_id,
        ]
      );

      const updated = await db.execute(
        `SELECT * FROM salary_structures WHERE structure_id = ?`, [data.structure_id]
      );
      return { success: true, structure: updated.rows[0] };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  delete: async (id) => {
    try {
      const existing = await db.execute(
        `SELECT * FROM salary_structures WHERE structure_id = ?`, [id]
      );
      if (existing.rows.length === 0) return { success: false, error: 'Salary Structure not found' };

      await db.execute(
        `UPDATE salary_structures SET is_active = 0 WHERE structure_id = ?`, [id]
      );
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },
};