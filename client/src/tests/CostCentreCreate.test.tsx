import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { CompanyProvider } from '../context/CompanyContext';
import CostCentreCreate from '../pages/master/cost-centre/cost-centreCreate';

const selectedCompany = {
  company_id: 1,
  name: 'CC Test Corp',
  financial_year_beginning_from: '2026-04-01',
};

// Helper to query input/select elements inside FormRow components
function getFormRowField(labelText: string | RegExp) {
  const labelSpan = screen.getByText(labelText);
  const container = labelSpan.closest('div');
  if (!container) throw new Error(`Could not find container for label: ${labelText}`);
  const field = container.querySelector('input, select');
  if (!field) throw new Error(`Could not find field under label: ${labelText}`);
  return field as HTMLInputElement | HTMLSelectElement;
}

// Selecting from the Under panel schedules a 50ms focus jump to the Accept
// button (focusFieldAfter in useEnterNavigation). Flush it before typing so a
// space keystroke can't land on the button and spuriously submit.
function flushDeferredFocus() {
  return new Promise((r) => setTimeout(r, 75));
}

function renderCostCentreCreate() {
  return render(
    <MemoryRouter>
      <CompanyProvider>
        <CostCentreCreate />
      </CompanyProvider>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  sessionStorage.clear();

  // Mock standard API setups
  window.api.company.getAll = vi.fn().mockResolvedValue({
    success: true,
    companies: [selectedCompany],
  });
  window.api.fy.getAll = vi.fn().mockResolvedValue({
    success: true,
    financialYears: [{ fy_id: 1, company_id: 1, start_date: '2026-04-01', is_active: 1 }],
  });

  // Mock window.api.costCentre
  window.api.costCentre = {
    getAll: vi.fn().mockResolvedValue({
      success: true,
      costCentres: [
        { cc_id: 10, company_id: 1, name: 'Marketing Dept' },
        { cc_id: 20, company_id: 1, name: 'R&D' },
      ],
    }),
    create: vi.fn().mockResolvedValue({
      success: true,
      costCentre: { cc_id: 30, name: 'Sales' },
    }),
    getById: vi.fn().mockResolvedValue({
      success: true,
      costCentre: { cc_id: 10, name: 'Marketing Dept' },
    }),
    getTree: vi.fn().mockResolvedValue({
      success: true,
      tree: [],
    }),
    update: vi.fn().mockResolvedValue({
      success: true,
    }),
    delete: vi.fn().mockResolvedValue({
      success: true,
    }),
  };
});

describe('CostCentreCreate — layout & rendering', () => {
  it('renders fields and title correctly', async () => {
    renderCostCentreCreate();
    await waitFor(() => expect(screen.getAllByText('Cost Centre Creation')[0]).toBeInTheDocument());

    expect(getFormRowField('Name')).toBeInTheDocument();
    expect(getFormRowField('(alias)')).toBeInTheDocument();
    expect(screen.getByText('Under')).toBeInTheDocument();
  });
});

describe('CostCentreCreate — validation', () => {
  it('shows "Name is required" and does NOT create when Accept is clicked on an empty form', async () => {
    const user = userEvent.setup();
    renderCostCentreCreate();

    await waitFor(() => expect(screen.getByRole('button', { name: 'Accept' })).toBeInTheDocument());

    // Click Accept without entering a name — must be blocked by validation.
    await user.click(screen.getByRole('button', { name: 'Accept' }));

    await waitFor(() => expect(screen.getByText('Name is required.')).toBeInTheDocument());
    expect(window.api.costCentre.create).not.toHaveBeenCalled();
  });

  it('does NOT create when the name is only whitespace', async () => {
    const user = userEvent.setup();
    renderCostCentreCreate();

    await waitFor(() => expect(getFormRowField('Name')).toBeInTheDocument());

    await user.type(getFormRowField('Name'), '   ');
    await user.click(screen.getByRole('button', { name: 'Accept' }));

    await waitFor(() => expect(screen.getByText('Name is required.')).toBeInTheDocument());
    expect(window.api.costCentre.create).not.toHaveBeenCalled();
  });
});

describe('CostCentreCreate — save flow', () => {
  it('saves details under Primary successfully when accepted', async () => {
    const user = userEvent.setup();
    renderCostCentreCreate();

    await waitFor(() => expect(getFormRowField('Name')).toBeInTheDocument());

    const nameInput = getFormRowField('Name');
    const aliasInput = getFormRowField('(alias)');
    await user.type(nameInput, 'Operations');
    await user.type(aliasInput, 'Ops');

    // Click Accept (footer) — saves directly, no confirmation prompt
    const acceptButton = screen.getByRole('button', { name: 'Accept' });
    await user.click(acceptButton);

    await waitFor(() => {
      expect(window.api.costCentre.create).toHaveBeenCalledWith(
        expect.objectContaining({
          company_id: 1,
          name: 'Operations',
          alias: 'Ops',
          parent_id: undefined,
        }),
      );
    });
  });

  it('allows selecting an existing cost centre as parent (Under)', async () => {
    const user = userEvent.setup();
    renderCostCentreCreate();

    await waitFor(() => expect(getFormRowField('Name')).toBeInTheDocument());

    // Click Under row to trigger right side panel
    const underRow = screen.getByText('Under');
    await user.click(underRow);

    // Panel should load
    await waitFor(() => expect(screen.getByText('Under Cost Centre')).toBeInTheDocument());

    // Click on R&D to set as parent
    const rdOption = screen.getByText('R&D');
    await user.click(rdOption);
    await flushDeferredFocus();

    // Enter name
    const nameInput = getFormRowField('Name');
    await user.type(nameInput, 'Software Engineers');

    // Click Accept (footer) — saves directly
    const acceptButton = screen.getByRole('button', { name: 'Accept' });
    await user.click(acceptButton);

    await waitFor(() => {
      expect(window.api.costCentre.create).toHaveBeenCalledWith(
        expect.objectContaining({
          company_id: 1,
          name: 'Software Engineers',
          parent_id: 20,
        }),
      );
    });
  });
});
