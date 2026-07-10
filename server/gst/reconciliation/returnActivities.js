'use strict';

// "Track GST Return Activities" — the per-registration / per-month return-status
// matrix (GSTR-1, GSTR-3B, Annual) driven by real filings and voucher activity.

const { db } = require('../../db/index');
const { sql } = require('drizzle-orm');
const {
  vouchers,
  ledgers,
  gstRegistrations,
  voucherStockEntries,
  companies,
} = require('../../db/schema');
const { getDatesForFY, GSTIN_RE, buildFyMonths } = require('./core');

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

module.exports = { getReturnActivities };
