import { useCallback, useEffect, useRef } from 'react';
import type { useVoucherForm } from './useVoucherForm';

// Accept-time allocation prompts (bill-wise / bank details) and the Enter-key
// row-advance flow shared by every ledger-row grid. Extracted from Vouchers.tsx;
// behaviour unchanged. `acceptRef` always points at the latest handleAccept so
// popup save handlers can resume the Accept chain after their popup closes.
export function useVoucherAcceptFlow(
  form: ReturnType<typeof useVoucherForm>,
  effectiveVoucherType: string,
) {
  const acceptRef = useRef<() => void>(() => {});

  const handleAccept = useCallback(() => {
    // ── Sales / Purchase / Credit Note / Debit Note: bill-wise for party ──────
    if (
      // Delivery Note, Receipt Note, Rejection In & Rejection Out are non-accounting
      // inventory vouchers — no bill-wise prompt (no voucher_entries row is ever
      // created for the party ledger, so a bill reference would be orphaned).
      ['Sales', 'Purchase', 'Credit Note', 'Debit Note'].includes(effectiveVoucherType) &&
      form.partyLedger?.is_bill_wise === 1 &&
      form.partyBillReferences.length === 0
    ) {
      // Credit Note (sales return) credits the customer → "Cr"; Debit Note
      // (purchase return) debits the supplier → "Dr".
      const dcType =
        effectiveVoucherType === 'Sales' || effectiveVoucherType === 'Debit Note' ? 'Dr' : 'Cr';
      form.setActiveAllocation({
        type: 'billWiseParty',
        ledgerId: form.partyLedger.ledger_id,
        ledgerName: form.partyLedger.name,
        amount: form.totalAmount,
        dcType,
        initialAllocations: [],
      });
      return;
    }

    // ── Sales / Purchase / Credit Note / Debit Note: bank allocation for party ─
    // Receipt Note & Rejection In/Out are inventory-only — no bank-allocation prompt.
    if (
      [
        'Sales',
        'Purchase',
        'Credit Note',
        'Debit Note',
        'Delivery Note',
        'Material In',
        'Material Out',
      ].includes(effectiveVoucherType) &&
      form.partyLedger &&
      form.checkIsBank(form.partyLedger) &&
      !form.bankDetails
    ) {
      form.setActiveAllocation({
        type: 'partyBankDetails',
        ledgerId: form.partyLedger.ledger_id,
        ledgerName: form.partyLedger.name,
        amount: form.totalAmount,
        initialDetails: form.bankDetails,
      });
      return;
    }

    // ── Receipt (single-entry) / Payment (single-entry): bill-wise for account ledger ────────
    if (
      ((effectiveVoucherType === 'Payment' && form.paymentEntryMode === 'single') ||
        (effectiveVoucherType === 'Receipt' && form.receiptEntryMode === 'single')) &&
      form.accountLedger?.is_bill_wise === 1 &&
      form.partyBillReferences.length === 0
    ) {
      form.setActiveAllocation({
        type: 'billWiseParty',
        ledgerId: form.accountLedger.ledger_id,
        ledgerName: form.accountLedger.name,
        amount: form.particularsTotal,
        dcType: effectiveVoucherType === 'Receipt' ? 'Dr' : 'Cr',
        initialAllocations: [],
      });
      return;
    }

    if (
      effectiveVoucherType === 'Contra' &&
      form.contraEntryMode === 'single' &&
      form.accountLedger?.is_bill_wise === 1 &&
      form.partyBillReferences.length === 0
    ) {
      form.setActiveAllocation({
        type: 'billWiseParty',
        ledgerId: form.accountLedger.ledger_id,
        ledgerName: form.accountLedger.name,
        amount: form.particularsTotal,
        dcType: 'Cr',
        initialAllocations: [],
      });
      return;
    }

    if (
      effectiveVoucherType === 'Journal' &&
      form.journalEntryMode === 'single' &&
      form.accountLedger?.is_bill_wise === 1 &&
      form.partyBillReferences.length === 0
    ) {
      form.setActiveAllocation({
        type: 'billWiseParty',
        ledgerId: form.accountLedger.ledger_id,
        ledgerName: form.accountLedger.name,
        amount: form.particularsTotal,
        dcType: 'Cr',
        initialAllocations: [],
      });
      return;
    }

    // ── Payroll: bank allocation for the account ledger ──────────────────────
    if (
      effectiveVoucherType === 'Payroll' &&
      form.accountLedger &&
      form.checkIsBank(form.accountLedger) &&
      !form.bankDetails
    ) {
      form.setActiveAllocation({
        type: 'partyBankDetails',
        ledgerId: form.accountLedger.ledger_id,
        ledgerName: form.accountLedger.name,
        amount: form.totalAmount,
        initialDetails: form.bankDetails,
      });
      return;
    }

    form.handleSubmit();
  }, [
    effectiveVoucherType,
    form.paymentEntryMode,
    form.journalEntryMode,
    form.contraEntryMode,
    form.receiptEntryMode,
    form.partyLedger,
    form.accountLedger,
    form.partyBillReferences,
    form.totalAmount,
    form.particularsTotal,
    form.handleSubmit,
    form.setActiveAllocation,
    form.checkIsBank,
    form.bankDetails,
  ]);

  useEffect(() => {
    acceptRef.current = handleAccept;
  }, [handleAccept]);

  const proceedToNextRow = useCallback(
    (idx: number) => {
      const isJDouble =
        (effectiveVoucherType === 'Journal' ||
          effectiveVoucherType === 'Reversing Journal' ||
          effectiveVoucherType === 'Memorandum') &&
        form.journalEntryMode === 'double';
      const isJSingle = effectiveVoucherType === 'Journal' && form.journalEntryMode === 'single';
      const isPayDouble = effectiveVoucherType === 'Payment' && form.paymentEntryMode === 'double';
      // Trade invoices that render the shared AdditionalTaxLedgerRows (Sales flow):
      // their tax/ledger lines live in form.additionalEntries, so Enter on a tax
      // amount must append the NEXT additional row (e.g. CGST → SGST) and focus it —
      // not fall through to the particulars grid. Credit/Debit Note reuse this flow.
      const isInv = ['Sales', 'Purchase', 'Credit Note', 'Debit Note'].includes(
        effectiveVoucherType,
      );
      const isContraDouble = effectiveVoucherType === 'Contra' && form.contraEntryMode === 'double';
      const isReceiptDouble =
        effectiveVoucherType === 'Receipt' && form.receiptEntryMode === 'double';
      const list = isJDouble
        ? form.journalRows
        : isJSingle
          ? form.particulars
          : isPayDouble
            ? form.paymentDoubleRows
            : isInv
              ? form.additionalEntries
              : isContraDouble
                ? form.contraDoubleRows
                : isReceiptDouble
                  ? form.receiptDoubleRows
                  : form.particulars;
      const addRow = isJDouble
        ? form.handleAddJournalRow
        : isJSingle
          ? form.handleAddParticularRow
          : isPayDouble
            ? form.handleAddPaymentDoubleRow
            : isInv
              ? form.handleAddAdditionalRow
              : isContraDouble
                ? form.handleAddContraDoubleRow
                : isReceiptDouble
                  ? form.handleAddReceiptDoubleRow
                  : form.handleAddParticularRow;

      // Double-entry accounting vouchers are complete once Dr = Cr. Don't append an
      // empty row (e.g. a stray "Cr") just because Enter landed on the last line —
      // leave the balanced rows as-is so the user can Accept.
      const isDoubleAccounting = isJDouble || isPayDouble || isContraDouble || isReceiptDouble;
      const drTotal = (list as any[]).reduce(
        (s: number, r: any) => s + (r.type === 'Dr' ? Number(r.amountRaw) || 0 : 0),
        0,
      );
      const crTotal = (list as any[]).reduce(
        (s: number, r: any) => s + (r.type === 'Cr' ? Number(r.amountRaw) || 0 : 0),
        0,
      );
      const isBalanced = drTotal > 0 && Math.abs(drTotal - crTotal) < 0.01;

      if (idx === list.length - 1) {
        if (isDoubleAccounting && isBalanced) {
          // Balanced double-entry voucher: don't append an empty row — but keep the
          // keyboard flow going (Tally) by advancing the cursor to Narration, from
          // where Enter accepts the voucher. Without this the cursor would be stuck
          // on the last amount and the user would have to reach for the mouse/Ctrl+A.
          setTimeout(
            () =>
              (document.querySelector('[data-narration="true"]') as HTMLElement | null)?.focus(),
            50,
          );
          return;
        }
        addRow();
      }

      const sel = isInv
        ? `[data-additional-ledger="${idx + 2}"]`
        : `[data-particular-ledger="${idx + 2}"]`;
      setTimeout(() => (document.querySelector(sel) as HTMLInputElement | null)?.focus(), 50);
    },
    [
      effectiveVoucherType,
      form.paymentEntryMode,
      form.journalEntryMode,
      form.contraEntryMode,
      form.receiptEntryMode,
      form.journalRows,
      form.paymentDoubleRows,
      form.additionalEntries,
      form.particulars,
      form.contraDoubleRows,
      form.receiptDoubleRows,
      form.handleAddJournalRow,
      form.handleAddPaymentDoubleRow,
      form.handleAddAdditionalRow,
      form.handleAddParticularRow,
      form.handleAddContraDoubleRow,
      form.handleAddReceiptDoubleRow,
    ],
  );

  return { handleAccept, acceptRef, proceedToNextRow };
}
