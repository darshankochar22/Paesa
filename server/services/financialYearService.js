const db = require("../db/index");

module.exports = {
  create: async (data) => {
    try {
      const existing = db
        .execute(
          `
        SELECT * FROM financial_years WHERE company_id = ? AND start_date = ?
      `,
        )
        .get(data.company_id, data.start_date);
      if (existing)
        return { success: false, error: "Financial year already exists" };

      const start = new Date(data.start_date);
      const end = new Date(start);
      end.setFullYear(end.getFullYear() + 1);
      end.setDate(end.getDate() - 1);

      const result = db
        .execute(
          `
        INSERT INTO financial_years (company_id, start_date, end_date, is_active, is_closed, closing_date)
        VALUES (@company_id, @start_date, @end_date, @is_active, @is_closed, @closing_date)
      `,
        )
        .run({
          company_id: data.company_id,
          start_date: data.start_date,
          end_date: data.end_date || end.toISOString().split("T")[0],
          is_active: 0,
          is_closed: 0,
          closing_date: null,
        });

      const fy = db
        .execute(`SELECT * FROM financial_years WHERE fy_id = ?`)
        .get(result.lastInsertRowid);
      return { success: true, fy };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  getAll: async (company_id) => {
    try {
      const financialYears = db
        .execute(
          `
        SELECT * FROM financial_years WHERE company_id = ?
      `,
        )
        .all(company_id);
      return { success: true, financialYears };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  getById: async (id) => {
    try {
      const fy = db
        .execute(`SELECT * FROM financial_years WHERE fy_id = ?`)
        .get(id);
      if (!fy) return { success: false, error: "Financial year not found" };
      return { success: true, fy };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  setActive: async (fy_id, company_id) => {
    try {
      const fy = db
        .execute(`SELECT * FROM financial_years WHERE fy_id = ?`)
        .get(fy_id);
      if (!fy) return { success: false, error: "Financial year not found" };
      if (fy.is_closed)
        return {
          success: false,
          error: "Cannot activate a closed financial year",
        };

      db.execute(
        `
        UPDATE financial_years SET is_active = 0 WHERE company_id = ?
      `,
      ).run(company_id);

      db.execute(
        `
        UPDATE financial_years SET is_active = 1 WHERE fy_id = ?
      `,
      ).run(fy_id);

      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  delete: async (id) => {
    try {
      const fy = db
        .execute(`SELECT * FROM financial_years WHERE fy_id = ?`)
        .get(id);
      if (!fy) return { success: false, error: "Financial year not found" };
      if (fy.is_active)
        return { success: false, error: "Cannot delete active financial year" };
      if (fy.is_closed)
        return { success: false, error: "Cannot delete closed financial year" };

      db.execute(`DELETE FROM financial_years WHERE fy_id = ?`).run(id);
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },
};
