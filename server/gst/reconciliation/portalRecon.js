'use strict';

// Books-vs-portal reconciliation reports — GSTR-1 reconciliation, GSTR-1 vs 3B
// cross-check, IMS inward supplies and Challan reconciliation, plus the GSTR-2A/2B
// portal-statement import endpoints. The 2A/2B reconciliation screens themselves are
// served by reconDetail.js (which reuses this file's matching primitives via _recon).

const { db } = require('../../db/index');
const { sql } = require('drizzle-orm');
const { vouchers, ledgers, voucherStockEntries } = require('../../db/schema');
const { getDatesForFY, fetchPeriodVouchers, classifyVoucher, invoiceOf } = require('./core');

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

// Books often hold only the NUMERIC TAIL of a supplier's bill number while the portal
// carries the supplier's full format — books "266" vs portal "NN/25-26/266", books
// "882" vs portal "SN/882". Same document, and the exact key can never join them.
// This secondary key is the trailing digit run, leading zeros stripped. It is only ever
// used when the exact key misses AND the key is unique on BOTH sides, so an ambiguous
// tail (two documents ending 266) pairs nothing rather than guessing.
const trailingDigits = (docNo) => {
  const m = /(\d+)\s*$/.exec(String(docNo || ''));
  if (!m) return null;
  return m[1].replace(/^0+(?=.)/, '');
};
const invTailKey = (gstin, docNo) => {
  const tail = trailingDigits(docNo);
  return tail ? `${String(gstin || '').toUpperCase()}~${tail}` : null;
};

// Tax/taxable amounts within this many rupees count as an exact match (vendor-side fraction
// rounding). Anything larger is a Mismatch — never silently reconciled.
const RECON_TOLERANCE = 10;
const withinTolerance = (a, b) => Math.abs((Number(a) || 0) - (Number(b) || 0)) <= RECON_TOLERANCE;

// Totals a portal invoice (GSTN inv shape) into { txval, tax, igst, cgst, sgst, cess,
// val, hasItms }. `tax` excludes cess (the books side stores no cess, so the match
// comparison stays like-for-like); cess is tracked separately for display. When the
// portal invoice carries no itemized tax breakdown (only an invoice value), hasItms is
// false and matching falls back to comparing the invoice value.
const portalInvoiceTotals = (inv) => {
  let txval = 0;
  let igst = 0;
  let cgst = 0;
  let sgst = 0;
  let cess = 0;
  const itms = inv.itms || [];
  for (const it of itms) {
    const d = it.itm_det || it;
    txval += Number(d.txval) || 0;
    igst += Number(d.iamt) || 0;
    cgst += Number(d.camt) || 0;
    sgst += Number(d.samt) || 0;
    cess += Number(d.csamt) || 0;
  }
  return {
    txval,
    igst,
    cgst,
    sgst,
    cess,
    // Cess IS part of the tax total. The books side (reconDetail.addBook) has always
    // included it, so excluding it here made every cess-bearing invoice show a
    // books-vs-portal gap in the tax column even when perfectly reconciled.
    tax: igst + cgst + sgst + cess,
    val: Number(inv.val) || 0,
    hasItms: itms.length > 0,
  };
};

// ── Portal statement import ─────────────────────────────────────────────────────────
// Both the one-click portal fetch AND the manual "Import JSON" button land here, so the
// normalization (official data.docdata / items / igst-key shapes → the matcher's
// b2b/b2ba + itm_det shape) runs on EVERY import path, and the return period is derived
// from the file / validated against the financial year instead of being guessed.
const { buildImportPayload } = require('../../gstFiling/gstr2Transform');

// Pull a MMYYYY return period out of a raw portal payload (official statements carry
// fp / rtnprd at various nesting depths).
const periodFromPayload = (payload) => {
  const candidates = [
    payload?.fp,
    payload?.rtnprd,
    payload?.data?.fp,
    payload?.data?.rtnprd,
    payload?.data?.docdata?.fp,
  ];
  for (const c of candidates) if (/^\d{6}$/.test(String(c || ''))) return String(c);
  return null;
};

const importGstr2Statement = async (table, company_id, fy_id, return_period, payload) => {
  try {
    const period = /^\d{6}$/.test(String(return_period || ''))
      ? String(return_period)
      : periodFromPayload(payload);
    if (!period) {
      return {
        success: false,
        error:
          'Return period not found — the file carries no fp/rtnprd. Enter the period as MMYYYY.',
      };
    }
    // The period must fall inside the financial year being reconciled; otherwise the
    // statement would be compared against a different year's books.
    const { fyStartDate, fyEndDate } = await getDatesForFY(fy_id);
    const ym = `${period.slice(2)}-${period.slice(0, 2)}`;
    if (ym < String(fyStartDate).slice(0, 7) || ym > String(fyEndDate).slice(0, 7)) {
      return {
        success: false,
        error: `Return period ${period} is outside the financial year (${fyStartDate} to ${fyEndDate}).`,
      };
    }

    // Normalize whatever shape arrived (official statement, GSP wrapper, per-section GET,
    // or an already-normalized fetch payload — the transform is idempotent).
    const { payload: normalized, documents } = buildImportPayload({ statement: payload });
    if (!documents) {
      return {
        success: false,
        error:
          'No GSTR-2A/2B document sections (b2b/cdnr) were found in the file — nothing to reconcile.',
      };
    }

    // Upsert — db.execute delegates to the raw libsql client (string + params),
    // NOT the drizzle sql template. Table name is fixed by the callers (whitelisted).
    await db.execute(`DELETE FROM ${table} WHERE company_id = ? AND return_period = ?`, [
      company_id,
      period,
    ]);
    await db.execute(
      `INSERT INTO ${table} (company_id, fy_id, return_period, payload_json)
       VALUES (?, ?, ?, ?)`,
      [company_id, fy_id, period, JSON.stringify(normalized)],
    );
    return { success: true, return_period: period, documents };
  } catch (err) {
    return { success: false, error: err.message };
  }
};

const importGSTR2B = (company_id, fy_id, return_period, payload) =>
  importGstr2Statement('gstr2b_imports', company_id, fy_id, return_period, payload);

const importGSTR2A = (company_id, fy_id, return_period, payload) =>
  importGstr2Statement('gstr2a_imports', company_id, fy_id, return_period, payload);

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
          // b2b AND cdn: notes now live in their own bucket, and a supplier-filed note
          // is just as much evidence of filing as an invoice.
          for (const p of [...(payload.b2b || []), ...(payload.cdn || [])]) {
            for (const inv of p.inv || []) {
              // Same normalized key as the reconciliation matcher, so "INV-001" in books
              // and "INV001" on the portal agree here exactly as they do there.
              portalInvoices.set(invMatchKey(p.ctin, inv.inum), inv);
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
      const key = invMatchKey(v.party_gstin, v.reference_number || v.voucher_number);
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
  getGSTR1vs3BComparison,
  importGSTR2B,
  importGSTR2A,
  getIMSInwardSupplies,
  getChallanReconciliation,
  // Shared matching primitives — reused by reconDetail.js for the party/voucher drill.
  _recon: {
    invMatchKey,
    normalizeInvNo,
    invTailKey,
    trailingDigits,
    portalInvoiceTotals,
    withinTolerance,
    RECON_TOLERANCE,
  },
};
