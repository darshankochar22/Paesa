const { sqliteTable, integer, text, real } = require('drizzle-orm/sqlite-core');
const { sql } = require('drizzle-orm');

// SQLite stores created_at/updated_at as TEXT DEFAULT (datetime('now')).
const datetimeNow = sql`(datetime('now'))`;

// attendance_vouchers
const attendanceVouchers = sqliteTable('attendance_vouchers', {
  attendanceVoucherId: integer('attendance_voucher_id').primaryKey({ autoIncrement: true }),
  companyId: integer('company_id').notNull(),
  voucherNumber: text('voucher_number'),
  date: text('date').notNull(),
  narration: text('narration'),
  createdAt: text('created_at').default(datetimeNow),
  updatedAt: text('updated_at').default(datetimeNow),
});

// attendance_voucher_entries
const attendanceVoucherEntries = sqliteTable('attendance_voucher_entries', {
  entryId: integer('entry_id').primaryKey({ autoIncrement: true }),
  attendanceVoucherId: integer('attendance_voucher_id').notNull(),
  employeeId: integer('employee_id'),
  attendanceTypeId: integer('attendance_type_id'),
  value: real('value').default(0),
});

module.exports = {
  attendanceVouchers,
  attendanceVoucherEntries,
};
