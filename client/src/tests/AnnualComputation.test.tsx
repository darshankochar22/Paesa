import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { CompanyProvider } from '../context/CompanyContext';
import AnnualComputation from '../pages/master/statutory/gst-return/AnnualComputation';

const selectedCompany = {
  company_id: 1,
  name: 'CC Test Corp',
  financial_year_beginning_from: '2026-04-01',
};

// Payload shape produced by reconciliationService.getAnnualComputation — the real
// backend contract for this screen (voucher_count + liability/itc/summary sections).
const mockPayload = {
  fy_label: '2026-04-01 to 2027-03-31',
  gstin: 'All Registrations',
  voucher_count: { total: 124, included: 74, not_relevant: 40, uncertain: 10 },
  liability: {
    taxable_and_advances: { txval: 100000, iamt: 18000, camt: 0, samt: 0, cess: 0 },
    not_payable: { txval: 5000, iamt: 0, camt: 0, samt: 0, cess: 0 },
    missing_invoice: { txval: 0, iamt: 0, camt: 0, samt: 0, cess: 0 },
  },
  itc: {
    availed: { txval: 50000, iamt: 9000, camt: 0, samt: 0, cess: 0 },
    reversal: { txval: 0, iamt: 0, camt: 0, samt: 0, cess: 0 },
  },
  interest_late_fee: { txval: 0, iamt: 0, camt: 0, samt: 0, cess: 0 },
  hsn_summary: { txval: 100000, iamt: 18000, camt: 0, samt: 0, cess: 0 },
  summary_outward: { txval: 100000, iamt: 18000, camt: 0, samt: 0, cess: 0 },
  summary_inward: { txval: 50000, iamt: 9000, camt: 0, samt: 0, cess: 0 },
};

function renderAnnualComputation() {
  return render(
    <MemoryRouter>
      <CompanyProvider>
        <AnnualComputation />
      </CompanyProvider>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  sessionStorage.clear();

  window.api.company.getAll = vi.fn().mockResolvedValue({
    success: true,
    companies: [selectedCompany],
  });
  window.api.fy.getAll = vi.fn().mockResolvedValue({
    success: true,
    financialYears: [
      { fy_id: 1, company_id: 1, start_date: '2026-04-01', end_date: '2027-03-31', is_active: 1 },
    ],
  });

  window.api.gst.getAnnualComputation = vi.fn().mockResolvedValue({
    success: true,
    payload: mockPayload,
  });
});

describe('AnnualComputation Report Component', () => {
  it('loads and displays the annual computation with real voucher counts', async () => {
    renderAnnualComputation();

    // Wait for the DATA-dependent body to render (not just the shell title, which
    // mounts before the async payload loads — that race made this flaky in CI).
    await waitFor(() => {
      expect(screen.getByText('Total Vouchers')).toBeInTheDocument();
    });

    // Header: registration + FY label from the payload.
    expect(screen.getByText('Annual Computation')).toBeInTheDocument();
    expect(screen.getByText(/All Registrations/)).toBeInTheDocument();
    expect(screen.getAllByText(/2026-04-01 to 2027-03-31/).length).toBeGreaterThanOrEqual(1);

    // Top voucher-count summary (Total = Included + Not Relevant + Uncertain).
    expect(screen.getByText('124')).toBeInTheDocument();
    expect(screen.getByText('74')).toBeInTheDocument();
    expect(screen.getByText('40')).toBeInTheDocument();
    expect(screen.getByText('Uncertain Transactions (Corrections needed)')).toBeInTheDocument();
  });

  it('renders the liability, ITC and summary sections with amounts', async () => {
    renderAnnualComputation();

    await waitFor(() => {
      expect(
        screen.getByText(
          'Outward and Inward Supplies on Which Tax is Payable (Including Advances)',
        ),
      ).toBeInTheDocument();
    });

    expect(screen.getByText('Outward Supplies on Which Tax is Not Payable')).toBeInTheDocument();
    expect(screen.getByText('Total Liability')).toBeInTheDocument();
    expect(
      screen.getByText(
        'Reversal of Input Tax Credit, Adjusted and Ineligible Input Tax Credit Declared',
      ),
    ).toBeInTheDocument();
    expect(screen.getByText('Summary of Outward Supplies')).toBeInTheDocument();
    expect(screen.getByText('Summary of Inward Supplies')).toBeInTheDocument();

    // Liability taxable amount (formatted en-IN) appears.
    expect(screen.getAllByText('1,00,000.00').length).toBeGreaterThanOrEqual(1);
    // ITC availed tax amount.
    expect(screen.getAllByText('9,000.00').length).toBeGreaterThanOrEqual(1);
  });

  it('handles API errors gracefully', async () => {
    window.api.gst.getAnnualComputation = vi.fn().mockResolvedValue({
      success: false,
      error: 'Failed to compute GST details due to invalid vouchers',
    });

    renderAnnualComputation();

    await waitFor(() => {
      expect(
        screen.getByText('Failed to compute GST details due to invalid vouchers'),
      ).toBeInTheDocument();
    });
  });

  it('reloads data when clicking the refresh button', async () => {
    const user = userEvent.setup();
    renderAnnualComputation();

    await waitFor(() => {
      expect(screen.getByText('F5: Refresh')).toBeInTheDocument();
    });

    (window.api.gst.getAnnualComputation as ReturnType<typeof vi.fn>).mockClear();
    await user.click(screen.getByText('F5: Refresh'));

    await waitFor(() => {
      expect(window.api.gst.getAnnualComputation).toHaveBeenCalledTimes(1);
    });
  });
});
