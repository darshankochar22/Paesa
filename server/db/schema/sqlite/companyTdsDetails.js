const { sqliteTable, integer, text } = require('drizzle-orm/sqlite-core');
const { sql } = require('drizzle-orm');
const { companies } = require('./company');

// company_id is both PK and FK -> companies(company_id) ON DELETE CASCADE.
const companyTdsDetails = sqliteTable('company_tds_details', {
  companyId: integer('company_id')
    .primaryKey()
    .references(() => companies.companyId, { onDelete: 'cascade' }),
  tanRegNumber: text('tan_reg_number'),
  tan: text('tan'),
  deductorType: text('deductor_type').default('Company'),
  deductorBranch: text('deductor_branch'),
  setAlterPersonResponsible: integer('set_alter_person_responsible').default(0),
  personResponsibleName: text('person_responsible_name'),
  personResponsibleDesignation: text('person_responsible_designation'),
  personResponsiblePan: text('person_responsible_pan'),
  personResponsiblePhone: text('person_responsible_phone'),
  personResponsibleEmail: text('person_responsible_email'),
  ignoreItExemption: integer('ignore_it_exemption').default(1),
  activateTdsForItems: integer('activate_tds_for_items').default(0),
  createdAt: text('created_at').default(sql`(datetime('now'))`),
  updatedAt: text('updated_at').default(sql`(datetime('now'))`),
});

module.exports = { companyTdsDetails };
