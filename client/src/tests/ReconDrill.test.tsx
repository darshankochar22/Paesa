import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { CompanyProvider } from '../context/CompanyContext';
import ReconReturnView from '../pages/master/statutory/gst-return/recon/ReconReturnView';

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
    gstRegistrations: [{ gst_id: 1, state_id: 'Maharashtra', gstin: '27AAGCB1286Q1Z4' }],
  });
}

const SUMMARY = {
  success: true,
  payload: {
    return_view: [
      {
        type: 'data',
        key: 'b2b',
        label: 'B2B Invoices',
        drillable: true,
        books: {
          count: 1,
          taxable: 5000,
          igst: 0,
          cgst: 450,
          sgst: 450,
          cess: 0,
          tax: 900,
          invoice: 5900,
        },
        portal: {
          count: 2,
          taxable: 6000,
          igst: 0,
          cgst: 540,
          sgst: 540,
          cess: 0,
          tax: 1080,
          invoice: 7080,
        },
        status: 'Unreconciled',
      },
    ],
    voucher_status: {
      reconciled: 1,
      unreconciled: 1,
      mismatch: 0,
      only_in_books: 0,
      only_in_portal: 1,
      uncertain: 0,
    },
    period_label: '2026-04-01 to 2027-03-31',
    return_period: null,
    periods: [
      { ym: '2026-04', period: '042026', label: 'Apr-26', fetched: true },
      { ym: '2026-05', period: '052026', label: 'May-26', fetched: false },
    ],
    has_portal: true,
    last_gst_activity: 'GSTR-2A imported',
  },
};

function wrap() {
  return render(
    <MemoryRouter initialEntries={['/master/statutory/gstr2a/reconciliation']}>
      <CompanyProvider>
        <Routes>
          <Route
            path="/master/statutory/gstr2a/reconciliation"
            element={<ReconReturnView kind="2A" />}
          />
          <Route
            path="/master/statutory/gstr2a/reconciliation/party"
            element={<div>PARTY SUMMARY</div>}
          />
        </Routes>
      </CompanyProvider>
    </MemoryRouter>,
  );
}

describe('ReconReturnView (dual books-vs-portal)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupCompanyMocks();
    (window.api.gst as any).getReconSummary = vi.fn().mockResolvedValue(SUMMARY);
  });

  it('calls getReconSummary with the kind and the scoped registration', async () => {
    wrap();
    await waitFor(() =>
      expect(window.api.gst.getReconSummary).toHaveBeenCalledWith({
        company_id: 1,
        fy_id: 1,
        kind: '2A',
        gst_registration_id: 1,
        // Whole financial year until a month is picked in the right-hand period panel.
        return_period: null,
      }),
    );
  });

  it('period panel: picking a month re-queries that return period', async () => {
    wrap();
    await waitFor(() => expect(screen.getByText('May-26')).toBeInTheDocument());
    await userEvent.click(screen.getByText('May-26'));
    await waitFor(() =>
      expect(window.api.gst.getReconSummary).toHaveBeenLastCalledWith(
        expect.objectContaining({ return_period: '052026' }),
      ),
    );
  });

  it('renders the nested voucher-status block (Available Only on Portal)', async () => {
    wrap();
    await waitFor(() => expect(screen.getByText('Available Only on Portal')).toBeInTheDocument());
    expect(screen.getByText('Available Only in Books')).toBeInTheDocument();
    expect(screen.getByText('Mismatched')).toBeInTheDocument();
  });

  it('shows dual books + portal totals and drills to the party summary', async () => {
    wrap();
    await waitFor(() => expect(screen.getByText('B2B Invoices')).toBeInTheDocument());
    // Books total row + portal total row both present.
    expect(screen.getByText('Total (Books)')).toBeInTheDocument();
    expect(screen.getByText('Total (Portal)')).toBeInTheDocument();
    // Row click → party summary drill.
    await userEvent.click(screen.getByText('B2B Invoices'));
    await waitFor(() => expect(screen.getByText('PARTY SUMMARY')).toBeInTheDocument());
  });
});
