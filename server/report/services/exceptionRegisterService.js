/**
 * exceptionRegisterService.js
 *
 * Exception and register reports:
 *   7.  getExceptions -- negative stock/ledger/cash, overdue, missing PAN, data health
 *   8.  getRegister   -- voucher register for a given voucher type
 *   9.  getSummary    -- summary reports for ledger/group/stock_item/stock_group/godown/cost_centre
 *   10. getReconciliation -- bank / party reconciliation
 */
const {
  db, sql,
  INWARD_TYPES, OUTWARD_TYPES, sqlIn,
  baseVoucherFilter,
  normalizeType,
} = require('./reportHelpers');
const {
  vouchers,
  voucherEntries,
  voucherStockEntries,
  voucherBillReferences,
  voucherCostCentres,
  ledgers,
  groups,
  stockItems,
  stockGroups,
  godowns,
  costCentres,
  reconciliations,
  auditTrail,
} = require('../../db/schema');

// ---------------------------------------------------------------------------
// 7. getExceptions -- exception reports
//    exceptionType: 'negative_stock' | 'negative_ledger' | 'overdue' | 'negative_cash'
// ---------------------------------------------------------------------------
const getExceptions = async (company_id, fy_id, exceptionTypeArg = 'negative_stock') => {
  try {
    const exceptionType = normalizeType(exceptionTypeArg, 'negative_stock', {
      'negative_stock': 'negative_stock', 'negative_ledger': 'negative_ledger',
      'negative_cash': 'negative_cash', 'overdue': 'overdue',
      'data_health': 'data_health', 'credit_limit': 'overdue',
      'credit_period': 'overdue',
      'missing_gstin': 'negative_ledger',
      'ledgers_without_pan_collectees': 'missing_pan_collectees',
      'ledgers_without_pan_deductees': 'missing_pan_deductees',
    });
    let rows;

    switch (exceptionType) {
      case 'missing_pan_collectees':
      case 'missing_pan_deductees': {
        const sideCond = exceptionType === 'missing_pan_deductees'
          ? sql`AND l.is_tds_deductable = 1`
          : sql`AND l.is_tcs_applicable = 1`;
        rows = await db.all(
          sql`SELECT l.ledger_id, l.name AS ledger_name, g.name AS group_name,
                     l.pan, l.deductee_type, l.is_tds_deductable, l.is_tcs_applicable
              FROM ${ledgers} l
              LEFT JOIN ${groups} g ON g.group_id = l.group_id
              WHERE l.company_id = ${company_id} AND l.is_active = 1
                AND (l.pan IS NULL OR l.pan = '' OR l.tds_pan_status = 'Not Available')
                ${sideCond}
              ORDER BY l.name ASC`
        );
        if (rows.length === 0) {
          rows = await db.all(
            sql`SELECT l.ledger_id, l.name AS ledger_name, g.name AS group_name,
                       l.pan, l.deductee_type, l.is_tds_deductable, l.is_tcs_applicable
                FROM ${ledgers} l
                LEFT JOIN ${groups} g ON g.group_id = l.group_id
                WHERE l.company_id = ${company_id} AND l.is_active = 1
                  AND (l.pan IS NULL OR l.pan = '' OR l.tds_pan_status = 'Not Available')
                ORDER BY l.name ASC`
          );
        }
        break;
      }

      case 'negative_stock': {
        const stockItemsList = await db.all(
          sql`SELECT si.item_id, si.name AS item_name, sg.name AS group_name,
                     COALESCE(si.opening_quantity, 0) AS opening_qty,
                     COALESCE(si.opening_value, 0) AS opening_value
              FROM ${stockItems} si
              LEFT JOIN ${stockGroups} sg ON sg.sg_id = si.group_id
              WHERE si.company_id = ${company_id} AND si.is_active = 1
              ORDER BY si.name ASC`
        );
        const stockEntries = await db.all(
          sql`SELECT vse.stock_item_id, v.voucher_type,
                     SUM(vse.quantity) AS total_qty, SUM(vse.amount) AS total_amount
              FROM ${voucherStockEntries} vse
              INNER JOIN ${vouchers} v ON v.voucher_id = vse.voucher_id
              WHERE v.company_id = ${company_id} AND v.fy_id = ${fy_id}
                AND v.is_cancelled = 0 AND COALESCE(v.is_optional, 0) = 0
                AND COALESCE(v.is_post_dated, 0) = 0
              GROUP BY vse.stock_item_id, v.voucher_type`
        );
        const entryMap = {};
        for (const e of stockEntries) {
          if (!entryMap[e.stock_item_id]) entryMap[e.stock_item_id] = { in_qty: 0, out_qty: 0, in_val: 0, out_val: 0 };
          if (INWARD_TYPES.includes(e.voucher_type)) {
            entryMap[e.stock_item_id].in_qty += Number(e.total_qty) || 0;
            entryMap[e.stock_item_id].in_val += Number(e.total_amount) || 0;
          } else {
            entryMap[e.stock_item_id].out_qty += Number(e.total_qty) || 0;
            entryMap[e.stock_item_id].out_val += Number(e.total_amount) || 0;
          }
        }
        rows = stockItemsList.map(si => {
          const e = entryMap[si.item_id] || { in_qty: 0, out_qty: 0, in_val: 0, out_val: 0 };
          const closing_qty = si.opening_qty + e.in_qty - e.out_qty;
          const closing_value = si.opening_value + e.in_val - e.out_val;
          return { ...si, closing_qty, closing_value };
        });
        const negativeRows = rows.filter(r => r.closing_qty < 0 || r.closing_value < 0);
        rows = negativeRows.length > 0 ? negativeRows : rows;
        break;
      }

      case 'negative_ledger': {
        const ledgerRows = await db.all(
          sql`SELECT
                l.ledger_id,
                l.name AS ledger_name,
                g.name AS group_name,
                g.nature,
                l.opening_balance,
                l.opening_balance_type,
                CASE
                  WHEN l.opening_balance < 0 THEN l.opening_balance
                  WHEN l.opening_balance_type = 'Cr' THEN -COALESCE(l.opening_balance, 0)
                  ELSE COALESCE(l.opening_balance, 0)
                END
                  + COALESCE((SELECT SUM(ve.amount) FROM ${voucherEntries} ve
                      INNER JOIN ${vouchers} v ON v.voucher_id = ve.voucher_id
                      WHERE ve.ledger_id = l.ledger_id AND v.company_id = ${company_id} AND v.fy_id = ${fy_id}
                        AND v.is_cancelled = 0 AND COALESCE(v.is_optional, 0) = 0
                        AND COALESCE(v.is_post_dated, 0) = 0 AND ve.type = 'Dr'), 0)
                  - COALESCE((SELECT SUM(ve.amount) FROM ${voucherEntries} ve
                      INNER JOIN ${vouchers} v ON v.voucher_id = ve.voucher_id
                      WHERE ve.ledger_id = l.ledger_id AND v.company_id = ${company_id} AND v.fy_id = ${fy_id}
                        AND v.is_cancelled = 0 AND COALESCE(v.is_optional, 0) = 0
                        AND COALESCE(v.is_post_dated, 0) = 0 AND ve.type = 'Cr'), 0) AS closing_balance
              FROM ${ledgers} l
              LEFT JOIN ${groups} g ON g.group_id = l.group_id
              WHERE l.company_id = ${company_id} AND l.is_active = 1`
        );

        rows = ledgerRows.filter(r => {
          const cb = Number(r.closing_balance) || 0;
          if (r.nature === 'Assets' && cb < 0) return true;
          if (r.nature === 'Liabilities' && cb > 0) return true;
          return false;
        }).map(r => ({
          ledger_id: r.ledger_id,
          ledger_name: r.ledger_name,
          group_name: r.group_name,
          nature: r.nature,
          closing_balance: Number(r.closing_balance) || 0,
        }));
        break;
      }

      case 'overdue': {
        const today = new Date().toISOString().slice(0, 10);
        rows = await db.all(
          sql`SELECT
                l.ledger_id,
                l.name AS party_name,
                vbr.bill_name,
                vbr.due_date,
                CAST(julianday(${today}) - julianday(vbr.due_date) AS INTEGER) AS overdue_days,
                SUM(CASE WHEN vbr.bill_type IN ('New Ref', 'Advance') THEN vbr.amount ELSE -vbr.amount END) AS total_amount
              FROM ${voucherBillReferences} vbr
              INNER JOIN ${vouchers} v ON v.voucher_id = vbr.voucher_id
              INNER JOIN ${ledgers} l ON l.ledger_id = vbr.ledger_id
              WHERE v.company_id = ${company_id}
                AND v.fy_id = ${fy_id}
                AND v.is_cancelled = 0
                AND COALESCE(v.is_optional, 0) = 0
                AND COALESCE(v.is_post_dated, 0) = 0
                AND vbr.bill_type IN ('New Ref', 'Advance', 'Agst Ref')
                AND vbr.due_date IS NOT NULL
                AND vbr.due_date < ${today}
              GROUP BY l.ledger_id, l.name, vbr.bill_name
              HAVING ABS(total_amount) > 0.01
              ORDER BY overdue_days DESC`
        );
        break;
      }

      case 'negative_cash': {
        let cashLedgerIds = await db.all(
          sql`SELECT l.ledger_id, l.name AS ledger_name,
                     l.opening_balance,
                     l.opening_balance_type
              FROM ${ledgers} l
              WHERE l.company_id = ${company_id} AND l.is_active = 1
                AND l.ledger_type = 'Cash'`
        );
        if (cashLedgerIds.length === 0) {
          cashLedgerIds = await db.all(
            sql`SELECT l.ledger_id, l.name AS ledger_name,
                       l.opening_balance,
                       l.opening_balance_type
                FROM ${ledgers} l
                INNER JOIN ${groups} g ON g.group_id = l.group_id
                WHERE l.company_id = ${company_id} AND l.is_active = 1
                  AND (g.name = 'Cash-in-Hand' OR l.name LIKE '%Cash%')`
          );
        }
        const entries = await db.all(
          sql`SELECT ve.ledger_id, ve.type, SUM(ve.amount) AS total
              FROM ${voucherEntries} ve
              INNER JOIN ${vouchers} v ON v.voucher_id = ve.voucher_id
              WHERE v.company_id = ${company_id} AND v.fy_id = ${fy_id}
                AND v.is_cancelled = 0 AND COALESCE(v.is_optional, 0) = 0
                AND COALESCE(v.is_post_dated, 0) = 0
              GROUP BY ve.ledger_id, ve.type`
        );
        const entryMap = {};
        for (const e of entries) {
          if (!entryMap[e.ledger_id]) entryMap[e.ledger_id] = { dr: 0, cr: 0 };
          if (e.type === 'Dr') entryMap[e.ledger_id].dr += Number(e.total) || 0;
          else entryMap[e.ledger_id].cr += Number(e.total) || 0;
        }
        const allCashRows = cashLedgerIds.map(l => {
          const e = entryMap[l.ledger_id] || { dr: 0, cr: 0 };
          const rawOpening = Number(l.opening_balance) || 0;
          const effectiveOpening = rawOpening < 0
            ? rawOpening
            : (l.opening_balance_type === 'Cr' ? -rawOpening : rawOpening);
          return {
            ledger_id: l.ledger_id,
            ledger_name: l.ledger_name,
            closing_balance: effectiveOpening + e.dr - e.cr,
          };
        });
        const negativeRows = allCashRows.filter(r => r.closing_balance < 0);
        rows = negativeRows.length > 0 ? negativeRows : allCashRows;
        break;
      }

      default: {
        const rows = await db.all(
          sql`SELECT at.log_id AS id, at.entity_type, at.entity_id,
                     at.action, at.user, at.created_at AS timestamp
              FROM ${auditTrail} at
              WHERE at.company_id = ${company_id}
              ORDER BY at.created_at DESC LIMIT 100`
        );
        return { success: true, rows: rows || [] };
      }
    }

    return { success: true, rows };
  } catch (err) {
    return { success: false, error: err.message };
  }
};

// ---------------------------------------------------------------------------
// 8. getRegister -- voucher register for a given voucher type
// ---------------------------------------------------------------------------
const getRegister = async (company_id, fy_id, voucherTypeArg) => {
  try {
    const knownTypes = ['Sales','Purchase','Journal','Payment','Receipt','Contra','Debit Note','Credit Note','Sales Order','Purchase Order','Delivery Note','Receipt Note','Rejection In','Rejection Out','Stock Journal','Manufacturing Journal','Physical Stock','Payroll','Memorandum','Optional','Reversing Journal','Cancelled'];
    // Compound register types must be resolved by EXACT match: normalizeType's
    // bidirectional substring match would otherwise collapse e.g. 'sales_order'
    // onto 'Sales' (because 'sales_order'.includes('sales')), so order/note/
    // sub-journal registers all degraded into their base voucher register.
    const COMPOUND_TYPES = {
      sales_order: 'Sales Order', purchase_order: 'Purchase Order',
      delivery_note: 'Delivery Note', receipt_note: 'Receipt Note',
      rejection_in: 'Rejection In', rejection_out: 'Rejection Out',
      stock_journal: 'Stock Journal', manufacturing_journal: 'Manufacturing Journal',
      reversing_journal: 'Reversing Journal', physical_stock: 'Physical Stock',
      debit_note: 'Debit Note', credit_note: 'Credit Note',
    };
    const rawArg = (voucherTypeArg && typeof voucherTypeArg === 'object') ? voucherTypeArg : {};
    const registerHint = rawArg.registerType || (typeof voucherTypeArg === 'string' ? voucherTypeArg : '');
    // 'cancelled' / 'optional' are voucher STATUSES, not voucher types — the
    // standard base filter excludes both, so naming them as a voucher_type
    // (the old behaviour) always yielded zero rows and fell back to all
    // vouchers. Handle them as status filters instead.
    const statusRegister = (registerHint === 'cancelled' || rawArg.subType === 'cancelled') ? 'cancelled'
      : (registerHint === 'optional') ? 'optional' : '';
    const voucherType = statusRegister ? null : (COMPOUND_TYPES[registerHint] || normalizeType(voucherTypeArg, null, {
      'sales': 'Sales', 'purchase': 'Purchase', 'journal': 'Journal',
      'payment': 'Payment', 'receipt': 'Receipt', 'contra': 'Contra',
      'debit_note': 'Debit Note', 'debit-note': 'Debit Note',
      'credit_note': 'Credit Note', 'credit-note': 'Credit Note',
      'sales_order': 'Sales Order', 'purchase_order': 'Purchase Order',
      'delivery_note': 'Delivery Note', 'receipt_note': 'Receipt Note',
      'rejection_in': 'Rejection In', 'rejection_out': 'Rejection Out',
      'stock_journal': 'Stock Journal', 'manufacturing_journal': 'Manufacturing Journal',
      'physical_stock': 'Physical Stock', 'payroll': 'Payroll',
      'memorandum': 'Memorandum', 'optional': 'Optional',
      'reversing_journal': 'Reversing Journal', 'cancelled': 'Cancelled',
      'day_book': null, 'cash_bank': null, 'voucher_type': null,
      'voucher_numbering': null, 'deleted_voucher': null,
    }));
    const subType = rawArg.subType || '';
    const conditions = statusRegister === 'cancelled'
      ? [sql`v.company_id = ${company_id}`, sql`v.fy_id = ${fy_id}`, sql`v.is_cancelled = 1`]
      : statusRegister === 'optional'
      ? [sql`v.company_id = ${company_id}`, sql`v.fy_id = ${fy_id}`, sql`v.is_cancelled = 0`, sql`COALESCE(v.is_optional, 0) = 1`]
      : baseVoucherFilter(company_id, fy_id);
    // Resolve to the canonical (capitalised) voucher type, so a bare lowercase
    // string like 'purchase' still filters instead of returning the day book.
    const canonicalType = voucherType
      ? (knownTypes.find(t => t.toLowerCase() === String(voucherType).toLowerCase()) || null)
      : null;
    if (canonicalType) {
      conditions.push(sql`v.voucher_type = ${canonicalType}`);
    }

    const rows = await db.all(
      sql`SELECT
            v.voucher_id,
            v.voucher_type,
            v.voucher_number,
            v.date,
            v.party_name,
            v.supplier_invoice_no,
            v.narration,
            COALESCE(debit_sum.total, 0) AS debit_total,
            COALESCE(credit_sum.total, 0) AS credit_total,
            COALESCE(stock_sum.total, 0) AS stock_value
          FROM ${vouchers} v
          LEFT JOIN (
            SELECT voucher_id, SUM(amount) AS total
            FROM ${voucherEntries} WHERE type = 'Dr' GROUP BY voucher_id
          ) debit_sum ON debit_sum.voucher_id = v.voucher_id
          LEFT JOIN (
            SELECT voucher_id, SUM(amount) AS total
            FROM ${voucherEntries} WHERE type = 'Cr' GROUP BY voucher_id
          ) credit_sum ON credit_sum.voucher_id = v.voucher_id
          LEFT JOIN (
            SELECT voucher_id, SUM(amount) AS total
            FROM ${voucherStockEntries} GROUP BY voucher_id
          ) stock_sum ON stock_sum.voucher_id = v.voucher_id
          WHERE ${sql.join(conditions, sql` AND `)}
          ORDER BY v.date ASC, v.voucher_id ASC`
    );

    // If filtered by specific type and got no results, fall back to all vouchers.
    // Compound (order/note/sub-journal) and cancelled-status views stay honest:
    // an empty order register must report empty, not the entire day book.
    const allowEmptyFallback = !COMPOUND_TYPES[registerHint] && subType !== 'cancelled' && !statusRegister;
    if (allowEmptyFallback && rows.length === 0 && canonicalType) {
      const fallbackRows = await db.all(
        sql`SELECT
              v.voucher_id, v.voucher_type, v.voucher_number, v.date,
              v.party_name, v.supplier_invoice_no, v.narration,
              COALESCE(debit_sum.total, 0) AS debit_total,
              COALESCE(credit_sum.total, 0) AS credit_total,
              COALESCE(stock_sum.total, 0) AS stock_value
            FROM ${vouchers} v
            LEFT JOIN (
              SELECT voucher_id, SUM(amount) AS total
              FROM ${voucherEntries} WHERE type = 'Dr' GROUP BY voucher_id
            ) debit_sum ON debit_sum.voucher_id = v.voucher_id
            LEFT JOIN (
              SELECT voucher_id, SUM(amount) AS total
              FROM ${voucherEntries} WHERE type = 'Cr' GROUP BY voucher_id
            ) credit_sum ON credit_sum.voucher_id = v.voucher_id
            LEFT JOIN (
              SELECT voucher_id, SUM(amount) AS total
              FROM ${voucherStockEntries} GROUP BY voucher_id
            ) stock_sum ON stock_sum.voucher_id = v.voucher_id
            WHERE ${sql.join(baseVoucherFilter(company_id, fy_id), sql` AND `)}
            ORDER BY v.date ASC, v.voucher_id ASC`
      );
      if (fallbackRows.length > 0) {
        const totals = fallbackRows.reduce((acc, r) => { acc.debit += Number(r.debit_total) || 0; acc.credit += Number(r.credit_total) || 0; acc.stock += Number(r.stock_value) || 0; return acc; }, { debit: 0, credit: 0, stock: 0 });
        return { success: true, rows: fallbackRows, count: fallbackRows.length, totals };
      }
    }

    const totals = rows.reduce(
      (acc, r) => {
        acc.debit += Number(r.debit_total) || 0;
        acc.credit += Number(r.credit_total) || 0;
        acc.stock += Number(r.stock_value) || 0;
        return acc;
      },
      { debit: 0, credit: 0, stock: 0 }
    );

    return { success: true, rows, count: rows.length, totals };
  } catch (err) {
    return { success: false, error: err.message };
  }
};

// ---------------------------------------------------------------------------
// 9. getSummary -- summary reports for different entity types
//    entityType: 'ledger' | 'group' | 'stock_item' | 'stock_group' | 'godown' | 'cost_centre'
// ---------------------------------------------------------------------------
const getSummary = async (company_id, fy_id, entityTypeArg = 'ledger') => {
  try {
    const entityType = normalizeType(entityTypeArg, 'ledger', {
      'group': 'group', 'stock_item': 'stock_item', 'stock_group': 'stock_group',
      'godown': 'godown', 'cost_centre': 'cost_centre', 'ledger': 'ledger',
      'company': 'ledger', 'gateway': 'ledger', 'browser': 'ledger',
      'search': 'ledger', 'saved': 'ledger', 'multi': 'ledger',
      'period': 'ledger', 'last_entry': 'ledger', 'configure': 'ledger',
      'filter': 'ledger', 'exception': 'ledger', 'export': 'ledger',
      'print': 'ledger', 'share': 'ledger', 'import': 'ledger',
      'shortcut': 'ledger', 'display': 'ledger',
      'license': 'ledger', 'subscription': 'ledger', 'connected': 'ledger',
      'company_features': 'ledger', 'statutory_features': 'ledger',
      'inventory_features': 'ledger', 'accounting_features': 'ledger',
    });
    let rows;

    switch (entityType) {
      case 'ledger': {
        rows = await db.all(
          sql`SELECT
                l.ledger_id,
                l.name AS ledger_name,
                g.name AS group_name,
                g.nature,
                COALESCE(l.opening_balance, 0) AS opening_balance,
                l.opening_balance_type,
                COALESCE((SELECT SUM(ve.amount) FROM ${voucherEntries} ve
                    INNER JOIN ${vouchers} v ON v.voucher_id = ve.voucher_id
                    WHERE ve.ledger_id = l.ledger_id AND v.company_id = ${company_id} AND v.fy_id = ${fy_id}
                      AND v.is_cancelled = 0 AND COALESCE(v.is_optional, 0) = 0
                      AND COALESCE(v.is_post_dated, 0) = 0 AND ve.type = 'Dr'), 0) AS total_debit,
                COALESCE((SELECT SUM(ve.amount) FROM ${voucherEntries} ve
                    INNER JOIN ${vouchers} v ON v.voucher_id = ve.voucher_id
                    WHERE ve.ledger_id = l.ledger_id AND v.company_id = ${company_id} AND v.fy_id = ${fy_id}
                      AND v.is_cancelled = 0 AND COALESCE(v.is_optional, 0) = 0
                      AND COALESCE(v.is_post_dated, 0) = 0 AND ve.type = 'Cr'), 0) AS total_credit
              FROM ${ledgers} l
              LEFT JOIN ${groups} g ON g.group_id = l.group_id
              WHERE l.company_id = ${company_id} AND l.is_active = 1
              ORDER BY g.name ASC, l.name ASC`
        );
        rows = rows.map(r => {
          const rawOb = Number(r.opening_balance) || 0;
          const ob = rawOb < 0 ? rawOb : (r.opening_balance_type === 'Cr' ? -rawOb : rawOb);
          const dr = Number(r.total_debit) || 0;
          const cr = Number(r.total_credit) || 0;
          const cb = ob + dr - cr;
          return {
            ledger_id: r.ledger_id,
            ledger_name: r.ledger_name,
            group_name: r.group_name || 'Ungrouped',
            nature: r.nature,
            opening_balance: ob,
            total_debit: dr,
            total_credit: cr,
            closing_balance: cb,
          };
        });
        break;
      }

      case 'group': {
        rows = await db.all(
          sql`SELECT
                g.group_id,
                g.name AS group_name,
                g.nature,
                COUNT(l.ledger_id) AS ledger_count,
                COALESCE(SUM(
                  CASE
                    WHEN l.opening_balance < 0 THEN l.opening_balance
                    WHEN l.opening_balance_type = 'Cr' THEN -COALESCE(l.opening_balance, 0)
                    ELSE COALESCE(l.opening_balance, 0)
                  END
                  + COALESCE((SELECT SUM(ve.amount) FROM ${voucherEntries} ve
                      INNER JOIN ${vouchers} v ON v.voucher_id = ve.voucher_id
                      WHERE ve.ledger_id = l.ledger_id AND v.company_id = ${company_id} AND v.fy_id = ${fy_id}
                        AND v.is_cancelled = 0 AND COALESCE(v.is_optional, 0) = 0
                        AND COALESCE(v.is_post_dated, 0) = 0 AND ve.type = 'Dr'), 0)
                  - COALESCE((SELECT SUM(ve.amount) FROM ${voucherEntries} ve
                      INNER JOIN ${vouchers} v ON v.voucher_id = ve.voucher_id
                      WHERE ve.ledger_id = l.ledger_id AND v.company_id = ${company_id} AND v.fy_id = ${fy_id}
                        AND v.is_cancelled = 0 AND COALESCE(v.is_optional, 0) = 0
                        AND COALESCE(v.is_post_dated, 0) = 0 AND ve.type = 'Cr'), 0)
                ), 0) AS net_balance
              FROM ${groups} g
              LEFT JOIN ${ledgers} l ON l.group_id = g.group_id AND l.company_id = ${company_id} AND l.is_active = 1
              WHERE g.company_id = ${company_id} AND g.is_active = 1
              GROUP BY g.group_id, g.name, g.nature
              ORDER BY g.name ASC`
        );
        break;
      }

      case 'stock_item': {
        rows = await db.all(
          sql`SELECT
                si.item_id,
                si.name AS item_name,
                sg.name AS group_name,
                COALESCE(si.opening_quantity, 0) AS opening_qty,
                COALESCE(si.opening_value, 0) AS opening_value,
                COALESCE(si.opening_quantity, 0) +
                  COALESCE((SELECT SUM(vse.quantity) FROM ${voucherStockEntries} vse
                    INNER JOIN ${vouchers} v ON v.voucher_id = vse.voucher_id
                    WHERE vse.stock_item_id = si.item_id AND v.company_id = ${company_id} AND v.fy_id = ${fy_id}
                      AND v.voucher_type IN (${sqlIn(INWARD_TYPES)}) AND v.is_cancelled = 0
                      AND COALESCE(v.is_optional, 0) = 0 AND COALESCE(v.is_post_dated, 0) = 0), 0) -
                  COALESCE((SELECT SUM(vse.quantity) FROM ${voucherStockEntries} vse
                    INNER JOIN ${vouchers} v ON v.voucher_id = vse.voucher_id
                    WHERE vse.stock_item_id = si.item_id AND v.company_id = ${company_id} AND v.fy_id = ${fy_id}
                      AND v.voucher_type IN (${sqlIn(OUTWARD_TYPES)}) AND v.is_cancelled = 0
                      AND COALESCE(v.is_optional, 0) = 0 AND COALESCE(v.is_post_dated, 0) = 0), 0) AS closing_qty,
                COALESCE(si.opening_value, 0) +
                  COALESCE((SELECT SUM(vse.amount) FROM ${voucherStockEntries} vse
                    INNER JOIN ${vouchers} v ON v.voucher_id = vse.voucher_id
                    WHERE vse.stock_item_id = si.item_id AND v.company_id = ${company_id} AND v.fy_id = ${fy_id}
                      AND v.voucher_type IN (${sqlIn(INWARD_TYPES)}) AND v.is_cancelled = 0
                      AND COALESCE(v.is_optional, 0) = 0 AND COALESCE(v.is_post_dated, 0) = 0), 0) -
                  COALESCE((SELECT SUM(vse.amount) FROM ${voucherStockEntries} vse
                    INNER JOIN ${vouchers} v ON v.voucher_id = vse.voucher_id
                    WHERE vse.stock_item_id = si.item_id AND v.company_id = ${company_id} AND v.fy_id = ${fy_id}
                      AND v.voucher_type IN (${sqlIn(OUTWARD_TYPES)}) AND v.is_cancelled = 0
                      AND COALESCE(v.is_optional, 0) = 0 AND COALESCE(v.is_post_dated, 0) = 0), 0) AS closing_value
              FROM ${stockItems} si
              LEFT JOIN ${stockGroups} sg ON sg.sg_id = si.group_id
              WHERE si.company_id = ${company_id} AND si.is_active = 1
              ORDER BY si.name ASC`
        );
        break;
      }

      case 'stock_group': {
        rows = await db.all(
          sql`SELECT
                sg.sg_id,
                sg.name AS group_name,
                COUNT(si.item_id) AS item_count,
                COALESCE(SUM(
                  COALESCE(si.opening_value, 0)
                  + COALESCE((SELECT SUM(vse.amount) FROM ${voucherStockEntries} vse
                      INNER JOIN ${vouchers} v ON v.voucher_id = vse.voucher_id
                      WHERE vse.stock_item_id = si.item_id AND v.company_id = ${company_id} AND v.fy_id = ${fy_id}
                        AND v.voucher_type IN (${sqlIn(INWARD_TYPES)}) AND v.is_cancelled = 0
                        AND COALESCE(v.is_optional, 0) = 0 AND COALESCE(v.is_post_dated, 0) = 0), 0)
                  - COALESCE((SELECT SUM(vse.amount) FROM ${voucherStockEntries} vse
                      INNER JOIN ${vouchers} v ON v.voucher_id = vse.voucher_id
                      WHERE vse.stock_item_id = si.item_id AND v.company_id = ${company_id} AND v.fy_id = ${fy_id}
                        AND v.voucher_type IN (${sqlIn(OUTWARD_TYPES)}) AND v.is_cancelled = 0
                        AND COALESCE(v.is_optional, 0) = 0 AND COALESCE(v.is_post_dated, 0) = 0), 0)
                ), 0) AS closing_value
              FROM ${stockGroups} sg
              LEFT JOIN ${stockItems} si ON si.group_id = sg.sg_id AND si.company_id = ${company_id} AND si.is_active = 1
              WHERE sg.company_id = ${company_id} AND sg.is_active = 1
              GROUP BY sg.sg_id, sg.name
              ORDER BY sg.name ASC`
        );
        break;
      }

      case 'godown': {
        rows = await db.all(
          sql`SELECT
                g.godown_id,
                g.name AS godown_name,
                COUNT(DISTINCT vse.stock_item_id) AS item_count,
                COALESCE(SUM(
                  CASE WHEN v.voucher_type IN (${sqlIn(INWARD_TYPES)}) THEN vse.amount ELSE 0 END
                ), 0) - COALESCE(SUM(
                  CASE WHEN v.voucher_type IN (${sqlIn(OUTWARD_TYPES)}) THEN vse.amount ELSE 0 END
                ), 0) AS net_value
              FROM ${godowns} g
              LEFT JOIN ${voucherStockEntries} vse ON vse.godown_id = g.godown_id
              LEFT JOIN ${vouchers} v ON v.voucher_id = vse.voucher_id
                AND v.company_id = ${company_id} AND v.fy_id = ${fy_id}
                AND v.is_cancelled = 0
                AND COALESCE(v.is_optional, 0) = 0
                AND COALESCE(v.is_post_dated, 0) = 0
              WHERE g.company_id = ${company_id} AND g.is_active = 1
              GROUP BY g.godown_id, g.name
              ORDER BY g.name ASC`
        );
        break;
      }

      case 'cost_centre': {
        rows = await db.all(
          sql`SELECT
                cc.cc_id,
                cc.name AS cost_centre_name,
                cc.category,
                COALESCE(SUM(CASE WHEN vcc.amount > 0 THEN vcc.amount ELSE 0 END), 0) AS total_allocated
              FROM ${costCentres} cc
              LEFT JOIN ${voucherCostCentres} vcc ON vcc.cost_centre_id = cc.cc_id
              LEFT JOIN ${vouchers} v ON v.voucher_id = vcc.voucher_id
                AND v.company_id = ${company_id} AND v.fy_id = ${fy_id}
                AND v.is_cancelled = 0
                AND COALESCE(v.is_optional, 0) = 0
                AND COALESCE(v.is_post_dated, 0) = 0
              WHERE cc.company_id = ${company_id} AND cc.is_active = 1
              GROUP BY cc.cc_id, cc.name, cc.category
              ORDER BY cc.name ASC`
        );
        break;
      }

      default: {
        const rows = await db.all(
          sql`SELECT l.ledger_id, l.name AS ledger_name, g.name AS group_name,
                     COALESCE(l.opening_balance, 0) AS opening_balance, l.is_active
              FROM ${ledgers} l
              LEFT JOIN ${groups} g ON g.group_id = l.group_id
              WHERE l.company_id = ${company_id} AND l.is_active = 1
              ORDER BY g.name, l.name`
        );
        return { success: true, rows: rows || [] };
      }
    }

    return { success: true, rows };
  } catch (err) {
    return { success: false, error: err.message };
  }
};

// ---------------------------------------------------------------------------
// 10. getReconciliation -- reconciliation reports
//     type: 'bank' | 'party'
// ---------------------------------------------------------------------------
const getReconciliation = async (company_id, fy_id, type = 'bank') => {
  try {
    let rows;
    // Accept either a plain type string or { type, viewType } from definitions.
    const recType = (type && typeof type === 'object') ? (type.type || 'bank') : (type || 'bank');
    const viewType = (type && typeof type === 'object') ? (type.viewType || '') : '';

    if (recType === 'bank') {
      rows = await db.all(
        sql`SELECT
              ve.entry_id,
              ve.ledger_id,
              l.name AS ledger_name,
              v.date AS voucher_date,
              v.voucher_type,
              v.voucher_number,
              ve.type,
              ve.amount,
              rec.reconciled_date,
              rec.bank_date,
              rec.bank_reference,
              CASE WHEN rec.reconciliation_id IS NOT NULL THEN 1 ELSE 0 END AS is_reconciled
            FROM ${voucherEntries} ve
            INNER JOIN ${vouchers} v ON v.voucher_id = ve.voucher_id
            INNER JOIN ${ledgers} l ON l.ledger_id = ve.ledger_id
            LEFT JOIN ${reconciliations} rec
              ON rec.entry_id = ve.entry_id AND rec.voucher_id = v.voucher_id
            WHERE v.company_id = ${company_id}
              AND v.fy_id = ${fy_id}
              AND v.is_cancelled = 0
              AND COALESCE(v.is_optional, 0) = 0
              AND COALESCE(v.is_post_dated, 0) = 0
              AND l.ledger_type IN ('Bank', 'Bank OD', 'Bank OCC', 'Bank OD A/c')
            ORDER BY v.date ASC`
      );

      const reconciled = rows.filter(r => r.is_reconciled);
      const unreconciled = rows.filter(r => !r.is_reconciled);
      const viewRows = viewType === 'reconciled' ? reconciled
        : viewType === 'unreconciled' ? unreconciled : rows;

      return {
        success: true,
        rows: viewRows,
        reconciled_count: reconciled.length,
        unreconciled_count: unreconciled.length,
        reconciled_amount: reconciled.reduce((s, r) => s + (Number(r.amount) || 0), 0),
        unreconciled_amount: unreconciled.reduce((s, r) => s + (Number(r.amount) || 0), 0),
      };
    }

    // Party reconciliation
    rows = await db.all(
      sql`SELECT
            l.ledger_id,
            l.name AS party_name,
            vbr.bill_name,
            vbr.bill_type,
            vbr.amount AS bill_amount,
            v.date AS voucher_date,
            v.voucher_number,
            vbr.due_date,
            COALESCE(
              (SELECT SUM(vbr2.amount) FROM ${voucherBillReferences} vbr2
               INNER JOIN ${vouchers} v2 ON v2.voucher_id = vbr2.voucher_id
               WHERE vbr2.ledger_id = l.ledger_id
                 AND vbr2.bill_name = vbr.bill_name
                 AND vbr2.bill_type = 'Agst Ref'
                 AND v2.company_id = ${company_id} AND v2.fy_id = ${fy_id}
                 AND v2.is_cancelled = 0), 0) AS adjusted_amount
          FROM ${voucherBillReferences} vbr
          INNER JOIN ${vouchers} v ON v.voucher_id = vbr.voucher_id
          INNER JOIN ${ledgers} l ON l.ledger_id = vbr.ledger_id
          INNER JOIN ${groups} g ON g.group_id = l.group_id
          WHERE v.company_id = ${company_id}
            AND v.fy_id = ${fy_id}
            AND v.is_cancelled = 0
            AND COALESCE(v.is_optional, 0) = 0
            AND COALESCE(v.is_post_dated, 0) = 0
            AND vbr.bill_type IN ('New Ref', 'Advance')
            AND g.company_id = ${company_id}
            AND g.name IN ('Sundry Debtors', 'Sundry Creditors')
          ORDER BY l.name ASC, v.date ASC`
    );

    const mapped = rows.map(r => ({
      ledger_id: r.ledger_id,
      party_name: r.party_name,
      bill_name: r.bill_name,
      bill_amount: Number(r.bill_amount) || 0,
      adjusted_amount: Number(r.adjusted_amount) || 0,
      outstanding: (Number(r.bill_amount) || 0) - (Number(r.adjusted_amount) || 0),
      voucher_date: r.voucher_date,
      due_date: r.due_date,
    }));

    return { success: true, rows: mapped };
  } catch (err) {
    return { success: false, error: err.message };
  }
};

module.exports = {
  getExceptions,
  getRegister,
  getSummary,
  getReconciliation,
};
