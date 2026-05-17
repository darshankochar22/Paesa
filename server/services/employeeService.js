const { db } = require('../db/index');

const generateEmployeeCode = async (company_id) => {
  const result = await db.execute(
    `SELECT COUNT(*) as count FROM employees WHERE company_id = ?`,
    [company_id]
  );
  const count = Number(result.rows[0].count) + 1;
  return `EMP-${String(count).padStart(5, '0')}`;
};

module.exports = {
  create: async (data) => {
    try {
      if (data.employee_code) {
        const exists = await db.execute(
          `SELECT * FROM employees WHERE company_id = ? AND employee_code = ? AND is_active = 1`,
          [data.company_id, data.employee_code]
        );
        if (exists.rows.length > 0) return { success: false, error: 'Employee code already exists' };
      }

      const employee_code = data.employee_code || await generateEmployeeCode(data.company_id);

      const result = await db.execute(
        `INSERT INTO employees (
          company_id, employee_group_id, name, employee_code,
          designation, department, date_of_joining, date_of_leaving,
          mobile, email, bank_account_number, ifsc_code, pan, aadhaar, is_active
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
        [
          data.company_id,
          data.employee_group_id || null,
          data.name,
          employee_code,
          data.designation || null,
          data.department || null,
          data.date_of_joining || null,
          data.date_of_leaving || null,
          data.mobile || null,
          data.email || null,
          data.bank_account_number || null,
          data.ifsc_code || null,
          data.pan || null,
          data.aadhaar || null,
        ]
      );

      const employee = await db.execute(
        `SELECT * FROM employees WHERE employee_id = ?`,
        [result.lastInsertRowid]
      );
      return { success: true, employee: employee.rows[0] };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  getAll: async (company_id) => {
    try {
      const result = await db.execute(
        `SELECT * FROM employees WHERE company_id = ? AND is_active = 1`,
        [company_id]
      );
      return { success: true, employees: result.rows };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  getById: async (id) => {
    try {
      const result = await db.execute(
        `SELECT * FROM employees WHERE employee_id = ?`,
        [id]
      );
      if (result.rows.length === 0) return { success: false, error: 'Employee not found' };
      return { success: true, employee: result.rows[0] };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  getByGroup: async (company_id, employee_group_id) => {
    try {
      const result = await db.execute(
        `SELECT * FROM employees WHERE company_id = ? AND employee_group_id = ? AND is_active = 1`,
        [company_id, employee_group_id]
      );
      return { success: true, employees: result.rows };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  update: async (data) => {
    try {
      const existing = await db.execute(
        `SELECT * FROM employees WHERE employee_id = ?`,
        [data.employee_id]
      );
      if (existing.rows.length === 0) return { success: false, error: 'Employee not found' };

      const current = existing.rows[0];

      if (data.employee_code && data.employee_code !== current.employee_code) {
        const codeExists = await db.execute(
          `SELECT * FROM employees WHERE company_id = ? AND employee_code = ? AND is_active = 1`,
          [current.company_id, data.employee_code]
        );
        if (codeExists.rows.length > 0) return { success: false, error: 'Employee code already exists' };
      }

      await db.execute(
        `UPDATE employees SET
          employee_group_id = ?, name = ?, employee_code = ?,
          designation = ?, department = ?, date_of_joining = ?,
          date_of_leaving = ?, mobile = ?, email = ?,
          bank_account_number = ?, ifsc_code = ?, pan = ?, aadhaar = ?,
          updated_at = datetime('now')
         WHERE employee_id = ?`,
        [
          data.employee_group_id ?? current.employee_group_id,
          data.name ?? current.name,
          data.employee_code ?? current.employee_code,
          data.designation ?? current.designation,
          data.department ?? current.department,
          data.date_of_joining ?? current.date_of_joining,
          data.date_of_leaving ?? current.date_of_leaving,
          data.mobile ?? current.mobile,
          data.email ?? current.email,
          data.bank_account_number ?? current.bank_account_number,
          data.ifsc_code ?? current.ifsc_code,
          data.pan ?? current.pan,
          data.aadhaar ?? current.aadhaar,
          data.employee_id,
        ]
      );

      const updated = await db.execute(
        `SELECT * FROM employees WHERE employee_id = ?`,
        [data.employee_id]
      );
      return { success: true, employee: updated.rows[0] };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  delete: async (id) => {
    try {
      const existing = await db.execute(
        `SELECT * FROM employees WHERE employee_id = ?`,
        [id]
      );
      if (existing.rows.length === 0) return { success: false, error: 'Employee not found' };

      const current = existing.rows[0];
      await db.execute(
        `UPDATE employees SET
          is_active = 0,
          date_of_leaving = ?,
          updated_at = datetime('now')
         WHERE employee_id = ?`,
        [
          current.date_of_leaving || new Date().toISOString().split('T')[0],
          id,
        ]
      );
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },
};