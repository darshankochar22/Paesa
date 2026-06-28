/**
 * reportHelpers.js
 *
 * Shared constants and helper functions used across multiple domain report services.
 * Import from here instead of duplicating across files.
 */
const { db } = require('../../db/index');
const { sql } = require('drizzle-orm');

// Inward / outward voucher-type conventions (mirrors reportService.js and
// stockSummaryReportService.js so movement direction stays consistent).
const INWARD_TYPES = ['Purchase', 'Receipt Note', 'Rejection In', 'Material In'];
const OUTWARD_TYPES = ['Sales', 'Delivery Note', 'Rejection Out', 'Material Out'];

// Helper: build a SQL IN list from an array of strings.
const sqlIn = (arr) => sql.join(arr.map(v => sql`${v}`), sql`, `);

// Helper: standard voucher filter predicates (non-cancelled, non-optional, non-post-dated).
const baseVoucherFilter = (company_id, fy_id) => [
  sql`v.company_id = ${company_id}`,
  sql`v.fy_id = ${fy_id}`,
  sql`v.is_cancelled = 0`,
  sql`COALESCE(v.is_optional, 0) = 0`,
  sql`COALESCE(v.is_post_dated, 0) = 0`,
];

// Helper: normalize the third argument. Definition files pass { reportId, ...params }
// but methods expect a string type. Extract the type from reportId or return default.
const normalizeType = (arg, defaultType, typeMap = {}) => {
  if (!arg || typeof arg === 'string') return arg || defaultType;
  if (typeof arg === 'object') {
    // Check for explicit type hint fields first (highest priority)
    const hints = [arg.gstReport, arg.statutoryType, arg.legacyType, arg.viewType,
                   arg.reportCategory, arg.inventoryType, arg.payrollType, arg.costingType,
                   arg.exceptionType, arg.registerType, arg.analysisType, arg.reportSubType,
                   arg.statementType, arg.variant, arg.reportType];
    for (const hint of hints) {
      if (hint && typeof hint === 'string') {
        const normalizedHint = hint.replace(/_/g, '-');
        // Check typeMap for exact or partial match
        for (const [key, val] of Object.entries(typeMap)) {
          const normalizedKey = key.replace(/_/g, '-');
          if (normalizedHint === normalizedKey || normalizedHint.includes(normalizedKey) || normalizedKey.includes(normalizedHint)) return val;
        }
        // Use hint directly as the type
        return hint;
      }
    }
    // Fall back to reportId matching
    const reportId = (arg.reportId || '').replace(/_/g, '-');
    for (const [key, val] of Object.entries(typeMap)) {
      const normalizedKey = key.replace(/_/g, '-');
      if (reportId.includes(normalizedKey)) return val;
    }
    return reportId || defaultType;
  }
  return defaultType;
};

// Helper: extract extra params from an object argument (strips reportId).
const extractParams = (arg) => {
  if (!arg || typeof arg === 'string') return {};
  if (typeof arg === 'object') {
    const { reportId, ...rest } = arg;
    return rest;
  }
  return {};
};

// Helper: fuzzy match a type string against known patterns.
// Returns the canonical type if matched, or the original type.
const fuzzyMatch = (type, patterns) => {
  if (!type) return type;
  const t = type.toLowerCase().replace(/[_\s-]/g, '');
  for (const [canonical, keywords] of Object.entries(patterns)) {
    for (const kw of keywords) {
      if (t.includes(kw.toLowerCase().replace(/[_\s-]/g, ''))) return canonical;
    }
  }
  return type;
};

// Decide whether an outstanding/ageing report is payable-side (Sundry
// Creditors) or receivable-side (Sundry Debtors). Definitions pass an object
// like { reportId, outstandingType, subType } that the old `=== 'payable'`
// check never matched, so every payable report wrongly showed receivables.
const PAYABLE_TOKENS = ['payable', 'bills_payable', 'bill_wise_payable',
  'overdue_payable', 'due_today_payable', 'advance_to_suppliers',
  'unadjusted_payments', 'payment_planning', 'payment_followup', 'msme_outstanding'];

const resolveOutstandingSide = (arg) => {
  if (typeof arg === 'string') return arg === 'payable' ? 'payable' : 'receivable';
  if (!arg || typeof arg !== 'object') return 'receivable';
  const ot = arg.outstandingType || '';
  const sub = arg.subType || '';
  const rid = arg.reportId || '';
  const isPayable =
    PAYABLE_TOKENS.includes(ot) ||
    (ot === 'interest' && sub === 'payable') ||
    /payab|supplier|creditor|msme/i.test(ot) ||
    /payable|payment_planning|payment_followup|unadjusted_payments|msme/i.test(rid);
  return isPayable ? 'payable' : 'receivable';
};

module.exports = {
  db,
  sql,
  INWARD_TYPES,
  OUTWARD_TYPES,
  sqlIn,
  baseVoucherFilter,
  normalizeType,
  extractParams,
  fuzzyMatch,
  PAYABLE_TOKENS,
  resolveOutstandingSide,
};
