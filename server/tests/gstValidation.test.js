// Unit tests for the GST validation rules (spec STEP 6). Pure functions — no DB.
const {
  isLineTaxable,
  checkRateMismatch,
  validateGstLedgers,
} = require('../gst/gstValidation');

describe('GST validation — taxability skip (STEP 6.1)', () => {
  it('treats only "Taxable" as taxable', () => {
    expect(isLineTaxable('Taxable')).toBe(true);
    expect(isLineTaxable('taxable')).toBe(true);
  });

  it('skips Exempt / Nil Rated / Non-GST / Unknown lines', () => {
    expect(isLineTaxable('Exempt')).toBe(false);
    expect(isLineTaxable('Nil Rated')).toBe(false);
    expect(isLineTaxable('Non-GST')).toBe(false);
    expect(isLineTaxable('Unknown')).toBe(false);
    expect(isLineTaxable(null)).toBe(false);
    expect(isLineTaxable(undefined)).toBe(false);
  });
});

describe('GST validation — rate mismatch warning (STEP 6.2)', () => {
  it('warns (returns a message) when applied rate differs from classification expected rate', () => {
    const msg = checkRateMismatch(12, 18, { label: 'Widget' });
    expect(msg).toMatch(/12%/);
    expect(msg).toMatch(/18%/);
  });

  it('returns null when rates match (float-tolerant)', () => {
    expect(checkRateMismatch(18, 18)).toBeNull();
    expect(checkRateMismatch(18.0001, 18)).toBeNull();
  });

  it('returns null when there is no expected rate to compare against', () => {
    expect(checkRateMismatch(18, null)).toBeNull();
    expect(checkRateMismatch(18, '')).toBeNull();
  });
});

describe('GST validation — intra-state ledgers (STEP 6.3)', () => {
  const intra = (taxLines) => validateGstLedgers({ isInterstate: false, registrationType: 'Regular', taxLines });

  it('accepts exactly one CGST + one SGST at matching rates', () => {
    const { errors } = intra([
      { tax_type: 'CGST', rate_percent: 9 },
      { tax_type: 'SGST/UTGST', rate_percent: 9 },
    ]);
    expect(errors).toEqual([]);
  });

  it('rejects an IGST ledger on an intra-state supply', () => {
    const { errors } = intra([{ tax_type: 'IGST', rate_percent: 18 }]);
    expect(errors.some((e) => /IGST/.test(e))).toBe(true);
  });

  it('rejects a missing SGST (not a full CGST+SGST pair)', () => {
    const { errors } = intra([{ tax_type: 'CGST', rate_percent: 9 }]);
    expect(errors.some((e) => /exactly one CGST and one SGST/.test(e))).toBe(true);
  });

  it('rejects mismatched CGST vs SGST rates', () => {
    const { errors } = intra([
      { tax_type: 'CGST', rate_percent: 9 },
      { tax_type: 'SGST', rate_percent: 6 },
    ]);
    expect(errors.some((e) => /rates must match/.test(e))).toBe(true);
  });
});

describe('GST validation — inter-state ledgers (STEP 6.4)', () => {
  const inter = (taxLines) => validateGstLedgers({ isInterstate: true, registrationType: 'Regular', taxLines });

  it('accepts exactly one IGST', () => {
    const { errors } = inter([{ tax_type: 'IGST', rate_percent: 18 }]);
    expect(errors).toEqual([]);
  });

  it('rejects CGST/SGST on an inter-state supply', () => {
    const { errors } = inter([
      { tax_type: 'CGST', rate_percent: 9 },
      { tax_type: 'SGST', rate_percent: 9 },
    ]);
    expect(errors.some((e) => /cannot use CGST\/SGST/.test(e))).toBe(true);
  });

  it('rejects two IGST ledgers', () => {
    const { errors } = inter([
      { tax_type: 'IGST', rate_percent: 18 },
      { tax_type: 'IGST', rate_percent: 12 },
    ]);
    expect(errors.some((e) => /exactly one IGST/.test(e))).toBe(true);
  });
});

describe('GST validation — Composition block (STEP 6.5)', () => {
  it('blocks ANY GST ledger under a Composition registration', () => {
    const { errors } = validateGstLedgers({
      isInterstate: false,
      registrationType: 'Composition',
      taxLines: [
        { tax_type: 'CGST', rate_percent: 9 },
        { tax_type: 'SGST', rate_percent: 9 },
      ],
    });
    expect(errors.some((e) => /Composition/.test(e))).toBe(true);
  });

  it('is fine with no GST ledgers under Composition', () => {
    const { errors } = validateGstLedgers({
      isInterstate: false,
      registrationType: 'Composition',
      taxLines: [],
    });
    expect(errors).toEqual([]);
  });
});
