const {
  pgTable,
  bigint,
  text,
  integer,
  numeric,
  boolean,
  date,
  timestamp,
} = require('drizzle-orm/pg-core');
const { sql } = require('drizzle-orm');

// pay_heads
const payHeads = pgTable('pay_heads', {
  payHeadId: bigint('pay_head_id', { mode: 'number' }).primaryKey().generatedByDefaultAsIdentity(),
  companyId: bigint('company_id', { mode: 'number' }).notNull(),
  name: text('name').notNull(),
  alias: text('alias'),
  payHeadType: text('pay_head_type').default('Earnings for Employees'),
  incomeType: text('income_type').default('Fixed'),
  underGroup: text('under_group'),
  affectsNetSalary: boolean('affects_net_salary').default(true),
  payslipDisplayName: text('payslip_display_name'),
  useForGratuity: boolean('use_for_gratuity').default(false),
  setAlterIncomeTax: boolean('set_alter_income_tax').default(false),
  calculationType: text('calculation_type').default('As User Defined Value'),
  calculationPeriod: text('calculation_period').default('Months'),
  roundingMethod: text('rounding_method').default('Not Applicable'),
  roundingLimit: numeric('rounding_limit', { precision: 18, scale: 4 }).default('0'),
  statutoryComponent: text('statutory_component'),
  percentageOrAmount: numeric('percentage_or_amount', { precision: 18, scale: 4 }).default('0'),
  statutoryPayType: text('statutory_pay_type'),
  computeMethod: text('compute_method').default('On Current Earnings Total'),
  registrationNumber: text('registration_number'),
  contributeMinRs2: boolean('contribute_min_rs2').default(false),
  leaveWithoutPay: text('leave_without_pay'),
  productionType: text('production_type'),
  openingBalance: numeric('opening_balance', { precision: 18, scale: 4 }).default('0'),
  openingBalanceType: text('opening_balance_type').default('Dr'),
  itComponent: text('it_component'),
  itCalculationBasis: text('it_calculation_basis'),
  itDeductTdsAcrossPeriods: boolean('it_deduct_tds_across_periods').default(false),
  gratuityDaysPerMonth: numeric('gratuity_days_per_month', { precision: 18, scale: 4 }).default('0'),
  isActive: boolean('is_active').default(true),
  isPredefined: boolean('is_predefined').default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).default(sql`now()`),
  updatedAt: timestamp('updated_at', { withTimezone: true }).default(sql`now()`),
});

// pay_head_gratuity_slabs
const payHeadGratuitySlabs = pgTable('pay_head_gratuity_slabs', {
  gratuitySlabId: bigint('gratuity_slab_id', { mode: 'number' }).primaryKey().generatedByDefaultAsIdentity(),
  payHeadId: bigint('pay_head_id', { mode: 'number' })
    .notNull()
    .references(() => payHeads.payHeadId, { onDelete: 'cascade' }),
  monthsFrom: integer('months_from'),
  monthsTo: integer('months_to'),
  eligibilityDays: numeric('eligibility_days', { precision: 18, scale: 4 }).default('0'),
  createdAt: timestamp('created_at', { withTimezone: true }).default(sql`now()`),
});

// pay_head_slab_lines
const payHeadSlabLines = pgTable('pay_head_slab_lines', {
  slabLineId: bigint('slab_line_id', { mode: 'number' }).primaryKey().generatedByDefaultAsIdentity(),
  payHeadId: bigint('pay_head_id', { mode: 'number' })
    .notNull()
    .references(() => payHeads.payHeadId, { onDelete: 'cascade' }),
  effectiveFrom: date('effective_from'),
  amountGt: numeric('amount_gt', { precision: 18, scale: 4 }).default('0'),
  amountUpTo: numeric('amount_up_to', { precision: 18, scale: 4 }).default('0'),
  slabType: text('slab_type'),
  value: numeric('value', { precision: 18, scale: 4 }).default('0'),
  createdAt: timestamp('created_at', { withTimezone: true }).default(sql`now()`),
});

// pay_head_formula_lines
const payHeadFormulaLines = pgTable('pay_head_formula_lines', {
  formulaLineId: bigint('formula_line_id', { mode: 'number' }).primaryKey().generatedByDefaultAsIdentity(),
  payHeadId: bigint('pay_head_id', { mode: 'number' })
    .notNull()
    .references(() => payHeads.payHeadId, { onDelete: 'cascade' }),
  sequence: integer('sequence').default(0),
  function: text('function'),
  payHeadIdRef: bigint('pay_head_id_ref', { mode: 'number' })
    .references(() => payHeads.payHeadId, { onDelete: 'set null' }),
  operator: text('operator'),
  createdAt: timestamp('created_at', { withTimezone: true }).default(sql`now()`),
});

module.exports = {
  payHeads,
  payHeadSlabLines,
  payHeadFormulaLines,
  payHeadGratuitySlabs,
};
