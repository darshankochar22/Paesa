'use strict';

const { db } = require('../db/index');
const { sql } = require('drizzle-orm');
const { vouchers, ledgers, gstRegistrations, voucherStockEntries } = require('../db/schema');

const ZERO_ROW = () => ({
  vch_count: 0,
  taxable_amount: 0,
  igst: 0,
  cgst: 0,
  sgst: 0,
  cess: 0,
  tax_amount: 0,
  invoice_amount: 0,
  status: '',
});

const getDatesForFY = async (fy_id) => {
  let fyStartDate = null;
  let fyEndDate = null;
  let fyLabel = '';
  try {
    const fyRows = await db.all(sql`SELECT * FROM financial_years WHERE fy_id = ${fy_id}`);
    const fy = fyRows[0];
    if (fy) {
      fyStartDate = fy.start_date;
      fyEndDate = fy.end_date;
      fyLabel = `${fy.start_date} to ${fy.end_date}`;
    }
  } catch (_) {}

  if (!fyStartDate) {
    const now = new Date();
    const yr = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
    fyStartDate = `${yr}-04-01`;
    fyEndDate = `${yr + 1}-03-31`;
    fyLabel = `01-Apr-${yr} to 31-Mar-${yr + 1}`;
  }

  return { fyStartDate, fyEndDate, fyLabel };
};

// Classifier GSTR-1 section → this report's Return-View row.
const GSTR1_SECTION_TO_ROW = {
  b2b: 'b2b',
  b2cl: 'b2c_large',
  b2cs: 'b2c_small',
  cdnr: 'cdn_registered',
  cdnur: 'cdn_unreg',
  nil: 'nil_rated',
};

const getGSTR1Reconciliation = async (company_id, fy_id) => {
  try {
    const { fyLabel } = await getDatesForFY(fy_id);

    // Pull the whole FY once and classify each voucher with the SAME shared engine
    // the drill screens use, so the "Uncertain Transactions" count shown here matches
    // the resolution drill exactly. Tax is totalled from the stock lines (the voucher
    // row carries no tax aggregate columns).
    const { rows, companyGstinInvalid } = await fetchPeriodVouchers(
      company_id,
      fy_id,
      null,
      null,
      true,
    );

    const keys = [
      'b2b',
      'b2c_large',
      'exports',
      'cdn_registered',
      'cdn_unreg',
      'amend_b2b',
      'amend_b2c',
      'amend_exports',
      'amend_cdn_reg',
      'amend_cdn_unreg',
      'b2c_small',
      'nil_rated',
      'amend_b2c_small',
      'tax_liability_advances',
      'adjustment_advances',
      'amend_tax_liability',
      'amend_adjustment',
      'hsn_summary',
      'doc_summary',
    ];

    const return_view = {};
    keys.forEach((k) => {
      return_view[k] = ZERO_ROW();
    });

    let reconciledCount = 0;
    let unreconciledCount = 0;
    let uncertainCount = 0;

    for (const v of rows) {
      const cls = classifyVoucher(v, 'GSTR1', companyGstinInvalid);
      // Corrections-needed vouchers are excluded from the Return View and reported
      // separately — matching TallyPrime (invalid company GSTIN → everything Uncertain).
      if (cls.bucket === 'uncertain') {
        uncertainCount++;
        continue;
      }
      // Inward / inventory / order vouchers are Not Relevant for GSTR-1.
      if (cls.bucket !== 'included') continue;

      const rowKey = GSTR1_SECTION_TO_ROW[cls.section];
      if (!rowKey) continue;

      const row = return_view[rowKey];
      row.vch_count++;
      row.taxable_amount += Number(v.taxable) || 0;
      row.igst += Number(v.igst) || 0;
      row.cgst += Number(v.cgst) || 0;
      row.sgst += Number(v.sgst) || 0;
      row.tax_amount += (Number(v.igst) || 0) + (Number(v.cgst) || 0) + (Number(v.sgst) || 0);
      row.invoice_amount += invoiceOf(v);
      // Portal side: GSTR-1 has no import path yet, so clean book documents are
      // honestly reported as Unreconciled (matches the 2A books-only behaviour).
      row.status = 'Unreconciled';
      unreconciledCount++;
    }

    return {
      success: true,
      payload: {
        return_view,
        voucher_status: {
          reconciled: reconciledCount,
          unreconciled: unreconciledCount,
          uncertain: uncertainCount,
        },
        period_label: fyLabel,
      },
    };
  } catch (err) {
    return { success: false, error: err.message };
  }
};

const getGSTR2BReconciliation = async (company_id, fy_id) => {
  try {
    const { fyLabel } = await getDatesForFY(fy_id);

    // Pull the whole FY once and classify each inward document with the SAME shared
    // engine the drill screens use, so the "Uncertain Transactions" count here matches
    // the resolution drill exactly. Tax is totalled from the stock lines.
    const { rows, companyGstinInvalid } = await fetchPeriodVouchers(
      company_id,
      fy_id,
      null,
      null,
      true,
    );

    const keys = [
      'itc_available_other',
      'itc_available_isd',
      'itc_available_rcm',
      'itc_available_import',
      'itc_available_reversal',
      'itc_available_others',
      'itc_unavailable_other',
      'itc_unavailable_isd',
      'itc_unavailable_rcm',
      'itc_unavailable_reversal',
      'itc_unavailable_others',
    ];

    const return_view = {};
    keys.forEach((k) => {
      return_view[k] = ZERO_ROW();
    });

    let reconciledCount = 0;
    let unreconciledCount = 0;
    let uncertainCount = 0;

    // Real reconciliation logic against imported GSTR-2B data
    const importedRows = await db.all(
      sql`SELECT * FROM gstr2b_imports WHERE company_id = ${company_id} AND fy_id = ${fy_id}`,
    );

    // Parse portal invoices
    const portalInvoices = new Map();
    for (const row of importedRows) {
      try {
        const payload = JSON.parse(row.payload_json);
        // Standard JSON structure for 2B: { b2b: [ { inv: [ { inum: "INV-1", val: 100 } ] } ] }
        if (payload.b2b) {
          for (const p of payload.b2b) {
            for (const inv of p.inv) {
              portalInvoices.set(`${p.ctin}-${inv.inum}`.toUpperCase(), inv);
            }
          }
        }
      } catch (e) {}
    }

    for (const v of rows) {
      if (!INWARD_RECON_TYPES.includes(v.voucher_type)) continue;
      const cls = classifyVoucher(v, 'GSTR2B', companyGstinInvalid);
      // Corrections-needed documents are excluded from the Return View and reported
      // separately — matching TallyPrime (invalid company GSTIN → everything Uncertain).
      if (cls.bucket === 'uncertain') {
        uncertainCount++;
        continue;
      }
      if (cls.bucket !== 'included') continue;

      // Purchases feed "All other ITC"; purchase returns (Debit Notes) feed the
      // Part-B reversal row — mirrors how the portal 2B statement buckets them.
      const bucket =
        v.voucher_type === 'Debit Note' ? 'itc_available_reversal' : 'itc_available_other';
      const row = return_view[bucket];
      row.vch_count++;
      row.taxable_amount += Number(v.taxable) || 0;
      row.igst += Number(v.igst) || 0;
      row.cgst += Number(v.cgst) || 0;
      row.sgst += Number(v.sgst) || 0;
      row.tax_amount += (Number(v.igst) || 0) + (Number(v.cgst) || 0) + (Number(v.sgst) || 0);
      row.invoice_amount += invoiceOf(v);

      // Reconciliation: match GSTIN and Invoice Number
      const key = `${v.party_gstin}-${v.reference_number || v.voucher_number}`.toUpperCase();
      if (portalInvoices.has(key)) {
        row.status = 'Reconciled';
        reconciledCount++;
      } else {
        row.status = 'Unreconciled';
        unreconciledCount++;
      }
    }

    return {
      success: true,
      payload: {
        return_view,
        voucher_status: {
          reconciled: reconciledCount,
          unreconciled: unreconciledCount,
          uncertain: uncertainCount,
        },
        period_label: fyLabel,
        last_gst_activity:
          importedRows.length > 0
            ? importedRows[importedRows.length - 1].created_at
            : 'No Activity Found',
      },
    };
  } catch (err) {
    return { success: false, error: err.message };
  }
};

const importGSTR2B = async (company_id, fy_id, return_period, payload) => {
  try {
    // Upsert — db.execute delegates to the raw libsql client (string + params),
    // NOT the drizzle sql template.
    await db.execute(`DELETE FROM gstr2b_imports WHERE company_id = ? AND return_period = ?`, [
      company_id,
      return_period,
    ]);

    await db.execute(
      `INSERT INTO gstr2b_imports (company_id, fy_id, return_period, payload_json)
       VALUES (?, ?, ?, ?)`,
      [company_id, fy_id, return_period, JSON.stringify(payload)],
    );
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
};

const getGSTR2AReconciliation = async (company_id, fy_id) => {
  try {
    const { fyLabel } = await getDatesForFY(fy_id);

    // Pull the whole FY once and classify each inward document with the SAME shared
    // engine the drill screens use, so the "Uncertain Transactions" count here matches
    // the resolution drill exactly. Tax is totalled from the stock lines.
    const { rows, companyGstinInvalid } = await fetchPeriodVouchers(
      company_id,
      fy_id,
      null,
      null,
      true,
    );

    const keys = ['b2b', 'amend_b2b', 'cdn', 'amend_cdn', 'isd', 'import_boe', 'import_sez_boe'];
    const return_view = {};
    keys.forEach((k) => {
      return_view[k] = ZERO_ROW();
    });

    // Reconcile against imported GSTR-2A portal data (if the user has imported any).
    const portalInvoices = new Map();
    try {
      const importedRows = await db.all(
        sql`SELECT * FROM gstr2a_imports WHERE company_id = ${company_id} AND fy_id = ${fy_id}`,
      );
      for (const row of importedRows) {
        try {
          const payload = JSON.parse(row.payload_json);
          for (const p of payload.b2b || []) {
            for (const inv of p.inv || []) {
              portalInvoices.set(`${p.ctin}-${inv.inum}`.toUpperCase(), inv);
            }
          }
        } catch (_) {
          /* skip malformed import */
        }
      }
    } catch (_) {
      /* no gstr2a_imports table yet — books-only view */
    }

    let reconciled = 0;
    let unreconciled = 0;
    let uncertain = 0;

    for (const v of rows) {
      if (!INWARD_RECON_TYPES.includes(v.voucher_type)) continue;
      const cls = classifyVoucher(v, 'GSTR2A', companyGstinInvalid);
      // Corrections-needed documents are excluded from the Return View and reported
      // separately — matching TallyPrime (invalid company GSTIN → everything Uncertain).
      if (cls.bucket === 'uncertain') {
        uncertain++;
        continue;
      }
      if (cls.bucket !== 'included') continue;

      const bucket = v.voucher_type === 'Purchase' ? 'b2b' : 'cdn';
      const row = return_view[bucket];
      row.vch_count++;
      row.taxable_amount += Number(v.taxable) || 0;
      row.igst += Number(v.igst) || 0;
      row.cgst += Number(v.cgst) || 0;
      row.sgst += Number(v.sgst) || 0;
      row.tax_amount += (Number(v.igst) || 0) + (Number(v.cgst) || 0) + (Number(v.sgst) || 0);
      row.invoice_amount += invoiceOf(v);

      const key = `${v.party_gstin}-${v.reference_number || v.voucher_number}`.toUpperCase();
      if (portalInvoices.size > 0 && portalInvoices.has(key)) {
        row.status = 'Reconciled';
        reconciled++;
      } else {
        row.status = 'Unreconciled';
        unreconciled++;
      }
    }

    return {
      success: true,
      payload: {
        return_view,
        voucher_status: { reconciled, unreconciled, uncertain },
        period_label: fyLabel,
        last_gst_activity: portalInvoices.size > 0 ? 'GSTR-2A imported' : 'No portal 2A imported',
      },
    };
  } catch (err) {
    return { success: false, error: err.message };
  }
};

const getIMSInwardSupplies = async (company_id, fy_id) => {
  try {
    const { fyStartDate, fyEndDate, fyLabel } = await getDatesForFY(fy_id);

    // Books side: inward documents with tax totalled from the stock lines
    // (the voucher row itself carries no tax aggregate columns).
    const rawVouchers = await db.all(
      sql`SELECT v.voucher_id, v.voucher_type, v.voucher_number, v.reference_number,
                 l.gstin AS party_gstin,
                 COALESCE(SUM(vse.amount), 0) AS taxable_amount,
                 COALESCE(SUM(vse.igst_amount), 0) AS igst,
                 COALESCE(SUM(vse.cgst_amount), 0) AS cgst,
                 COALESCE(SUM(vse.sgst_amount), 0) AS sgst,
                 COALESCE(SUM(vse.amount + vse.cgst_amount + vse.sgst_amount + vse.igst_amount), 0) AS invoice_amount
          FROM ${vouchers} v
          LEFT JOIN ${voucherStockEntries} vse ON vse.voucher_id = v.voucher_id
          LEFT JOIN ${ledgers} l ON l.ledger_id = v.party_ledger_id
          WHERE v.company_id = ${company_id}
            AND v.fy_id = ${fy_id}
            AND v.is_cancelled = 0
            AND v.date >= ${fyStartDate}
            AND v.date <= ${fyEndDate}
            AND v.voucher_type IN ('Purchase', 'Credit Note', 'Debit Note')
          GROUP BY v.voucher_id`,
    );

    const keys = [
      'b2b',
      'amend_b2b',
      'cdn',
      'amend_cdn',
      'debit_note',
      'amend_debit_note',
      'impg',
      'amend_impg',
      'impgsez',
      'amend_impgsez',
    ];

    const return_view = {};
    keys.forEach((k) => {
      return_view[k] = ZERO_ROW();
    });

    // Supplier-filed status comes from imported GSTR-2B portal data: an invoice
    // present in the 2B statement has been filed (uploaded) by the supplier.
    const portalInvoices = new Map();
    try {
      const importedRows = await db.all(
        sql`SELECT * FROM gstr2b_imports WHERE company_id = ${company_id} AND fy_id = ${fy_id}`,
      );
      for (const row of importedRows) {
        try {
          const payload = JSON.parse(row.payload_json);
          for (const p of payload.b2b || []) {
            for (const inv of p.inv || []) {
              portalInvoices.set(`${p.ctin}-${inv.inum}`.toUpperCase(), inv);
            }
          }
        } catch (_) {
          /* skip malformed import */
        }
      }
    } catch (_) {
      /* no imports yet — books-only view */
    }

    let totalCount = 0;
    let filedUploaded = 0;
    let yetFiled = 0;

    for (const v of rawVouchers) {
      const isCreditDebit = v.voucher_type === 'Credit Note' || v.voucher_type === 'Debit Note';
      const category = isCreditDebit ? 'cdn' : 'b2b';
      const row = return_view[category];

      row.vch_count++;
      row.taxable_amount += Number(v.taxable_amount) || 0;
      row.igst += Number(v.igst) || 0;
      row.cgst += Number(v.cgst) || 0;
      row.sgst += Number(v.sgst) || 0;
      row.tax_amount += (Number(v.igst) || 0) + (Number(v.cgst) || 0) + (Number(v.sgst) || 0);
      row.invoice_amount += Number(v.invoice_amount) || 0;

      totalCount++;
      const key = `${v.party_gstin}-${v.reference_number || v.voucher_number}`.toUpperCase();
      if (portalInvoices.has(key)) {
        filedUploaded++;
      } else {
        yetFiled++;
      }
    }

    return {
      success: true,
      payload: {
        return_view,
        voucher_status: {
          total_vouchers: totalCount,
          filed: {
            total: filedUploaded,
            action_required: 0,
            ready_for_upload: 0,
            uploaded: filedUploaded,
          },
          yet_filed: {
            total: yetFiled,
            action_required: yetFiled,
            ready_for_upload: 0,
            uploaded: 0,
          },
        },
        period_label: fyLabel,
      },
    };
  } catch (err) {
    return { success: false, error: err.message };
  }
};

const getChallanReconciliation = async (company_id, fy_id) => {
  try {
    const { fyStartDate, fyEndDate, fyLabel } = await getDatesForFY(fy_id);

    // A GST challan payment = a Payment voucher with at least one entry against a
    // Duties & Taxes ledger tagged type_of_duty_tax = 'GST'. The challan amount is the
    // total GST debited in that voucher, summed from voucher_entries (the voucher row
    // carries no amount column). Ordinary payments (rent, suppliers…) are excluded.
    const rawVouchers = await db.all(
      sql`SELECT v.voucher_id, v.date, v.voucher_number, v.voucher_type,
                 v.party_name, l.name AS party_ledger_name,
                 COALESCE(SUM(CASE WHEN ve.type = 'Dr' AND sd.type_of_duty_tax = 'GST'
                                   THEN ve.amount ELSE 0 END), 0) AS gst_amount,
                 COUNT(CASE WHEN sd.type_of_duty_tax = 'GST' THEN 1 END) AS gst_entry_count
          FROM ${vouchers} v
          JOIN voucher_entries ve ON ve.voucher_id = v.voucher_id
          LEFT JOIN ${ledgers} l ON l.ledger_id = v.party_ledger_id
          LEFT JOIN ledger_statutory_details sd ON sd.ledger_id = ve.ledger_id
          WHERE v.company_id = ${company_id}
            AND v.fy_id = ${fy_id}
            AND v.is_cancelled = 0
            AND v.date >= ${fyStartDate}
            AND v.date <= ${fyEndDate}
            AND v.voucher_type = 'Payment'
          GROUP BY v.voucher_id
          HAVING COUNT(CASE WHEN sd.type_of_duty_tax = 'GST' THEN 1 END) > 0
          ORDER BY v.date ASC, v.voucher_id ASC`,
    );

    // Challan identifiers (CPIN/CIN/BRN), bank and instrument details live on the GST
    // portal; until a challan import exists they are honestly blank, not fabricated.
    const challans = rawVouchers.map((v, idx) => {
      return {
        date: v.date,
        particulars: v.party_ledger_name || v.party_name || 'GST Tax Payment',
        vch_type: v.voucher_type,
        vch_no: v.voucher_number || `PMT-${idx + 1}`,
        type_of_tax_payment: 'GST',
        payment_period_from: fyStartDate,
        payment_period_to: fyEndDate,
        type_of_payment: 'Tax Payment',
        mode_of_payment: '',
        bank_name: '',
        cpin: '',
        cin: '',
        brn_utr: '',
        instrument_number: '',
        instrument_date: v.date,
        payment_date: v.date,
        amount: Number(v.gst_amount) || 0,
      };
    });

    return {
      success: true,
      payload: {
        challans,
        period_label: fyLabel,
      },
    };
  } catch (err) {
    return { success: false, error: err.message };
  }
};

const MONTH_ABBR = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];
const GSTIN_RE = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;

// Build the 12 months of a financial year from its start date ('YYYY-MM-DD').
// Each entry carries the keys used downstream: `ym` for GROUP BY substr(date,1,7),
// `period` as MMYYYY (the gst_filings key) and a human `label` like "Apr-26".
const buildFyMonths = (fyStartDate) => {
  const [ys, ms] = String(fyStartDate || '')
    .split('-')
    .map(Number);
  const startYear = Number.isFinite(ys) ? ys : new Date().getFullYear();
  const startMonth = Number.isFinite(ms) ? ms : 4;
  const months = [];
  let y = startYear;
  let m = startMonth;
  for (let i = 0; i < 12; i++) {
    const mm = String(m).padStart(2, '0');
    months.push({
      ym: `${y}-${mm}`,
      period: `${mm}${y}`,
      label: `${MONTH_ABBR[m - 1]}-${String(y).slice(-2)}`,
    });
    if (m === 12) {
      m = 1;
      y += 1;
    } else {
      m += 1;
    }
  }
  return months;
};

// Real return-filing status for the "Track GST Return Activities" dashboard.
// Returns a per-registration -> per-month -> per-return matrix computed from the
// books (data-quality exceptions per period drive "Corrections Needed"; the
// gst_filings / gstr1_exports lifecycle drives "Pending to Be Filed"). A flat
// company-wide `returns` roll-up is kept for backward compatibility.
//
// Columns match TallyPrime's report. "Pending for Upload" (GSTR-1 only) and
// "Exceptions in Reconciliation" stay "No" until the GST portal data is actually
// uploaded/imported — there is no portal round-trip in this offline clone, so we
// report them honestly as not-pending rather than fabricating a status.
const getReturnActivities = async (company_id, fy_id) => {
  try {
    const { fyStartDate, fyLabel } = await getDatesForFY(fy_id);
    const months = buildFyMonths(fyStartDate);

    // Active registrations for the company; the first is treated as the primary
    // registration and also owns legacy vouchers whose gst_registration_id is NULL.
    const regRows = await db.all(
      sql`SELECT gst_id, state_id, gstin, legal_name, trade_name, gst_username
          FROM ${gstRegistrations}
          WHERE ${gstRegistrations.companyId} = ${company_id} AND ${gstRegistrations.isActive} = 1
          ORDER BY gst_id ASC`,
    );

    // Filed periods (company-level; gst_filings has no per-registration column).
    const filedGSTR1 = new Set();
    const filedGSTR3B = new Set();
    try {
      const rows = await db.all(
        sql`SELECT return_type, return_period FROM gst_filings WHERE company_id = ${company_id} AND status = 'FILED'`,
      );
      for (const r of rows) {
        if (r.return_type === 'GSTR1') filedGSTR1.add(String(r.return_period));
        if (r.return_type === 'GSTR3B') filedGSTR3B.add(String(r.return_period));
      }
    } catch (_) {
      /* table may not exist */
    }
    try {
      const rows = await db.all(
        sql`SELECT return_period FROM gstr1_exports WHERE company_id = ${company_id} AND fy_id = ${fy_id} AND status = 'Filed'`,
      );
      for (const r of rows) filedGSTR1.add(String(r.return_period));
    } catch (_) {
      /* table may not exist */
    }

    const registrations = [];
    for (let idx = 0; idx < regRows.length; idx++) {
      const reg = regRows[idx];
      const isPrimary = idx === 0;
      // When the company's own registration is invalid/unspecified, every voucher
      // in that registration becomes an "uncertain transaction" (corrections needed) —
      // mirrors Tally's "GST Registration Details of the Company are invalid" exception.
      const gstinInvalid = !GSTIN_RE.test(String(reg.gstin || '').toUpperCase());
      const regFilter = isPrimary
        ? sql`(v.gst_registration_id = ${reg.gst_id} OR v.gst_registration_id IS NULL)`
        : sql`v.gst_registration_id = ${reg.gst_id}`;

      // Outward docs (GSTR-1 / GSTR-3B side) per month, with a data-quality count.
      const outRows = await db.all(
        sql`SELECT substr(v.date, 1, 7) AS ym,
                   COUNT(DISTINCT v.voucher_id) AS total,
                   COUNT(DISTINCT CASE WHEN (
                     (l.registration_type IS NOT NULL AND l.registration_type != 'Unregistered'
                        AND (l.gstin IS NULL OR l.gstin = '' OR length(l.gstin) != 15))
                     OR COALESCE(v.place_of_supply, '') = ''
                   ) THEN v.voucher_id END) AS corr
            FROM ${vouchers} v
            LEFT JOIN ${ledgers} l ON l.ledger_id = v.party_ledger_id
            WHERE v.company_id = ${company_id} AND v.fy_id = ${fy_id} AND v.is_cancelled = 0
              AND v.voucher_type IN ('Sales', 'Credit Note', 'Debit Note')
              AND ${regFilter}
            GROUP BY ym`,
      );
      // Inward docs (GSTR-2A / GSTR-2B side) per month, with a data-quality count.
      const inRows = await db.all(
        sql`SELECT substr(v.date, 1, 7) AS ym,
                   COUNT(DISTINCT v.voucher_id) AS total,
                   COUNT(DISTINCT CASE WHEN (
                     l.registration_type IS NOT NULL AND l.registration_type != 'Unregistered'
                       AND (l.gstin IS NULL OR l.gstin = '' OR length(l.gstin) != 15)
                   ) THEN v.voucher_id END) AS corr
            FROM ${vouchers} v
            LEFT JOIN ${ledgers} l ON l.ledger_id = v.party_ledger_id
            WHERE v.company_id = ${company_id} AND v.fy_id = ${fy_id} AND v.is_cancelled = 0
              AND v.voucher_type = 'Purchase'
              AND ${regFilter}
            GROUP BY ym`,
      );
      const outByYm = {};
      for (const r of outRows) outByYm[r.ym] = r;
      const inByYm = {};
      for (const r of inRows) inByYm[r.ym] = r;

      const monthEntries = months.map((mo) => {
        const o = outByYm[mo.ym] || {};
        const i = inByYm[mo.ym] || {};
        const outTotal = Number(o.total || 0);
        const inTotal = Number(i.total || 0);
        const outCorr = gstinInvalid ? outTotal : Number(o.corr || 0);
        const inCorr = gstinInvalid ? inTotal : Number(i.corr || 0);
        const g1Filed = filedGSTR1.has(mo.period);
        const g3bFiled = filedGSTR3B.has(mo.period);
        return {
          period: mo.period,
          label: mo.label,
          returns: [
            {
              name: 'GSTR-1',
              corrections: outCorr,
              pending_upload: 0,
              recon_exceptions: 0,
              pending_file: g1Filed ? 0 : 1,
            },
            {
              name: 'GSTR-2A',
              corrections: inCorr,
              pending_upload: null,
              recon_exceptions: 0,
              pending_file: null,
            },
            {
              name: 'GSTR-2B',
              corrections: inCorr,
              pending_upload: null,
              recon_exceptions: 0,
              pending_file: null,
            },
            {
              name: 'GSTR-3B',
              corrections: outCorr + inCorr,
              pending_upload: null,
              recon_exceptions: 0,
              pending_file: g3bFiled ? 0 : 1,
            },
          ],
        };
      });

      registrations.push({
        gst_id: reg.gst_id,
        state_id: reg.state_id,
        gstin: reg.gstin,
        name: reg.state_id
          ? `${reg.state_id} Registration`
          : reg.trade_name || reg.legal_name || reg.gst_username || reg.gstin || 'Registration',
        months: monthEntries,
      });
    }

    // ---- Backward-compatible flat company-wide roll-up (legacy consumers/tests) ----
    const corrRows = await db.all(
      sql`SELECT COUNT(DISTINCT v.voucher_id) AS n
          FROM ${vouchers} v
          LEFT JOIN ${ledgers} l ON l.ledger_id = v.party_ledger_id
          WHERE v.company_id = ${company_id} AND v.fy_id = ${fy_id} AND v.is_cancelled = 0
            AND v.is_invoice = 1 AND v.voucher_type = 'Sales'
            AND (
              (l.registration_type IS NOT NULL AND l.registration_type != 'Unregistered'
                 AND (l.gstin IS NULL OR l.gstin = '' OR length(l.gstin) != 15))
              OR COALESCE(v.place_of_supply, '') = ''
            )`,
    );
    const corrections = Number(corrRows[0]?.n || 0);
    const purRows = await db.all(
      sql`SELECT COUNT(DISTINCT v.voucher_id) AS n
          FROM ${vouchers} v
          WHERE v.company_id = ${company_id} AND v.fy_id = ${fy_id} AND v.is_cancelled = 0
            AND v.voucher_type IN ('Purchase', 'Credit Note', 'Debit Note')`,
    );
    const inwardCount = Number(purRows[0]?.n || 0);

    return {
      success: true,
      activities: {
        period_label: fyLabel,
        registrations,
        returns: [
          {
            name: 'GSTR-1',
            corrections,
            pending_upload: 0,
            recon_exceptions: 0,
            pending_file: filedGSTR1.size > 0 ? 0 : 1,
          },
          {
            name: 'GSTR-2A',
            corrections: 0,
            pending_upload: null,
            recon_exceptions: inwardCount,
            pending_file: null,
          },
          {
            name: 'GSTR-2B',
            corrections: 0,
            pending_upload: null,
            recon_exceptions: inwardCount,
            pending_file: null,
          },
          {
            name: 'GSTR-3B',
            corrections,
            pending_upload: 0,
            recon_exceptions: 0,
            pending_file: filedGSTR3B.size > 0 ? 0 : 1,
          },
        ],
      },
    };
  } catch (err) {
    return { success: false, error: err.message };
  }
};

// ───────────────────────────────────────────────────────────────────────────────
// Return-period drill engine — shared by Statistics, section summaries/registers,
// Not-Relevant breakdown and Uncertain Transactions, so every screen in the
// GSTR-1 / GSTR-3B drill chain reports the SAME classification of the SAME
// vouchers. All data is real (from books); nothing is fabricated.
// ───────────────────────────────────────────────────────────────────────────────
const OUTWARD_TYPES = ['Sales', 'Credit Note', 'Debit Note'];
// GSTR-2A / 2A reconciliation is inward: purchases plus purchase-side credit/debit notes.
const INWARD_RECON_TYPES = ['Purchase', 'Credit Note', 'Debit Note'];
const INVENTORY_TYPES = [
  'Delivery Note',
  'Receipt Note',
  'Stock Journal',
  'Physical Stock',
  'Material In',
  'Material Out',
  'Rejections In',
  'Rejections Out',
];
const ORDER_TYPES = ['Purchase Order', 'Sales Order', 'Job Work In Order', 'Job Work Out Order'];
const PAYROLL_TYPES = ['Payroll', 'Salary Slip'];
const B2CL_THRESHOLD = 250000;

// Load every non-cancelled voucher of a return period (optionally scoped to a
// registration) with party info + tax sums aggregated from voucher_stock_entries.
const fetchPeriodVouchers = async (
  company_id,
  fy_id,
  return_period,
  gstRegistrationId,
  annual = false,
) => {
  let startDate;
  let endDate;
  if (annual) {
    // Annual Computation spans the whole financial year.
    const { fyStartDate, fyEndDate } = await getDatesForFY(fy_id);
    startDate = fyStartDate;
    const end = new Date(fyEndDate);
    end.setDate(end.getDate() + 1); // exclusive upper bound = day after FY end
    endDate = `${end.getFullYear()}-${String(end.getMonth() + 1).padStart(2, '0')}-${String(end.getDate()).padStart(2, '0')}`;
  } else {
    const month = String(return_period).substring(0, 2);
    const year = String(return_period).substring(2, 6);
    startDate = `${year}-${month}-01`;
    const nm = Number(month) === 12 ? 1 : Number(month) + 1;
    const ny = Number(month) === 12 ? Number(year) + 1 : Number(year);
    endDate = `${ny}-${String(nm).padStart(2, '0')}-01`;
  }

  const activeRegs = await db.all(
    sql`SELECT gst_id, gstin FROM ${gstRegistrations}
        WHERE ${gstRegistrations.companyId} = ${company_id} AND ${gstRegistrations.isActive} = 1
        ORDER BY gst_id ASC`,
  );
  const primaryId = activeRegs[0] ? Number(activeRegs[0].gst_id) : null;
  const scopedReg =
    gstRegistrationId != null
      ? activeRegs.find((r) => Number(r.gst_id) === Number(gstRegistrationId))
      : activeRegs[0];
  const companyGstinInvalid = !GSTIN_RE.test(String(scopedReg?.gstin || '').toUpperCase());

  let regFilter = sql``;
  if (gstRegistrationId != null) {
    regFilter =
      Number(gstRegistrationId) === primaryId
        ? sql`AND (v.gst_registration_id = ${gstRegistrationId} OR v.gst_registration_id IS NULL)`
        : sql`AND v.gst_registration_id = ${gstRegistrationId}`;
  }

  const rows = await db.all(
    sql`SELECT v.voucher_id, v.date, v.voucher_type, v.voucher_number, v.reference_number, v.party_name,
               v.place_of_supply, v.is_interstate,
               l.name AS ledger_name, l.gstin AS party_gstin, l.registration_type AS party_reg_type,
               COALESCE(s.stock_count, 0) AS stock_count,
               COALESCE(s.taxable, 0) AS taxable,
               COALESCE(s.igst, 0) AS igst,
               COALESCE(s.cgst, 0) AS cgst,
               COALESCE(s.sgst, 0) AS sgst,
               COALESCE(s.max_rate, 0) AS max_rate,
               COALESCE(e.dr_total, 0) AS dr_total,
               COALESCE(e.cr_total, 0) AS cr_total
        FROM ${vouchers} v
        LEFT JOIN ${ledgers} l ON l.ledger_id = v.party_ledger_id
        LEFT JOIN (
          SELECT voucher_id, COUNT(*) AS stock_count, SUM(amount) AS taxable,
                 SUM(igst_amount) AS igst, SUM(cgst_amount) AS cgst,
                 SUM(sgst_amount) AS sgst, MAX(gst_rate) AS max_rate
          FROM ${voucherStockEntries} GROUP BY voucher_id
        ) s ON s.voucher_id = v.voucher_id
        LEFT JOIN (
          SELECT voucher_id,
                 SUM(CASE WHEN type = 'Dr' THEN amount ELSE 0 END) AS dr_total,
                 SUM(CASE WHEN type = 'Cr' THEN amount ELSE 0 END) AS cr_total
          FROM voucher_entries GROUP BY voucher_id
        ) e ON e.voucher_id = v.voucher_id
        WHERE v.company_id = ${company_id} AND v.fy_id = ${fy_id} AND v.is_cancelled = 0
          AND v.date >= ${startDate} AND v.date < ${endDate}
          ${regFilter}
        ORDER BY v.date ASC, v.voucher_id ASC`,
  );
  return { rows, companyGstinInvalid };
};

// Classify one voucher: bucket (included / not_relevant / uncertain), the
// Not-Relevant grouping (non_gst category or other_returns), the GSTR-1 section
// it lands in when included, and the concrete exceptions when uncertain.
const classifyVoucher = (v, returnType, companyGstinInvalid) => {
  const isOutward = OUTWARD_TYPES.includes(v.voucher_type);
  const isInward = v.voucher_type === 'Purchase';
  // GSTR-2A/2B reconciliation is inward (purchase + purchase-side notes).
  const inwardRecon = returnType === 'GSTR2A' || returnType === 'GSTR2B';
  // GSTR-3B and Annual Computation treat both outward + inward as relevant.
  const bothSides = returnType === 'GSTR3B' || returnType === 'ANNUAL';
  const relevant = inwardRecon
    ? INWARD_RECON_TYPES.includes(v.voucher_type)
    : bothSides
      ? isOutward || isInward
      : isOutward;

  if (!relevant) {
    let group = 'non_gst';
    let category = 'Other Transactions';
    if (!bothSides && isInward) {
      group = 'other_returns';
      category = 'Transactions of Other GST Returns';
    } else if (v.voucher_type === 'Contra') category = 'Contra Vouchers';
    else if (INVENTORY_TYPES.includes(v.voucher_type)) category = 'Inventory Vouchers';
    else if (ORDER_TYPES.includes(v.voucher_type)) category = 'Order Vouchers';
    else if (PAYROLL_TYPES.includes(v.voucher_type)) category = 'Payroll Vouchers';
    return { bucket: 'not_relevant', group, category, section: null, exceptions: [] };
  }

  const exceptions = [];
  if (companyGstinInvalid)
    exceptions.push('GST Registration Details of the Company are invalid or not specified');
  const partyRegistered = v.party_reg_type && v.party_reg_type !== 'Unregistered';
  if (partyRegistered && (!v.party_gstin || String(v.party_gstin).length !== 15)) {
    exceptions.push('Party is registered but its GSTIN/UIN is missing or invalid');
  }
  if (!String(v.place_of_supply || '').trim()) exceptions.push('Place of supply is not specified');
  if (Number(v.stock_count || 0) === 0)
    exceptions.push('No item or tax details available in the voucher');
  if (exceptions.length)
    return { bucket: 'uncertain', group: null, category: null, section: null, exceptions };

  // Inward reconciliations don't use GSTR-1 outward sections.
  if (inwardRecon)
    return { bucket: 'included', group: null, category: null, section: null, exceptions: [] };

  // GSTR-1 section for an included outward voucher.
  const hasGstin = !!v.party_gstin;
  let section = null;
  if (v.voucher_type === 'Credit Note') section = hasGstin ? 'cdnr' : 'cdnur';
  else if (Number(v.max_rate || 0) === 0) section = 'nil';
  else if (hasGstin) section = 'b2b';
  else if (Number(v.is_interstate || 0) === 1 && invoiceOf(v) > B2CL_THRESHOLD) section = 'b2cl';
  else section = 'b2cs';
  return { bucket: 'included', group: null, category: null, section, exceptions: [] };
};

const invoiceOf = (v) =>
  Number(v.taxable || 0) + Number(v.igst || 0) + Number(v.cgst || 0) + Number(v.sgst || 0);

const voucherRow = (v, cls) => ({
  voucher_id: v.voucher_id,
  date: v.date,
  particulars: v.party_name || v.ledger_name || '',
  voucher_type: v.voucher_type,
  voucher_number: v.voucher_number,
  party_gstin: v.party_gstin || '',
  taxable: Number(v.taxable || 0),
  igst: Number(v.igst || 0),
  cgst: Number(v.cgst || 0),
  sgst: Number(v.sgst || 0),
  cess: 0,
  tax: Number(v.igst || 0) + Number(v.cgst || 0) + Number(v.sgst || 0),
  invoice: invoiceOf(v),
  // Accounting-side totals — Tally's registers for non-return drills (statistics,
  // Not Relevant) show Debit/Credit Amount columns rather than tax columns.
  debit: Number(v.dr_total || 0),
  credit: Number(v.cr_total || 0),
  exceptions: cls ? cls.exceptions : [],
});

// Voucher-type "Statistics" — the drill behind the "Total Vouchers" line.
const getReturnStatistics = async (company_id, fy_id, return_period, opts = {}) => {
  try {
    const returnType = opts.return_type || 'GSTR1';
    const gstRegistrationId =
      opts.gst_registration_id != null ? Number(opts.gst_registration_id) : null;
    const { rows, companyGstinInvalid } = await fetchPeriodVouchers(
      company_id,
      fy_id,
      return_period,
      gstRegistrationId,
      !!opts.annual,
    );

    const byType = {};
    const bucketFor = (t) => {
      if (!byType[t]) {
        byType[t] = {
          voucher_type: t,
          total: 0,
          included_pending: 0,
          included_ok: 0,
          not_relevant: 0,
          uncertain: 0,
        };
      }
      return byType[t];
    };

    for (const v of rows) {
      const b = bucketFor(v.voucher_type || 'Unknown');
      b.total++;
      const cls = classifyVoucher(v, returnType, companyGstinInvalid);
      if (cls.bucket === 'not_relevant') b.not_relevant++;
      else if (cls.bucket === 'uncertain') b.uncertain++;
      else b.included_ok++;
    }

    const list = Object.values(byType).sort((a, b) => a.voucher_type.localeCompare(b.voucher_type));
    const totals = list.reduce(
      (acc, r) => ({
        total: acc.total + r.total,
        included_pending: acc.included_pending + r.included_pending,
        included_ok: acc.included_ok + r.included_ok,
        not_relevant: acc.not_relevant + r.not_relevant,
        uncertain: acc.uncertain + r.uncertain,
      }),
      { total: 0, included_pending: 0, included_ok: 0, not_relevant: 0, uncertain: 0 },
    );

    return { success: true, statistics: { return_type: returnType, rows: list, totals } };
  } catch (err) {
    return { success: false, error: err.message };
  }
};

// Voucher list for any drill: filter by bucket ('included'|'not_relevant'|'uncertain'|
// 'all'), Not-Relevant category, voucher type and/or GSTR-1 section. Sections 'hsn'
// and 'docs' return their aggregate summaries instead of a voucher list.
const getReturnVouchers = async (company_id, fy_id, return_period, opts = {}) => {
  try {
    const returnType = opts.return_type || 'GSTR1';
    const gstRegistrationId =
      opts.gst_registration_id != null ? Number(opts.gst_registration_id) : null;
    const { rows, companyGstinInvalid } = await fetchPeriodVouchers(
      company_id,
      fy_id,
      return_period,
      gstRegistrationId,
      !!opts.annual,
    );

    // Optional direction filter for HSN summaries (Annual: Outward vs Inward supplies).
    const dirOk = (v) => {
      if (opts.direction === 'outward') return OUTWARD_TYPES.includes(v.voucher_type);
      if (opts.direction === 'inward') return v.voucher_type === 'Purchase';
      return true;
    };

    // HSN summary (section 12): aggregate the included vouchers' stock lines by HSN.
    if (opts.section === 'hsn') {
      const includedIds = rows
        .filter(
          (v) =>
            dirOk(v) && classifyVoucher(v, returnType, companyGstinInvalid).bucket === 'included',
        )
        .map((v) => v.voucher_id);
      if (includedIds.length === 0) return { success: true, rows: [], view: 'hsn' };
      // db.execute(string, params) — sql`` templates can't expand an array into IN (...).
      const placeholders = includedIds.map(() => '?').join(',');
      const hsnRes = await db.execute(
        `SELECT COALESCE(NULLIF(hsn_code, ''), 'Not Specified') AS hsn,
                SUM(quantity) AS qty, SUM(amount) AS taxable,
                SUM(igst_amount) AS igst, SUM(cgst_amount) AS cgst, SUM(sgst_amount) AS sgst
         FROM voucher_stock_entries
         WHERE voucher_id IN (${placeholders})
         GROUP BY hsn ORDER BY hsn`,
        includedIds,
      );
      const hsnRows = hsnRes.rows || [];
      return {
        success: true,
        view: 'hsn',
        rows: hsnRows.map((r) => ({
          hsn: r.hsn,
          qty: Number(r.qty || 0),
          taxable: Number(r.taxable || 0),
          igst: Number(r.igst || 0),
          cgst: Number(r.cgst || 0),
          sgst: Number(r.sgst || 0),
          cess: 0,
          tax: Number(r.igst || 0) + Number(r.cgst || 0) + Number(r.sgst || 0),
        })),
      };
    }

    // Document summary (section 13): voucher-number ranges per voucher type.
    if (opts.section === 'docs') {
      const byType = {};
      for (const v of rows) {
        if (!OUTWARD_TYPES.includes(v.voucher_type)) continue;
        const b =
          byType[v.voucher_type] ||
          (byType[v.voucher_type] = { nature: v.voucher_type, from: null, to: null, count: 0 });
        b.count++;
        const n = String(v.voucher_number ?? '');
        if (b.from === null || n < b.from) b.from = n;
        if (b.to === null || n > b.to) b.to = n;
      }
      return {
        success: true,
        view: 'docs',
        rows: Object.values(byType).map((b) => ({ ...b, cancelled: 0, net: b.count })),
      };
    }

    const out = [];
    for (const v of rows) {
      if (opts.direction && !dirOk(v)) continue;
      const cls = classifyVoucher(v, returnType, companyGstinInvalid);
      if (opts.bucket && opts.bucket !== 'all' && cls.bucket !== opts.bucket) continue;
      if (opts.exception && !(cls.exceptions || []).includes(opts.exception)) continue;
      if (opts.category && cls.category !== opts.category) continue;
      if (opts.voucher_type && v.voucher_type !== opts.voucher_type) continue;
      if (opts.section && cls.section !== opts.section) continue;
      if (opts.annual_category) {
        // Annual drill leaf: match this voucher's tree category by exact key or prefix.
        if (cls.bucket !== 'included') continue;
        const cat = annualCategoryOf(v);
        if (cat !== opts.annual_category && !cat.startsWith(`${opts.annual_category}.`)) continue;
      }
      out.push(voucherRow(v, cls));
    }
    return { success: true, view: 'vouchers', rows: out };
  } catch (err) {
    return { success: false, error: err.message };
  }
};

// "Not Relevant for This Return" breakdown: Non-GST transaction categories with
// per-voucher-type counts, plus Transactions of Other GST Returns (GSTR-1 only).
const getNotRelevantBreakdown = async (company_id, fy_id, return_period, opts = {}) => {
  try {
    const returnType = opts.return_type || 'GSTR1';
    const gstRegistrationId =
      opts.gst_registration_id != null ? Number(opts.gst_registration_id) : null;
    const { rows, companyGstinInvalid } = await fetchPeriodVouchers(
      company_id,
      fy_id,
      return_period,
      gstRegistrationId,
      !!opts.annual,
    );

    const categories = {}; // category label -> { count, types: {type: count} }
    let otherReturns = 0;
    for (const v of rows) {
      const cls = classifyVoucher(v, returnType, companyGstinInvalid);
      if (cls.bucket !== 'not_relevant') continue;
      if (cls.group === 'other_returns') {
        otherReturns++;
        continue;
      }
      const c = categories[cls.category] || (categories[cls.category] = { count: 0, types: {} });
      c.count++;
      c.types[v.voucher_type] = (c.types[v.voucher_type] || 0) + 1;
    }

    const catList = Object.entries(categories)
      .map(([label, c]) => ({
        label,
        count: c.count,
        types: Object.entries(c.types)
          .map(([voucher_type, count]) => ({ voucher_type, count }))
          .sort((a, b) => a.voucher_type.localeCompare(b.voucher_type)),
      }))
      .sort((a, b) => a.label.localeCompare(b.label));
    const nonGstTotal = catList.reduce((n, c) => n + c.count, 0);

    const bothSides = returnType === 'GSTR3B' || returnType === 'ANNUAL';
    return {
      success: true,
      breakdown: {
        non_gst: { label: 'Non-GST transactions', count: nonGstTotal, categories: catList },
        other_returns: bothSides
          ? null
          : { label: 'Transactions of Other GST Returns', count: otherReturns },
        total: nonGstTotal + (bothSides ? 0 : otherReturns),
      },
    };
  } catch (err) {
    return { success: false, error: err.message };
  }
};

// GST Annual Computation (GSTR-9 style) — a full-FY liability + ITC + summary,
// computed from the SAME classifier as the drills so the voucher counts match the
// Statistics screen exactly. All amounts come from `included` vouchers, so when the
// company's GSTIN is invalid (everything relevant → uncertain) the sections are
// legitimately zero — matching TallyPrime. Shape matches AnnualComputation.tsx keys.
const getAnnualComputation = async (company_id, fy_id, opts = {}) => {
  try {
    const gstRegistrationId =
      opts.gst_registration_id != null ? Number(opts.gst_registration_id) : null;
    const { fyLabel } = await getDatesForFY(fy_id);
    const { rows, companyGstinInvalid } = await fetchPeriodVouchers(
      company_id,
      fy_id,
      null,
      gstRegistrationId,
      true,
    );

    // Registration GSTIN for the header.
    const activeRegs = await db.all(
      sql`SELECT gst_id, gstin FROM ${gstRegistrations}
          WHERE ${gstRegistrations.companyId} = ${company_id} AND ${gstRegistrations.isActive} = 1
          ORDER BY gst_id ASC`,
    );
    const scopedReg =
      gstRegistrationId != null
        ? activeRegs.find((r) => Number(r.gst_id) === gstRegistrationId)
        : activeRegs[0];

    const zero = () => ({ txval: 0, iamt: 0, camt: 0, samt: 0, cess: 0 });
    const add = (acc, v) => {
      acc.txval += Number(v.taxable || 0);
      acc.iamt += Number(v.igst || 0);
      acc.camt += Number(v.cgst || 0);
      acc.samt += Number(v.sgst || 0);
    };
    const round = (a) => {
      for (const k of Object.keys(a)) a[k] = Number(a[k].toFixed(2));
      return a;
    };

    const taxable_and_advances = zero(); // outward taxable (tax payable)
    const not_payable = zero(); // outward nil/exempt/non-GST
    const itc_availed = zero(); // inward (Purchase) tax credit
    const summary_outward = zero();
    const summary_inward = zero();
    const vc = { total: 0, included: 0, not_relevant: 0, uncertain: 0 };

    for (const v of rows) {
      vc.total++;
      const cls = classifyVoucher(v, 'GSTR3B', companyGstinInvalid); // annual = outward + inward
      if (cls.bucket === 'not_relevant') {
        vc.not_relevant++;
        continue;
      }
      if (cls.bucket === 'uncertain') {
        vc.uncertain++;
        continue;
      }
      vc.included++;

      const isInward = v.voucher_type === 'Purchase';
      if (isInward) {
        add(itc_availed, v);
        add(summary_inward, v);
      } else {
        add(summary_outward, v);
        if (Number(v.max_rate || 0) > 0) add(taxable_and_advances, v);
        else add(not_payable, v);
      }
    }

    [taxable_and_advances, not_payable, itc_availed, summary_outward, summary_inward].forEach(
      round,
    );

    return {
      success: true,
      payload: {
        fy_label: fyLabel,
        gstin: gstRegistrationId != null ? scopedReg?.gstin || '' : 'All Registrations',
        voucher_count: vc,
        liability: {
          taxable_and_advances,
          not_payable,
          missing_invoice: zero(), // no cross-period invoice tracking offline
        },
        itc: {
          availed: itc_availed,
          reversal: zero(),
        },
        interest_late_fee: zero(),
        hsn_summary: { ...summary_outward },
        summary_outward,
        summary_inward,
      },
    };
  } catch (err) {
    return { success: false, error: err.message };
  }
};

// ───────────────────────────────────────────────────────────────────────────────
// Annual Computation drill tree (GSTR-9 style) — the multi-level breakdown behind
// each Particulars row: section → sub-category → Credit/Debit-note split → monthly
// summary → voucher register. Categories whose data cannot be derived from books
// offline (exports, SEZ, deemed, RCM, imports, ISD, reversals, interest) are shown
// with honest zeros — exactly how the empty rows look in TallyPrime with this data.
// ───────────────────────────────────────────────────────────────────────────────
const cdnSplit = (base) => ({
  supplies: { label: base },
  cn: { label: `Credit Notes Issued for ${base}` },
  dn: { label: `Debit Notes Issued for ${base}` },
});

const ANNUAL_TREE = {
  payable: {
    label: 'Outward and Inward Supplies on Which Tax is Payable (Including Advances)',
    children: {
      b2c: {
        label: 'Supplies to Unregistered Persons Including Credit/Debit Note (B2C)',
        children: {
          supplies: { label: 'Supplies to Unregistered Persons' },
          cn: { label: 'Credit Notes Issued to Unregistered Persons' },
          dn: { label: 'Debit Notes Issued to Unregistered Persons' },
        },
      },
      b2b: {
        label: 'Supplies to Registered Persons Including Credit/Debit Note (B2B)',
        children: {
          supplies: { label: 'Supplies to Registered Persons' },
          cn: { label: 'Credit Notes Issued to Registered Persons' },
          dn: { label: 'Debit Notes Issued to Registered Persons' },
        },
      },
      exports_pay: {
        label: 'Exports with Payment of Tax Including Credit/Debit Note',
        children: cdnSplit('Exports with Payment of Tax'),
      },
      sez_pay: {
        label: 'SEZ Supplies with Payment of Tax Including Credit/Debit Note',
        children: cdnSplit('SEZ Supplies with Payment of Tax'),
      },
      deemed: {
        label: 'Deemed Exports Including Credit/Debit Note',
        children: cdnSplit('Deemed Exports'),
      },
      inward_rcm: { label: 'Inward Supplies on Which Tax is to be Paid on Reverse Charge Basis' },
    },
  },
  not_payable: {
    label: 'Outward Supplies on Which Tax is Not Payable',
    children: {
      exports_nopay: {
        label: 'Exports without Payment of Tax Including Credit/Debit Note',
        children: cdnSplit('Exports without Payment of Tax'),
      },
      sez_nopay: {
        label: 'SEZ Supplies without Payment of Tax Including Credit/Debit Note',
        children: cdnSplit('SEZ Supplies without Payment of Tax'),
      },
      rcm_outward: {
        label: 'Outward Supplies Subject to Reverse Charge Including Credit/Debit Note',
        children: cdnSplit('Outward Supplies Subject to Reverse Charge'),
      },
      exempt: {
        label: 'Exempted Supplies Including Credit/Debit Note',
        children: cdnSplit('Exempted Supplies'),
      },
      nil: {
        label: 'Nil Rated Supplies Including Credit/Debit Note',
        children: cdnSplit('Nil Rated Supplies'),
      },
      non_gst: {
        label: 'Non-GST Supplies Including Credit/Debit Note',
        children: cdnSplit('Non-GST Supplies'),
      },
    },
  },
  itc: {
    label: 'Input Tax Credit',
    children: {
      impg: {
        label: 'Import of Goods (Including Supplies from SEZs)',
        children: {
          inputs: { label: 'Import of Goods - Inputs' },
          capital: { label: 'Import of Goods - Capital Goods' },
          sez_inputs: { label: 'Import of Goods from SEZ - Inputs' },
          sez_capital: { label: 'Import of Goods from SEZ - Capital Goods' },
        },
      },
      imps: { label: 'Import of Services (Excluding Inward Supplies from SEZs)' },
      isrc: { label: 'Inward Supplies Liable to Reverse Charge' },
      isd: { label: 'Inward Supplies from ISD' },
      all_other_itc: { label: 'All Other Input Tax Credit' },
      reclaimed: { label: 'Input Tax Credit Reclaimed' },
      any_other: { label: 'Any Other Input Tax Credit' },
      prev_fy: { label: 'Input Tax Credit Availed for Previous Financial Year' },
    },
  },
  itc_reversal: {
    label: 'Reversal of Input Tax Credit, Adjusted and Ineligible Input Tax Credit Declared',
    children: {
      rule37: { label: 'Non-Payment of Consideration to Supplier (Rule 37)' },
      rule39: { label: 'ISD Credit Note Received (Rule 39)' },
      excess: { label: 'Excess Input Tax Credit Claimed' },
      rule42: { label: 'Exempt and Non-Business Supplies (Rule 42)' },
      rule43: { label: 'Capital Goods Being Used for Exempted Supplies (Rule 43)' },
      sec175: { label: 'Ineligible Credit (Section 17(5))' },
      other: { label: 'Other Reversals' },
      deferral: { label: 'Deferral of Input Tax Credit Availed During Previous Financial Year' },
    },
  },
  interest: {
    label: 'Interest, Late Fee, Penalty and Others',
    children: {
      interest: { label: 'Interest' },
      late_fee: { label: 'Late Fee' },
      penalty: { label: 'Penalty' },
      other: { label: 'Other Charges' },
    },
  },
};

// Which tree leaf an INCLUDED voucher belongs to (dot-path). Book-derivable only:
// taxable outward splits B2B/B2C by party GSTIN with a CN/DN split; zero-rate outward
// lands in Nil Rated; purchases land in All Other ITC. Everything else has no book flag.
const annualCategoryOf = (v) => {
  if (v.voucher_type === 'Purchase') return 'itc.all_other_itc';
  const leaf =
    v.voucher_type === 'Credit Note' ? 'cn' : v.voucher_type === 'Debit Note' ? 'dn' : 'supplies';
  if (Number(v.max_rate || 0) === 0) return `not_payable.nil.${leaf}`;
  return `payable.${v.party_gstin ? 'b2b' : 'b2c'}.${leaf}`;
};

const resolveAnnualNode = (path) => {
  let node = { children: ANNUAL_TREE };
  for (const part of String(path || '')
    .split('.')
    .filter(Boolean)) {
    node = node.children?.[part];
    if (!node) return null;
  }
  return node;
};

const zeroAmts = () => ({ txval: 0, iamt: 0, camt: 0, samt: 0, cess: 0, tax: 0 });
const addAmts = (acc, v) => {
  acc.txval += Number(v.taxable || 0);
  acc.iamt += Number(v.igst || 0);
  acc.camt += Number(v.cgst || 0);
  acc.samt += Number(v.sgst || 0);
  acc.tax += Number(v.igst || 0) + Number(v.cgst || 0) + Number(v.sgst || 0);
};
const roundAmts = (a) => {
  for (const k of Object.keys(a)) a[k] = Number(a[k].toFixed(2));
  return a;
};

// One level of the annual drill tree with real sums per child (prefix-matched).
const getAnnualSectionBreakdown = async (company_id, fy_id, opts = {}) => {
  try {
    const gstRegistrationId =
      opts.gst_registration_id != null ? Number(opts.gst_registration_id) : null;
    const path = String(opts.path || '');
    const node = resolveAnnualNode(path);
    if (!node) return { success: false, error: `Unknown annual section: ${path}` };
    if (!node.children) return { success: true, label: node.label, rows: [] };

    const { rows: vRows, companyGstinInvalid } = await fetchPeriodVouchers(
      company_id,
      fy_id,
      null,
      gstRegistrationId,
      true,
    );
    const sums = {}; // child key -> amounts
    for (const v of vRows) {
      const cls = classifyVoucher(v, 'ANNUAL', companyGstinInvalid);
      if (cls.bucket !== 'included') continue;
      const cat = annualCategoryOf(v);
      if (path && !cat.startsWith(`${path}.`)) continue;
      const childKey = path ? cat.slice(path.length + 1).split('.')[0] : cat.split('.')[0];
      if (!node.children[childKey]) continue;
      addAmts(sums[childKey] || (sums[childKey] = zeroAmts()), v);
    }

    return {
      success: true,
      label: node.label || '',
      rows: Object.entries(node.children).map(([key, child]) => ({
        key: path ? `${path}.${key}` : key,
        label: child.label,
        has_children: !!child.children,
        ...roundAmts(sums[key] || zeroAmts()),
      })),
    };
  } catch (err) {
    return { success: false, error: err.message };
  }
};

// Monthly summary for one category (April..March), or — with `month` (MMYYYY) — the
// intra/interstate × registered/unregistered breakup Tally shows below the month level.
const getAnnualMonthly = async (company_id, fy_id, opts = {}) => {
  try {
    const gstRegistrationId =
      opts.gst_registration_id != null ? Number(opts.gst_registration_id) : null;
    const category = String(opts.category || '');
    const { fyStartDate } = await getDatesForFY(fy_id);
    const { rows: vRows, companyGstinInvalid } = await fetchPeriodVouchers(
      company_id,
      fy_id,
      null,
      gstRegistrationId,
      true,
    );

    const matches = vRows.filter((v) => {
      const cls = classifyVoucher(v, 'ANNUAL', companyGstinInvalid);
      if (cls.bucket !== 'included') return false;
      const cat = annualCategoryOf(v);
      return cat === category || cat.startsWith(`${category}.`);
    });

    if (opts.month) {
      const mm = String(opts.month).substring(0, 2);
      const yy = String(opts.month).substring(2, 6);
      const combos = {
        inter_reg: { label: 'Interstate supplies to registered person', amounts: zeroAmts() },
        inter_unreg: { label: 'Interstate supplies to unregistered person', amounts: zeroAmts() },
        intra_reg: { label: 'Intrastate supplies to registered person', amounts: zeroAmts() },
        intra_unreg: { label: 'Intrastate supplies to unregistered person', amounts: zeroAmts() },
      };
      for (const v of matches) {
        if (String(v.date).substring(0, 7) !== `${yy}-${mm}`) continue;
        const key = `${Number(v.is_interstate || 0) === 1 ? 'inter' : 'intra'}_${v.party_gstin ? 'reg' : 'unreg'}`;
        addAmts(combos[key].amounts, v);
      }
      return {
        success: true,
        view: 'breakup',
        rows: Object.values(combos).map((c) => ({ label: c.label, ...roundAmts(c.amounts) })),
      };
    }

    const months = buildFyMonths(fyStartDate);
    const byYm = {};
    for (const v of matches) {
      const ym = String(v.date).substring(0, 7);
      addAmts(byYm[ym] || (byYm[ym] = zeroAmts()), v);
    }
    const MONTH_NAMES = [
      'January',
      'February',
      'March',
      'April',
      'May',
      'June',
      'July',
      'August',
      'September',
      'October',
      'November',
      'December',
    ];
    return {
      success: true,
      view: 'monthly',
      rows: months.map((mo) => ({
        period: mo.period,
        label: MONTH_NAMES[Number(mo.period.substring(0, 2)) - 1],
        ...roundAmts(byYm[mo.ym] || zeroAmts()),
      })),
    };
  } catch (err) {
    return { success: false, error: err.message };
  }
};

// ───────────────────────────────────────────────────────────────────────────────
// GST Rate Setup (GST Utilities) — list the masters of one type with their GST rate
// configuration and the status bucket each falls under, so the setup grid can group
// them (GST Rate-18%, Exempt, GST Rate Details Not Provided, GST Not Applicable, …).
// All 4 master types keep their own GST columns; ledgers keep them in
// ledger_statutory_details. This is a read view — editing is via the master screens.
// ───────────────────────────────────────────────────────────────────────────────
const rateSetupStatus = ({ gst_applicability, taxability_type, gst_rate, hsn }) => {
  const taxability = String(taxability_type || '').trim();
  const rate = Number(gst_rate) || 0;
  if (String(gst_applicability || '') === 'Not Applicable') return 'GST Not Applicable';
  if (/exempt/i.test(taxability)) return 'Exempt';
  if (/nil/i.test(taxability)) return 'Nil Rated';
  if (/non[- ]?gst/i.test(taxability)) return 'Non-GST';
  if (/taxable/i.test(taxability)) return `GST Rate-${rate}%`;
  if (!taxability && rate === 0 && !String(hsn || '').trim())
    return 'GST Rate Details Not Provided';
  return `GST Rate-${rate}%`;
};

const RATE_SETUP_QUERIES = {
  stock_item: (company_id) => sql`
    SELECT item_id AS id, name, gst_applicable AS gst_applicability,
           taxability_type, gst_rate, COALESCE(NULLIF(hsn_sac, ''), hsn_code) AS hsn
    FROM stock_items WHERE company_id = ${company_id} AND is_active = 1
    ORDER BY name COLLATE NOCASE`,
  ledger: (company_id) => sql`
    SELECT l.ledger_id AS id, l.name,
           COALESCE(sd.gst_applicability, 'Not Applicable') AS gst_applicability,
           sd.taxability_type AS taxability_type, sd.gst_rate AS gst_rate,
           sd.hsn_sac_code AS hsn
    FROM ledgers l
    LEFT JOIN ledger_statutory_details sd ON sd.ledger_id = l.ledger_id
    WHERE l.company_id = ${company_id} AND l.is_active = 1
    ORDER BY l.name COLLATE NOCASE`,
  group: (company_id) => sql`
    SELECT group_id AS id, name, NULL AS gst_applicability,
           taxability_type, gst_rate, hsn_sac_code AS hsn
    FROM groups WHERE company_id = ${company_id} AND is_active = 1
    ORDER BY name COLLATE NOCASE`,
  stock_group: (company_id) => sql`
    SELECT sg_id AS id, name, NULL AS gst_applicability,
           taxability_type, gst_rate, hsn_sac_code AS hsn
    FROM stock_groups WHERE company_id = ${company_id} AND is_active = 1
    ORDER BY name COLLATE NOCASE`,
};

const getGstRateSetup = async (company_id, master_type) => {
  try {
    const build = RATE_SETUP_QUERIES[master_type];
    if (!build) return { success: false, error: `Unknown master type: ${master_type}` };
    const rows = await db.all(build(company_id));
    const masters = rows.map((r) => ({
      id: r.id,
      name: r.name,
      taxability_type: r.taxability_type || '',
      gst_rate: Number(r.gst_rate) || 0,
      hsn: r.hsn || '',
      gst_applicability: r.gst_applicability || '',
      status: rateSetupStatus(r),
    }));
    return { success: true, masters };
  } catch (err) {
    return { success: false, error: err.message };
  }
};

// ───────────────────────────────────────────────────────────────────────────────
// Validate Party GSTIN/UIN (GST Utilities) — list party ledgers with their GST
// registration details and an OFFLINE validity check (format + PAN-in-GSTIN). No GST
// portal round-trip exists, so "valid" = well-formed GSTIN whose embedded PAN matches
// the ledger PAN; a registered party with a missing/malformed GSTIN is an exception.
// ───────────────────────────────────────────────────────────────────────────────
const validatePartyGstin = async (company_id, opts = {}) => {
  try {
    const groupName = opts.group_name && opts.group_name !== 'All Items' ? opts.group_name : null;
    const ledgerName =
      opts.ledger_name && opts.ledger_name !== 'All Items' ? opts.ledger_name : null;

    const scope = groupName
      ? sql`AND g.name = ${groupName}`
      : sql`AND (g.name IN ('Sundry Debtors', 'Sundry Creditors', 'Branch / Divisions')
                 OR (l.gstin IS NOT NULL AND l.gstin != '')
                 OR (l.registration_type IS NOT NULL AND l.registration_type != 'Unregistered'))`;
    const ledgerFilter = ledgerName ? sql`AND l.name = ${ledgerName}` : sql``;

    const rows = await db.all(
      sql`SELECT l.ledger_id AS id, l.name, l.mailing_name,
                 l.address1, l.address2, l.state, l.country,
                 l.registration_type, l.gstin, l.pan, g.name AS group_name
          FROM ${ledgers} l
          LEFT JOIN groups g ON g.group_id = l.group_id
          WHERE l.company_id = ${company_id} AND l.is_active = 1
          ${scope} ${ledgerFilter}
          ORDER BY l.name COLLATE NOCASE`,
    );

    const parties = rows.map((r) => {
      const gstin = String(r.gstin || '')
        .trim()
        .toUpperCase();
      const pan = String(r.pan || '')
        .trim()
        .toUpperCase();
      const registered =
        !!r.registration_type &&
        r.registration_type !== 'Unregistered' &&
        r.registration_type !== 'Consumer';

      let valid = true;
      let status = 'Not Applicable';
      if (!gstin) {
        valid = !registered;
        status = registered ? 'GSTIN/UIN not specified' : 'Not Applicable';
      } else if (!GSTIN_RE.test(gstin)) {
        valid = false;
        status = 'Invalid GSTIN/UIN format';
      } else if (pan && gstin.substring(2, 12) !== pan) {
        valid = false;
        status = 'PAN in GSTIN/UIN does not match';
      } else {
        valid = true;
        status = 'Valid';
      }

      const address = [r.address1, r.address2].filter(Boolean).join(', ');
      return {
        id: r.id,
        name: r.name,
        address,
        state: r.state || '',
        country: r.country || '',
        registration_type: r.registration_type || '',
        gstin,
        pan,
        valid,
        status,
      };
    });

    return { success: true, parties };
  } catch (err) {
    return { success: false, error: err.message };
  }
};

// India GST state codes (first two digits of a GSTIN) → state name.
const GST_STATE_CODES = {
  '01': 'Jammu & Kashmir',
  '02': 'Himachal Pradesh',
  '03': 'Punjab',
  '04': 'Chandigarh',
  '05': 'Uttarakhand',
  '06': 'Haryana',
  '07': 'Delhi',
  '08': 'Rajasthan',
  '09': 'Uttar Pradesh',
  10: 'Bihar',
  11: 'Sikkim',
  12: 'Arunachal Pradesh',
  13: 'Nagaland',
  14: 'Manipur',
  15: 'Mizoram',
  16: 'Tripura',
  17: 'Meghalaya',
  18: 'Assam',
  19: 'West Bengal',
  20: 'Jharkhand',
  21: 'Odisha',
  22: 'Chhattisgarh',
  23: 'Madhya Pradesh',
  24: 'Gujarat',
  25: 'Daman & Diu',
  26: 'Dadra & Nagar Haveli',
  27: 'Maharashtra',
  28: 'Andhra Pradesh',
  29: 'Karnataka',
  30: 'Goa',
  31: 'Lakshadweep',
  32: 'Kerala',
  33: 'Tamil Nadu',
  34: 'Puducherry',
  35: 'Andaman & Nicobar Islands',
  36: 'Telangana',
  37: 'Andhra Pradesh',
  38: 'Ladakh',
  97: 'Other Territory',
};

// ───────────────────────────────────────────────────────────────────────────────
// Create Party Using GSTIN/UIN (GST Utilities) — create a party ledger for each
// GSTIN. Offline (no portal), the derivable details are State (from the state-code
// prefix), PAN (chars 3-12) and Registration Type; the ledger is named after the
// GSTIN and can be renamed later. Reuses ledgerService.create so the ledger is set
// up exactly like a manually-created one.
// ───────────────────────────────────────────────────────────────────────────────
const createPartiesFromGstin = async (company_id, opts = {}) => {
  try {
    const ledgerService = require('../ledger/ledgerService');
    const groupName = opts.group_name || 'Sundry Debtors';
    const grp = await db.all(
      sql`SELECT group_id FROM groups
          WHERE company_id = ${company_id} AND name = ${groupName} AND is_active = 1 LIMIT 1`,
    );
    const groupId = grp[0] ? grp[0].group_id : null;
    if (!groupId) return { success: false, error: `Group "${groupName}" not found.` };

    const results = [];
    for (const raw of opts.gstins || []) {
      const gstin = String(raw || '')
        .trim()
        .toUpperCase();
      if (!gstin) continue;
      if (!GSTIN_RE.test(gstin)) {
        results.push({ gstin, success: false, error: 'Invalid GSTIN/UIN format' });
        continue;
      }
      const stateCode = gstin.substring(0, 2);
      const state = GST_STATE_CODES[stateCode] || '';
      const pan = gstin.substring(2, 12);
      const res = await ledgerService.create({
        company_id,
        name: gstin,
        group_id: groupId,
        state,
        country: 'India',
        gstin,
        pan,
        registration_type: 'Regular',
      });
      results.push({
        gstin,
        success: !!res.success,
        ledger_id: res.ledger?.ledger_id ?? res.ledger_id ?? null,
        state,
        error: res.error,
      });
    }
    return { success: true, results };
  } catch (err) {
    return { success: false, error: err.message };
  }
};

// ───────────────────────────────────────────────────────────────────────────────
// GST Advances - Opening Balance (GST Utilities) — CRUD over gst_opening_advances,
// the unadjusted advance receipts/payments carrying GST liability at the opening date.
// The GST split (intra CGST+SGST vs inter IGST) is computed by the caller and stored.
// ───────────────────────────────────────────────────────────────────────────────
const getGstOpeningAdvances = async (company_id) => {
  try {
    const rows = await db.all(
      sql`SELECT * FROM gst_opening_advances WHERE company_id = ${company_id}
          ORDER BY advance_id DESC`,
    );
    return { success: true, advances: rows };
  } catch (err) {
    return { success: false, error: err.message };
  }
};

const createGstOpeningAdvance = async (company_id, data = {}) => {
  try {
    const n = (v) => Number(v) || 0;
    await db.execute(
      `INSERT INTO gst_opening_advances
         (company_id, gst_registration_id, registration_name, party_ledger_id, party_name,
          type_of_advance, place_of_supply, reverse_charge, date, taxability, gst_rate,
          advance_amount, taxable_amount, igst, cgst, sgst, cess)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        company_id,
        data.gst_registration_id ?? null,
        data.registration_name ?? null,
        data.party_ledger_id ?? null,
        data.party_name ?? null,
        data.type_of_advance === 'Payment' ? 'Payment' : 'Receipt',
        data.place_of_supply ?? null,
        data.reverse_charge ? 1 : 0,
        data.date ?? null,
        data.taxability ?? 'Taxable',
        n(data.gst_rate),
        n(data.advance_amount),
        n(data.taxable_amount),
        n(data.igst),
        n(data.cgst),
        n(data.sgst),
        n(data.cess),
      ],
    );
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
};

const deleteGstOpeningAdvance = async (advance_id, company_id) => {
  try {
    await db.execute(`DELETE FROM gst_opening_advances WHERE advance_id = ? AND company_id = ?`, [
      advance_id,
      company_id,
    ]);
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
};

// ───────────────────────────────────────────────────────────────────────────────
// GST Reports → Other Reports (Marked Vouchers, Outstanding Advances, Reverse Charge).
// ───────────────────────────────────────────────────────────────────────────────

// Marked Vouchers register — the full voucher register (day-book style). The amount
// shows on the party ledger's own side (Dr→Debit, Cr→Credit); no-party vouchers show
// the total under Debit. Rows drill to the voucher.
const getMarkedVouchers = async (company_id, fy_id) => {
  try {
    const rows = await db.all(
      sql`SELECT v.voucher_id, v.date, v.voucher_type, v.voucher_number,
                 COALESCE(NULLIF(v.party_name, ''), l.name, '') AS particulars,
                 COALESCE(e.dr_total, 0) AS dr_total,
                 COALESCE(e.cr_total, 0) AS cr_total,
                 COALESCE(p.party_type, '') AS party_type
          FROM ${vouchers} v
          LEFT JOIN ${ledgers} l ON l.ledger_id = v.party_ledger_id
          LEFT JOIN (
            SELECT voucher_id,
                   SUM(CASE WHEN type = 'Dr' THEN amount ELSE 0 END) AS dr_total,
                   SUM(CASE WHEN type = 'Cr' THEN amount ELSE 0 END) AS cr_total
            FROM voucher_entries GROUP BY voucher_id
          ) e ON e.voucher_id = v.voucher_id
          LEFT JOIN (
            SELECT voucher_id, ledger_id, MAX(type) AS party_type
            FROM voucher_entries GROUP BY voucher_id, ledger_id
          ) p ON p.voucher_id = v.voucher_id AND p.ledger_id = v.party_ledger_id
          WHERE v.company_id = ${company_id} AND v.fy_id = ${fy_id} AND v.is_cancelled = 0
          ORDER BY v.date ASC, v.voucher_id ASC`,
    );
    const list = rows.map((r) => {
      const total = Math.max(Number(r.dr_total) || 0, Number(r.cr_total) || 0);
      const onCredit = r.party_type === 'Cr';
      return {
        voucher_id: r.voucher_id,
        date: r.date,
        particulars: r.particulars,
        voucher_type: r.voucher_type,
        voucher_number: r.voucher_number,
        debit: onCredit ? 0 : total,
        credit: onCredit ? total : 0,
      };
    });
    return { success: true, vouchers: list };
  } catch (err) {
    return { success: false, error: err.message };
  }
};

// Outstanding Advance Receipts / Advance Paid — per-party opening / received / adjusted
// GST on unadjusted advances. Opening Balance comes from gst_opening_advances (the
// GST Advances - Opening Balance utility). Received/Adjusted are 0 until the app tracks
// GST-bearing advance receipts and their invoice adjustments as distinct data.
const getGstAdvancesReport = async (company_id, fy_id, type = 'Receipt') => {
  try {
    const kind = type === 'Payment' ? 'Payment' : 'Receipt';
    const rows = await db.all(
      sql`SELECT party_name, place_of_supply, registration_name,
                 COALESCE(SUM(taxable_amount), 0) AS taxable,
                 COALESCE(SUM(igst), 0) AS igst,
                 COALESCE(SUM(cgst), 0) AS cgst,
                 COALESCE(SUM(sgst), 0) AS sgst,
                 COALESCE(SUM(cess), 0) AS cess
          FROM gst_opening_advances
          WHERE company_id = ${company_id} AND type_of_advance = ${kind}
          GROUP BY party_name, place_of_supply
          ORDER BY party_name COLLATE NOCASE`,
    );
    const parties = rows.map((r) => {
      const igst = Number(r.igst) || 0;
      const cgst = Number(r.cgst) || 0;
      const sgst = Number(r.sgst) || 0;
      const cess = Number(r.cess) || 0;
      return {
        party_name: r.party_name || '',
        place_of_supply: r.place_of_supply || '',
        registration_name: r.registration_name || '',
        opening: {
          taxable: Number(r.taxable) || 0,
          igst,
          cgst,
          sgst,
          cess,
          tax: igst + cgst + sgst + cess,
        },
      };
    });
    return { success: true, type: kind, parties };
  } catch (err) {
    return { success: false, error: err.message };
  }
};

// Reverse Charge Supplies — RCM liability/ITC per party. Purchases from unregistered
// parties or flagged reverse-charge attract RCM; the app does not persist an RCM flag
// on vouchers, so this is honestly empty until that data exists (matches TallyPrime EDU).
const getReverseChargeSupplies = async () => {
  // Honestly empty until an RCM flag is persisted on vouchers (matches TallyPrime EDU).
  return { success: true, rows: [] };
};

module.exports = {
  getGSTR1Reconciliation,
  getGSTR2AReconciliation,
  getGSTR2BReconciliation,
  importGSTR2B,
  getIMSInwardSupplies,
  getChallanReconciliation,
  getReturnActivities,
  getReturnStatistics,
  getReturnVouchers,
  getNotRelevantBreakdown,
  getAnnualComputation,
  getAnnualSectionBreakdown,
  getAnnualMonthly,
  annualCategoryOf,
  getGstRateSetup,
  validatePartyGstin,
  createPartiesFromGstin,
  getGstOpeningAdvances,
  createGstOpeningAdvance,
  deleteGstOpeningAdvance,
  getMarkedVouchers,
  getGstAdvancesReport,
  getReverseChargeSupplies,
};
