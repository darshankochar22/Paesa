const { db } = require('../db/index');
const { sql } = require('drizzle-orm');
const { vouchers } = require('../db/schema');

/**
 * Voucher Clarification (issue #102, Account Books) — the audit "Need
 * Clarification" summary with three heads:
 *
 *   • Verification of Vouchers  — vouchers changed after original entry
 *     (`is_modified = 1`), i.e. the set an auditor would re-verify. This is the
 *     only clarification signal our data model records today.
 *   • Related Party Transactions — 0: we have no related-party flag on ledger
 *     masters, so this cannot be classified. Returns 0 until that master field
 *     exists (matches the empty TallyPrime EDU reference).
 *   • Forex Transactions — 0: single-currency data model (no per-voucher
 *     currency), so no foreign-exchange vouchers can be identified.
 *
 * Cancelled/optional vouchers are excluded from every head.
 */
const voucherClarificationSummary = async (company_id, fy_id) => {
  try {
    const verifRows = await db.all(
      sql`SELECT COUNT(*) AS n
          FROM ${vouchers} v
          WHERE v.company_id = ${company_id} AND v.fy_id = ${fy_id}
            AND v.is_cancelled = 0 AND COALESCE(v.is_optional, 0) = 0
            AND COALESCE(v.is_modified, 0) = 1`,
    );
    const verification = Number(verifRows?.[0]?.n) || 0;

    return {
      success: true,
      verification,
      relatedParty: 0,
      forex: 0,
    };
  } catch (err) {
    return { success: false, error: err.message };
  }
};

/**
 * Drill list for a clarification head — the actual vouchers behind the count.
 * Only "verification" yields rows today (see summary rationale above).
 */
const voucherClarificationVouchers = async (company_id, fy_id, category) => {
  try {
    if (category !== 'verification') {
      return { success: true, category, rows: [] };
    }
    const rows = await db.all(
      sql`SELECT v.voucher_id, v.date, v.voucher_type, v.voucher_number, v.party_name, v.narration
          FROM ${vouchers} v
          WHERE v.company_id = ${company_id} AND v.fy_id = ${fy_id}
            AND v.is_cancelled = 0 AND COALESCE(v.is_optional, 0) = 0
            AND COALESCE(v.is_modified, 0) = 1
          ORDER BY v.date DESC, v.voucher_id DESC`,
    );
    return {
      success: true,
      category,
      rows: rows.map((r) => ({
        voucher_id: r.voucher_id,
        date: r.date,
        voucher_type: r.voucher_type,
        voucher_number: r.voucher_number,
        particulars: r.party_name || r.narration || '',
      })),
    };
  } catch (err) {
    return { success: false, error: err.message };
  }
};

module.exports = { voucherClarificationSummary, voucherClarificationVouchers };
