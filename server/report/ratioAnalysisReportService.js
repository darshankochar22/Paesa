const { db } = require('../db/index');
const { sql } = require('drizzle-orm');
const { voucherEntries, vouchers, ledgers, groups, stockItems } = require('../db/schema');

// READ-ONLY ratio-analysis report.
//
// Derives a set of standard financial ratios from the same primitives the
// existing balanceSheet / profitLoss reports use (posted voucher entries +
// ledgers joined to their groups), plus stock-item opening values for the
// inventory figure. No schema, migration or write paths are touched.
//
// Query/result conventions mirror server/report/reportService.js:
//   const { db } = require('../db/index');
//   const { sql } = require('drizzle-orm');
//   db.all(sql`...`)  and  { success: true, ... } shapes.

// Pull all posted (non-cancelled) voucher entries for the FY — identical to
// reportService.getEntries so balances reconcile with the other reports.
const getEntries = async (company_id, fy_id) => {
  const rows = await db.all(
    sql`SELECT e.*, v.date, v.voucher_type, v.voucher_number
        FROM ${voucherEntries} e
        INNER JOIN ${vouchers} v ON v.voucher_id = e.voucher_id
        WHERE v.company_id = ${company_id} AND v.fy_id = ${fy_id} AND v.is_cancelled = 0`
  );
  return rows;
};

// Signed running balance for one ledger (Dr +, Cr -) seeded from its opening
// balance — same convention as reportService.calcLedgerBalance.
const calcLedgerBalance = (ledger_id, entries, opening_balance = 0) => {
  let balance = opening_balance;
  entries
    .filter(e => e.ledger_id === ledger_id)
    .forEach(e => {
      balance += e.type === 'Dr' ? e.amount : -e.amount;
    });
  return balance;
};

// Walk a ledger's group chain up to its primary (top-level) group and return
// that primary group's name. Groups link via parent_group_id; a primary group
// has no parent. Used to classify ledgers as Current Assets, Current
// Liabilities, Sales, Purchases, Capital, Loans, etc.
const resolvePrimaryGroupName = (group_id, groupById) => {
  let g = groupById.get(group_id);
  const guard = new Set();
  while (g && g.parent_group_id != null && groupById.has(g.parent_group_id)) {
    if (guard.has(g.group_id)) break; // cycle guard
    guard.add(g.group_id);
    g = groupById.get(g.parent_group_id);
  }
  return g ? g.name : null;
};

// Round to 2 dp; return null when the denominator is zero/undefined so callers
// can surface "n/a" rather than Infinity/NaN.
const ratio = (numerator, denominator) => {
  if (!denominator || denominator === 0) return null;
  return Math.round((numerator / denominator) * 100) / 100;
};

const pct = (numerator, denominator) => {
  if (!denominator || denominator === 0) return null;
  return Math.round((numerator / denominator) * 10000) / 100;
};

module.exports = {
  // ratioAnalysis(company_id, fy_id)
  // Returns { success, ratios:[{key,label,value,unit,...}], components:{...} }.
  ratioAnalysis: async (company_id, fy_id) => {
    try {
      const entries = await getEntries(company_id, fy_id);

      const groupRows = await db.all(
        sql`SELECT * FROM ${groups} WHERE ${groups.companyId} = ${company_id}`
      );
      const groupById = new Map(groupRows.map(g => [g.group_id, g]));

      const ledgerRows = await db.all(
        sql`SELECT l.*, g.nature AS nature FROM ${ledgers} l
            INNER JOIN ${groups} g ON g.group_id = l.group_id
            WHERE l.company_id = ${company_id} AND l.is_active = 1`
      );

      // Closing-stock value. The only persisted, read-only inventory valuation
      // available is the stock item opening value; treat it as the inventory
      // figure used in current/quick ratios and inventory turnover.
      const stockRows = await db.all(
        sql`SELECT ${stockItems.openingValue} AS opening_value
            FROM ${stockItems}
            WHERE ${stockItems.companyId} = ${company_id}
              AND ${stockItems.isActive} = 1`
      );
      const inventory = stockRows.reduce((s, r) => s + (r.opening_value || 0), 0);

      // Accumulate signed balances bucketed by primary group + nature.
      let currentAssets = 0;       // |bal| of ledgers under "Current Assets"
      let currentLiabilities = 0;  // |bal| of ledgers under "Current Liabilities"
      let totalDebt = 0;           // |bal| of ledgers under loan groups
      let equity = 0;              // |bal| of ledgers under "Capital Account"
      let totalAssets = 0;         // |bal| of all Assets-nature ledgers
      let totalIncome = 0;         // |bal| of all Income-nature ledgers
      let totalExpenses = 0;       // |bal| of all Expenses-nature ledgers
      let sales = 0;               // |bal| under "Sales Accounts"
      let purchases = 0;           // |bal| under "Purchase Accounts"
      let directExpenses = 0;      // |bal| under "Direct Expenses"

      const DEBT_GROUPS = new Set([
        'Loans(Liability)', 'Secured Loans', 'Unsecured Loans',
        'Bank OD A/c', 'Bank OCC A/c',
      ]);

      for (const l of ledgerRows) {
        const bal = calcLedgerBalance(l.ledger_id, entries, l.opening_balance || 0);
        const abs = Math.abs(bal);
        if (abs === 0) continue;

        const primary = resolvePrimaryGroupName(l.group_id, groupById);

        switch (l.nature) {
          case 'Assets':
            totalAssets += abs;
            if (primary === 'Current Assets') currentAssets += abs;
            break;
          case 'Liabilities':
            if (primary === 'Current Liabilities') currentLiabilities += abs;
            if (primary === 'Capital Account') equity += abs;
            if (DEBT_GROUPS.has(primary)) totalDebt += abs;
            break;
          case 'Income':
            totalIncome += abs;
            if (primary === 'Sales Accounts') sales += abs;
            break;
          case 'Expenses':
            totalExpenses += abs;
            if (primary === 'Purchase Accounts') purchases += abs;
            if (primary === 'Direct Expenses') directExpenses += abs;
            break;
          default:
            break;
        }
      }

      // Current assets include stock-in-hand; the inventory figure above is the
      // stock valuation, used directly for quick-ratio exclusion and turnover.
      const netProfit = totalIncome - totalExpenses;
      // Gross profit ~= Sales - cost of goods (purchases + direct expenses) +
      // closing inventory. Defensible approximation from available read-only data.
      const grossProfit = sales - (purchases + directExpenses) + inventory;
      const workingCapital = currentAssets - currentLiabilities;
      const capitalEmployed = equity + totalDebt;

      const ratios = [
        {
          key: 'current_ratio',
          label: 'Current Ratio',
          unit: 'x',
          value: ratio(currentAssets, currentLiabilities),
        },
        {
          key: 'quick_ratio',
          label: 'Quick Ratio',
          unit: 'x',
          value: ratio(currentAssets - inventory, currentLiabilities),
        },
        {
          key: 'debt_equity',
          label: 'Debt-Equity Ratio',
          unit: 'x',
          value: ratio(totalDebt, equity),
        },
        {
          key: 'gross_profit_pct',
          label: 'Gross Profit %',
          unit: '%',
          value: pct(grossProfit, sales),
        },
        {
          key: 'net_profit_pct',
          label: 'Net Profit %',
          unit: '%',
          value: pct(netProfit, totalIncome),
        },
        {
          key: 'working_capital',
          label: 'Working Capital',
          unit: 'amount',
          value: Math.round(workingCapital * 100) / 100,
        },
        {
          key: 'inventory_turnover',
          label: 'Inventory Turnover',
          unit: 'x',
          value: ratio(purchases + directExpenses, inventory),
        },
        {
          key: 'return_on_capital',
          label: 'Return on Capital Employed %',
          unit: '%',
          value: pct(netProfit, capitalEmployed),
        },
      ];

      return {
        success: true,
        ratios,
        components: {
          currentAssets: Math.round(currentAssets * 100) / 100,
          currentLiabilities: Math.round(currentLiabilities * 100) / 100,
          inventory: Math.round(inventory * 100) / 100,
          totalDebt: Math.round(totalDebt * 100) / 100,
          equity: Math.round(equity * 100) / 100,
          totalAssets: Math.round(totalAssets * 100) / 100,
          sales: Math.round(sales * 100) / 100,
          purchases: Math.round(purchases * 100) / 100,
          directExpenses: Math.round(directExpenses * 100) / 100,
          grossProfit: Math.round(grossProfit * 100) / 100,
          totalIncome: Math.round(totalIncome * 100) / 100,
          totalExpenses: Math.round(totalExpenses * 100) / 100,
          netProfit: Math.round(netProfit * 100) / 100,
          workingCapital: Math.round(workingCapital * 100) / 100,
          capitalEmployed: Math.round(capitalEmployed * 100) / 100,
        },
      };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },
};
