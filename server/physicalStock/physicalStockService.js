const { db } = require('../db/index');

const generateVoucherNumber = async (company_id) => {
  const prefix = 'PST-';
  const result = await db.execute({
    sql: `SELECT COALESCE(MAX(CAST(REPLACE(voucher_no, ?, '') AS INTEGER)), 0) + 1 as next_num
          FROM physical_stock_entries WHERE company_id = ?`,
    args: [prefix, company_id],
  });
  const next = Number(result.rows[0].next_num);
  return `${prefix}${String(next).padStart(5, '0')}`;
};

const getNextVoucherNumber = async (company_id) => {
  try {
    const nextVal = await generateVoucherNumber(company_id);
    return { success: true, nextNumber: nextVal, voucher_number: nextVal };
  } catch (err) {
    return { success: false, error: err.message };
  }
};

const create = async (data) => {
  try {
    const voucher_no = data.voucher_no || await generateVoucherNumber(data.company_id);
    await db.execute({ sql: 'BEGIN TRANSACTION', args: [] });
    try {
      const result = await db.execute({
        sql: `INSERT INTO physical_stock_entries (
                company_id, voucher_no, voucher_date, reference_no, narration, is_optional, is_post_dated
              ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        args: [
          data.company_id,
          voucher_no,
          data.voucher_date,
          data.reference_no || null,
          data.narration || null,
          data.is_optional ? 1 : 0,
          data.is_post_dated ? 1 : 0,
        ],
      });
      const physical_stock_entry_id = Number(result.lastInsertRowid);

      if (data.lines && data.lines.length > 0) {
        for (let i = 0; i < data.lines.length; i++) {
          const line = data.lines[i];
          await db.execute({
            sql: `INSERT INTO physical_stock_entry_lines (
                    physical_stock_entry_id, stock_item_id, godown_id, batch_no, lot_no,
                    manufacturing_date, expiry_date, quantity, rate, amount, line_order
                  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            args: [
              physical_stock_entry_id,
              line.stock_item_id || null,
              line.godown_id || null,
              line.batch_no || null,
              line.lot_no || null,
              line.manufacturing_date || null,
              line.expiry_date || null,
              Number(line.quantity) || 0,
              Number(line.rate) || 0,
              (Number(line.quantity) || 0) * (Number(line.rate) || 0),
              i,
            ],
          });
        }
      }

      await db.execute({ sql: 'COMMIT', args: [] });
      return { success: true, physical_stock_entry_id, voucher_no };
    } catch (err) {
      await db.execute({ sql: 'ROLLBACK', args: [] });
      throw err;
    }
  } catch (err) {
    return { success: false, error: err.message };
  }
};

const getAll = async (company_id) => {
  try {
    const result = await db.execute({
      sql: `SELECT * FROM physical_stock_entries WHERE company_id = ? ORDER BY voucher_date DESC, physical_stock_entry_id DESC`,
      args: [company_id],
    });
    return { success: true, entries: result.rows };
  } catch (err) {
    return { success: false, error: err.message };
  }
};

const getById = async (id) => {
  try {
    const entryResult = await db.execute({
      sql: `SELECT * FROM physical_stock_entries WHERE physical_stock_entry_id = ?`,
      args: [id],
    });
    if (entryResult.rows.length === 0) return { success: false, error: 'Entry not found' };
    const entry = entryResult.rows[0];

    const linesResult = await db.execute({
      sql: `SELECT l.*, i.name as item_name, g.name as godown_name FROM physical_stock_entry_lines l
            LEFT JOIN stock_items i ON i.stock_item_id = l.stock_item_id
            LEFT JOIN godowns g ON g.godown_id = l.godown_id
            WHERE l.physical_stock_entry_id = ? ORDER BY l.line_order ASC`,
      args: [id],
    });

    return {
      success: true,
      entry: {
        ...entry,
        lines: linesResult.rows,
      },
    };
  } catch (err) {
    return { success: false, error: err.message };
  }
};

const deleteEntry = async (id) => {
  try {
    await db.execute({
      sql: `DELETE FROM physical_stock_entries WHERE physical_stock_entry_id = ?`,
      args: [id],
    });
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
};

module.exports = {
  create,
  getAll,
  getById,
  delete: deleteEntry,
  getNextVoucherNumber,
};
