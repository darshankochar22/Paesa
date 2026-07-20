import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import TradeVoucherView from '../pages/transactions/voucher-views/TradeVoucherView';

// Two shapes of Sales invoice must both render their value:
//  - an ITEM invoice, where the stock lines carry the taxable value;
//  - an ACCOUNTING-ONLY (service) invoice, where the sales ledger carries it and there
//    are no stock lines at all. The latter used to render blank — the whole table was
//    gated on stock — which is how a Tally-imported services company showed invoices
//    with no sale inside them.
const entry = (
  ledger_id: number,
  ledger_name: string,
  type: 'Dr' | 'Cr',
  amount: number,
  extra: Record<string, unknown> = {},
) => ({ ledger_id, ledger_name, type, amount, amount_forex: 0, ...extra });

const baseVoucher = {
  voucher_type: 'Sales',
  party_name: 'Arnab Dey',
  party_ledger_id: 1,
  stock_entries: [],
  entries: [],
} as never;

const renderVoucher = (v: object) =>
  render(
    <TradeVoucherView voucher={{ ...(baseVoucher as object), ...v } as never} balances={{}} />,
  );

describe('TradeVoucherView', () => {
  it('renders the sales ledger and correct total for a service invoice (no stock lines)', () => {
    // ACCUFINS: party Dr 2500 = ITR Filing Services 2119 + IGST 381.42 - round-off 0.42
    renderVoucher({
      entries: [
        entry(1, 'Arnab Dey', 'Dr', 2500),
        entry(2, 'ITR Filing Services', 'Cr', 2119),
        entry(3, 'Output IGST', 'Cr', 381.42, { type_of_duty_tax: 'GST', gst_tax_type: 'IGST' }),
        entry(4, 'Round Off', 'Dr', 0.42),
      ],
    });
    // The sale itself must appear — previously it was dropped entirely.
    expect(screen.getAllByText('ITR Filing Services').length).toBeGreaterThan(0);
    expect(screen.getByText('2,119.00')).toBeInTheDocument();
    // Total ties back to the party amount: the Dr round-off SUBTRACTS.
    expect(screen.getByText('2,500.00')).toBeInTheDocument();
  });

  it('does not double-count the sales ledger when item lines are present', () => {
    // URMILA: stock 12354 + CGST 741.24 + SGST 741.24 - round-off 0.48 = 13836.00,
    // which is exactly the party's Dr amount.
    renderVoucher({
      stock_entries: [
        {
          item_name: 'Nonwoven Fabrics',
          quantity: 87,
          rate: 142,
          amount: 12354,
          additional_amount: 0,
          discount_amount: 0,
          cgst_amount: 0,
          sgst_amount: 0,
          igst_amount: 0,
        },
      ],
      party_name: 'Pooja Bags and Covers',
      entries: [
        entry(1, 'Pooja Bags and Covers', 'Dr', 13836),
        entry(2, 'Sales Account', 'Cr', 12354),
        entry(3, 'CGST @ 6%', 'Cr', 741.24, { type_of_duty_tax: 'GST', gst_tax_type: 'CGST' }),
        entry(4, 'SGST @ 6%', 'Cr', 741.24, { type_of_duty_tax: 'GST', gst_tax_type: 'SGST' }),
        entry(5, 'R/off', 'Dr', 0.48),
      ],
    });
    expect(screen.getByText('13,836.00')).toBeInTheDocument();
    // The old code summed magnitudes, overstating the invoice by twice the round-off.
    expect(screen.queryByText('13,836.96')).not.toBeInTheDocument();
  });
});
