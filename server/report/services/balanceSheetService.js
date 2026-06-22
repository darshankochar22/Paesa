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

const buildDescendantMap = (allGroups) => {
  const childrenMap = {};
  for (const g of allGroups) {
    if (!childrenMap[g.group_id]) childrenMap[g.group_id] = [];
    if (g.parent_group_id) {
      if (!childrenMap[g.parent_group_id]) childrenMap[g.parent_group_id] = [];
      childrenMap[g.parent_group_id].push(g.group_id);
    }
  }


  const getAllDescendants = (group_id) => {
    const result = new Set();
    const queue = [group_id];
    while (queue.length) {
      const current = queue.shift();
      const children = childrenMap[current] || [];
      for (const child of children) {
        if (!result.has(child)) {
          result.add(child);
          queue.push(child);
        }
      }
    }
    return result;
  };

  const descendantMap = {};
  for (const g of allGroups) {
    descendantMap[g.group_id] = getAllDescendants(g.group_id);
  }
  return descendantMap;
};


const balanceSheet = async (company_id, fy_id) => {
  try {
    const entries = await getEntries(company_id, fy_id);
    const allGroups = await db.all(
    sql`SELECT group_id, name, nature, parent_group_id, sort_order, display_order
      FROM ${groups}
      WHERE company_id = ${company_id} AND is_active = 1
      ORDER BY display_order ASC`
    );


    const allLedgers = await db.all(
      sql`SELECT l.ledger_id, l.name AS ledger_name, l.opening_balance, l.opening_balance_type, l.group_id
          FROM ${ledgers} l
          WHERE l.company_id = ${company_id} AND l.is_active = 1`
    );

    const ledgerBalances = {};
    for (const l of allLedgers) {
      ledgerBalances[l.ledger_id] = {
        ledger_id:    l.ledger_id,
        ledger_name:  l.ledger_name,
        group_id:     l.group_id,
        balance:      calcLedgerBalance(l.ledger_id, entries, l.opening_balance || 0, l.opening_balance_type || 'Dr'),
      };
    }

    const descendantMap = buildDescendantMap(allGroups);

    const groupBalances = {};
    for (const g of allGroups) {
      const relevantGroupIds = new Set([g.group_id, ...descendantMap[g.group_id]]);
      let total = 0;
      const directLedgers = [];

      for (const l of Object.values(ledgerBalances)) {
        if (relevantGroupIds.has(l.group_id)) {
          total += l.balance;
        }
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
        .map(cg => ({
          group_id:   cg.group_id,
          group_name: cg.name,
          balance:    groupBalances[cg.group_id]?.balance || 0, 
        }));

      groupBalances[g.group_id] = {
        group_id:     g.group_id,
        group_name:   g.name,
        nature:       g.nature,
        balance:      total,
        ledgers:      directLedgers,
        childGroups, 
      };
    }


    for (const g of allGroups) {
      groupBalances[g.group_id].childGroups = allGroups
        .filter(cg => cg.parent_group_id === g.group_id)
        .filter(cg => groupBalances[cg.group_id]?.balance !== 0)
        .map(cg => ({
          group_id:    cg.group_id,
          group_name:  cg.name,
          balance:     groupBalances[cg.group_id].balance,
          ledgers:     groupBalances[cg.group_id].ledgers,
          childGroups: groupBalances[cg.group_id].childGroups,
        }));
    }

    const incomeNatures  = ['Income'];
    const expenseNatures = ['Expenses'];
    let totalIncome   = 0;
    let totalExpenses = 0;
    for (const g of Object.values(groupBalances)) {
      if (incomeNatures.includes(g.nature)  && g.parent_group_id === undefined) {
      }
    }

    for (const l of Object.values(ledgerBalances)) {
      const g = allGroups.find(gr => gr.group_id === l.group_id);
      if (!g) continue;
      let rootGroup = g;
      while (rootGroup.parent_group_id) {
        rootGroup = allGroups.find(gr => gr.group_id === rootGroup.parent_group_id) || rootGroup;
      }
      if (rootGroup.nature === 'Income')   totalIncome   += l.balance;
      if (rootGroup.nature === 'Expenses') totalExpenses += Math.abs(l.balance);
    }
    const netProfit = totalIncome - totalExpenses;
    const primaryGroups = allGroups.filter(g => g.parent_group_id === null);

    const assets = primaryGroups
      .filter(g => g.nature === 'Assets')
      .map(g => groupBalances[g.group_id])
      .filter(g => g.balance !== 0);

    const liabilities = primaryGroups
      .filter(g => g.nature === 'Liabilities')
      .map(g => groupBalances[g.group_id])
      .filter(g => g.balance !== 0);

    if (netProfit !== 0) {
      const pnlEntry = {
        group_id:    -1,
        group_name:  netProfit >= 0 ? 'Profit & Loss A/c' : 'Profit & Loss A/c (Loss)',
        nature:      netProfit >= 0 ? 'Liabilities' : 'Assets',
        balance:     netProfit,
        ledgers:     [],
        childGroups: [],
        isPnL:       true,
      };
      if (netProfit >= 0) {
        liabilities.push(pnlEntry);
      } else {
        assets.push(pnlEntry);
      }
    }

    const totalAssets      = assets.reduce((s, g) => s + Math.abs(g.balance), 0);
    const totalLiabilities = liabilities.reduce((s, g) => s + Math.abs(g.balance), 0);
    return {
      success: true,
      assets,
      liabilities,
      totalAssets,
      totalLiabilities,
      netProfit,
    };

  } catch (err) {
    console.error('[balanceSheetService] error:', err);
    return { success: false, error: err.message };
  }
};

module.exports = { balanceSheet };