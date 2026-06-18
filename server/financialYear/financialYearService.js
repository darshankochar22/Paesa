const { db } = require('../db/index');
const { sql, eq } = require('drizzle-orm');
const { financialYears } = require('../db/schema');

// Fetch a single financial_years row in the legacy snake_case shape (or undefined).
const findRow = async (whereSql) => {
  const rows = await db.all(sql`SELECT * FROM ${financialYears} WHERE ${whereSql}`);
  return rows[0];
};

module.exports = {
  seedDefaultFY: async (company_id, financial_year_beginning_from) => {
    try {
      if (!financial_year_beginning_from) return;

      const start = new Date(financial_year_beginning_from);
      const startDate = start.toISOString().split('T')[0];

      const end = new Date(start);
      end.setFullYear(end.getFullYear() + 1);
      end.setDate(end.getDate() - 1);
      const endDate = end.toISOString().split('T')[0];

      await db
        .insert(financialYears)
        .values({
          companyId: company_id,
          startDate,
          endDate,
          isActive: 1,
          isClosed: 0,
          closingDate: null,
        });
    } catch (err) {
      console.error('seedDefaultFY error:', err.message);
    }
  },

  create: async (data) => {
    try {
      const existing = await db.all(
        sql`SELECT * FROM ${financialYears}
            WHERE ${financialYears.companyId} = ${data.company_id}
              AND ${financialYears.startDate} = ${data.start_date}`
      );
      if (existing.length > 0) return { success: false, error: 'Financial year already exists' };

      const start = new Date(data.start_date);
      const end = new Date(start);
      end.setFullYear(end.getFullYear() + 1);
      end.setDate(end.getDate() - 1);

      const inserted = await db
        .insert(financialYears)
        .values({
          companyId: data.company_id,
          startDate: data.start_date,
          endDate: data.end_date || end.toISOString().split('T')[0],
          isActive: 0,
          isClosed: 0,
          closingDate: null,
        })
        .returning({ id: financialYears.fyId });

      const fy = await findRow(sql`${financialYears.fyId} = ${inserted[0].id}`);
      return { success: true, fy };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  getAll: async (company_id) => {
    try {
      const rows = await db.all(
        sql`SELECT * FROM ${financialYears} WHERE ${financialYears.companyId} = ${company_id}`
      );
      return { success: true, financialYears: rows };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  getById: async (id) => {
    try {
      const fy = await findRow(sql`${financialYears.fyId} = ${id}`);
      if (!fy) return { success: false, error: 'Financial year not found' };
      return { success: true, fy };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  setActive: async (fy_id, company_id) => {
    try {
      const fy = await findRow(sql`${financialYears.fyId} = ${fy_id}`);
      if (!fy) return { success: false, error: 'Financial year not found' };
      if (fy.is_closed) return { success: false, error: 'Cannot activate a closed financial year' };

      await db
        .update(financialYears)
        .set({ isActive: 0 })
        .where(eq(financialYears.companyId, company_id));
      await db
        .update(financialYears)
        .set({ isActive: 1 })
        .where(eq(financialYears.fyId, fy_id));
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  delete: async (id) => {
    try {
      const fy = await findRow(sql`${financialYears.fyId} = ${id}`);
      if (!fy) return { success: false, error: 'Financial year not found' };
      if (fy.is_active) return { success: false, error: 'Cannot delete active financial year' };
      if (fy.is_closed) return { success: false, error: 'Cannot delete closed financial year' };

      await db.delete(financialYears).where(eq(financialYears.fyId, id));
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },
};
