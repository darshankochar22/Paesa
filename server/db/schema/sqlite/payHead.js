const { sqliteTable, text, integer, real } = require('drizzle-orm/sqlite-core');
const { sql } = require('drizzle-orm');

// pay_heads
const payHeads = sqliteTable('pay_heads', {
  payHeadId: integer('pay_head_id').primaryKey({ autoIncrement: true }),
  companyId: integer('company_id').notNull(),
  name: text('name').notNull(),
  alias: text('alias'),
  payHeadType: text('pay_head_type').default('Earnings for Employees'),
  incomeType: text('income_type').default('Fixed'),
  underGroup: text('under_group'),
  affectsNetSalary: integer('affects_net_salary').default(1),
  payslipDisplayName: text('payslip_display_name'),
  useForGratuity: integer('use_for_gratuity').default(0),
  setAlterIncomeTax: integer('set_alter_income_tax').default(0),
  calculationType: text('calculation_type').default('As User Defined Value'),
  calculationPeriod: text('calculation_period').default('Months'),
  roundingMethod: text('rounding_method').default('Not Applicable'),
  roundingLimit: real('rounding_limit').default(0),
  statutoryComponent: text('statutory_component'),
  percentageOrAmount: real('percentage_or_amount').default(0),
  statutoryPayType: text('statutory_pay_type'),
  computeMethod: text('compute_method').default('On Current Earnings Total'),
  registrationNumber: text('registration_number'),
  contributeMinRs2: integer('contribute_min_rs2').default(0),
  leaveWithoutPay: text('leave_without_pay'),
  productionType: text('production_type'),
  openingBalance: real('opening_balance').default(0),
  openingBalanceType: text('opening_balance_type').default('Dr'),
  itComponent: text('it_component'),
  itCalculationBasis: text('it_calculation_basis'),
  itDeductTdsAcrossPeriods: integer('it_deduct_tds_across_periods').default(0),
  gratuityDaysPerMonth: real('gratuity_days_per_month').default(0),
  isActive: integer('is_active').default(1),
  isPredefined: integer('is_predefined').default(0),
  createdAt: text('created_at').default(sql`(datetime('now'))`),
  updatedAt: text('updated_at').default(sql`(datetime('now'))`),
});

// pay_head_gratuity_slabs
const payHeadGratuitySlabs = sqliteTable('pay_head_gratuity_slabs', {
  gratuitySlabId: integer('gratuity_slab_id').primaryKey({ autoIncrement: true }),
  payHeadId: integer('pay_head_id').notNull().references(() => payHeads.payHeadId),
  monthsFrom: integer('months_from'),
  monthsTo: integer('months_to'),
  eligibilityDays: real('eligibility_days').default(0),
  createdAt: text('created_at').default(sql`(datetime('now'))`),
});

// pay_head_slab_lines
const payHeadSlabLines = sqliteTable('pay_head_slab_lines', {
  slabLineId: integer('slab_line_id').primaryKey({ autoIncrement: true }),
  payHeadId: integer('pay_head_id').notNull().references(() => payHeads.payHeadId),
  effectiveFrom: text('effective_from'),
  amountGt: real('amount_gt').default(0),
  amountUpTo: real('amount_up_to').default(0),
  slabType: text('slab_type'),
  value: real('value').default(0),
  createdAt: text('created_at').default(sql`(datetime('now'))`),
});

// pay_head_formula_lines
const payHeadFormulaLines = sqliteTable('pay_head_formula_lines', {
  formulaLineId: integer('formula_line_id').primaryKey({ autoIncrement: true }),
  payHeadId: integer('pay_head_id').notNull().references(() => payHeads.payHeadId),
  sequence: integer('sequence').default(0),
  function: text('function'),
  payHeadIdRef: integer('pay_head_id_ref').references(() => payHeads.payHeadId),
  operator: text('operator'),
  createdAt: text('created_at').default(sql`(datetime('now'))`),
});

module.exports = {
  payHeads,
  payHeadSlabLines,
  payHeadFormulaLines,
  payHeadGratuitySlabs,
};
