'use strict';

// GSTR-9C — Reconciliation Statement (audited books vs the annual return / GSTR-9).
// The "annual return" side comes from generateAnnualComputation (the same figures the GSTR-9
// suite reports); the "audited books" side comes from the Profit & Loss (which includes
// non-GST income like interest/other income). The turnover gap between them is the real
// reconciling item Table 5 exists to surface.

const { generateAnnualComputation } = require('./annualComputationService');
const { profitLoss } = require('../report/services/profitlossService');

const round2 = (n) => Number((Number(n) || 0).toFixed(2));

const generateGSTR9C = async (company_id, fy_id) => {
  try {
    const annualRes = await generateAnnualComputation(company_id, fy_id);
    if (!annualRes.success) return annualRes;
    const a = annualRes.payload;

    const plRes = await profitLoss(company_id, fy_id);
    const pl = plRes && plRes.success ? plRes : {};

    // ── Part II · Table 5 — Reconciliation of gross turnover ──────────────────
    // 5A: turnover per audited financials (P&L income, incl. non-GST other income).
    const auditedTurnover = round2(
      (pl.totalSales || 0) + (pl.totalDirectIncomes || 0) + (pl.totalIndirectIncomes || 0),
    );
    // 5P: turnover declared in the annual return (all outward supply value).
    const os = a.outward_supplies || {};
    const returnTurnover = round2(
      (os.taxable?.txval || 0) +
        (os.zero?.txval || 0) +
        (os.nil_exmp?.txval || 0) +
        (os.nongst?.txval || 0),
    );
    const turnoverTable = {
      audited_turnover: auditedTurnover, // 5A
      return_turnover: returnTurnover, // 5P
      unreconciled: round2(auditedTurnover - returnTurnover), // 5Q
    };

    // ── Part II · Table 7 — Reconciliation of taxable turnover ────────────────
    const taxableTurnover = {
      taxable: round2(os.taxable?.txval || 0),
      zero_rated: round2(os.zero?.txval || 0),
      exempt_nil_nongst: round2((os.nil_exmp?.txval || 0) + (os.nongst?.txval || 0)),
      total: returnTurnover,
    };

    // ── Part III · Table 9 — Reconciliation of tax paid (rate/head-wise) ──────
    // Books and the return share the same voucher data, so the liability matches; the table
    // is emitted head-wise so an auditor can see (and, later, adjust) each side.
    const tp = a.tax_payable || {};
    const taxReconciliation = ['igst', 'cgst', 'sgst', 'cess'].map((h) => ({
      head: h.toUpperCase(),
      as_per_books: round2(tp[h]),
      as_per_return: round2(tp[h]),
      difference: 0,
    }));

    // ── Part IV · Table 12/14 — Reconciliation of ITC ─────────────────────────
    const itc = a.itc?.total_availed || {};
    const itcReconciliation = [
      {
        head: 'IGST',
        as_per_books: round2(itc.iamt),
        as_per_return: round2(itc.iamt),
        difference: 0,
      },
      {
        head: 'CGST',
        as_per_books: round2(itc.camt),
        as_per_return: round2(itc.camt),
        difference: 0,
      },
      {
        head: 'SGST',
        as_per_books: round2(itc.samt),
        as_per_return: round2(itc.samt),
        difference: 0,
      },
      {
        head: 'CESS',
        as_per_books: round2(itc.cess),
        as_per_return: round2(itc.cess),
        difference: 0,
      },
    ];

    return {
      success: true,
      payload: {
        fy_label: a.fy_label,
        gstin: a.gstin,
        company_name: a.company_name,
        table5_turnover: turnoverTable,
        table7_taxable_turnover: taxableTurnover,
        table9_tax: taxReconciliation,
        table12_itc: itcReconciliation,
        // Honest note: this system is single-source, so tax & ITC reconcile exactly; the
        // turnover gap (5Q) is the non-GST income booked to P&L but not an outward supply.
        note:
          turnoverTable.unreconciled !== 0
            ? 'Unreconciled turnover is typically non-GST income (interest/other income) booked in the P&L but not reported as an outward supply.'
            : '',
      },
    };
  } catch (err) {
    return { success: false, error: err.message };
  }
};

module.exports = { generateGSTR9C };
