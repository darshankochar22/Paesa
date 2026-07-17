import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest';
import { render, waitFor, fireEvent, screen, act } from '@testing-library/react';
import { CompanyProvider } from '../context/CompanyContext';
import PartyDetailsPopup from '../pages/transactions/components/popups/PartyDetailsPopup';

// Party Details fields backed by a list: focusing Buyer (Bill to) / Address Type /
// State / GST Registration type opens the matching right-side panel, the panel
// lands on the field's CURRENT value, and Arrow+Enter picks a row.

const company = { company_id: 1, name: 'X', financial_year_beginning_from: '2026-04-01' };

const PARTY = {
  ledger_id: 5,
  name: 'SBI Cash Credit Account',
  state: 'Chhattisgarh',
  country: 'India',
  registration_type: 'Unregistered',
};
const LEDGERS = [
  { ledger_id: 2, name: 'ABC Customers', state: 'Karnataka' },
  PARTY,
  { ledger_id: 9, name: 'XYZ Suppliers', state: 'Gujarat' },
];

// jsdom has no layout: offsetParent is always null, which the popup's Enter-nav
// uses as its visibility check. Approximate it so visible fields pass the filter.
beforeAll(() => {
  Object.defineProperty(HTMLElement.prototype, 'offsetParent', {
    get() {
      let el: HTMLElement | null = this as HTMLElement;
      while (el) {
        if (el.style?.display === 'none' || el.hasAttribute?.('hidden')) return null;
        el = el.parentElement;
      }
      return (this as HTMLElement).parentElement;
    },
  });
});

beforeEach(() => {
  vi.clearAllMocks();
  window.api.company.getAll = vi.fn().mockResolvedValue({ success: true, companies: [company] });
  window.api.fy.getAll = vi.fn().mockResolvedValue({
    success: true,
    financialYears: [{ fy_id: 1, company_id: 1, start_date: '2026-04-01', is_active: 1 }],
  });
});

function renderPopup(onSave = vi.fn()) {
  const utils = render(
    <CompanyProvider>
      <PartyDetailsPopup
        partyLedger={PARTY}
        allLedgers={LEDGERS}
        onClose={() => {}}
        onSave={onSave}
        onCreateLedger={() => {}}
        buyerLabel="Buyer (Bill to)"
      />
    </CompanyProvider>,
  );
  return { ...utils, onSave };
}

const panelTitle = () => document.querySelector('[data-ledger-panel]')?.textContent ?? '';
const field = (container: HTMLElement, key: string) =>
  container.querySelector(`[data-pd-field="${key}"]`) as HTMLInputElement;
// Enter from wherever focus is — a form field (the popup shell advances it) or an
// open panel's search box (the panel picks the highlighted row). Settles the
// focus/arming timeouts before returning, like a real keypress would.
const enter = async () => {
  fireEvent.keyDown(document.activeElement ?? document.body, { key: 'Enter' });
  await act(async () => {
    await new Promise((r) => setTimeout(r, 0));
  });
};
const highlighted = () =>
  (document.querySelector('[data-ledger-panel] [data-hi]') as HTMLElement | null)?.textContent ??
  '';

describe('Party Details — list-backed fields', () => {
  it('opens the ledger list on Buyer (Bill to), highlighting the current party', async () => {
    const { container } = renderPopup();
    await waitFor(() => expect(field(container, 'buyer.name')).not.toBeNull());

    // The Buyer field autofocuses → its list opens with the current party on it.
    await waitFor(() => expect(panelTitle()).toContain('List of Ledger Accounts'));
    expect(screen.getByText('ABC Customers')).toBeTruthy();
    expect(highlighted()).toBe('SBI Cash Credit Account');
  });

  it('Arrow+Enter in the ledger list picks the highlighted party', async () => {
    const { container } = renderPopup();
    await waitFor(() => expect(panelTitle()).toContain('List of Ledger Accounts'));

    fireEvent.keyDown(window, { key: 'ArrowDown' }); // SBI → XYZ Suppliers
    expect(highlighted()).toBe('XYZ Suppliers');
    fireEvent.keyDown(window, { key: 'Enter' });

    await waitFor(() => expect(field(container, 'buyer.name').value).toBe('XYZ Suppliers'));
    expect(field(container, 'buyer.state').value).toBe('Gujarat');
  });

  it('Address Type opens its own list and Enter keeps Primary', async () => {
    const { container } = renderPopup();
    await waitFor(() => expect(field(container, 'buyer.addressType')).not.toBeNull());

    fireEvent.focus(field(container, 'buyer.addressType'));
    await waitFor(() => expect(panelTitle()).toContain('List of Address Types'));
    expect(highlighted()).toBe('Primary');

    fireEvent.keyDown(window, { key: 'Enter' });
    await waitFor(() => expect(field(container, 'buyer.addressType').value).toBe('Primary'));
  });

  it('State opens the states list on the current state; Arrow+Enter changes it', async () => {
    const { container } = renderPopup();
    await waitFor(() => expect(field(container, 'buyer.state')).not.toBeNull());
    expect(field(container, 'buyer.state').value).toBe('Chhattisgarh');

    fireEvent.focus(field(container, 'buyer.state'));
    await waitFor(() => expect(panelTitle()).toContain('List of States'));
    expect(highlighted()).toBe('Chhattisgarh');

    fireEvent.keyDown(window, { key: 'ArrowUp' }); // → the row above Chhattisgarh
    expect(highlighted()).toBe('Bihar');
    fireEvent.keyDown(window, { key: 'Enter' });

    await waitFor(() => expect(field(container, 'buyer.state').value).toBe('Bihar'));
    // Place of Supply follows the Buyer's state.
    expect(field(container, 'buyer.placeOfSupply').value).toBe('Bihar');
  });

  it('GST Registration type opens its list on the party ledger value', async () => {
    const { container } = renderPopup();
    await waitFor(() => expect(field(container, 'buyer.gstType')).not.toBeNull());
    expect(field(container, 'buyer.gstType').value).toBe('Unregistered');

    fireEvent.focus(field(container, 'buyer.gstType'));
    await waitFor(() => expect(panelTitle()).toContain('List of Registration Types'));
    expect(highlighted()).toBe('Unregistered');

    fireEvent.keyDown(window, { key: 'ArrowUp' }); // Unregistered → Composition
    fireEvent.keyDown(window, { key: 'Enter' });
    await waitFor(() => expect(field(container, 'buyer.gstType').value).toBe('Composition'));
  });

  // Regression: the Enter that moved focus INTO a list field also reached the
  // freshly-opened panel, which selected row 0 — State silently became "Andhra
  // Pradesh" (first state), GST Reg. type became "Regular" (first type), and
  // focus skipped the field entirely (pincode → GSTIN). Enter must open the list
  // and stop there.
  it('walks the whole Buyer column on Enter, changing nothing that was not picked', async () => {
    const { container } = renderPopup();
    const buyer = (k: string) => field(container, `buyer.${k}`);

    // Buyer (Bill to) — the list is up on the current party; Enter keeps it.
    await waitFor(() => expect(panelTitle()).toContain('List of Ledger Accounts'));
    await enter();

    // Address Type — its list opens; Enter keeps Primary rather than skipping past.
    await waitFor(() => expect(panelTitle()).toContain('List of Address Types'));
    expect(buyer('addressType').value).toBe('Primary');
    await enter();

    // Mailing Name → Address: plain fields, no list.
    await waitFor(() => expect(document.querySelector('[data-ledger-panel]')).toBeNull());
    await enter(); // Mailing Name → Address
    await enter(); // Address → State

    // State opens on the party's own state — NOT reset to the first state in the list.
    await waitFor(() => expect(panelTitle()).toContain('List of States'));
    expect(buyer('state').value).toBe('Chhattisgarh');
    expect(highlighted()).toBe('Chhattisgarh');
    await enter(); // keep it

    await waitFor(() => expect(document.querySelector('[data-ledger-panel]')).toBeNull());
    expect(buyer('state').value).toBe('Chhattisgarh');
    await enter(); // Country → Pincode
    await enter(); // Pincode → GST Reg. type

    // GST Reg. type is not skipped, and stays Unregistered (was flipping to Regular).
    await waitFor(() => expect(panelTitle()).toContain('List of Registration Types'));
    expect(buyer('gstType').value).toBe('Unregistered');
    expect(highlighted()).toBe('Unregistered');
    await enter();

    // Unregistered hides GSTIN, so Enter carries on into the Consignee column.
    await waitFor(() => expect(panelTitle()).toContain('List of Ledger Accounts'));
    expect(buyer('gstType').value).toBe('Unregistered');
    expect(buyer('state').value).toBe('Chhattisgarh');
    expect(buyer('name').value).toBe('SBI Cash Credit Account');
  });

  // Ctrl+A is Tally's accept. A field's list is open almost all the time in this
  // popup, so it must accept through an open list too — it used to do nothing.
  it('Ctrl+A accepts the form while a list is open', async () => {
    const onSave = vi.fn();
    renderPopup(onSave);
    await waitFor(() => expect(panelTitle()).toContain('List of Ledger Accounts'));

    fireEvent.keyDown(document.activeElement ?? document.body, { key: 'a', ctrlKey: true });

    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));
    expect(onSave.mock.calls[0][0].supplier_name).toBe('SBI Cash Credit Account');
    expect(onSave.mock.calls[0][0].state).toBe('Chhattisgarh');
  });

  it('Ctrl+A accepts the values picked from the lists', async () => {
    const onSave = vi.fn();
    const { container } = renderPopup(onSave);
    await waitFor(() => expect(panelTitle()).toContain('List of Ledger Accounts'));

    fireEvent.keyDown(window, { key: 'ArrowDown' }); // → XYZ Suppliers
    await enter();
    await waitFor(() => expect(field(container, 'buyer.name').value).toBe('XYZ Suppliers'));

    fireEvent.keyDown(document.activeElement ?? document.body, { key: 'a', ctrlKey: true });
    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));
    expect(onSave.mock.calls[0][0].supplier_name).toBe('XYZ Suppliers');
    expect(onSave.mock.calls[0][0].state).toBe('Gujarat');
  });

  it('typing in the panel filters, and Escape closes the panel without picking', async () => {
    const { container } = renderPopup();
    await waitFor(() => expect(panelTitle()).toContain('List of Ledger Accounts'));

    const search = document.querySelector(
      '[data-ledger-panel] input[type="text"]',
    ) as HTMLInputElement;
    fireEvent.change(search, { target: { value: 'xyz' } });
    await waitFor(() => expect(highlighted()).toBe('XYZ Suppliers'));
    expect(screen.queryByText('ABC Customers')).toBeNull();

    fireEvent.keyDown(window, { key: 'Escape' });
    await waitFor(() => expect(document.querySelector('[data-ledger-panel]')).toBeNull());
    // Nothing was picked — the party is untouched.
    expect(field(container, 'buyer.name').value).toBe('SBI Cash Credit Account');
  });
});
