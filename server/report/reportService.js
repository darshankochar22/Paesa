const { db } = require('../db/index');
const { sql } = require('drizzle-orm');
const { voucherEntries, vouchers, ledgers, groups } = require('../db/schema');
const voucherService = require('../voucher/voucherService');

const getEntries = async (company_id, fy_id) => {
  const rows = await db.all(
    sql`SELECT e.*, v.date, v.voucher_type, v.voucher_number
        FROM ${voucherEntries} e
        INNER JOIN ${vouchers} v ON v.voucher_id = e.voucher_id
        WHERE v.company_id = ${company_id} AND v.fy_id = ${fy_id} AND v.is_cancelled = 0
          AND COALESCE(v.is_optional, 0) = 0 AND COALESCE(v.is_post_dated, 0) = 0`
  );
  return rows;
};

const calcLedgerBalance = (ledger_id, entries, opening_balance = 0) => {
  let balance = opening_balance;
  entries
    .filter(e => e.ledger_id === ledger_id)
    .forEach(e => {
      balance += e.type === 'Dr' ? e.amount : -e.amount;
    });
  return balance;
};

module.exports = {
  trialBalance: async (company_id, fy_id) => {
    try {
      const entries = await getEntries(company_id, fy_id);
      const ledgerRows = await db.all(
        sql`SELECT * FROM ${ledgers}
            WHERE ${ledgers.companyId} = ${company_id} AND ${ledgers.isActive} = 1`
      );

      const rows = ledgerRows.map(l => {
        const balance = calcLedgerBalance(l.ledger_id, entries, l.opening_balance || 0);
        return {
          ledger_id: l.ledger_id,
          ledger_name: l.name,
          group_id: l.group_id,
          debit:  balance > 0 ? balance : 0,
          credit: balance < 0 ? Math.abs(balance) : 0,
        };
      }).filter(r => r.debit !== 0 || r.credit !== 0);

      const totalDebit  = rows.reduce((s, r) => s + r.debit, 0);
      const totalCredit = rows.reduce((s, r) => s + r.credit, 0);

      return { success: true, rows, totalDebit, totalCredit };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  balanceSheet: async (company_id, fy_id) => {
    try {
      const entries = await getEntries(company_id, fy_id);

      const ledgerRows = await db.all(
        sql`SELECT l.*, g.nature FROM ${ledgers} l
            INNER JOIN ${groups} g ON g.group_id = l.group_id
            WHERE l.company_id = ${company_id} AND l.is_active = 1`
      );

      const getLedgersByNature = (nature) => ledgerRows
        .filter(l => l.nature === nature)
        .map(l => ({
          ledger_id: l.ledger_id,
          ledger_name: l.name,
          balance: calcLedgerBalance(l.ledger_id, entries, l.opening_balance || 0),
        }))
        .filter(l => l.balance !== 0);

      const assets      = getLedgersByNature('Assets');
      const liabilities = getLedgersByNature('Liabilities');

      const totalAssets      = assets.reduce((s, l) => s + Math.abs(l.balance), 0);
      const totalLiabilities = liabilities.reduce((s, l) => s + Math.abs(l.balance), 0);

      return { success: true, assets, liabilities, totalAssets, totalLiabilities };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  profitLoss: async (company_id, fy_id) => {
    try {
      const entries = await getEntries(company_id, fy_id);

      const ledgerRows = await db.all(
        sql`SELECT l.*, g.nature FROM ${ledgers} l
            INNER JOIN ${groups} g ON g.group_id = l.group_id
            WHERE l.company_id = ${company_id} AND l.is_active = 1`
      );

      const getLedgersByNature = (nature) => ledgerRows
        .filter(l => l.nature === nature)
        .map(l => ({
          ledger_id: l.ledger_id,
          ledger_name: l.name,
          balance: Math.abs(calcLedgerBalance(l.ledger_id, entries, l.opening_balance || 0)),
        }))
        .filter(l => l.balance !== 0);

      const income   = getLedgersByNature('Income');
      const expenses = getLedgersByNature('Expenses');

      const totalIncome   = income.reduce((s, l) => s + l.balance, 0);
      const totalExpenses = expenses.reduce((s, l) => s + l.balance, 0);
      const netProfit     = totalIncome - totalExpenses;

      return {
        success: true,
        income, expenses,
        totalIncome, totalExpenses,
        netProfit, isProfit: netProfit >= 0,
      };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  ledgerReport: async (company_id, fy_id, ledger_id, from_date, to_date) => {
    try {
      const ledgerRows = await db.all(
        sql`SELECT * FROM ${ledgers} WHERE ${ledgers.ledgerId} = ${ledger_id}`
      );
      if (ledgerRows.length === 0) return { success: false, error: 'Ledger not found' };

      // Build the entry query with optional date bounds, mirroring the legacy
      // conditional WHERE clauses. sql.join lets us append predicates only when
      // the corresponding date filter is supplied.
      const conditions = [
        sql`v.company_id = ${company_id}`,
        sql`v.fy_id = ${fy_id}`,
        sql`e.ledger_id = ${ledger_id}`,
        sql`v.is_cancelled = 0`,
        sql`COALESCE(v.is_optional, 0) = 0`,
        sql`COALESCE(v.is_post_dated, 0) = 0`,
      ];
      if (from_date) conditions.push(sql`v.date >= ${from_date}`);
      if (to_date)   conditions.push(sql`v.date <= ${to_date}`);

      const result = await db.all(
        sql`SELECT e.*, v.date, v.voucher_type, v.voucher_number, v.narration as voucher_narration
            FROM ${voucherEntries} e
            INNER JOIN ${vouchers} v ON v.voucher_id = e.voucher_id
            WHERE ${sql.join(conditions, sql` AND `)}
            ORDER BY v.date ASC`
      );

      let runningBalance = ledgerRows[0].opening_balance || 0;
      const rows = result.map(e => {
        runningBalance += e.type === 'Dr' ? e.amount : -e.amount;
        return {
          date: e.date,
          voucher_type: e.voucher_type,
          voucher_number: e.voucher_number,
          debit:  e.type === 'Dr' ? e.amount : 0,
          credit: e.type === 'Cr' ? e.amount : 0,
          balance: runningBalance,
          narration: e.narration || e.voucher_narration,
        };
      });

      return {
        success: true,
        ledger_name: ledgerRows[0].name,
        opening_balance: ledgerRows[0].opening_balance || 0,
        rows,
        closing_balance: runningBalance,
      };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  cashBook: async (company_id, fy_id, from_date, to_date) => {
    try {
      const cashLedger = await db.all(
        sql`SELECT * FROM ${ledgers}
            WHERE ${ledgers.companyId} = ${company_id}
              AND ${ledgers.ledgerType} = 'Cash'
              AND ${ledgers.isActive} = 1
            LIMIT 1`
      );
      if (cashLedger.length === 0) return { success: false, error: 'Cash ledger not found' };

      return await module.exports.ledgerReport(
        company_id, fy_id, cashLedger[0].ledger_id, from_date, to_date
      );
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  bankBook: async (company_id, fy_id, ledger_id, from_date, to_date) => {
    try {
      return await module.exports.ledgerReport(company_id, fy_id, ledger_id, from_date, to_date);
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  daybook: async (company_id, fy_id, from_date, to_date) => {
    try {
      const { vouchers } = await voucherService.getDaybook(company_id, fy_id, from_date, to_date);

      const result = [];
      for (const v of vouchers) {
        const full = await voucherService.getById(v.voucher_id);
        if (full.success) result.push(full.voucher);
      }

      return { success: true, vouchers: result };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  /** Group Summary — closing balance per account group derived from ledger + voucher entries. */
  groupSummary: async (company_id, fy_id) => {
    try {
      const entries = await getEntries(company_id, fy_id);
      const ledgerRows = await db.all(
        sql`SELECT l.ledger_id, l.name AS ledger_name, l.group_id, l.opening_balance,
                   g.name AS group_name, g.nature
            FROM ${ledgers} l
            LEFT JOIN ${groups} g ON g.group_id = l.group_id
            WHERE l.company_id = ${company_id} AND l.is_active = 1`
      );

      // Sum by group
      const groupMap = {};
      for (const l of ledgerRows) {
        const gname = l.group_name || 'Ungrouped';
        if (!groupMap[l.group_id]) groupMap[l.group_id] = { group_name: gname, debit: 0, credit: 0 };
        const balance = calcLedgerBalance(l.ledger_id, entries, l.opening_balance || 0);
        if (balance > 0) groupMap[l.group_id].debit += balance;
        else groupMap[l.group_id].credit += Math.abs(balance);
      }

      const rows = Object.values(groupMap).sort((a, b) => a.group_name.localeCompare(b.group_name));
      return { success: true, rows };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  /** Statistics — voucher counts by type for a financial year. */
  statistics: async (company_id, fy_id) => {
    try {
      const rows = await db.all(
        sql`SELECT voucher_type AS vch_type, COUNT(*) AS count
            FROM ${vouchers}
            WHERE company_id = ${company_id} AND fy_id = ${fy_id} AND is_cancelled = 0
            GROUP BY voucher_type
            ORDER BY count DESC`
      );
      return { success: true, rows };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  /** Stock Item Summary — inward/outward quantities and closing balance. */
  stockItemSummary: async (company_id, fy_id) => {
    try {
      const { stockItems, stockGroups, voucherStockEntries } = require('../db/schema');
      const INWARD = ['Purchase', 'Receipt Note', 'Rejection In', 'Material In'];
      const OUTWARD = ['Sales', 'Delivery Note', 'Rejection Out', 'Material Out'];
      const rows = await db.all(sql`
        SELECT si.name AS item_name,
               sg.name AS group_name,
               COALESCE(SUM(CASE WHEN v.voucher_type IN (${sql.join(INWARD.map(t => sql`${t}`), sql`, `)}) THEN vse.quantity ELSE 0 END), 0) AS in_qty,
               COALESCE(SUM(CASE WHEN v.voucher_type IN (${sql.join(OUTWARD.map(t => sql`${t}`), sql`, `)}) THEN vse.quantity ELSE 0 END), 0) AS out_qty,
               COALESCE(si.opening_quantity, 0) +
               COALESCE(SUM(CASE WHEN v.voucher_type IN (${sql.join(INWARD.map(t => sql`${t}`), sql`, `)}) THEN vse.quantity ELSE 0 END), 0) -
               COALESCE(SUM(CASE WHEN v.voucher_type IN (${sql.join(OUTWARD.map(t => sql`${t}`), sql`, `)}) THEN vse.quantity ELSE 0 END), 0) AS closing_qty,
               COALESCE(si.opening_quantity, 0) * COALESCE(si.opening_rate, 0) +
               COALESCE(SUM(CASE WHEN v.voucher_type IN (${sql.join(INWARD.map(t => sql`${t}`), sql`, `)}) THEN vse.amount ELSE 0 END), 0) -
               COALESCE(SUM(CASE WHEN v.voucher_type IN (${sql.join(OUTWARD.map(t => sql`${t}`), sql`, `)}) THEN vse.amount ELSE 0 END), 0) AS closing_value
        FROM ${stockItems} si
        LEFT JOIN ${stockGroups} sg ON sg.sg_id = si.stock_group_id
        LEFT JOIN ${voucherStockEntries} vse ON vse.stock_item_id = si.item_id
        LEFT JOIN ${vouchers} v ON v.voucher_id = vse.voucher_id
          AND v.company_id = ${company_id} AND v.fy_id = ${fy_id} AND v.is_cancelled = 0
          AND COALESCE(v.is_optional, 0) = 0 AND COALESCE(v.is_post_dated, 0) = 0
        WHERE si.company_id = ${company_id} AND si.is_active = 1
        GROUP BY si.item_id, si.name, sg.name, si.opening_quantity, si.opening_rate
        ORDER BY si.name ASC`
      );
      const mapped = rows.map(r => ({
        ...r,
        closing_balance: r.closing_qty + ' ' + (r.unit || 'Pcs') + ' @ ' + (r.closing_qty ? (r.closing_value / r.closing_qty).toFixed(2) : '0.00'),
      }));
      return { success: true, rows: mapped };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  /** Stock Group Summary — closing inventory value grouped by stock group. */
  stockGroupSummary: async (company_id, fy_id) => {
    try {
      const { stockItems, stockGroups, voucherStockEntries } = require('../db/schema');
      const INWARD = ['Purchase', 'Receipt Note', 'Rejection In', 'Material In'];
      const OUTWARD = ['Sales', 'Delivery Note', 'Rejection Out', 'Material Out'];
      const rows = await db.all(sql`
        SELECT sg.name AS group_name,
               COALESCE(SUM(
                 si.opening_quantity * COALESCE(si.opening_rate, 0) +
                 COALESCE((SELECT SUM(vse2.amount) FROM ${voucherStockEntries} vse2
                   JOIN ${vouchers} v2 ON v2.voucher_id = vse2.voucher_id
                   WHERE vse2.stock_item_id = si.item_id AND v2.company_id = ${company_id} AND v2.fy_id = ${fy_id}
                     AND v2.voucher_type IN (${sql.join(INWARD.map(t => sql`${t}`), sql`, `)}) AND v2.is_cancelled = 0), 0) -
                 COALESCE((SELECT SUM(vse3.amount) FROM ${voucherStockEntries} vse3
                   JOIN ${vouchers} v3 ON v3.voucher_id = vse3.voucher_id
                   WHERE vse3.stock_item_id = si.item_id AND v3.company_id = ${company_id} AND v3.fy_id = ${fy_id}
                     AND v3.voucher_type IN (${sql.join(OUTWARD.map(t => sql`${t}`), sql`, `)}) AND v3.is_cancelled = 0), 0)
               ), 0) AS value
        FROM ${stockGroups} sg
        LEFT JOIN ${stockItems} si ON si.stock_group_id = sg.sg_id AND si.company_id = ${company_id} AND si.is_active = 1
        WHERE sg.company_id = ${company_id} AND sg.is_active = 1
        GROUP BY sg.sg_id, sg.name
        ORDER BY sg.name ASC`
      );
      return { success: true, rows };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  /** Stock Category Summary — closing inventory value by stock category. */
  stockCategorySummary: async (company_id, fy_id) => {
    try {
      const { stockItems, stockCategories, voucherStockEntries } = require('../db/schema');
      const INWARD = ['Purchase', 'Receipt Note', 'Rejection In', 'Material In'];
      const OUTWARD = ['Sales', 'Delivery Note', 'Rejection Out', 'Material Out'];
      const rows = await db.all(sql`
        SELECT COALESCE(sc.name, 'No Category') AS category_name,
               SUM(
                 COALESCE((SELECT SUM(vse2.quantity) FROM ${voucherStockEntries} vse2
                   JOIN ${vouchers} v2 ON v2.voucher_id = vse2.voucher_id
                   WHERE vse2.stock_item_id = si.item_id AND v2.company_id = ${company_id} AND v2.fy_id = ${fy_id}
                     AND v2.voucher_type IN (${sql.join(INWARD.map(t => sql`${t}`), sql`, `)}) AND v2.is_cancelled = 0), 0) -
                 COALESCE((SELECT SUM(vse3.quantity) FROM ${voucherStockEntries} vse3
                   JOIN ${vouchers} v3 ON v3.voucher_id = vse3.voucher_id
                   WHERE vse3.stock_item_id = si.item_id AND v3.company_id = ${company_id} AND v3.fy_id = ${fy_id}
                     AND v3.voucher_type IN (${sql.join(OUTWARD.map(t => sql`${t}`), sql`, `)}) AND v3.is_cancelled = 0), 0)
               ) AS qty,
               SUM(
                 COALESCE((SELECT SUM(vse4.amount) FROM ${voucherStockEntries} vse4
                   JOIN ${vouchers} v4 ON v4.voucher_id = vse4.voucher_id
                   WHERE vse4.stock_item_id = si.item_id AND v4.company_id = ${company_id} AND v4.fy_id = ${fy_id}
                     AND v4.voucher_type IN (${sql.join(INWARD.map(t => sql`${t}`), sql`, `)}) AND v4.is_cancelled = 0), 0) -
                 COALESCE((SELECT SUM(vse5.amount) FROM ${voucherStockEntries} vse5
                   JOIN ${vouchers} v5 ON v5.voucher_id = vse5.voucher_id
                   WHERE vse5.stock_item_id = si.item_id AND v5.company_id = ${company_id} AND v5.fy_id = ${fy_id}
                     AND v5.voucher_type IN (${sql.join(OUTWARD.map(t => sql`${t}`), sql`, `)}) AND v5.is_cancelled = 0), 0)
               ) AS value
        FROM ${stockItems} si
        LEFT JOIN ${stockCategories} sc ON sc.sc_id = si.stock_category_id
        WHERE si.company_id = ${company_id} AND si.is_active = 1
        GROUP BY sc.sc_id, sc.name
        ORDER BY category_name ASC`
      );
      return { success: true, rows };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  /** Cost Category Summary — debit/credit totals by cost centre grouped by category. */
  costCategorySummary: async (company_id, fy_id) => {
    try {
      const { costCentres } = require('../db/schema');
      const rows = await db.all(sql`
        SELECT COALESCE(cc.cost_category, 'General') AS category_name,
               SUM(CASE WHEN ve.type = 'Dr' THEN ve.amount ELSE 0 END) AS debit,
               SUM(CASE WHEN ve.type = 'Cr' THEN ve.amount ELSE 0 END) AS credit
        FROM ${voucherEntries} ve
        INNER JOIN ${vouchers} v ON v.voucher_id = ve.voucher_id
        LEFT JOIN ${costCentres} cc ON cc.cost_centre_id = ve.cost_centre_id
        WHERE v.company_id = ${company_id} AND v.fy_id = ${fy_id} AND v.is_cancelled = 0
          AND ve.cost_centre_id IS NOT NULL
        GROUP BY cc.cost_category
        ORDER BY category_name ASC`
      );
      return { success: true, rows };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },
};
