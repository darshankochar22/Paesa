'use strict';

const { db } = require('../db/index');
const { sql } = require('drizzle-orm');

// E-TDS quarter for a date: Q1 Apr-Jun, Q2 Jul-Sep, Q3 Oct-Dec, Q4 Jan-Mar.
const quarterOf = (dateStr) => {
  const s = String(dateStr || '');
  const y = Number(s.substring(0, 4));
  const m = Number(s.substring(5, 7));
  if (m >= 4 && m <= 6) return { from: `${y}-04-01`, to: `${y}-06-30` };
  if (m >= 7 && m <= 9) return { from: `${y}-07-01`, to: `${y}-09-30` };
  if (m >= 10 && m <= 12) return { from: `${y}-10-01`, to: `${y}-12-31` };
  return { from: `${y}-01-01`, to: `${y}-03-31` }; // Q4 (Jan-Mar)
};

// TDS Challan Reconciliation — a TDS challan is a Payment voucher with an entry against
// a Duties & Taxes ledger tagged type_of_duty_tax='TDS'; the amount is the total TDS
// debited, summed from voucher_entries (the voucher row carries no amount column).
// Section number, deductee/resident type, BSR code, cheque and challan identifiers come
// from the TDS portal / filed challan and stay blank until reconciled — not fabricated.
const getChallanReconciliation = async (company_id, fy_id) => {
  try {
    const fyRows = await db.all(
      sql`SELECT start_date, end_date FROM financial_years WHERE fy_id = ${fy_id}`,
    );
    const fy = fyRows[0] || {};

    const rows = await db.all(
      sql`SELECT v.voucher_id, v.date, v.voucher_number, v.party_name,
                 l.name AS party_ledger_name,
                 COALESCE(SUM(CASE WHEN ve.type = 'Dr' AND sd.type_of_duty_tax = 'TDS'
                                   THEN ve.amount ELSE 0 END), 0) AS tds_amount
          FROM vouchers v
          JOIN voucher_entries ve ON ve.voucher_id = v.voucher_id
          LEFT JOIN ledgers l ON l.ledger_id = v.party_ledger_id
          LEFT JOIN ledger_statutory_details sd ON sd.ledger_id = ve.ledger_id
          WHERE v.company_id = ${company_id} AND v.fy_id = ${fy_id} AND v.is_cancelled = 0
            AND v.voucher_type = 'Payment'
          GROUP BY v.voucher_id
          HAVING COUNT(CASE WHEN sd.type_of_duty_tax = 'TDS' THEN 1 END) > 0
          ORDER BY v.date ASC, v.voucher_id ASC`,
    );

    const challans = rows.map((v) => {
      const q = quarterOf(v.date);
      return {
        date: v.date,
        particulars: v.party_ledger_name || v.party_name || 'TDS Payment',
        quarter_from: q.from,
        quarter_to: q.to,
        section_no: '',
        deductee_type: '',
        resident_type: '',
        cheque_dd_no: '',
        cheque_dd_date: '',
        bsr_code: '',
        challan_no: '',
        challan_date: '',
        vch_no: v.voucher_number || '',
        amount: Number(v.tds_amount) || 0,
      };
    });

    return {
      success: true,
      payload: { challans, period_label: `${fy.start_date || ''} to ${fy.end_date || ''}` },
    };
  } catch (err) {
    return { success: false, error: err.message };
  }
};

const TAN_RE = /^[A-Z]{4}[0-9]{5}[A-Z]$/;

const DEDUCTION_ROWS = [
  'Deduction at Normal Rate',
  'Deduction at Higher Rate',
  'Lower Rated Taxable Expense',
  'Zero rated Taxable Expense',
  'Under Exemption limit',
  'Exempt in lieu of PAN available',
];

const zeroDeduction = () => ({
  assessable_prev: 0,
  assessable_current: 0,
  assessable_total: 0,
  tax_deductable: 0,
  deducted_prev: 0,
  deducted_current: 0,
  deducted_total: 0,
  balance: 0,
});

// Form 26Q — the quarterly TDS return for non-salary payments. A voucher is relevant
// when it hits a TDS-deductable ledger (is_tds_deductable=1); it becomes Uncertain when
// the company TAN is invalid/missing OR the deductee party has no PAN (mirrors the GST
// classifier). The deduction rate-buckets stay zero until a TDS deduction engine exists;
// the payment side sums TDS challans (Payment vouchers on a type_of_duty_tax='TDS' ledger).
const getForm26Q = async (company_id, fy_id) => {
  try {
    const fyRows = await db.all(
      sql`SELECT start_date, end_date FROM financial_years WHERE fy_id = ${fy_id}`,
    );
    const fy = fyRows[0] || {};

    const tdsRows = await db.all(
      sql`SELECT tan FROM company_tds_details WHERE company_id = ${company_id} LIMIT 1`,
    );
    const tan = String(tdsRows[0] && tdsRows[0].tan ? tdsRows[0].tan : '')
      .trim()
      .toUpperCase();
    const tanValid = TAN_RE.test(tan);

    const rows = await db.all(
      sql`SELECT v.voucher_id,
                 MAX(CASE WHEN l.is_tds_deductable = 1 THEN 1 ELSE 0 END) AS has_tds,
                 p.pan AS party_pan
          FROM vouchers v
          LEFT JOIN voucher_entries ve ON ve.voucher_id = v.voucher_id
          LEFT JOIN ledgers l ON l.ledger_id = ve.ledger_id
          LEFT JOIN ledgers p ON p.ledger_id = v.party_ledger_id
          WHERE v.company_id = ${company_id} AND v.fy_id = ${fy_id} AND v.is_cancelled = 0
          GROUP BY v.voucher_id`,
    );

    let total = 0;
    let included = 0;
    let notRelevant = 0;
    let uncertain = 0;
    for (const r of rows) {
      total++;
      if (Number(r.has_tds) !== 1) {
        notRelevant++;
        continue;
      }
      const partyPanMissing = !String(r.party_pan || '').trim();
      if (!tanValid || partyPanMissing) uncertain++;
      else included++;
    }

    const payRows = await db.all(
      sql`SELECT v.voucher_id,
                 COALESCE(SUM(CASE WHEN ve.type = 'Dr' AND sd.type_of_duty_tax = 'TDS'
                                   THEN ve.amount ELSE 0 END), 0) AS amt
          FROM vouchers v
          JOIN voucher_entries ve ON ve.voucher_id = v.voucher_id
          LEFT JOIN ledger_statutory_details sd ON sd.ledger_id = ve.ledger_id
          WHERE v.company_id = ${company_id} AND v.fy_id = ${fy_id} AND v.is_cancelled = 0
            AND v.voucher_type = 'Payment'
          GROUP BY v.voucher_id
          HAVING COUNT(CASE WHEN sd.type_of_duty_tax = 'TDS' THEN 1 END) > 0`,
    );
    const paid = payRows.reduce((s, r) => s + (Number(r.amt) || 0), 0);

    return {
      success: true,
      payload: {
        period_label: `${fy.start_date || ''} to ${fy.end_date || ''}`,
        voucher_status: { total, included, not_relevant: notRelevant, uncertain },
        deduction_details: DEDUCTION_ROWS.map((label) => ({ label, ...zeroDeduction() })),
        total_deducted: zeroDeduction(),
        payment: { included: payRows.length, uncertain: 0, paid_amount: paid, balance_payable: 0 },
      },
    };
  } catch (err) {
    return { success: false, error: err.message };
  }
};

module.exports = { getChallanReconciliation, getForm26Q };
