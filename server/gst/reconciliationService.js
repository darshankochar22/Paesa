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
  status: ""
});

const getDatesForFY = async (fy_id) => {
  let fyStartDate = null;
  let fyEndDate = null;
  let fyLabel = "";
  try {
    const fyRows = await db.all(
      sql`SELECT * FROM financial_years WHERE fy_id = ${fy_id}`
    );
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

const getGSTR1Reconciliation = async (company_id, fy_id) => {
  try {
    const { fyStartDate, fyEndDate, fyLabel } = await getDatesForFY(fy_id);

    // Books side: outward documents with tax totalled from the stock lines
    // (the voucher row itself carries no tax aggregate columns).
    const rawVouchers = await db.all(
      sql`SELECT v.voucher_id, v.voucher_type, v.voucher_number, v.reference_number,
                 l.gstin AS party_gstin, l.registration_type AS party_reg_type,
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
            AND v.voucher_type IN ('Sales', 'Credit Note', 'Debit Note')
          GROUP BY v.voucher_id`
    );

    const keys = [
      "b2b", "b2c_large", "exports", "cdn_registered", "cdn_unreg",
      "amend_b2b", "amend_b2c", "amend_exports", "amend_cdn_reg", "amend_cdn_unreg",
      "b2c_small", "nil_rated", "amend_b2c_small", "tax_liability_advances",
      "adjustment_advances", "amend_tax_liability", "amend_adjustment",
      "hsn_summary", "doc_summary"
    ];

    const return_view = {};
    keys.forEach(k => {
      return_view[k] = ZERO_ROW();
    });

    let reconciledCount = 0;
    let unreconciledCount = 0;

    // Portal side: GSTR-1 has no import path yet, so books-only documents are
    // honestly reported as Unreconciled (matches the 2A books-only behaviour).
    for (const v of rawVouchers) {
      const isCreditDebit = v.voucher_type === 'Credit Note' || v.voucher_type === 'Debit Note';
      const hasGstin = !!v.party_gstin;

      let category = "b2c_small";
      if (isCreditDebit) {
        category = hasGstin ? "cdn_registered" : "cdn_unreg";
      } else if (hasGstin) {
        category = "b2b";
      }

      const row = return_view[category];
      row.vch_count++;
      row.taxable_amount += Number(v.taxable_amount) || 0;
      row.igst += Number(v.igst) || 0;
      row.cgst += Number(v.cgst) || 0;
      row.sgst += Number(v.sgst) || 0;
      row.tax_amount += (Number(v.igst) || 0) + (Number(v.cgst) || 0) + (Number(v.sgst) || 0);
      row.invoice_amount += Number(v.invoice_amount) || 0;

      row.status = "Unreconciled";
      unreconciledCount++;
    }

    return {
      success: true,
      payload: {
        return_view,
        voucher_status: {
          reconciled: reconciledCount,
          unreconciled: unreconciledCount,
          uncertain: 0
        },
        period_label: fyLabel
      }
    };
  } catch (err) {
    return { success: false, error: err.message };
  }
};

const getGSTR2BReconciliation = async (company_id, fy_id) => {
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
          GROUP BY v.voucher_id`
    );

    const keys = [
      "itc_available_other", "itc_available_isd", "itc_available_rcm", "itc_available_import", "itc_available_reversal", "itc_available_others",
      "itc_unavailable_other", "itc_unavailable_isd", "itc_unavailable_rcm", "itc_unavailable_reversal", "itc_unavailable_others"
    ];

    const return_view = {};
    keys.forEach(k => {
      return_view[k] = ZERO_ROW();
    });

    let reconciledCount = 0;
    let unreconciledCount = 0;

    // Real reconciliation logic against imported GSTR-2B data
    const importedRows = await db.all(
      sql`SELECT * FROM gstr2b_imports WHERE company_id = ${company_id} AND fy_id = ${fy_id}`
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

    for (const v of rawVouchers) {
      // Purchases feed "All other ITC"; purchase returns (Debit Notes) feed the
      // Part-B reversal row — mirrors how the portal 2B statement buckets them.
      const bucket = v.voucher_type === 'Debit Note' ? 'itc_available_reversal' : 'itc_available_other';
      const row = return_view[bucket];
      row.vch_count++;
      row.taxable_amount += Number(v.taxable_amount) || 0;
      row.igst += Number(v.igst) || 0;
      row.cgst += Number(v.cgst) || 0;
      row.sgst += Number(v.sgst) || 0;
      row.tax_amount += (Number(v.igst) || 0) + (Number(v.cgst) || 0) + (Number(v.sgst) || 0);
      row.invoice_amount += Number(v.invoice_amount) || 0;

      // Reconciliation: match GSTIN and Invoice Number
      const key = `${v.party_gstin}-${v.reference_number || v.voucher_number}`.toUpperCase();
      if (portalInvoices.has(key)) {
        row.status = "Reconciled";
        reconciledCount++;
      } else {
        row.status = "Unreconciled";
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
          uncertain: 0
        },
        period_label: fyLabel,
        last_gst_activity: importedRows.length > 0 ? importedRows[importedRows.length - 1].created_at : "No Activity Found"
      }
    };
  } catch (err) {
    return { success: false, error: err.message };
  }
};

const importGSTR2B = async (company_id, fy_id, return_period, payload) => {
  try {
    // Upsert — db.execute delegates to the raw libsql client (string + params),
    // NOT the drizzle sql template.
    await db.execute(
      `DELETE FROM gstr2b_imports WHERE company_id = ? AND return_period = ?`,
      [company_id, return_period]
    );

    await db.execute(
      `INSERT INTO gstr2b_imports (company_id, fy_id, return_period, payload_json)
       VALUES (?, ?, ?, ?)`,
      [company_id, fy_id, return_period, JSON.stringify(payload)]
    );
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
};

const getGSTR2AReconciliation = async (company_id, fy_id) => {
  try {
    const { fyStartDate, fyEndDate, fyLabel } = await getDatesForFY(fy_id);

    // Books side: inward documents with their tax totalled from the stock lines
    // (more reliable than reading aggregate columns that may not exist on the voucher row).
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
          WHERE v.company_id = ${company_id} AND v.fy_id = ${fy_id} AND v.is_cancelled = 0
            AND v.date >= ${fyStartDate} AND v.date <= ${fyEndDate}
            AND v.voucher_type IN ('Purchase', 'Credit Note', 'Debit Note')
          GROUP BY v.voucher_id`
    );

    const keys = ['b2b', 'amend_b2b', 'cdn', 'amend_cdn', 'isd', 'import_boe', 'import_sez_boe'];
    const return_view = {};
    keys.forEach((k) => { return_view[k] = ZERO_ROW(); });

    // Reconcile against imported GSTR-2A portal data (if the user has imported any).
    const portalInvoices = new Map();
    try {
      const importedRows = await db.all(
        sql`SELECT * FROM gstr2a_imports WHERE company_id = ${company_id} AND fy_id = ${fy_id}`
      );
      for (const row of importedRows) {
        try {
          const payload = JSON.parse(row.payload_json);
          for (const p of payload.b2b || []) {
            for (const inv of p.inv || []) {
              portalInvoices.set(`${p.ctin}-${inv.inum}`.toUpperCase(), inv);
            }
          }
        } catch (_) { /* skip malformed import */ }
      }
    } catch (_) { /* no gstr2a_imports table yet — books-only view */ }

    let reconciled = 0;
    let unreconciled = 0;

    for (const v of rawVouchers) {
      const bucket = v.voucher_type === 'Purchase' ? 'b2b' : 'cdn';
      const row = return_view[bucket];
      row.vch_count++;
      row.taxable_amount += Number(v.taxable_amount) || 0;
      row.igst += Number(v.igst) || 0;
      row.cgst += Number(v.cgst) || 0;
      row.sgst += Number(v.sgst) || 0;
      row.cess += Number(v.cess) || 0;
      row.tax_amount += (Number(v.igst) || 0) + (Number(v.cgst) || 0) + (Number(v.sgst) || 0) + (Number(v.cess) || 0);
      row.invoice_amount += Number(v.invoice_amount) || 0;

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
        voucher_status: { reconciled, unreconciled, uncertain: 0 },
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
          GROUP BY v.voucher_id`
    );

    const keys = [
      "b2b", "amend_b2b", "cdn", "amend_cdn", "debit_note", "amend_debit_note",
      "impg", "amend_impg", "impgsez", "amend_impgsez"
    ];

    const return_view = {};
    keys.forEach(k => {
      return_view[k] = ZERO_ROW();
    });

    // Supplier-filed status comes from imported GSTR-2B portal data: an invoice
    // present in the 2B statement has been filed (uploaded) by the supplier.
    const portalInvoices = new Map();
    try {
      const importedRows = await db.all(
        sql`SELECT * FROM gstr2b_imports WHERE company_id = ${company_id} AND fy_id = ${fy_id}`
      );
      for (const row of importedRows) {
        try {
          const payload = JSON.parse(row.payload_json);
          for (const p of payload.b2b || []) {
            for (const inv of p.inv || []) {
              portalInvoices.set(`${p.ctin}-${inv.inum}`.toUpperCase(), inv);
            }
          }
        } catch (_) { /* skip malformed import */ }
      }
    } catch (_) { /* no imports yet — books-only view */ }

    let totalCount = 0;
    let filedUploaded = 0;
    let yetFiled = 0;

    for (const v of rawVouchers) {
      const isCreditDebit = v.voucher_type === 'Credit Note' || v.voucher_type === 'Debit Note';
      const category = isCreditDebit ? "cdn" : "b2b";
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
            uploaded: filedUploaded
          },
          yet_filed: {
            total: yetFiled,
            action_required: yetFiled,
            ready_for_upload: 0,
            uploaded: 0
          }
        },
        period_label: fyLabel
      }
    };
  } catch (err) {
    return { success: false, error: err.message };
  }
};

const getChallanReconciliation = async (company_id, fy_id) => {
  try {
    const { fyStartDate, fyEndDate, fyLabel } = await getDatesForFY(fy_id);

    // Fetch Payment vouchers which could represent Tax payments
    const rawVouchers = await db.all(
      sql`SELECT v.*, l.name as party_name
          FROM ${vouchers} v
          LEFT JOIN ${ledgers} l ON l.ledger_id = v.party_ledger_id
          WHERE v.company_id = ${company_id}
            AND v.fy_id = ${fy_id}
            AND v.is_cancelled = 0
            AND v.date >= ${fyStartDate}
            AND v.date <= ${fyEndDate}
            AND v.voucher_type = 'Payment'`
    );

    // Challan identifiers (CPIN/CIN/BRN) live on the GST portal; until a challan
    // import exists they are honestly blank instead of fabricated.
    const challans = rawVouchers.map((v, idx) => {
      return {
        date: v.date,
        particulars: v.party_name || "GST Tax Payment",
        vch_type: v.voucher_type,
        vch_no: v.voucher_number || `PMT-${idx + 1}`,
        type_of_tax_payment: "GST",
        payment_period_from: fyStartDate,
        payment_period_to: fyEndDate,
        type_of_payment: "Tax Payment",
        mode_of_payment: "",
        bank_name: "",
        cpin: "",
        cin: "",
        brn_utr: "",
        instrument_number: "",
        instrument_date: v.date,
        payment_date: v.date,
        amount: v.amount || 0
      };
    });

    return {
      success: true,
      payload: {
        challans,
        period_label: fyLabel
      }
    };
  } catch (err) {
    return { success: false, error: err.message };
  }
};

// Real return-filing status for the "Track GST Return Activities" dashboard,
// computed from books (data-quality exceptions + whether a return has been filed).
const getReturnActivities = async (company_id, fy_id) => {
  try {
    const { fyLabel } = await getDatesForFY(fy_id);

    // GSTR-1 corrections: outward sales invoices with a data-quality problem
    // (registered party but missing/invalid GSTIN, or a missing place of supply).
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
            )`
    );
    const corrections = Number(corrRows[0]?.n || 0);

    // Inward documents — treated as reconciliation exceptions until matched against
    // imported 2A/2B portal data.
    const purRows = await db.all(
      sql`SELECT COUNT(DISTINCT v.voucher_id) AS n
          FROM ${vouchers} v
          WHERE v.company_id = ${company_id} AND v.fy_id = ${fy_id} AND v.is_cancelled = 0
            AND v.voucher_type IN ('Purchase', 'Credit Note', 'Debit Note')`
    );
    const inwardCount = Number(purRows[0]?.n || 0);

    let gstr1Filed = false;
    let gstr3bFiled = false;
    try {
      const r = await db.all(sql`SELECT COUNT(*) AS n FROM gstr1_exports WHERE company_id = ${company_id} AND fy_id = ${fy_id} AND status = 'Filed'`);
      gstr1Filed = Number(r[0]?.n || 0) > 0;
    } catch (_) { /* table may not exist */ }
    try {
      const r = await db.all(sql`SELECT COUNT(*) AS n FROM gstr3b_exports WHERE company_id = ${company_id} AND fy_id = ${fy_id} AND status = 'Filed'`);
      gstr3bFiled = Number(r[0]?.n || 0) > 0;
    } catch (_) { /* table may not exist */ }

    return {
      success: true,
      activities: {
        period_label: fyLabel,
        returns: [
          { name: 'GSTR-1', corrections, pending_upload: 0, recon_exceptions: 0, pending_file: gstr1Filed ? 0 : 1 },
          { name: 'GSTR-2A', corrections: 0, pending_upload: null, recon_exceptions: inwardCount, pending_file: null },
          { name: 'GSTR-2B', corrections: 0, pending_upload: null, recon_exceptions: inwardCount, pending_file: null },
          { name: 'GSTR-3B', corrections, pending_upload: 0, recon_exceptions: 0, pending_file: gstr3bFiled ? 0 : 1 },
        ],
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
  importGSTR2B,
  getIMSInwardSupplies,
  getChallanReconciliation,
  getReturnActivities,
};
