/**
 * Tests for client/src/context/CompanyContext.tsx
 *
 * We render components inside <CompanyProvider> and assert the context
 * values through consumer hooks and rendered output.
 * window.api is fully mocked in setup.ts; individual tests override as needed.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { CompanyProvider, useCompany } from '../context/CompanyContext';

// ─── Helper: consumer component that exposes context values in the DOM ───────

function CompanyDisplay() {
  const { selectedCompany, activeFY, availableFYs } = useCompany();
  return (
    <div>
      <span data-testid="company-name">{selectedCompany?.name ?? 'none'}</span>
      <span data-testid="fy-id">{activeFY?.fy_id ?? 'none'}</span>
      <span data-testid="fy-count">{availableFYs.length}</span>
    </div>
  );
}

function renderProvider() {
  return render(
    <MemoryRouter>
      <CompanyProvider>
        <CompanyDisplay />
      </CompanyProvider>
    </MemoryRouter>
  );
}

// ─── Tests ───────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
  // Default: no companies — context renders children after async check completes
  window.api.company.getAll = vi.fn().mockResolvedValue({ success: true, companies: [] });
  window.api.fy.getAll = vi.fn().mockResolvedValue({
    success: true,
    financialYears: [{ fy_id: 1, company_id: 1, start_date: '2026-04-01', is_active: 1 }],
  });
});

describe('CompanyProvider', () => {
  it('renders children once the async startup check has resolved', async () => {
    renderProvider();
    // Children are not shown until "checked" becomes true
    await waitFor(() => expect(screen.getByTestId('company-name')).toBeInTheDocument());
  });

  it('starts with no selected company and no active FY', async () => {
    renderProvider();
    await waitFor(() => expect(screen.getByTestId('company-name')).toHaveTextContent('none'));
    expect(screen.getByTestId('fy-id')).toHaveTextContent('none');
  });

  it('auto-selects the single company when exactly one exists', async () => {
    window.api.company.getAll = vi.fn().mockResolvedValue({
      success: true,
      companies: [{ company_id: 42, name: 'Solo Corp', financial_year_beginning_from: '2026-04-01' }],
    });

    renderProvider();

    await waitFor(() =>
      expect(screen.getByTestId('company-name')).toHaveTextContent('Solo Corp')
    );
    // Financial years should have loaded as well
    expect(screen.getByTestId('fy-count')).toHaveTextContent('1');
  });

  it('does NOT auto-select when there are multiple companies', async () => {
    window.api.company.getAll = vi.fn().mockResolvedValue({
      success: true,
      companies: [
        { company_id: 1, name: 'Alpha', financial_year_beginning_from: '2026-04-01' },
        { company_id: 2, name: 'Beta',  financial_year_beginning_from: '2026-04-01' },
      ],
    });

    renderProvider();

    await waitFor(() => expect(screen.getByTestId('company-name')).toHaveTextContent('none'));
  });
});

describe('useCompany — setSelectedCompany', () => {
  function SwitcherConsumer() {
    const { setSelectedCompany, selectedCompany } = useCompany();
    return (
      <div>
        <button
          onClick={() =>
            setSelectedCompany({ company_id: 99, name: 'Chosen Co' } as any)
          }
        >
          Pick
        </button>
        <span data-testid="name">{selectedCompany?.name ?? 'none'}</span>
      </div>
    );
  }

  it('updates the selected company and loads FYs', async () => {
    render(
      <MemoryRouter>
        <CompanyProvider>
          <SwitcherConsumer />
        </CompanyProvider>
      </MemoryRouter>
    );

    await waitFor(() => expect(screen.getByText('Pick')).toBeInTheDocument());

    await act(async () => {
      screen.getByText('Pick').click();
    });

    expect(screen.getByTestId('name')).toHaveTextContent('Chosen Co');
    expect(window.api.fy.getAll).toHaveBeenCalledWith(99);
  });
});

describe('useCompany — switchFY', () => {
  function FySwitcherConsumer() {
    const { setSelectedCompany, switchFY, activeFY } = useCompany();
    const company = { company_id: 1, name: 'Corp' } as any;
    const newFY    = { fy_id: 7, company_id: 1, start_date: '2027-04-01', is_active: 0 } as any;

    return (
      <div>
        <button onClick={() => setSelectedCompany(company)}>Select</button>
        <button onClick={() => switchFY(newFY)}>Switch FY</button>
        <span data-testid="active-fy">{activeFY?.fy_id ?? 'none'}</span>
      </div>
    );
  }

  it('calls fy.setActive and updates activeFY in state', async () => {
    window.api.fy.setActive = vi.fn().mockResolvedValue({ success: true });

    render(
      <MemoryRouter>
        <CompanyProvider>
          <FySwitcherConsumer />
        </CompanyProvider>
      </MemoryRouter>
    );

    await waitFor(() => expect(screen.getByText('Select')).toBeInTheDocument());

    await act(async () => { screen.getByText('Select').click(); });
    await act(async () => { screen.getByText('Switch FY').click(); });

    expect(window.api.fy.setActive).toHaveBeenCalledWith(7, 1);
    expect(screen.getByTestId('active-fy')).toHaveTextContent('7');
  });
});

describe('useCompany — error handling', () => {
  it('handles getAll failure gracefully without crashing', async () => {
    window.api.company.getAll = vi.fn().mockRejectedValue(new Error('Network error'));

    // Should not throw
    expect(() => renderProvider()).not.toThrow();
    await waitFor(() => expect(screen.getByTestId('company-name')).toHaveTextContent('none'));
  });
});
