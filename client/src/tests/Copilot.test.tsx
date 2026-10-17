import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route, type InitialEntry } from 'react-router-dom';
import { CompanyProvider } from '../context/CompanyContext';
import Copilot from '../pages/utilities/Copilot';

const PROPOSAL = {
  action: 'create_voucher',
  channel: 'automation:createVoucher',
  args: { voucher_type: 'Receipt', date: '2026-04-10' },
  summary: 'Receipt of ₹1,000.00 on 2026-04-10',
  note: 'Receipt from Alpha',
  preview: [
    { label: 'Dr Cash', value: '₹1,000.00' },
    { label: 'Cr Alpha Traders', value: '₹1,000.00' },
  ],
  requiresApproval: true,
};

function renderCopilot(entry: InitialEntry = '/utilities/copilot') {
  return render(
    <MemoryRouter initialEntries={[entry]}>
      <CompanyProvider>
        <Routes>
          <Route path="/utilities/copilot" element={<Copilot />} />
          <Route path="/transactions/voucher/:id" element={<div>VOUCHER VIEW</div>} />
        </Routes>
      </CompanyProvider>
    </MemoryRouter>,
  );
}

const answerWith = (res: Record<string, unknown>) => {
  window.api.ai.ask = vi.fn().mockResolvedValue({ success: true, proposals: [], ...res });
};

// Switch to the chat view and send a prompt from the composer.
async function sendPrompt(prompt = 'Draft a receipt') {
  await userEvent.click(await screen.findByRole('button', { name: 'Chat' }));
  const input = screen.getByRole('textbox');
  await waitFor(() => expect(input).not.toBeDisabled()); // AI status loaded
  await userEvent.type(input, `${prompt}{Enter}`);
}

describe('Copilot', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.api.ai.getKeyStatus = vi.fn().mockResolvedValue({
      hasKey: true,
      baseUrl: 'https://llm.example/v1',
      model: 'test-model',
      masked: 'test...',
    });
  });

  it('shows the answer to a prompt sent from a report in the chat view (F8)', async () => {
    answerWith({ text: 'The trial balance agrees.' });
    renderCopilot({
      pathname: '/utilities/copilot',
      state: { initialPrompt: 'Explain this report' },
    });

    expect(await screen.findByText('The trial balance agrees.')).toBeInTheDocument();
    expect(window.api.ai.ask).toHaveBeenCalledWith(
      expect.objectContaining({ prompt: 'Explain this report' }),
    );
  });

  it('renders the server-built preview of a proposal', async () => {
    answerWith({ text: 'Here is the draft.', proposals: [PROPOSAL] });
    renderCopilot();
    await sendPrompt();

    expect(await screen.findByText('Dr Cash')).toBeInTheDocument();
    expect(screen.getByText('Cr Alpha Traders')).toBeInTheDocument();
    expect(screen.getAllByText('₹1,000.00')).toHaveLength(2);
    expect(screen.getByText(PROPOSAL.summary)).toBeInTheDocument();
    expect(screen.getByText('Receipt from Alpha')).toBeInTheDocument();
  });

  it('runs an approval once, even on a double click (F7)', async () => {
    let finish: (v: unknown) => void = () => {};
    window.api.automation.createVoucher = vi.fn(
      () => new Promise((resolve) => (finish = resolve)),
    ) as any;
    answerWith({ text: 'Here is the draft.', proposals: [PROPOSAL] });
    renderCopilot();
    await sendPrompt();

    await userEvent.dblClick(await screen.findByRole('button', { name: 'Approve' }));
    expect(window.api.automation.createVoucher).toHaveBeenCalledTimes(1);
    expect(window.api.automation.createVoucher).toHaveBeenCalledWith(PROPOSAL.args);
    expect(screen.getByRole('button', { name: 'Running...' })).toBeDisabled();

    finish({ success: true, voucher_id: 9, voucher_number: 'RCT-9' });
    expect(await screen.findByText(`Done: ${PROPOSAL.summary}`)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Approve' })).not.toBeInTheDocument();
  });

  it('shows why an approval failed', async () => {
    window.api.automation.createVoucher = vi.fn().mockResolvedValue({
      success: false,
      errors: ['Debit and Credit amounts must be equal'],
    });
    answerWith({ text: 'Here is the draft.', proposals: [PROPOSAL] });
    renderCopilot();
    await sendPrompt();

    await userEvent.click(await screen.findByRole('button', { name: 'Approve' }));
    expect(
      await screen.findByText('Failed: Debit and Credit amounts must be equal'),
    ).toBeInTheDocument();
  });

  it('lists the tools behind an answer and marks the ones that failed', async () => {
    answerWith({
      text: 'Cash is ₹2,000.',
      toolTrace: [
        { tool: 'lookup', input: { kind: 'ledger', query: 'Cash' }, ok: true, ms: 3 },
        { tool: 'query', input: { resource: 'ledger_balance', ledger_id: 1 }, ok: true, ms: 5 },
        { tool: 'query', input: { resource: 'cash_book' }, ok: false, error: 'boom', ms: 2 },
      ],
    });
    renderCopilot();
    await sendPrompt('What is my cash balance?');

    expect(
      await screen.findByText('Sources: lookup ledger, ledger_balance, cash_book (failed)'),
    ).toBeInTheDocument();
  });

  it('opens legacy drill links in the app and never lets a link leave it (F4)', async () => {
    answerWith({ text: 'See [Vch 12](/vouchers/12) or [the web](https://example.com).' });
    renderCopilot();
    await sendPrompt('Show voucher 12');

    // fireEvent returns false when the click's default action was prevented.
    expect(fireEvent.click(await screen.findByText('the web'))).toBe(false);
    await userEvent.click(screen.getByText('Vch 12'));
    expect(await screen.findByText('VOUCHER VIEW')).toBeInTheDocument();
  });
});
