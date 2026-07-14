const { db } = require('../../db/index');
const { sql } = require('drizzle-orm');
const { voucherEntries, vouchers, ledgers, groups } = require('../../db/schema');
const { getOpeningBalances } = require('../utils/ledgerBalance');
const { calculateClosingStock } = require('../stockValuationEngine');
const { isFeatureEnabled } = require('../../tallyFeatures/featureFlags');

const getEntries = async (company_id, fy_id) => {
  return await db.all(
    sql`SELECT e.ledger_id, e.type, e.amount
        FROM ${voucherEntries} e
        INNER JOIN ${vouchers} v ON v.voucher_id = e.voucher_id
        WHERE v.company_id = ${company_id}
          AND v.fy_id      = ${fy_id}
          AND v.is_cancelled = 0
          AND COALESCE(v.is_optional,   0) = 0
          AND COALESCE(v.is_post_dated, 0) = 0`,
  );
};

// Balance from a pre-computed (carry-forward) opening seed + this year's entries.
const calcFromOpening = (ledger_id, entries, openingSeed = 0) => {
  let balance = openingSeed;
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
    const { openings, plLedgerId } = await getOpeningBalances(company_id, fy_id);
    const allGroups = await db.all(
      sql`SELECT group_id, name, nature, parent_group_id, sort_order, display_order
      FROM ${groups}
      WHERE company_id = ${company_id} AND is_active = 1
      ORDER BY display_order ASC`,
    );

    const allLedgers = await db.all(
      sql`SELECT l.ledger_id, l.name AS ledger_name, l.opening_balance, l.opening_balance_type, l.group_id
          FROM ${ledgers} l
          WHERE l.company_id = ${company_id} AND l.is_active = 1`,
    );

    // The "Profit & Loss A/c" ledger is presented as a single dedicated line
    // (brought-forward opening + current-year profit), so it is excluded from the
    // normal group rollup to avoid showing it twice under Capital Account.
    const ledgerBalances = {};
    for (const l of allLedgers) {
      if (plLedgerId != null && l.ledger_id === plLedgerId) continue;
      ledgerBalances[l.ledger_id] = {
        ledger_id: l.ledger_id,
        ledger_name: l.ledger_name,
        group_id: l.group_id,
        balance: calcFromOpening(l.ledger_id, entries, openings[l.ledger_id] || 0),
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
            ledger_id: l.ledger_id,
            ledger_name: l.ledger_name,
            balance: l.balance,
          });
        }
      }

      const childGroups = allGroups
        .filter((cg) => cg.parent_group_id === g.group_id)
        .map((cg) => ({
          group_id: cg.group_id,
          group_name: cg.name,
          balance: groupBalances[cg.group_id]?.balance || 0,
        }));

      groupBalances[g.group_id] = {
        group_id: g.group_id,
        group_name: g.name,
        nature: g.nature,
        balance: total,
        ledgers: directLedgers,
        childGroups,
      };
    }

    for (const g of allGroups) {
      groupBalances[g.group_id].childGroups = allGroups
        .filter((cg) => cg.parent_group_id === g.group_id)
        .filter((cg) => groupBalances[cg.group_id]?.balance !== 0)
        .map((cg) => ({
          group_id: cg.group_id,
          group_name: cg.name,
          balance: groupBalances[cg.group_id].balance,
          ledgers: groupBalances[cg.group_id].ledgers,
          childGroups: groupBalances[cg.group_id].childGroups,
        }));
    }

    // Net profit = |Income| − |Expenses| across every P&L ledger, bucketed by its
    // root group's nature. Income ledgers carry Cr (negative) balances and expenses
    // Dr (positive), so take the absolute value of each — otherwise the signed
    // income drags netProfit negative and the sheet fails to balance.
    let totalIncome = 0;
    let totalExpenses = 0;
    for (const l of Object.values(ledgerBalances)) {
      const g = allGroups.find((gr) => gr.group_id === l.group_id);
      if (!g) continue;
      let rootGroup = g;
      while (rootGroup.parent_group_id) {
        rootGroup = allGroups.find((gr) => gr.group_id === rootGroup.parent_group_id) || rootGroup;
      }
      if (rootGroup.nature === 'Income') totalIncome += Math.abs(l.balance);
      if (rootGroup.nature === 'Expenses') totalExpenses += Math.abs(l.balance);
    }
    // F11 "Integrate Accounts with Inventory": when ON, the closing stock valued
    // from inventory flows onto the sheet as a Current Asset AND lifts profit by
    // the same amount (the standard Dr Closing Stock / Cr Trading entry), so the
    // sheet stays balanced and its profit matches the (also-integrated) P&L. When
    // OFF, accounts and inventory are separate — stock shows only via any manual
    // Stock-in-Hand ledger, exactly as before.
    const integrateInventory = await isFeatureEnabled(
      company_id,
      'integrate_accounts_with_inventory',
    );
    let closingStockValue = 0;
    if (integrateInventory) {
      try {
        const valuation = await calculateClosingStock(company_id, fy_id);
        closingStockValue = valuation.success ? Number(valuation.totalValue) || 0 : 0;
      } catch (_) {
        /* no stock module / no data */
      }
    }

    const netProfit = totalIncome - totalExpenses + closingStockValue;
    const primaryGroups = allGroups.filter((g) => g.parent_group_id === null);

    const assets = primaryGroups
      .filter((g) => g.nature === 'Assets')
      .map((g) => groupBalances[g.group_id])
      .filter((g) => g.balance !== 0);

    // Closing stock as a distinct Current Asset line (Tally shows it separately).
    if (Math.abs(closingStockValue) >= 0.01) {
      assets.push({
        group_id: -3,
        group_name: 'Closing Stock',
        nature: 'Assets',
        balance: closingStockValue,
        ledgers: [],
        childGroups: [],
        isClosingStock: true,
      });
    }

    const liabilities = primaryGroups
      .filter((g) => g.nature === 'Liabilities')
      .map((g) => groupBalances[g.group_id])
      .filter((g) => g.balance !== 0);

    // Tally shows the P&L A/c on the sheet as "Opening Balance" (profit/loss
    // brought forward from prior years — the carried opening of the P&L A/c
    // ledger, i.e. retained earnings) plus "Current Period" (this year's net
    // profit from vouchers). broughtForward is signed (Cr = accumulated profit,
    // negative); displayed as a positive liability it is its negation.
    const broughtForward = plLedgerId != null ? openings[plLedgerId] || 0 : 0;
    const pnlOpeningDisplayed = -broughtForward;
    const pnlTotal = pnlOpeningDisplayed + netProfit;
    if (Math.abs(pnlTotal) >= 0.01) {
      const pnlEntry = {
        group_id: -1,
        group_name: pnlTotal >= 0 ? 'Profit & Loss A/c' : 'Profit & Loss A/c (Loss)',
        nature: pnlTotal >= 0 ? 'Liabilities' : 'Assets',
        balance: pnlTotal,
        ledgers: [],
        childGroups: [],
        isPnL: true,
        pnlBreakup: {
          openingBalance: pnlOpeningDisplayed,
          currentPeriod: netProfit,
        },
      };
      if (pnlTotal >= 0) {
        liabilities.push(pnlEntry);
      } else {
        assets.push(pnlEntry);
      }
    }

    let totalAssets = assets.reduce((s, g) => s + Math.abs(g.balance), 0);
    let totalLiabilities = liabilities.reduce((s, g) => s + Math.abs(g.balance), 0);

    // Vouchers always balance, so any remaining gap is opening balances that don't
    // self-tally. Tally closes it with a "Difference in opening balances" line on the
    // deficient side so both totals match — otherwise the sheet looks broken.
    const openingDiff = totalLiabilities - totalAssets;
    if (Math.abs(openingDiff) >= 0.01) {
      const onAssetsSide = openingDiff > 0; // liabilities heavier ⇒ assets are short
      const diffEntry = {
        group_id: -2,
        group_name: 'Difference in opening balances',
        nature: onAssetsSide ? 'Assets' : 'Liabilities',
        balance: Math.abs(openingDiff),
        ledgers: [],
        childGroups: [],
        isDifference: true,
      };
      if (onAssetsSide) {
        assets.push(diffEntry);
        totalAssets += Math.abs(openingDiff);
      } else {
        liabilities.push(diffEntry);
        totalLiabilities += Math.abs(openingDiff);
      }
    }

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
