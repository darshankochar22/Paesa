const { db } = require("../db/index");
const { sql, eq } = require("drizzle-orm");
const { units } = require("../db/schema");

// Fetch a single units row (legacy snake_case shape) or undefined.
const findRow = async (whereSql) => {
  const rows = await db.all(sql`SELECT * FROM ${units} WHERE ${whereSql}`);
  return rows[0];
};

// Fetch a units row joined with its first/second sub-unit symbols + formal names.
// This self-join (units aliased f/s) does not map cleanly to the query builder,
// so it uses Drizzle's typed `sql` operator. Returned keys stay snake_case
// (u.*, first_unit_symbol, ...) to preserve the exact legacy public shape.
const findJoinedRow = async (unitId) => {
  const rows = await db.all(
    sql`
      SELECT u.*,
        f.symbol AS first_unit_symbol, f.formal_name AS first_unit_formal_name,
        s.symbol AS second_unit_symbol, s.formal_name AS second_unit_formal_name
      FROM ${units} u
      LEFT JOIN ${units} f ON u.first_unit_id = f.unit_id
      LEFT JOIN ${units} s ON u.second_unit_id = s.unit_id
      WHERE u.unit_id = ${unitId}
    `
  );
  return rows;
};

module.exports = {
  create: async (data) => {
    try {
      if (!data.company_id) return { success: false, error: "Company ID is required." };

      // Compound unit creation: update an existing simple unit to become compound
      if (data.unit_type === "Compound") {
        if (!data.first_unit_id) return { success: false, error: "First unit is required." };
        if (!data.second_unit_id) return { success: false, error: "Second unit is required." };
        if (Number(data.first_unit_id) === Number(data.second_unit_id)) return { success: false, error: "First and second unit cannot be the same." };
        if (!data.conversion_factor || Number(data.conversion_factor) <= 0) return { success: false, error: "Conversion factor must be greater than 0." };

        // Verify first unit exists and is simple
        const firstUnit = await findRow(
          sql`${units.unitId} = ${data.first_unit_id} AND ${units.companyId} = ${data.company_id} AND ${units.isActive} = 1`
        );
        if (!firstUnit) return { success: false, error: "First unit not found." };
        if (firstUnit.unit_type === "Compound") return { success: false, error: "First unit is already a compound unit." };

        // Verify second unit exists and is simple
        const secondUnit = await findRow(
          sql`${units.unitId} = ${data.second_unit_id} AND ${units.companyId} = ${data.company_id} AND ${units.isActive} = 1`
        );
        if (!secondUnit) return { success: false, error: "Second unit not found." };
        if (secondUnit.unit_type === "Compound") return { success: false, error: "Second unit cannot be a compound unit." };

        // Update first unit to become compound
        await db
          .update(units)
          .set({
            unitType: "Compound",
            isSimple: 0,
            firstUnitId: data.first_unit_id,
            secondUnitId: data.second_unit_id,
            conversionFactor: Number(data.conversion_factor),
            updatedAt: sql`datetime('now')`,
          })
          .where(eq(units.unitId, data.first_unit_id));

        const updated = await findRow(sql`${units.unitId} = ${data.first_unit_id}`);
        return { success: true, unit: updated };
      }

      // Simple unit creation
      const exists = await db.all(
        sql`SELECT * FROM ${units}
            WHERE ${units.companyId} = ${data.company_id}
              AND LOWER(${units.symbol}) = LOWER(${data.symbol})
              AND ${units.isActive} = 1`
      );
      if (exists.length > 0) return { success: false, error: "Unit already exists" };

      const inserted = await db
        .insert(units)
        .values({
          companyId: data.company_id,
          name: data.name,
          symbol: data.symbol,
          formalName: data.formal_name || data.name,
          decimalPlaces: data.decimal_places || 0,
          unitQuantityCode: data.unit_quantity_code || null,
          uqcEffectiveDate: data.uqc_effective_date || null,
          unitType: data.unit_type || "Simple",
          isSimple: data.unit_type === "Simple" ? 1 : 0,
          isActive: 1,
          isPredefined: 0,
        })
        .returning({ id: units.unitId });

      const unit = await findRow(sql`${units.unitId} = ${inserted[0].id}`);
      return { success: true, unit };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  getAll: async (company_id) => {
    try {
      const rows = await db.all(
        sql`
          SELECT u.*,
            f.symbol AS first_unit_symbol, f.formal_name AS first_unit_formal_name,
            s.symbol AS second_unit_symbol, s.formal_name AS second_unit_formal_name
          FROM ${units} u
          LEFT JOIN ${units} f ON u.first_unit_id = f.unit_id
          LEFT JOIN ${units} s ON u.second_unit_id = s.unit_id
          WHERE u.company_id = ${company_id} AND u.is_active = 1
        `
      );
      return { success: true, units: rows };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  getSimpleUnits: async (company_id) => {
    try {
      const rows = await db.all(
        sql`SELECT * FROM ${units}
            WHERE ${units.companyId} = ${company_id}
              AND ${units.isActive} = 1
              AND ${units.unitType} = 'Simple'
            ORDER BY ${units.symbol} ASC`
      );
      return { success: true, units: rows };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  getById: async (id) => {
    try {
      const rows = await findJoinedRow(id);
      if (rows.length === 0) return { success: false, error: "Unit not found" };
      return { success: true, unit: rows[0] };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  update: async (data) => {
    try {
      const unit = await findRow(sql`${units.unitId} = ${data.unit_id}`);
      if (!unit) return { success: false, error: "Unit not found" };
      if (unit.is_predefined) return { success: false, error: "Cannot edit predefined units" };

      const isCompound = data.unit_type === "Compound";

      // Validate compound fields if switching to compound
      if (isCompound) {
        if (!data.first_unit_id) return { success: false, error: "First unit is required." };
        if (!data.second_unit_id) return { success: false, error: "Second unit is required." };
        if (Number(data.first_unit_id) === Number(data.second_unit_id)) return { success: false, error: "First and second unit cannot be the same." };
        if (!data.conversion_factor || Number(data.conversion_factor) <= 0) return { success: false, error: "Conversion factor must be greater than 0." };
      }

      const nextUnitType = data.unit_type ?? unit.unit_type;

      await db
        .update(units)
        .set({
          name: data.name ?? unit.name,
          symbol: data.symbol ?? unit.symbol,
          formalName: data.formal_name ?? unit.formal_name,
          decimalPlaces: data.decimal_places ?? unit.decimal_places,
          unitQuantityCode: data.unit_quantity_code ?? unit.unit_quantity_code,
          uqcEffectiveDate: data.uqc_effective_date ?? unit.uqc_effective_date,
          unitType: nextUnitType,
          isSimple: nextUnitType === "Simple" ? 1 : 0,
          firstUnitId: isCompound ? data.first_unit_id : null,
          secondUnitId: isCompound ? data.second_unit_id : null,
          conversionFactor: isCompound ? Number(data.conversion_factor) : null,
          updatedAt: sql`datetime('now')`,
        })
        .where(eq(units.unitId, data.unit_id));

      const updated = await findJoinedRow(data.unit_id);
      return { success: true, unit: updated[0] };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  delete: async (id) => {
    try {
      const existing = await findRow(sql`${units.unitId} = ${id}`);
      if (!existing) return { success: false, error: "Unit not found" };
      if (existing.is_predefined) return { success: false, error: "Cannot delete predefined units" };

      await db
        .update(units)
        .set({ isActive: 0 })
        .where(eq(units.unitId, id));
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },
};
