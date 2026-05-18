const { db } = require('../db/index');
const voucherService = require('../voucher/voucherService');

const getEntries = async (company_id, fy_id) => {
  const result = await db.execute(
    `SELECT e.*, v.date, v.voucher_type, v.voucher_number
     FROM voucher_entries e
     INNER JOIN vouchers v ON v.voucher_id = e.voucher_id
     WHERE v.company_id = ? AND v.fy_id = ? AND v.is_cancelled = 0`,
    [company_id, fy_id]
  );
  return result.rows;
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
      const ledgers = await db.execute(
        `SELECT * FROM ledgers WHERE company_id = ? AND is_active = 1`,
        [company_id]
      );

      const rows = ledgers.rows.map(l => {
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

      const ledgers = await db.execute(
        `SELECT l.*, g.nature FROM ledgers l
         INNER JOIN groups g ON g.group_id = l.group_id
         WHERE l.company_id = ? AND l.is_active = 1`,
        [company_id]
      );

      const getLedgersByNature = (nature) => ledgers.rows
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

      const ledgers = await db.execute(
        `SELECT l.*, g.nature FROM ledgers l
         INNER JOIN groups g ON g.group_id = l.group_id
         WHERE l.company_id = ? AND l.is_active = 1`,
        [company_id]
      );

      const getLedgersByNature = (nature) => ledgers.rows
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
      const ledger = await db.execute(
        `SELECT * FROM ledgers WHERE ledger_id = ?`,
        [ledger_id]
      );
      if (ledger.rows.length === 0) return { success: false, error: 'Ledger not found' };

      let query = `
        SELECT e.*, v.date, v.voucher_type, v.voucher_number, v.narration as voucher_narration
        FROM voucher_entries e
        INNER JOIN vouchers v ON v.voucher_id = e.voucher_id
        WHERE v.company_id = ? AND v.fy_id = ? AND e.ledger_id = ? AND v.is_cancelled = 0
      `;
      const params = [company_id, fy_id, ledger_id];

      if (from_date) { query += ` AND v.date >= ?`; params.push(from_date); }
      if (to_date)   { query += ` AND v.date <= ?`; params.push(to_date); }
      query += ` ORDER BY v.date ASC`;

      const result = await db.execute(query, params);

      let runningBalance = ledger.rows[0].opening_balance || 0;
      const rows = result.rows.map(e => {
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
        ledger_name: ledger.rows[0].name,
        opening_balance: ledger.rows[0].opening_balance || 0,
        rows,
        closing_balance: runningBalance,
      };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  cashBook: async (company_id, fy_id, from_date, to_date) => {
    try {
      const cashLedger = await db.execute(
        `SELECT * FROM ledgers WHERE company_id = ? AND ledger_type = 'Cash' AND is_active = 1 LIMIT 1`,
        [company_id]
      );
      if (cashLedger.rows.length === 0) return { success: false, error: 'Cash ledger not found' };

      return await module.exports.ledgerReport(
        company_id, fy_id, cashLedger.rows[0].ledger_id, from_date, to_date
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