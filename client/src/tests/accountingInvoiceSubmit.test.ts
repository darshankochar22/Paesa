import { describe, it, expect, vi, beforeEach } from 'vitest';
import { submitVoucher } from '../pages/transactions/hooks/voucherSubmit';

// ── Helpers ───────────────────────────────────────────────────────────────────
// A minimal ctx for submitVoucher's Accounting-Invoice branch. We only wire the
// meta / rows fields the trade-voucher save path actually reads; everything else
// is a no-op setter or a benign default.

function makeMeta() {
  return {
    voucherNumber: '1',
    voucherType: 'Sales',
    date: '2026-04-10',
    status: 'Regular',
    supplierInvoiceNo: '',
    supplierInvoiceDate: '',
    referenceNumber: '',
    referenceDate: '',
    placeOfSupply: 'Select',
    voucherClass: '',
    narration: '',
    isOptional: false,
    applicableUpto: '',
    partyBillReferences: [] as any[],
    bankDetails: null,
    cashDenominations: null,
    receiptDetails: null,
    partyDetails: null,
    dispatchDetails: null,
    creditNoteDetails: null,
    debitNoteDetails: null,
    exciseDetails: null,
    vatDetails: null,
    gstEwayDetails: null,
    manufacturerImporterDetails: null,
    orderDetails: null,
    sourceGodown: null,
    provideEInvoice: 'No' as const,
    setError: vi.fn(),
    setIsSubmitting: vi.fn(),
    setSuccess: vi.fn(),
  };
}

function makeRows(over: any) {
  return {
    partyLedger: null,
    salesPurchaseLedger: null,
    particulars: [] as any[],
    additionalEntries: [] as any[],
    stockEntries: [] as any[],
    totalAmount: 0,
    payrollEntriesFromGroups: [] as any[],
    ...over,
  };
}

function makeCtx(voucherType: string, rowsOver: any) {
  const meta = makeMeta();
  meta.voucherType = voucherType;
  return {
    validate: () => null,
    companyId: 1,
    fyId: 1,
    effectiveVoucherType: voucherType,
    meta: meta as any,
    rows: makeRows(rowsOver) as any,
    ledgers: { fetchContextData: vi.fn() } as any,
    editVoucherId: null,
    onSaved: undefined,
    gstRegistration: null,
    features: {},
    resetForm: vi.fn(),
    onNewVoucherSaved: undefined,
    isAccountingInvoice: true,
  };
}

// Capture the payload voucher.create receives.
let created: any;
beforeEach(() => {
  created = undefined;
  (window.api.voucher.create as any) = vi.fn(async (payload: any) => {
    created = payload;
    return { success: true, voucher: { voucher_id: 99 } };
  });
});

const sumSide = (entries: any[], side: 'Dr' | 'Cr') =>
  entries.filter((e) => e.type === side).reduce((s, e) => s + Number(e.amount), 0);

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('submitVoucher — Accounting Invoice mode', () => {
  it('Sales: party Dr, particulars Cr, tax row Cr, no stock, Dr === Cr', async () => {
    const party = { ledger_id: 1, name: 'Customer' };
    const ctx = makeCtx('Sales', {
      partyLedger: party,
      particulars: [
        { id: 'p1', ledger: { ledger_id: 2, name: 'Sales A/c' }, amountRaw: '1000', type: 'Cr' },
      ],
      additionalEntries: [
        { id: 'a1', ledger: { ledger_id: 5, name: 'CGST' }, amountRaw: '90', type: 'Cr' },
      ],
      totalAmount: 1090,
    });

    await submitVoucher(ctx as any);

    expect(created).toBeDefined();
    expect(created.stock_entries).toEqual([]);

    const entries = created.entries;
    const partyEntry = entries.find((e: any) => e.ledger_id === 1);
    const salesEntry = entries.find((e: any) => e.ledger_id === 2);
    const taxEntry = entries.find((e: any) => e.ledger_id === 5);

    // Party on the Dr side for the full invoice value.
    expect(partyEntry).toMatchObject({ type: 'Dr', amount: 1090, ledger_name: 'Customer' });
    // Particulars on the opposite (Cr) side, each its own amount.
    expect(salesEntry).toMatchObject({ type: 'Cr', amount: 1000 });
    // Additional tax row posted as entered (Cr).
    expect(taxEntry).toMatchObject({ type: 'Cr', amount: 90 });

    // Balanced.
    expect(sumSide(entries, 'Dr')).toBeCloseTo(sumSide(entries, 'Cr'), 2);
    expect(sumSide(entries, 'Dr')).toBeCloseTo(1090, 2);
  });

  it('Purchase: party Cr, particulars Dr, no stock, Dr === Cr', async () => {
    const party = { ledger_id: 4, name: 'Supplier' };
    const ctx = makeCtx('Purchase', {
      partyLedger: party,
      particulars: [
        { id: 'p1', ledger: { ledger_id: 3, name: 'Purchase A/c' }, amountRaw: '800', type: 'Dr' },
      ],
      additionalEntries: [],
      totalAmount: 800,
    });

    await submitVoucher(ctx as any);

    expect(created).toBeDefined();
    expect(created.stock_entries).toEqual([]);

    const entries = created.entries;
    const partyEntry = entries.find((e: any) => e.ledger_id === 4);
    const purchaseEntry = entries.find((e: any) => e.ledger_id === 3);

    // Party on the Cr side for the full invoice value.
    expect(partyEntry).toMatchObject({ type: 'Cr', amount: 800, ledger_name: 'Supplier' });
    // Particulars on the opposite (Dr) side.
    expect(purchaseEntry).toMatchObject({ type: 'Dr', amount: 800 });

    // Balanced.
    expect(sumSide(entries, 'Dr')).toBeCloseTo(sumSide(entries, 'Cr'), 2);
    expect(sumSide(entries, 'Dr')).toBeCloseTo(800, 2);
  });

  it('Debit Note: party Dr (sales-like, NOT purchase-like), particulars Cr, Dr === Cr', async () => {
    // Guards the app convention: only Purchase inverts the party side; Sales,
    // Credit Note and Debit Note all keep party Dr so a Debit Note posts the same
    // way in accounting mode as in item mode.
    const party = { ledger_id: 7, name: 'Supplier' };
    const ctx = makeCtx('Debit Note', {
      partyLedger: party,
      particulars: [
        {
          id: 'p1',
          ledger: { ledger_id: 8, name: 'Purchase Returns' },
          amountRaw: '500',
          type: 'Cr',
        },
      ],
      additionalEntries: [],
      totalAmount: 500,
    });

    await submitVoucher(ctx as any);

    const entries = created.entries;
    expect(created.stock_entries).toEqual([]);
    expect(entries.find((e: any) => e.ledger_id === 7)).toMatchObject({ type: 'Dr', amount: 500 });
    expect(entries.find((e: any) => e.ledger_id === 8)).toMatchObject({ type: 'Cr', amount: 500 });
    expect(sumSide(entries, 'Dr')).toBeCloseTo(sumSide(entries, 'Cr'), 2);
  });
});
