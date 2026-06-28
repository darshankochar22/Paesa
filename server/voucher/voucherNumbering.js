const { db } = require('../db/index');
const { sql } = require('drizzle-orm');
const { vouchers } = require('../db/schema');

const prefixMap = {
  Payment:              'PMT',
  Receipt:              'RCT',
  Journal:              'JNL',
  Contra:               'CTR',
  Sales:                'SAL',
  Purchase:             'PUR',
  'Debit Note':         'DBT',
  'Credit Note':        'CDT',
  'Stock Journal':      'STJ',
  'Delivery Note':      'DLN',
  'Receipt Note':       'RCN',
  'Rejection In':       'RIN',
  'Rejection Out':      'ROU',
  'Material In':        'MIN',
  'Material Out':       'MOUT',
  'Manufacturing Journal': 'MJN',
  Payroll:              'PRL',
};

// ── Voucher numbering (issue #143) ──────────────────────────────────────────
// The displayed voucher number is built from the voucher type's numbering
// config: an explicit prefix/suffix set on the type, else a per-type code
// (prefixMap) + "-"; the sequence is zero-padded to the configured width
// (default 5). Method "Manual"/"None" leaves the number to the user.
const fetchNumberingConfig = async (company_id, voucher_type) => {
  const rows = await db.all(
    sql`SELECT vt.numbering_method, vt.numbering_prefix, vt.numbering_suffix,
               vtc.starting_number, vtc.width_of_numerical_part, vtc.prefill_with_zero
        FROM voucher_types vt
        LEFT JOIN voucher_type_configs vtc ON vtc.voucher_type_id = vt.vt_id
        WHERE vt.company_id = ${company_id} AND vt.name = ${voucher_type} AND vt.is_active = 1
        LIMIT 1`
  );
  return rows[0] || {};
};

const formatVoucherNumber = (n, voucher_type, cfg) => {
  const explicitPrefix = (cfg.numbering_prefix || '').trim();
  const prefix = explicitPrefix || `${prefixMap[voucher_type] || 'VCH'}-`;
  const suffix = (cfg.numbering_suffix || '').trim();
  // A configured width (from the additional-numbering sub-screen) overrides the
  // default: pad to that width when "prefill with zero" is on, else leave plain.
  // When unconfigured (the common case), use the app default: 5-digit zero-pad.
  const configuredWidth = Number(cfg.width_of_numerical_part) || 0;
  const body = configuredWidth > 0
    ? (cfg.prefill_with_zero ? String(n).padStart(configuredWidth, '0') : String(n))
    : String(n).padStart(5, '0');
  return `${prefix}${body}${suffix}`;
};

// Next sequence number for a (company, fy, type): the largest trailing digit-run
// across existing numbers + 1, or the configured starting number when none yet.
const computeNextSequence = async (company_id, fy_id, voucher_type, cfg) => {
  const rows = await db.all(
    sql`SELECT ${vouchers.voucherNumber} AS voucher_number FROM ${vouchers}
        WHERE ${vouchers.companyId} = ${company_id} AND ${vouchers.fyId} = ${fy_id}
          AND ${vouchers.voucherType} = ${voucher_type}`
  );
  let max = 0;
  for (const r of rows) {
    const m = String(r.voucher_number ?? '').match(/(\d+)(?!.*\d)/);
    if (m) { const v = parseInt(m[1], 10); if (v > max) max = v; }
  }
  const start = Number(cfg.starting_number) > 0 ? Number(cfg.starting_number) : 1;
  return rows.length ? max + 1 : start;
};

const generateVoucherNumber = async (company_id, fy_id, voucher_type) => {
  const cfg = await fetchNumberingConfig(company_id, voucher_type);
  if (cfg.numbering_method === 'Manual' || cfg.numbering_method === 'None') return '';
  const next = await computeNextSequence(company_id, fy_id, voucher_type, cfg);
  return formatVoucherNumber(next, voucher_type, cfg);
};

const getNextVoucherNumber = async (company_id, fy_id, voucher_type) => {
  const cfg = await fetchNumberingConfig(company_id, voucher_type);
  const next = await computeNextSequence(company_id, fy_id, voucher_type, cfg);
  return { success: true, nextNumber: next, voucher_number: formatVoucherNumber(next, voucher_type, cfg) };
};

module.exports = {
  prefixMap,
  fetchNumberingConfig,
  formatVoucherNumber,
  computeNextSequence,
  generateVoucherNumber,
  getNextVoucherNumber,
};
