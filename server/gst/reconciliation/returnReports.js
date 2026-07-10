'use strict';

// Return-period drill reports — Statistics (voucher-type counts), the shared
// voucher register behind every drill (with section/direction/exception
// filters + HSN/docs views) and the Not-Relevant breakdown.

const { db } = require('../../db/index');
const { sql } = require('drizzle-orm');
const {
  vouchers,
  ledgers,
  gstRegistrations,
  voucherStockEntries,
  companies,
} = require('../../db/schema');
const { fetchPeriodVouchers, classifyVoucher, voucherRow, OUTWARD_TYPES } = require('./core');
const { annualCategoryOf } = require('./annual');

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
      // Included vouchers are "Action Pending" until uploaded to the portal; this
      // offline clone has no upload round-trip, so a booked-and-included voucher is
      // always pending (No-Action-Required is reserved for portal-accepted rows).
      else b.included_pending++;
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
      // Per-line tax for the HSN summary. Prefer the stored per-line amount; else derive it
      // from amount × rate — but ONLY when the voucher actually booked GST (has a GST duty
      // ledger). A voucher that charged no GST contributes zero tax (no fabrication), exactly
      // like the voucher-level tax in fetchPeriodVouchers.
      const hsnRes = await db.execute(
        `SELECT COALESCE(NULLIF(vse.hsn_code, ''), 'Not Specified') AS hsn,
                SUM(vse.quantity) AS qty, SUM(vse.amount) AS taxable,
                SUM(CASE WHEN (COALESCE(vse.igst_amount,0)+COALESCE(vse.cgst_amount,0)+COALESCE(vse.sgst_amount,0)) > 0
                         THEN vse.igst_amount
                         WHEN COALESCE(gt.g,0) > 0 AND COALESCE(v.is_interstate,0) = 1
                         THEN vse.amount * COALESCE(vse.gst_rate,0) / 100.0
                         ELSE 0 END) AS igst,
                SUM(CASE WHEN (COALESCE(vse.igst_amount,0)+COALESCE(vse.cgst_amount,0)+COALESCE(vse.sgst_amount,0)) > 0
                         THEN vse.cgst_amount
                         WHEN COALESCE(gt.g,0) > 0 AND COALESCE(v.is_interstate,0) = 0
                         THEN vse.amount * COALESCE(vse.gst_rate,0) / 200.0
                         ELSE 0 END) AS cgst,
                SUM(CASE WHEN (COALESCE(vse.igst_amount,0)+COALESCE(vse.cgst_amount,0)+COALESCE(vse.sgst_amount,0)) > 0
                         THEN vse.sgst_amount
                         WHEN COALESCE(gt.g,0) > 0 AND COALESCE(v.is_interstate,0) = 0
                         THEN vse.amount * COALESCE(vse.gst_rate,0) / 200.0
                         ELSE 0 END) AS sgst
         FROM voucher_stock_entries vse
         JOIN vouchers v ON v.voucher_id = vse.voucher_id
         LEFT JOIN (
           SELECT ve.voucher_id, COUNT(*) AS g
           FROM voucher_entries ve
           JOIN ledger_statutory_details sd
             ON sd.ledger_id = ve.ledger_id AND sd.type_of_duty_tax = 'GST'
           GROUP BY ve.voucher_id
         ) gt ON gt.voucher_id = vse.voucher_id
         WHERE vse.voucher_id IN (${placeholders})
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
      // GSTR-3B table 3.1(a) = outward taxable EXCEPT zero-rated/nil sections.
      if (Array.isArray(opts.exclude_sections) && opts.exclude_sections.includes(cls.section))
        continue;
      if (opts.annual_category) {
        // Annual drill leaf: match this voucher's tree category by exact key or prefix.
        if (cls.bucket !== 'included') continue;
        const cat = annualCategoryOf(v);
        if (cat !== opts.annual_category && !cat.startsWith(`${opts.annual_category}.`)) continue;
      }
      out.push(voucherRow(v, cls));
    }

    // Uncertain resolution's Stock Item-wise view (F5): attach each voucher's item
    // lines so the client can render Tally's per-item sub-rows under the voucher.
    if (opts.with_items && out.length > 0) {
      const ids = out.map((r) => r.voucher_id);
      const placeholders = ids.map(() => '?').join(',');
      const itemRes = await db.execute(
        `SELECT vse.voucher_id, COALESCE(NULLIF(vse.item_name, ''), 'Item') AS item_name,
                vse.amount
         FROM voucher_stock_entries vse
         WHERE vse.voucher_id IN (${placeholders})
         ORDER BY vse.voucher_id, vse.stock_entry_id`,
        ids,
      );
      const byVoucher = {};
      for (const it of itemRes.rows || []) {
        (byVoucher[it.voucher_id] = byVoucher[it.voucher_id] || []).push({
          name: it.item_name,
          amount: Number(it.amount || 0),
        });
      }
      for (const r of out) r.items = byVoucher[r.voucher_id] || [];
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

module.exports = {
  getReturnStatistics,
  getReturnVouchers,
  getNotRelevantBreakdown,
};
