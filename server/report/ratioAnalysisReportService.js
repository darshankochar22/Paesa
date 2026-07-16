const { db } = require('../db/index');
const { sql } = require('drizzle-orm');
const { voucherEntries, vouchers, ledgers, groups } = require('../db/schema');
const stockSummaryReportService = require('./stockSummaryReportService');
const { profitLoss } = require('./services/profitlossService');
const { balanceSheet } = require('./services/balanceSheetService');
const outstandingReportService = require('./outstandingReportService');
const paymentPerformanceReportService = require('./paymentPerformanceReportService');

// READ-ONLY ratio-analysis report.
//
// This is the *main* report only. Every headline figure is sourced from the
// already-correct underlying reports so the numbers — and the drill-downs —
// reconcile exactly with them:
//   • Sales / Purchases / Gross Profit / Nett Profit / Indirect Income / Closing
//     Stock            → Profit & Loss  (services/profitlossService)
//   • Current Assets / Current Liabilities / Loans (Liability) / Capital Account
//                      → Balance Sheet   (services/balanceSheetService)
//   • Closing-stock valuation → Stock Summary
//   • Bill-wise "Due Till Today" → Outstanding (services/outstandingService)
// No schema, migration or write paths are touched, and none of those underlying
// reports are modified.

// Pull all posted (non-cancelled) voucher entries for the FY — used only for the
// left-column sub-group figures (Cash/Bank/Debtors/Creditors) that Tally lists
// individually and that map 1:1 to the Group Summary drill.
const getEntries = async (company_id, fy_id) => {
  const rows = await db.all(
    sql`SELECT e.*, v.date, v.voucher_type, v.voucher_number
        FROM ${voucherEntries} e
        INNER JOIN ${vouchers} v ON v.voucher_id = e.voucher_id
        WHERE v.company_id = ${company_id} AND v.fy_id = ${fy_id} AND v.is_cancelled = 0
          AND COALESCE(v.is_optional, 0) = 0 AND COALESCE(v.is_post_dated, 0) = 0`,
  );
  return rows;
};

// Signed running balance for one ledger (Dr +, Cr -) seeded from its opening
// balance — same convention as reportService.calcLedgerBalance.
const calcLedgerBalance = (
  ledger_id,
  entries,
  opening_balance = 0,
  opening_balance_type = 'Dr',
) => {
  const rawOpening = Number(opening_balance) || 0;
  let balance =
    rawOpening < 0 ? rawOpening : opening_balance_type === 'Cr' ? -rawOpening : rawOpening;
  entries
    .filter((e) => e.ledger_id === ledger_id)
    .forEach((e) => {
      balance += e.type === 'Dr' ? e.amount : -e.amount;
    });
  return balance;
};

// Names of every group in a ledger's chain up to its primary group.
const getGroupAncestors = (group_id, groupById) => {
  const ancestors = [];
  let g = groupById.get(group_id);
  const guard = new Set();
  while (g) {
    ancestors.push(g.name);
    if (g.parent_group_id == null || !groupById.has(g.parent_group_id) || guard.has(g.group_id)) {
      break;
    }
    guard.add(g.group_id);
    g = groupById.get(g.parent_group_id);
  }
  return ancestors;
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

const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;

// Magnitude of a primary group by (case-insensitive substring) name match,
// read straight off a Balance Sheet assets/liabilities array.
const bsGroupMag = (arr, needle) => {
  if (!Array.isArray(arr)) return 0;
  const g = arr.find((x) => (x.group_name || '').toLowerCase().includes(needle));
  return g ? Math.abs(Number(g.balance) || 0) : 0;
};

module.exports = {
  // ratioAnalysis(company_id, fy_id)
  // Returns { success, ratios:[{key,label,value,unit}], components:{...} }.
  ratioAnalysis: async (company_id, fy_id) => {
    try {
      const [pl, bs, stockRes, entries, groupRows, ledgerRows] = await Promise.all([
        profitLoss(company_id, fy_id),
        balanceSheet(company_id, fy_id),
        stockSummaryReportService.stockSummary(company_id, fy_id),
        getEntries(company_id, fy_id),
        db.all(sql`SELECT * FROM ${groups} WHERE ${groups.companyId} = ${company_id}`),
        db.all(
          sql`SELECT l.ledger_id, l.name, l.opening_balance, l.opening_balance_type, l.group_id
              FROM ${ledgers} l
              WHERE l.company_id = ${company_id} AND l.is_active = 1`,
        ),
      ]);

      // ── Profit & Loss figures (authoritative) ─────────────────────────────
      const sales = pl.success ? Math.abs(Number(pl.totalSales) || 0) : 0;
      const purchases = pl.success ? Math.abs(Number(pl.totalPurchase) || 0) : 0;
      const directExpenses = pl.success ? Math.abs(Number(pl.totalDirectExpenses) || 0) : 0;
      const indirectExpenses = pl.success ? Math.abs(Number(pl.totalIndirectExpenses) || 0) : 0;
      const directIncomes = pl.success ? Math.abs(Number(pl.totalDirectIncomes) || 0) : 0;
      const indirectIncomes = pl.success ? Math.abs(Number(pl.totalIndirectIncomes) || 0) : 0;
      const grossProfit = pl.success ? Number(pl.grossProfit) || 0 : 0;
      const netProfit = pl.success ? Number(pl.netProfit) || 0 : 0;

      // Operating Cost is everything that takes Sales down to Operating Profit,
      // i.e. it excludes non-operating (indirect) income:
      //   Operating Profit = Nett Profit − Indirect Income
      //   Operating Cost   = Sales − Operating Profit
      const operatingCost = sales - (netProfit - indirectIncomes);

      // ── Closing-stock valuation (Stock Summary) ───────────────────────────
      const inventory = stockRes && stockRes.success ? Number(stockRes.totalClosingValue) || 0 : 0;

      // ── Balance Sheet primary-group magnitudes (authoritative) ────────────
      const currentAssets = bs.success ? bsGroupMag(bs.assets, 'current asset') : 0;
      const currentLiabilities = bs.success ? bsGroupMag(bs.liabilities, 'current liab') : 0;
      const totalDebt = bs.success ? bsGroupMag(bs.liabilities, 'loan') : 0;
      const equity = bs.success ? bsGroupMag(bs.liabilities, 'capital') : 0;
      const workingCapital = currentAssets - currentLiabilities;

      // ── Left-column sub-group figures (Cash / Bank / Debtors / Creditors) ──
      const groupById = new Map(groupRows.map((g) => [g.group_id, g]));
      let cashInHand = 0; // |bal| under "Cash-in-hand"
      let bankAccounts = 0; // |bal| under "Bank Accounts"
      let bankOD = 0; // |bal| under "Bank OD A/c" / "Bank OCC A/c"
      let sundryDebtors = 0; // NET closing balance under "Sundry Debtors"
      let sundryCreditors = 0; // NET closing balance under "Sundry Creditors"

      for (const l of ledgerRows) {
        const bal = calcLedgerBalance(
          l.ledger_id,
          entries,
          l.opening_balance || 0,
          l.opening_balance_type || 'Dr',
        );
        if (bal === 0) continue;
        const abs = Math.abs(bal);
        const ancestors = getGroupAncestors(l.group_id, groupById).map((a) => a.toLowerCase());

        if (ancestors.includes('cash-in-hand')) cashInHand += abs;
        if (ancestors.includes('bank accounts')) bankAccounts += abs;
        if (ancestors.includes('bank od a/c') || ancestors.includes('bank occ a/c')) bankOD += abs;
        // Net (Dr − Cr) so a debtor carrying a credit advance reduces the total,
        // matching the Group Summary drill (the Sundry Debtors line drills here).
        if (ancestors.includes('sundry debtors')) sundryDebtors += bal;
        if (ancestors.includes('sundry creditors')) sundryCreditors += bal;
      }

      // ── "Due Till Today" — a SEPARATE calc, and a SEPARATE drill, from the
      // Sundry Debtors / Sundry Creditors group balances above (which drill to the
      // Group Summary). This line drills to the Group Outstanding report, so it is
      // computed from that very report's engine — the bill-wise outstanding — so
      // the figure and the drill-down reconcile exactly. The two lines are not
      // required to be equal: the group balance nets advances/credits and includes
      // non-bill-wise ledgers, whereas the amount "due" is the bill-wise receivable
      // (Dr side) / payable (Cr side).
      const findGroupId = (needle) => {
        const exact = groupRows.find((g) => (g.name || '').toLowerCase() === needle);
        if (exact) return exact.group_id;
        const partial = groupRows.find((g) => (g.name || '').toLowerCase().includes(needle));
        return partial ? partial.group_id : null;
      };
      const debtorsGid = findGroupId('sundry debtors');
      const creditorsGid = findGroupId('sundry creditors');
      const [debtorOut, creditorOut] = await Promise.all([
        debtorsGid != null
          ? outstandingReportService.groupOutstandings(company_id, fy_id, debtorsGid)
          : null,
        creditorsGid != null
          ? outstandingReportService.groupOutstandings(company_id, fy_id, creditorsGid)
          : null,
      ]);
      // Debtors' amount due = receivable (Dr) side; creditors' amount due = payable
      // (Cr) side — matching Tally's "(due till today)" figures.
      const dueDebtors = debtorOut && debtorOut.success ? Number(debtorOut.totalDebit) || 0 : 0;
      const dueCreditors =
        creditorOut && creditorOut.success ? Number(creditorOut.totalCredit) || 0 : 0;

      // Recv. Turnover in days — Tally's "payment performance of Debtors" is the
      // SUM of each debtor's (Closing / Total Sales) × Number of Days. Sourced
      // from the same service the drill-down uses so the headline and the Group
      // Payment Performance report reconcile exactly.
      const recvTurnoverDays =
        debtorsGid != null
          ? await paymentPerformanceReportService.groupPaymentPerformanceTotal(
              company_id,
              fy_id,
              debtorsGid,
            )
          : null;

      const capitalEmployed = equity + netProfit; // Capital Account + Nett Profit

      // ── Ratios (also consumed by AI tools / parity tests) ─────────────────
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
          label: 'Debt/Equity Ratio',
          unit: 'x',
          value: ratio(totalDebt, capitalEmployed),
        },
        {
          key: 'gross_profit_pct',
          label: 'Gross Profit %',
          unit: '%',
          value: pct(grossProfit, sales),
        },
        { key: 'net_profit_pct', label: 'Nett Profit %', unit: '%', value: pct(netProfit, sales) },
        {
          key: 'operating_cost_pct',
          label: 'Operating Cost %',
          unit: '%',
          value: pct(operatingCost, sales),
        },
        {
          key: 'recv_turnover_days',
          label: 'Recv. Turnover in days',
          unit: 'days',
          value:
            recvTurnoverDays != null
              ? round2(recvTurnoverDays)
              : sales
                ? round2((Math.abs(sundryDebtors) / sales) * 365)
                : null,
        },
        {
          key: 'roi_pct',
          label: 'Return on Investment %',
          unit: '%',
          value: pct(netProfit, capitalEmployed),
        },
        {
          key: 'return_wc_pct',
          label: 'Return on Wkg. Capital %',
          unit: '%',
          value: pct(netProfit, workingCapital),
        },
        {
          key: 'wc_turnover',
          label: 'Wkg. Capital Turnover',
          unit: 'x',
          value: ratio(sales, workingCapital),
        },
        {
          key: 'inventory_turnover',
          label: 'Inventory Turnover',
          unit: 'x',
          value: ratio(sales, inventory),
        },
        {
          key: 'working_capital',
          label: 'Working Capital',
          unit: 'amount',
          value: round2(workingCapital),
        },
      ];

      return {
        success: true,
        ratios,
        components: {
          currentAssets: round2(currentAssets),
          currentLiabilities: round2(currentLiabilities),
          inventory: round2(inventory),
          totalDebt: round2(totalDebt),
          equity: round2(equity),
          capitalEmployed: round2(capitalEmployed),
          sales: round2(sales),
          purchases: round2(purchases),
          directExpenses: round2(directExpenses),
          indirectExpenses: round2(indirectExpenses),
          directIncomes: round2(directIncomes),
          indirectIncomes: round2(indirectIncomes),
          grossProfit: round2(grossProfit),
          netProfit: round2(netProfit),
          operatingCost: round2(operatingCost),
          workingCapital: round2(workingCapital),
          totalIncome: round2(sales + directIncomes + indirectIncomes),
          totalExpenses: round2(purchases + directExpenses + indirectExpenses),
          totalAssets: bs.success ? round2(bs.totalAssets) : 0,
          cashInHand: round2(cashInHand),
          bankAccounts: round2(bankAccounts),
          bankOD: round2(bankOD),
          sundryDebtors: round2(Math.abs(sundryDebtors)),
          sundryCreditors: round2(Math.abs(sundryCreditors)),
          // "Due Till Today" — separate from the group balances above.
          sundryDebtorsDue: round2(Math.abs(dueDebtors)),
          sundryCreditorsDue: round2(Math.abs(dueCreditors)),
          // Recv. Turnover in days — sum of per-debtor payment performance; the
          // Ratio Analysis headline reads this so it equals the drill total.
          recvTurnoverDays: recvTurnoverDays != null ? round2(recvTurnoverDays) : null,
        },
      };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },
};
