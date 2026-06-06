const { db } = require('../db/index');

const generateVoucherNumber = async (company_id) => {
  const prefix = 'ATT-';
  const result = await db.execute({
    sql: `SELECT COALESCE(MAX(CAST(REPLACE(voucher_number, ?, '') AS INTEGER)), 0) + 1 as next_num
          FROM attendance_vouchers WHERE company_id = ?`,
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
    const voucher_number = data.voucher_number || await generateVoucherNumber(data.company_id);
    await db.execute({ sql: 'BEGIN TRANSACTION', args: [] });
    try {
      const result = await db.execute({
        sql: `INSERT INTO attendance_vouchers (
                company_id, voucher_number, date, narration
              ) VALUES (?, ?, ?, ?)`,
        args: [
          data.company_id,
          voucher_number,
          data.date,
          data.narration || null,
        ],
      });
      const attendance_voucher_id = Number(result.lastInsertRowid);

      if (data.entries && data.entries.length > 0) {
        for (const entry of data.entries) {
          await db.execute({
            sql: `INSERT INTO attendance_voucher_entries (
                    attendance_voucher_id, employee_id, attendance_type_id, value
                  ) VALUES (?, ?, ?, ?)`,
            args: [
              attendance_voucher_id,
              entry.employee_id || null,
              entry.attendance_type_id || null,
              Number(entry.value) || 0,
            ],
          });
        }
      }

      await db.execute({ sql: 'COMMIT', args: [] });
      return { success: true, attendance_voucher_id, voucher_number };
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
      sql: `SELECT * FROM attendance_vouchers WHERE company_id = ? ORDER BY date DESC, attendance_voucher_id DESC`,
      args: [company_id],
    });
    return { success: true, vouchers: result.rows };
  } catch (err) {
    return { success: false, error: err.message };
  }
};

const getById = async (id) => {
  try {
    const entryResult = await db.execute({
      sql: `SELECT * FROM attendance_vouchers WHERE attendance_voucher_id = ?`,
      args: [id],
    });
    if (entryResult.rows.length === 0) return { success: false, error: 'Voucher not found' };
    const voucher = entryResult.rows[0];

    const entriesResult = await db.execute({
      sql: `SELECT e.*, emp.name as employee_name, emp.employee_number, t.name as attendance_type_name
            FROM attendance_voucher_entries e
            LEFT JOIN employees emp ON emp.employee_id = e.employee_id
            LEFT JOIN attendance_types t ON t.attendance_type_id = e.attendance_type_id
            WHERE e.attendance_voucher_id = ?`,
      args: [id],
    });

    return {
      success: true,
      voucher: {
        ...voucher,
        entries: entriesResult.rows,
      },
    };
  } catch (err) {
    return { success: false, error: err.message };
  }
};

const deleteVoucher = async (id) => {
  try {
    await db.execute({
      sql: `DELETE FROM attendance_vouchers WHERE attendance_voucher_id = ?`,
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
  delete: deleteVoucher,
  getNextVoucherNumber,
};
