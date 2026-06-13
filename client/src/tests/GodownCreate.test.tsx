import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { CompanyProvider } from '../context/CompanyContext';
import GodownCreate from '../pages/master/inventory/godown/GodownCreate';

// ─── Sample Data ─────────────────────────────────────────────────────────────

const selectedCompany = {
  company_id: 1,
  name: 'Test Corp',
  financial_year_beginning_from: '2026-04-01',
};

const mockGodowns = [
  { godown_id: 10, company_id: 1, name: 'Primary' },
  { godown_id: 11, company_id: 1, name: 'Main Location' },
  { godown_id: 12, company_id: 1, name: 'Warehouse A' },
];

// ─── Render Helper ────────────────────────────────────────────────────────────

function renderGodownCreate() {
  return render(
    <MemoryRouter>
      <CompanyProvider>
        <GodownCreate />
      </CompanyProvider>
    </MemoryRouter>
  );
}

// Helper to query input/select elements inside FormRow components
function getFormRowField(labelText: string | RegExp, elementTag: 'input' | 'select' = 'input') {
  const labelSpan = screen.getByText(labelText);
  const container = labelSpan.closest('div');
  if (!container) throw new Error(`Could not find container for label: ${labelText}`);
  const field = container.querySelector(elementTag);
  if (!field) throw new Error(`Could not find ${elementTag} field under label: ${labelText}`);
  return field as HTMLInputElement | HTMLSelectElement;
}

// ─── Setup ───────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
  sessionStorage.clear(); // Clear form persistence state between tests

  // Setup basic company and active financial year mocks
  window.api.company.getAll = vi.fn().mockResolvedValue({
    success: true,
    companies: [selectedCompany],
  });
  window.api.fy.getAll = vi.fn().mockResolvedValue({
    success: true,
    financialYears: [{ fy_id: 1, company_id: 1, start_date: '2026-04-01', is_active: 1 }],
  });

  // Mock godown API calls
  window.api.godown = {
    getAll: vi.fn().mockResolvedValue({
      success: true,
      godowns: mockGodowns,
    }),
    create: vi.fn().mockResolvedValue({
      success: true,
      godown: { godown_id: 99, company_id: 1, name: 'Warehouse B' },
    }),
  } as any;
});

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('GodownCreate — initial render', () => {
  it('renders the "Godown Creation" page title', async () => {
    renderGodownCreate();
    await waitFor(() =>
      expect(screen.getByText('Godown Creation')).toBeInTheDocument()
    );
  });

  it('renders general section and address section fields', async () => {
    renderGodownCreate();
    await waitFor(() => {
      // General
      expect(getFormRowField('Name')).toBeInTheDocument();
      expect(getFormRowField('(alias)')).toBeInTheDocument();
      expect(getFormRowField('Allow Storage of Materials', 'select')).toHaveValue('1');

      // Address Details
      expect(getFormRowField('Address')).toBeInTheDocument();
      expect(getFormRowField('City')).toBeInTheDocument();
      expect(getFormRowField('State')).toBeInTheDocument();
      expect(getFormRowField('Pincode')).toBeInTheDocument();
    });
  });

  it('calls godown.getAll with company id on mount', async () => {
    renderGodownCreate();
    await waitFor(() =>
      expect(window.api.godown.getAll).toHaveBeenCalledWith(1)
    );
  });
});

describe('GodownCreate — validation & submission', () => {
  it('shows validation error when name is empty', async () => {
    const user = userEvent.setup();
    renderGodownCreate();

    await waitFor(() => expect(screen.getByRole('button', { name: /create/i })).toBeInTheDocument());
    await user.click(screen.getByRole('button', { name: /create/i }));

    await waitFor(() =>
      expect(screen.getByText(/Name is required/i)).toBeInTheDocument()
    );
    expect(window.api.godown.create).not.toHaveBeenCalled();
  });

  it('shows validation error when pincode is not numeric or longer than 6 digits', async () => {
    const user = userEvent.setup();
    renderGodownCreate();

    await waitFor(() => expect(getFormRowField('Name')).toBeInTheDocument());

    await user.type(getFormRowField('Name'), 'Test Location');
    await user.type(getFormRowField('Pincode'), 'abc123'); // non-numeric pincode

    await user.click(screen.getByRole('button', { name: /create/i }));

    await waitFor(() =>
      expect(screen.getByText(/Pincode must be numeric/i)).toBeInTheDocument()
    );
    expect(window.api.godown.create).not.toHaveBeenCalled();
  });

  it('successfully submits form with primary godown and address details', async () => {
    const user = userEvent.setup();
    renderGodownCreate();

    await waitFor(() => expect(getFormRowField('Name')).toBeInTheDocument());

    await user.type(getFormRowField('Name'), 'Central Warehouse');
    await user.type(getFormRowField('(alias)'), 'C-WH');
    await user.type(getFormRowField('Address'), '456 Industrial Area');
    await user.type(getFormRowField('City'), 'Mumbai');
    await user.type(getFormRowField('State'), 'Maharashtra');
    await user.type(getFormRowField('Pincode'), '400001');

    await user.click(screen.getByRole('button', { name: /create/i }));

    await waitFor(() =>
      expect(window.api.godown.create).toHaveBeenCalledWith({
        company_id: 1,
        name: 'Central Warehouse',
        alias: 'C-WH',
        parent_godown_id: undefined,
        allow_storage_of_materials: 1,
        address: '456 Industrial Area',
        city: 'Mumbai',
        state: 'Maharashtra',
        pincode: '400001',
      })
    );

    await waitFor(() =>
      expect(screen.getByText(/Godown "Central Warehouse" created successfully/i)).toBeInTheDocument()
    );
  });
});

describe('GodownCreate — parent godown selection panel', () => {
  it('opens and closes side panel, and selects parent godown', async () => {
    const user = userEvent.setup();
    renderGodownCreate();

    await waitFor(() => expect(screen.getByText('Under')).toBeInTheDocument());

    // Click Under to open side selection panel
    await user.click(screen.getByText('Under'));
    await waitFor(() => expect(screen.getByText('List of Godowns')).toBeInTheDocument());
    expect(screen.getByText('Main Location')).toBeInTheDocument();
    expect(screen.getByText('Warehouse A')).toBeInTheDocument();

    // Select "Main Location"
    await user.click(screen.getByText('Main Location'));

    // Panel should close and field label updates
    await waitFor(() => expect(screen.queryByText('List of Godowns')).not.toBeInTheDocument());
    expect(screen.getByText('Main Location')).toBeInTheDocument();

    // Submit and check parent_godown_id is number 11
    await user.type(getFormRowField('Name'), 'Shelf 1');
    await user.click(screen.getByRole('button', { name: /create/i }));

    await waitFor(() =>
      expect(window.api.godown.create).toHaveBeenCalledWith({
        company_id: 1,
        name: 'Shelf 1',
        alias: undefined,
        parent_godown_id: 11,
        allow_storage_of_materials: 1,
        address: undefined,
        city: undefined,
        state: undefined,
        pincode: undefined,
      })
    );
  });
});
