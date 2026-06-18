import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { CompanyProvider } from '../context/CompanyContext';
import GSTR1Reconciliation from '../pages/master/statutory/gst-return/GSTR1-Reconcilation';
import GSTR2BReconciliation from '../pages/master/statutory/gst-return/GSTR2BReconciliation';
import IMSInwardSupplies from '../pages/master/statutory/gst-return/IMSInwardSupplies';
import ChallanReconciliation from '../pages/master/statutory/gst-return/ChallanReconciliation';

const mockCompany = {
  company_id: 1,
  name: 'CC Test Corp',
  financial_year_beginning_from: '2026-04-01',
};

function setupCompanyMocks() {
  window.api.company.getAll = vi.fn().mockResolvedValue({
    success: true,
    companies: [mockCompany],
  });
  window.api.fy.getAll = vi.fn().mockResolvedValue({
    success: true,
    financialYears: [{ fy_id: 1, company_id: 1, start_date: '2026-04-01', is_active: 1 }],
  });
}

function wrap(Component: React.ComponentType) {
  return render(
    <MemoryRouter>
      <CompanyProvider>
        <Component />
      </CompanyProvider>
    </MemoryRouter>
  );
}

// ─── GSTR-1 Reconciliation ───────────────────────────────────────────────────

describe('GSTR-1 Reconciliation Report', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupCompanyMocks();
    window.api.gst.getGSTR1Reconciliation = vi.fn().mockResolvedValue({
      success: true,
      payload: {
        return_view: {
          b2b: {
            vch_count: 5, taxable_amount: 50000, igst: 9000,
            cgst: 0, sgst: 0, cess: 0, tax_amount: 9000,
            invoice_amount: 59000, status: 'Reconciled',
          },
        },
        voucher_status: { reconciled: 5, unreconciled: 0, uncertain: 0 },
        period_label: '2026-04-01 to 2027-03-31',
      },
    });
  });

  it('renders the page title', async () => {
    wrap(GSTR1Reconciliation);
    await waitFor(() => expect(screen.getByText('GSTR-1 Reconciliation')).toBeInTheDocument(), { timeout: 3000 });
  });

  it('calls the reconciliation API with company and FY ids', async () => {
    wrap(GSTR1Reconciliation);
    await waitFor(() => {
      expect(window.api.gst.getGSTR1Reconciliation).toHaveBeenCalledWith({ company_id: 1, fy_id: 1 });
    }, { timeout: 3000 });
  });

  it('shows B2B invoices row after data loads', async () => {
    wrap(GSTR1Reconciliation);
    await waitFor(() => {
      expect(window.api.gst.getGSTR1Reconciliation).toHaveBeenCalled();
    }, { timeout: 3000 });
    await waitFor(() => {
      expect(screen.getByText('B2B Invoices - 4A, 4B, 4C, 6B, 6C')).toBeInTheDocument();
      expect(screen.getByText('59,000.00')).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  it('handles API errors gracefully', async () => {
    window.api.gst.getGSTR1Reconciliation = vi.fn().mockResolvedValue({
      success: false,
      error: 'GSTR-1 data unavailable',
    });
    wrap(GSTR1Reconciliation);
    await waitFor(() => {
      expect(screen.getByText('GSTR-1 data unavailable')).toBeInTheDocument();
    }, { timeout: 3000 });
  });
});

// ─── GSTR-2B Reconciliation ──────────────────────────────────────────────────

describe('GSTR-2B Reconciliation Report', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupCompanyMocks();
    window.api.gst.getGSTR2BReconciliation = vi.fn().mockResolvedValue({
      success: true,
      payload: {
        return_view: {
          itc_available_other: {
            vch_count: 10, taxable_amount: 100000, igst: 18000,
            cgst: 0, sgst: 0, cess: 0, tax_amount: 18000,
            invoice_amount: 118000, status: 'Reconciled',
          },
        },
        voucher_status: { reconciled: 10, unreconciled: 0, uncertain: 0 },
        period_label: '2026-04-01 to 2027-03-31',
      },
    });
  });

  it('renders the page title', async () => {
    wrap(GSTR2BReconciliation);
    await waitFor(() => expect(screen.getByText('GSTR-2B Reconciliation')).toBeInTheDocument(), { timeout: 3000 });
  });

  it('calls the reconciliation API with company and FY ids', async () => {
    wrap(GSTR2BReconciliation);
    await waitFor(() => {
      expect(window.api.gst.getGSTR2BReconciliation).toHaveBeenCalledWith({ company_id: 1, fy_id: 1 });
    }, { timeout: 3000 });
  });

  it('shows ITC section heading after data loads', async () => {
    wrap(GSTR2BReconciliation);
    await waitFor(() => {
      expect(window.api.gst.getGSTR2BReconciliation).toHaveBeenCalled();
    }, { timeout: 3000 });
    await waitFor(() => {
      // The "Return View" section header is rendered once !loading
      expect(screen.getByText('Reconciled')).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  it('handles API errors gracefully', async () => {
    window.api.gst.getGSTR2BReconciliation = vi.fn().mockResolvedValue({
      success: false,
      error: 'GSTR-2B data unavailable',
    });
    wrap(GSTR2BReconciliation);
    await waitFor(() => {
      expect(screen.getByText('GSTR-2B data unavailable')).toBeInTheDocument();
    }, { timeout: 3000 });
  });
});

// ─── IMS Inward Supplies ─────────────────────────────────────────────────────

describe('IMS Inward Supplies Report', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupCompanyMocks();
    window.api.gst.getIMSInwardSupplies = vi.fn().mockResolvedValue({
      success: true,
      payload: {
        return_view: {
          b2b: {
            vch_count: 3, taxable_amount: 30000, igst: 5400,
            cgst: 0, sgst: 0, cess: 0, tax_amount: 5400, invoice_amount: 35400,
          },
        },
        voucher_status: {
          total_vouchers: 3,
          filed: { total: 3, action_required: 1, ready_for_upload: 1, uploaded: 1 },
          yet_filed: { total: 0, action_required: 0, ready_for_upload: 0, uploaded: 0 },
        },
        period_label: '2026-04-01 to 2027-03-31',
      },
    });
  });

  it('renders the page title', async () => {
    wrap(IMSInwardSupplies);
    await waitFor(() => expect(screen.getByText('IMS Inward Supplies')).toBeInTheDocument(), { timeout: 3000 });
  });

  it('calls the IMS API with company and FY ids', async () => {
    wrap(IMSInwardSupplies);
    await waitFor(() => {
      expect(window.api.gst.getIMSInwardSupplies).toHaveBeenCalledWith({ company_id: 1, fy_id: 1 });
    }, { timeout: 3000 });
  });

  it('shows voucher status summary after data loads', async () => {
    wrap(IMSInwardSupplies);
    await waitFor(() => {
      expect(window.api.gst.getIMSInwardSupplies).toHaveBeenCalled();
    }, { timeout: 3000 });
    await waitFor(() => {
      expect(screen.getByText('Invoices Filed by Supplier')).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  it('calls API again when Refresh is clicked', async () => {
    const user = userEvent.setup();
    wrap(IMSInwardSupplies);
    await waitFor(() => {
      expect(screen.getByText('F5: Refresh')).toBeInTheDocument();
    }, { timeout: 3000 });
    vi.clearAllMocks();
    setupCompanyMocks();
    window.api.gst.getIMSInwardSupplies = vi.fn().mockResolvedValue({ success: true, payload: {} });
    await user.click(screen.getByText('F5: Refresh'));
    expect(window.api.gst.getIMSInwardSupplies).toHaveBeenCalledTimes(1);
  });
});

// ─── Challan Reconciliation ──────────────────────────────────────────────────

describe('GST Challan Reconciliation Report', () => {
  const challanRow = {
    date: '2026-05-10', particulars: 'GST Tax Payment', vch_type: 'Payment',
    vch_no: 'PMT-1', type_of_tax_payment: 'GST', payment_period_from: '2026-04-01',
    payment_period_to: '2026-04-30', type_of_payment: 'Tax Payment',
    mode_of_payment: 'e-Payment', bank_name: 'State Bank of India',
    cpin: 'CPIN-10001', cin: 'CIN-10001', brn_utr: 'UTR-10001',
    instrument_number: 'INS-10001', instrument_date: '2026-05-10',
    payment_date: '2026-05-10', amount: 25000,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    setupCompanyMocks();
    window.api.gst.getChallanReconciliation = vi.fn().mockResolvedValue({
      success: true,
      payload: { challans: [challanRow], period_label: 'For May-26' },
    });
  });

  it('renders the page title and column headers', async () => {
    wrap(ChallanReconciliation);
    await waitFor(() => {
      expect(screen.getByText('GST Challan Reconciliation')).toBeInTheDocument();
    }, { timeout: 3000 });
    await waitFor(() => {
      expect(screen.getByText('Date')).toBeInTheDocument();
      expect(screen.getByText('Vch Type')).toBeInTheDocument();
      expect(screen.getByText('Vch No.')).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  it('calls the Challan API with company and FY ids', async () => {
    wrap(ChallanReconciliation);
    await waitFor(() => {
      expect(window.api.gst.getChallanReconciliation).toHaveBeenCalledWith({ company_id: 1, fy_id: 1 });
    }, { timeout: 3000 });
  });

  it('shows empty state when no challans exist', async () => {
    window.api.gst.getChallanReconciliation = vi.fn().mockResolvedValue({
      success: true,
      payload: { challans: [], period_label: '' },
    });
    wrap(ChallanReconciliation);
    await waitFor(() => {
      expect(window.api.gst.getChallanReconciliation).toHaveBeenCalled();
    }, { timeout: 3000 });
    await waitFor(() => {
      expect(screen.getByText('No Challan payments found for this Financial Year.')).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  it('handles API errors gracefully', async () => {
    window.api.gst.getChallanReconciliation = vi.fn().mockResolvedValue({
      success: false,
      error: 'Challan data unavailable',
    });
    wrap(ChallanReconciliation);
    await waitFor(() => {
      expect(screen.getByText('Challan data unavailable')).toBeInTheDocument();
    }, { timeout: 3000 });
  });
});
