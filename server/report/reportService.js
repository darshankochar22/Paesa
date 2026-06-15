const { db } = require('../db/index');
const { sql } = require('drizzle-orm');
const { voucherEntries, vouchers, ledgers, groups } = require('../db/schema');
const voucherService = require('../voucher/voucherService');

const getEntries = async (company_id, fy_id) => {
  const rows = await db.all(
    sql`SELECT e.*, v.date, v.voucher_type, v.voucher_number
        FROM ${voucherEntries} e
        INNER JOIN ${vouchers} v ON v.voucher_id = e.voucher_id
        WHERE v.company_id = ${company_id} AND v.fy_id = ${fy_id} AND v.is_cancelled = 0`
  );
  return rows;
};

const calcLedgerBalance = (ledger_id, entries, opening_balance = 0) => {
  let balance = opening_balance;
  entries
    .filter(e => e.ledger_id === ledger_id)
    .forEach(e => {
      balance += e.type === 'Dr' ? e.amount : -e.amount;
    });
  return balance;
};

module.exports = {
  trialBalance: async (company_id, fy_id) => {
    try {
      const entries = await getEntries(company_id, fy_id);
      const ledgerRows = await db.all(
        sql`SELECT * FROM ${ledgers}
            WHERE ${ledgers.companyId} = ${company_id} AND ${ledgers.isActive} = 1`
      );

      const rows = ledgerRows.map(l => {
        const balance = calcLedgerBalance(l.ledger_id, entries, l.opening_balance || 0);
        return {
          ledger_id: l.ledger_id,
          ledger_name: l.name,
          group_id: l.group_id,
          debit:  balance > 0 ? balance : 0,
          credit: balance < 0 ? Math.abs(balance) : 0,
        };
      }).filter(r => r.debit !== 0 || r.credit !== 0);

      const totalDebit  = rows.reduce((s, r) => s + r.debit, 0);
      const totalCredit = rows.reduce((s, r) => s + r.credit, 0);

      return { success: true, rows, totalDebit, totalCredit };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  balanceSheet: async (company_id, fy_id) => {
    try {
      const entries = await getEntries(company_id, fy_id);

      const ledgerRows = await db.all(
        sql`SELECT l.*, g.nature FROM ${ledgers} l
            INNER JOIN ${groups} g ON g.group_id = l.group_id
            WHERE l.company_id = ${company_id} AND l.is_active = 1`
      );

      const getLedgersByNature = (nature) => ledgerRows
        .filter(l => l.nature === nature)
        .map(l => ({
          ledger_id: l.ledger_id,
          ledger_name: l.name,
          balance: calcLedgerBalance(l.ledger_id, entries, l.opening_balance || 0),
        }))
        .filter(l => l.balance !== 0);

      const assets      = getLedgersByNature('Assets');
      const liabilities = getLedgersByNature('Liabilities');

      const totalAssets      = assets.reduce((s, l) => s + Math.abs(l.balance), 0);
      const totalLiabilities = liabilities.reduce((s, l) => s + Math.abs(l.balance), 0);

      return { success: true, assets, liabilities, totalAssets, totalLiabilities };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  profitLoss: async (company_id, fy_id) => {
    try {
      const entries = await getEntries(company_id, fy_id);

      const ledgerRows = await db.all(
        sql`SELECT l.*, g.nature FROM ${ledgers} l
            INNER JOIN ${groups} g ON g.group_id = l.group_id
            WHERE l.company_id = ${company_id} AND l.is_active = 1`
      );

      const getLedgersByNature = (nature) => ledgerRows
        .filter(l => l.nature === nature)
        .map(l => ({
          ledger_id: l.ledger_id,
          ledger_name: l.name,
          balance: Math.abs(calcLedgerBalance(l.ledger_id, entries, l.opening_balance || 0)),
        }))
        .filter(l => l.balance !== 0);

      const income   = getLedgersByNature('Income');
      const expenses = getLedgersByNature('Expenses');

      const totalIncome   = income.reduce((s, l) => s + l.balance, 0);
      const totalExpenses = expenses.reduce((s, l) => s + l.balance, 0);
      const netProfit     = totalIncome - totalExpenses;

      return {
        success: true,
        income, expenses,
        totalIncome, totalExpenses,
        netProfit, isProfit: netProfit >= 0,
      };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  ledgerReport: async (company_id, fy_id, ledger_id, from_date, to_date) => {
    try {
      const ledgerRows = await db.all(
        sql`SELECT * FROM ${ledgers} WHERE ${ledgers.ledgerId} = ${ledger_id}`
      );
      if (ledgerRows.length === 0) return { success: false, error: 'Ledger not found' };

      // Build the entry query with optional date bounds, mirroring the legacy
      // conditional WHERE clauses. sql.join lets us append predicates only when
      // the corresponding date filter is supplied.
      const conditions = [
        sql`v.company_id = ${company_id}`,
        sql`v.fy_id = ${fy_id}`,
        sql`e.ledger_id = ${ledger_id}`,
        sql`v.is_cancelled = 0`,
      ];
      if (from_date) conditions.push(sql`v.date >= ${from_date}`);
      if (to_date)   conditions.push(sql`v.date <= ${to_date}`);

      const result = await db.all(
        sql`SELECT e.*, v.date, v.voucher_type, v.voucher_number, v.narration as voucher_narration
            FROM ${voucherEntries} e
            INNER JOIN ${vouchers} v ON v.voucher_id = e.voucher_id
            WHERE ${sql.join(conditions, sql` AND `)}
            ORDER BY v.date ASC`
      );

      let runningBalance = ledgerRows[0].opening_balance || 0;
      const rows = result.map(e => {
        runningBalance += e.type === 'Dr' ? e.amount : -e.amount;
        return {
          date: e.date,
          voucher_type: e.voucher_type,
          voucher_number: e.voucher_number,
          debit:  e.type === 'Dr' ? e.amount : 0,
          credit: e.type === 'Cr' ? e.amount : 0,
          balance: runningBalance,
          narration: e.narration || e.voucher_narration,
        };
      });

      return {
        success: true,
        ledger_name: ledgerRows[0].name,
        opening_balance: ledgerRows[0].opening_balance || 0,
        rows,
        closing_balance: runningBalance,
      };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  cashBook: async (company_id, fy_id, from_date, to_date) => {
    try {
      const cashLedger = await db.all(
        sql`SELECT * FROM ${ledgers}
            WHERE ${ledgers.companyId} = ${company_id}
              AND ${ledgers.ledgerType} = 'Cash'
              AND ${ledgers.isActive} = 1
            LIMIT 1`
      );
      if (cashLedger.length === 0) return { success: false, error: 'Cash ledger not found' };

      return await module.exports.ledgerReport(
        company_id, fy_id, cashLedger[0].ledger_id, from_date, to_date
      );
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  bankBook: async (company_id, fy_id, ledger_id, from_date, to_date) => {
    try {
      return await module.exports.ledgerReport(company_id, fy_id, ledger_id, from_date, to_date);
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  daybook: async (company_id, fy_id, from_date, to_date) => {
    try {
      const { vouchers } = await voucherService.getDaybook(company_id, fy_id, from_date, to_date);

      const result = [];
      for (const v of vouchers) {
        const full = await voucherService.getById(v.voucher_id);
        if (full.success) result.push(full.voucher);
      }

      return { success: true, vouchers: result };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },
};
