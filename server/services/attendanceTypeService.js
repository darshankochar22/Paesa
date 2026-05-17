const { db } = require('../db/index');

const seedDefaultAttendanceTypes = async (company_id) => {
  const defaults = [
    { name: 'Present',      type: 'Attendance' },
    { name: 'Absent',       type: 'Attendance' },
    { name: 'Half Day',     type: 'Attendance' },
    { name: 'Paid Leave',   type: 'Leave'      },
    { name: 'Unpaid Leave', type: 'Leave'      },
    { name: 'Overtime',     type: 'Production' },
  ];

  for (const a of defaults) {
    await db.execute(
      `INSERT INTO attendance_types (company_id, name, type, unit_id, is_active, is_predefined)
       VALUES (?, ?, ?, null, 1, 1)`,
      [company_id, a.name, a.type]
    );
  }
};

module.exports = {
  seedDefaultAttendanceTypes,

  create: async (data) => {
    try {
      const exists = await db.execute(
        `SELECT * FROM attendance_types WHERE company_id = ? AND LOWER(name) = LOWER(?) AND is_active = 1`,
        [data.company_id, data.name]
      );
      if (exists.rows.length > 0) return { success: false, error: 'Attendance Type already exists' };

      const result = await db.execute(
        `INSERT INTO attendance_types (company_id, name, type, unit_id, is_active, is_predefined)
         VALUES (?, ?, ?, ?, 1, 0)`,
        [data.company_id, data.name, data.type || 'Attendance', data.unit_id || null]
      );

      const attendanceType = await db.execute(
        `SELECT * FROM attendance_types WHERE attendance_type_id = ?`,
        [result.lastInsertRowid]
      );
      return { success: true, attendanceType: attendanceType.rows[0] };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  getAll: async (company_id) => {
    try {
      const result = await db.execute(
        `SELECT * FROM attendance_types WHERE company_id = ? AND is_active = 1`,
        [company_id]
      );
      return { success: true, attendanceTypes: result.rows };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  getById: async (id) => {
    try {
      const result = await db.execute(
        `SELECT * FROM attendance_types WHERE attendance_type_id = ?`,
        [id]
      );
      if (result.rows.length === 0) return { success: false, error: 'Attendance Type not found' };
      return { success: true, attendanceType: result.rows[0] };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  update: async (data) => {
    try {
      const existing = await db.execute(
        `SELECT * FROM attendance_types WHERE attendance_type_id = ?`,
        [data.attendance_type_id]
      );
      if (existing.rows.length === 0) return { success: false, error: 'Attendance Type not found' };
      if (existing.rows[0].is_predefined) return { success: false, error: 'Cannot edit predefined attendance types' };

      const current = existing.rows[0];
      await db.execute(
        `UPDATE attendance_types SET
          name = ?, type = ?, unit_id = ?, updated_at = datetime('now')
         WHERE attendance_type_id = ?`,
        [
          data.name ?? current.name,
          data.type ?? current.type,
          data.unit_id ?? current.unit_id,
          data.attendance_type_id,
        ]
      );

      const updated = await db.execute(
        `SELECT * FROM attendance_types WHERE attendance_type_id = ?`,
        [data.attendance_type_id]
      );
      return { success: true, attendanceType: updated.rows[0] };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  delete: async (id) => {
    try {
      const existing = await db.execute(
        `SELECT * FROM attendance_types WHERE attendance_type_id = ?`,
        [id]
      );
      if (existing.rows.length === 0) return { success: false, error: 'Attendance Type not found' };
      if (existing.rows[0].is_predefined) return { success: false, error: 'Cannot delete predefined attendance types' };

      await db.execute(
        `UPDATE attendance_types SET is_active = 0 WHERE attendance_type_id = ?`,
        [id]
      );
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },
};