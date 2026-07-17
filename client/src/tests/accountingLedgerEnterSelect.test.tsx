import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { CompanyProvider } from '../context/CompanyContext';
import Vouchers from '../pages/transactions/Vouchers';

// Payment / Receipt ledger picker: Enter must SELECT the highlighted ledger,
// exactly like clicking it. Previously the ledger row wired `onEnterEmpty` to
// "jump to Narration", so with nothing typed in the search Enter always skipped
// the highlighted ledger and left the row blank — only the mouse worked.
//
// The picker now uses the "◆ End of List" row (as Journal already did): a blank
// Enter still finishes ledger entry, but the highlight moves off it onto a real
// ledger, where Enter selects.

const company = {
  company_id: 1,
  name: 'X',
  financial_year_beginning_from: '2026-04-01',
  state: 'Maharashtra',
};

const LEDGERS = [
  {
    ledger_id: 1,
    company_id: 1,
    name: 'Cash',
    group_name: 'Cash-in-Hand',
    nature: 'Assets',
    opening_balance: 0,
  },
  {
    ledger_id: 2,
    company_id: 1,
    name: 'ABC Customer',
    group_name: 'Sundry Debtors',
    nature: 'Assets',
    opening_balance: 0,
  },
];

/** Namespaces the voucher screen calls that the global setup mock doesn't define. */
function stubApiNamespace(name: string, methods: Record<string, any>) {
  (window.api as any)[name] = Object.fromEntries(
    Object.entries(methods).map(([k, v]) => [k, vi.fn().mockResolvedValue(v)]),
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  stubApiNamespace('voucherType', { getAll: { success: true, voucherTypes: [] } });
  stubApiNamespace('godown', { getAll: { success: true, godowns: [] } });
  stubApiNamespace('attendanceType', { getAll: { success: true, attendanceTypes: [] } });
  stubApiNamespace('employeeCategory', { getAll: { success: true, employeeCategories: [] } });
  stubApiNamespace('physicalStock', { getAll: { success: true, rows: [] } });
  stubApiNamespace('attendance', { getAll: { success: true, rows: [] } });
  stubApiNamespace('taxUnits', { getAll: { success: true, taxUnits: [] } });
  stubApiNamespace('priceLevels', { getAll: { success: true, priceLevels: [] } });
  stubApiNamespace('salaryStructure', { getAll: { success: true, rows: [] } });
  stubApiNamespace('eInvoice', { getByVoucher: { success: true } });
  stubApiNamespace('pincode', { lookup: { success: true } });
  window.api.company.getAll = vi.fn().mockResolvedValue({ success: true, companies: [company] });
  window.api.fy.getAll = vi.fn().mockResolvedValue({
    success: true,
    financialYears: [{ fy_id: 1, company_id: 1, start_date: '2026-04-01', is_active: 1 }],
  });
  window.api.ledger.getAll = vi.fn().mockResolvedValue({ success: true, ledgers: LEDGERS });
});

async function renderPaymentVoucher() {
  const utils = render(
    <MemoryRouter initialEntries={['/transactions/vouchers']}>
      <CompanyProvider>
        <Vouchers />
      </CompanyProvider>
    </MemoryRouter>,
  );
  // Wait for master data so the picker has ledgers to list.
  await waitFor(() => expect(window.api.ledger.getAll).toHaveBeenCalled());
  return utils;
}

/** Focus the first ledger cell of the particulars section → opens the picker. */
async function openLedgerPicker(container: HTMLElement) {
  const cell = await waitFor(() => {
    const el = container.querySelector(
      '[data-particular-ledger="1"], [data-account-ledger]',
    ) as HTMLInputElement | null;
    expect(el).not.toBeNull();
    return el!;
  });
  fireEvent.focus(cell);
  await waitFor(() => expect(container.querySelector('[data-ledger-panel]')).not.toBeNull());
  return cell;
}

describe('Payment/Receipt ledger picker — Enter selects the highlighted ledger', () => {
  it('ArrowDown to a ledger then Enter fills the row (was: jumped to Narration)', async () => {
    const { container } = await renderPaymentVoucher();
    const cell = await openLedgerPicker(container);
    expect(container.querySelector('[data-ledger-panel]')!.textContent).toContain('Cash');

    // ArrowDown moves the highlight onto "Cash"; Enter selects it rather than
    // skipping the picker entirely.
    fireEvent.keyDown(cell, { key: 'ArrowDown' });
    fireEvent.keyDown(cell, { key: 'Enter' });

    await waitFor(() => expect(cell.value).toBe('Cash'));
  });

  it('offers the "End of List" row so a blank Enter has an explicit target', async () => {
    const { container } = await renderPaymentVoucher();
    await openLedgerPicker(container);
    expect(container.querySelector('[data-ledger-panel]')!.textContent).toContain('End of List');
  });

  it('typing a ledger name then Enter selects the first match', async () => {
    const { container } = await renderPaymentVoucher();
    const cell = await openLedgerPicker(container);

    const search = container.querySelector(
      '[data-ledger-panel] input[type="text"]',
    ) as HTMLInputElement;
    fireEvent.change(search, { target: { value: 'cas' } });
    fireEvent.keyDown(search, { key: 'Enter' });

    await waitFor(() => expect(cell.value).toBe('Cash'));
  });

  it('a blank Enter still finishes ledger entry and moves to Narration', async () => {
    const { container } = await renderPaymentVoucher();
    const cell = await openLedgerPicker(container);

    fireEvent.keyDown(cell, { key: 'Enter' });

    await waitFor(() => expect(container.querySelector('[data-ledger-panel]')).toBeNull());
    expect(cell.value).toBe('');
  });
});
