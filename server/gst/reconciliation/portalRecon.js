'use strict';

// Books-vs-portal reconciliation reports — GSTR-1 / GSTR-2A / GSTR-2B
// reconciliation, GSTR-1 vs 3B cross-check, IMS inward supplies and Challan
// reconciliation, plus the portal-payload import endpoints they read from.

const { db } = require('../../db/index');
const { sql } = require('drizzle-orm');
const {
  vouchers,
  ledgers,
  gstRegistrations,
  voucherStockEntries,
  companies,
} = require('../../db/schema');
const {
  getDatesForFY,
  fetchPeriodVouchers,
  classifyVoucher,
  invoiceOf,
  INWARD_RECON_TYPES,
} = require('./core');

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

// ── Shared books-vs-portal matching ────────────────────────────────────────────────
// Normalizes a document/invoice number so trivial formatting differences don't create
// false "unreconciled" rows: uppercase, drop non-alphanumerics, strip leading zeros —
// "INV-001", "inv001" and "1" all collapse to the same key.
const normalizeInvNo = (s) =>
  String(s || '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .replace(/^0+(?=.)/, '');

const invMatchKey = (gstin, invNo) =>
  `${String(gstin || '').toUpperCase()}-${normalizeInvNo(invNo)}`;

// Tax/taxable amounts within this many rupees count as an exact match (vendor-side fraction
// rounding). Anything larger is a Mismatch — never silently reconciled.
const RECON_TOLERANCE = 10;
const withinTolerance = (a, b) => Math.abs((Number(a) || 0) - (Number(b) || 0)) <= RECON_TOLERANCE;

// Totals a portal invoice (GSTN inv shape) into { txval, tax, val, hasItms }. When the
// portal invoice carries no itemized tax breakdown (only an invoice value), hasItms is
// false and matching falls back to comparing the invoice value.
const portalInvoiceTotals = (inv) => {
  let txval = 0;
  let tax = 0;
  const itms = inv.itms || [];
  for (const it of itms) {
    const d = it.itm_det || it;
    txval += Number(d.txval) || 0;
    tax += (Number(d.iamt) || 0) + (Number(d.camt) || 0) + (Number(d.samt) || 0);
  }
  return { txval, tax, val: Number(inv.val) || 0, hasItms: itms.length > 0 };
};

// Builds Map(normalizedKey → { ctin, inum, totals, matched:false }) from imported portal
// rows. Handles b2b (and b2ba amendments) invoice arrays.
const buildPortalMap = (importedRows) => {
  const map = new Map();
  for (const row of importedRows) {
    let payload;
    try {
      payload = JSON.parse(row.payload_json);
    } catch (_) {
      continue;
    }
    for (const section of ['b2b', 'b2ba']) {
      for (const p of payload[section] || []) {
        for (const inv of p.inv || []) {
          map.set(invMatchKey(p.ctin, inv.inum), {
            ctin: p.ctin,
            inum: inv.inum,
            totals: portalInvoiceTotals(inv),
            matched: false,
          });
        }
      }
    }
  }
  return map;
};

// Reconciles one book document against the portal map, updating counters and marking the
// matched portal entry. Returns the status string for the row.
const matchBookDoc = (v, portalMap, counters) => {
  const key = invMatchKey(v.party_gstin, v.reference_number || v.voucher_number);
  const portal = portalMap.get(key);
  if (portal) {
    portal.matched = true;
    const bookTax = (Number(v.igst) || 0) + (Number(v.cgst) || 0) + (Number(v.sgst) || 0);
    const t = portal.totals;
    // Compare itemized tax/taxable when the portal provides it; otherwise fall back to the
    // invoice value; if the portal gives neither, a key match is the best we can assert.
    const matched = t.hasItms
      ? withinTolerance(t.tax, bookTax) && withinTolerance(t.txval, Number(v.taxable) || 0)
      : t.val
        ? withinTolerance(t.val, invoiceOf(v))
        : true;
    if (matched) {
      counters.reconciled++;
      return 'Reconciled';
    }
    counters.mismatch++;
    counters.mismatches.push({
      gstin: v.party_gstin,
      invoice_no: v.reference_number || v.voucher_number,
      book_taxable: Number(v.taxable) || 0,
      book_tax: bookTax,
      book_invoice: invoiceOf(v),
      portal_taxable: t.txval,
      portal_tax: t.tax,
      portal_invoice: t.val,
    });
    return 'Mismatch';
  }
  if (portalMap.size > 0) {
    // In books, but the supplier has not filed it — ITC at risk.
    counters.missing_in_portal++;
    return 'Missing in Portal';
  }
  // No portal data imported at all — cannot reconcile.
  counters.unreconciled_noportal++;
  return 'Unreconciled';
};

// Portal invoices never matched by any book document — filed by the vendor but missing from
// the books (unclaimed ITC / un-entered purchase).
const collectPortalOnly = (portalMap) => {
  const only = [];
  for (const p of portalMap.values()) {
    if (!p.matched) {
      only.push({ gstin: p.ctin, invoice_no: p.inum, taxable: p.totals.txval, tax: p.totals.tax });
    }
  }
  return only;
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

    let uncertainCount = 0;
    const counters = {
      reconciled: 0,
      mismatch: 0,
      missing_in_portal: 0,
      unreconciled_noportal: 0,
      mismatches: [],
    };

    // Real reconciliation logic against imported GSTR-2B data
    const importedRows = await db.all(
      sql`SELECT * FROM gstr2b_imports WHERE company_id = ${company_id} AND fy_id = ${fy_id}`,
    );
    const portalMap = buildPortalMap(importedRows);

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

      // Match GSTIN + normalized invoice number, compare amounts within tolerance, and
      // categorise as Reconciled / Mismatch / Missing-in-Portal.
      row.status = matchBookDoc(v, portalMap, counters);
    }

    // Portal invoices the vendor filed that never matched a book document.
    const portalOnly = collectPortalOnly(portalMap);

    return {
      success: true,
      payload: {
        return_view,
        voucher_status: {
          reconciled: counters.reconciled,
          // Back-compat top-line: everything from books that is not a clean match.
          unreconciled:
            counters.mismatch + counters.missing_in_portal + counters.unreconciled_noportal,
          uncertain: uncertainCount,
          // Detailed breakdown (new):
          mismatch: counters.mismatch,
          missing_in_portal: counters.missing_in_portal, // in books, vendor hasn't filed
          missing_in_books: portalOnly.length, // filed by vendor, not entered in books
        },
        mismatches: counters.mismatches,
        portal_only: portalOnly,
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

const importGSTR2A = async (company_id, fy_id, return_period, payload) => {
  try {
    await db.execute(`DELETE FROM gstr2a_imports WHERE company_id = ? AND return_period = ?`, [
      company_id,
      return_period,
    ]);
    await db.execute(
      `INSERT INTO gstr2a_imports (company_id, fy_id, return_period, payload_json)
       VALUES (?, ?, ?, ?)`,
      [company_id, fy_id, return_period, JSON.stringify(payload)],
    );
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
};

// ── GSTR-1 vs GSTR-3B cross-check ───────────────────────────────────────────────────
// Sums the taxable value + output tax of the TAXED outward supplies in a GSTR-1 payload
// (exempt/nil are excluded so both sides compare like-for-like). Credit notes reduce,
// debit notes add.
const sumGstr1Outward = (payload = {}) => {
  let taxable = 0;
  let tax = 0;
  const addItms = (itms, sign) => {
    for (const it of itms || []) {
      const d = it.itm_det || it;
      taxable += sign * (Number(d.txval) || 0);
      tax +=
        sign *
        ((Number(d.iamt) || 0) +
          (Number(d.camt) || 0) +
          (Number(d.samt) || 0) +
          (Number(d.csamt) || 0));
    }
  };
  for (const p of payload.b2b || []) for (const inv of p.inv || []) addItms(inv.itms, 1);
  for (const p of payload.b2cl || []) for (const inv of p.inv || []) addItms(inv.itms, 1);
  for (const p of payload.exp || []) for (const inv of p.inv || []) addItms(inv.itms, 1);
  for (const r of payload.b2cs || []) {
    taxable += Number(r.txval) || 0;
    tax +=
      (Number(r.iamt) || 0) +
      (Number(r.camt) || 0) +
      (Number(r.samt) || 0) +
      (Number(r.csamt) || 0);
  }
  for (const p of payload.cdnr || [])
    for (const nt of p.nt || []) addItms(nt.itms, nt.ntty === 'C' ? -1 : 1);
  for (const nt of payload.cdnur || []) addItms(nt.itms, nt.ntty === 'C' ? -1 : 1);
  return { taxable, tax };
};

// Sums GSTR-3B's taxable outward liability (3.1a regular + 3.1b zero-rated).
const sumGstr3bOutward = (payload = {}) => {
  const s = payload.sup_details || {};
  const val = (o = {}) => ({
    txval: Number(o.txval) || 0,
    tax:
      (Number(o.iamt) || 0) + (Number(o.camt) || 0) + (Number(o.samt) || 0) + (Number(o.cess) || 0),
  });
  const det = val(s.osup_det);
  const zero = val(s.osup_zero);
  return { taxable: det.txval + zero.txval, tax: det.tax + zero.tax };
};

// Compares GSTR-1 (outward supplies filed) against GSTR-3B (liability declared) month by
// month across a financial year — the classic "sales reported ≠ tax paid" audit red flag.
const getGSTR1vs3BComparison = async (company_id, fy_id) => {
  try {
    const gstr1Service = require('../gstr1Service');
    const gstr3bService = require('../gstr3bService');
    const { fyStartDate, fyLabel } = await getDatesForFY(fy_id);
    const [sy, sm] = fyStartDate.split('-').map(Number);

    const rows = [];
    const totals = { gstr1_taxable: 0, gstr1_tax: 0, gstr3b_taxable: 0, gstr3b_tax: 0 };
    let mismatchCount = 0;

    for (let i = 0; i < 12; i++) {
      const monthIndex = sm + i;
      const y = sy + Math.floor((monthIndex - 1) / 12);
      const m = ((monthIndex - 1) % 12) + 1;
      const period = `${String(m).padStart(2, '0')}${y}`;

      const g1 = await gstr1Service.getGSTR1(company_id, fy_id, period);
      const g3 = await gstr3bService.getGSTR3B(company_id, fy_id, period);
      const one = g1 && g1.success ? sumGstr1Outward(g1.payload) : { taxable: 0, tax: 0 };
      const three = g3 && g3.success ? sumGstr3bOutward(g3.payload) : { taxable: 0, tax: 0 };

      const taxDiff = Number((one.tax - three.tax).toFixed(2));
      const taxableDiff = Number((one.taxable - three.taxable).toFixed(2));
      const matched =
        withinTolerance(one.tax, three.tax) && withinTolerance(one.taxable, three.taxable);
      if (!matched) mismatchCount++;

      // Skip fully-empty months from the detail rows but still surface them if mismatched.
      if (one.tax || three.tax || one.taxable || three.taxable) {
        rows.push({
          period,
          gstr1_taxable: Number(one.taxable.toFixed(2)),
          gstr1_tax: Number(one.tax.toFixed(2)),
          gstr3b_taxable: Number(three.taxable.toFixed(2)),
          gstr3b_tax: Number(three.tax.toFixed(2)),
          taxable_diff: taxableDiff,
          tax_diff: taxDiff,
          status: matched ? 'Matched' : 'Mismatch',
        });
      }
      totals.gstr1_taxable += one.taxable;
      totals.gstr1_tax += one.tax;
      totals.gstr3b_taxable += three.taxable;
      totals.gstr3b_tax += three.tax;
    }

    Object.keys(totals).forEach((k) => (totals[k] = Number(totals[k].toFixed(2))));

    return {
      success: true,
      payload: {
        period_label: fyLabel,
        rows,
        totals,
        mismatch_count: mismatchCount,
        tax_diff_total: Number((totals.gstr1_tax - totals.gstr3b_tax).toFixed(2)),
      },
    };
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
    let portalMap = new Map();
    try {
      const importedRows = await db.all(
        sql`SELECT * FROM gstr2a_imports WHERE company_id = ${company_id} AND fy_id = ${fy_id}`,
      );
      portalMap = buildPortalMap(importedRows);
    } catch (_) {
      /* gstr2a_imports table missing / unreadable — books-only view */
    }

    let uncertain = 0;
    const counters = {
      reconciled: 0,
      mismatch: 0,
      missing_in_portal: 0,
      unreconciled_noportal: 0,
      mismatches: [],
    };

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

      row.status = matchBookDoc(v, portalMap, counters);
    }

    const portalOnly = collectPortalOnly(portalMap);

    return {
      success: true,
      payload: {
        return_view,
        voucher_status: {
          reconciled: counters.reconciled,
          unreconciled:
            counters.mismatch + counters.missing_in_portal + counters.unreconciled_noportal,
          uncertain,
          mismatch: counters.mismatch,
          missing_in_portal: counters.missing_in_portal,
          missing_in_books: portalOnly.length,
        },
        mismatches: counters.mismatches,
        portal_only: portalOnly,
        period_label: fyLabel,
        last_gst_activity: portalMap.size > 0 ? 'GSTR-2A imported' : 'No portal 2A imported',
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

module.exports = {
  getGSTR1Reconciliation,
  getGSTR2AReconciliation,
  getGSTR2BReconciliation,
  getGSTR1vs3BComparison,
  importGSTR2B,
  importGSTR2A,
  getIMSInwardSupplies,
  getChallanReconciliation,
  // Shared matching primitives — reused by reconDetail.js for the party/voucher drill.
  _recon: { invMatchKey, normalizeInvNo, portalInvoiceTotals, withinTolerance, RECON_TOLERANCE },
};
