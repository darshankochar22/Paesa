const { db } = require('../../db/index');
const { sql } = require('drizzle-orm');
const { voucherEntries, vouchers, ledgers, groups } = require('../../db/schema');
const { getOpeningBalances } = require('../utils/ledgerBalance');
const { isFeatureEnabled } = require('../../tallyFeatures/featureFlags');
const { calculateClosingStock } = require('../stockValuationEngine');

// Closing stock value (inventory valued as-of the period), shown as a
// Current-Asset debit only when F11 "Integrate Accounts with Inventory" is ON.
// This is what Tally shows in the Current Assets group ("Closing Stock"), not
// the opening figure. Returns 0 when integration is off or valuation fails.
const getClosingStockValue = async (company_id, fy_id) => {
  try {
    const on = await isFeatureEnabled(company_id, 'integrate_accounts_with_inventory');
    if (!on) return 0;
    const res = await calculateClosingStock(company_id, fy_id, null);
    return res && res.success ? Number(res.totalValue) || 0 : 0;
  } catch (_) {
    return 0;
  }
};

// Opening stock value for the full FY (= Σ stock-item opening values), shown as
// a Current-Asset debit only when F11 "Integrate Accounts with Inventory" is ON.
// When OFF, accounts and inventory are separate and stock appears solely via any
// manual Stock-in-hand ledger — so we contribute nothing.
const getOpeningStockValue = async (company_id) => {
  try {
    const on = await isFeatureEnabled(company_id, 'integrate_accounts_with_inventory');
    if (!on) return 0;
    const rows = await db.all(
      sql`SELECT COALESCE(SUM(opening_value), 0) AS total
          FROM stock_items
          WHERE company_id = ${company_id} AND is_active = 1`,
    );
    return Number(rows[0]?.total) || 0;
  } catch (_) {
    return 0; // no stock module / no data
  }
};

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
      for (const child of childrenMap[current] || []) {
        if (!result.has(child)) {
          result.add(child);
          queue.push(child);
        }
      }
    }
    return result;
  };
  const descendantMap = {};
  for (const g of allGroups) descendantMap[g.group_id] = getAllDescendants(g.group_id);
  return descendantMap;
};

// Returns { dr, cr } — positive balance = Dr, negative = Cr
const splitDrCr = (balance) =>
  balance >= 0 ? { dr: balance, cr: 0 } : { dr: 0, cr: Math.abs(balance) };

// ── trialBalance — top-level groups only ──────────────────────────────────

const trialBalance = async (company_id, fy_id) => {
  try {
    const entries = await getEntries(company_id, fy_id);
    const { openings } = await getOpeningBalances(company_id, fy_id);

    const allGroups = await db.all(
      sql`SELECT group_id, name, nature, parent_group_id, display_order
          FROM ${groups}
          WHERE company_id = ${company_id} AND is_active = 1
          ORDER BY display_order ASC`,
    );

    const allLedgers = await db.all(
      sql`SELECT ledger_id, name AS ledger_name, opening_balance, opening_balance_type, group_id
          FROM ${ledgers}
          WHERE company_id = ${company_id} AND is_active = 1`,
    );

    // Per-ledger net balance — opening carried forward from prior years.
    const ledgerBalances = {};
    for (const l of allLedgers) {
      let balance = openings[l.ledger_id] || 0;
      for (const e of entries) {
        if (e.ledger_id === l.ledger_id)
          balance += e.type === 'Dr' ? Number(e.amount) : -Number(e.amount);
      }
      ledgerBalances[l.ledger_id] = {
        ledger_id: l.ledger_id,
        ledger_name: l.ledger_name,
        group_id: l.group_id,
        balance,
      };
    }

    const descendantMap = buildDescendantMap(allGroups);

    // Per-group Dr/Cr totals — sum each ledger's net balance into its own column
    // (like Tally), NOT one netted figure. A group holding both Dr and Cr ledgers
    // (e.g. Current Assets = debtors Dr + an advance-received Cr) must show both.
    const groupBalances = {};
    for (const g of allGroups) {
      const relevantIds = new Set([g.group_id, ...descendantMap[g.group_id]]);
      let dr = 0;
      let cr = 0;
      for (const l of Object.values(ledgerBalances)) {
        if (relevantIds.has(l.group_id)) {
          if (l.balance >= 0) dr += l.balance;
          else cr += Math.abs(l.balance);
        }
      }
      groupBalances[g.group_id] = { dr, cr };
    }

    // Opening Stock (inventory) folds into the Current Assets primary group as a
    // debit — Tally shows it there when Accounts are integrated with Inventory.
    const openingStock = await getOpeningStockValue(company_id);

    // Top-level groups only (parent_group_id === null), skip zero
    const primaryGroups = allGroups
      .filter((g) => g.parent_group_id === null)
      .map((g) => {
        let { dr, cr } = groupBalances[g.group_id] || { dr: 0, cr: 0 };
        if (openingStock !== 0 && g.name === 'Current Assets') dr += openingStock;
        return { group_id: g.group_id, group_name: g.name, nature: g.nature, dr, cr };
      })
      .filter((g) => g.dr !== 0 || g.cr !== 0);

    const grandTotalDr = primaryGroups.reduce((s, g) => s + g.dr, 0);
    const grandTotalCr = primaryGroups.reduce((s, g) => s + g.cr, 0);

    // Difference in opening balances — vouchers always balance, so any residual
    // gap between the columns is unbalanced opening balances (incl. opening
    // stock). Fill the lighter side so the grand total tallies (matches Tally).
    const imbalance = grandTotalDr - grandTotalCr;
    const diff = imbalance >= 0 ? { dr: 0, cr: imbalance } : { dr: -imbalance, cr: 0 };

    return { success: true, groups: primaryGroups, grandTotalDr, grandTotalCr, diff };
  } catch (err) {
    console.error('[trialBalanceService] error:', err);
    return { success: false, error: err.message };
  }
};

// ── groupSummary — subgroups + ledgers inside a top-level group ───────────

const groupSummary = async (company_id, fy_id, group_id) => {
  try {
    const entries = await getEntries(company_id, fy_id);
    const { openings } = await getOpeningBalances(company_id, fy_id);

    const allGroups = await db.all(
      sql`SELECT group_id, name, nature, parent_group_id, display_order
          FROM ${groups}
          WHERE company_id = ${company_id} AND is_active = 1
          ORDER BY display_order ASC`,
    );

    const allLedgers = await db.all(
      sql`SELECT ledger_id, name AS ledger_name, opening_balance, opening_balance_type, group_id
          FROM ${ledgers}
          WHERE company_id = ${company_id} AND is_active = 1`,
    );

    const ledgerBalances = {};
    for (const l of allLedgers) {
      let balance = openings[l.ledger_id] || 0;
      for (const e of entries) {
        if (e.ledger_id === l.ledger_id)
          balance += e.type === 'Dr' ? Number(e.amount) : -Number(e.amount);
      }
      ledgerBalances[l.ledger_id] = {
        ledger_id: l.ledger_id,
        ledger_name: l.ledger_name,
        group_id: l.group_id,
        balance,
      };
    }

    const descendantMap = buildDescendantMap(allGroups);

    // Per-group Dr/Cr totals — sum each ledger's net balance into its own
    // column (like Tally), NOT a single netted figure. A group holding both
    // Dr and Cr ledgers (e.g. Duties & Taxes) must show both column totals.
    const groupBalances = {};
    for (const g of allGroups) {
      const relevantIds = new Set([g.group_id, ...descendantMap[g.group_id]]);
      let dr = 0;
      let cr = 0;
      for (const l of Object.values(ledgerBalances)) {
        if (relevantIds.has(l.group_id)) {
          if (l.balance >= 0) dr += l.balance;
          else cr += Math.abs(l.balance);
        }
      }
      groupBalances[g.group_id] = { dr, cr };
    }

    // Direct children of the requested group
    const childGroups = allGroups
      .filter((cg) => cg.parent_group_id === group_id)
      .map((cg) => {
        const { dr, cr } = groupBalances[cg.group_id] || { dr: 0, cr: 0 };
        return {
          group_id: cg.group_id,
          group_name: cg.name,
          nature: cg.nature,
          dr,
          cr,
          type: 'group',
        };
      })
      .filter((g) => g.dr !== 0 || g.cr !== 0);

    // Direct ledgers of this group
    const directLedgers = Object.values(ledgerBalances)
      .filter((l) => l.group_id === group_id && l.balance !== 0)
      .map((l) => {
        const { dr, cr } = splitDrCr(l.balance);
        return { ledger_id: l.ledger_id, ledger_name: l.ledger_name, dr, cr, type: 'ledger' };
      });

    // Group info
    const groupInfo = allGroups.find((g) => g.group_id === group_id);

    // Closing Stock shows as a distinct line inside the Current Assets primary
    // group (Tally shows the CLOSING inventory value here, not the opening one).
    // Negative ledger_id marks it as a virtual, non-drillable row.
    if (groupInfo && groupInfo.name === 'Current Assets' && !groupInfo.parent_group_id) {
      const closingStock = await getClosingStockValue(company_id, fy_id);
      if (closingStock !== 0) {
        directLedgers.unshift({
          ledger_id: -100,
          ledger_name: 'Closing Stock',
          dr: closingStock,
          cr: 0,
          type: 'ledger',
        });
      }
    }
    // Grand Total sums each column independently (like Tally), not the netted
    // group balance — a group mixing Dr and Cr ledgers must show both totals.
    const totalDr =
      childGroups.reduce((s, g) => s + g.dr, 0) + directLedgers.reduce((s, l) => s + l.dr, 0);
    const totalCr =
      childGroups.reduce((s, g) => s + g.cr, 0) + directLedgers.reduce((s, l) => s + l.cr, 0);

    return {
      success: true,
      group_name: groupInfo?.name || '',
      childGroups,
      ledgers: directLedgers,
      totalDr,
      totalCr,
    };
  } catch (err) {
    console.error('[groupSummary] error:', err);
    return { success: false, error: err.message };
  }
};

// ── ledgerMonthlySummary ───────────────────────────────────────────────────

const ledgerMonthlySummary = async (company_id, fy_id, ledger_id) => {
  try {
    const ledger = await db.get(
      sql`SELECT ledger_id, name AS ledger_name, opening_balance, opening_balance_type, group_id
          FROM ${ledgers}
          WHERE ledger_id = ${ledger_id} AND company_id = ${company_id}`,
    );
    if (!ledger) return { success: false, error: 'Ledger not found' };

    const { openings } = await getOpeningBalances(company_id, fy_id);

    const voucherRows = await db.all(
      sql`SELECT e.type, e.amount, v.date
          FROM ${voucherEntries} e
          INNER JOIN ${vouchers} v ON v.voucher_id = e.voucher_id
          WHERE v.company_id = ${company_id}
            AND v.fy_id      = ${fy_id}
            AND e.ledger_id  = ${ledger_id}
            AND v.is_cancelled = 0
            AND COALESCE(v.is_optional,   0) = 0
            AND COALESCE(v.is_post_dated, 0) = 0`,
    );

    const MONTHS = [
      'April',
      'May',
      'June',
      'July',
      'August',
      'September',
      'October',
      'November',
      'December',
      'January',
      'February',
      'March',
    ];
    const monthIndex = (dateStr) => {
      const d = new Date(dateStr);
      const m = d.getMonth(); // 0=Jan
      return m >= 3 ? m - 3 : m + 9; // April=0, March=11
    };

    const monthlyTxn = Array(12)
      .fill(null)
      .map(() => ({ debit: 0, credit: 0 }));
    for (const row of voucherRows) {
      const idx = monthIndex(row.date);
      if (row.type === 'Dr') monthlyTxn[idx].debit += Number(row.amount);
      else monthlyTxn[idx].credit += Number(row.amount);
    }

    const openingBalance = openings[ledger.ledger_id] || 0;
    let runningBalance = openingBalance;
    const rows = MONTHS.map((month, idx) => {
      const { debit, credit } = monthlyTxn[idx];
      runningBalance += debit - credit;
      const { dr: closingDr, cr: closingCr } = splitDrCr(runningBalance);
      return { month, debit: debit || 0, credit: credit || 0, closingDr, closingCr };
    });

    const { dr: openDr, cr: openCr } = splitDrCr(openingBalance);
    const { dr: closeDr, cr: closeCr } = splitDrCr(runningBalance);

    return {
      success: true,
      ledger_id: ledger.ledger_id,
      ledger_name: ledger.ledger_name,
      openingDr: openDr,
      openingCr: openCr,
      rows,
      closingDr: closeDr,
      closingCr: closeCr,
    };
  } catch (err) {
    console.error('[ledgerMonthlySummary] error:', err);
    return { success: false, error: err.message };
  }
};

module.exports = { trialBalance, groupSummary, ledgerMonthlySummary };
