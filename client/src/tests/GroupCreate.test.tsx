/**
 * Tests for client/src/pages/master/group/GroupCreate.tsx
 *
 * This component:
 *  - Loads all groups from window.api.group.getAll on mount
 *  - Has a controlled "Name" text input
 *  - Validates that Name is required before submitting
 *  - Calls window.api.group.create with the correct payload on submit
 *  - Shows a success banner and clears the Name field after creation
 *  - Shows an error banner when the API returns failure
 *  - Has a toggle panel for selecting a parent group ("Under")
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { CompanyProvider } from '../context/CompanyContext';
import GroupCreate from '../pages/master/group/GroupCreate';

// ─── Sample data ─────────────────────────────────────────────────────────────

const capitalGroup = {
  group_id: 10,
  company_id: 1,
  name: 'Capital Account',
  nature: 'Liabilities',
  parent_group_id: null,
  is_primary: 1,
};

const selectedCompany = {
  company_id: 1,
  name: 'Test Corp',
  financial_year_beginning_from: '2026-04-01',
};

// ─── Render helper ────────────────────────────────────────────────────────────

function renderGroupCreate() {
  return render(
    <MemoryRouter>
      <CompanyProvider>
        <GroupCreate />
      </CompanyProvider>
    </MemoryRouter>
  );
}

// ─── Setup ───────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();

  // Auto-select the test company so GroupCreate renders (not the selector)
  window.api.company.getAll = vi.fn().mockResolvedValue({
    success: true,
    companies: [selectedCompany],
  });
  window.api.fy.getAll = vi.fn().mockResolvedValue({
    success: true,
    financialYears: [{ fy_id: 1, company_id: 1, start_date: '2026-04-01', is_active: 1 }],
  });
  window.api.group.getAll = vi.fn().mockResolvedValue({
    success: true,
    groups: [capitalGroup],
  });
  window.api.group.create = vi.fn().mockResolvedValue({
    success: true,
    group: { group_id: 99, company_id: 1, name: 'My New Group' },
  });
});

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('GroupCreate — initial render', () => {
  it('renders the "Create Group" heading', async () => {
    renderGroupCreate();
    await waitFor(() =>
      expect(screen.getByText('Create Group')).toBeInTheDocument()
    );
  });

  it('renders the Name input field', async () => {
    renderGroupCreate();
    await waitFor(() =>
      expect(screen.getAllByPlaceholderText('')[0]).toBeInTheDocument()
    );
  });

  it('renders the Create submit button', async () => {
    renderGroupCreate();
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /create/i })).toBeInTheDocument()
    );
  });

  it('calls group.getAll with the company id on mount', async () => {
    renderGroupCreate();
    await waitFor(() =>
      expect(window.api.group.getAll).toHaveBeenCalledWith(1)
    );
  });
});

describe('GroupCreate — validation', () => {
  it('shows "Name is required" error when submitted with an empty name', async () => {
    const user = userEvent.setup();
    renderGroupCreate();

    await waitFor(() =>
      expect(screen.getByRole('button', { name: /create/i })).toBeInTheDocument()
    );

    await user.click(screen.getByRole('button', { name: /create/i }));

    await waitFor(() =>
      expect(screen.getByText('Name is required.')).toBeInTheDocument()
    );
  });

  it('does NOT call group.create when validation fails', async () => {
    const user = userEvent.setup();
    renderGroupCreate();

    await waitFor(() =>
      expect(screen.getByRole('button', { name: /create/i })).toBeInTheDocument()
    );

    await user.click(screen.getByRole('button', { name: /create/i }));

    expect(window.api.group.create).not.toHaveBeenCalled();
  });
});

describe('GroupCreate — successful submission', () => {
  it('calls group.create with the correct payload', async () => {
    const user = userEvent.setup();
    renderGroupCreate();

    await waitFor(() =>
      expect(screen.getByRole('button', { name: /create/i })).toBeInTheDocument()
    );

    // Type a name
    const inputs = screen.getAllByRole('textbox');
    // First textbox is the Name field (autoFocus)
    await user.type(inputs[0], 'My New Group');

    await user.click(screen.getByRole('button', { name: /create/i }));

    await waitFor(() =>
      expect(window.api.group.create).toHaveBeenCalledTimes(1)
    );

    const call = (window.api.group.create as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(call.name).toBe('My New Group');
    expect(call.company_id).toBe(1);
  });

  it('shows a success banner with the group name after creation', async () => {
    const user = userEvent.setup();
    renderGroupCreate();

    await waitFor(() =>
      expect(screen.getByRole('button', { name: /create/i })).toBeInTheDocument()
    );

    const inputs = screen.getAllByRole('textbox');
    await user.type(inputs[0], 'My New Group');
    await user.click(screen.getByRole('button', { name: /create/i }));

    await waitFor(() =>
      expect(screen.getByText(/Group "My New Group" created/i)).toBeInTheDocument()
    );
  });

  it('clears the Name field after a successful creation', async () => {
    const user = userEvent.setup();
    renderGroupCreate();

    await waitFor(() =>
      expect(screen.getByRole('button', { name: /create/i })).toBeInTheDocument()
    );

    const inputs = screen.getAllByRole('textbox');
    await user.type(inputs[0], 'My New Group');
    await user.click(screen.getByRole('button', { name: /create/i }));

    await waitFor(() =>
      expect(screen.getByText(/Group "My New Group" created/i)).toBeInTheDocument()
    );
    // Name field should be reset to empty
    expect(inputs[0]).toHaveValue('');
  });
});

describe('GroupCreate — API failure', () => {
  it('shows the API error message in the error banner', async () => {
    window.api.group.create = vi.fn().mockResolvedValue({
      success: false,
      error: 'Group already exists',
    });

    const user = userEvent.setup();
    renderGroupCreate();

    await waitFor(() =>
      expect(screen.getByRole('button', { name: /create/i })).toBeInTheDocument()
    );

    const inputs = screen.getAllByRole('textbox');
    await user.type(inputs[0], 'Duplicate Group');
    await user.click(screen.getByRole('button', { name: /create/i }));

    await waitFor(() =>
      expect(screen.getByText('Group already exists')).toBeInTheDocument()
    );
  });

  it('shows error when window.api.group.create throws unexpectedly', async () => {
    window.api.group.create = vi.fn().mockRejectedValue(new Error('Server crashed'));

    const user = userEvent.setup();
    renderGroupCreate();

    await waitFor(() =>
      expect(screen.getByRole('button', { name: /create/i })).toBeInTheDocument()
    );

    const inputs = screen.getAllByRole('textbox');
    await user.type(inputs[0], 'ErrorGroup');
    await user.click(screen.getByRole('button', { name: /create/i }));

    await waitFor(() =>
      expect(screen.getByText('Server crashed')).toBeInTheDocument()
    );
  });

  it('dismiss button removes the error banner', async () => {
    window.api.group.create = vi.fn().mockResolvedValue({
      success: false,
      error: 'Something went wrong',
    });

    const user = userEvent.setup();
    renderGroupCreate();

    await waitFor(() =>
      expect(screen.getByRole('button', { name: /create/i })).toBeInTheDocument()
    );

    const inputs = screen.getAllByRole('textbox');
    await user.type(inputs[0], 'Bad Group');
    await user.click(screen.getByRole('button', { name: /create/i }));

    await waitFor(() =>
      expect(screen.getByText('Something went wrong')).toBeInTheDocument()
    );

    await user.click(screen.getByRole('button', { name: /dismiss/i }));

    await waitFor(() =>
      expect(screen.queryByText('Something went wrong')).not.toBeInTheDocument()
    );
  });
});

describe('GroupCreate — Under / parent group panel', () => {
  it('shows the parent group selector panel when Under row is clicked', async () => {
    const user = userEvent.setup();
    renderGroupCreate();

    await waitFor(() => expect(screen.getByText('Under')).toBeInTheDocument());

    await user.click(screen.getByText('Under'));

    await waitFor(() =>
      expect(screen.getByText('Under Group')).toBeInTheDocument()
    );
  });

  it('defaults the Under field to "Capital Account" (loaded from API)', async () => {
    renderGroupCreate();

    await waitFor(() =>
      expect(screen.getByText('Capital Account')).toBeInTheDocument()
    );
  });
});
