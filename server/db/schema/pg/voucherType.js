const { pgTable, bigint, text, boolean, integer, timestamp } = require('drizzle-orm/pg-core');
// Mirrors docs/db/modules/voucherType.sql (pg DDL contract).
// 0/1 flags -> BOOLEAN, ISO datetime TEXT -> TIMESTAMPTZ, INTEGER PK -> IDENTITY.
const voucherTypes = pgTable('voucher_types', {
  vtId: bigint('vt_id', { mode: 'number' }).primaryKey().generatedByDefaultAsIdentity(),
  // EXPLICIT FK -> companies.company_id ON DELETE CASCADE (companies in another module; not referenced here)
  companyId: bigint('company_id', { mode: 'number' }).notNull(),
  name: text('name').notNull(),
  shortName: text('short_name'),
  category: text('category'),
  defaultVoucherClass: text('default_voucher_class'),
  affectsInventory: boolean('affects_inventory').notNull().default(false),
  affectsAccounting: boolean('affects_accounting').notNull().default(true),
  affectsGst: boolean('affects_gst').notNull().default(false),
  numberingMethod: text('numbering_method').notNull().default('Automatic'),
  numberingPrefix: text('numbering_prefix').notNull().default(''),
  numberingSuffix: text('numbering_suffix').notNull().default(''),
  startsWith: integer('starts_with').notNull().default(1),
  isPredefined: boolean('is_predefined').notNull().default(false),
  isActive: boolean('is_active').notNull().default(true),
  // self-referential FK to voucher_types(vt_id) ON DELETE SET NULL
  parentVtId: bigint('parent_vt_id', { mode: 'number' }).references(() => voucherTypes.vtId),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

const voucherTypeConfigs = pgTable('voucher_type_configs', {
  configId: bigint('config_id', { mode: 'number' }).primaryKey().generatedByDefaultAsIdentity(),
  // EXPLICIT FK -> voucher_types.vt_id ON DELETE CASCADE
  voucherTypeId: bigint('voucher_type_id', { mode: 'number' }).notNull().references(() => voucherTypes.vtId),
  useEffectiveDates: boolean('use_effective_dates').notNull().default(false),
  allowZeroValueTransactions: boolean('allow_zero_value_transactions').notNull().default(false),
  makeVoucherOptional: boolean('make_voucher_optional').notNull().default(false),
  allowNarration: boolean('allow_narration').notNull().default(true),
  allowNarrationPerLedger: boolean('allow_narration_per_ledger').notNull().default(false),
  printAfterSave: boolean('print_after_save').notNull().default(false),
  whatsappAfterSave: boolean('whatsapp_after_save').notNull().default(false),
  enableDefaultAccountingAllocation: boolean('enable_default_accounting_allocation').notNull().default(false),
  trackAdditionalCostForPurchase: boolean('track_additional_cost_for_purchase').notNull().default(false),
  defaultTitleToPrint: text('default_title_to_print'),
  useForPosInvoicing: boolean('use_for_pos_invoicing').notNull().default(false),
  // INFERRED FK (no FK in SQLite source); left unbound to avoid binding to an unverified table.
  defaultBankId: bigint('default_bank_id', { mode: 'number' }),
  declaration: text('declaration'),
  setAlterDeclaration: boolean('set_alter_declaration').notNull().default(false),
});

module.exports = { voucherTypes, voucherTypeConfigs };
