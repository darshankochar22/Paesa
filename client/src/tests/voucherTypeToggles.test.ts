import { describe, it, expect } from 'vitest';
import { isVoucherTypeEnabled, VOUCHER_TYPES } from '../constants/voucherTypes';
import type { TallyFeaturesType } from '../types/entities/TallyFeatures';

// F11 voucher-type availability toggles (default ON): Use Debit and Credit Notes,
// Use Tracking Numbers (Delivery/Receipt Note), Use Rejection Notes. Turning a
// flag off hides its voucher types; defaults keep them available.

const feats = (over: Partial<TallyFeaturesType>): TallyFeaturesType =>
  ({
    maintain_accounts: 1,
    maintain_inventory: 1,
    use_debit_credit_notes: 1,
    use_tracking_numbers: 1,
    use_rejection_notes: 1,
    ...over,
  }) as TallyFeaturesType;

describe('F11 voucher-type toggles', () => {
  it('all note types available by default', () => {
    const on = feats({});
    for (const t of [
      VOUCHER_TYPES.CREDIT_NOTE,
      VOUCHER_TYPES.DEBIT_NOTE,
      VOUCHER_TYPES.DELIVERY_NOTE,
      VOUCHER_TYPES.RECEIPT_NOTE,
      VOUCHER_TYPES.REJECTION_IN,
      VOUCHER_TYPES.REJECTION_OUT,
    ]) {
      expect(isVoucherTypeEnabled(on, t)).toBe(true);
    }
  });

  it('Use Debit and Credit Notes off hides CN/DN', () => {
    const f = feats({ use_debit_credit_notes: 0 });
    expect(isVoucherTypeEnabled(f, VOUCHER_TYPES.CREDIT_NOTE)).toBe(false);
    expect(isVoucherTypeEnabled(f, VOUCHER_TYPES.DEBIT_NOTE)).toBe(false);
  });

  it('Use Tracking Numbers off hides Delivery/Receipt Note', () => {
    const f = feats({ use_tracking_numbers: 0 });
    expect(isVoucherTypeEnabled(f, VOUCHER_TYPES.DELIVERY_NOTE)).toBe(false);
    expect(isVoucherTypeEnabled(f, VOUCHER_TYPES.RECEIPT_NOTE)).toBe(false);
  });

  it('Use Rejection Notes off hides Rejection In/Out', () => {
    const f = feats({ use_rejection_notes: 0 });
    expect(isVoucherTypeEnabled(f, VOUCHER_TYPES.REJECTION_IN)).toBe(false);
    expect(isVoucherTypeEnabled(f, VOUCHER_TYPES.REJECTION_OUT)).toBe(false);
  });

  it('tracking/rejection also require maintain_inventory (dependency tier)', () => {
    const f = feats({ maintain_inventory: 0 });
    expect(isVoucherTypeEnabled(f, VOUCHER_TYPES.DELIVERY_NOTE)).toBe(false);
    expect(isVoucherTypeEnabled(f, VOUCHER_TYPES.REJECTION_IN)).toBe(false);
    // CN/DN stay usable — use_debit_credit_notes is standalone (accounting invoices).
    expect(isVoucherTypeEnabled(f, VOUCHER_TYPES.CREDIT_NOTE)).toBe(true);
  });
});
