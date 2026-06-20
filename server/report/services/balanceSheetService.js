const { db } = require('../../db/index');
const { sql } = require('drizzle-orm');
const { voucherEntries, vouchers, ledgers, groups } = require('../../db/schema');

const getEntries = async (company_id, fy_id) => {
  return await db.all(
    sql`SELECT e.ledger_id, e.type, e.amount
        FROM ${voucherEntries} e
        INNER JOIN ${vouchers} v ON v.voucher_id = e.voucher_id
        WHERE v.company_id = ${company_id}
          AND v.fy_id     = ${fy_id}
          AND v.is_cancelled = 0
          AND COALESCE(v.is_optional,   0) = 0
          AND COALESCE(v.is_post_dated, 0) = 0`
  );
};

const calcLedgerBalance = (ledger_id, entries, opening_balance = 0) => {
  let balance = Number(opening_balance) || 0;
  for (const e of entries) {
    if (e.ledger_id === ledger_id) {
      balance += e.type === 'Dr' ? Number(e.amount) : -Number(e.amount);
    }
  }
  return balance;
};


const balanceSheet = async (company_id, fy_id) => {
  try {
    const entries = await getEntries(company_id, fy_id);
    const ledgerRows = await db.all(
      sql`SELECT
            l.ledger_id,
            l.name        AS ledger_name,
            l.opening_balance,
            l.group_id,
            g.name        AS group_name,
            g.nature,
            g.parent_group_id
          FROM ${ledgers} l
          INNER JOIN ${groups} g ON g.group_id = l.group_id
          WHERE l.company_id = ${company_id}
            AND l.is_active  = 1`
    );

    // 3. compute balance per ledger
    const ledgersWithBalance = ledgerRows.map(l => ({
      ledger_id:   l.ledger_id,
      ledger_name: l.ledger_name,
      group_id:    l.group_id,
      group_name:  l.group_name,
      nature:      l.nature,
      balance:     calcLedgerBalance(l.ledger_id, entries, l.opening_balance || 0),
    }));

    // 4. aggregate into groups
    const groupMap = {};
    for (const l of ledgersWithBalance) {
      if (!groupMap[l.group_id]) {
        groupMap[l.group_id] = {
          group_id:   l.group_id,
          group_name: l.group_name,
          nature:     l.nature,
          balance:    0,
          ledgers:    [],
        };
      }
      groupMap[l.group_id].balance += l.balance;
      if (l.balance !== 0) {
        groupMap[l.group_id].ledgers.push({
          ledger_id:   l.ledger_id,
          ledger_name: l.ledger_name,
          balance:     l.balance,
        });
      }
    }

    const allGroups = Object.values(groupMap).filter(g => g.balance !== 0);

    const assets      = allGroups.filter(g => g.nature === 'Assets');
    const liabilities = allGroups.filter(g => g.nature === 'Liabilities');

    const totalAssets      = assets.reduce((s, g) => s + Math.abs(g.balance), 0);
    const totalLiabilities = liabilities.reduce((s, g) => s + Math.abs(g.balance), 0);

    return {
      success: true,
      assets,
      liabilities,
      totalAssets,
      totalLiabilities,
    };

  } catch (err) {
    console.error('[balanceSheetService] error:', err);
    return { success: false, error: err.message };
  }
};

module.exports = { balanceSheet };