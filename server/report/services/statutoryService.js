/**
 * statutoryService.js
 *
 * Statutory / compliance reports:
 *   11. getPartyAnalysis  -- party-wise analysis (debtors/creditors)
 *   12. getEInvoiceReport -- e-invoice (IRN) and e-way-bill reports
 *   13. getStatutoryReport -- GST / TDS / TCS reports
 */
const {
  db, sql,
  INWARD_TYPES, OUTWARD_TYPES, sqlIn,
  baseVoucherFilter,
  normalizeType,
  extractParams,
} = require('./reportHelpers');
const {
  vouchers,
  voucherEntries,
  voucherStockEntries,
  voucherBillReferences,
  ledgers,
  groups,
  stockItems,
  einvoiceRecords,
  tdsNatureOfPayment,
  tcsNatureOfGoods,
} = require('../../db/schema');
const { getGstReport } = require('./gstReportService');
const { getBillsWithSettlements, pendingAmount } = require('./billSettlementService');

// ---------------------------------------------------------------------------
// 11. getPartyAnalysis -- party-wise analysis
//     partyType: 'debtors' | 'creditors'
//     analysisType: 'turnover' | 'outstanding' | 'ageing' | 'transactions'
// ---------------------------------------------------------------------------
const getPartyAnalysis = async (company_id, fy_id, partyType = 'debtors', analysisType = 'turnover') => {
  try {
    const groupName = partyType === 'creditors' ? 'Sundry Creditors' : 'Sundry Debtors';

    switch (analysisType) {
      case 'turnover': {
        const rows = await db.all(
          sql`SELECT
                l.ledger_id,
                l.name AS party_name,
                COUNT(DISTINCT v.voucher_id) AS transaction_count,
                SUM(CASE WHEN ve.type = 'Dr' THEN ve.amount ELSE 0 END) AS total_debit,
                SUM(CASE WHEN ve.type = 'Cr' THEN ve.amount ELSE 0 END) AS total_credit,
                SUM(CASE WHEN ve.type = 'Dr' THEN ve.amount ELSE 0 END)
                  - SUM(CASE WHEN ve.type = 'Cr' THEN ve.amount ELSE 0 END) AS net_amount
              FROM ${ledgers} l
              INNER JOIN ${groups} g ON g.group_id = l.group_id
              INNER JOIN ${voucherEntries} ve ON ve.ledger_id = l.ledger_id
              INNER JOIN ${vouchers} v ON v.voucher_id = ve.voucher_id
              WHERE l.company_id = ${company_id}
                AND l.is_active = 1
                AND g.company_id = ${company_id}
                AND g.name = ${groupName}
                AND v.company_id = ${company_id}
                AND v.fy_id = ${fy_id}
                AND v.is_cancelled = 0
                AND COALESCE(v.is_optional, 0) = 0
                AND COALESCE(v.is_post_dated, 0) = 0
              GROUP BY l.ledger_id, l.name
              ORDER BY net_amount DESC`
        );
        return { success: true, rows };
      }

      case 'outstanding': {
        // Party ledgers whose direct group is this predefined group.
        const ledgerRows = await db.all(
          sql`SELECT l.ledger_id AS ledger_id, l.name AS party_name
              FROM ${ledgers} l
              INNER JOIN ${groups} g ON g.group_id = l.group_id
              WHERE l.company_id = ${company_id}
                AND g.company_id = ${company_id}
                AND g.name = ${groupName}`
        );
        const nameById = new Map(ledgerRows.map((l) => [l.ledger_id, l.party_name]));
        const ledgerIds = ledgerRows.map((l) => l.ledger_id);

        if (ledgerIds.length === 0) {
          return { success: true, rows: [], total: 0 };
        }

        // Pending amounts come from the shared bill-settlement engine (same
        // New Ref/Advance origin + Agst Ref settlement grouping and floor-at-0
        // math the Outstanding and Interest reports use) so partial-payment
        // handling can't drift between reports.
        const bills = await getBillsWithSettlements(company_id, fy_id, { ledger_ids: ledgerIds });

        // Aggregate the per-bill pending amounts up to one row per ledger.
        const byLedger = new Map();
        for (const bill of bills) {
          let agg = byLedger.get(bill.ledger_id);
          if (!agg) {
            agg = {
              ledger_id: bill.ledger_id,
              party_name: nameById.get(bill.ledger_id) || bill.party_name,
              outstanding: 0,
              bill_count: 0,
              first_bill_date: null,
              last_bill_date: null,
            };
            byLedger.set(bill.ledger_id, agg);
          }
          agg.outstanding += pendingAmount(bill, null);
          agg.bill_count += 1;
          // Earliest / latest voucher touching any of this ledger's bills.
          const dates = [bill.bill_date, ...bill.settlements.map((s) => s.date)].filter(Boolean);
          for (const d of dates) {
            if (!agg.first_bill_date || d < agg.first_bill_date) agg.first_bill_date = d;
            if (!agg.last_bill_date || d > agg.last_bill_date) agg.last_bill_date = d;
          }
        }

        const rows = [...byLedger.values()]
          .filter((r) => r.outstanding > 0.01)
          .sort((a, b) => b.outstanding - a.outstanding);
        const total = rows.reduce((s, r) => s + r.outstanding, 0);
        return { success: true, rows, total };
      }

      case 'ageing': {
        const asOnDate = new Date().toISOString().slice(0, 10);
        const rows = await db.all(
          sql`SELECT
                l.ledger_id,
                l.name AS party_name,
                SUM(CASE WHEN vbr.bill_type IN ('New Ref', 'Advance') THEN vbr.amount ELSE -vbr.amount END) AS total_outstanding,
                SUM(CASE
                  WHEN vbr.due_date IS NOT NULL AND CAST(julianday(${asOnDate}) - julianday(vbr.due_date) AS INTEGER) <= 30
                  THEN CASE WHEN vbr.bill_type IN ('New Ref', 'Advance') THEN vbr.amount ELSE -vbr.amount END ELSE 0 END) AS days_0_30,
                SUM(CASE
                  WHEN vbr.due_date IS NOT NULL AND CAST(julianday(${asOnDate}) - julianday(vbr.due_date) AS INTEGER) > 30
                       AND CAST(julianday(${asOnDate}) - julianday(vbr.due_date) AS INTEGER) <= 60
                  THEN CASE WHEN vbr.bill_type IN ('New Ref', 'Advance') THEN vbr.amount ELSE -vbr.amount END ELSE 0 END) AS days_31_60,
                SUM(CASE
                  WHEN vbr.due_date IS NOT NULL AND CAST(julianday(${asOnDate}) - julianday(vbr.due_date) AS INTEGER) > 60
                       AND CAST(julianday(${asOnDate}) - julianday(vbr.due_date) AS INTEGER) <= 90
                  THEN CASE WHEN vbr.bill_type IN ('New Ref', 'Advance') THEN vbr.amount ELSE -vbr.amount END ELSE 0 END) AS days_61_90,
                SUM(CASE
                  WHEN vbr.due_date IS NOT NULL AND CAST(julianday(${asOnDate}) - julianday(vbr.due_date) AS INTEGER) > 90
                  THEN CASE WHEN vbr.bill_type IN ('New Ref', 'Advance') THEN vbr.amount ELSE -vbr.amount END ELSE 0 END) AS days_90_plus
              FROM ${voucherBillReferences} vbr
              INNER JOIN ${vouchers} v ON v.voucher_id = vbr.voucher_id
              INNER JOIN ${ledgers} l ON l.ledger_id = vbr.ledger_id
              INNER JOIN ${groups} g ON g.group_id = l.group_id
              WHERE v.company_id = ${company_id}
                AND v.fy_id = ${fy_id}
                AND v.is_cancelled = 0
                AND COALESCE(v.is_optional, 0) = 0
                AND COALESCE(v.is_post_dated, 0) = 0
                AND vbr.bill_type IN ('New Ref', 'Advance', 'Agst Ref')
                AND g.company_id = ${company_id}
                AND g.name = ${groupName}
              GROUP BY l.ledger_id, l.name
              HAVING total_outstanding > 0.01
              ORDER BY total_outstanding DESC`
        );
        return { success: true, rows, as_on: asOnDate };
      }

      case 'transactions': {
        const rows = await db.all(
          sql`SELECT
                l.ledger_id,
                l.name AS party_name,
                v.voucher_id,
                v.voucher_type,
                v.voucher_number,
                v.date,
                ve.type,
                ve.amount,
                v.narration
              FROM ${ledgers} l
              INNER JOIN ${groups} g ON g.group_id = l.group_id
              INNER JOIN ${voucherEntries} ve ON ve.ledger_id = l.ledger_id
              INNER JOIN ${vouchers} v ON v.voucher_id = ve.voucher_id
              WHERE l.company_id = ${company_id}
                AND l.is_active = 1
                AND g.company_id = ${company_id}
                AND g.name = ${groupName}
                AND v.company_id = ${company_id}
                AND v.fy_id = ${fy_id}
                AND v.is_cancelled = 0
                AND COALESCE(v.is_optional, 0) = 0
                AND COALESCE(v.is_post_dated, 0) = 0
              ORDER BY l.name ASC, v.date ASC`
        );
        return { success: true, rows };
      }

      default: {
        const rows = await db.all(
          sql`SELECT l.ledger_id, l.name AS party_name, g.name AS group_name,
                     COALESCE(l.opening_balance, 0) AS opening_balance,
                     l.gstin, l.state, l.email, l.phone
              FROM ${ledgers} l
              LEFT JOIN ${groups} g ON g.group_id = l.group_id
              WHERE l.company_id = ${company_id} AND l.is_active = 1
                AND g.name IN ('Sundry Debtors', 'Sundry Creditors')
              ORDER BY l.name`
        );
        return { success: true, rows: rows || [] };
      }
    }
  } catch (err) {
    return { success: false, error: err.message };
  }
};

// ---------------------------------------------------------------------------
// 12. getEInvoiceReport -- e-invoice (IRN) and e-way-bill reports
// ---------------------------------------------------------------------------
const getEInvoiceReport = async (company_id, fy_id, arg = {}) => {
  try {
    const domain = arg.statutoryType === 'eway' ? 'eway' : 'einvoice';
    const subType = arg.subType || 'register';

    if (subType === 'exchange_log') {
      return {
        success: true,
        rows: [],
        message: 'Portal exchange/import-export activity is not stored locally; connect the GST portal integration to populate this log.',
      };
    }

    const sel = sql`
      SELECT er.irn_id, er.voucher_id, er.invoice_number, er.invoice_date,
             er.buyer_gstin, er.irn, er.ack_no, er.ack_dt, er.signed_qr_code,
             er.ewb_no, er.ewb_dt, er.status, er.cancel_reason,
             er.cancel_remarks, er.cancelled_at
      FROM ${einvoiceRecords} er
      LEFT JOIN ${vouchers} v ON v.voucher_id = er.voucher_id`;
    const base = [sql`er.company_id = ${company_id}`,
      sql`(v.fy_id = ${fy_id} OR v.fy_id IS NULL)`];

    if (subType === 'pending') {
      const col = domain === 'eway' ? sql`er.ewb_no` : sql`er.irn`;
      const rows = await db.all(
        sql`SELECT v.voucher_id, v.voucher_number, v.date, v.party_name,
                   v.place_of_supply
            FROM ${vouchers} v
            LEFT JOIN ${einvoiceRecords} er
              ON er.voucher_id = v.voucher_id AND ${col} IS NOT NULL AND ${col} != ''
            WHERE v.company_id = ${company_id} AND v.fy_id = ${fy_id}
              AND v.is_invoice = 1 AND er.irn_id IS NULL
            ORDER BY v.date ASC`
      );
      return { success: true, rows, count: rows.length, subType, domain };
    }

    const conds = [...base];
    if (domain === 'eway') {
      conds.push(sql`er.ewb_no IS NOT NULL AND er.ewb_no != ''`);
    }

    const cancelled = sql`(er.cancelled_at IS NOT NULL OR UPPER(er.status) = 'CANCELLED')`;
    switch (subType) {
      case 'generated': {
        const idCol = domain === 'eway' ? sql`er.ewb_no` : sql`er.irn`;
        conds.push(sql`${idCol} IS NOT NULL AND ${idCol} != ''`);
        conds.push(sql`NOT ${cancelled}`);
        break;
      }
      case 'cancelled':
        conds.push(cancelled);
        break;
      case 'failed':
      case 'error':
        conds.push(sql`UPPER(COALESCE(er.status, '')) NOT IN ('GENERATED', 'ACTIVE', 'CANCELLED', 'PENDING')`);
        conds.push(sql`(er.irn IS NULL OR er.irn = '')`);
        break;
      default:
        break;
    }

    const rows = await db.all(sql`${sel} WHERE ${sql.join(conds, sql` AND `)} ORDER BY er.invoice_date ASC, er.irn_id ASC`);
    return { success: true, rows, count: rows.length, subType, domain };
  } catch (err) {
    return { success: false, error: err.message };
  }
};

// ---------------------------------------------------------------------------
// 13. getStatutoryReport -- GST / TDS / TCS reports
// ---------------------------------------------------------------------------
const getStatutoryReport = async (company_id, fy_id, reportTypeArg = 'gstr1_b2b', paramsArg = {}) => {
  try {
    // E-invoice / e-way-bill reports have a dedicated data source.
    if (reportTypeArg && typeof reportTypeArg === 'object' &&
        (reportTypeArg.statutoryType === 'einvoice' || reportTypeArg.statutoryType === 'eway')) {
      return await getEInvoiceReport(company_id, fy_id, reportTypeArg);
    }
    // GST reports are computed from books by the dedicated, frontend-shape-aligned
    // engine (gstReportService). Routed by statutoryType so every gst-*.js definition
    // lands on a real query (or an honest "needs portal data" message) instead of the
    // generic voucher dump that the legacy switch fell through to.
    if (reportTypeArg && typeof reportTypeArg === 'object' && reportTypeArg.statutoryType === 'gst') {
      return await getGstReport(company_id, fy_id, reportTypeArg);
    }
    const reportType = normalizeType(reportTypeArg, 'gstr1_b2b', {
      'gstr-1-b2b': 'gstr1_b2b', 'gstr-1-b2c-large': 'gstr1_b2c_large', 'gstr-1-b2c-small': 'gstr1_b2c_small',
      'gstr-1-hsn': 'hsn_summary', 'gstr-1-document': 'gstr1_doc', 'gstr-1-cdnr': 'gstr1_cdnr',
      'gstr-1-export': 'gstr1_export', 'gstr-1-nil': 'gstr1_nil', 'gstr-1-summary': 'gstr1_b2b',
      'gstr-1-reconciliation': 'gstr1_b2b', 'gstr-1': 'gstr1_b2b',
      'gstr-3b-summary': 'gstr3b_summary', 'gstr-3b-return': 'gstr3b_summary', 'gstr-3b-outward': 'gstr3b_summary',
      'gstr-3b-itc': 'gstr3b_summary', 'gstr-3b-reversed': 'gstr3b_summary', 'gstr-3b-exempt': 'gstr3b_exempt',
      'gstr-3b-interest': 'gstr3b_summary', 'gstr-3b-payment': 'gstr3b_summary', 'gstr-3b-uncertain': 'gstr3b_summary',
      'gstr-3b-not-relevant': 'gstr3b_summary', 'gstr-3b-reconciliation': 'gstr3b_summary', 'gstr-3b-books': 'gstr3b_summary',
      'gstr-3b': 'gstr3b_summary',
      'gstr-2a': 'gstr1_b2b', 'gstr-2b': 'gstr1_b2b', 'gstr-9': 'gstr1_b2b',
      'gst-annual': 'gstr1_b2b', 'gst-challan': 'gstr1_b2b', 'gst-payment': 'gstr1_b2b',
      'gst-liability': 'gstr1_b2b', 'gst-input': 'gstr1_b2b', 'gst-output': 'gstr1_b2b',
      'gst-tax-rate': 'gstr1_b2b', 'gst-hsn': 'hsn_summary', 'gst-state': 'gstr1_b2b',
      'gst-party': 'gstr1_b2b', 'gstin-validation': 'gstr1_b2b', 'missing-hsn': 'gstr1_b2b',
      'missing-gstin': 'gstr1_b2b', 'place-of-supply': 'gstr1_b2b', 'reverse-charge': 'gstr1_b2b',
      'advance-receipt-gst': 'gstr1_b2b', 'advance-adjustment-gst': 'gstr1_b2b',
      'gst-audit': 'gstr1_b2b', 'gst-exception': 'gstr1_b2b', 'gst-reports-menu': 'gstr1_b2b',
      'gst-return-activities': 'gstr1_b2b', 'gstr-1-uncertain': 'gstr1_b2b',
      'gstr-1-not-relevant': 'gstr1_b2b', 'gstr-1-included': 'gstr1_b2b',
      'gstr-1-uploaded': 'gstr1_b2b', 'gstr-1-mismatched': 'gstr1_b2b', 'gstr-1-rejected': 'gstr1_b2b',
      'gstr-1-credit': 'gstr1_cdnr', 'gstr-1-debit': 'gstr1_cdnr',
      'e-invoice': 'gstr1_b2b', 'e-way-bill': 'gstr1_b2b', 'irn-details': 'gstr1_b2b',
      'ack-number': 'gstr1_b2b', 'transporter': 'gstr1_b2b', 'vehicle': 'gstr1_b2b',
      'distance-exception': 'gstr1_b2b', 'consolidated-e-way': 'gstr1_b2b',
      'tds': 'tds_summary', 'tcs': 'tcs_summary',
      'form-26q': 'tds_summary', 'form-27q': 'tds_summary', 'form-24q': 'tds_summary',
      'form-27eq': 'tcs_summary',
      'vat': 'gstr1_b2b', 'excise': 'gstr1_b2b', 'service-tax': 'gstr1_b2b', 'msme': 'gstr1_b2b',
    });
    const params = extractParams(reportTypeArg) || paramsArg;
    const conditions = baseVoucherFilter(company_id, fy_id);
    if (params.from_date) conditions.push(sql`v.date >= ${params.from_date}`);
    if (params.to_date) conditions.push(sql`v.date <= ${params.to_date}`);

    let rows;

    switch (reportType) {
      case 'rate_wise_sales':
      case 'rate_wise_purchase':
      case 'state_wise_sales':
      case 'state_wise_purchase':
      case 'party_wise_sales':
      case 'party_wise_purchase': {
        const dirTypes = reportType.endsWith('_purchase') ? INWARD_TYPES : OUTWARD_TYPES;
        const gconds = [...conditions, sql`v.is_invoice = 1`, sql`v.voucher_type IN (${sqlIn(dirTypes)})`];
        let groupExpr, labelCol;
        if (reportType.startsWith('rate_wise')) {
          groupExpr = sql`COALESCE(vse.gst_rate, 0)`;
          labelCol = sql`COALESCE(vse.gst_rate, 0) AS gst_rate`;
        } else if (reportType.startsWith('state_wise')) {
          groupExpr = sql`COALESCE(l.state, v.place_of_supply, 'Unspecified')`;
          labelCol = sql`COALESCE(l.state, v.place_of_supply, 'Unspecified') AS state`;
        } else {
          groupExpr = sql`v.party_name`;
          labelCol = sql`v.party_name AS party_name, MAX(l.gstin) AS party_gstin`;
        }
        rows = await db.all(
          sql`SELECT ${labelCol},
                     COALESCE(SUM(vse.amount), 0) AS taxable_value,
                     COALESCE(SUM(vse.cgst_amount), 0) AS cgst,
                     COALESCE(SUM(vse.sgst_amount), 0) AS sgst,
                     COALESCE(SUM(vse.igst_amount), 0) AS igst,
                     COUNT(DISTINCT v.voucher_id) AS invoice_count
              FROM ${voucherStockEntries} vse
              INNER JOIN ${vouchers} v ON v.voucher_id = vse.voucher_id
              LEFT JOIN ${ledgers} l ON l.ledger_id = v.party_ledger_id
              WHERE ${sql.join(gconds, sql` AND `)}
              GROUP BY ${groupExpr}
              ORDER BY taxable_value DESC`
        );
        break;
      }

      case 'place_of_supply': {
        rows = await db.all(
          sql`SELECT v.voucher_id, v.voucher_number, v.date, v.party_name, v.place_of_supply
              FROM ${vouchers} v
              WHERE ${sql.join(conditions, sql` AND `)}
                AND v.is_invoice = 1 AND COALESCE(v.place_of_supply, '') = ''
              ORDER BY v.date ASC`
        );
        break;
      }

      case 'missing_gstin': {
        rows = await db.all(
          sql`SELECT v.voucher_id, v.voucher_number, v.date, v.party_name, l.gstin
              FROM ${vouchers} v
              LEFT JOIN ${ledgers} l ON l.ledger_id = v.party_ledger_id
              WHERE ${sql.join(conditions, sql` AND `)}
                AND v.is_invoice = 1 AND (l.gstin IS NULL OR l.gstin = '')
              ORDER BY v.date ASC`
        );
        break;
      }

      case 'gstin_validation': {
        rows = await db.all(
          sql`SELECT v.voucher_id, v.voucher_number, v.date, v.party_name, l.gstin,
                     CASE WHEN l.gstin IS NULL OR l.gstin = '' THEN 'missing'
                          WHEN length(l.gstin) <> 15 THEN 'invalid_length'
                          ELSE 'ok' END AS gstin_status
              FROM ${vouchers} v
              LEFT JOIN ${ledgers} l ON l.ledger_id = v.party_ledger_id
              WHERE ${sql.join(conditions, sql` AND `)}
                AND v.is_invoice = 1
                AND (l.gstin IS NULL OR l.gstin = '' OR length(l.gstin) <> 15)
              ORDER BY v.date ASC`
        );
        break;
      }

      case 'missing_hsn': {
        rows = await db.all(
          sql`SELECT v.voucher_id, v.voucher_number, v.date, vse.item_name,
                     COALESCE(NULLIF(vse.hsn_code, ''), si.hsn_code, '') AS hsn_code
              FROM ${voucherStockEntries} vse
              INNER JOIN ${vouchers} v ON v.voucher_id = vse.voucher_id
              LEFT JOIN ${stockItems} si ON si.item_id = vse.stock_item_id
              WHERE ${sql.join(conditions, sql` AND `)}
                AND COALESCE(NULLIF(vse.hsn_code, ''), si.hsn_code, '') = ''
              ORDER BY v.date ASC`
        );
        break;
      }

      case 'tds_summary': {
        rows = await db.all(
          sql`SELECT tds_id AS id, name, section, payment_code,
                     rate_individual_with_pan AS rate_with_pan,
                     rate_other_with_pan AS rate_other,
                     threshold_limit, is_active
              FROM ${tdsNatureOfPayment}
              WHERE company_id = ${company_id}
              ORDER BY name`
        );
        break;
      }

      case 'tcs_summary': {
        rows = await db.all(
          sql`SELECT tcs_id AS id, name, section,
                     rate_individual_with_pan AS rate_with_pan,
                     rate_other_with_pan AS rate_other,
                     threshold_level, is_active
              FROM ${tcsNatureOfGoods}
              WHERE company_id = ${company_id}
              ORDER BY name`
        );
        break;
      }

      case 'gstr1_b2b': {
        const b2bConds = [...conditions, sql`v.is_invoice = 1`, sql`v.voucher_type IN (${sqlIn(OUTWARD_TYPES)})`, sql`l.gstin IS NOT NULL AND l.gstin != ''`];
        rows = await db.all(
          sql`SELECT
                v.voucher_id,
                v.voucher_number,
                v.date,
                v.party_name,
                l.gstin AS party_gstin,
                l.state AS party_state,
                v.place_of_supply,
                COALESCE(SUM(vse.amount), 0) AS taxable_value,
                COALESCE(SUM(vse.cgst_amount), 0) AS cgst,
                COALESCE(SUM(vse.sgst_amount), 0) AS sgst,
                COALESCE(SUM(vse.igst_amount), 0) AS igst,
                COALESCE(SUM(vse.amount + vse.cgst_amount + vse.sgst_amount + vse.igst_amount), 0) AS invoice_value
              FROM ${vouchers} v
              LEFT JOIN ${voucherStockEntries} vse ON vse.voucher_id = v.voucher_id
              LEFT JOIN ${ledgers} l ON l.ledger_id = v.party_ledger_id
              WHERE ${sql.join(b2bConds, sql` AND `)}
              GROUP BY v.voucher_id
              ORDER BY v.date ASC`
        );
        break;
      }

      case 'gstr1_b2c_large': {
        const b2clConds = [...conditions, sql`v.is_invoice = 1`, sql`v.voucher_type IN (${sqlIn(OUTWARD_TYPES)})`, sql`(l.gstin IS NULL OR l.gstin = '')`];
        rows = await db.all(
          sql`SELECT
                v.voucher_id,
                v.voucher_number,
                v.date,
                v.party_name,
                v.place_of_supply,
                COALESCE(SUM(vse.amount), 0) AS taxable_value,
                COALESCE(SUM(vse.igst_amount), 0) AS igst,
                COALESCE(SUM(vse.amount + vse.cgst_amount + vse.sgst_amount + vse.igst_amount), 0) AS invoice_value
              FROM ${vouchers} v
              LEFT JOIN ${voucherStockEntries} vse ON vse.voucher_id = v.voucher_id
              LEFT JOIN ${ledgers} l ON l.ledger_id = v.party_ledger_id
              WHERE ${sql.join(b2clConds, sql` AND `)}
              GROUP BY v.voucher_id
              HAVING invoice_value > 250000
              ORDER BY v.date ASC`
        );
        if (rows.length === 0) {
          const allConds = [...conditions, sql`v.is_invoice = 1`, sql`v.voucher_type IN (${sqlIn(OUTWARD_TYPES)})`];
          rows = await db.all(
            sql`SELECT
                  v.voucher_id, v.voucher_number, v.date, v.party_name,
                  v.place_of_supply,
                  COALESCE(SUM(vse.amount), 0) AS taxable_value,
                  COALESCE(SUM(vse.igst_amount), 0) AS igst,
                  COALESCE(SUM(vse.amount + vse.cgst_amount + vse.sgst_amount + vse.igst_amount), 0) AS invoice_value
                FROM ${vouchers} v
                LEFT JOIN ${voucherStockEntries} vse ON vse.voucher_id = v.voucher_id
                WHERE ${sql.join(allConds, sql` AND `)}
                GROUP BY v.voucher_id
                ORDER BY v.date ASC`
          );
        }
        break;
      }

      case 'gstr1_b2c_small': {
        const b2csConds = [...conditions, sql`v.is_invoice = 1`, sql`v.voucher_type IN (${sqlIn(OUTWARD_TYPES)})`, sql`(l.gstin IS NULL OR l.gstin = '')`];
        rows = await db.all(
          sql`SELECT
                v.place_of_supply,
                COALESCE(SUM(vse.amount), 0) AS taxable_value,
                COALESCE(SUM(vse.cgst_amount), 0) AS cgst,
                COALESCE(SUM(vse.sgst_amount), 0) AS sgst,
                COALESCE(SUM(vse.igst_amount), 0) AS igst,
                COUNT(DISTINCT v.voucher_id) AS invoice_count
              FROM ${vouchers} v
              LEFT JOIN ${voucherStockEntries} vse ON vse.voucher_id = v.voucher_id
              LEFT JOIN ${ledgers} l ON l.ledger_id = v.party_ledger_id
              WHERE ${sql.join(b2csConds, sql` AND `)}
              GROUP BY v.place_of_supply
              ORDER BY v.place_of_supply ASC`
        );
        if (rows.length === 0) {
          const allConds = [...conditions, sql`v.is_invoice = 1`, sql`v.voucher_type IN (${sqlIn(OUTWARD_TYPES)})`];
          rows = await db.all(
            sql`SELECT
                  v.place_of_supply,
                  COALESCE(SUM(vse.amount), 0) AS taxable_value,
                  COALESCE(SUM(vse.cgst_amount), 0) AS cgst,
                  COALESCE(SUM(vse.sgst_amount), 0) AS sgst,
                  COALESCE(SUM(vse.igst_amount), 0) AS igst,
                  COUNT(DISTINCT v.voucher_id) AS invoice_count
                FROM ${vouchers} v
                LEFT JOIN ${voucherStockEntries} vse ON vse.voucher_id = v.voucher_id
                WHERE ${sql.join(allConds, sql` AND `)}
                GROUP BY v.place_of_supply
                ORDER BY v.place_of_supply ASC`
          );
        }
        break;
      }

      case 'gstr1_hsn':
      case 'hsn_sac_summary':
      case 'gstr1_summary':
      case 'hsn_summary': {
        rows = await db.all(
          sql`SELECT
                COALESCE(vse.hsn_code, si.hsn_code, 'N/A') AS hsn_code,
                COALESCE(si.hsn_sac_description, 'N/A') AS description,
                COALESCE(vse.gst_rate, si.gst_rate, 0) AS gst_rate,
                COALESCE(SUM(vse.quantity), 0) AS total_quantity,
                COALESCE(SUM(vse.amount), 0) AS taxable_value,
                COALESCE(SUM(vse.cgst_amount), 0) AS cgst,
                COALESCE(SUM(vse.sgst_amount), 0) AS sgst,
                COALESCE(SUM(vse.igst_amount), 0) AS igst,
                COALESCE(SUM(vse.amount + vse.cgst_amount + vse.sgst_amount + vse.igst_amount), 0) AS total_value
              FROM ${voucherStockEntries} vse
              INNER JOIN ${vouchers} v ON v.voucher_id = vse.voucher_id
              LEFT JOIN ${stockItems} si ON si.item_id = vse.stock_item_id
              WHERE ${sql.join(conditions, sql` AND `)}
                AND v.voucher_type IN (${sqlIn(OUTWARD_TYPES)})
              GROUP BY COALESCE(vse.hsn_code, si.hsn_code, 'N/A'), COALESCE(vse.gst_rate, si.gst_rate, 0)
              ORDER BY hsn_code ASC`
        );
        break;
      }

      case 'gstr1_cd_notes':
      case 'gstr1_cdnr': {
        const noteTypes = ['Credit Note', 'Debit Note'];
        const noteConds = [...conditions, sql`v.voucher_type IN (${sqlIn(noteTypes)})`];
        rows = await db.all(
          sql`SELECT
                v.voucher_id,
                v.voucher_type,
                v.voucher_number,
                v.date,
                v.party_name,
                l.gstin AS party_gstin,
                COALESCE(SUM(vse.amount), 0) AS taxable_value,
                COALESCE(SUM(vse.cgst_amount), 0) AS cgst,
                COALESCE(SUM(vse.sgst_amount), 0) AS sgst,
                COALESCE(SUM(vse.igst_amount), 0) AS igst
              FROM ${vouchers} v
              LEFT JOIN ${voucherStockEntries} vse ON vse.voucher_id = v.voucher_id
              LEFT JOIN ${ledgers} l ON l.ledger_id = v.party_ledger_id
              WHERE ${sql.join(noteConds, sql` AND `)}
              GROUP BY v.voucher_id
              ORDER BY v.date ASC`
        );
        break;
      }

      case 'gstr3b_summary': {
        const outwardRows = await db.all(
          sql`SELECT
                'Outward taxable supplies' AS category,
                COALESCE(SUM(vse.amount), 0) AS taxable_value,
                COALESCE(SUM(vse.cgst_amount), 0) AS cgst,
                COALESCE(SUM(vse.sgst_amount), 0) AS sgst,
                COALESCE(SUM(vse.igst_amount), 0) AS igst
              FROM ${voucherStockEntries} vse
              INNER JOIN ${vouchers} v ON v.voucher_id = vse.voucher_id
              WHERE ${sql.join(conditions, sql` AND `)}
                AND v.voucher_type IN (${sqlIn(OUTWARD_TYPES)})`
        );
        const inwardRows = await db.all(
          sql`SELECT
                'ITC on inward supplies' AS category,
                COALESCE(SUM(vse.amount), 0) AS taxable_value,
                COALESCE(SUM(vse.cgst_amount), 0) AS cgst,
                COALESCE(SUM(vse.sgst_amount), 0) AS sgst,
                COALESCE(SUM(vse.igst_amount), 0) AS igst
              FROM ${voucherStockEntries} vse
              INNER JOIN ${vouchers} v ON v.voucher_id = vse.voucher_id
              WHERE ${sql.join(conditions, sql` AND `)}
                AND v.voucher_type IN (${sqlIn(INWARD_TYPES)})`
        );
        rows = [...outwardRows, ...inwardRows];
        break;
      }

      // Statutory TDS summary from voucher entries (distinct from tds_summary which reads master data)
      case 'statutory_tds_summary': {
        rows = await db.all(
          sql`SELECT
                l.ledger_id,
                l.name AS ledger_name,
                l.nature_of_payment,
                l.tds_pan_it_no,
                COALESCE(SUM(CASE WHEN ve.type = 'Cr' THEN ve.amount ELSE 0 END), 0) AS total_payments,
                COUNT(DISTINCT v.voucher_id) AS transaction_count
              FROM ${ledgers} l
              INNER JOIN ${voucherEntries} ve ON ve.ledger_id = l.ledger_id
              INNER JOIN ${vouchers} v ON v.voucher_id = ve.voucher_id
              WHERE l.company_id = ${company_id}
                AND l.is_active = 1
                AND l.is_tds_deductable = 1
                AND v.company_id = ${company_id}
                AND v.fy_id = ${fy_id}
                AND v.is_cancelled = 0
                AND COALESCE(v.is_optional, 0) = 0
                AND COALESCE(v.is_post_dated, 0) = 0
              GROUP BY l.ledger_id, l.name, l.nature_of_payment, l.tds_pan_it_no
              ORDER BY l.name ASC`
        );
        break;
      }

      case 'statutory_tcs_summary': {
        rows = await db.all(
          sql`SELECT
                l.ledger_id,
                l.name AS ledger_name,
                l.tcs_pan_it_no,
                COALESCE(SUM(CASE WHEN ve.type = 'Dr' THEN ve.amount ELSE 0 END), 0) AS total_collections,
                COUNT(DISTINCT v.voucher_id) AS transaction_count
              FROM ${ledgers} l
              INNER JOIN ${voucherEntries} ve ON ve.ledger_id = l.ledger_id
              INNER JOIN ${vouchers} v ON v.voucher_id = ve.voucher_id
              WHERE l.company_id = ${company_id}
                AND l.is_active = 1
                AND l.is_tcs_applicable = 1
                AND v.company_id = ${company_id}
                AND v.fy_id = ${fy_id}
                AND v.is_cancelled = 0
                AND COALESCE(v.is_optional, 0) = 0
                AND COALESCE(v.is_post_dated, 0) = 0
              GROUP BY l.ledger_id, l.name, l.tcs_pan_it_no
              ORDER BY l.name ASC`
        );
        break;
      }

      default: {
        const gstRows = await db.all(
          sql`SELECT v.voucher_id, v.voucher_type, v.voucher_number, v.date,
                     v.party_name, v.place_of_supply,
                     COALESCE(vse.hsn_code, '') AS hsn_code,
                     COALESCE(vse.gst_rate, 0) AS gst_rate,
                     COALESCE(vse.amount, 0) AS amount,
                     COALESCE(vse.cgst_amount, 0) AS cgst,
                     COALESCE(vse.sgst_amount, 0) AS sgst,
                     COALESCE(vse.igst_amount, 0) AS igst
              FROM ${vouchers} v
              LEFT JOIN ${voucherStockEntries} vse ON vse.voucher_id = v.voucher_id
              WHERE v.company_id = ${company_id} AND v.fy_id = ${fy_id}
                AND v.is_cancelled = 0 AND COALESCE(v.is_optional, 0) = 0
              ORDER BY v.date ASC LIMIT 200`
        );
        if (gstRows.length > 0) return { success: true, rows: gstRows };
        const tdsRows = await db.all(
          sql`SELECT tds_id AS id, name, section, payment_code,
                     rate_individual_with_pan AS rate_with_pan,
                     rate_other_with_pan AS rate_other,
                     threshold_limit, is_active
              FROM ${tdsNatureOfPayment}
              WHERE company_id = ${company_id} ORDER BY name`
        );
        if (tdsRows.length > 0) return { success: true, rows: tdsRows };
        const tcsRows = await db.all(
          sql`SELECT tcs_id AS id, name, section,
                     rate_individual_with_pan AS rate_with_pan,
                     rate_other_with_pan AS rate_other,
                     threshold_level, is_active
              FROM ${tcsNatureOfGoods}
              WHERE company_id = ${company_id} ORDER BY name`
        );
        if (tcsRows.length > 0) return { success: true, rows: tcsRows };
        const vRows = await db.all(
          sql`SELECT v.voucher_id, v.voucher_type, v.voucher_number, v.date,
                     v.party_name, v.narration
              FROM ${vouchers} v
              WHERE v.company_id = ${company_id} AND v.fy_id = ${fy_id}
                AND v.is_cancelled = 0
              ORDER BY v.date ASC LIMIT 100`
        );
        return { success: true, rows: vRows || [] };
      }
    }

    return { success: true, rows };
  } catch (err) {
    return { success: false, error: err.message };
  }
};

module.exports = {
  getPartyAnalysis,
  getEInvoiceReport,
  getStatutoryReport,
};
