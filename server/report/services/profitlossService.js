const { db } = require('../../db/index');
const { sql } = require('drizzle-orm');
const { voucherEntries, vouchers, ledgers, groups } = require('../../db/schema');

const getEntries = async (company_id, fy_id) => {
  return await db.all(
    sql`SELECT e.ledger_id, e.type, e.amount
        FROM ${voucherEntries} e
        INNER JOIN ${vouchers} v ON v.voucher_id = e.voucher_id
        WHERE v.company_id = ${company_id}
          AND v.fy_id      = ${fy_id}
          AND v.is_cancelled = 0
          AND COALESCE(v.is_optional,   0) = 0
          AND COALESCE(v.is_post_dated, 0) = 0`
  );
};

const calcLedgerBalance = (ledger_id, entries, opening_balance = 0, opening_balance_type = 'Dr') => {
  const rawOpening = Number(opening_balance) || 0;
  let balance = rawOpening < 0
    ? rawOpening
    : (opening_balance_type === 'Cr' ? -rawOpening : rawOpening);
  for (const e of entries) {
    if (e.ledger_id === ledger_id) {
      balance += e.type === 'Dr' ? Number(e.amount) : -Number(e.amount);
    }
  }
  return balance;
};

const profitLoss = async (company_id, fy_id) => {
  try {
    const entries = await getEntries(company_id, fy_id);

    const allGroups = await db.all(
      sql`SELECT group_id, name, nature, parent_group_id, sort_order, display_order
          FROM ${groups}
          WHERE company_id = ${company_id} AND is_active = 1
          ORDER BY display_order ASC`
    );

    const allLedgers = await db.all(
      sql`SELECT l.ledger_id, l.name AS ledger_name, l.opening_balance,
                 l.opening_balance_type, l.group_id
          FROM ${ledgers} l
          WHERE l.company_id = ${company_id} AND l.is_active = 1`
    );


    const ledgerBalances = {};
    for (const l of allLedgers) {
      ledgerBalances[l.ledger_id] = {
        ledger_id:   l.ledger_id,
        ledger_name: l.ledger_name,
        group_id:    l.group_id,
        balance:     calcLedgerBalance(
          l.ledger_id, entries,
          l.opening_balance || 0,
          l.opening_balance_type || 'Dr'
        ),
      };
    }


    const getRootNature = (group_id) => {
      let g = allGroups.find(x => x.group_id === group_id);
      while (g && g.parent_group_id) {
        g = allGroups.find(x => x.group_id === g.parent_group_id) || g;
      }
      return g ? g.nature : null;
    };

 
    const childrenOf = {};
    for (const g of allGroups) {
      if (!childrenOf[g.group_id]) childrenOf[g.group_id] = [];
      if (g.parent_group_id) {
        if (!childrenOf[g.parent_group_id]) childrenOf[g.parent_group_id] = [];
        childrenOf[g.parent_group_id].push(g.group_id);
      }
    }

    const getAllDescendants = (group_id) => {
      const result = new Set();
      const queue = [group_id];
      while (queue.length) {
        const cur = queue.shift();
        for (const child of (childrenOf[cur] || [])) {
          if (!result.has(child)) { result.add(child); queue.push(child); }
        }
      }
      return result;
    };

    const primaryGroups = allGroups.filter(g => g.parent_group_id === null);

    const buildGroupRow = (g) => {
      const relevantIds = new Set([g.group_id, ...getAllDescendants(g.group_id)]);
      let total = 0;
      const directLedgers = [];

      for (const l of Object.values(ledgerBalances)) {
        if (relevantIds.has(l.group_id)) total += l.balance;
        if (l.group_id === g.group_id && l.balance !== 0) {
          directLedgers.push({
            ledger_id:   l.ledger_id,
            ledger_name: l.ledger_name,
            balance:     l.balance,
          });
        }
      }

      const childGroups = allGroups
        .filter(cg => cg.parent_group_id === g.group_id)
        .map(cg => buildGroupRow(cg))
        .filter(cg => cg.balance !== 0);

      return {
        group_id:    g.group_id,
        group_name:  g.name,
        nature:      g.nature,
        balance:     total,
        ledgers:     directLedgers,
        childGroups,
      };
    };


    let openingStockValue = 0;
    let closingStockValue = 0;

    try {
      const osRows = await db.all(
        sql`SELECT COALESCE(SUM(opening_value), 0) AS total
            FROM stock_items
            WHERE company_id = ${company_id} AND is_active = 1`
      );
      openingStockValue = Number(osRows[0]?.total) || 0;


      const csRows = await db.all(
        sql`SELECT
              COALESCE(SUM(CASE WHEN ve.type = 'Dr' THEN ve.amount ELSE -ve.amount END), 0) AS net
            FROM voucher_entries ve
            INNER JOIN vouchers v ON v.voucher_id = ve.voucher_id
            INNER JOIN ledgers l  ON l.ledger_id  = ve.ledger_id
            INNER JOIN groups  g  ON g.group_id   = l.group_id
            WHERE v.company_id    = ${company_id}
              AND v.fy_id         = ${fy_id}
              AND v.is_cancelled  = 0
              AND g.nature        IN ('Assets')`
      );

      closingStockValue = openingStockValue; 
    } catch (_) {
      openingStockValue = 0;
      closingStockValue = 0;
    }
    const incomeGroups = primaryGroups
      .filter(g => g.nature === 'Income')
      .map(g => buildGroupRow(g))
      .filter(g => g.balance !== 0);

    const expenseGroups = primaryGroups
      .filter(g => g.nature === 'Expenses')
      .map(g => buildGroupRow(g))
      .filter(g => g.balance !== 0);

    const totalIncome = incomeGroups.reduce((s, g) => s + Math.abs(g.balance), 0);
    const totalExpenses = expenseGroups.reduce((s, g) => s + Math.abs(g.balance), 0);
    const netProfit = totalIncome - totalExpenses;
    const isProfit = netProfit >= 0;

    return {
      success:       true,
      income:        incomeGroups,
      expenses:      expenseGroups,
      totalIncome,
      totalExpenses,
      netProfit,
      isProfit,
      openingStock:  openingStockValue,
      closingStock:  closingStockValue,
    };

  } catch (err) {
    console.error('[profitLossService] error:', err);
    return { success: false, error: err.message };
  }
};

module.exports = { profitLoss };