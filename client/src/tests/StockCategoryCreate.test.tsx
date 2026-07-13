import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { CompanyProvider } from '../context/CompanyContext';
import StockCategoryCreate from '../pages/master/inventory/stock-category/StockCategoryCreate';

// ─── Sample Data ─────────────────────────────────────────────────────────────

const selectedCompany = {
  company_id: 1,
  name: 'Test Corp',
  financial_year_beginning_from: '2026-04-01',
};

const mockStockCategories = [
  { sc_id: 10, company_id: 1, name: 'Primary' },
  { sc_id: 11, company_id: 1, name: 'Dry Fruits' },
  { sc_id: 12, company_id: 1, name: 'Spices' },
];

// ─── Render Helper ────────────────────────────────────────────────────────────

function renderStockCategoryCreate() {
  return render(
    <MemoryRouter>
      <CompanyProvider>
        <StockCategoryCreate />
      </CompanyProvider>
    </MemoryRouter>,
  );
}

// Helper to query input/select elements inside FormRow components
function getFormRowField(labelText: string | RegExp) {
  const labelSpan = screen.getByText(labelText);
  const container = labelSpan.closest('div');
  if (!container) throw new Error(`Could not find container for label: ${labelText}`);
  const field = container.querySelector('input');
  if (!field) throw new Error(`Could not find input field under label: ${labelText}`);
  return field as HTMLInputElement;
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

  // Mock stockCategory API methods
  window.api.stockCategory = {
    getAll: vi.fn().mockResolvedValue({
      success: true,
      stockCategories: mockStockCategories,
    }),
    create: vi.fn().mockResolvedValue({
      success: true,
      stockCategory: { sc_id: 99, company_id: 1, name: 'Almonds' },
    }),
  } as any;
});

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('StockCategoryCreate — initial render', () => {
  it('renders the "Stock Category Creation" page title', async () => {
    renderStockCategoryCreate();
    await waitFor(() => expect(screen.getByText('Stock Category Creation')).toBeInTheDocument());
  });

  it('renders the Name and Alias input fields', async () => {
    renderStockCategoryCreate();
    await waitFor(() => {
      expect(getFormRowField('Name')).toBeInTheDocument();
      expect(getFormRowField('(alias)')).toBeInTheDocument();
    });
  });

  it('calls stockCategory.getAll with company id on mount', async () => {
    renderStockCategoryCreate();
    await waitFor(() => expect(window.api.stockCategory.getAll).toHaveBeenCalledWith(1));
  });
});

describe('StockCategoryCreate — validation & submission', () => {
  it('shows validation error when name is empty', async () => {
    const user = userEvent.setup();
    renderStockCategoryCreate();

    await waitFor(() => expect(screen.getByRole('button', { name: 'Accept' })).toBeInTheDocument());
    await user.click(screen.getByRole('button', { name: 'Accept' }));

    await waitFor(() => expect(screen.getByText(/Name is required/i)).toBeInTheDocument());
    expect(window.api.stockCategory.create).not.toHaveBeenCalled();
  });

  it('successfully submits form with primary category', async () => {
    const user = userEvent.setup();
    renderStockCategoryCreate();

    await waitFor(() => expect(getFormRowField('Name')).toBeInTheDocument());

    await user.type(getFormRowField('Name'), 'Beverages');
    await user.type(getFormRowField('(alias)'), 'Drinks');
    await user.click(screen.getByRole('button', { name: 'Accept' }));

    await waitFor(() =>
      expect(window.api.stockCategory.create).toHaveBeenCalledWith({
        company_id: 1,
        name: 'Beverages',
        alias: 'Drinks',
        parent_category_id: undefined,
      }),
    );

    await waitFor(() =>
      expect(screen.getByText(/Stock Category "Beverages" created/i)).toBeInTheDocument(),
    );
  });
});

describe('StockCategoryCreate — parent category panel select', () => {
  it('opens and closes parent selection panel, and selects parent category', async () => {
    const user = userEvent.setup();
    renderStockCategoryCreate();

    await waitFor(() => expect(screen.getByText('Under')).toBeInTheDocument());

    // Toggle open parent selection panel
    await user.click(screen.getByText('Under'));
    await waitFor(() => expect(screen.getByText('List of Categories')).toBeInTheDocument());
    expect(screen.getByText('Dry Fruits')).toBeInTheDocument();
    expect(screen.getByText('Spices')).toBeInTheDocument();

    // Select "Dry Fruits"
    await user.click(screen.getByText('Dry Fruits'));

    // Panel should close and field label updates
    await waitFor(() => expect(screen.queryByText('List of Categories')).not.toBeInTheDocument());
    expect(screen.getByText('Dry Fruits')).toBeInTheDocument();
    await flushDeferredFocus();

    // Now submit to verify parent_category_id is passed as number
    await user.type(getFormRowField('Name'), 'Cashews');
    await user.click(screen.getByRole('button', { name: 'Accept' }));

    await waitFor(() =>
      expect(window.api.stockCategory.create).toHaveBeenCalledWith({
        company_id: 1,
        name: 'Cashews',
        alias: undefined,
        parent_category_id: 11,
      }),
    );
  });
});
