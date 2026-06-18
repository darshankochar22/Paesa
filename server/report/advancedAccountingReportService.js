const { db } = require('../db/index');
const { sql } = require('drizzle-orm');
const { costCentres, voucherCostCentres, vouchers } = require('../db/schema');

module.exports = {
  costCentreReport: async (company_id, fy_id, as_on_date) => {
    try {
      const dateCond = as_on_date ? sql` AND v.date <= ${as_on_date}` : sql``;
      const rows = await db.all(
        sql`SELECT
              cc.name AS cost_centre,
              SUM(CASE WHEN v.type = 'Expense' THEN vcc.amount ELSE 0 END) AS expense,
              SUM(CASE WHEN v.type = 'Income' THEN vcc.amount ELSE 0 END) AS income
            FROM ${costCentres} cc
            LEFT JOIN ${voucherCostCentres} vcc ON vcc.cost_centre_id = cc.cc_id
            LEFT JOIN ${vouchers} v ON v.voucher_id = vcc.voucher_id
            WHERE cc.company_id = ${company_id} AND cc.is_active = 1
              AND (v.company_id IS NULL OR (v.company_id = ${company_id} AND v.fy_id = ${fy_id} AND v.is_cancelled = 0
              AND COALESCE(v.is_optional, 0) = 0 AND COALESCE(v.is_post_dated, 0) = 0${dateCond}))
            GROUP BY cc.cc_id, cc.name
            ORDER BY cc.name ASC`
      );
      
      const processed = rows.map(r => ({
        cost_centre: r.cost_centre,
        expense: Math.abs(r.expense || 0),
        income: Math.abs(r.income || 0),
        variance: Math.abs(r.income || 0) - Math.abs(r.expense || 0)
      }));

      return { success: true, rows: processed };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  budgetVsActual: async (company_id, fy_id) => {
    try {
      // Calculate Actuals for Ledgers in the given FY
      // Since budgets schema/UI isn't built yet, we default budget to 0
      const rows = await db.all(
        sql`SELECT 
              l.ledger_id,
              l.name AS ledger_name,
              g.name AS group_name,
              l.opening_balance,
              l.opening_balance_type,
              SUM(CASE WHEN ve.type = 'Debit' THEN ve.amount ELSE 0 END) as total_debit,
              SUM(CASE WHEN ve.type = 'Credit' THEN ve.amount ELSE 0 END) as total_credit
            FROM ledgers l
            LEFT JOIN groups g ON l.group_id = g.group_id
            LEFT JOIN voucher_entries ve ON ve.ledger_id = l.ledger_id
            LEFT JOIN vouchers v ON v.voucher_id = ve.voucher_id 
              AND v.company_id = ${company_id} 
              AND v.fy_id = ${fy_id} 
              AND v.is_cancelled = 0 
              AND COALESCE(v.is_optional, 0) = 0 
              AND COALESCE(v.is_post_dated, 0) = 0
            WHERE l.company_id = ${company_id}
            GROUP BY l.ledger_id, l.name, g.name, l.opening_balance, l.opening_balance_type
            ORDER BY g.name ASC, l.name ASC`
      );

      const processed = rows.map(r => {
        let closing = (r.opening_balance_type === 'Dr' ? r.opening_balance : -r.opening_balance) 
                      + (r.total_debit || 0) 
                      - (r.total_credit || 0);
        
        let actual = Math.abs(closing);
        let budget = 0; // Default until UI/Schema allows entry
        let variance = budget - actual;
        
        return {
          id: r.ledger_id,
          ledger_name: r.ledger_name,
          group_name: r.group_name,
          budget: budget,
          actual: actual,
          variance: variance,
          variance_percentage: budget === 0 ? (actual > 0 ? -100 : 0) : ((variance / budget) * 100)
        };
      });

      return { success: true, rows: processed };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }
};
