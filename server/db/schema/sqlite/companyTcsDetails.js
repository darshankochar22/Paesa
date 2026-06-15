const { sqliteTable, text, integer } = require('drizzle-orm/sqlite-core');
const { sql } = require('drizzle-orm');

// 1:1 extension table: company_id is BOTH the primary key AND a FK to companies.
const companyTcsDetails = sqliteTable('company_tcs_details', {
  companyId: integer('company_id').primaryKey(),
  tanRegNumber: text('tan_reg_number'),
  tan: text('tan'),
  collectorType: text('collector_type').default('Company'),
  collectorBranch: text('collector_branch'),
  setAlterPersonResponsible: integer('set_alter_person_responsible').default(0),
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
  ignoreItExemption: integer('ignore_it_exemption').default(1),
  createdAt: text('created_at').default(sql`(datetime('now'))`),
  updatedAt: text('updated_at').default(sql`(datetime('now'))`),
});

module.exports = { companyTcsDetails };
