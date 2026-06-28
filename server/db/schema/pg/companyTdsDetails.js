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
  personResponsibleSonOf: text('person_responsible_son_of'),
  personResponsibleDesignation: text('person_responsible_designation'),
  personResponsiblePan: text('person_responsible_pan'),
  personResponsibleFlatNo: text('person_responsible_flat_no'),
  personResponsiblePremises: text('person_responsible_premises'),
  personResponsibleRoad: text('person_responsible_road'),
  personResponsibleArea: text('person_responsible_area'),
  personResponsibleCity: text('person_responsible_city'),
  personResponsibleState: text('person_responsible_state'),
  personResponsiblePincode: text('person_responsible_pincode'),
  personResponsiblePhone: text('person_responsible_phone'),
  personResponsibleStdCode: text('person_responsible_std_code'),
  personResponsibleTelephone: text('person_responsible_telephone'),
  personResponsibleEmail: text('person_responsible_email'),
  ignoreItExemption: boolean('ignore_it_exemption').notNull().default(true),
  activateTdsForItems: boolean('activate_tds_for_items').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

module.exports = { companyTdsDetails };
