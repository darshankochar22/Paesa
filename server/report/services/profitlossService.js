const { db } = require('../../db/index');
const { sql } = require('drizzle-orm');
const { voucherEntries, vouchers, ledgers, groups } = require('../../db/schema');
const { calculateClosingStock } = require('../stockValuationEngine');

/* ── reused helpers (same as balanceSheetService) ────────────────────── */

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
      for (const child of (childrenMap[current] || [])) {
        if (!result.has(child)) { result.add(child); queue.push(child); }
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

/**
 * Map a primary group name → P&L bucket.
 * Uses substring matching to handle variations in user-defined group names.
 * Priority: more specific matches checked first.
 */
const getPnLCategory = (name) => {
  if (!name) return null;
  const n = name.toLowerCase().trim();

  // More specific first (indirect before direct)
  if (n.includes('indirect expense'))  return 'indirectExpenses';
  if (n.includes('indirect income'))   return 'indirectIncomes';
  if (n.includes('direct expense'))    return 'directExpenses';
  if (n.includes('direct income'))     return 'directIncomes';
  if (n.includes('purchase'))          return 'purchaseAccounts';
  if (n.includes('sales'))             return 'salesAccounts';

  return null;
};

/* ── main function ───────────────────────────────────────────────────── */

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

    /* Build ledger balances */
    const ledgerBalances = {};
    for (const l of allLedgers) {
      ledgerBalances[l.ledger_id] = {
        ledger_id:   l.ledger_id,
        ledger_name: l.ledger_name,
        group_id:    l.group_id,
        balance:     calcLedgerBalance(l.ledger_id, entries, l.opening_balance || 0, l.opening_balance_type || 'Dr'),
      };
    }

    const descendantMap = buildDescendantMap(allGroups);

    /* Build groupBalances — identical pattern to balanceSheetService */
    const groupBalances = {};
    for (const g of allGroups) {
      const relevantGroupIds = new Set([g.group_id, ...descendantMap[g.group_id]]);
      let total = 0;
      const directLedgers = [];

      for (const l of Object.values(ledgerBalances)) {
        if (relevantGroupIds.has(l.group_id)) total += l.balance;
        if (l.group_id === g.group_id && l.balance !== 0) {
          directLedgers.push({ ledger_id: l.ledger_id, ledger_name: l.ledger_name, balance: l.balance });
        }
      }

      groupBalances[g.group_id] = {
        group_id:    g.group_id,
        group_name:  g.name,
        nature:      g.nature,
        balance:     total,
        ledgers:     directLedgers,
        childGroups: [],
      };
    }

    /* Wire up childGroups (with full subtree data) */
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

    /* Identify primary groups (parent_group_id is null OR undefined/falsy for predefined roots) */
    const primaryGroups = allGroups.filter(g => !g.parent_group_id);

    /* Categorize into 6 P&L buckets */
    const buckets = {
      purchaseAccounts: [],
      directExpenses:   [],
      indirectExpenses: [],
      salesAccounts:    [],
      directIncomes:    [],
      indirectIncomes:  [],
    };

    for (const pg of primaryGroups) {
      const category = getPnLCategory(pg.name);
      if (!category) continue;
      const row = groupBalances[pg.group_id];
      if (!row) continue;
      if (row.balance !== 0 || row.ledgers.length > 0 || row.childGroups.length > 0) {
        buckets[category].push(row);
      }
    }

    /* Totals — use Math.abs since expense ledgers have Dr (+) balance,
       income ledgers have Cr (-) balance in our sign convention */
    const totalPurchase         = Math.abs(buckets.purchaseAccounts.reduce((s, g) => s + g.balance, 0));
    const totalDirectExpenses   = Math.abs(buckets.directExpenses.reduce((s, g)   => s + g.balance, 0));
    const totalIndirectExpenses = Math.abs(buckets.indirectExpenses.reduce((s, g) => s + g.balance, 0));
    const totalSales            = Math.abs(buckets.salesAccounts.reduce((s, g)    => s + g.balance, 0));
    const totalDirectIncomes    = Math.abs(buckets.directIncomes.reduce((s, g)    => s + g.balance, 0));
    const totalIndirectIncomes  = Math.abs(buckets.indirectIncomes.reduce((s, g)  => s + g.balance, 0));

    /* Opening / Closing Stock
       Opening stock = sum of each stock item's opening_value.
       Closing stock = real valuation using inward/outward movements
       (same engine used by Stock Summary), NOT just equal to opening. */
    let openingStockValue = 0;
    let closingStockValue = 0;
    try {
      const osRows = await db.all(
        sql`SELECT COALESCE(SUM(opening_value), 0) AS total
            FROM stock_items
            WHERE company_id = ${company_id} AND is_active = 1`
      );
      openingStockValue = Number(osRows[0]?.total) || 0;

      const valuation = await calculateClosingStock(company_id, fy_id);
      closingStockValue = valuation.success
        ? Number(valuation.totalValue) || 0
        : openingStockValue; // fallback if valuation fails (e.g. no stock module set up)
    } catch (_) { /* no stock_items table or no data */ }

    /* Gross profit calculation */
    const tradingCredit = totalSales + totalDirectIncomes + closingStockValue;
    const tradingDebit  = openingStockValue + totalPurchase + totalDirectExpenses;
    const grossProfit   = tradingCredit - tradingDebit;
    const isGrossProfit = grossProfit >= 0;

    /* Net profit calculation */
    const netProfit = grossProfit + totalIndirectIncomes - totalIndirectExpenses;
    const isProfit  = netProfit >= 0;

    return {
      success: true,

      openingStock: openingStockValue,
      closingStock:  closingStockValue,

      purchaseAccounts:       buckets.purchaseAccounts,
      totalPurchase,
      directExpenses:         buckets.directExpenses,
      totalDirectExpenses,
      indirectExpenses:       buckets.indirectExpenses,
      totalIndirectExpenses,

      salesAccounts:          buckets.salesAccounts,
      totalSales,
      directIncomes:          buckets.directIncomes,
      totalDirectIncomes,
      indirectIncomes:        buckets.indirectIncomes,
      totalIndirectIncomes,

      grossProfit,
      isGrossProfit,
      netProfit,
      isProfit,

      /* backward-compat for profit_loss.js definition */
      income:        buckets.salesAccounts,
      expenses:      buckets.purchaseAccounts,
      totalIncome:   totalSales,
      totalExpenses: totalPurchase,
    };

  } catch (err) {
    console.error('[profitLossService] error:', err);
    return { success: false, error: err.message };
  }
};

module.exports = { profitLoss };