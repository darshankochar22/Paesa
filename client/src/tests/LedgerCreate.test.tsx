import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { CompanyProvider } from '../context/CompanyContext';
import LedgerCreate from '../pages/master/ledger/LedgerCreate';

// ─── Sample Data ─────────────────────────────────────────────────────────────

const selectedCompany = {
  company_id: 1,
  name: 'Test Corp',
  financial_year_beginning_from: '2026-04-01',
};

const mockGroups = [
  { group_id: 10, company_id: 1, name: 'Capital Account', parent_group_id: null },
  { group_id: 11, company_id: 1, name: 'Bank Accounts', parent_group_id: null },
  { group_id: 12, company_id: 1, name: 'Sundry Debtors', parent_group_id: null },
  { group_id: 13, company_id: 1, name: 'Indirect Expenses', parent_group_id: null },
];

// ─── Render Helper ────────────────────────────────────────────────────────────

function renderLedgerCreate() {
  return render(
    <MemoryRouter>
      <CompanyProvider>
        <LedgerCreate />
      </CompanyProvider>
    </MemoryRouter>,
  );
}

// Scoped FormRow helper to find fields exactly and optionally under a container
function getFormRowField(
  labelText: string | RegExp,
  elementTag: 'input' | 'select' = 'input',
  container: HTMLElement = document.body,
) {
  const spans = Array.from(container.querySelectorAll('span'));
  const labelSpan = spans.find((span) => {
    const text = span.textContent?.trim() || '';
    if (typeof labelText === 'string') {
      return text === labelText;
    } else {
      return labelText.test(text);
    }
  });

  if (!labelSpan) {
    throw new Error(`Could not find span with text: ${labelText}`);
  }

  const rowContainer = labelSpan.closest('div');
  if (!rowContainer) {
    throw new Error(`Could not find FormRow container for label: ${labelText}`);
  }

  const field = rowContainer.querySelector(elementTag);
  if (!field) {
    throw new Error(`Could not find ${elementTag} field under label: ${labelText}`);
  }

  return field as HTMLInputElement | HTMLSelectElement;
}

// Selecting from the Under panel schedules a 50ms focus jump to the Accept
// button (focusFieldAfter in useEnterNavigation). Flush it before typing so a
// space keystroke can't land on the button and spuriously submit.
function flushDeferredFocus() {
  return new Promise((r) => setTimeout(r, 75));
}

// ─── Setup ───────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
  sessionStorage.clear();

  // Setup basic company and active financial year mocks
  window.api.company.getAll = vi.fn().mockResolvedValue({
    success: true,
    companies: [selectedCompany],
  });
  window.api.fy.getAll = vi.fn().mockResolvedValue({
    success: true,
    financialYears: [{ fy_id: 1, company_id: 1, start_date: '2026-04-01', is_active: 1 }],
  });

  // Mock group and ledger API calls
  window.api.group.getAll = vi.fn().mockResolvedValue({
    success: true,
    groups: mockGroups,
  });
  window.api.ledger.create = vi.fn().mockResolvedValue({
    success: true,
    ledger: { ledger_id: 99, name: 'Main Capital Ledger' },
  });
});

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('LedgerCreate — initial render', () => {
  it('renders the "Ledger Creation" page title', async () => {
    renderLedgerCreate();
    await waitFor(() => expect(screen.getByText('Ledger Creation')).toBeInTheDocument());
  });

  it('renders general fields (Name, Alias, Under, Opening Balance)', async () => {
    renderLedgerCreate();
    await waitFor(() => {
      expect(getFormRowField('Name')).toBeInTheDocument();
      expect(getFormRowField('(alias)')).toBeInTheDocument();
      expect(screen.getByText('Under')).toBeInTheDocument();
      expect(screen.getByText('Opening Balance')).toBeInTheDocument();
    });
  });

  it('defaults Under group to "Capital Account"', async () => {
    renderLedgerCreate();
    await waitFor(() => {
      expect(screen.getByText('Capital Account')).toBeInTheDocument();
    });
  });
});

describe('LedgerCreate — validations & submission', () => {
  it('shows validation error when Name is empty', async () => {
    const user = userEvent.setup();
    renderLedgerCreate();

    await waitFor(() => expect(screen.getByRole('button', { name: 'Accept' })).toBeInTheDocument());
    await user.click(screen.getByRole('button', { name: 'Accept' }));

    await waitFor(() => expect(screen.getByText(/Name is required/i)).toBeInTheDocument());
    expect(window.api.ledger.create).not.toHaveBeenCalled();
  });

  it('submits simple ledger successfully', async () => {
    const user = userEvent.setup();
    renderLedgerCreate();

    await waitFor(() => expect(getFormRowField('Name')).toBeInTheDocument());

    await user.type(getFormRowField('Name'), 'Equity Share Capital');
    await user.type(getFormRowField('(alias)'), 'ESC');
    await user.click(screen.getByRole('button', { name: 'Accept' }));

    await waitFor(() =>
      expect(window.api.ledger.create).toHaveBeenCalledWith(
        expect.objectContaining({
          company_id: 1,
          name: 'Equity Share Capital',
          alias: 'ESC',
          group_id: 10,
          opening_balance: 0,
        }),
      ),
    );
  });
});

describe('LedgerCreate — Group Lineage and banking flows', () => {
  it('renders bank details directly inline when parent group is "Bank Accounts"', async () => {
    const user = userEvent.setup();
    renderLedgerCreate();

    await waitFor(() => expect(screen.getByText('Under')).toBeInTheDocument());

    // Open group selection panel
    await user.click(screen.getByText('Under'));
    await waitFor(() => expect(screen.getByText('List of Groups')).toBeInTheDocument());

    // Select "Bank Accounts" group
    await user.click(screen.getByText('Bank Accounts'));
    await waitFor(() => expect(screen.queryByText('List of Groups')).not.toBeInTheDocument());
    await flushDeferredFocus();

    // For Bank Accounts, the banking form is rendered directly inline
    await waitFor(() => {
      expect(screen.getByText('Bank Account Details')).toBeInTheDocument();
      expect(getFormRowField('A/c No.')).toBeInTheDocument();
      expect(getFormRowField('IFS Code')).toBeInTheDocument();
    });

    // Fill in banking details directly inline
    await user.type(getFormRowField("A/c Holder's Name"), 'SBI Test Account');
    await user.type(getFormRowField('A/c No.'), '9876543210');
    await user.type(getFormRowField('IFS Code'), 'SBIN0009999');

    // Enter name & submit
    await user.type(getFormRowField('Name'), 'SBI Bank Account');
    await user.click(screen.getByRole('button', { name: 'Accept' }));

    await waitFor(() =>
      expect(window.api.ledger.create).toHaveBeenCalledWith(
        expect.objectContaining({
          company_id: 1,
          name: 'SBI Bank Account',
          group_id: 11,
          bank_details: expect.objectContaining({
            account_holder_name: 'SBI Test Account',
            account_number: '9876543210',
            ifsc_code: 'SBIN0009999',
          }),
        }),
      ),
    );
  });

  it('triggers a popup for bank details when non-bank group selects "Yes" for "Provide bank details"', async () => {
    const user = userEvent.setup();
    renderLedgerCreate();

    await waitFor(() => expect(screen.getByText('Under')).toBeInTheDocument());

    // Open group selection panel
    await user.click(screen.getByText('Under'));
    await waitFor(() => expect(screen.getByText('List of Groups')).toBeInTheDocument());

    // Select "Sundry Debtors" group
    await user.click(screen.getByText('Sundry Debtors'));
    await waitFor(() => expect(screen.queryByText('List of Groups')).not.toBeInTheDocument());
    await flushDeferredFocus();

    // Verify banking details section is rendered (since lineage.isBank is false)
    await waitFor(() => expect(screen.getByText('Banking Details')).toBeInTheDocument());

    // Select "Yes" for "Provide bank details" — this opens the Bank Details popup.
    const provideBankSelect = getFormRowField('Provide bank details', 'select');
    await user.selectOptions(provideBankSelect, 'Yes');

    // BankDetailsPopup opens (the key integration point for a non-bank group).
    await waitFor(() => expect(screen.getByText(/Bank Details for/i)).toBeInTheDocument());

    // Accept the popup (its own "A: Accept" button — scoped to the popup overlay,
    // since the ledger form footer also has an Accept). Closes and returns to the form.
    const popup = screen.getByText(/Bank Details for/i).closest('.fixed.inset-0') as HTMLElement;
    await user.click(within(popup).getByRole('button', { name: /accept/i }));
    await waitFor(() => expect(screen.queryByText(/Bank Details for/i)).not.toBeInTheDocument());

    // Type name and submit — the ledger still creates under the selected group.
    await user.type(getFormRowField('Name'), 'Debtor Bank Ledger');
    await user.click(screen.getByRole('button', { name: 'Accept' }));

    await waitFor(() =>
      expect(window.api.ledger.create).toHaveBeenCalledWith(
        expect.objectContaining({
          company_id: 1,
          name: 'Debtor Bank Ledger',
          group_id: 12,
        }),
      ),
    );
  });
});
