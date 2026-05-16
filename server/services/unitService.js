const db = require("../db/index");

const seedDefaultUnits = (company_id) => {
  const defaults = [
    { name: "Numbers", symbol: "Nos", unit_type: "Simple", decimal_places: 0 },
    { name: "Kilograms", symbol: "Kg", unit_type: "Simple", decimal_places: 3 },
    { name: "Grams", symbol: "g", unit_type: "Simple", decimal_places: 3 },
    { name: "Litres", symbol: "Ltr", unit_type: "Simple", decimal_places: 3 },
    { name: "Metres", symbol: "Mtr", unit_type: "Simple", decimal_places: 3 },
    { name: "Pieces", symbol: "Pcs", unit_type: "Simple", decimal_places: 0 },
    { name: "Box", symbol: "Box", unit_type: "Simple", decimal_places: 0 },
  ];

  const stmt = db.execute(`
    INSERT INTO units (company_id, name, symbol, formal_name, decimal_places, unit_quantity_code, unit_type, is_simple, is_active, is_predefined)
    VALUES (@company_id, @name, @symbol, @formal_name, @decimal_places, @unit_quantity_code, @unit_type, @is_simple, @is_active, @is_predefined)
  `);

  defaults.forEach((u) => {
    stmt.run({
      company_id: company_id,
      name: u.name,
      symbol: u.symbol,
      formal_name: u.name,
      decimal_places: u.decimal_places,
      unit_quantity_code: null,
      unit_type: u.unit_type,
      is_simple: 1,
      is_active: 1,
      is_predefined: 1,
    });
  });
};

module.exports = {
  seedDefaultUnits,

  create: async (data) => {
    try {
      const exists = db
        .execute(
          `
        SELECT * FROM units WHERE company_id = ? AND LOWER(symbol) = LOWER(?) AND is_active = 1
      `,
        )
        .get(data.company_id, data.symbol);
      if (exists) return { success: false, error: "Unit already exists" };

      const result = db
        .execute(
          `
        INSERT INTO units (company_id, name, symbol, formal_name, decimal_places, unit_quantity_code, unit_type, is_simple, is_active, is_predefined)
        VALUES (@company_id, @name, @symbol, @formal_name, @decimal_places, @unit_quantity_code, @unit_type, @is_simple, @is_active, @is_predefined)
      `,
        )
        .run({
          company_id: data.company_id,
          name: data.name,
          symbol: data.symbol,
          formal_name: data.formal_name || data.name,
          decimal_places: data.decimal_places || 0,
          unit_quantity_code: data.unit_quantity_code || null,
          unit_type: data.unit_type || "Simple",
          is_simple: data.unit_type === "Simple" ? 1 : 0,
          is_active: 1,
          is_predefined: 0,
        });

      const unit = db
        .execute(`SELECT * FROM units WHERE unit_id = ?`)
        .get(result.lastInsertRowid);
      return { success: true, unit };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  getAll: async (company_id) => {
    try {
      const units = db
        .execute(
          `
        SELECT * FROM units WHERE company_id = ? AND is_active = 1
      `,
        )
        .all(company_id);
      return { success: true, units };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  getById: async (id) => {
    try {
      const unit = db.execute(`SELECT * FROM units WHERE unit_id = ?`).get(id);
      if (!unit) return { success: false, error: "Unit not found" };
      return { success: true, unit };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  update: async (data) => {
    try {
      const unit = db
        .execute(`SELECT * FROM units WHERE unit_id = ?`)
        .get(data.unit_id);
      if (!unit) return { success: false, error: "Unit not found" };
      if (unit.is_predefined)
        return { success: false, error: "Cannot edit predefined units" };

      db.execute(
        `
        UPDATE units SET
          name = @name, symbol = @symbol, formal_name = @formal_name,
          decimal_places = @decimal_places, unit_quantity_code = @unit_quantity_code,
          unit_type = @unit_type, is_simple = @is_simple,
          updated_at = datetime('now')
        WHERE unit_id = @unit_id
      `,
      ).run({
        unit_id: data.unit_id,
        name: data.name ?? unit.name,
        symbol: data.symbol ?? unit.symbol,
        formal_name: data.formal_name ?? unit.formal_name,
        decimal_places: data.decimal_places ?? unit.decimal_places,
        unit_quantity_code: data.unit_quantity_code ?? unit.unit_quantity_code,
        unit_type: data.unit_type ?? unit.unit_type,
        is_simple: data.unit_type === "Simple" ? 1 : 0,
      });

      const updated = db
        .execute(`SELECT * FROM units WHERE unit_id = ?`)
        .get(data.unit_id);
      return { success: true, unit: updated };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  delete: async (id) => {
    try {
      const unit = db.execute(`SELECT * FROM units WHERE unit_id = ?`).get(id);
      if (!unit) return { success: false, error: "Unit not found" };
      if (unit.is_predefined)
        return { success: false, error: "Cannot delete predefined units" };

      db.execute(`UPDATE units SET is_active = 0 WHERE unit_id = ?`).run(id);
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },
};
