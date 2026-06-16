const { sqliteTable, text, integer, real } = require('drizzle-orm/sqlite-core');
const { sql } = require('drizzle-orm');

// Mirrors server/group/group.js CREATE TABLE groups (SQLite ground truth).
// Raw SQLite types preserved: 0/1 INTEGER flags kept as integer, GST rates as REAL,
// created_at / updated_at are TEXT ISO datetime strings.
const groups = sqliteTable('groups', {
  groupId: integer('group_id').primaryKey({ autoIncrement: true }),
  companyId: integer('company_id').notNull(),
  name: text('name').notNull(),
  alias: text('alias'),
  parentGroupId: integer('parent_group_id'),
  isPrimary: integer('is_primary').default(0),
  isPredefined: integer('is_predefined').default(0),
  nature: text('nature'),
  setAlterTdsDetails: integer('set_alter_tds_details').default(0),
  setAlterTcsDetails: integer('set_alter_tcs_details').default(0),
  setAlterOtherStatutoryDetails: integer('set_alter_other_statutory_details').default(0),
  hsnSacSource: text('hsn_sac_source'),
  hsnSacDescription: text('hsn_sac_description'),
  gstRateSource: text('gst_rate_source'),
  taxabilityType: text('taxability_type'),
  behavesLikeSubledger: integer('behaves_like_subledger').default(0),
  showNetDebitCredit: integer('show_net_debit_credit').default(0),
  usedForCalculation: integer('used_for_calculation').default(0),
  allocationMethod: text('allocation_method').default('Average Cost'),
  gstRate: real('gst_rate'),
  cgstRate: real('cgst_rate'),
  sgstRate: real('sgst_rate'),
  igstRate: real('igst_rate'),
  hsnSacCode: text('hsn_sac_code'),
  statutoryDetails: text('statutory_details'),
  setAlterServiceTaxDetails: integer('set_alter_service_tax_details').default(0),
  hsnSacClassificationId: integer('hsn_sac_classification_id'),
  gstClassificationId: integer('gst_classification_id'),
  slabBasedRates: text('slab_based_rates'),
  sortOrder: integer('sort_order').default(0),
  groupType: text('group_type'),
  displayOrder: integer('display_order').default(0),
  isActive: integer('is_active').default(1),
  createdAt: text('created_at').default(sql`(datetime('now'))`),
  updatedAt: text('updated_at').default(sql`(datetime('now'))`),
});

module.exports = { groups };
