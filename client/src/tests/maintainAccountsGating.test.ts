import { describe, it, expect } from 'vitest';
import { isFeatureEnabled } from '../lib/companyFeatures';
import { isVoucherTypeEnabled, VOUCHER_TYPES } from '../constants/voucherTypes';
import type { TallyFeaturesType } from '../types/entities/TallyFeatures';

// "Maintain Accounts" (F11) as the accounting master switch: turning it off
// (inventory-only company) cascades the accounting sub-features off and hides the
// pure-accounting voucher types. Default ON leaves everything available.

const feats = (over: Partial<TallyFeaturesType>): TallyFeaturesType =>
  ({ maintain_accounts: 1, maintain_inventory: 1, ...over }) as TallyFeaturesType;

describe('maintain_accounts master switch', () => {
  it('accounting sub-features require maintain_accounts', () => {
    const off = feats({ maintain_accounts: 0, enable_cost_centres: 1, enable_bill_wise_entry: 1 });
    expect(isFeatureEnabled(off, 'enable_cost_centres')).toBe(false);
    expect(isFeatureEnabled(off, 'enable_bill_wise_entry')).toBe(false);
    expect(isFeatureEnabled(off, 'enable_interest_calculation')).toBe(false);
  });

  it('sub-features enabled when maintain_accounts on', () => {
    const on = feats({ enable_cost_centres: 1, enable_bill_wise_entry: 1 });
    expect(isFeatureEnabled(on, 'enable_cost_centres')).toBe(true);
    expect(isFeatureEnabled(on, 'enable_bill_wise_entry')).toBe(true);
  });

  it('hides pure-accounting voucher types when accounts off', () => {
    const off = feats({ maintain_accounts: 0 });
    for (const t of [
      VOUCHER_TYPES.PAYMENT,
      VOUCHER_TYPES.RECEIPT,
      VOUCHER_TYPES.CONTRA,
      VOUCHER_TYPES.JOURNAL,
      VOUCHER_TYPES.MEMORANDUM,
      VOUCHER_TYPES.REVERSING_JOURNAL,
    ]) {
      expect(isVoucherTypeEnabled(off, t)).toBe(false);
    }
  });

  it('keeps Sales/Purchase available even when accounts off (inventory invoices)', () => {
    const off = feats({ maintain_accounts: 0 });
    expect(isVoucherTypeEnabled(off, VOUCHER_TYPES.SALES)).toBe(true);
    expect(isVoucherTypeEnabled(off, VOUCHER_TYPES.PURCHASE)).toBe(true);
  });

  it('all accounting voucher types available by default (accounts on)', () => {
    const on = feats({});
    expect(isVoucherTypeEnabled(on, VOUCHER_TYPES.PAYMENT)).toBe(true);
    expect(isVoucherTypeEnabled(on, VOUCHER_TYPES.JOURNAL)).toBe(true);
  });
});
