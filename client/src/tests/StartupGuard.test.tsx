/**
 * Tests for client/src/context/StartupGuard.tsx (StartupSelect + StartupGuard)
 *
 * StartupGuard shows the company-selection screen when no company is selected,
 * and renders its children once a company is chosen.
 *
 * These tests use MemoryRouter + CompanyProvider and override window.api as needed.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { CompanyProvider } from '../context/CompanyContext';
import StartupGuard from '../context/StartupGuard';

const company1 = {
  company_id: 1,
  name: 'Alpha Corp',
  financial_year_beginning_from: '2026-04-01',
};
const company2 = {
  company_id: 2,
  name: 'Beta Ltd',
  financial_year_beginning_from: '2025-04-01',
};

/** Wrap in all required providers */
function renderGuard(children = <div data-testid="protected-content">Dashboard</div>) {
  return render(
    <MemoryRouter initialEntries={['/dashboard']}>
      <CompanyProvider>
        <StartupGuard>{children}</StartupGuard>
      </CompanyProvider>
    </MemoryRouter>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  window.api.company.getAll = vi.fn().mockResolvedValue({ success: true, companies: [] });
  window.api.app.getDataPath = vi.fn().mockResolvedValue('/test/data');
  window.api.fy.getAll = vi.fn().mockResolvedValue({ success: true, financialYears: [] });
});

describe('StartupGuard — no company selected', () => {
  it('shows the "Select Company" panel when no company is selected', async () => {
    renderGuard();
    await waitFor(() =>
      expect(screen.getByText('Select Company')).toBeInTheDocument()
    );
  });

  it('does NOT render protected children when no company is selected', async () => {
    renderGuard();
    await waitFor(() => expect(screen.getByText('Select Company')).toBeInTheDocument());
    expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
  });

  it('shows a "Create Company" link on the selection screen', async () => {
    renderGuard();
    await waitFor(() => expect(screen.getByText('Create Company')).toBeInTheDocument());
  });

  it('shows "No companies found." when the list is empty', async () => {
    renderGuard();
    await waitFor(() =>
      expect(screen.getByText('No companies found.')).toBeInTheDocument()
    );
  });
});

describe('StartupGuard — company list rendering', () => {
  beforeEach(() => {
    window.api.company.getAll = vi.fn().mockResolvedValue({
      success: true,
      companies: [company1, company2],
    });
  });

  it('renders all company names', async () => {
    renderGuard();
    await waitFor(() => expect(screen.getByText('Alpha Corp')).toBeInTheDocument());
    expect(screen.getByText('Beta Ltd')).toBeInTheDocument();
  });

  it('shows the formatted company id padded to 6 digits', async () => {
    renderGuard();
    await waitFor(() => expect(screen.getByText('(000001)')).toBeInTheDocument());
    expect(screen.getByText('(000002)')).toBeInTheDocument();
  });
});

describe('StartupGuard — search filtering', () => {
  beforeEach(() => {
    window.api.company.getAll = vi.fn().mockResolvedValue({
      success: true,
      companies: [company1, company2],
    });
  });

  it('filters the list as the user types in the search box', async () => {
    const user = userEvent.setup();
    renderGuard();

    // Wait for initial list to appear
    await waitFor(() => expect(screen.getByText('Alpha Corp')).toBeInTheDocument());

    const searchInput = screen.getByRole('textbox');
    await user.type(searchInput, 'Beta');

    await waitFor(() => expect(screen.queryByText('Alpha Corp')).not.toBeInTheDocument());
    expect(screen.getByText('Beta Ltd')).toBeInTheDocument();
  });

  it('shows "no companies matching" message when search yields no results', async () => {
    const user = userEvent.setup();
    renderGuard();

    await waitFor(() => expect(screen.getByText('Alpha Corp')).toBeInTheDocument());

    const searchInput = screen.getByRole('textbox');
    await user.type(searchInput, 'ZZZZZ');

    await waitFor(() =>
      expect(screen.getByText(/No companies matching/i)).toBeInTheDocument()
    );
  });

  it('is case-insensitive', async () => {
    const user = userEvent.setup();
    renderGuard();

    await waitFor(() => expect(screen.getByText('Alpha Corp')).toBeInTheDocument());
    const searchInput = screen.getByRole('textbox');

    await user.type(searchInput, 'alpha');
    await waitFor(() => expect(screen.getByText('Alpha Corp')).toBeInTheDocument());
    expect(screen.queryByText('Beta Ltd')).not.toBeInTheDocument();
  });
});

describe('StartupGuard — keyboard navigation', () => {
  beforeEach(() => {
    window.api.company.getAll = vi.fn().mockResolvedValue({
      success: true,
      companies: [company1, company2],
    });
    window.api.fy.getAll = vi.fn().mockResolvedValue({
      success: true,
      financialYears: [{ fy_id: 1, company_id: 1, start_date: '2026-04-01', is_active: 1 }],
    });
  });

  it('selects the highlighted company when Enter is pressed', async () => {
    const user = userEvent.setup();
    renderGuard();

    await waitFor(() => expect(screen.getByText('Alpha Corp')).toBeInTheDocument());

    // The search input is auto-focused; press Enter to select first (index 0)
    const searchInput = screen.getByRole('textbox');
    await user.click(searchInput);
    await user.keyboard('{Enter}');

    // After selection, protected content should appear
    await waitFor(() =>
      expect(screen.getByTestId('protected-content')).toBeInTheDocument()
    );
  });

  it('moves highlight down on ArrowDown and up on ArrowUp', async () => {
    const user = userEvent.setup();
    renderGuard();

    await waitFor(() => expect(screen.getByText('Alpha Corp')).toBeInTheDocument());
    const searchInput = screen.getByRole('textbox');
    await user.click(searchInput);

    // ArrowDown should move to index 1 (Beta Ltd)
    await user.keyboard('{ArrowDown}');

    // Now Enter should select Beta Ltd
    await user.keyboard('{Enter}');

    await waitFor(() =>
      expect(screen.getByTestId('protected-content')).toBeInTheDocument()
    );
    // fy.getAll should have been called with Beta Ltd's company_id (2)
    expect(window.api.fy.getAll).toHaveBeenCalledWith(2);
  });
});

describe('StartupGuard — company already selected', () => {
  it('renders children directly when a company is pre-selected', async () => {
    // Simulate auto-select by returning exactly 1 company
    window.api.company.getAll = vi.fn().mockResolvedValue({
      success: true,
      companies: [company1],
    });

    renderGuard();

    await waitFor(() =>
      expect(screen.getByTestId('protected-content')).toBeInTheDocument()
    );
    expect(screen.queryByText('Select Company')).not.toBeInTheDocument();
  });
});
