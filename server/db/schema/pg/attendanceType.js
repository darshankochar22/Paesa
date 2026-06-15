const { pgTable, bigint, text, numeric, boolean, timestamp } = require('drizzle-orm/pg-core');
const { sql } = require('drizzle-orm');

const attendanceTypes = pgTable('attendance_types', {
  attendanceTypeId: bigint('attendance_type_id', { mode: 'number' })
    .primaryKey()
    .generatedByDefaultAsIdentity(),
  companyId: bigint('company_id', { mode: 'number' }).notNull(),
  name: text('name').notNull(),
  alias: text('alias'),
  type: text('type').notNull().default('Attendance / Leave with Pay'),
  unitId: bigint('unit_id', { mode: 'number' }),
  period: text('period').notNull().default('Per Day'),
  carryForward: boolean('carry_forward').notNull().default(false),
  encashment: boolean('encashment').notNull().default(false),
  maxDays: numeric('max_days', { precision: 18, scale: 4 }).notNull().default('0'),
  isActive: boolean('is_active').notNull().default(true),
  isPredefined: boolean('is_predefined').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

module.exports = { attendanceTypes };
