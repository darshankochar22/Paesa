import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import { CompanyProvider } from '../context/CompanyContext';
import CostCentreAllocLines from '../pages/transactions/components/CostCentreAllocLines';

// The voucher body must show a cost-centre split the way Tally does — the cost
// CATEGORY as a header line with each cost CENTRE + amount indented beneath it —
// not the old terse "N cost centres" caption.

const company = { company_id: 1, name: 'X', financial_year_beginning_from: '2026-04-01' };

beforeEach(() => {
  vi.clearAllMocks();
  window.api.company.getAll = vi.fn().mockResolvedValue({ success: true, companies: [company] });
  window.api.fy.getAll = vi.fn().mockResolvedValue({
    success: true,
    financialYears: [{ fy_id: 1, company_id: 1, start_date: '2026-04-01', is_active: 1 }],
  });
  (window.api.costCentre as any).getAll = vi.fn().mockResolvedValue({
    success: true,
    costCentres: [
      { cc_id: 10, name: 'Factories', cost_category_id: 5 },
      { cc_id: 11, name: 'Offices', cost_category_id: 5 },
    ],
  });
  (window.api.costCategory as any).getAll = vi.fn().mockResolvedValue({
    success: true,
    costCategories: [{ cc_cat_id: 5, name: 'Appliances' }],
  });
});

describe('CostCentreAllocLines — Tally-style split display', () => {
  it('renders the category header with indented centre names and amounts', async () => {
    const { container } = render(
      <CompanyProvider>
        <CostCentreAllocLines
          costCentres={[
            { cost_centre_id: 10, amount: 90, cost_category_id: 5 },
            { cost_centre_id: 11, amount: 10, cost_category_id: 5 },
          ]}
          dcType="Dr"
        />
      </CompanyProvider>,
    );

    await waitFor(() => {
      const text = container.textContent || '';
      expect(text).toContain('Appliances'); // category header
      expect(text).toContain('Factories'); // centre name
      expect(text).toContain('90.00 Dr'); // centre amount + Dr/Cr
      expect(text).toContain('Offices');
      expect(text).toContain('10.00 Dr');
    });

    // The old terse caption must be gone.
    expect(container.textContent).not.toMatch(/cost centres?$/);
  });

  it('renders nothing when there is no split', () => {
    const { container } = render(
      <CompanyProvider>
        <CostCentreAllocLines costCentres={undefined} dcType="Dr" />
      </CompanyProvider>,
    );
    expect(container.textContent).toBe('');
  });
});
