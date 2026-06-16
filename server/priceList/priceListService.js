const { db } = require('../db/index');
const { sql, eq, and } = require('drizzle-orm');
const { priceLists, priceListLines } = require('../db/schema');

// Fetch a single price_lists row in the legacy snake_case shape (or undefined).
const findHeader = async (whereSql) => {
  const rows = await db.all(sql`SELECT * FROM ${priceLists} WHERE ${whereSql}`);
  return rows[0];
};

// Fetch all line rows for a price list in the legacy snake_case shape, ordered.
const findLines = async (price_list_id) => {
  return db.all(
    sql`SELECT * FROM ${priceListLines}
        WHERE ${priceListLines.priceListId} = ${price_list_id}
        ORDER BY ${priceListLines.sortOrder} ASC`
  );
};

// Insert the lines for a price list (shared by create + update).
const insertLines = async (price_list_id, lines) => {
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];
    await db.insert(priceListLines).values({
      priceListId: price_list_id,
      itemId: l.item_id ?? null,
      particulars: l.particulars,
      qtyFrom: l.qty_from ?? 0,
      qtyLessThan: l.qty_less_than ?? 0,
      rate: l.rate ?? 0,
      discPercent: l.disc_percent ?? 0,
      sortOrder: i,
    });
  }
};

module.exports = {

  create: async (data) => {
    try {
      const { company_id, stock_group, price_level, applicable_from, lines } = data;

      if (!company_id)      return { success: false, error: 'company_id is required.' };
      if (!price_level)     return { success: false, error: 'price_level is required.' };
      if (!applicable_from) return { success: false, error: 'applicable_from is required.' };
      if (!Array.isArray(lines) || lines.length === 0)
                            return { success: false, error: 'At least one line is required.' };

      // Insert header
      const inserted = await db
        .insert(priceLists)
        .values({
          companyId: company_id,
          stockGroup: stock_group || 'All Items',
          priceLevel: price_level,
          applicableFrom: applicable_from,
          isActive: 1,
        })
        .returning({ id: priceLists.priceListId });

      const price_list_id = Number(inserted[0].id);

      // Insert lines
      await insertLines(price_list_id, lines);

      // Fetch full record to return
      const header = await findHeader(sql`${priceLists.priceListId} = ${price_list_id}`);
      const fetchLines = await findLines(price_list_id);

      return {
        success: true,
        data: { ...header, lines: fetchLines },
      };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  getAll: async (company_id) => {
    try {
      const rows = await db.all(
        sql`SELECT * FROM ${priceLists}
            WHERE ${priceLists.companyId} = ${company_id}
              AND ${priceLists.isActive} = 1
            ORDER BY ${priceLists.applicableFrom} DESC, ${priceLists.priceListId} DESC`
      );

      // Attach lines to each record
      const records = [];
      for (const row of rows) {
        const lines = await findLines(row.price_list_id);
        records.push({ ...row, lines });
      }

      return { success: true, data: records };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  getById: async (id) => {
    try {
      const header = await findHeader(
        sql`${priceLists.priceListId} = ${id} AND ${priceLists.isActive} = 1`
      );

      if (!header)
        return { success: false, error: 'Price list not found.' };

      const lines = await findLines(id);

      return {
        success: true,
        data: { ...header, lines },
      };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  update: async (data) => {
    try {
      const { id, company_id, stock_group, price_level, applicable_from, lines } = data;

      if (!id)              return { success: false, error: 'id is required.' };
      if (!price_level)     return { success: false, error: 'price_level is required.' };
      if (!applicable_from) return { success: false, error: 'applicable_from is required.' };
      if (!Array.isArray(lines) || lines.length === 0)
                            return { success: false, error: 'At least one line is required.' };

      // Check exists
      const existing = await findHeader(
        sql`${priceLists.priceListId} = ${id} AND ${priceLists.isActive} = 1`
      );
      if (!existing)
        return { success: false, error: 'Price list not found.' };

      // Update header
      await db
        .update(priceLists)
        .set({
          stockGroup: stock_group || 'All Items',
          priceLevel: price_level,
          applicableFrom: applicable_from,
          updatedAt: sql`datetime('now')`,
        })
        .where(eq(priceLists.priceListId, id));

      // Delete old lines and re-insert (clean replace)
      await db
        .delete(priceListLines)
        .where(eq(priceListLines.priceListId, id));

      await insertLines(id, lines);

      // Fetch updated record
      const updatedHeader = await findHeader(sql`${priceLists.priceListId} = ${id}`);
      const updatedLines = await findLines(id);

      return {
        success: true,
        data: { ...updatedHeader, lines: updatedLines },
      };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  delete: async (id) => {
    try {
      const existing = await findHeader(
        sql`${priceLists.priceListId} = ${id} AND ${priceLists.isActive} = 1`
      );
      if (!existing)
        return { success: false, error: 'Price list not found.' };

      // Soft delete header (lines kept for audit; cascade handles hard delete)
      await db
        .update(priceLists)
        .set({ isActive: 0, updatedAt: sql`datetime('now')` })
        .where(eq(priceLists.priceListId, id));

      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

};
