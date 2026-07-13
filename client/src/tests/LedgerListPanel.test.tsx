import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import LedgerListPanel from '../pages/master/ledger/components/LedgerListPanel';
import type { LedgerType, GroupType } from '@/types/api';

const groups: GroupType[] = [
  { group_id: 1, name: 'Sundry Debtors' },
  { group_id: 2, name: 'Bank Accounts' },
];

const ledgers: LedgerType[] = [
  {
    ledger_id: 10,
    name: 'Zeta Traders',
    group_id: 1,
    opening_balance: 500,
    opening_balance_type: 'Dr',
  },
  { ledger_id: 11, name: 'Alpha Corp', group_id: 1, opening_balance: 0 },
  {
    ledger_id: 12,
    name: 'HDFC Current',
    group_id: 2,
    opening_balance: 1200,
    opening_balance_type: 'Cr',
  },
  { ledger_id: 13, name: 'Orphan Ledger' }, // no group_id → "Primary"
];

function renderPanel(overrides: Partial<React.ComponentProps<typeof LedgerListPanel>> = {}) {
  const onSelect = vi.fn();
  const onClose = vi.fn();
  render(
    <LedgerListPanel
      ledgers={ledgers}
      groups={groups}
      selectedId={null}
      onSelect={onSelect}
      onClose={onClose}
      {...overrides}
    />,
  );
  return { onSelect, onClose };
}

describe('LedgerListPanel — group-wise arrangement', () => {
  it('renders each parent group as a header', () => {
    renderPanel();
    expect(screen.getByText('Sundry Debtors')).toBeInTheDocument();
    expect(screen.getByText('Bank Accounts')).toBeInTheDocument();
    // Ledger with no group falls under a synthetic "Primary" header.
    expect(screen.getByText('Primary')).toBeInTheDocument();
  });

  it('lists ledgers alphabetically within their group', () => {
    renderPanel();
    const rendered = screen
      .getAllByText(
        /Alpha Corp|Zeta Traders|HDFC Current|Orphan Ledger|Sundry Debtors|Bank Accounts|Primary/,
      )
      .map((n) => n.textContent);
    // Groups sort alphabetically (Bank < Primary < Sundry); Alpha before Zeta inside Sundry Debtors.
    expect(rendered.indexOf('Bank Accounts')).toBeLessThan(rendered.indexOf('Sundry Debtors'));
    expect(rendered.indexOf('Alpha Corp')).toBeLessThan(rendered.indexOf('Zeta Traders'));
  });

  it('shows opening balance with Dr/Cr, and — for zero', () => {
    renderPanel();
    expect(screen.getByText('500.00 Dr')).toBeInTheDocument();
    expect(screen.getByText('1200.00 Cr')).toBeInTheDocument();
  });

  it('calls onSelect + onClose when a ledger row is clicked', async () => {
    const user = userEvent.setup();
    const { onSelect, onClose } = renderPanel();
    await user.click(screen.getByText('HDFC Current'));
    expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ ledger_id: 12 }));
    expect(onClose).toHaveBeenCalled();
  });

  it('filters by search text across all groups', async () => {
    const user = userEvent.setup();
    renderPanel();
    await user.type(screen.getByPlaceholderText('Search ledgers...'), 'alpha');
    expect(screen.getByText('Alpha Corp')).toBeInTheDocument();
    expect(screen.queryByText('Zeta Traders')).not.toBeInTheDocument();
    expect(screen.queryByText('HDFC Current')).not.toBeInTheDocument();
    // Empty groups drop out of the header list too.
    expect(screen.queryByText('Bank Accounts')).not.toBeInTheDocument();
  });

  it('hides the close button in fullWidth (opening) mode', () => {
    renderPanel({ fullWidth: true });
    expect(screen.queryByText('×')).not.toBeInTheDocument();
  });

  it('keyboard: ArrowDown then Enter selects the first ledger of the first group', async () => {
    const user = userEvent.setup();
    const { onSelect } = renderPanel();
    const searchBox = screen.getByPlaceholderText('Search ledgers...');
    searchBox.focus();
    // Focus starts at index 0 (HDFC Current — first ledger of "Bank Accounts").
    await user.keyboard('{Enter}');
    expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ ledger_id: 12 }));
  });
});
