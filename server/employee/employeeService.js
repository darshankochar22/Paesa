const { db } = require('../db/index');
const { sql, eq, and } = require('drizzle-orm');
const { employees } = require('../db/schema');

// Fetch a single employee row in the legacy snake_case shape (or undefined).
const findRow = async (whereSql) => {
  const rows = await db.all(sql`SELECT * FROM ${employees} WHERE ${whereSql}`);
  return rows[0];
};

const generateEmployeeCode = async (company_id) => {
  const rows = await db.all(
    sql`SELECT COUNT(*) as count FROM ${employees} WHERE ${employees.companyId} = ${company_id}`
  );
  const count = Number(rows[0].count) + 1;
  return `EMP-${String(count).padStart(5, '0')}`;
};

module.exports = {
  create: async (data) => {
    try {
      if (data.employee_code) {
        const exists = await db.all(
          sql`SELECT * FROM ${employees}
              WHERE ${employees.companyId} = ${data.company_id}
                AND ${employees.employeeCode} = ${data.employee_code}
                AND ${employees.isActive} = 1`
        );
        if (exists.length > 0) return { success: false, error: 'Employee code already exists' };
      }

      const employee_code = data.employee_code || await generateEmployeeCode(data.company_id);

      const inserted = await db
        .insert(employees)
        .values({
          companyId: data.company_id,
          employeeGroupId: data.employee_group_id || null,
          name: data.name,
          alias: data.alias || null,
          employeeCode: employee_code,
          designation: data.designation || null,
          department: data.department || null,
          function: data.function || null,
          location: data.location || null,
          dateOfJoining: data.date_of_joining || null,
          dateOfLeaving: data.date_of_leaving || null,
          dateOfBirth: data.date_of_birth || null,
          gender: data.gender || null,
          bloodGroup: data.blood_group || null,
          fatherName: data.father_name || null,
          motherName: data.mother_name || null,
          spouseName: data.spouse_name || null,
          address: data.address || null,
          city: data.city || null,
          state: data.state || null,
          pincode: data.pincode || null,
          mobile: data.mobile || null,
          phone: data.phone || null,
          email: data.email || null,
          defineSalaryDetails: data.define_salary_details ?? 0,
          bankAccountNumber: data.bank_account_number || null,
          bankName: data.bank_name || null,
          bankBranch: data.bank_branch || null,
          ifscCode: data.ifsc_code || null,
          applicableTaxRegime: data.applicable_tax_regime || null,
          pan: data.pan || null,
          aadhaar: data.aadhaar || null,
          uan: data.uan || null,
          pfAccountNumber: data.pf_account_number || null,
          epsAccountNumber: data.eps_account_number || null,
          dateOfJoiningPf: data.date_of_joining_pf || null,
          pran: data.pran || null,
          esiNumber: data.esi_number || null,
          esiDispensaryName: data.esi_dispensary_name || null,
          isActive: 1,
        })
        .returning({ id: employees.employeeId });

      const employee = await findRow(sql`${employees.employeeId} = ${inserted[0].id}`);
      return { success: true, employee };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  getAll: async (company_id) => {
    try {
      const rows = await db.all(
        sql`SELECT * FROM ${employees}
            WHERE ${employees.companyId} = ${company_id}
              AND ${employees.isActive} = 1`
      );
      return { success: true, employees: rows };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  getById: async (id) => {
    try {
      const employee = await findRow(sql`${employees.employeeId} = ${id}`);
      if (!employee) return { success: false, error: 'Employee not found' };
      return { success: true, employee };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  getByGroup: async (company_id, employee_group_id) => {
    try {
      const rows = await db.all(
        sql`SELECT * FROM ${employees}
            WHERE ${employees.companyId} = ${company_id}
              AND ${employees.employeeGroupId} = ${employee_group_id}
              AND ${employees.isActive} = 1`
      );
      return { success: true, employees: rows };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  update: async (data) => {
    try {
      const current = await findRow(sql`${employees.employeeId} = ${data.employee_id}`);
      if (!current) return { success: false, error: 'Employee not found' };

      if (data.employee_code && data.employee_code !== current.employee_code) {
        const codeExists = await db.all(
          sql`SELECT * FROM ${employees}
              WHERE ${employees.companyId} = ${current.company_id}
                AND ${employees.employeeCode} = ${data.employee_code}
                AND ${employees.isActive} = 1`
        );
        if (codeExists.length > 0) return { success: false, error: 'Employee code already exists' };
      }

      await db
        .update(employees)
        .set({
          employeeGroupId: data.employee_group_id ?? current.employee_group_id,
          name: data.name ?? current.name,
          alias: data.alias ?? current.alias,
          employeeCode: data.employee_code ?? current.employee_code,
          designation: data.designation ?? current.designation,
          department: data.department ?? current.department,
          function: data.function ?? current.function,
          location: data.location ?? current.location,
          dateOfJoining: data.date_of_joining ?? current.date_of_joining,
          dateOfLeaving: data.date_of_leaving ?? current.date_of_leaving,
          dateOfBirth: data.date_of_birth ?? current.date_of_birth,
          gender: data.gender ?? current.gender,
          bloodGroup: data.blood_group ?? current.blood_group,
          fatherName: data.father_name ?? current.father_name,
          motherName: data.mother_name ?? current.mother_name,
          spouseName: data.spouse_name ?? current.spouse_name,
          address: data.address ?? current.address,
          city: data.city ?? current.city,
          state: data.state ?? current.state,
          pincode: data.pincode ?? current.pincode,
          mobile: data.mobile ?? current.mobile,
          phone: data.phone ?? current.phone,
          email: data.email ?? current.email,
          defineSalaryDetails: data.define_salary_details ?? current.define_salary_details,
          bankAccountNumber: data.bank_account_number ?? current.bank_account_number,
          bankName: data.bank_name ?? current.bank_name,
          bankBranch: data.bank_branch ?? current.bank_branch,
          ifscCode: data.ifsc_code ?? current.ifsc_code,
          applicableTaxRegime: data.applicable_tax_regime ?? current.applicable_tax_regime,
          pan: data.pan ?? current.pan,
          aadhaar: data.aadhaar ?? current.aadhaar,
          uan: data.uan ?? current.uan,
          pfAccountNumber: data.pf_account_number ?? current.pf_account_number,
          epsAccountNumber: data.eps_account_number ?? current.eps_account_number,
          dateOfJoiningPf: data.date_of_joining_pf ?? current.date_of_joining_pf,
          pran: data.pran ?? current.pran,
          esiNumber: data.esi_number ?? current.esi_number,
          esiDispensaryName: data.esi_dispensary_name ?? current.esi_dispensary_name,
          updatedAt: sql`datetime('now')`,
        })
        .where(eq(employees.employeeId, data.employee_id));

      const updated = await findRow(sql`${employees.employeeId} = ${data.employee_id}`);
      return { success: true, employee: updated };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  delete: async (id) => {
    try {
      const current = await findRow(sql`${employees.employeeId} = ${id}`);
      if (!current) return { success: false, error: 'Employee not found' };

      await db
        .update(employees)
        .set({
          isActive: 0,
          dateOfLeaving: current.date_of_leaving || new Date().toISOString().split('T')[0],
          updatedAt: sql`datetime('now')`,
        })
        .where(eq(employees.employeeId, id));
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },
};
