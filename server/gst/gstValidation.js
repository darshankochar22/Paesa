// GST validation — pure, dependency-free functions the voucher save path and unit
// tests both call. They express the rules; they do not read the DB.
//
// Model: tax ledger SELECTION IS MANUAL. These functions validate the set of GST
// ledgers the user actually put on the voucher — they never add, remove, or
// substitute ledgers. A voucher with no GST ledgers at all is valid (not every
// voucher charges GST); only a NON-EMPTY-but-wrong set is blocked at save.

// GST requirements apply ONLY to lines whose taxability is "Taxable".
// Exempt / Nil Rated / Non-GST / Unknown lines are skipped entirely.
const isLineTaxable = (taxability) =>
  String(taxability || '').trim().toLowerCase() === 'taxable';

// An item is taxable if its taxability says so OR it carries a positive GST rate.
const isItemTaxable = (item = {}) =>
  isLineTaxable(item.taxability) || Number(item.gst_rate || 0) > 0;

// STEP 6.2 — WARN (never block) when the applied GST rate differs from the item's
// GST-classification "expected rate". Returns a message string or null.
const checkRateMismatch = (appliedRate, expectedRate, { label = 'this line' } = {}) => {
  if (expectedRate == null || expectedRate === '') return null;
  const applied = Number(appliedRate) || 0;
  const expected = Number(expectedRate) || 0;
  if (Math.abs(applied - expected) > 0.001) {
    return `Applied GST rate ${applied}% on ${label} does not match the classification's expected rate ${expected}%.`;
  }
  return null;
};

// Normalize the many tax-type labels (CGST, "SGST/UTGST", Cess, …) to a canonical key.
const normalizeTaxType = (t) => {
  const s = String(t || '').trim().toUpperCase();
  if (s.startsWith('CGST')) return 'CGST';
  if (s.startsWith('SGST') || s.startsWith('UTGST')) return 'SGST';
  if (s.startsWith('IGST')) return 'IGST';
  if (s.startsWith('CESS')) return 'CESS';
  return s;
};

const isComposition = (registrationType) =>
  String(registrationType || '').trim().toLowerCase() === 'composition';

const GST_TYPES = ['CGST', 'SGST', 'IGST', 'CESS'];
const hasAnyGstLedger = (taxLines = []) =>
  taxLines.some((l) => GST_TYPES.includes(normalizeTaxType(l.tax_type ?? l.taxType)));

// Bug 4 — Exempt / Nil Rated (non-taxable) items cannot carry any GST tax ledger.
// If a GST ledger is present but NO item on the voucher is taxable, block the save.
// Returns { errors: string[] }.
const validateExemptItems = ({ items = [], taxLines = [] } = {}) => {
  const errors = [];
  if (hasAnyGstLedger(taxLines) && items.length > 0 && !items.some(isItemTaxable)) {
    errors.push('Exempt / Nil Rated items cannot have GST tax ledgers.');
  }
  return { errors };
};

// STEP 6.3/6.4/6.5 — validate the SET of GST tax ledgers applied to one voucher.
// `taxLines`: array of { tax_type|taxType, rate_percent|rate }. CESS is always
// permitted alongside the primary components and is ignored by the count rules.
// Returns { errors: string[], warnings: string[] }.
const validateGstLedgers = ({ isInterstate, registrationType, taxLines = [] } = {}) => {
  const errors = [];
  const warnings = [];

  const lines = taxLines.map((l) => ({
    type: normalizeTaxType(l.tax_type ?? l.taxType),
    rate: Number(l.rate_percent ?? l.rate ?? 0) || 0,
  }));

  // STEP 6.5 — a Composition dealer cannot charge GST at all.
  if (isComposition(registrationType)) {
    if (lines.length > 0) {
      errors.push('Composition registration cannot apply any GST tax ledgers.');
    }
    return { errors, warnings };
  }

  const cgst = lines.filter((l) => l.type === 'CGST');
  const sgst = lines.filter((l) => l.type === 'SGST');
  const igst = lines.filter((l) => l.type === 'IGST');

  // No primary GST component applied (empty, or Cess-only) → nothing to enforce.
  // This is what lets "add item, don't touch tax → zero tax lines" save cleanly (bug 1):
  // GST is never force-required; only a NON-EMPTY-but-wrong combination is blocked.
  if (cgst.length + sgst.length + igst.length === 0) {
    return { errors, warnings };
  }

  if (isInterstate) {
    // STEP 6.4 — inter-state: exactly one IGST, and no CGST/SGST.
    if (cgst.length > 0 || sgst.length > 0) {
      errors.push('Inter-state supply cannot use CGST/SGST ledgers; use IGST instead.');
    }
    if (igst.length === 0) {
      errors.push('Inter-state supply requires exactly one IGST ledger.');
    } else if (igst.length > 1) {
      errors.push(`Inter-state supply requires exactly one IGST ledger; found ${igst.length}.`);
    }
  } else {
    // STEP 6.3 — intra-state: exactly one CGST + one SGST at matching rates, no IGST.
    if (igst.length > 0) {
      errors.push('Intra-state supply cannot use an IGST ledger; use CGST + SGST instead.');
    }
    if (cgst.length !== 1 || sgst.length !== 1) {
      errors.push('Intra-state supply requires exactly one CGST and one SGST ledger.');
    } else if (Math.abs(cgst[0].rate - sgst[0].rate) > 0.001) {
      errors.push(`CGST and SGST rates must match; got ${cgst[0].rate}% vs ${sgst[0].rate}%.`);
    }
  }

  return { errors, warnings };
};

module.exports = {
  isLineTaxable,
  isItemTaxable,
  checkRateMismatch,
  normalizeTaxType,
  isComposition,
  hasAnyGstLedger,
  validateExemptItems,
  validateGstLedgers,
};
