import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, waitFor, fireEvent } from '@testing-library/react';
import { CompanyProvider } from '../context/CompanyContext';
import BillWiseAllocationPopup from '../pages/transactions/components/popups/BillWiseAllocationPopup';

// Agst Ref keyboard flow: choosing "Agst Ref" opens the Pending Bills list on
// the Name cell; the list shows the bill's due date; Arrow keys move the
// highlight and Enter picks the highlighted bill (Tally's Enter-to-select).

const company = { company_id: 1, name: 'X', financial_year_beginning_from: '2026-04-01' };

const PENDING = [
  {
    bill_name: '16',
    bill_date: '2026-07-13',
    due_date: '2026-07-13',
    credit_period: '',
    balance: 900,
    final_balance: 900,
  },
  {
    bill_name: '12',
    bill_date: '2026-07-10',
    due_date: '2026-08-09',
    credit_period: '30',
    balance: 600,
    final_balance: 600,
  },
];

beforeEach(() => {
  vi.clearAllMocks();
  window.api.company.getAll = vi.fn().mockResolvedValue({ success: true, companies: [company] });
  window.api.fy.getAll = vi.fn().mockResolvedValue({
    success: true,
    financialYears: [{ fy_id: 1, company_id: 1, start_date: '2026-04-01', is_active: 1 }],
  });
  (window.api.voucher as any).getPendingBills = vi.fn().mockResolvedValue({
    success: true,
    pendingBills: PENDING,
    defaultCreditPeriod: 0,
    checkCreditDays: 0,
  });
});

function renderPopup(onSave = vi.fn()) {
  const utils = render(
    <CompanyProvider>
      <BillWiseAllocationPopup
        ledgerId={5}
        ledgerName="ABC Customer"
        totalAmount={50000}
        dcType="Dr"
        voucherDate="2026-07-17"
        voucherNumber="37"
        onClose={() => {}}
        onSave={onSave}
      />
    </CompanyProvider>,
  );
  return { ...utils, onSave };
}

describe('Bill-wise Details — Agst Ref list + keyboard', () => {
  it('opens the Pending Bills list with due dates and selects with Arrow+Enter', async () => {
    const { container } = renderPopup();

    const typeSelect = await waitFor(() => {
      const el = container.querySelector('[data-bw-type="0"]') as HTMLSelectElement | null;
      expect(el).not.toBeNull();
      return el!;
    });

    // Choose Agst Ref → the Name cell opens the Pending Bills list.
    fireEvent.change(typeSelect, { target: { value: 'Agst Ref' } });

    const nameInput = await waitFor(() => {
      const el = container.querySelector('[data-bw-name="0"]') as HTMLInputElement | null;
      expect(el).not.toBeNull();
      return el!;
    });

    // List renders both bills with their due dates (the earlier bug: empty col).
    await waitFor(() => {
      const panel = container.querySelector('[data-ledger-panel]');
      expect(panel).not.toBeNull();
      expect(panel!.textContent).toContain('9-Aug-26'); // bill 12 due date
      expect(panel!.textContent).toContain('13-Jul-26'); // bill 16 due/bill date
    });

    // Highlight starts on bill "16" (row 0). ArrowDown → "12", Enter picks it.
    fireEvent.keyDown(nameInput, { key: 'ArrowDown' });
    fireEvent.keyDown(nameInput, { key: 'Enter' });

    // Bill 12 is now the row's reference (value + its balance pulled in).
    await waitFor(() => expect(nameInput.value).toBe('12'));
    const amount = container.querySelector('[data-bw-amount="0"]') as HTMLInputElement;
    expect(Number(amount.value)).toBe(600);
    // List closed after selection.
    expect(container.querySelector('[data-ledger-panel]')).toBeNull();
  });
});
