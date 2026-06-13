const { db } = require('../db/index');

const INSERT_PRICE_LIST_SQL = `
  INSERT INTO price_lists (
    company_id, stock_group, price_level, applicable_from, is_active
  ) VALUES (
    :company_id, :stock_group, :price_level, :applicable_from, 1
  )
`;

const INSERT_LINE_SQL = `
  INSERT INTO price_list_lines (
    price_list_id, item_id, particulars,
    qty_from, qty_less_than, rate, disc_percent, sort_order
  ) VALUES (
    :price_list_id, :item_id, :particulars,
    :qty_from, :qty_less_than, :rate, :disc_percent, :sort_order
  )
`;

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
      const headerResult = await db.execute({
        sql: INSERT_PRICE_LIST_SQL,
        args: {
          company_id,
          stock_group:     stock_group || 'All Items',
          price_level,
          applicable_from,
        },
      });

      const price_list_id = Number(headerResult.lastInsertRowid);

      // Insert lines
      for (let i = 0; i < lines.length; i++) {
        const l = lines[i];
        await db.execute({
          sql: INSERT_LINE_SQL,
          args: {
            price_list_id,
            item_id:       l.item_id       ?? null,
            particulars:   l.particulars,
            qty_from:      l.qty_from       ?? 0,
            qty_less_than: l.qty_less_than  ?? 0,
            rate:          l.rate           ?? 0,
            disc_percent:  l.disc_percent   ?? 0,
            sort_order:    i,
          },
        });
      }

      // Fetch full record to return
      const fetchResult = await db.execute({
        sql: `SELECT * FROM price_lists WHERE price_list_id = ?`,
        args: [price_list_id],
      });
      const fetchLines = await db.execute({
        sql: `SELECT * FROM price_list_lines WHERE price_list_id = ? ORDER BY sort_order ASC`,
        args: [price_list_id],
      });

      return {
        success: true,
        data: { ...fetchResult.rows[0], lines: fetchLines.rows },
      };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  getAll: async (company_id) => {
    try {
      const result = await db.execute({
        sql: `
          SELECT * FROM price_lists
          WHERE company_id = ? AND is_active = 1
          ORDER BY applicable_from DESC, price_list_id DESC
        `,
        args: [company_id],
      });

      // Attach lines to each record
      const records = [];
      for (const row of result.rows) {
        const linesResult = await db.execute({
          sql: `SELECT * FROM price_list_lines WHERE price_list_id = ? ORDER BY sort_order ASC`,
          args: [row.price_list_id],
        });
        records.push({ ...row, lines: linesResult.rows });
      }

      return { success: true, data: records };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  getById: async (id) => {
    try {
      const result = await db.execute({
        sql: `SELECT * FROM price_lists WHERE price_list_id = ? AND is_active = 1`,
        args: [id],
      });

      if (result.rows.length === 0)
        return { success: false, error: 'Price list not found.' };

      const linesResult = await db.execute({
        sql: `SELECT * FROM price_list_lines WHERE price_list_id = ? ORDER BY sort_order ASC`,
        args: [id],
      });

      return {
        success: true,
        data: { ...result.rows[0], lines: linesResult.rows },
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
      const checkResult = await db.execute({
        sql: `SELECT * FROM price_lists WHERE price_list_id = ? AND is_active = 1`,
        args: [id],
      });
      if (checkResult.rows.length === 0)
        return { success: false, error: 'Price list not found.' };

      // Update header
      await db.execute({
        sql: `
          UPDATE price_lists SET
            stock_group     = ?,
            price_level     = ?,
            applicable_from = ?,
            updated_at      = datetime('now')
          WHERE price_list_id = ?
        `,
        args: [stock_group || 'All Items', price_level, applicable_from, id],
      });

      // Delete old lines and re-insert (clean replace)
      await db.execute({
        sql: `DELETE FROM price_list_lines WHERE price_list_id = ?`,
        args: [id],
      });

      for (let i = 0; i < lines.length; i++) {
        const l = lines[i];
        await db.execute({
          sql: INSERT_LINE_SQL,
          args: {
            price_list_id: id,
            item_id:       l.item_id       ?? null,
            particulars:   l.particulars,
            qty_from:      l.qty_from       ?? 0,
            qty_less_than: l.qty_less_than  ?? 0,
            rate:          l.rate           ?? 0,
            disc_percent:  l.disc_percent   ?? 0,
            sort_order:    i,
          },
        });
      }

      // Fetch updated record
      const updatedResult = await db.execute({
        sql: `SELECT * FROM price_lists WHERE price_list_id = ?`,
        args: [id],
      });
      const updatedLines = await db.execute({
        sql: `SELECT * FROM price_list_lines WHERE price_list_id = ? ORDER BY sort_order ASC`,
        args: [id],
      });

      return {
        success: true,
        data: { ...updatedResult.rows[0], lines: updatedLines.rows },
      };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  delete: async (id) => {
    try {
      const checkResult = await db.execute({
        sql: `SELECT * FROM price_lists WHERE price_list_id = ? AND is_active = 1`,
        args: [id],
      });
      if (checkResult.rows.length === 0)
        return { success: false, error: 'Price list not found.' };

      // Soft delete header (lines kept for audit; cascade handles hard delete)
      await db.execute({
        sql: `UPDATE price_lists SET is_active = 0, updated_at = datetime('now') WHERE price_list_id = ?`,
        args: [id],
      });

      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

};