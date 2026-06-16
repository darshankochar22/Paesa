const { sqliteTable, integer, text, real } = require('drizzle-orm/sqlite-core');
const { sql } = require('drizzle-orm');
const { companies } = require('./company');

// Mirrors server/gstRegistration/gstRegistration.js CREATE TABLE gst_registrations.
// Integer 0/1 flag columns are kept as raw integer (the service writes `? 1 : 0`
// and reads `is_active = 1`), so NO { mode: 'boolean' } — preserve exact behavior.
// Date/datetime columns are TEXT (ISO strings) in source — kept as raw text.
const gstRegistrations = sqliteTable('gst_registrations', {
  gstId: integer('gst_id').primaryKey({ autoIncrement: true }),
  companyId: integer('company_id').notNull().references(() => companies.companyId, { onDelete: 'cascade' }),
  registrationType: text('registration_type').default('Regular'),
  registrationStatus: text('registration_status').default('Active'),
  assesseeOfOtherTerritory: integer('assessee_of_other_territory').default(0),
  periodicityOfGstr1: text('periodicity_of_gstr1').default('Monthly'),
  gstin: text('gstin'),
  gstUsername: text('gst_username'),
  modeOfFiling: text('mode_of_filing').default('Online'),
  eInvoiceDetails: text('e_invoice_details'),
  eInvoiceApplication: integer('e_invoice_application').default(0),
  eWayBillApplicable: integer('e_way_bill_applicable').default(0),
  eWayBillApplicableFrom: text('e_way_bill_applicable_from'),
  applicableForIntrastat: integer('applicable_for_intrastat').default(0),
  legalName: text('legal_name'),
  tradeName: text('trade_name'),
  stateId: text('state_id'),
  registrationDate: text('registration_date'),
  effectiveFrom: text('effective_from'),
  addressType: text('address_type').default('Primary'),
  goodsDispatchedFrom: text('goods_dispatched_from').default('Primary'),
  eInvoiceApplicableFrom: text('e_invoice_applicable_from'),
  eInvoiceBillFromPlace: text('e_invoice_bill_from_place'),
  compositionTaxRate: real('composition_tax_rate'),
  compositionTaxCalcBasis: text('composition_tax_calc_basis'),
  isActive: integer('is_active').default(1),
  createdAt: text('created_at').default(sql`(datetime('now'))`),
  updatedAt: text('updated_at').default(sql`(datetime('now'))`),
});

module.exports = { gstRegistrations };
