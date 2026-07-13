const { db } = require('../../db/index');
const { sql } = require('drizzle-orm');

// Signed opening balance: Dr positive, Cr negative. A stored negative value is
// already signed (legacy XML-import rows encode Cr as a negative amount with
// type 'Dr'), so the type flag only decides the sign when the stored value is
// non-negative.
const signedOpening = (opening_balance = 0, opening_balance_type = 'Dr') => {
  const raw = Number(opening_balance) || 0;
  return raw < 0 ? raw : opening_balance_type === 'Cr' ? -raw : raw;
};

const calcLedgerBalance = (
  ledger_id,
  entries,
  opening_balance = 0,
  opening_balance_type = 'Dr',
) => {
  let balance = signedOpening(opening_balance, opening_balance_type);
  for (const e of entries) {
    if (e.ledger_id === ledger_id)
      balance += e.type === 'Dr' ? Number(e.amount) : -Number(e.amount);
  }
  return balance;
};

// Root-group nature per ledger — walks each group up to its primary root so we
// can tell P&L (Income/Expenses) ledgers from Balance-Sheet (Assets/Liabilities)
// ones. Returns { ledgerNature: {ledger_id -> nature}, plLedgerId }.
const buildLedgerNatureMap = async (company_id, ledgerRows) => {
  const groupRows = await db.all(
    sql`SELECT group_id, parent_group_id, nature FROM groups WHERE company_id = ${company_id}`,
  );
  const byId = new Map(groupRows.map((g) => [g.group_id, g]));
  const rootNature = (gid) => {
    let g = byId.get(gid);
    const seen = new Set();
    while (g && g.parent_group_id != null && byId.has(g.parent_group_id) && !seen.has(g.group_id)) {
      seen.add(g.group_id);
      g = byId.get(g.parent_group_id);
    }
    return g ? g.nature : null;
  };
  const ledgerNature = {};
  let plLedgerId = null;
  for (const l of ledgerRows) {
    ledgerNature[l.ledger_id] = rootNature(l.group_id);
    if (
      String(l.ledger_name || l.name || '')
        .trim()
        .toLowerCase() === 'profit & loss a/c'
    ) {
      plLedgerId = l.ledger_id;
    }
  }
  return { ledgerNature, plLedgerId };
};

// Tally-style carry-forward: the signed opening of every ledger AS OF the start
// of `fy_id`. For the first financial year (no vouchers dated before its start)
// this equals the stored books opening, so single-year behaviour is unchanged.
//
// For a later year it is: stored books opening
//   + net of every committed movement dated before the FY start,
//   EXCEPT Income/Expense (P&L) movements — those reset each year and their net
//   rolls into the "Profit & Loss A/c" ledger (retained earnings), exactly as
//   Tally closes the books. This keeps the trial balance balanced (Σ opening
//   across all ledgers stays 0) while presenting P&L accounts fresh each year.
//
// Returns { openings: {ledger_id -> signed opening}, plLedgerId }.
const getOpeningBalances = async (company_id, fy_id) => {
  const ledgerRows = await db.all(
    sql`SELECT ledger_id, name AS ledger_name, opening_balance, opening_balance_type, group_id
        FROM ledgers WHERE company_id = ${company_id} AND is_active = 1`,
  );
  const openings = {};
  for (const l of ledgerRows)
    openings[l.ledger_id] = signedOpening(l.opening_balance, l.opening_balance_type);

  const fy = await db.get(sql`SELECT start_date FROM financial_years WHERE fy_id = ${fy_id}`);
  const fyStart = fy && fy.start_date ? String(fy.start_date).slice(0, 10) : null;
  const { ledgerNature, plLedgerId } = await buildLedgerNatureMap(company_id, ledgerRows);
  if (!fyStart) return { openings, plLedgerId };

  const prior = await db.all(
    sql`SELECT e.ledger_id, e.type, e.amount
        FROM voucher_entries e
        INNER JOIN vouchers v ON v.voucher_id = e.voucher_id
        WHERE v.company_id = ${company_id}
          AND v.date < ${fyStart}
          AND v.is_cancelled = 0
          AND COALESCE(v.is_optional,   0) = 0
          AND COALESCE(v.is_post_dated, 0) = 0`,
  );

  let retainedEarnings = 0;
  for (const e of prior) {
    const delta = e.type === 'Dr' ? Number(e.amount) : -Number(e.amount);
    const nat = ledgerNature[e.ledger_id];
    if (nat === 'Income' || nat === 'Expenses') {
      retainedEarnings += delta; // rolls into P&L A/c below, not the P&L ledger itself
    } else {
      if (openings[e.ledger_id] === undefined) openings[e.ledger_id] = 0;
      openings[e.ledger_id] += delta;
    }
  }
  if (plLedgerId != null) openings[plLedgerId] = (openings[plLedgerId] || 0) + retainedEarnings;

  return { openings, plLedgerId };
};

module.exports = { calcLedgerBalance, signedOpening, getOpeningBalances };
