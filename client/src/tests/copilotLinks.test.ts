import { describe, it, expect } from 'vitest';
import { resolveCopilotLink } from '../lib/copilotLinks';

describe('resolveCopilotLink', () => {
  it('maps the legacy voucher, ledger and stock links to the real routes', () => {
    expect(resolveCopilotLink('/vouchers/12')).toEqual({ to: '/transactions/voucher/12' });
    expect(resolveCopilotLink('/reports/accounts/ledger?id=7')).toEqual({
      to: '/reports/accounts/ledger?ledger_id=7',
    });
    expect(resolveCopilotLink('/stock/3')).toEqual({
      to: '/reports/inventory/stock-item',
      state: { item_id: 3 },
    });
  });

  it('passes real in-app routes through unchanged', () => {
    expect(resolveCopilotLink('/transactions/voucher/12')).toEqual({
      to: '/transactions/voucher/12',
    });
    expect(resolveCopilotLink('/reports/accounts/ledger?ledger_id=7')).toEqual({
      to: '/reports/accounts/ledger?ledger_id=7',
    });
  });

  it('returns null for anything that is not an in-app path', () => {
    const outside = [
      'https://example.com',
      '//example.com/x',
      'mailto:someone@example.com',
      'javascript:alert(1)',
      '',
      undefined,
      null,
    ];
    for (const href of outside) expect(resolveCopilotLink(href)).toBeNull();
  });
});
