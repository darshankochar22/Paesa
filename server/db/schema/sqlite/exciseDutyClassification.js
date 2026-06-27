const { sqliteTable, text, integer } = require('drizzle-orm/sqlite-core');
const { sql } = require('drizzle-orm');

// Mirrors server/exciseDutyClassification/exciseDutyClassification.js CREATE TABLE
// statements (SQLite ground truth). A statutory "Excise Duty Classification" master
// (issue #140) carries a name, a duty_code (picked from the List of Excise Duty
// Codes) and ONE OR MORE calculation methods entered through the multi-row
// "Calculation method" list on the creation screen (On Assessable Value / Basic
// Excise Duty, added until "End of List") -> excise_duty_calculation_methods.
// is_active is an INTEGER 0/1 flag; created_at / updated_at are TEXT ISO datetimes.
const exciseDutyClassifications = sqliteTable('excise_duty_classifications', {
  exciseDutyClassificationId: integer('excise_duty_classification_id').primaryKey({ autoIncrement: true }),
  companyId: integer('company_id').notNull(),
  name: text('name').notNull(),
  dutyCode: text('duty_code'),
  isActive: integer('is_active').default(1),
  createdAt: text('created_at').default(sql`(datetime('now'))`),
  updatedAt: text('updated_at').default(sql`(datetime('now'))`),
});

const exciseDutyCalculationMethods = sqliteTable('excise_duty_calculation_methods', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  exciseDutyClassificationId: integer('excise_duty_classification_id').notNull(),
  method: text('method').notNull(),
  sortOrder: integer('sort_order').default(0),
});

module.exports = {
  exciseDutyClassifications,
  exciseDutyCalculationMethods,
};
