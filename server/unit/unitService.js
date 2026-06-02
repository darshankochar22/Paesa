const { db } = require("../db/index");

const seedDefaultUnits = async (company_id) => {
  const defaults = [
    { name: "Numbers", symbol: "Nos", unit_type: "Simple", decimal_places: 0 },
    { name: "Kilograms", symbol: "Kg", unit_type: "Simple", decimal_places: 3 },
    { name: "Grams", symbol: "g", unit_type: "Simple", decimal_places: 3 },
    { name: "Litres", symbol: "Ltr", unit_type: "Simple", decimal_places: 3 },
    { name: "Metres", symbol: "Mtr", unit_type: "Simple", decimal_places: 3 },
    { name: "Pieces", symbol: "Pcs", unit_type: "Simple", decimal_places: 0 },
    { name: "Box", symbol: "Box", unit_type: "Simple", decimal_places: 0 },
  ];

  for (const u of defaults) {
    await db.execute({
      sql: `INSERT INTO units (company_id, name, symbol, formal_name, decimal_places, unit_quantity_code, unit_type, is_simple, is_active, is_predefined)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [company_id, u.name, u.symbol, u.name, u.decimal_places, null, u.unit_type, 1, 1, 1],
    });
  }
};

module.exports = {
  seedDefaultUnits,

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
        const firstUnit = await db.execute({
          sql: `SELECT * FROM units WHERE unit_id = ? AND company_id = ? AND is_active = 1`,
          args: [data.first_unit_id, data.company_id],
        });
        if (firstUnit.rows.length === 0) return { success: false, error: "First unit not found." };
        if (firstUnit.rows[0].unit_type === "Compound") return { success: false, error: "First unit is already a compound unit." };

        // Verify second unit exists and is simple
        const secondUnit = await db.execute({
          sql: `SELECT * FROM units WHERE unit_id = ? AND company_id = ? AND is_active = 1`,
          args: [data.second_unit_id, data.company_id],
        });
        if (secondUnit.rows.length === 0) return { success: false, error: "Second unit not found." };
        if (secondUnit.rows[0].unit_type === "Compound") return { success: false, error: "Second unit cannot be a compound unit." };

        // Update first unit to become compound
        await db.execute({
          sql: `UPDATE units SET unit_type = ?, is_simple = ?, first_unit_id = ?, second_unit_id = ?, conversion_factor = ?, updated_at = datetime('now') WHERE unit_id = ?`,
          args: ["Compound", 0, data.first_unit_id, data.second_unit_id, Number(data.conversion_factor), data.first_unit_id],
        });

        const updated = await db.execute({
          sql: `SELECT * FROM units WHERE unit_id = ?`,
          args: [data.first_unit_id],
        });
        return { success: true, unit: updated.rows[0] };
      }

      // Simple unit creation
      const exists = await db.execute({
        sql: `SELECT * FROM units WHERE company_id = ? AND LOWER(symbol) = LOWER(?) AND is_active = 1`,
        args: [data.company_id, data.symbol],
      });
      if (exists.rows.length > 0) return { success: false, error: "Unit already exists" };

      const result = await db.execute({
        sql: `INSERT INTO units (company_id, name, symbol, formal_name, decimal_places, unit_quantity_code, unit_type, is_simple, is_active, is_predefined)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          data.company_id, data.name, data.symbol,
          data.formal_name || data.name,
          data.decimal_places || 0,
          data.unit_quantity_code || null,
          data.unit_type || "Simple",
          data.unit_type === "Simple" ? 1 : 0,
          1, 0,
        ],
      });

      const unit = await db.execute({
        sql: `SELECT * FROM units WHERE unit_id = ? ORDER BY name ASC`,
        args: [Number(result.lastInsertRowid)],
      });
      return { success: true, unit: unit.rows[0] };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  getAll: async (company_id) => {
    try {
      const result = await db.execute({
        sql: `
          SELECT u.*,
            f.symbol as first_unit_symbol, f.formal_name as first_unit_formal_name,
            s.symbol as second_unit_symbol, s.formal_name as second_unit_formal_name
          FROM units u
          LEFT JOIN units f ON u.first_unit_id = f.unit_id
          LEFT JOIN units s ON u.second_unit_id = s.unit_id
          WHERE u.company_id = ? AND u.is_active = 1
        `,
        args: [company_id],
      });
      return { success: true, units: result.rows };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  getSimpleUnits: async (company_id) => {
    try {
      const result = await db.execute({
        sql: `SELECT * FROM units WHERE company_id = ? AND is_active = 1 AND unit_type = 'Simple' ORDER BY symbol ASC`,
        args: [company_id],
      });
      return { success: true, units: result.rows };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  getById: async (id) => {
    try {
      const result = await db.execute({
        sql: `
          SELECT u.*,
            f.symbol as first_unit_symbol, f.formal_name as first_unit_formal_name,
            s.symbol as second_unit_symbol, s.formal_name as second_unit_formal_name
          FROM units u
          LEFT JOIN units f ON u.first_unit_id = f.unit_id
          LEFT JOIN units s ON u.second_unit_id = s.unit_id
          WHERE u.unit_id = ?
        `,
        args: [id],
      });
      if (result.rows.length === 0) return { success: false, error: "Unit not found" };
      return { success: true, unit: result.rows[0] };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  update: async (data) => {
    try {
      const existing = await db.execute({
        sql: `SELECT * FROM units WHERE unit_id = ?`,
        args: [data.unit_id],
      });
      if (existing.rows.length === 0) return { success: false, error: "Unit not found" };
      const unit = existing.rows[0];
      if (unit.is_predefined) return { success: false, error: "Cannot edit predefined units" };

      const isCompound = data.unit_type === "Compound";

      // Validate compound fields if switching to compound
      if (isCompound) {
        if (!data.first_unit_id) return { success: false, error: "First unit is required." };
        if (!data.second_unit_id) return { success: false, error: "Second unit is required." };
        if (Number(data.first_unit_id) === Number(data.second_unit_id)) return { success: false, error: "First and second unit cannot be the same." };
        if (!data.conversion_factor || Number(data.conversion_factor) <= 0) return { success: false, error: "Conversion factor must be greater than 0." };
      }

      await db.execute({
        sql: `UPDATE units SET name = ?, symbol = ?, formal_name = ?, decimal_places = ?,
              unit_quantity_code = ?, unit_type = ?, is_simple = ?, first_unit_id = ?, second_unit_id = ?, conversion_factor = ?, updated_at = datetime('now')
              WHERE unit_id = ?`,
        args: [
          data.name ?? unit.name,
          data.symbol ?? unit.symbol,
          data.formal_name ?? unit.formal_name,
          data.decimal_places ?? unit.decimal_places,
          data.unit_quantity_code ?? unit.unit_quantity_code,
          data.unit_type ?? unit.unit_type,
          (data.unit_type ?? unit.unit_type) === "Simple" ? 1 : 0,
          isCompound ? data.first_unit_id : null,
          isCompound ? data.second_unit_id : null,
          isCompound ? Number(data.conversion_factor) : null,
          data.unit_id,
        ],
      });

      const updated = await db.execute({
        sql: `
          SELECT u.*,
            f.symbol as first_unit_symbol, f.formal_name as first_unit_formal_name,
            s.symbol as second_unit_symbol, s.formal_name as second_unit_formal_name
          FROM units u
          LEFT JOIN units f ON u.first_unit_id = f.unit_id
          LEFT JOIN units s ON u.second_unit_id = s.unit_id
          WHERE u.unit_id = ?
        `,
        args: [data.unit_id],
      });
      return { success: true, unit: updated.rows[0] };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  delete: async (id) => {
    try {
      const existing = await db.execute({
        sql: `SELECT * FROM units WHERE unit_id = ?`,
        args: [id],
      });
      if (existing.rows.length === 0) return { success: false, error: "Unit not found" };
      if (existing.rows[0].is_predefined) return { success: false, error: "Cannot delete predefined units" };

      await db.execute({
        sql: `UPDATE units SET is_active = 0 WHERE unit_id = ?`,
        args: [id],
      });
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },
};
