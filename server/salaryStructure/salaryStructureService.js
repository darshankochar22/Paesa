const { db } = require('../db/index');
const { sql, eq, and } = require('drizzle-orm');
const { salaryStructures } = require('../db/schema');

// Fetch a single salary_structures row in the legacy snake_case shape (or undefined).
const findRow = async (whereSql) => {
  const rows = await db.all(sql`SELECT * FROM ${salaryStructures} WHERE ${whereSql}`);
  return rows[0];
};

module.exports = {
  create: async (data) => {
    try {
      const exists = await db.all(
        sql`SELECT * FROM ${salaryStructures}
            WHERE ${salaryStructures.companyId} = ${data.company_id}
              AND ${salaryStructures.employeeId} = ${data.employee_id}
              AND ${salaryStructures.effectiveFrom} = ${data.effective_from}
              AND ${salaryStructures.payHeadId} = ${data.pay_head_id}
              AND ${salaryStructures.isActive} = 1`
      );
      if (exists.length > 0) return { success: false, error: 'Salary structure already exists for this date' };

      const inserted = await db
        .insert(salaryStructures)
        .values({
          companyId: data.company_id,
          employeeId: data.employee_id,
          effectiveFrom: data.effective_from,
          payHeadId: data.pay_head_id,
          amount: data.amount || 0,
          calculationMode: data.calculation_mode || 'Flat Rate',
          isActive: 1,
        })
        .returning({ id: salaryStructures.structureId });

      const structure = await findRow(sql`${salaryStructures.structureId} = ${inserted[0].id}`);
      return { success: true, structure };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  createBulk: async (company_id, employee_id, effective_from, entries) => {
    try {
      const created = [];
      for (const entry of entries) {
        const inserted = await db
          .insert(salaryStructures)
          .values({
            companyId: company_id,
            employeeId: employee_id,
            effectiveFrom: effective_from,
            payHeadId: entry.pay_head_id,
            amount: entry.amount || 0,
            calculationMode: entry.calculation_mode || 'Flat Rate',
            isActive: 1,
          })
          .returning({ id: salaryStructures.structureId });

        const structure = await findRow(sql`${salaryStructures.structureId} = ${inserted[0].id}`);
        created.push(structure);
      }
      return { success: true, structures: created };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  getAll: async (company_id) => {
    try {
      const rows = await db.all(
        sql`SELECT * FROM ${salaryStructures}
            WHERE ${salaryStructures.companyId} = ${company_id}
              AND ${salaryStructures.isActive} = 1`
      );
      return { success: true, salaryStructures: rows };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  getById: async (id) => {
    try {
      const structure = await findRow(sql`${salaryStructures.structureId} = ${id}`);
      if (!structure) return { success: false, error: 'Salary Structure not found' };
      return { success: true, structure };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  getByEmployee: async (company_id, employee_id) => {
    try {
      const rows = await db.all(
        sql`SELECT * FROM ${salaryStructures}
            WHERE ${salaryStructures.companyId} = ${company_id}
              AND ${salaryStructures.employeeId} = ${employee_id}
              AND ${salaryStructures.isActive} = 1
            ORDER BY ${salaryStructures.effectiveFrom} DESC`
      );

      const grouped = rows.reduce((acc, s) => {
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
      const current = await findRow(sql`${salaryStructures.structureId} = ${data.structure_id}`);
      if (!current) return { success: false, error: 'Salary Structure not found' };

      await db
        .update(salaryStructures)
        .set({
          amount: data.amount ?? current.amount,
          calculationMode: data.calculation_mode ?? current.calculation_mode,
          updatedAt: sql`datetime('now')`,
        })
        .where(eq(salaryStructures.structureId, data.structure_id));

      const updated = await findRow(sql`${salaryStructures.structureId} = ${data.structure_id}`);
      return { success: true, structure: updated };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  delete: async (id) => {
    try {
      const existing = await findRow(sql`${salaryStructures.structureId} = ${id}`);
      if (!existing) return { success: false, error: 'Salary Structure not found' };

      await db
        .update(salaryStructures)
        .set({ isActive: 0 })
        .where(eq(salaryStructures.structureId, id));
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },
};
