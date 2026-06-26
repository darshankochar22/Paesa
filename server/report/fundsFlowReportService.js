const { db } = require('../db/index');
const { sql } = require('drizzle-orm');
const { voucherEntries, vouchers, ledgers, groups } = require('../db/schema');

// ---------------------------------------------------------------------------
// Funds Flow statement (READ-ONLY).
//
// A funds flow statement explains how a company's financial position moved
// between two dates by listing the SOURCES of funds (where money came from)
// and the APPLICATIONS of funds (where money went), reconciled through the
// net change in working capital.
//
// All numbers are derived live from voucher entries, mirroring the balance
// computation conventions already used in reportService.js:
//   - A ledger's balance = opening_balance + Σ(Dr amounts) - Σ(Cr amounts)
//   - Group `nature` drives Assets / Liabilities / Income / Expenses buckets.
//
// We need two snapshots:
//   - opening: all entries with date <  from_date  (plus ledger opening_balance)
//   - closing: all entries with date <= to_date    (plus ledger opening_balance)
// The DELTA per ledger between those snapshots is what drives the statement.
// ---------------------------------------------------------------------------

// Pull entries up to (and optionally including) a cut-off date for a company/FY.
// `inclusive` controls whether the cut-off date itself is counted (<= vs <).
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
        WHERE ${sql.join(conditions, sql` AND `)}`
  );
};

// Net balance of a single ledger across a set of entries (Dr positive, Cr negative).
const calcLedgerBalance = (ledger_id, entries, opening_balance = 0, opening_balance_type = 'Dr') => {
  const rawOpening = Number(opening_balance) || 0;
  let balance = rawOpening < 0
    ? rawOpening
    : (opening_balance_type === 'Cr' ? -rawOpening : rawOpening);
  for (const e of entries) {
    if (e.ledger_id === ledger_id) {
      balance += e.type === 'Dr' ? e.amount : -e.amount;
    }
  }
  return balance;
};

module.exports = {
  // fundsFlow(company_id, fy_id, from_date, to_date)
  //
  // Returns sources & applications of funds and the working-capital reconciliation
  // for the period (from_date .. to_date].
  fundsFlow: async (company_id, fy_id, from_date, to_date) => {
    try {
      // Ledgers joined to their group nature, exactly like balanceSheet/profitLoss.
      const ledgerRows = await db.all(
        sql`SELECT l.ledger_id, l.name, l.opening_balance, l.opening_balance_type, l.group_id,
                   g.nature, g.name AS group_name
            FROM ${ledgers} l
            INNER JOIN ${groups} g ON g.group_id = l.group_id
            WHERE l.company_id = ${company_id} AND l.is_active = 1`
      );

      // Two snapshots of all entries: before the period and through the period.
      const openingEntries = await getEntriesUpto(company_id, fy_id, from_date, false);
      const closingEntries = await getEntriesUpto(company_id, fy_id, to_date, true);

      // Per-ledger opening balance, closing balance and change over the period.
      // `change` is signed in Dr-positive terms (the natural sign of the balance).
      const movements = ledgerRows.map(l => {
        const opening = calcLedgerBalance(l.ledger_id, openingEntries, l.opening_balance || 0, l.opening_balance_type || 'Dr');
        const closing = calcLedgerBalance(l.ledger_id, closingEntries, l.opening_balance || 0, l.opening_balance_type || 'Dr');
        return {
          ledger_id: l.ledger_id,
          ledger_name: l.name,
          group_id: l.group_id,
          group_name: l.group_name,
          nature: l.nature,
          opening,
          closing,
          change: closing - opening,
        };
      });

      // -------------------------------------------------------------------
      // Funds from operations.
      // Net profit (income - expenses) over the period is the primary internal
      // source of funds. Income ledgers carry credit (negative) balances and
      // expense ledgers carry debit (positive) balances in Dr-positive terms,
      // so the period movement is summed accordingly.
      // -------------------------------------------------------------------
      let periodIncome = 0;   // magnitude of income earned in the period
      let periodExpenses = 0; // magnitude of expenses incurred in the period
      for (const m of movements) {
        if (m.nature === 'Income') periodIncome += -m.change; // Cr movement
        else if (m.nature === 'Expenses') periodExpenses += m.change; // Dr movement
      }
      const fundsFromOperations = periodIncome - periodExpenses;

      // -------------------------------------------------------------------
      // Sources & applications from non-current (Assets / Liabilities) ledgers.
      //
      //   Assets (Dr-positive balance):
      //     increase in an asset  -> APPLICATION of funds (change > 0)
      //     decrease in an asset  -> SOURCE of funds      (change < 0)
      //   Liabilities (Cr-negative balance):
      //     increase in a liability (change < 0) -> SOURCE of funds
      //     decrease in a liability (change > 0) -> APPLICATION of funds
      // -------------------------------------------------------------------
      const sources = [];
      const applications = [];

      const addSource = (name, amount, ledger_id) => {
        if (amount > 0) sources.push({ particulars: name, amount, ...(ledger_id ? { ledger_id } : {}) });
      };
      const addApplication = (name, amount, ledger_id) => {
        if (amount > 0) applications.push({ particulars: name, amount, ...(ledger_id ? { ledger_id } : {}) });
      };

      // Funds from operations is shown as a source (or, if negative, an application).
      // It has no single backing ledger — it's the net of all Income/Expenses
      // ledgers for the period — so it deliberately gets no ledger_id; the
      // client routes these rows to the P&L instead.
      if (fundsFromOperations >= 0) addSource('Funds from Operations', fundsFromOperations);
      else addApplication('Funds Lost in Operations', Math.abs(fundsFromOperations));

      for (const m of movements) {
        if (m.change === 0) continue;

        if (m.nature === 'Assets') {
          // change in Dr-positive terms is the change in the asset value.
          if (m.change > 0) addApplication(`${m.ledger_name} (Increase)`, m.change, m.ledger_id);
          else addSource(`${m.ledger_name} (Decrease)`, Math.abs(m.change), m.ledger_id);
        } else if (m.nature === 'Liabilities') {
          // For liabilities a more-negative balance means the liability grew.
          const liabIncrease = -m.change; // positive when the liability increased
          if (liabIncrease > 0) addSource(`${m.ledger_name} (Increase)`, liabIncrease, m.ledger_id);
          else addApplication(`${m.ledger_name} (Decrease)`, Math.abs(liabIncrease), m.ledger_id);
        }
        // Income / Expenses already captured via fundsFromOperations above.
      }

      const totalSources = sources.reduce((s, r) => s + r.amount, 0);
      const totalApplications = applications.reduce((s, r) => s + r.amount, 0);

      // Net increase / decrease in working capital is the balancing figure.
      const netWorkingCapitalChange = totalSources - totalApplications;

      return {
        success: true,
        from_date: from_date || null,
        to_date: to_date || null,
        fundsFromOperations,
        periodIncome,
        periodExpenses,
        sources,
        applications,
        totalSources,
        totalApplications,
        netWorkingCapitalChange,
        isNetIncrease: netWorkingCapitalChange >= 0,
      };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },
};