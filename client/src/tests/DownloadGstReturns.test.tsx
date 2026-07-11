import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { CompanyProvider } from '../context/CompanyContext';
import DownloadGstReturns, {
  monthRange,
} from '../pages/master/statutory/gst-return/DownloadGstReturns';

describe('monthRange', () => {
  it('single month → one period', () => {
    expect(monthRange('042024', '042024')).toEqual(['042024']);
  });
  it('spans a year boundary', () => {
    expect(monthRange('112024', '022025')).toEqual(['112024', '122024', '012025', '022025']);
  });
  it('from after to → empty', () => {
    expect(monthRange('052024', '042024')).toEqual([]);
  });
});

function setupCompanyMocks() {
  window.api.company.getAll = vi.fn().mockResolvedValue({
    success: true,
    companies: [
      { company_id: 1, name: 'CC Test Corp', financial_year_beginning_from: '2026-04-01' },
    ],
  });
  window.api.fy.getAll = vi.fn().mockResolvedValue({
    success: true,
    financialYears: [{ fy_id: 1, company_id: 1, start_date: '2026-04-01', is_active: 1 }],
  });
  window.api.gstRegistration.getAll = vi.fn().mockResolvedValue({
    success: true,
    gstRegistrations: [{ gst_id: 7, state_id: 'Maharashtra', gstin: '27AAGCB1286Q1Z4' }],
  });
  (window.api as any).gstFiling = {
    getStatus: vi.fn().mockResolvedValue({ success: true, configured: true, gstSession: true }),
    fetch2A: vi.fn().mockResolvedValue({ success: true, imported: false, documents: 0 }),
    fetch2B: vi.fn().mockResolvedValue({ success: true, imported: false, documents: 0 }),
    requestOtp: vi.fn(),
    authenticate: vi.fn(),
    logout: vi.fn(),
  };
}

function wrap() {
  return render(
    <MemoryRouter>
      <CompanyProvider>
        <DownloadGstReturns />
      </CompanyProvider>
    </MemoryRouter>,
  );
}

describe('Download GST Returns screen', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupCompanyMocks();
  });

  it('shows the registration + return type confirmation', async () => {
    wrap();
    await waitFor(() =>
      expect(
        screen.getAllByText(/Maharashtra Registration \(27AAGCB1286Q1Z4\)/).length,
      ).toBeGreaterThanOrEqual(1),
    );
    // Both ITC statements selected by default.
    expect(screen.getByText('GSTR-2A, GSTR-2B')).toBeInTheDocument();
  });

  it('Configure reveals return-type checkboxes and period pickers', async () => {
    wrap();
    await waitFor(() => screen.getByText('Configure'));
    await userEvent.click(screen.getByText('Configure'));
    expect(screen.getByText('GSTR-2A')).toBeInTheDocument();
    expect(screen.getByText('GSTR-2B')).toBeInTheDocument();
    expect(screen.getByText('Done')).toBeInTheDocument();
  });

  it('blocks download and prompts config when GST portal is not configured', async () => {
    window.api.gstFiling.getStatus = vi
      .fn()
      .mockResolvedValue({ success: true, configured: false });
    wrap();
    await waitFor(() => screen.getByText('Download'));
    await userEvent.click(screen.getByText('Download'));
    await waitFor(() =>
      expect(screen.getByText(/GST portal is not configured/)).toBeInTheDocument(),
    );
  });
});
