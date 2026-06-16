const { pgTable, bigint, text, boolean, numeric, integer, timestamp } = require('drizzle-orm/pg-core');
// Mirrors docs/db/modules/group.sql (pg DDL contract).
// 0/1 flags -> BOOLEAN, GST rate REAL -> NUMERIC(18,4), ISO datetime TEXT -> TIMESTAMPTZ,
// INTEGER PK -> IDENTITY.
const groups = pgTable('groups', {
  groupId: bigint('group_id', { mode: 'number' }).primaryKey().generatedByDefaultAsIdentity(),
  // FK -> companies.company_id ON DELETE CASCADE (companies in another module; not referenced here)
  companyId: bigint('company_id', { mode: 'number' }).notNull(),
  name: text('name').notNull(),
  alias: text('alias'),
  // self-referential FK to groups(group_id)
  parentGroupId: bigint('parent_group_id', { mode: 'number' }).references(() => groups.groupId),
  isPrimary: boolean('is_primary').notNull().default(false),
  isPredefined: boolean('is_predefined').notNull().default(false),
  nature: text('nature'),
  setAlterTdsDetails: boolean('set_alter_tds_details').notNull().default(false),
  setAlterTcsDetails: boolean('set_alter_tcs_details').notNull().default(false),
  setAlterOtherStatutoryDetails: boolean('set_alter_other_statutory_details').notNull().default(false),
  hsnSacSource: text('hsn_sac_source'),
  hsnSacDescription: text('hsn_sac_description'),
  gstRateSource: text('gst_rate_source'),
  taxabilityType: text('taxability_type'),
  behavesLikeSubledger: boolean('behaves_like_subledger').notNull().default(false),
  showNetDebitCredit: boolean('show_net_debit_credit').notNull().default(false),
  usedForCalculation: boolean('used_for_calculation').notNull().default(false),
  allocationMethod: text('allocation_method').notNull().default('Average Cost'),
  gstRate: numeric('gst_rate', { precision: 18, scale: 4 }),
  cgstRate: numeric('cgst_rate', { precision: 18, scale: 4 }),
  sgstRate: numeric('sgst_rate', { precision: 18, scale: 4 }),
  igstRate: numeric('igst_rate', { precision: 18, scale: 4 }),
  hsnSacCode: text('hsn_sac_code'),
  statutoryDetails: text('statutory_details'),
  setAlterServiceTaxDetails: boolean('set_alter_service_tax_details').notNull().default(false),
  hsnSacClassificationId: bigint('hsn_sac_classification_id', { mode: 'number' }),
  gstClassificationId: bigint('gst_classification_id', { mode: 'number' }),
  slabBasedRates: text('slab_based_rates'),
  sortOrder: integer('sort_order').notNull().default(0),
  groupType: text('group_type'),
  displayOrder: integer('display_order').notNull().default(0),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

module.exports = { groups };
