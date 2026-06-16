const { pgTable, bigint, text, date, timestamp, numeric } = require('drizzle-orm/pg-core');
const { sql } = require('drizzle-orm');

// attendance_vouchers
const attendanceVouchers = pgTable('attendance_vouchers', {
  attendanceVoucherId: bigint('attendance_voucher_id', { mode: 'number' })
    .primaryKey()
    .generatedByDefaultAsIdentity(),
  companyId: bigint('company_id', { mode: 'number' }).notNull(),
  voucherNumber: text('voucher_number'),
  date: date('date').notNull(),
  narration: text('narration'),
  createdAt: timestamp('created_at', { withTimezone: true }).default(sql`now()`),
  updatedAt: timestamp('updated_at', { withTimezone: true }).default(sql`now()`),
});

// attendance_voucher_entries
const attendanceVoucherEntries = pgTable('attendance_voucher_entries', {
  entryId: bigint('entry_id', { mode: 'number' })
    .primaryKey()
    .generatedByDefaultAsIdentity(),
  attendanceVoucherId: bigint('attendance_voucher_id', { mode: 'number' })
    .notNull()
    .references(() => attendanceVouchers.attendanceVoucherId, { onDelete: 'cascade' }),
  employeeId: bigint('employee_id', { mode: 'number' }),
  attendanceTypeId: bigint('attendance_type_id', { mode: 'number' }),
  value: numeric('value', { precision: 18, scale: 4 }).default('0'),
});

module.exports = {
  attendanceVouchers,
  attendanceVoucherEntries,
};
