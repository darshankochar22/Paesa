const voucherService = require('./voucherService');
const ledgerService = require('./ledgerService');
const groupService = require('./groupService');

const getEntries = async (company_id, fy_id) => {
  const { vouchers } = await voucherService.getAll(company_id, fy_id);
  const entries = [];

  for (const v of vouchers) {
    const full = await voucherService.getById(v.id);
    if (full.success) {
      full.voucher.entries.forEach(e => {
        entries.push({ ...e, date: v.date, voucher_type: v.voucher_type });
      });
    }
  }
  return entries;
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
      const { ledgers } = await ledgerService.getAll(company_id);

      const rows = ledgers.map(l => {
        const balance = calcLedgerBalance(l.id, entries, l.opening_balance || 0);
        return {
          ledger_id: l.id,
          ledger_name: l.name,
          group_id: l.group_id,
          debit: balance > 0 ? balance : 0,
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
      const { ledgers } = await ledgerService.getAll(company_id);
      const { groups } = await groupService.getAll(company_id);

      const getLedgersByNature = (nature) => {
        return ledgers
          .filter(l => {
            const group = groups.find(g => g.id === l.group_id);
            return group && group.nature === nature;
          })
          .map(l => ({
            ledger_id: l.id,
            ledger_name: l.name,
            balance: calcLedgerBalance(l.id, entries, l.opening_balance || 0),
          }))
          .filter(l => l.balance !== 0);
      };

      const assets      = getLedgersByNature('Assets');
      const liabilities = getLedgersByNature('Liabilities');

      const totalAssets      = assets.reduce((s, l) => s + Math.abs(l.balance), 0);
      const totalLiabilities = liabilities.reduce((s, l) => s + Math.abs(l.balance), 0);

      return {
        success: true,
        assets,
        liabilities,
        totalAssets,
        totalLiabilities,
      };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  profitLoss: async (company_id, fy_id) => {
    try {
      const entries = await getEntries(company_id, fy_id);
      const { ledgers } = await ledgerService.getAll(company_id);
      const { groups } = await groupService.getAll(company_id);

      const getLedgersByNature = (nature) => {
        return ledgers
          .filter(l => {
            const group = groups.find(g => g.id === l.group_id);
            return group && group.nature === nature;
          })
          .map(l => ({
            ledger_id: l.id,
            ledger_name: l.name,
            balance: Math.abs(calcLedgerBalance(l.id, entries, l.opening_balance || 0)),
          }))
          .filter(l => l.balance !== 0);
      };

      const income   = getLedgersByNature('Income');
      const expenses = getLedgersByNature('Expenses');

      const totalIncome   = income.reduce((s, l) => s + l.balance, 0);
      const totalExpenses = expenses.reduce((s, l) => s + l.balance, 0);
      const netProfit     = totalIncome - totalExpenses;

      return {
        success: true,
        income,
        expenses,
        totalIncome,
        totalExpenses,
        netProfit,
        isProfit: netProfit >= 0,
      };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },


  ledgerReport: async (company_id, fy_id, ledger_id, from_date, to_date) => {
    try {
      const entries = await getEntries(company_id, fy_id);
      const { ledger } = await ledgerService.getById(ledger_id);
      if (!ledger) return { success: false, error: 'Ledger not found' };

      let filtered = entries.filter(e => e.ledger_id === ledger_id);
      if (from_date) filtered = filtered.filter(e => e.date >= from_date);
      if (to_date)   filtered = filtered.filter(e => e.date <= to_date);

      filtered.sort((a, b) => new Date(a.date) - new Date(b.date));

      let runningBalance = ledger.opening_balance || 0;
      const rows = filtered.map(e => {
        runningBalance += e.type === 'Dr' ? e.amount : -e.amount;
        return {
          date: e.date,
          voucher_type: e.voucher_type,
          ledger_id: e.ledger_id,
          debit: e.type === 'Dr' ? e.amount : 0,
          credit: e.type === 'Cr' ? e.amount : 0,
          balance: runningBalance,
          narration: e.narration,
        };
      });

      return {
        success: true,
        ledger_name: ledger.name,
        opening_balance: ledger.opening_balance || 0,
        rows,
        closing_balance: runningBalance,
      };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  cashBook: async (company_id, fy_id, from_date, to_date) => {
    try {
      const { ledgers } = await ledgerService.getAll(company_id);
      const cashLedger = ledgers.find(l => l.ledger_type === 'Cash' && l.company_id === company_id);
      if (!cashLedger) return { success: false, error: 'Cash ledger not found' };

      return await module.exports.ledgerReport(company_id, fy_id, cashLedger.id, from_date, to_date);
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
      const { vouchers } = await voucherService.getDaybook(
        company_id, fy_id, from_date, to_date
      );

      const result = [];
      for (const v of vouchers) {
        const full = await voucherService.getById(v.id);
        if (full.success) result.push(full.voucher);
      }

      return { success: true, vouchers: result };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },
};