import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { CompanyProvider } from '../context/CompanyContext';
import PANDetailsCreate from '../pages/master/statutory-details/PANDetails/PANDetailsCreate';

const selectedCompany = {
  company_id: 1,
  name: 'PAN Test Corp',
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

function renderPANDetailsCreate() {
  return render(
    <MemoryRouter>
      <CompanyProvider>
        <PANDetailsCreate />
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

  // Mock window.api.companyPanCinDetails
  window.api.companyPanCinDetails = {
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

describe('PANDetailsCreate — layout & rendering', () => {
  it('renders title and fields correctly', async () => {
    renderPANDetailsCreate();
    await waitFor(() =>
      expect(screen.getAllByText('PAN/CIN Details')[0]).toBeInTheDocument()
    );

    expect(getFormRowField('PAN/Income tax no.')).toBeInTheDocument();
    expect(getFormRowField('Corporate Identity No. (CIN)')).toBeInTheDocument();
  });
});

describe('PANDetailsCreate — save flow', () => {
  it('saves details successfully when accepted', async () => {
    const user = userEvent.setup();
    renderPANDetailsCreate();

    await waitFor(() =>
      expect(getFormRowField('PAN/Income tax no.')).toBeInTheDocument()
    );

    // Enter details
    const panInput = getFormRowField('PAN/Income tax no.');
    const cinInput = getFormRowField('Corporate Identity No. (CIN)');
    await user.type(panInput, 'ABCDE1234F');
    await user.type(cinInput, 'U12345KA2026PTC123456');

    // Click Accept to show prompt
    const acceptButtons = screen.getAllByRole('button', { name: /accept/i });
    await user.click(acceptButtons[0]);

    // Prompt should appear
    await waitFor(() =>
      expect(screen.getByText('Accept?')).toBeInTheDocument()
    );

    // Click Yes in prompt
    const yesButton = screen.getByRole('button', { name: /yes/i });
    await user.click(yesButton);

    await waitFor(() => {
      expect(window.api.companyPanCinDetails.save).toHaveBeenCalledWith(
        expect.objectContaining({
          company_id: 1,
          pan: 'ABCDE1234F',
          cin: 'U12345KA2026PTC123456',
        })
      );
    });
  });
});
