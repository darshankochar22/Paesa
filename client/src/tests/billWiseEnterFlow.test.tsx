import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import { CompanyProvider } from '../context/CompanyContext';
import BillWiseAllocationPopup from '../pages/transactions/components/popups/BillWiseAllocationPopup';

// Regression: the Bill-wise Details popup must place the cursor on the first
// "Type of Ref" cell as soon as it opens, so the Tally Enter-to-advance flow
// works without a click. The popup's row is created in an effect after the
// pending-bills fetch resolves — later than the shared shell's on-mount focus —
// so the popup owns the focus itself.

const company = { company_id: 1, name: 'X', financial_year_beginning_from: '2026-04-01' };

function pressEnter(target: Element) {
  target.dispatchEvent(
    new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }),
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  window.api.company.getAll = vi.fn().mockResolvedValue({ success: true, companies: [company] });
  window.api.fy.getAll = vi.fn().mockResolvedValue({
    success: true,
    financialYears: [{ fy_id: 1, company_id: 1, start_date: '2026-04-01', is_active: 1 }],
  });
  (window.api.voucher as any).getPendingBills = vi
    .fn()
    .mockResolvedValue({
      success: true,
      pendingBills: [],
      defaultCreditPeriod: 0,
      checkCreditDays: 0,
    });
});

function renderPopup(onSave = vi.fn()) {
  render(
    <CompanyProvider>
      <BillWiseAllocationPopup
        ledgerId={5}
        ledgerName="Bharat Suppliers"
        totalAmount={1000}
        dcType="Cr"
        voucherDate="2026-07-13"
        voucherNumber="11"
        onClose={() => {}}
        onSave={onSave}
      />
    </CompanyProvider>,
  );
  return onSave;
}

describe('Bill-wise Details popup — Enter keyboard flow', () => {
  it('auto-focuses the first "Type of Ref" cell on open', async () => {
    renderPopup();
    await waitFor(() =>
      expect((document.activeElement as HTMLElement | null)?.getAttribute('data-bw-type')).toBe(
        '0',
      ),
    );
  });

  it('walks fields with Enter and accepts on the last field', async () => {
    const onSave = renderPopup();
    await waitFor(() =>
      expect((document.activeElement as HTMLElement | null)?.getAttribute('data-bw-type')).toBe(
        '0',
      ),
    );

    // Type of Ref -> Name -> Credit Days -> Amount -> Dr/Cr -> Accept
    for (let i = 0; i < 5; i++) {
      const active = document.activeElement;
      if (!active) break;
      pressEnter(active);
      await new Promise((r) => setTimeout(r, 20));
    }
    expect(onSave).toHaveBeenCalledTimes(1);
  });
});
