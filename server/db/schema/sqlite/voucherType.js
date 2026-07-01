const { sqliteTable, text, integer } = require('drizzle-orm/sqlite-core');
const { sql } = require('drizzle-orm');

// Mirrors server/voucherType/voucherType.js CREATE TABLE statements (SQLite ground truth).
// Raw SQLite types preserved: 0/1 INTEGER flags kept as integer,
// created_at / updated_at are TEXT ISO datetime strings.
const voucherTypes = sqliteTable('voucher_types', {
  vtId: integer('vt_id').primaryKey({ autoIncrement: true }),
  companyId: integer('company_id').notNull(),
  name: text('name').notNull(),
  alias: text('alias'),
  shortName: text('short_name'),
  category: text('category'),
  defaultVoucherClass: text('default_voucher_class'),
  affectsInventory: integer('affects_inventory').default(0),
  affectsAccounting: integer('affects_accounting').default(1),
  affectsGst: integer('affects_gst').default(0),
  numberingMethod: text('numbering_method').default('Automatic'),
  numberingPrefix: text('numbering_prefix').default(''),
  numberingSuffix: text('numbering_suffix').default(''),
  startsWith: integer('starts_with').default(1),
  isPredefined: integer('is_predefined').default(0),
  isActive: integer('is_active').default(1),
  parentVtId: integer('parent_vt_id'),
  createdAt: text('created_at').default(sql`(datetime('now'))`),
  updatedAt: text('updated_at').default(sql`(datetime('now'))`),
});

const voucherTypeConfigs = sqliteTable('voucher_type_configs', {
  configId: integer('config_id').primaryKey({ autoIncrement: true }),
  voucherTypeId: integer('voucher_type_id').notNull(),
  useEffectiveDates: integer('use_effective_dates').default(0),
  allowZeroValueTransactions: integer('allow_zero_value_transactions').default(0),
  makeVoucherOptional: integer('make_voucher_optional').default(0),
  allowNarration: integer('allow_narration').default(1),
  allowNarrationPerLedger: integer('allow_narration_per_ledger').default(0),
  numberingBehaviour: text('numbering_behaviour').default('Retain Original Voucher No.'),
  setAlterAdditionalNumbering: integer('set_alter_additional_numbering').default(0),
  showUnusedNumbers: integer('show_unused_numbers').default(1),
  preventDuplicateNumbers: integer('prevent_duplicate_numbers').default(0),
  printAfterSave: integer('print_after_save').default(0),
  whatsappAfterSave: integer('whatsapp_after_save').default(0),
  enableDefaultAccountingAllocation: integer('enable_default_accounting_allocation').default(0),
  trackAdditionalCostForPurchase: integer('track_additional_cost_for_purchase').default(0),
  defaultTitleToPrint: text('default_title_to_print'),
  useForPosInvoicing: integer('use_for_pos_invoicing').default(0),
  defaultBankId: integer('default_bank_id'),
  declaration: text('declaration'),
  setAlterDeclaration: integer('set_alter_declaration').default(0),
  // Additional numbering details sub-screen (issue #143).
  startingNumber: integer('starting_number').default(1),
  widthOfNumericalPart: integer('width_of_numerical_part').default(0),
  prefillWithZero: integer('prefill_with_zero').default(0),
  restartNumbering: text('restart_numbering').default('[]'),
  prefixDetails: text('prefix_details').default('[]'),
  suffixDetails: text('suffix_details').default('[]'),
  // Name of Class (#GST class) — array of { id, name, use_for_gst_details, cgst_ledger_id, sgst_ledger_id, igst_ledger_id }.
  voucherClasses: text('voucher_classes').default('[]'),
});

module.exports = { voucherTypes, voucherTypeConfigs };
