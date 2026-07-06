import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { CompanyProvider } from '../context/CompanyContext';
import StockGroupCreate from '../pages/master/inventory/stock-group/StockGroupCreate';

// ─── Sample Data ─────────────────────────────────────────────────────────────

const selectedCompany = {
  company_id: 1,
  name: 'Test Corp',
  financial_year_beginning_from: '2026-04-01',
};

const mockStockGroups = [
  { sg_id: 10, company_id: 1, name: 'Primary' },
  { sg_id: 11, company_id: 1, name: 'Electronics' },
  { sg_id: 12, company_id: 1, name: 'Groceries' },
];

// ─── Render Helper ────────────────────────────────────────────────────────────

function renderStockGroupCreate() {
  return render(
    <MemoryRouter>
      <CompanyProvider>
        <StockGroupCreate />
      </CompanyProvider>
    </MemoryRouter>,
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
  window.api.stockGroup.getAll = vi.fn().mockResolvedValue({
    success: true,
    stockGroups: mockStockGroups,
  });
  window.api.stockGroup.create = vi.fn().mockResolvedValue({
    success: true,
    stockGroup: { sg_id: 99, company_id: 1, name: 'Mobile Phones' },
  });
});

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('StockGroupCreate — initial render', () => {
  it('renders the "Stock Group Creation" page title', async () => {
    renderStockGroupCreate();
    await waitFor(() => expect(screen.getByText('Stock Group Creation')).toBeInTheDocument());
  });

  it('renders the Name and Alias input fields', async () => {
    renderStockGroupCreate();
    await waitFor(() => {
      expect(getFormRowField('Name')).toBeInTheDocument();
      expect(getFormRowField('(alias)')).toBeInTheDocument();
    });
  });

  it('renders dropdown for quantities addition default to No', async () => {
    renderStockGroupCreate();
    await waitFor(() => {
      const select = getFormRowField('Should quantities of items be added', 'select');
      expect(select).toBeInTheDocument();
      expect(select).toHaveValue('0');
    });
  });

  it('calls stockGroup.getAll with company id on mount', async () => {
    renderStockGroupCreate();
    await waitFor(() => expect(window.api.stockGroup.getAll).toHaveBeenCalledWith(1));
  });
});

describe('StockGroupCreate — validation & submission', () => {
  it('shows validation error when name is empty', async () => {
    const user = userEvent.setup();
    renderStockGroupCreate();

    await waitFor(() =>
      expect(screen.getByRole('button', { name: /create/i })).toBeInTheDocument(),
    );
    await user.click(screen.getByRole('button', { name: /create/i }));

    await waitFor(() => expect(screen.getByText(/Name is required/i)).toBeInTheDocument());
    expect(window.api.stockGroup.create).not.toHaveBeenCalled();
  });

  it('successfully submits form with primary group and default GST details', async () => {
    const user = userEvent.setup();
    renderStockGroupCreate();

    await waitFor(() => expect(getFormRowField('Name')).toBeInTheDocument());

    await user.type(getFormRowField('Name'), 'Hardware');
    await user.type(getFormRowField('(alias)'), 'HW');
    await user.click(screen.getByRole('button', { name: /create/i }));

    await waitFor(() =>
      // statutory_details is a serialized default-config JSON blob (implementation
      // detail); assert the stable scalar fields with objectContaining.
      expect(window.api.stockGroup.create).toHaveBeenCalledWith(
        expect.objectContaining({
          company_id: 1,
          name: 'Hardware',
          alias: 'HW',
          parent_group_id: null,
          should_quantities_be_added: 0,
          hsn_sac_code: null,
          hsn_sac_description: null,
          gst_rate: 0,
          cgst_rate: 0,
          sgst_rate: 0,
        }),
      ),
    );

    await waitFor(() =>
      expect(screen.getByText(/Stock Group "Hardware" created/i)).toBeInTheDocument(),
    );
  });

  it('handles custom specified HSN/SAC and GST details', async () => {
    const user = userEvent.setup();
    renderStockGroupCreate();

    await waitFor(() => expect(getFormRowField('Name')).toBeInTheDocument());

    await user.type(getFormRowField('Name'), 'Taxable Goods');

    // Specify HSN/SAC
    const hsnSelect = getFormRowField('HSN/SAC Details', 'select');
    await user.selectOptions(hsnSelect, 'Specify Details Here');

    // These fields are shown conditionally after selecting "Specify Details Here"
    await waitFor(() => expect(getFormRowField('HSN/SAC')).toBeInTheDocument());
    await user.type(getFormRowField('HSN/SAC'), '123456');
    await user.type(getFormRowField('Description'), 'Test HSN description');

    // Specify GST Rate
    const gstRateSelect = getFormRowField('GST Rate Details', 'select');
    await user.selectOptions(gstRateSelect, 'Specify Details Here');

    const gstTaxability = getFormRowField('Taxability Type', 'select');
    await user.selectOptions(gstTaxability, 'Taxable');

    const gstRateInput = getFormRowField('GST Rate');
    await user.clear(gstRateInput);
    await user.type(gstRateInput, '18');

    await user.click(screen.getByRole('button', { name: /create/i }));

    await waitFor(() =>
      // 18% splits into 9/9; taxability flows through; statutory_details is a JSON
      // blob (implementation detail) so assert the stable scalar fields only.
      expect(window.api.stockGroup.create).toHaveBeenCalledWith(
        expect.objectContaining({
          company_id: 1,
          name: 'Taxable Goods',
          alias: null,
          parent_group_id: null,
          should_quantities_be_added: 0,
          hsn_sac_code: '123456',
          hsn_sac_description: 'Test HSN description',
          gst_rate: 18,
          cgst_rate: 9,
          sgst_rate: 9,
          taxability_type: 'Taxable',
        }),
      ),
    );
  });
});

describe('StockGroupCreate — parent group panel select', () => {
  it('opens and closes group list panel, and selects group', async () => {
    const user = userEvent.setup();
    renderStockGroupCreate();

    await waitFor(() => expect(screen.getByText('Under')).toBeInTheDocument());

    // Toggle open parent selection panel
    await user.click(screen.getByText('Under'));
    await waitFor(() => expect(screen.getByText('List of Groups')).toBeInTheDocument());
    expect(screen.getByText('Electronics')).toBeInTheDocument();
    expect(screen.getByText('Groceries')).toBeInTheDocument();

    // Select "Electronics"
    await user.click(screen.getByText('Electronics'));

    // Panel should close and field label updates
    await waitFor(() => expect(screen.queryByText('List of Groups')).not.toBeInTheDocument());
    expect(screen.getByText('Electronics')).toBeInTheDocument();
  });
});
