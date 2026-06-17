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

const mockPayload = {
  fy_label: "2026-04-01 to 2027-03-31",
  gstin: "27AAACG1234A1Z1",
  company_name: "CC Test Corp",
  outward_supplies: {
    taxable:  { txval: 100000, iamt: 18000, camt: 0, samt: 0, cess: 0 },
    zero:     { txval: 20000, iamt: 0, camt: 0, samt: 0, cess: 0 },
    nil_exmp: { txval: 5000, iamt: 0, camt: 0, samt: 0, cess: 0 },
    nongst:   { txval: 1000, iamt: 0, camt: 0, samt: 0, cess: 0 },
    rcm:      { txval: 2000, iamt: 360, camt: 0, samt: 0, cess: 0 },
  },
  itc: {
    import_goods:    { txval: 0, iamt: 0, camt: 0, samt: 0, cess: 0 },
    import_services: { txval: 0, iamt: 0, camt: 0, samt: 0, cess: 0 },
    rcm:             { txval: 0, iamt: 0, camt: 0, samt: 0, cess: 0 },
    other:           { txval: 50000, iamt: 9000, camt: 0, samt: 0, cess: 0 },
    reversed:        { txval: 0, iamt: 0, camt: 0, samt: 0, cess: 0 },
    total_availed:   { txval: 50000, iamt: 9000, camt: 0, samt: 0, cess: 0 },
  },
  tax_payable: { igst: 18000, cgst: 0, sgst: 0, cess: 0 },
  tax_paid:    { igst: 18000, cgst: 0, sgst: 0, cess: 0 },
  net_tax:     { igst: 9000, cgst: 0, sgst: 0, cess: 0 },
  monthly_summary: [
    { month: "Apr-26", taxable_val: 100000, outward_tax: 18000, itc_availed: 9000, net_tax: 9000 }
  ],
  annual_total: { taxable_val: 100000, outward_tax: 18000, itc_availed: 9000, net_tax: 9000 },
};

function renderAnnualComputation() {
  return render(
    <MemoryRouter>
      <CompanyProvider>
        <AnnualComputation />
      </CompanyProvider>
    </MemoryRouter>
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
    financialYears: [{ fy_id: 1, company_id: 1, start_date: '2026-04-01', is_active: 1 }],
  });

  window.api.gst.getAnnualComputation = vi.fn().mockResolvedValue({
    success: true,
    payload: mockPayload,
  });
});

describe('AnnualComputation Report Component', () => {
  it('loads and displays the statutory details', async () => {
    renderAnnualComputation();

    await waitFor(() => {
      expect(screen.getByText('Annual Computation')).toBeInTheDocument();
    });

    expect(screen.getByText('27AAACG1234A1Z1')).toBeInTheDocument();
    expect(screen.getByText('2026-04-01 to 2027-03-31')).toBeInTheDocument();

    // Verify outward total and net ITC rows are shown
    expect(screen.getByText('Total Outward Supplies')).toBeInTheDocument();
    expect(screen.getByText('Net ITC Available')).toBeInTheDocument();

    // Verify monthly summary row is rendered
    expect(screen.getByText('Apr-26')).toBeInTheDocument();
  });

  it('can expand a details section and view individual rows', async () => {
    const user = userEvent.setup();
    renderAnnualComputation();

    await waitFor(() => {
      expect(screen.getByText('1. Details of Outward Supplies')).toBeInTheDocument();
    });

    // Sub-items should not be visible initially
    expect(screen.queryByText('(a) Taxable supplies')).not.toBeInTheDocument();

    // Click section header to expand
    await user.click(screen.getByText('1. Details of Outward Supplies'));

    // Now they should be visible
    expect(screen.getByText('(a) Taxable supplies')).toBeInTheDocument();
    expect(screen.getByText('(b) Zero-rated supplies (exports)')).toBeInTheDocument();
  });

  it('handles API errors gracefully', async () => {
    window.api.gst.getAnnualComputation = vi.fn().mockResolvedValue({
      success: false,
      error: 'Failed to compute GST details due to invalid vouchers',
    });

    renderAnnualComputation();

    await waitFor(() => {
      expect(screen.getByText('Failed to compute GST details due to invalid vouchers')).toBeInTheDocument();
    });
  });

  it('reloads data when clicking the refresh button', async () => {
    const user = userEvent.setup();
    renderAnnualComputation();

    await waitFor(() => {
      expect(screen.getByText('Refresh')).toBeInTheDocument();
    });

    vi.clearAllMocks();
    await user.click(screen.getByText('Refresh'));

    expect(window.api.gst.getAnnualComputation).toHaveBeenCalledTimes(1);
  });
});
