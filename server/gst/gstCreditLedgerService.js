'use strict';

const { db } = require('../db/index');
const { sql, eq, and } = require('drizzle-orm');
const { gstCreditLedger } = require('../db/schema');
const { getGSTR3B } = require('./gstr3bService');
const { computeItcSetOff, HEADS } = require('./itcSetOff');

const round2 = (n) => Number((Number(n) || 0).toFixed(2));

// The 12 MMYYYY periods of a financial year, in chronological order, from its start date.
const periodsForFY = (startDate) => {
  const [y, m] = String(startDate).split('-').map(Number);
  const out = [];
  for (let i = 0; i < 12; i++) {
    const m0 = m - 1 + i;
    const year = y + Math.floor(m0 / 12);
    const month = (m0 % 12) + 1;
    out.push(`${String(month).padStart(2, '0')}${year}`);
  }
  return out;
};

// Pull one period's per-head output liability (regular outward + RCM) and ITC availed
// (all ITC-available buckets minus reversals) from the vetted monthly GSTR-3B figures.
const periodFigures = (payload) => {
  const s = payload.sup_details || {};
  const det = s.osup_det || {};
  const rcm = s.isup_rev || {};
  const itc = payload.itc_elg || {};
  const avl = itc.itc_avl || [];
  const rev = (itc.itc_rev || [])[0] || {};
  const sumAvl = (k) => avl.reduce((t, r) => t + (Number(r[k]) || 0), 0);

  const liability = {
    igst: round2((det.iamt || 0) + (rcm.iamt || 0)),
    cgst: round2((det.camt || 0) + (rcm.camt || 0)),
    sgst: round2((det.samt || 0) + (rcm.samt || 0)),
    cess: round2((det.cess || 0) + (rcm.cess || 0)),
  };
  const credit = {
    igst: round2(sumAvl('iamt') - (rev.iamt || 0)),
    cgst: round2(sumAvl('camt') - (rev.camt || 0)),
    sgst: round2(sumAvl('samt') - (rev.samt || 0)),
    cess: round2(sumAvl('cess') - (rev.cess || 0)),
  };
  return { liability, credit };
};

/**
 * Rebuild the persistent electronic credit ledger for a company (optionally one registration),
 * period by period in chronological order across ALL financial years, seeding each period's
 * opening from the prior period's closing balance. Persists one row per period+head.
 */
const rebuild = async (company_id, gst_registration_id = null) => {
  try {
    const fyRows = await db.all(
      sql`SELECT fy_id, start_date FROM financial_years
          WHERE company_id = ${company_id} ORDER BY start_date ASC`,
    );

    // Clear the existing ledger for this company/registration scope.
    await db
      .delete(gstCreditLedger)
      .where(
        gst_registration_id == null
          ? and(
              eq(gstCreditLedger.companyId, company_id),
              sql`${gstCreditLedger.gstRegistrationId} IS NULL`,
            )
          : and(
              eq(gstCreditLedger.companyId, company_id),
              eq(gstCreditLedger.gstRegistrationId, gst_registration_id),
            ),
      );

    let balance = { igst: 0, cgst: 0, sgst: 0, cess: 0 }; // running opening (carried across FYs)
    const rows = [];

    for (const fy of fyRows) {
      for (const period of periodsForFY(fy.start_date)) {
        const res = await getGSTR3B(company_id, fy.fy_id, period, gst_registration_id);
        if (!res || !res.success) continue;
        const { liability, credit } = periodFigures(res.payload || {});

        const active = HEADS.some((h) => liability[h] || credit[h]);
        if (!active) continue; // nothing happened this period; opening carries unchanged

        const pool = {
          igst: balance.igst + credit.igst,
          cgst: balance.cgst + credit.cgst,
          sgst: balance.sgst + credit.sgst,
          cess: balance.cess + credit.cess,
        };
        const { closing } = computeItcSetOff(liability, pool);

        for (const h of HEADS) {
          const HEAD = h.toUpperCase();
          const opening = round2(balance[h]);
          const utilized = round2(opening + credit[h] - closing[h]);
          const row = {
            companyId: company_id,
            gstRegistrationId: gst_registration_id,
            returnPeriod: period,
            head: HEAD,
            opening,
            credit: round2(credit[h]),
            liability: round2(liability[h]),
            utilized,
            closing: round2(closing[h]),
          };
          rows.push(row);
          await db.insert(gstCreditLedger).values(row);
        }
        balance = closing;
      }
    }

    return { success: true, rows, closing_balance: balance };
  } catch (err) {
    return { success: false, error: err.message };
  }
};

/**
 * Read the persisted ledger for a company (optionally one registration), most recent first.
 * Does not recompute — call rebuild() to refresh after vouchers change.
 */
const getLedger = async (company_id, gst_registration_id = null) => {
  try {
    const rows = await db.all(
      gst_registration_id == null
        ? sql`SELECT * FROM gst_credit_ledger
               WHERE company_id = ${company_id} AND gst_registration_id IS NULL
               ORDER BY return_period ASC, head ASC`
        : sql`SELECT * FROM gst_credit_ledger
               WHERE company_id = ${company_id} AND gst_registration_id = ${gst_registration_id}
               ORDER BY return_period ASC, head ASC`,
    );
    return { success: true, rows };
  } catch (err) {
    return { success: false, error: err.message };
  }
};

module.exports = { rebuild, getLedger, periodsForFY, periodFigures };
