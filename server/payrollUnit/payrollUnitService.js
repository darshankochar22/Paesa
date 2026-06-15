const { db } = require('../db/index');
const { sql, eq } = require('drizzle-orm');
const { payrollUnits } = require('../db/schema');

// Fetch a single payroll unit row in the legacy snake_case shape (or undefined).
const findRow = async (whereSql) => {
  const rows = await db.all(sql`SELECT * FROM ${payrollUnits} WHERE ${whereSql}`);
  return rows[0];
};

const seedDefaultPayrollUnits = async (company_id) => {
  const defaults = [
    { name: 'Days',    symbol: 'Days', unit_type: 'Simple', decimal_places: 0 },
    { name: 'Hours',   symbol: 'Hrs',  unit_type: 'Simple', decimal_places: 2 },
    { name: 'Minutes', symbol: 'Min',  unit_type: 'Simple', decimal_places: 0 },
    { name: 'Months',  symbol: 'Mth',  unit_type: 'Simple', decimal_places: 0 },
    { name: 'Pieces',  symbol: 'Pcs',  unit_type: 'Simple', decimal_places: 0 },
  ];

  for (const u of defaults) {
    await db
      .insert(payrollUnits)
      .values({
        companyId: company_id,
        name: u.name,
        symbol: u.symbol,
        unitType: u.unit_type,
        decimalPlaces: u.decimal_places,
        isActive: 1,
        isPredefined: 1,
      });
  }
};

module.exports = {
  seedDefaultPayrollUnits,

  create: async (data) => {
    try {
      const exists = await db.all(
        sql`SELECT * FROM ${payrollUnits}
            WHERE ${payrollUnits.companyId} = ${data.company_id}
              AND LOWER(${payrollUnits.name}) = LOWER(${data.name})
              AND ${payrollUnits.isActive} = 1`
      );
      if (exists.length > 0) return { success: false, error: 'Payroll Unit already exists' };

      const inserted = await db
        .insert(payrollUnits)
        .values({
          companyId: data.company_id,
          name: data.name,
          symbol: data.symbol,
          formalName: data.formal_name || null,
          unitType: data.unit_type || 'Simple',
          decimalPlaces: data.decimal_places ?? 0,
          firstUnit: data.first_unit || null,
          conversion: data.conversion || null,
          secondUnit: data.second_unit || null,
          isActive: 1,
          isPredefined: 0,
        })
        .returning({ id: payrollUnits.payrollUnitId });

      const unit = await findRow(sql`${payrollUnits.payrollUnitId} = ${inserted[0].id}`);
      return { success: true, unit };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  getAll: async (company_id) => {
    try {
      const rows = await db.all(
        sql`SELECT * FROM ${payrollUnits}
            WHERE ${payrollUnits.companyId} = ${company_id}
              AND ${payrollUnits.isActive} = 1`
      );
      return { success: true, payrollUnits: rows };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  getById: async (id) => {
    try {
      const unit = await findRow(sql`${payrollUnits.payrollUnitId} = ${id}`);
      if (!unit) return { success: false, error: 'Payroll Unit not found' };
      return { success: true, unit };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  update: async (data) => {
    try {
      const current = await findRow(sql`${payrollUnits.payrollUnitId} = ${data.payroll_unit_id}`);
      if (!current) return { success: false, error: 'Payroll Unit not found' };
      if (current.is_predefined) return { success: false, error: 'Cannot edit predefined payroll units' };

      await db
        .update(payrollUnits)
        .set({
          name: data.name ?? current.name,
          symbol: data.symbol ?? current.symbol,
          formalName: data.formal_name ?? current.formal_name,
          unitType: data.unit_type ?? current.unit_type,
          decimalPlaces: data.decimal_places ?? current.decimal_places,
          firstUnit: data.first_unit ?? current.first_unit,
          conversion: data.conversion ?? current.conversion,
          secondUnit: data.second_unit ?? current.second_unit,
          updatedAt: sql`datetime('now')`,
        })
        .where(eq(payrollUnits.payrollUnitId, data.payroll_unit_id));

      const updated = await findRow(sql`${payrollUnits.payrollUnitId} = ${data.payroll_unit_id}`);
      return { success: true, unit: updated };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  delete: async (id) => {
    try {
      const existing = await findRow(sql`${payrollUnits.payrollUnitId} = ${id}`);
      if (!existing) return { success: false, error: 'Payroll Unit not found' };
      if (existing.is_predefined) return { success: false, error: 'Cannot delete predefined payroll units' };

      await db
        .update(payrollUnits)
        .set({ isActive: 0 })
        .where(eq(payrollUnits.payrollUnitId, id));
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },
};
