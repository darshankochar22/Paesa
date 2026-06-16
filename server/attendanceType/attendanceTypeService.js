const { db } = require('../db/index');
const { sql, eq, and } = require('drizzle-orm');
const { attendanceTypes } = require('../db/schema');

// Fetch a single attendance_types row in the legacy snake_case shape (or undefined).
const findRow = async (whereSql) => {
  const rows = await db.all(sql`SELECT * FROM ${attendanceTypes} WHERE ${whereSql}`);
  return rows[0];
};

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
    await db
      .insert(attendanceTypes)
      .values({
        companyId: company_id,
        name: a.name,
        type: a.type,
        unitId: null,
        isActive: 1,
        isPredefined: 1,
      });
  }
};

module.exports = {
  seedDefaultAttendanceTypes,

  create: async (data) => {
    try {
      const exists = await db.all(
        sql`SELECT * FROM ${attendanceTypes}
            WHERE ${attendanceTypes.companyId} = ${data.company_id}
              AND LOWER(${attendanceTypes.name}) = LOWER(${data.name})
              AND ${attendanceTypes.isActive} = 1`
      );
      if (exists.length > 0) return { success: false, error: 'Attendance Type already exists' };

      const inserted = await db
        .insert(attendanceTypes)
        .values({
          companyId: data.company_id,
          name: data.name,
          alias: data.alias || null,
          type: data.type || 'Attendance / Leave with Pay',
          unitId: data.unit_id || null,
          period: data.period || 'Per Day',
          carryForward: data.carry_forward ?? 0,
          encashment: data.encashment ?? 0,
          maxDays: data.max_days || 0,
          isActive: 1,
          isPredefined: 0,
        })
        .returning({ id: attendanceTypes.attendanceTypeId });

      const attendanceType = await findRow(
        sql`${attendanceTypes.attendanceTypeId} = ${inserted[0].id}`
      );
      return { success: true, attendanceType };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  getAll: async (company_id) => {
    try {
      const rows = await db.all(
        sql`SELECT * FROM ${attendanceTypes}
            WHERE ${attendanceTypes.companyId} = ${company_id}
              AND ${attendanceTypes.isActive} = 1`
      );
      return { success: true, attendanceTypes: rows };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  getById: async (id) => {
    try {
      const attendanceType = await findRow(
        sql`${attendanceTypes.attendanceTypeId} = ${id}`
      );
      if (!attendanceType) return { success: false, error: 'Attendance Type not found' };
      return { success: true, attendanceType };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  update: async (data) => {
    try {
      const current = await findRow(
        sql`${attendanceTypes.attendanceTypeId} = ${data.attendance_type_id}`
      );
      if (!current) return { success: false, error: 'Attendance Type not found' };
      if (current.is_predefined) return { success: false, error: 'Cannot edit predefined attendance types' };

      await db
        .update(attendanceTypes)
        .set({
          name: data.name ?? current.name,
          alias: data.alias ?? current.alias,
          type: data.type ?? current.type,
          unitId: data.unit_id ?? current.unit_id,
          period: data.period ?? current.period,
          carryForward: data.carry_forward ?? current.carry_forward,
          encashment: data.encashment ?? current.encashment,
          maxDays: data.max_days ?? current.max_days,
          updatedAt: sql`datetime('now')`,
        })
        .where(eq(attendanceTypes.attendanceTypeId, data.attendance_type_id));

      const updated = await findRow(
        sql`${attendanceTypes.attendanceTypeId} = ${data.attendance_type_id}`
      );
      return { success: true, attendanceType: updated };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  delete: async (id) => {
    try {
      const existing = await findRow(
        sql`${attendanceTypes.attendanceTypeId} = ${id}`
      );
      if (!existing) return { success: false, error: 'Attendance Type not found' };
      if (existing.is_predefined) return { success: false, error: 'Cannot delete predefined attendance types' };

      await db
        .update(attendanceTypes)
        .set({ isActive: 0 })
        .where(eq(attendanceTypes.attendanceTypeId, id));
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },
};
