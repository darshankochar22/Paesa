'use strict';

const { db } = require('../db/index');
const { sql } = require('drizzle-orm');

// E-TCS quarter for a date: Q1 Apr-Jun, Q2 Jul-Sep, Q3 Oct-Dec, Q4 Jan-Mar.
const quarterOf = (dateStr) => {
  const s = String(dateStr || '');
  const y = Number(s.substring(0, 4));
  const m = Number(s.substring(5, 7));
  if (m >= 4 && m <= 6) return { from: `${y}-04-01`, to: `${y}-06-30` };
  if (m >= 7 && m <= 9) return { from: `${y}-07-01`, to: `${y}-09-30` };
  if (m >= 10 && m <= 12) return { from: `${y}-10-01`, to: `${y}-12-31` };
  return { from: `${y}-01-01`, to: `${y}-03-31` }; // Q4 (Jan-Mar)
};

// TCS Challan Reconciliation (#203) — mirrors TDS challan recon (#199): a TCS challan is a
// Payment voucher with a Dr entry against a Duties & Taxes ledger tagged
// ledger_statutory_details.type_of_duty_tax='TCS'; amount summed from voucher_entries.
// Section/collectee/BSR/challan/cheque identifiers come from the TCS portal / filed challan
// and stay blank until reconciled — not fabricated.
const getChallanReconciliation = async (company_id, fy_id) => {
  try {
    const fyRows = await db.all(
      sql`SELECT start_date, end_date FROM financial_years WHERE fy_id = ${fy_id}`,
    );
    const fy = fyRows[0] || {};

    const rows = await db.all(
      sql`SELECT v.voucher_id, v.date, v.voucher_number, v.party_name,
                 l.name AS party_ledger_name,
                 COALESCE(SUM(CASE WHEN ve.type = 'Dr' AND sd.type_of_duty_tax = 'TCS'
                                   THEN ve.amount ELSE 0 END), 0) AS tcs_amount
          FROM vouchers v
          JOIN voucher_entries ve ON ve.voucher_id = v.voucher_id
          LEFT JOIN ledgers l ON l.ledger_id = v.party_ledger_id
          LEFT JOIN ledger_statutory_details sd ON sd.ledger_id = ve.ledger_id
          WHERE v.company_id = ${company_id} AND v.fy_id = ${fy_id} AND v.is_cancelled = 0
            AND v.voucher_type = 'Payment'
          GROUP BY v.voucher_id
          HAVING COUNT(CASE WHEN sd.type_of_duty_tax = 'TCS' THEN 1 END) > 0
          ORDER BY v.date ASC, v.voucher_id ASC`,
    );

    const challans = rows.map((v) => {
      const q = quarterOf(v.date);
      return {
        date: v.date,
        particulars: v.party_ledger_name || v.party_name || 'TCS Payment',
        quarter_from: q.from,
        quarter_to: q.to,
        section_no: '',
        collectee_type: '',
        resident_type: '',
        cheque_dd_no: '',
        cheque_dd_date: '',
        bsr_code: '',
        challan_no: '',
        challan_date: '',
        vch_no: v.voucher_number || '',
        amount: Number(v.tcs_amount) || 0,
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

module.exports = { getChallanReconciliation };
