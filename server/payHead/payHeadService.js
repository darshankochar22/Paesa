const { db } = require('../db/index');
const { sql, eq } = require('drizzle-orm');
const { payHeads, payHeadSlabLines, payHeadFormulaLines, payHeadGratuitySlabs } = require('../db/schema');

// Fetch a single pay_head row in the legacy snake_case shape (or undefined).
const findPayHead = async (id) => {
  const rows = await db.all(
    sql`SELECT * FROM ${payHeads} WHERE ${payHeads.payHeadId} = ${id}`
  );
  return rows[0];
};

const seedDefaultPayHeads = async (company_id) => {
  const defaults = [
    { name: 'Basic Salary',         pay_head_type: 'Earnings',                      calculation_type: 'Flat Rate',  affects_net_salary: 1, under_group: 'Indirect Expenses',   statutory_component: null,       percentage_or_amount: 0     },
    { name: 'House Rent Allowance', pay_head_type: 'Earnings',                      calculation_type: 'Percentage', affects_net_salary: 1, under_group: 'Indirect Expenses',   statutory_component: null,       percentage_or_amount: 40    },
    { name: 'Conveyance Allowance', pay_head_type: 'Earnings',                      calculation_type: 'Flat Rate',  affects_net_salary: 1, under_group: 'Indirect Expenses',   statutory_component: null,       percentage_or_amount: 0     },
    { name: 'Provident Fund',       pay_head_type: 'Deductions',                    calculation_type: 'Percentage', affects_net_salary: 1, under_group: 'Current Liabilities', statutory_component: 'PF',       percentage_or_amount: 12    },
    { name: 'Professional Tax',     pay_head_type: 'Deductions',                    calculation_type: 'Flat Rate',  affects_net_salary: 1, under_group: 'Current Liabilities', statutory_component: 'PT',       percentage_or_amount: 0     },
    { name: 'TDS',                  pay_head_type: 'Deductions',                    calculation_type: 'Percentage', affects_net_salary: 1, under_group: 'Current Liabilities', statutory_component: 'TDS',      percentage_or_amount: 0     },
    { name: 'ESI',                  pay_head_type: 'Deductions',                    calculation_type: 'Percentage', affects_net_salary: 1, under_group: 'Current Liabilities', statutory_component: 'ESI',      percentage_or_amount: 0.75  },
    { name: 'Gratuity',             pay_head_type: 'Employer Statutory Contributions', calculation_type: 'Percentage', affects_net_salary: 0, under_group: 'Indirect Expenses', statutory_component: 'Gratuity', percentage_or_amount: 4.81  },
  ];

  for (const p of defaults) {
    await db
      .insert(payHeads)
      .values({
        companyId: company_id,
        name: p.name,
        payHeadType: p.pay_head_type,
        calculationType: p.calculation_type,
        affectsNetSalary: p.affects_net_salary,
        underGroup: p.under_group,
        statutoryComponent: p.statutory_component,
        percentageOrAmount: p.percentage_or_amount,
        isActive: 1,
        isPredefined: 1,
      });
  }
};

module.exports = {
  seedDefaultPayHeads,

  create: async (data) => {
    try {
      const exists = await db.all(
        sql`SELECT * FROM ${payHeads}
            WHERE ${payHeads.companyId} = ${data.company_id}
              AND LOWER(${payHeads.name}) = LOWER(${data.name})
              AND ${payHeads.isActive} = 1`
      );
      if (exists.length > 0) return { success: false, error: 'Pay Head already exists' };

      const inserted = await db
        .insert(payHeads)
        .values({
          companyId: data.company_id,
          name: data.name,
          alias: data.alias || null,
          payHeadType: data.pay_head_type || 'Earnings for Employees',
          incomeType: data.income_type || 'Fixed',
          underGroup: data.under_group || null,
          affectsNetSalary: data.affects_net_salary ?? 1,
          payslipDisplayName: data.payslip_display_name || null,
          useForGratuity: data.use_for_gratuity ?? 0,
          setAlterIncomeTax: data.set_alter_income_tax ?? 0,
          calculationType: data.calculation_type || 'As User Defined Value',
          calculationPeriod: data.calculation_period || 'Months',
          roundingMethod: data.rounding_method || 'Not Applicable',
          roundingLimit: data.rounding_limit || 0,
          statutoryComponent: data.statutory_component || null,
          percentageOrAmount: data.percentage_or_amount || 0,
          statutoryPayType: data.statutory_pay_type || null,
          computeMethod: data.compute_method || 'On Current Earnings Total',
          registrationNumber: data.registration_number || null,
          contributeMinRs2: data.contribute_min_rs2 ?? 0,
          leaveWithoutPay: data.leave_without_pay || null,
          productionType: data.production_type || null,
          openingBalance: data.opening_balance || 0,
          openingBalanceType: data.opening_balance_type || 'Dr',
          itComponent: data.it_component || null,
          itCalculationBasis: data.it_calculation_basis || null,
          itDeductTdsAcrossPeriods: data.it_deduct_tds_across_periods ?? 0,
          gratuityDaysPerMonth: data.gratuity_days_per_month || 0,
          isActive: 1,
          isPredefined: 0,
        })
        .returning({ id: payHeads.payHeadId });

      const payHead = await findPayHead(inserted[0].id);
      return { success: true, payHead };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  getAll: async (company_id) => {
    try {
      const rows = await db.all(
        sql`SELECT * FROM ${payHeads}
            WHERE ${payHeads.companyId} = ${company_id}
              AND ${payHeads.isActive} = 1`
      );
      return { success: true, payHeads: rows };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  // Aggregate opening balances across all pay heads → Dr total, Cr total, and
  // the net difference with its side. Mirrors ledgerService.getTotalOpeningBalance
  // so the "Total Opening Balance" box matches TallyPrime / the Ledger screen.
  getTotalOpeningBalance: async (company_id) => {
    try {
      const rows = await db.all(
        sql`SELECT
              COALESCE(SUM(CASE WHEN ${payHeads.openingBalanceType} = 'Dr' THEN ABS(${payHeads.openingBalance}) ELSE 0 END), 0) AS total_dr,
              COALESCE(SUM(CASE WHEN ${payHeads.openingBalanceType} = 'Cr' THEN ABS(${payHeads.openingBalance}) ELSE 0 END), 0) AS total_cr
            FROM ${payHeads}
            WHERE ${payHeads.companyId} = ${company_id} AND ${payHeads.isActive} = 1`
      );
      const row = rows[0] || {};
      const totalDr = Number(row.total_dr) || 0;
      const totalCr = Number(row.total_cr) || 0;
      const net = totalDr - totalCr;
      return {
        success: true,
        totalDr,
        totalCr,
        netBalance: Math.abs(net),
        balanceType: net >= 0 ? 'Dr' : 'Cr',
      };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  getById: async (id) => {
    try {
      const payHead = await findPayHead(id);
      if (!payHead) return { success: false, error: 'Pay Head not found' };
      return { success: true, payHead };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  update: async (data) => {
    try {
      const current = await findPayHead(data.pay_head_id);
      if (!current) return { success: false, error: 'Pay Head not found' };
      if (current.is_predefined) return { success: false, error: 'Cannot edit predefined pay heads' };

      await db
        .update(payHeads)
        .set({
          name: data.name ?? current.name,
          alias: data.alias ?? current.alias,
          payHeadType: data.pay_head_type ?? current.pay_head_type,
          incomeType: data.income_type ?? current.income_type,
          underGroup: data.under_group ?? current.under_group,
          affectsNetSalary: data.affects_net_salary ?? current.affects_net_salary,
          payslipDisplayName: data.payslip_display_name ?? current.payslip_display_name,
          useForGratuity: data.use_for_gratuity ?? current.use_for_gratuity,
          setAlterIncomeTax: data.set_alter_income_tax ?? current.set_alter_income_tax,
          calculationType: data.calculation_type ?? current.calculation_type,
          calculationPeriod: data.calculation_period ?? current.calculation_period,
          roundingMethod: data.rounding_method ?? current.rounding_method,
          roundingLimit: data.rounding_limit ?? current.rounding_limit,
          statutoryComponent: data.statutory_component ?? current.statutory_component,
          percentageOrAmount: data.percentage_or_amount ?? current.percentage_or_amount,
          statutoryPayType: data.statutory_pay_type ?? current.statutory_pay_type,
          computeMethod: data.compute_method ?? current.compute_method,
          registrationNumber: data.registration_number ?? current.registration_number,
          contributeMinRs2: data.contribute_min_rs2 ?? current.contribute_min_rs2,
          leaveWithoutPay: data.leave_without_pay ?? current.leave_without_pay,
          productionType: data.production_type ?? current.production_type,
          openingBalance: data.opening_balance ?? current.opening_balance,
          openingBalanceType: data.opening_balance_type ?? current.opening_balance_type,
          itComponent: data.it_component ?? current.it_component,
          itCalculationBasis: data.it_calculation_basis ?? current.it_calculation_basis,
          itDeductTdsAcrossPeriods: data.it_deduct_tds_across_periods ?? current.it_deduct_tds_across_periods,
          gratuityDaysPerMonth: data.gratuity_days_per_month ?? current.gratuity_days_per_month,
          updatedAt: sql`datetime('now')`,
        })
        .where(eq(payHeads.payHeadId, data.pay_head_id));

      const updated = await findPayHead(data.pay_head_id);
      return { success: true, payHead: updated };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  delete: async (id) => {
    try {
      const existing = await findPayHead(id);
      if (!existing) return { success: false, error: 'Pay Head not found' };
      if (existing.is_predefined) return { success: false, error: 'Cannot delete predefined pay heads' };

      await db
        .update(payHeads)
        .set({ isActive: 0 })
        .where(eq(payHeads.payHeadId, id));
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  getSlabs: async (pay_head_id) => {
    try {
      const rows = await db.all(
        sql`SELECT * FROM ${payHeadSlabLines}
            WHERE ${payHeadSlabLines.payHeadId} = ${pay_head_id}
            ORDER BY ${payHeadSlabLines.effectiveFrom}`
      );
      return { success: true, slabs: rows };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  createSlab: async (data) => {
    try {
      const inserted = await db
        .insert(payHeadSlabLines)
        .values({
          payHeadId: data.pay_head_id,
          effectiveFrom: data.effective_from || null,
          amountGt: data.amount_gt || 0,
          amountUpTo: data.amount_up_to || 0,
          slabType: data.slab_type || null,
          value: data.value || 0,
        })
        .returning({ id: payHeadSlabLines.slabLineId });

      const rows = await db.all(
        sql`SELECT * FROM ${payHeadSlabLines} WHERE ${payHeadSlabLines.slabLineId} = ${inserted[0].id}`
      );
      return { success: true, slab: rows[0] };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  deleteSlab: async (id) => {
    try {
      await db.delete(payHeadSlabLines).where(eq(payHeadSlabLines.slabLineId, id));
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  getFormulas: async (pay_head_id) => {
    try {
      const rows = await db.all(
        sql`SELECT fl.*, ph.name as pay_head_name FROM ${payHeadFormulaLines} fl
            LEFT JOIN ${payHeads} ph ON fl.pay_head_id_ref = ph.pay_head_id
            WHERE fl.pay_head_id = ${pay_head_id} ORDER BY fl.sequence`
      );
      return { success: true, formulas: rows };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  createFormula: async (data) => {
    try {
      const inserted = await db
        .insert(payHeadFormulaLines)
        .values({
          payHeadId: data.pay_head_id,
          sequence: data.sequence || 0,
          function: data.function || null,
          payHeadIdRef: data.pay_head_id_ref || null,
          operator: data.operator || null,
        })
        .returning({ id: payHeadFormulaLines.formulaLineId });

      const rows = await db.all(
        sql`SELECT * FROM ${payHeadFormulaLines} WHERE ${payHeadFormulaLines.formulaLineId} = ${inserted[0].id}`
      );
      return { success: true, formula: rows[0] };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  deleteFormula: async (id) => {
    try {
      await db.delete(payHeadFormulaLines).where(eq(payHeadFormulaLines.formulaLineId, id));
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  getGratuitySlabs: async (pay_head_id) => {
    try {
      const rows = await db.all(
        sql`SELECT * FROM ${payHeadGratuitySlabs}
            WHERE ${payHeadGratuitySlabs.payHeadId} = ${pay_head_id}
            ORDER BY ${payHeadGratuitySlabs.monthsFrom}`
      );
      return { success: true, gratuitySlabs: rows };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  createGratuitySlab: async (data) => {
    try {
      const inserted = await db
        .insert(payHeadGratuitySlabs)
        .values({
          payHeadId: data.pay_head_id,
          monthsFrom: data.months_from ?? null,
          monthsTo: data.months_to ?? null,
          eligibilityDays: data.eligibility_days || 0,
        })
        .returning({ id: payHeadGratuitySlabs.gratuitySlabId });

      const rows = await db.all(
        sql`SELECT * FROM ${payHeadGratuitySlabs} WHERE ${payHeadGratuitySlabs.gratuitySlabId} = ${inserted[0].id}`
      );
      return { success: true, gratuitySlab: rows[0] };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  deleteGratuitySlab: async (id) => {
    try {
      await db.delete(payHeadGratuitySlabs).where(eq(payHeadGratuitySlabs.gratuitySlabId, id));
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },
};
