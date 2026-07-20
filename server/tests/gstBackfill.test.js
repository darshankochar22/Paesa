'use strict';

// Repair of the GST fields a Tally .1800 import leaves empty: UQC on units, the GST
// tax-head tag on Duties & Taxes ledgers, and the per-line gst_rate derived from the
// tax actually booked on each voucher.

const {
  uqcFor,
  gstTaxTypeFor,
  snapToSlab,
  deriveVoucherRate,
} = require('../integrations/tally/gstBackfill');

describe('UQC mapping', () => {
  it('maps the symbols a Tally export actually emits', () => {
    expect(uqcFor('Mtr')).toBe('MTR');
    expect(uqcFor('Kg')).toBe('KGS');
    expect(uqcFor('Roll')).toBe('ROL');
    expect(uqcFor('pcs')).toBe('PCS');
    expect(uqcFor('cms.')).toBe('CMS');
    expect(uqcFor('  BOX ')).toBe('BOX');
  });

  it('returns null for an unknown symbol rather than guessing', () => {
    // A wrong UQC gets the return rejected at the portal — blank is the safe answer.
    expect(uqcFor('widgets')).toBeNull();
    expect(uqcFor('')).toBeNull();
    expect(uqcFor(null)).toBeNull();
  });
});

describe('GST tax-head detection', () => {
  it('identifies the component from the ledger name', () => {
    expect(gstTaxTypeFor('Output CGST @ 6%')).toBe('CGST');
    expect(gstTaxTypeFor('Input SGST @ 2.5 %')).toBe('SGST/UTGST');
    expect(gstTaxTypeFor('UTGST @ 9%')).toBe('SGST/UTGST');
    expect(gstTaxTypeFor('IGST @ 18%')).toBe('IGST');
  });

  it('does NOT claim control accounts that merely contain "GST"', () => {
    // Tagging these would add tax lines carrying no component and corrupt the
    // taxable-value derivation.
    expect(gstTaxTypeFor('GST Cash Ledger')).toBeNull();
    expect(gstTaxTypeFor('GST PAYMENT')).toBeNull();
    expect(gstTaxTypeFor('GST RECEIVABLE')).toBeNull();
    expect(gstTaxTypeFor('ADD. TAX')).toBeNull();
  });
});

describe('slab snapping', () => {
  it('snaps a rounding-drifted rate onto its standard slab', () => {
    expect(snapToSlab(5.0)).toBe(5);
    expect(snapToSlab(12.08)).toBe(12);
    expect(snapToSlab(17.93)).toBe(18);
    expect(snapToSlab(18.07)).toBe(18);
  });

  it('refuses a rate that is not near any slab', () => {
    // A blended (mixed-slab) invoice — a single voucher rate would misstate it.
    expect(snapToSlab(7.26)).toBeNull();
    expect(snapToSlab(16.76)).toBeNull();
    expect(snapToSlab(NaN)).toBeNull();
  });
});

describe('deriveVoucherRate', () => {
  it('uses the rate implied by the tax actually booked', () => {
    // 12354 taxable, 741.24 CGST + 741.24 SGST = 12%.
    expect(deriveVoucherRate({ taxable: 12354, bookedTax: 1482.48, masterTax: 0 })).toEqual({
      mode: 'voucher',
      rate: 12,
    });
  });

  it('prefers the booked tax over the item master when they disagree', () => {
    // Item master says 12%, but this invoice was actually billed at 5%. Following the
    // master here would overstate the tax — the exact bug this module exists to avoid.
    const d = deriveVoucherRate({ taxable: 10000, bookedTax: 500, masterTax: 1200 });
    expect(d).toEqual({ mode: 'voucher', rate: 5 });
  });

  it('falls back to per-line master rates for a mixed-slab invoice they reproduce', () => {
    // 7.26% overall is no slab, but the per-line master rates sum to the booked tax.
    expect(deriveVoucherRate({ taxable: 37845.4, bookedTax: 2746.12, masterTax: 2746.0 })).toEqual({
      mode: 'master',
    });
  });

  it('flags for review when neither method explains the booked tax', () => {
    expect(deriveVoucherRate({ taxable: 8194, bookedTax: 1373.28, masterTax: 500 })).toEqual({
      mode: 'review',
    });
  });

  it('flags a tax-only document (no taxable value) for review, never rate 0', () => {
    // Rate-difference Debit Notes carry GST with zero stock value — nothing to derive
    // a rate from, so they must stay visible in Uncertain.
    expect(deriveVoucherRate({ taxable: 0, bookedTax: 2143.56, masterTax: 0 })).toEqual({
      mode: 'review',
    });
  });

  it('never invents a rate for a voucher with no booked tax', () => {
    // 0 is within tolerance of the 0.25% slab, so a naive snap would stamp the
    // rough-diamond rate onto an untaxed voucher. Whether this is an exempt supply or a
    // missing tax ledger is the classifier's call — it needs the line left at 0.
    expect(deriveVoucherRate({ taxable: 5000, bookedTax: 0, masterTax: 0 })).toEqual({
      mode: 'review',
    });
  });
});
