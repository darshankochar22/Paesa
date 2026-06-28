/**
 * voucherQueryService.js
 *
 * Core voucher and ledger queries:
 *   1. queryVouchers       -- vouchers with optional type / date / party filters
 *   2. queryLedgerBalances -- ledger balance queries with optional filters
 *   3. aggregateByGroup    -- group and aggregate voucher entry data
 *   4. aggregateByPeriod   -- monthly / quarterly / yearly aggregation
 */
const {
  db, sql,
  baseVoucherFilter,
  normalizeType,
} = require('./reportHelpers');
const {
  vouchers,
  voucherEntries,
  ledgers,
  groups,
} = require('../../db/schema');

// ---------------------------------------------------------------------------
// 1. queryVouchers -- query vouchers with optional type / date / party filters
// ---------------------------------------------------------------------------
const queryVouchers = async (company_id, fy_id, filters = {}) => {
  try {
    const conditions = baseVoucherFilter(company_id, fy_id);

    if (filters.voucher_type) {
      conditions.push(sql`v.voucher_type = ${filters.voucher_type}`);
    }
    if (filters.from_date) {
      conditions.push(sql`v.date >= ${filters.from_date}`);
    }
    if (filters.to_date) {
      conditions.push(sql`v.date <= ${filters.to_date}`);
    }
    if (filters.party_ledger_id) {
      conditions.push(sql`v.party_ledger_id = ${filters.party_ledger_id}`);
    }
    if (filters.party_name) {
      conditions.push(sql`v.party_name LIKE ${'%' + filters.party_name + '%'}`);
    }
    if (filters.min_amount != null) {
      conditions.push(sql`(SELECT COALESCE(SUM(ve.amount), 0) FROM ${voucherEntries} ve WHERE ve.voucher_id = v.voucher_id AND ve.type = 'Dr') >= ${filters.min_amount}`);
    }
    if (filters.max_amount != null) {
      conditions.push(sql`(SELECT COALESCE(SUM(ve.amount), 0) FROM ${voucherEntries} ve WHERE ve.voucher_id = v.voucher_id AND ve.type = 'Dr') <= ${filters.max_amount}`);
    }

    const rows = await db.all(
      sql`SELECT
            v.voucher_id,
            v.voucher_type,
            v.voucher_number,
            v.date,
            v.party_name,
            v.party_ledger_id,
            v.narration,
            v.supplier_invoice_no,
            v.is_invoice,
            COALESCE((SELECT SUM(ve.amount) FROM ${voucherEntries} ve WHERE ve.voucher_id = v.voucher_id AND ve.type = 'Dr'), 0) AS debit_total,
            COALESCE((SELECT SUM(ve.amount) FROM ${voucherEntries} ve WHERE ve.voucher_id = v.voucher_id AND ve.type = 'Cr'), 0) AS credit_total
          FROM ${vouchers} v
          WHERE ${sql.join(conditions, sql` AND `)}
          ORDER BY v.date DESC, v.voucher_id DESC`
    );

    return { success: true, rows };
  } catch (err) {
    return { success: false, error: err.message };
  }
};

// ---------------------------------------------------------------------------
// 2. queryLedgerBalances -- ledger balance queries with optional filters
// ---------------------------------------------------------------------------
const queryLedgerBalances = async (company_id, fy_id, filters = {}) => {
  try {
    // Step 1: Fetch all voucher entries for the period
    const entryConditions = [
      sql`v.company_id = ${company_id}`,
      sql`v.fy_id = ${fy_id}`,
      sql`v.is_cancelled = 0`,
      sql`COALESCE(v.is_optional, 0) = 0`,
      sql`COALESCE(v.is_post_dated, 0) = 0`,
    ];
    if (filters.from_date) entryConditions.push(sql`v.date >= ${filters.from_date}`);
    if (filters.to_date)   entryConditions.push(sql`v.date <= ${filters.to_date}`);

    const entries = await db.all(
      sql`SELECT ve.ledger_id, ve.type, ve.amount
          FROM ${voucherEntries} ve
          INNER JOIN ${vouchers} v ON v.voucher_id = ve.voucher_id
          WHERE ${sql.join(entryConditions, sql` AND `)}`
    );

    // Step 2: Calculate balances per ledger in JavaScript
    const balanceMap = {};
    for (const e of entries) {
      if (!balanceMap[e.ledger_id]) balanceMap[e.ledger_id] = { debit: 0, credit: 0 };
      if (e.type === 'Dr') balanceMap[e.ledger_id].debit += Number(e.amount) || 0;
      else balanceMap[e.ledger_id].credit += Number(e.amount) || 0;
    }

    // Step 3: Fetch ledgers with group info
    const ledgerConditions = [
      sql`l.company_id = ${company_id}`,
      sql`l.is_active = 1`,
    ];
    if (filters.group_id) ledgerConditions.push(sql`l.group_id = ${filters.group_id}`);
    if (filters.nature) ledgerConditions.push(sql`g.nature = ${filters.nature}`);
    if (filters.ledger_type) ledgerConditions.push(sql`l.ledger_type = ${filters.ledger_type}`);

    const ledgerRows = await db.all(
      sql`SELECT l.ledger_id, l.name AS ledger_name, l.opening_balance, l.opening_balance_type, l.ledger_type,
                 g.name AS group_name, g.nature
          FROM ${ledgers} l
          LEFT JOIN ${groups} g ON g.group_id = l.group_id
          WHERE ${sql.join(ledgerConditions, sql` AND `)}
          ORDER BY g.name ASC, l.name ASC`
    );

    // Step 4: Combine opening balance + entries to get closing balance
    const mapped = ledgerRows.map(l => {
      const rawOpening = Number(l.opening_balance) || 0;
      const opening = rawOpening < 0
        ? rawOpening
        : (l.opening_balance_type === 'Cr' ? -rawOpening : rawOpening);
      const bal = balanceMap[l.ledger_id] || { debit: 0, credit: 0 };
      const closing = opening + bal.debit - bal.credit;
      return {
        ledger_id: l.ledger_id,
        ledger_name: l.ledger_name,
        group_name: l.group_name || 'Ungrouped',
        nature: l.nature,
        ledger_type: l.ledger_type,
        opening_balance: opening,
        closing_balance: closing,
        debit: closing > 0 ? closing : 0,
        credit: closing < 0 ? Math.abs(closing) : 0,
      };
    });

    return { success: true, rows: mapped };
  } catch (err) {
    return { success: false, error: err.message };
  }
};

// ---------------------------------------------------------------------------
// 3. aggregateByGroup -- group and aggregate voucher entry data
//    groupField: 'group' | 'nature' | 'voucher_type' | 'ledger_type'
// ---------------------------------------------------------------------------
const aggregateByGroup = async (company_id, fy_id, groupField = 'group') => {
  try {
    let selectExpr, groupByExpr, orderByExpr;

    switch (groupField) {
      case 'nature':
        selectExpr = sql`COALESCE(g.nature, 'Unknown') AS group_label`;
        groupByExpr = sql`g.nature`;
        orderByExpr = sql`g.nature ASC`;
        break;
      case 'voucher_type':
        selectExpr = sql`v.voucher_type AS group_label`;
        groupByExpr = sql`v.voucher_type`;
        orderByExpr = sql`v.voucher_type ASC`;
        break;
      case 'ledger_type':
        selectExpr = sql`COALESCE(l.ledger_type, 'General') AS group_label`;
        groupByExpr = sql`l.ledger_type`;
        orderByExpr = sql`l.ledger_type ASC`;
        break;
      default: // 'group'
        selectExpr = sql`COALESCE(g.name, 'Ungrouped') AS group_label`;
        groupByExpr = sql`g.group_id`;
        orderByExpr = sql`g.name ASC`;
        break;
    }

    const rows = await db.all(
      sql`SELECT
            ${selectExpr},
            SUM(CASE WHEN ve.type = 'Dr' THEN ve.amount ELSE 0 END) AS total_debit,
            SUM(CASE WHEN ve.type = 'Cr' THEN ve.amount ELSE 0 END) AS total_credit,
            COUNT(DISTINCT ve.ledger_id) AS ledger_count,
            SUM(CASE WHEN ve.type = 'Dr' THEN ve.amount ELSE 0 END)
              - SUM(CASE WHEN ve.type = 'Cr' THEN ve.amount ELSE 0 END) AS net
          FROM ${voucherEntries} ve
          INNER JOIN ${vouchers} v ON v.voucher_id = ve.voucher_id
          LEFT JOIN ${ledgers} l ON l.ledger_id = ve.ledger_id
          LEFT JOIN ${groups} g ON g.group_id = l.group_id
          WHERE v.company_id = ${company_id}
            AND v.fy_id = ${fy_id}
            AND v.is_cancelled = 0
            AND COALESCE(v.is_optional, 0) = 0
            AND COALESCE(v.is_post_dated, 0) = 0
          GROUP BY ${groupByExpr}
          ORDER BY ${orderByExpr}`
    );

    return { success: true, rows };
  } catch (err) {
    return { success: false, error: err.message };
  }
};

// ---------------------------------------------------------------------------
// 4. aggregateByPeriod -- monthly / quarterly / yearly aggregation
//    periodType: 'monthly' | 'quarterly' | 'yearly'
// ---------------------------------------------------------------------------
const aggregateByPeriod = async (company_id, fy_id, periodType = 'monthly') => {
  try {
    let periodExpr, periodLabel, periodOrder;

    switch (periodType) {
      case 'quarterly':
        periodExpr = sql`CAST((CAST(substr(v.date, 6, 2) AS INTEGER) - 1) / 3 + 1 AS TEXT)`;
        periodLabel = sql`'Q' || CAST((CAST(substr(v.date, 6, 2) AS INTEGER) - 1) / 3 + 1 AS TEXT) || ' ' || substr(v.date, 1, 4) AS period_label`;
        periodOrder = sql`substr(v.date, 1, 4) ASC, CAST((CAST(substr(v.date, 6, 2) AS INTEGER) - 1) / 3 + 1 AS INTEGER) ASC`;
        break;
      case 'yearly':
        periodExpr = sql`substr(v.date, 1, 4)`;
        periodLabel = sql`substr(v.date, 1, 4) AS period_label`;
        periodOrder = sql`substr(v.date, 1, 4) ASC`;
        break;
      default: // 'monthly'
        periodExpr = sql`substr(v.date, 1, 7)`;
        periodLabel = sql`substr(v.date, 1, 7) AS period_label`;
        periodOrder = sql`substr(v.date, 1, 7) ASC`;
        break;
    }

    const rows = await db.all(
      sql`SELECT
            ${periodLabel},
            SUM(CASE WHEN ve.type = 'Dr' THEN ve.amount ELSE 0 END) AS total_debit,
            SUM(CASE WHEN ve.type = 'Cr' THEN ve.amount ELSE 0 END) AS total_credit,
            COUNT(DISTINCT v.voucher_id) AS voucher_count,
            SUM(CASE WHEN ve.type = 'Dr' THEN ve.amount ELSE 0 END)
              - SUM(CASE WHEN ve.type = 'Cr' THEN ve.amount ELSE 0 END) AS net
          FROM ${voucherEntries} ve
          INNER JOIN ${vouchers} v ON v.voucher_id = ve.voucher_id
          WHERE v.company_id = ${company_id}
            AND v.fy_id = ${fy_id}
            AND v.is_cancelled = 0
            AND COALESCE(v.is_optional, 0) = 0
            AND COALESCE(v.is_post_dated, 0) = 0
          GROUP BY ${periodExpr}
          ORDER BY ${periodOrder}`
    );

    return { success: true, rows };
  } catch (err) {
    return { success: false, error: err.message };
  }
};

module.exports = {
  queryVouchers,
  queryLedgerBalances,
  aggregateByGroup,
  aggregateByPeriod,
};
