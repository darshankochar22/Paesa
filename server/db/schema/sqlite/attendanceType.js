const { sqliteTable, integer, text, real } = require('drizzle-orm/sqlite-core');
const { sql } = require('drizzle-orm');

const attendanceTypes = sqliteTable('attendance_types', {
  attendanceTypeId: integer('attendance_type_id').primaryKey({ autoIncrement: true }),
  companyId: integer('company_id').notNull(),
  name: text('name').notNull(),
  alias: text('alias'),
  type: text('type').default('Attendance / Leave with Pay'),
  unitId: integer('unit_id'),
  period: text('period').default('Per Day'),
  carryForward: integer('carry_forward').default(0),
  encashment: integer('encashment').default(0),
  maxDays: real('max_days').default(0),
  isActive: integer('is_active').default(1),
  isPredefined: integer('is_predefined').default(0),
  createdAt: text('created_at').default(sql`(datetime('now'))`),
  updatedAt: text('updated_at').default(sql`(datetime('now'))`),
});

module.exports = { attendanceTypes };
