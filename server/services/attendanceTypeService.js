let attendanceTypes = [];

const seedDefaultAttendanceTypes = (company_id) => {
  const defaults = [
    { name: 'Present',       type: 'Attendance',  unit_id: null },
    { name: 'Absent',        type: 'Attendance',  unit_id: null },
    { name: 'Half Day',      type: 'Attendance',  unit_id: null },
    { name: 'Paid Leave',    type: 'Leave',       unit_id: null },
    { name: 'Unpaid Leave',  type: 'Leave',       unit_id: null },
    { name: 'Overtime',      type: 'Production',  unit_id: null },
  ];

  defaults.forEach((a, i) => {
    attendanceTypes.push({
      id: Date.now() + i,
      company_id,
      name: a.name,
      type: a.type,
      unit_id: a.unit_id,
      is_active: true,
      is_predefined: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
  });
};

module.exports = {
  seedDefaultAttendanceTypes,

  create: async (data) => {
    try {
      const exists = attendanceTypes.find(
        a => a.company_id === data.company_id &&
        a.name.toLowerCase() === data.name.toLowerCase()
      );
      if (exists) return { success: false, error: 'Attendance Type already exists' };

      const attendanceType = {
        id: Date.now(),
        company_id: data.company_id,
        name: data.name,
        type: data.type || 'Attendance', 
        unit_id: data.unit_id || null,
        is_active: true,
        is_predefined: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      attendanceTypes.push(attendanceType);
      return { success: true, attendanceType };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  getAll: async (company_id) => {
    try {
      const result = attendanceTypes.filter(
        a => a.company_id === company_id && a.is_active
      );
      return { success: true, attendanceTypes: result };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  getById: async (id) => {
    try {
      const attendanceType = attendanceTypes.find(a => a.id === id);
      if (!attendanceType) return { success: false, error: 'Attendance Type not found' };
      return { success: true, attendanceType };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  update: async (data) => {
    try {
      const index = attendanceTypes.findIndex(a => a.id === data.id);
      if (index === -1) return { success: false, error: 'Attendance Type not found' };
      if (attendanceTypes[index].is_predefined) return { success: false, error: 'Cannot edit predefined attendance types' };

      attendanceTypes[index] = {
        ...attendanceTypes[index],
        ...data,
        updated_at: new Date().toISOString(),
      };
      return { success: true, attendanceType: attendanceTypes[index] };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  delete: async (id) => {
    try {
      const attendanceType = attendanceTypes.find(a => a.id === id);
      if (!attendanceType) return { success: false, error: 'Attendance Type not found' };
      if (attendanceType.is_predefined) return { success: false, error: 'Cannot delete predefined attendance types' };

      attendanceTypes = attendanceTypes.map(a =>
        a.id === id ? { ...a, is_active: false } : a
      );
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },
};