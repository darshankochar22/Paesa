import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useAmountConfirmFlow } from '../pages/transactions/hooks/useAmountConfirmFlow';

// Regression: in a double-entry Payment/Receipt/Contra, a non-bank expense/income
// ledger with "Allow Cost Centres = Yes" must open the Cost Allocation popup on
// Enter. The bank block used to `proceedToNextRow` and return for any non-bank,
// non-bill-wise ledger, so the cost-centre branch below it was never reached.

function makeForm(overrides: Record<string, any> = {}) {
  return {
    // enable_cost_centres depends on maintain_accounts (see companyFeatures.ts)
    features: { maintain_accounts: 1, enable_cost_centres: 1, enable_bill_wise_entry: 0 },
    paymentEntryMode: 'double',
    receiptEntryMode: 'single',
    checkIsBank: () => false,
    checkIsParty: () => false,
    checkIsCash: () => false,
    // Matches the ledger's ancestry against the four P&L primary groups.
    checkLedgerGroup: (ledger: any, groups: string[]) =>
      !!ledger?.group_name && groups.includes(ledger.group_name),
    setActiveAllocation: vi.fn(),
    bankDetails: null,
    cashDenominations: [],
    ...overrides,
  } as any;
}

const expenseLedger = {
  ledger_id: 2676,
  name: 'rent paid',
  allow_cost_centres: 1,
  group_name: 'Indirect Expenses',
};

function run(form: any) {
  const proceedToNextRow = vi.fn();
  const { result } = renderHook(() =>
    useAmountConfirmFlow(form, 'Payment', { proceedToNextRow, setInventoryAlloc: vi.fn() }),
  );
  return { proceedToNextRow, handleAmountConfirm: result.current.handleAmountConfirm };
}

describe('Cost Allocation trigger — double-entry Payment', () => {
  it('opens the cost-centre popup for an expense ledger with Allow Cost Centres = Yes', () => {
    const form = makeForm();
    const { handleAmountConfirm, proceedToNextRow } = run(form);

    handleAmountConfirm({ id: 'r1', ledger: expenseLedger, amountRaw: '900', type: 'Dr' }, 0);

    expect(form.setActiveAllocation).toHaveBeenCalledTimes(1);
    expect(form.setActiveAllocation).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'costCentre', ledgerId: 2676, amount: 900 }),
    );
    expect(proceedToNextRow).not.toHaveBeenCalled();
  });

  it('does NOT open the popup for a ledger outside the four P&L primary groups', () => {
    const form = makeForm();
    const { handleAmountConfirm, proceedToNextRow } = run(form);

    handleAmountConfirm(
      {
        id: 'r1',
        ledger: { ledger_id: 10, name: 'Cash', allow_cost_centres: 1, group_name: 'Cash-in-hand' },
        amountRaw: '900',
        type: 'Dr',
      },
      0,
    );

    expect(form.setActiveAllocation).not.toHaveBeenCalled();
    expect(proceedToNextRow).toHaveBeenCalledTimes(1);
  });

  it('does NOT open the popup when cost centres are disabled for the company', () => {
    const form = makeForm({ features: { maintain_accounts: 1, enable_cost_centres: 0 } });
    const { handleAmountConfirm, proceedToNextRow } = run(form);

    handleAmountConfirm({ id: 'r1', ledger: expenseLedger, amountRaw: '900', type: 'Dr' }, 0);

    expect(form.setActiveAllocation).not.toHaveBeenCalled();
    expect(proceedToNextRow).toHaveBeenCalledTimes(1);
  });
});
