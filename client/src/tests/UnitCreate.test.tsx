import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { CompanyProvider } from '../context/CompanyContext';
import UnitCreate from '../pages/master/inventory/unit/UnitCreate';

// ─── Sample Data ─────────────────────────────────────────────────────────────

const selectedCompany = {
  company_id: 1,
  name: 'Test Corp',
  financial_year_beginning_from: '2026-04-01',
};

const mockSimpleUnits = [
  { unit_id: 10, company_id: 1, name: 'Kg', symbol: 'Kg', formal_name: 'Kilogram', unit_type: 'Simple', decimal_places: 2 },
  { unit_id: 11, company_id: 1, name: 'Box', symbol: 'Box', formal_name: 'Box', unit_type: 'Simple', decimal_places: 0 },
];

// ─── Render Helper ────────────────────────────────────────────────────────────

function renderUnitCreate() {
  return render(
    <MemoryRouter>
      <CompanyProvider>
        <UnitCreate />
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

  // Mock unit API calls
  window.api.unit.getAll = vi.fn().mockResolvedValue({
    success: true,
    units: mockSimpleUnits,
  });
  window.api.unit.create = vi.fn().mockResolvedValue({
    success: true,
    unit: { unit_id: 99, symbol: 'DZN', formal_name: 'Dozen' },
  });
});

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('UnitCreate — initial render', () => {
  it('renders the "Unit Creation" page title', async () => {
    renderUnitCreate();
    await waitFor(() =>
      expect(screen.getByText('Unit Creation')).toBeInTheDocument()
    );
  });

  it('defaults unit type to "Simple" and renders symbol field', async () => {
    renderUnitCreate();
    await waitFor(() => {
      const typeSelect = getFormRowField('Type', 'select');
      expect(typeSelect).toHaveValue('Simple');
      expect(getFormRowField('Symbol')).toBeInTheDocument();
      expect(getFormRowField('Formal Name')).toBeInTheDocument();
      expect(getFormRowField('Number of Decimal Places', 'select')).toBeInTheDocument();
    });
  });
});

describe('UnitCreate — Simple Unit Flow', () => {
  it('validates symbol is required', async () => {
    const user = userEvent.setup();
    renderUnitCreate();

    await waitFor(() => expect(screen.getByRole('button', { name: /create/i })).toBeInTheDocument());
    await user.click(screen.getByRole('button', { name: /create/i }));

    await waitFor(() =>
      expect(screen.getByText(/Symbol is required/i)).toBeInTheDocument()
    );
    expect(window.api.unit.create).not.toHaveBeenCalled();
  });

  it('successfully creates simple unit', async () => {
    const user = userEvent.setup();
    renderUnitCreate();

    await waitFor(() => expect(getFormRowField('Symbol')).toBeInTheDocument());

    await user.type(getFormRowField('Symbol'), 'Pcs');
    await user.type(getFormRowField('Formal Name'), 'Pieces');
    await user.selectOptions(getFormRowField('Number of Decimal Places', 'select'), '2');

    await user.click(screen.getByRole('button', { name: /create/i }));

    await waitFor(() =>
      expect(window.api.unit.create).toHaveBeenCalledWith({
        company_id: 1,
        name: 'Pcs',
        symbol: 'Pcs',
        formal_name: 'Pieces',
        unit_type: 'Simple',
        decimal_places: 2,
      })
    );
    await waitFor(() =>
      expect(screen.getByText(/Unit "DZN" created successfully/i)).toBeInTheDocument()
    );
  });
});

describe('UnitCreate — Compound Unit Flow', () => {
  it('validates compound unit fields', async () => {
    const user = userEvent.setup();
    renderUnitCreate();

    await waitFor(() => expect(getFormRowField('Type', 'select')).toBeInTheDocument());
    await user.selectOptions(getFormRowField('Type', 'select'), 'Compound');

    // Should load the compound unit section header
    await waitFor(() => expect(screen.getByText('Units with Multiplier Factors')).toBeInTheDocument());

    await user.click(screen.getByRole('button', { name: /create/i }));

    await waitFor(() =>
      expect(screen.getByText(/First unit is required/i)).toBeInTheDocument()
    );
    expect(window.api.unit.create).not.toHaveBeenCalled();
  });

  it('validates conversion factor > 0', async () => {
    const user = userEvent.setup();
    renderUnitCreate();

    await waitFor(() => expect(getFormRowField('Type', 'select')).toBeInTheDocument());
    await user.selectOptions(getFormRowField('Type', 'select'), 'Compound');

    await waitFor(() => expect(screen.getByText('First unit')).toBeInTheDocument());

    // Select first unit (Box)
    const firstContainer = screen.getByText('First unit').closest('div')!;
    const firstBtn = within(firstContainer).getByRole('button');
    await user.click(firstBtn);
    
    // There are multiple instances of 'Box' (symbol and formal name). Click the first one.
    const boxOption = screen.getAllByText(/Box/i)[0];
    await user.click(boxOption);

    // Select second unit (Kg)
    const secondContainer = screen.getByText('Second unit').closest('div')!;
    const secondBtn = within(secondContainer).getByRole('button');
    await user.click(secondBtn);
    
    const kgOption = screen.getAllByText(/Kg/i)[0];
    await user.click(kgOption);

    // Type 0 conversion factor
    const conversionInput = screen.getByRole('spinbutton');
    await user.type(conversionInput, '0');

    await user.click(screen.getByRole('button', { name: /create/i }));

    await waitFor(() =>
      expect(screen.getByText(/Conversion factor must be greater than 0/i)).toBeInTheDocument()
    );
  });

  it('successfully creates compound unit', async () => {
    const user = userEvent.setup();
    renderUnitCreate();

    await waitFor(() => expect(getFormRowField('Type', 'select')).toBeInTheDocument());
    await user.selectOptions(getFormRowField('Type', 'select'), 'Compound');

    await waitFor(() => expect(screen.getByText('First unit')).toBeInTheDocument());

    // Select first unit (Box)
    const firstContainer = screen.getByText('First unit').closest('div')!;
    const firstBtn = within(firstContainer).getByRole('button');
    await user.click(firstBtn);
    
    const boxOption = screen.getAllByText(/Box/i)[0];
    await user.click(boxOption);

    // Select second unit (Kg)
    const secondContainer = screen.getByText('Second unit').closest('div')!;
    const secondBtn = within(secondContainer).getByRole('button');
    await user.click(secondBtn);
    
    const kgOption = screen.getAllByText(/Kg/i)[0];
    await user.click(kgOption);

    // Type 10 conversion factor
    const conversionInput = screen.getByRole('spinbutton');
    await user.type(conversionInput, '10');

    await user.click(screen.getByRole('button', { name: /create/i }));

    await waitFor(() =>
      expect(window.api.unit.create).toHaveBeenCalledWith({
        company_id: 1,
        unit_type: 'Compound',
        first_unit_id: 11,
        second_unit_id: 10,
        conversion_factor: 10,
      })
    );
  });
});
