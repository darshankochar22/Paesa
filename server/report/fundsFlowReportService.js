const { db } = require('../db/index');
const { sql } = require('drizzle-orm');
const { voucherEntries, vouchers, ledgers, groups } = require('../db/schema');
const { calculateClosingStock } = require('./stockValuationEngine');
const { isFeatureEnabled } = require('../tallyFeatures/featureFlags');

// ISO date shifted by whole days (UTC), matching the P&L service.
const addDays = (isoDate, delta) => {
  const d = new Date(`${isoDate}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + delta);
  return d.toISOString().slice(0, 10);
};

// ---------------------------------------------------------------------------
// Funds Flow statement (READ-ONLY).
//
// Explains how the financial position moved between two dates by listing the
// SOURCES of funds and the APPLICATIONS of funds, reconciled through the net
// change in WORKING CAPITAL (= Current Assets − Current Liabilities).
//
// Tally model:
//   • Working capital = the Current Assets / Current Liabilities subtrees.
//     Their per-ledger movement is NOT a source/application — it IS the working
//     capital, reconciled separately in the footer.
//   • Sources/Applications come only from NON-CURRENT items + operations:
//       Nett Profit (source) / Nett Loss (application)         ← P&L for period
//       non-current asset  increase → application, decrease → source
//       non-current liab.  increase → source,      decrease → application
//   • Net increase/decrease in working capital is the balancing figure and,
//     by the balance-sheet identity, equals totalSources − totalApplications.
//
// All figures are live from voucher entries, Dr-positive convention:
//   balance = opening_balance + Σ(Dr) − Σ(Cr);  assets > 0, liabilities < 0.
// Two snapshots drive the period:  opening (date < from), closing (date <= to).
// ---------------------------------------------------------------------------

// Pull entries up to a cut-off date. `inclusive` => `<=` (closing) vs `<` (opening).
const getEntriesUpto = async (company_id, fy_id, cutoff_date, inclusive) => {
  const conditions = [
    sql`v.company_id = ${company_id}`,
    sql`v.fy_id = ${fy_id}`,
    sql`v.is_cancelled = 0`,
    sql`COALESCE(v.is_optional, 0) = 0`,
    sql`COALESCE(v.is_post_dated, 0) = 0`,
  ];
  if (cutoff_date) {
    conditions.push(inclusive ? sql`v.date <= ${cutoff_date}` : sql`v.date < ${cutoff_date}`);
  }
  return db.all(
    sql`SELECT e.ledger_id, e.type, e.amount, v.date
        FROM ${voucherEntries} e
        INNER JOIN ${vouchers} v ON v.voucher_id = e.voucher_id
        WHERE ${sql.join(conditions, sql` AND `)}`,
  );
};

// Net balance of one ledger across a set of entries (Dr positive, Cr negative).
const calcLedgerBalance = (
  ledger_id,
  entries,
  opening_balance = 0,
  opening_balance_type = 'Dr',
) => {
  const rawOpening = Number(opening_balance) || 0;
  let balance =
    rawOpening < 0 ? rawOpening : opening_balance_type === 'Cr' ? -rawOpening : rawOpening;
  for (const e of entries) {
    if (e.ledger_id === ledger_id) {
      balance += e.type === 'Dr' ? Number(e.amount) : -Number(e.amount);
    }
  }
  return balance;
};

// Classify a ledger's group into a funds-flow bucket by walking up to its root.
// Returns 'CA' | 'CL' | 'NCA' | 'NCL' | 'Income' | 'Expenses' | null.
const buildClassifier = (allGroups) => {
  const byId = new Map();
  allGroups.forEach((g) => byId.set(g.group_id, g));
  return (group_id) => {
    let g = byId.get(group_id);
    let guard = 0;
    while (g && guard++ < 64) {
      if (g.name === 'Current Assets') return 'CA';
      if (g.name === 'Current Liabilities') return 'CL';
      if (!g.parent_group_id) {
        if (g.nature === 'Assets') return 'NCA';
        if (g.nature === 'Liabilities') return 'NCL';
        if (g.nature === 'Income') return 'Income';
        if (g.nature === 'Expenses') return 'Expenses';
        return null;
      }
      g = byId.get(g.parent_group_id);
    }
    return null;
  };
};

module.exports = {
  // fundsFlow(company_id, fy_id, from_date, to_date)
  fundsFlow: async (company_id, fy_id, from_date, to_date) => {
    try {
      const allGroups = await db.all(
        sql`SELECT group_id, name, nature, parent_group_id
            FROM ${groups}
            WHERE company_id = ${company_id} AND is_active = 1`,
      );
      const classify = buildClassifier(allGroups);
      const caGroup = allGroups.find((g) => g.name === 'Current Assets' && !g.parent_group_id);
      const clGroup = allGroups.find((g) => g.name === 'Current Liabilities' && !g.parent_group_id);

      const ledgerRows = await db.all(
        sql`SELECT l.ledger_id, l.name, l.opening_balance, l.opening_balance_type, l.group_id
            FROM ${ledgers} l
            WHERE l.company_id = ${company_id} AND l.is_active = 1`,
      );

      const openingEntries = await getEntriesUpto(company_id, fy_id, from_date, false);
      const closingEntries = await getEntriesUpto(company_id, fy_id, to_date, true);

      let caOpen = 0,
        caClose = 0; // current assets (Dr +)
      let clOpenSigned = 0,
        clCloseSigned = 0; // current liabilities (Cr -, signed)
      let periodIncome = 0,
        periodExpenses = 0;
      const sources = [];
      const applications = [];

      for (const l of ledgerRows) {
        const cat = classify(l.group_id);
        if (!cat) continue;

        const opening = calcLedgerBalance(
          l.ledger_id,
          openingEntries,
          l.opening_balance || 0,
          l.opening_balance_type || 'Dr',
        );
        const closing = calcLedgerBalance(
          l.ledger_id,
          closingEntries,
          l.opening_balance || 0,
          l.opening_balance_type || 'Dr',
        );
        const change = closing - opening;

        if (cat === 'CA') {
          caOpen += opening;
          caClose += closing;
        } else if (cat === 'CL') {
          clOpenSigned += opening;
          clCloseSigned += closing;
        } else if (cat === 'Income') {
          periodIncome += -change;
        } // income is Cr movement
        else if (cat === 'Expenses') {
          periodExpenses += change;
        } // expense is Dr movement
        else if (cat === 'NCA') {
          if (change > 0)
            applications.push({
              particulars: `${l.name} (Increase)`,
              amount: change,
              ledger_id: l.ledger_id,
            });
          else if (change < 0)
            sources.push({
              particulars: `${l.name} (Decrease)`,
              amount: -change,
              ledger_id: l.ledger_id,
            });
        } else if (cat === 'NCL') {
          const inc = -change; // liability grew when its (negative) balance fell further
          if (inc > 0)
            sources.push({
              particulars: `${l.name} (Increase)`,
              amount: inc,
              ledger_id: l.ledger_id,
            });
          else if (inc < 0)
            applications.push({
              particulars: `${l.name} (Decrease)`,
              amount: -inc,
              ledger_id: l.ledger_id,
            });
        }
      }

      // Closing stock is an inventory valuation, not a ledger balance. The P&L
      // folds (closing − opening) stock into net profit (it's part of Gross
      // Profit), so the funds-flow "Nett Profit" must include it too, else it
      // understates by that amount. Add it to BOTH the net-profit basis AND
      // Current Assets (stock's balance-sheet home) so the statement still
      // balances. Gated by the same F11 flag the P&L / Balance Sheet use.
      let stockAdj = 0;
      if (await isFeatureEnabled(company_id, 'integrate_accounts_with_inventory')) {
        const openRes = from_date
          ? await calculateClosingStock(company_id, fy_id, addDays(from_date, -1))
          : { success: false };
        const closeRes = await calculateClosingStock(company_id, fy_id, to_date || null);
        const openingStock = openRes.success ? Number(openRes.totalValue) || 0 : 0;
        const closingStock = closeRes.success ? Number(closeRes.totalValue) || 0 : 0;
        caOpen += openingStock;
        caClose += closingStock;
        stockAdj = closingStock - openingStock;
      }

      // Funds from operations — a source if profit, an application if loss.
      // No backing ledger_id: the client routes these rows to the P&L.
      const fundsFromOperations = periodIncome - periodExpenses + stockAdj;
      if (fundsFromOperations > 0)
        sources.unshift({ particulars: 'Nett Profit', amount: fundsFromOperations });
      else if (fundsFromOperations < 0)
        applications.unshift({ particulars: 'Nett Loss', amount: -fundsFromOperations });

      const totalSources = sources.reduce((s, r) => s + r.amount, 0);
      const totalApplications = applications.reduce((s, r) => s + r.amount, 0);

      // Working-capital reconciliation (Dr-positive: WC = CA + CL_signed).
      // Negate the signed Cr balance to a display magnitude; avoid JS -0.
      const currentLiabilitiesOpening = clOpenSigned === 0 ? 0 : -clOpenSigned;
      const currentLiabilitiesClosing = clCloseSigned === 0 ? 0 : -clCloseSigned;
      const workingCapitalOpening = caOpen + clOpenSigned; // = caOpen − currentLiabilitiesOpening
      const workingCapitalClosing = caClose + clCloseSigned;
      const workingCapitalChange = workingCapitalClosing - workingCapitalOpening;

      return {
        success: true,
        from_date: from_date || null,
        to_date: to_date || null,

        sources,
        applications,
        totalSources,
        totalApplications,
        fundsFromOperations,
        periodIncome,
        periodExpenses,

        currentAssetsOpening: caOpen,
        currentAssetsClosing: caClose,
        currentLiabilitiesOpening,
        currentLiabilitiesClosing,
        workingCapitalOpening,
        workingCapitalClosing,
        workingCapitalChange,

        // back-compat alias used by older callers
        netWorkingCapitalChange: workingCapitalChange,
        isNetIncrease: workingCapitalChange >= 0,

        currentAssetsGroupId: caGroup ? caGroup.group_id : null,
        currentLiabilitiesGroupId: clGroup ? clGroup.group_id : null,
      };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },
};
