import { useCallback, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

interface UseVoucherHandlersOptions {
  form: any;
  showDispatchDetailsSetter: (v: boolean) => void;
  showReceiptDetailsSetter: (v: boolean) => void;
  showPartyDetailsSetter: (v: boolean) => void;
  showCreditNoteDetailsSetter: (v: boolean) => void;
  showDebitNoteDetailsSetter: (v: boolean) => void;
}

export function useVoucherHandlers({
  form,
  showDispatchDetailsSetter,
  showReceiptDetailsSetter,
  showPartyDetailsSetter,
  showCreditNoteDetailsSetter,
  showDebitNoteDetailsSetter,
}: UseVoucherHandlersOptions) {
  const navigate = useNavigate();

  const acceptRef = useRef<() => void>(() => {});

  const proceedToNextRow = useCallback(
    (idx: number) => {
      const isJDouble =
        (form.voucherType === 'Journal' && form.journalEntryMode === 'double') || form.isAsVoucher;
      const isJSingle = form.voucherType === 'Journal' && form.journalEntryMode === 'single';
      const isPayDouble = form.voucherType === 'Payment' && form.paymentEntryMode === 'double';
      const isInv = ['Sales', 'Purchase'].includes(form.voucherType);
      const isContraDouble = form.voucherType === 'Contra' && form.contraEntryMode === 'double';
      const isReceiptDouble = form.voucherType === 'Receipt' && form.receiptEntryMode === 'double';
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

      if (idx === list.length - 1) addRow();

      const sel = isInv
        ? `[data-additional-ledger="${idx + 2}"]`
        : `[data-particular-ledger="${idx + 2}"]`;
      setTimeout(() => (document.querySelector(sel) as HTMLInputElement | null)?.focus(), 50);
    },
    [
      form.voucherType,
      form.isAsVoucher,
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

  // ─── handleAccept ─────────────────────────────────────────────────────────

  const handleAccept = useCallback(() => {
    // Sales / Purchase / Credit Note / Debit Note: bill-wise for party
    if (
      ['Sales', 'Purchase', 'Credit Note', 'Debit Note'].includes(form.voucherType) &&
      form.partyLedger?.is_bill_wise === 1 &&
      form.partyBillReferences.length === 0
    ) {
      const dcType =
        form.voucherType === 'Sales' ||
        form.voucherType === 'Credit Note' ||
        form.voucherType === 'Debit Note'
          ? 'Dr'
          : 'Cr';
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

    // Sales / Purchase: bank allocation for party
    if (
      ['Sales', 'Purchase', 'Credit Note', 'Debit Note'].includes(form.voucherType) &&
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

    // Receipt / Payment single-entry: bill-wise for account ledger
    if (
      ((form.voucherType === 'Payment' && form.paymentEntryMode === 'single') ||
        (form.voucherType === 'Receipt' && form.receiptEntryMode === 'single')) &&
      form.accountLedger?.is_bill_wise === 1 &&
      form.partyBillReferences.length === 0
    ) {
      form.setActiveAllocation({
        type: 'billWiseParty',
        ledgerId: form.accountLedger.ledger_id,
        ledgerName: form.accountLedger.name,
        amount: form.particularsTotal,
        dcType: form.voucherType === 'Receipt' ? 'Dr' : 'Cr',
        initialAllocations: [],
      });
      return;
    }

    if (
      form.voucherType === 'Contra' &&
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
      form.voucherType === 'Journal' &&
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

    form.handleSubmit();
  }, [
    form.voucherType,
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

  const handleAmountConfirm = useCallback(
    (row: any, idx: number) => {
      const { ledger, amountRaw, id } = row;
      const amount = Number(amountRaw) || 0;
      if (!ledger) {
        proceedToNextRow(idx);
        return;
      }

      if (
        form.voucherType === 'Contra' ||
        (form.voucherType === 'Receipt' && form.receiptEntryMode === 'double') ||
        (form.voucherType === 'Payment' && form.paymentEntryMode === 'double')
      ) {
        if (form.checkIsBank(ledger)) {
          const allowCash =
            form.voucherType === 'Receipt' || form.voucherType === 'Contra'
              ? row.type === 'Dr'
              : true;
          form.setActiveAllocation({
            type: 'bankDetails',
            rowId: id,
            ledgerId: ledger.ledger_id,
            ledgerName: ledger.name,
            amount,
            initialDetails: form.bankDetails,
            allowCash,
          });
          return;
        }
        proceedToNextRow(idx);
        return;
      }

      if (ledger.is_bill_wise === 1) {
        form.setActiveAllocation({
          type: 'billWise',
          rowId: id,
          ledgerId: ledger.ledger_id,
          ledgerName: ledger.name,
          amount,
          dcType: row.type ?? 'Dr',
          initialAllocations: row.billReferences ?? [],
        });
      } else if (ledger.allow_cost_centres === 1) {
        form.setActiveAllocation({
          type: 'costCentre',
          rowId: id,
          ledgerId: ledger.ledger_id,
          ledgerName: ledger.name,
          amount,
          initialAllocations: row.costCentres ?? [],
        });
      } else {
        proceedToNextRow(idx);
      }
    },
    [
      form.voucherType,
      form.paymentEntryMode,
      form.receiptEntryMode,
      form.checkIsBank,
      form.bankDetails,
      form.setActiveAllocation,
      proceedToNextRow,
    ],
  );

  // ─── getActiveRowList helper ──────────────────────────────────────────────

  const getActiveRowList = useCallback(() => {
    const isJDouble =
      (form.voucherType === 'Journal' && form.journalEntryMode === 'double') || form.isAsVoucher;
    const isJSingle = form.voucherType === 'Journal' && form.journalEntryMode === 'single';
    const isPayDouble = form.voucherType === 'Payment' && form.paymentEntryMode === 'double';
    const isInv = ['Sales', 'Purchase'].includes(form.voucherType);
    const isContraDouble = form.voucherType === 'Contra' && form.contraEntryMode === 'double';
    const isReceiptDouble = form.voucherType === 'Receipt' && form.receiptEntryMode === 'double';
    return isJDouble
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
  }, [
    form.voucherType,
    form.isAsVoucher,
    form.journalEntryMode,
    form.paymentEntryMode,
    form.contraEntryMode,
    form.receiptEntryMode,
    form.journalRows,
    form.particulars,
    form.paymentDoubleRows,
    form.additionalEntries,
    form.contraDoubleRows,
    form.receiptDoubleRows,
  ]);

  const updateActiveRowBillRefs = useCallback(
    (rowId: string, allocations: any[]) => {
      const isJDouble =
        (form.voucherType === 'Journal' && form.journalEntryMode === 'double') || form.isAsVoucher;
      const isJSingle = form.voucherType === 'Journal' && form.journalEntryMode === 'single';
      const isPayDouble = form.voucherType === 'Payment' && form.paymentEntryMode === 'double';
      const isInv = ['Sales', 'Purchase'].includes(form.voucherType);
      const isContraDouble = form.voucherType === 'Contra' && form.contraEntryMode === 'double';
      const isReceiptDouble = form.voucherType === 'Receipt' && form.receiptEntryMode === 'double';
      if (isJDouble) form.handleUpdateJournalRow(rowId, { billReferences: allocations });
      else if (isJSingle) form.handleUpdateParticularRow(rowId, { billReferences: allocations });
      else if (isPayDouble)
        form.handleUpdatePaymentDoubleRow(rowId, { billReferences: allocations });
      else if (isInv) form.handleUpdateAdditionalRow(rowId, { billReferences: allocations });
      else if (isContraDouble)
        form.handleUpdateContraDoubleRow(rowId, { billReferences: allocations });
      else if (isReceiptDouble)
        form.handleUpdateReceiptDoubleRow(rowId, { billReferences: allocations });
      else form.handleUpdateParticularRow(rowId, { billReferences: allocations });
    },
    [
      form.voucherType,
      form.isAsVoucher,
      form.journalEntryMode,
      form.paymentEntryMode,
      form.contraEntryMode,
      form.receiptEntryMode,
      form.handleUpdateJournalRow,
      form.handleUpdateParticularRow,
      form.handleUpdatePaymentDoubleRow,
      form.handleUpdateAdditionalRow,
      form.handleUpdateContraDoubleRow,
      form.handleUpdateReceiptDoubleRow,
    ],
  );

  const updateActiveRowCostCentres = useCallback(
    (rowId: string, allocations: any[]) => {
      const isJDouble =
        (form.voucherType === 'Journal' && form.journalEntryMode === 'double') || form.isAsVoucher;
      const isJSingle = form.voucherType === 'Journal' && form.journalEntryMode === 'single';
      const isPayDouble = form.voucherType === 'Payment' && form.paymentEntryMode === 'double';
      const isInv = ['Sales', 'Purchase'].includes(form.voucherType);
      const isContraDouble = form.voucherType === 'Contra' && form.contraEntryMode === 'double';
      const isReceiptDouble = form.voucherType === 'Receipt' && form.receiptEntryMode === 'double';
      if (isJDouble) form.handleUpdateJournalRow(rowId, { costCentres: allocations });
      else if (isJSingle) form.handleUpdateParticularRow(rowId, { costCentres: allocations });
      else if (isPayDouble) form.handleUpdatePaymentDoubleRow(rowId, { costCentres: allocations });
      else if (isInv) form.handleUpdateAdditionalRow(rowId, { costCentres: allocations });
      else if (isContraDouble)
        form.handleUpdateContraDoubleRow(rowId, { costCentres: allocations });
      else if (isReceiptDouble)
        form.handleUpdateReceiptDoubleRow(rowId, { costCentres: allocations });
      else form.handleUpdateParticularRow(rowId, { costCentres: allocations });
    },
    [
      form.voucherType,
      form.isAsVoucher,
      form.journalEntryMode,
      form.paymentEntryMode,
      form.contraEntryMode,
      form.receiptEntryMode,
      form.handleUpdateJournalRow,
      form.handleUpdateParticularRow,
      form.handleUpdatePaymentDoubleRow,
      form.handleUpdateAdditionalRow,
      form.handleUpdateContraDoubleRow,
      form.handleUpdateReceiptDoubleRow,
    ],
  );

  // ─── handleSaveBillWise ───────────────────────────────────────────────────

  const handleSaveBillWise = useCallback(
    (allocations: any[]) => {
      if (form.activeAllocation?.type === 'billWiseParty') {
        form.setPartyBillReferences(allocations);
        form.setActiveAllocation(null);
        setTimeout(() => acceptRef.current(), 50);
        return;
      }

      const alloc = form.activeAllocation;
      if (!alloc || !('rowId' in alloc)) return;
      const { rowId } = alloc;

      updateActiveRowBillRefs(rowId, allocations);

      const list = getActiveRowList();
      const targetRow = list.find((r: any) => r.id === rowId);

      if (targetRow?.ledger?.allow_cost_centres === 1) {
        form.setActiveAllocation({
          type: 'costCentre',
          rowId,
          ledgerId: targetRow.ledger.ledger_id,
          ledgerName: targetRow.ledger.name,
          amount: Number(targetRow.amountRaw) || 0,
          initialAllocations: (targetRow as any).costCentres ?? [],
        });
      } else {
        form.setActiveAllocation(null);
        proceedToNextRow(list.findIndex((r: any) => r.id === rowId));
      }
    },
    [
      form.activeAllocation,
      form.setPartyBillReferences,
      form.setActiveAllocation,
      updateActiveRowBillRefs,
      getActiveRowList,
      proceedToNextRow,
    ],
  );

  // ─── handleSaveCostCentre ─────────────────────────────────────────────────

  const handleSaveCostCentre = useCallback(
    (allocations: any[]) => {
      const alloc = form.activeAllocation;
      if (!alloc || !('rowId' in alloc)) return;
      const { rowId } = alloc;

      updateActiveRowCostCentres(rowId, allocations);
      form.setActiveAllocation(null);
      const list = getActiveRowList();
      proceedToNextRow(list.findIndex((r: any) => r.id === rowId));
    },
    [
      form.activeAllocation,
      form.setActiveAllocation,
      updateActiveRowCostCentres,
      getActiveRowList,
      proceedToNextRow,
    ],
  );

  // ─── handleSaveBankDetails ────────────────────────────────────────────────

  const handleSaveBankDetails = useCallback(
    (details: any) => {
      const alloc = form.activeAllocation;

      if (alloc?.type === 'partyBankDetails') {
        form.setBankDetails(details);
        form.setActiveAllocation(null);
        setTimeout(() => acceptRef.current(), 50);
        return;
      }

      form.setBankDetails(details);

      if (details.transaction_type === 'Cash') {
        const shouldSkipDenomination =
          form.voucherType === 'Receipt' ||
          (alloc && alloc.type === 'bankDetails' && alloc.allowCash === false);

        if (shouldSkipDenomination) {
          form.setActiveAllocation(null);
          if (alloc && 'rowId' in alloc) {
            const isContraDouble =
              form.voucherType === 'Contra' && form.contraEntryMode === 'double';
            const isReceiptDouble =
              form.voucherType === 'Receipt' && form.receiptEntryMode === 'double';
            const isPayDouble =
              form.voucherType === 'Payment' && form.paymentEntryMode === 'double';
            const list = isContraDouble
              ? form.contraDoubleRows
              : isReceiptDouble
                ? form.receiptDoubleRows
                : isPayDouble
                  ? form.paymentDoubleRows
                  : form.particulars;
            const rowIdx = list.findIndex((r: any) => r.id === alloc.rowId);
            proceedToNextRow(rowIdx);
          }
          return;
        }

        form.setActiveAllocation({
          type: 'cashDenomination',
          rowId: alloc && 'rowId' in alloc ? alloc.rowId : '',
          ledgerId: details.ledger_id,
          ledgerName: details.bank_name || form.activeAllocation?.ledgerName || 'Cash',
          amount: details.amount,
          initialDetails: form.cashDenominations,
        });
        return;
      }

      form.setActiveAllocation(null);
      if (alloc && 'rowId' in alloc) {
        const isContraDouble = form.voucherType === 'Contra' && form.contraEntryMode === 'double';
        const isReceiptDouble =
          form.voucherType === 'Receipt' && form.receiptEntryMode === 'double';
        const isPayDouble = form.voucherType === 'Payment' && form.paymentEntryMode === 'double';
        const list = isContraDouble
          ? form.contraDoubleRows
          : isReceiptDouble
            ? form.receiptDoubleRows
            : isPayDouble
              ? form.paymentDoubleRows
              : form.particulars;
        const rowIdx = list.findIndex((r: any) => r.id === alloc.rowId);
        proceedToNextRow(rowIdx);
      }
    },
    [
      form.activeAllocation,
      form.setBankDetails,
      form.setActiveAllocation,
      form.voucherType,
      form.paymentEntryMode,
      form.contraEntryMode,
      form.receiptEntryMode,
      form.contraDoubleRows,
      form.receiptDoubleRows,
      form.paymentDoubleRows,
      form.particulars,
      form.cashDenominations,
      proceedToNextRow,
    ],
  );

  // ─── handleSaveCashDenomination ───────────────────────────────────────────

  const handleSaveCashDenomination = useCallback(
    (details: any) => {
      const alloc = form.activeAllocation;
      form.setCashDenominations(details);
      form.setActiveAllocation(null);
      if (alloc && 'rowId' in alloc) {
        const isContraDouble = form.voucherType === 'Contra' && form.contraEntryMode === 'double';
        const isReceiptDouble =
          form.voucherType === 'Receipt' && form.receiptEntryMode === 'double';
        const isPayDouble = form.voucherType === 'Payment' && form.paymentEntryMode === 'double';
        const list = isContraDouble
          ? form.contraDoubleRows
          : isReceiptDouble
            ? form.receiptDoubleRows
            : isPayDouble
              ? form.paymentDoubleRows
              : form.particulars;
        const rowIdx = list.findIndex((r: any) => r.id === alloc.rowId);
        proceedToNextRow(rowIdx);
      }
    },
    [
      form.activeAllocation,
      form.setCashDenominations,
      form.setActiveAllocation,
      form.voucherType,
      form.paymentEntryMode,
      form.contraEntryMode,
      form.receiptEntryMode,
      form.contraDoubleRows,
      form.receiptDoubleRows,
      form.paymentDoubleRows,
      form.particulars,
      proceedToNextRow,
    ],
  );

  // ─── Detail popup save handlers ───────────────────────────────────────────

  const handleSaveDispatchDetails = useCallback(
    (details: any) => {
      form.setDispatchDetails(details);
      showDispatchDetailsSetter(false);
      showPartyDetailsSetter(true);
    },
    [form.setDispatchDetails, showDispatchDetailsSetter, showPartyDetailsSetter],
  );

  const handleSaveReceiptDetails = useCallback(
    (details: any) => {
      form.setReceiptDetails(details);
      showReceiptDetailsSetter(false);
      showPartyDetailsSetter(true);
    },
    [form.setReceiptDetails, showReceiptDetailsSetter, showPartyDetailsSetter],
  );

  const handleSavePartyDetails = useCallback(
    (details: any) => {
      form.setPartyDetails(details);
      if (details.state) form.setPlaceOfSupply(details.state);
      showPartyDetailsSetter(false);
      // Keyboard flow (no mouse): once Party Details is accepted, OPEN the next
      // field's picker via state — same as clicking it — so the List reliably
      // appears with keyboard focus. `handleFieldFocus` sets `activeField`, which
      // drives `panelOpen`; we don't rely on a fragile programmatic `.focus()`
      // (which can land on <body> if the popup hasn't finished unmounting, then
      // Enter does nothing — the reported bug). Trade vouchers open the
      // Sales/Purchase ledger list; inventory-only party vouchers (Delivery/
      // Receipt Note) have no such ledger, so land on the first stock item.
      if (['Sales', 'Purchase', 'Credit Note', 'Debit Note'].includes(form.voucherType)) {
        form.handleFieldFocus({ type: 'salesPurchase' });
      } else {
        setTimeout(() => {
          (document.querySelector('[data-stock-item="1"]') as HTMLElement | null)?.focus();
        }, 50);
      }
    },
    [
      form.setPartyDetails,
      form.setPlaceOfSupply,
      form.handleFieldFocus,
      form.voucherType,
      showPartyDetailsSetter,
    ],
  );

  const handleSaveCreditNoteDetails = useCallback(
    (details: any) => {
      form.setCreditNoteDetails(details);
      showCreditNoteDetailsSetter(false);
      showPartyDetailsSetter(true);
    },
    [form.setCreditNoteDetails, showCreditNoteDetailsSetter, showPartyDetailsSetter],
  );

  const handleSaveDebitNoteDetails = useCallback(
    (details: any) => {
      form.setDebitNoteDetails(details);
      showDebitNoteDetailsSetter(false);
      showPartyDetailsSetter(true);
    },
    [form.setDebitNoteDetails, showDebitNoteDetailsSetter, showPartyDetailsSetter],
  );

  // ─── Stock focus helpers ──────────────────────────────────────────────────

  const focusStockQty = useCallback((idx: number) => {
    setTimeout(() => {
      (document.querySelector(`[data-stock-qty="${idx + 1}"]`) as HTMLInputElement | null)?.focus();
    }, 50);
  }, []);

  const focusStockRate = useCallback((idx: number) => {
    setTimeout(() => {
      (
        document.querySelector(`[data-stock-rate="${idx + 1}"]`) as HTMLInputElement | null
      )?.focus();
    }, 50);
  }, []);

  const proceedToNextStockRow = useCallback(
    (idx: number) => {
      if (idx === form.stockEntries.length - 1) form.handleAddStockRow();
      setTimeout(() => {
        (
          document.querySelector(`[data-stock-item="${idx + 2}"]`) as HTMLInputElement | null
        )?.focus();
      }, 50);
    },
    [form.stockEntries.length, form.handleAddStockRow],
  );

  return {
    acceptRef,
    handleAccept,
    proceedToNextRow,
    handleAmountConfirm,
    handleSaveBillWise,
    handleSaveCostCentre,
    handleSaveBankDetails,
    handleSaveCashDenomination,
    handleSaveDispatchDetails,
    handleSaveReceiptDetails,
    handleSavePartyDetails,
    handleSaveCreditNoteDetails,
    handleSaveDebitNoteDetails,
    focusStockQty,
    focusStockRate,
    proceedToNextStockRow,
    navigate,
  };
}
