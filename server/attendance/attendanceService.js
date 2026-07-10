const { db } = require('../db/index');
const { sql, eq } = require('drizzle-orm');
const {
  attendanceVouchers,
  attendanceVoucherEntries,
  employees,
  attendanceTypes,
  units,
} = require('../db/schema');

// Plain sequential numbers (1, 2, 3 …) — same scheme as regular vouchers
// (voucherNumbering.js, issue #143): no ATT- prefix, no zero-padding. The next
// number is the largest trailing digit-run across existing numbers + 1, so it
// stays continuous even past legacy "ATT-000xx" rows.
const generateVoucherNumber = async (company_id) => {
  const rows = await db.all(
    sql`SELECT ${attendanceVouchers.voucherNumber} AS voucher_number FROM ${attendanceVouchers}
        WHERE ${attendanceVouchers.companyId} = ${company_id}`,
  );
  let max = 0;
  for (const r of rows) {
    const m = String(r.voucher_number ?? '').match(/(\d+)(?!.*\d)/);
    if (m) {
      const v = parseInt(m[1], 10);
      if (v > max) max = v;
    }
  }
  return String(max + 1);
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
    const voucher_number = data.voucher_number || (await generateVoucherNumber(data.company_id));
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
          await db.insert(attendanceVoucherEntries).values({
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
          ORDER BY ${attendanceVouchers.date} DESC, ${attendanceVouchers.attendanceVoucherId} DESC`,
    );
    return { success: true, vouchers: rows };
  } catch (err) {
    return { success: false, error: err.message };
  }
};

const getById = async (id) => {
  try {
    const voucherRows = await db.all(
      sql`SELECT * FROM ${attendanceVouchers} WHERE ${attendanceVouchers.attendanceVoucherId} = ${id}`,
    );
    if (voucherRows.length === 0) return { success: false, error: 'Voucher not found' };
    const voucher = voucherRows[0];

    // TallyPrime shows, per row: the attendance/production type's Unit ("Days")
    // and the running "Cur Bal" — the cumulative value for that employee + type
    // up to and including this entry (all earlier-dated vouchers, plus this
    // voucher up to this line). Computed here so the read-only view needs no
    // extra round-trip. Unit falls back to "Days" (attendance is day-based).
    const entries = await db.all(
      sql`SELECT e.*, emp.name as employee_name, emp.employee_code AS employee_number,
                 t.name as attendance_type_name, u.symbol AS unit,
                 (SELECT COALESCE(SUM(e2.value), 0)
                    FROM ${attendanceVoucherEntries} e2
                    JOIN ${attendanceVouchers} av2 ON av2.attendance_voucher_id = e2.attendance_voucher_id
                   WHERE e2.employee_id = e.employee_id
                     AND e2.attendance_type_id = e.attendance_type_id
                     AND av2.company_id = ${voucher.company_id}
                     AND (av2.date < ${voucher.date}
                          OR (e2.attendance_voucher_id = ${id} AND e2.entry_id <= e.entry_id))
                 ) AS cur_bal
          FROM ${attendanceVoucherEntries} e
          LEFT JOIN ${employees} emp ON emp.employee_id = e.employee_id
          LEFT JOIN ${attendanceTypes} t ON t.attendance_type_id = e.attendance_type_id
          LEFT JOIN ${units} u ON u.unit_id = t.unit_id
          WHERE e.attendance_voucher_id = ${id}
          ORDER BY e.entry_id ASC`,
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
    await db.delete(attendanceVouchers).where(eq(attendanceVouchers.attendanceVoucherId, id));
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
