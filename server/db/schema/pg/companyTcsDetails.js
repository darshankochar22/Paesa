const { pgTable, bigint, text, boolean, timestamp } = require('drizzle-orm/pg-core');
const { sql } = require('drizzle-orm');
const { companies } = require('./company');

// 1:1 extension table: company_id is BOTH the primary key AND a FK to companies.
// PK == shared company key, so it is NOT a generated identity column.
const companyTcsDetails = pgTable('company_tcs_details', {
  companyId: bigint('company_id', { mode: 'number' })
    .primaryKey()
    .references(() => companies.companyId, { onDelete: 'cascade' }),
  tanRegNumber: text('tan_reg_number'),
  tan: text('tan'),
  collectorType: text('collector_type').default('Company'),
  collectorBranch: text('collector_branch'),
  setAlterPersonResponsible: boolean('set_alter_person_responsible').notNull().default(false),
  personResponsibleName: text('person_responsible_name'),
  personResponsibleSonDaughterOf: text('person_responsible_son_daughter_of'),
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
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

module.exports = { companyTcsDetails };
