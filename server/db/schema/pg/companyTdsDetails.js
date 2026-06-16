const { pgTable, bigint, text, boolean, timestamp } = require('drizzle-orm/pg-core');
const { sql } = require('drizzle-orm');
const { companies } = require('./company');

// company_id is both PK and FK -> companies(company_id) ON DELETE CASCADE.
// It is NOT an identity column: the value is supplied by the caller and shared
// with companies (1:1).
const companyTdsDetails = pgTable('company_tds_details', {
  companyId: bigint('company_id', { mode: 'number' })
    .primaryKey()
    .notNull()
    .references(() => companies.companyId, { onDelete: 'cascade' }),
  tanRegNumber: text('tan_reg_number'),
  tan: text('tan'),
  deductorType: text('deductor_type').notNull().default('Company'),
  deductorBranch: text('deductor_branch'),
  setAlterPersonResponsible: boolean('set_alter_person_responsible').notNull().default(false),
  personResponsibleName: text('person_responsible_name'),
  personResponsibleDesignation: text('person_responsible_designation'),
  personResponsiblePan: text('person_responsible_pan'),
  personResponsiblePhone: text('person_responsible_phone'),
  personResponsibleEmail: text('person_responsible_email'),
  ignoreItExemption: boolean('ignore_it_exemption').notNull().default(true),
  activateTdsForItems: boolean('activate_tds_for_items').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

module.exports = { companyTdsDetails };
