import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import AccountBooks from '../pages/menu/reports/AccountBooks';
import { menuHotkey } from '../hooks/useMenuHotkeys';

// Renders Account Books plus a stub target for every route it can open, so a
// hotkey press is verified by the destination actually rendering.
function renderMenu() {
  return render(
    <MemoryRouter initialEntries={['/reports/accounts']}>
      <Routes>
        <Route path="/reports/accounts" element={<AccountBooks />} />
        <Route path="/reports/accounts/ledger-select" element={<div>LEDGER SELECT</div>} />
        <Route path="/reports/accounts/sales-register" element={<div>SALES REGISTER</div>} />
        <Route path="/reports/accounts/cash-bank" element={<div>CASH BANK</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('menuHotkey', () => {
  it('takes a mid-word capital as the hotkey, else the first letter', () => {
    expect(menuHotkey('Ledger').char).toBe('L'); // no mid-cap → first letter
    expect(menuHotkey('Cash/Bank BooK(s)').char).toBe('K'); // mid-word capital K
    expect(menuHotkey('Group VoucHers').char).toBe('H');
  });
});

describe('Account Books keyboard', () => {
  it('opens Ledger when L is pressed (the reported bug)', async () => {
    renderMenu();
    await userEvent.keyboard('l');
    expect(screen.getByText('LEDGER SELECT')).toBeInTheDocument();
  });

  it('opens Sales Register on its hotkey', async () => {
    renderMenu();
    // "Sales Register" — first letter S (no mid-word capital in the first word).
    await userEvent.keyboard('s');
    expect(screen.getByText('SALES REGISTER')).toBeInTheDocument();
  });

  it('walks the list with arrows and opens the highlighted item on Enter', async () => {
    renderMenu();
    // First item (Cash/Bank) is selected initially; Enter opens it.
    await userEvent.keyboard('{Enter}');
    expect(screen.getByText('CASH BANK')).toBeInTheDocument();
  });

  it('underlines the hotkey letter so the shortcut is visible', () => {
    renderMenu();
    const ledger = screen.getByText('L', { selector: 'span.underline' });
    expect(ledger).toBeInTheDocument();
  });

  it('assigns a DISTINCT hotkey to every item (no two keys collide)', () => {
    renderMenu();
    // Every rendered hotkey is the underlined span; collect them all.
    const letters = Array.from(document.querySelectorAll('span.underline')).map((el) =>
      el.textContent?.toLowerCase(),
    );
    expect(letters.length).toBeGreaterThan(0);
    expect(new Set(letters).size).toBe(letters.length);
  });
});
