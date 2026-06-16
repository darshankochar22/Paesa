import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { CompanyProvider } from '../context/CompanyContext';
import TCSDetailsCreate from '../pages/master/statutory-details/TCSDetails/TCSDetailsCreate';

const selectedCompany = {
  company_id: 1,
  name: 'TCS Test Corp',
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

function renderTCSDetailsCreate() {
  return render(
    <MemoryRouter>
      <CompanyProvider>
        <TCSDetailsCreate />
      </CompanyProvider>
    </MemoryRouter>
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

  // Mock window.api.companyTcsDetails
  window.api.companyTcsDetails = {
    get: vi.fn().mockResolvedValue({
      success: true,
      exists: false,
      data: null,
    }),
    save: vi.fn().mockResolvedValue({
      success: true,
    }),
  };
});

describe('TCSDetailsCreate — layout & rendering', () => {
  it('renders title and fields correctly', async () => {
    renderTCSDetailsCreate();
    await waitFor(() =>
      expect(screen.getAllByText('Company TCS Collector Details')[0]).toBeInTheDocument()
    );

    expect(getFormRowField('TAN registration number')).toBeInTheDocument();
    expect(getFormRowField('Tax deduction and collection Account Number (TAN)')).toBeInTheDocument();
    expect(getFormRowField('Collector Type')).toBeInTheDocument();
    expect(getFormRowField('Collector branch/division')).toBeInTheDocument();
    expect(getFormRowField('Set/alter details of person responsible')).toBeInTheDocument();
    expect(getFormRowField('Ignore IT exemption limit')).toBeInTheDocument();
  });
});

describe('TCSDetailsCreate — person responsible sub-modal flow', () => {
  it('shows Person Responsible Details modal when setting is Yes and saves details', async () => {
    const user = userEvent.setup();
    renderTCSDetailsCreate();

    await waitFor(() =>
      expect(getFormRowField('Set/alter details of person responsible')).toBeInTheDocument()
    );

    const toggleSelect = getFormRowField('Set/alter details of person responsible') as HTMLSelectElement;
    await user.selectOptions(toggleSelect, 'Yes');

    // Modal should pop up
    await waitFor(() =>
      expect(screen.getByText('Person Responsible Details')).toBeInTheDocument()
    );

    // Enter details in modal
    const nameInput = getFormRowField('Name');
    await user.type(nameInput, 'John Doe');
    
    // Submit modal (Ok)
    const okButton = screen.getByRole('button', { name: /ok/i });
    await user.click(okButton);

    // Modal should close
    await waitFor(() =>
      expect(screen.queryByText('Person Responsible Details')).not.toBeInTheDocument()
    );

    // Fill in TAN
    const tanInput = getFormRowField('Tax deduction and collection Account Number (TAN)');
    await user.type(tanInput, 'BLRP98765E');

    // Accept form
    const acceptButtons = screen.getAllByRole('button', { name: /accept/i });
    await user.click(acceptButtons[0]);

    // Confirm Accept dialog
    const yesButton = screen.getByRole('button', { name: /yes/i });
    await user.click(yesButton);

    await waitFor(() => {
      expect(window.api.companyTcsDetails.save).toHaveBeenCalledWith(
        expect.objectContaining({
          company_id: 1,
          tan: 'BLRP98765E',
          setAlterPersonResponsible: true,
          personResponsibleName: 'John Doe',
        })
      );
    });
  });
});
