const { db } = require('../db/index');
const { sql, eq } = require('drizzle-orm');
const {
  attendanceVouchers,
  attendanceVoucherEntries,
  employees,
  attendanceTypes,
} = require('../db/schema');

const generateVoucherNumber = async (company_id) => {
  const prefix = 'ATT-';
  const rows = await db.all(
    sql`SELECT COALESCE(MAX(CAST(REPLACE(${attendanceVouchers.voucherNumber}, ${prefix}, '') AS INTEGER)), 0) + 1 as next_num
        FROM ${attendanceVouchers} WHERE ${attendanceVouchers.companyId} = ${company_id}`
  );
  const next = Number(rows[0].next_num);
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
    await db.run(sql`BEGIN TRANSACTION`);
    try {
      const inserted = await db
        .insert(attendanceVouchers)
        .values({
          companyId: data.company_id,
          voucherNumber: voucher_number,
          date: data.date,
          narration: data.narration || null,
        })
        .returning({ id: attendanceVouchers.attendanceVoucherId });
      const attendance_voucher_id = Number(inserted[0].id);

      if (data.entries && data.entries.length > 0) {
        for (const entry of data.entries) {
          await db
            .insert(attendanceVoucherEntries)
            .values({
              attendanceVoucherId: attendance_voucher_id,
              employeeId: entry.employee_id || null,
              attendanceTypeId: entry.attendance_type_id || null,
              value: Number(entry.value) || 0,
            });
        }
      }

      await db.run(sql`COMMIT`);
      return { success: true, attendance_voucher_id, voucher_number };
    } catch (err) {
      await db.run(sql`ROLLBACK`);
      throw err;
    }
  } catch (err) {
    return { success: false, error: err.message };
  }
};

const getAll = async (company_id) => {
  try {
    const rows = await db.all(
      sql`SELECT * FROM ${attendanceVouchers}
          WHERE ${attendanceVouchers.companyId} = ${company_id}
          ORDER BY ${attendanceVouchers.date} DESC, ${attendanceVouchers.attendanceVoucherId} DESC`
    );
    return { success: true, vouchers: rows };
  } catch (err) {
    return { success: false, error: err.message };
  }
};

const getById = async (id) => {
  try {
    const voucherRows = await db.all(
      sql`SELECT * FROM ${attendanceVouchers} WHERE ${attendanceVouchers.attendanceVoucherId} = ${id}`
    );
    if (voucherRows.length === 0) return { success: false, error: 'Voucher not found' };
    const voucher = voucherRows[0];

    const entries = await db.all(
      sql`SELECT e.*, emp.name as employee_name, emp.employee_code AS employee_number, t.name as attendance_type_name
          FROM ${attendanceVoucherEntries} e
          LEFT JOIN ${employees} emp ON emp.employee_id = e.employee_id
          LEFT JOIN ${attendanceTypes} t ON t.attendance_type_id = e.attendance_type_id
          WHERE e.attendance_voucher_id = ${id}`
    );

    return {
      success: true,
      voucher: {
        ...voucher,
        entries,
      },
    };
  } catch (err) {
    return { success: false, error: err.message };
  }
};

const deleteVoucher = async (id) => {
  try {
    await db
      .delete(attendanceVouchers)
      .where(eq(attendanceVouchers.attendanceVoucherId, id));
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
