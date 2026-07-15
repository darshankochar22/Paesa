import { useCallback } from 'react';
import type { MutableRefObject } from 'react';
import type { useVoucherForm } from './useVoucherForm';
import type { useAutoOpenDetailPopups } from './useAutoOpenDetailPopups';
import { makeStockRow } from '../utils/rowFactories';
import { openField } from '../lib/voucherNav';
import { isFeatureEnabled } from '@/lib/companyFeatures';

// Save handlers for every allocation / detail popup — bill-wise, cost centre,
// bank details, cash denomination, dispatch/order/receipt/party details and the
// excise/VAT/credit-note/debit-note chains, plus pending-item import from a
// linked order/note. Extracted from Vouchers.tsx; behaviour unchanged.
export function useAllocationSaveHandlers(
  form: ReturnType<typeof useVoucherForm>,
  effectiveVoucherType: string,
  deps: {
    proceedToNextRow: (idx: number) => void;
    acceptRef: MutableRefObject<() => void>;
    selectedCompany: any;
    popups: ReturnType<typeof useAutoOpenDetailPopups>;
  },
) {
  const { proceedToNextRow, acceptRef, selectedCompany, popups } = deps;
  const {
    setShowDispatchDetails,
    setShowOrderDetails,
    setShowReceiptDetails,
    setShowPartyDetails,
    setShowManufacturerDetails,
    setShowExciseDetails,
    setShowDebitNoteExcise,
    setShowVatDetails,
    setShowCreditNoteDetails,
    setShowDebitNoteDetails,
  } = popups;

  const handleSaveBillWise = useCallback(
    (allocations: any[]) => {
      // Party bill-wise (Sales/Purchase) or account bill-wise (Receipt/Payment)
      if (form.activeAllocation?.type === 'billWiseParty') {
        form.setPartyBillReferences(allocations);
        form.setActiveAllocation(null);
        setTimeout(() => acceptRef.current(), 50);
        return;
      }

      const alloc = form.activeAllocation;
      if (!alloc || !('rowId' in alloc)) return;
      const { rowId } = alloc;
      const isJDouble =
        (effectiveVoucherType === 'Journal' ||
          effectiveVoucherType === 'Reversing Journal' ||
          effectiveVoucherType === 'Memorandum') &&
        form.journalEntryMode === 'double';
      const isJSingle = effectiveVoucherType === 'Journal' && form.journalEntryMode === 'single';
      const isPayDouble = effectiveVoucherType === 'Payment' && form.paymentEntryMode === 'double';
      const isInv = ['Sales', 'Purchase'].includes(effectiveVoucherType);
      const isContraDouble = effectiveVoucherType === 'Contra' && form.contraEntryMode === 'double';
      const isReceiptDouble =
        effectiveVoucherType === 'Receipt' && form.receiptEntryMode === 'double';

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
      const targetRow = list.find((r) => r.id === rowId);

      if (
        isFeatureEnabled(form.features, 'enable_cost_centres') &&
        targetRow?.ledger?.allow_cost_centres === 1
      ) {
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
        proceedToNextRow(list.findIndex((r) => r.id === rowId));
      }
    },
    [
      form.activeAllocation,
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
      form.setPartyBillReferences,
      form.setActiveAllocation,
      form.handleUpdateJournalRow,
      form.handleUpdatePaymentDoubleRow,
      form.handleUpdateAdditionalRow,
      form.handleUpdateContraDoubleRow,
      form.handleUpdateReceiptDoubleRow,
      form.handleUpdateParticularRow,
      form.features,
      proceedToNextRow,
    ],
  );

  const handleSaveCostCentre = useCallback(
    (allocations: any[]) => {
      const alloc = form.activeAllocation;
      if (!alloc || !('rowId' in alloc)) return;
      const { rowId } = alloc;
      const isJDouble =
        (effectiveVoucherType === 'Journal' ||
          effectiveVoucherType === 'Reversing Journal' ||
          effectiveVoucherType === 'Memorandum') &&
        form.journalEntryMode === 'double';
      const isJSingle = effectiveVoucherType === 'Journal' && form.journalEntryMode === 'single';
      const isPayDouble = effectiveVoucherType === 'Payment' && form.paymentEntryMode === 'double';
      const isInv = ['Sales', 'Purchase'].includes(effectiveVoucherType);
      const isContraDouble = effectiveVoucherType === 'Contra' && form.contraEntryMode === 'double';
      const isReceiptDouble =
        effectiveVoucherType === 'Receipt' && form.receiptEntryMode === 'double';

      if (isJDouble) form.handleUpdateJournalRow(rowId, { costCentres: allocations });
      else if (isJSingle) form.handleUpdateParticularRow(rowId, { costCentres: allocations });
      else if (isPayDouble) form.handleUpdatePaymentDoubleRow(rowId, { costCentres: allocations });
      else if (isInv) form.handleUpdateAdditionalRow(rowId, { costCentres: allocations });
      else if (isContraDouble)
        form.handleUpdateContraDoubleRow(rowId, { costCentres: allocations });
      else if (isReceiptDouble)
        form.handleUpdateReceiptDoubleRow(rowId, { costCentres: allocations });
      else form.handleUpdateParticularRow(rowId, { costCentres: allocations });

      form.setActiveAllocation(null);
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
      proceedToNextRow(list.findIndex((r) => r.id === rowId));
    },
    [
      form.activeAllocation,
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
      form.setActiveAllocation,
      form.handleUpdateJournalRow,
      form.handleUpdatePaymentDoubleRow,
      form.handleUpdateAdditionalRow,
      form.handleUpdateContraDoubleRow,
      form.handleUpdateReceiptDoubleRow,
      form.handleUpdateParticularRow,
      proceedToNextRow,
    ],
  );

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
          effectiveVoucherType === 'Receipt' ||
          (alloc && alloc.type === 'bankDetails' && alloc.allowCash === false);

        if (shouldSkipDenomination) {
          form.setActiveAllocation(null);
          if (alloc && 'rowId' in alloc) {
            const isContraDouble =
              effectiveVoucherType === 'Contra' && form.contraEntryMode === 'double';
            const isReceiptDouble =
              effectiveVoucherType === 'Receipt' && form.receiptEntryMode === 'double';
            const isPayDouble =
              effectiveVoucherType === 'Payment' && form.paymentEntryMode === 'double';
            const list = isContraDouble
              ? form.contraDoubleRows
              : isReceiptDouble
                ? form.receiptDoubleRows
                : isPayDouble
                  ? form.paymentDoubleRows
                  : form.particulars;
            const rowIdx = list.findIndex((r) => r.id === alloc.rowId);
            proceedToNextRow(rowIdx);
          }
          return;
        }

        form.setActiveAllocation({
          type: 'cashDenomination',
          rowId: alloc && 'rowId' in alloc ? alloc.rowId : '',
          ledgerId: details.ledger_id,
          ledgerName:
            details.bank_name ||
            (form.activeAllocation && 'ledgerName' in form.activeAllocation
              ? form.activeAllocation.ledgerName
              : '') ||
            'Cash',
          amount: details.amount,
          initialDetails: form.cashDenominations,
        });
        return;
      }

      form.setActiveAllocation(null);
      if (alloc && 'rowId' in alloc) {
        const isContraDouble =
          effectiveVoucherType === 'Contra' && form.contraEntryMode === 'double';
        const isReceiptDouble =
          effectiveVoucherType === 'Receipt' && form.receiptEntryMode === 'double';
        const isPayDouble =
          effectiveVoucherType === 'Payment' && form.paymentEntryMode === 'double';
        const list = isContraDouble
          ? form.contraDoubleRows
          : isReceiptDouble
            ? form.receiptDoubleRows
            : isPayDouble
              ? form.paymentDoubleRows
              : form.particulars;
        const rowIdx = list.findIndex((r) => r.id === alloc.rowId);
        proceedToNextRow(rowIdx);
      }
    },
    [
      form.activeAllocation,
      form.setBankDetails,
      form.setActiveAllocation,
      effectiveVoucherType,
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

  const handleSaveCashDenomination = useCallback(
    (details: any) => {
      const alloc = form.activeAllocation;
      form.setCashDenominations(details);
      form.setActiveAllocation(null);
      if (alloc && 'rowId' in alloc) {
        const isContraDouble =
          effectiveVoucherType === 'Contra' && form.contraEntryMode === 'double';
        const isReceiptDouble =
          effectiveVoucherType === 'Receipt' && form.receiptEntryMode === 'double';
        const isPayDouble =
          effectiveVoucherType === 'Payment' && form.paymentEntryMode === 'double';
        const list = isContraDouble
          ? form.contraDoubleRows
          : isReceiptDouble
            ? form.receiptDoubleRows
            : isPayDouble
              ? form.paymentDoubleRows
              : form.particulars;
        const rowIdx = list.findIndex((r) => r.id === alloc.rowId);
        proceedToNextRow(rowIdx);
      }
    },
    [
      form.activeAllocation,
      form.setCashDenominations,
      form.setActiveAllocation,
      effectiveVoucherType,
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

  // ── Keyboard hand-off after a detail-popup chain ───────────────────────────
  // When the LAST popup in a trade voucher's chain closes, Tally drops the user
  // on the Sales/Purchase ledger with its List open. We open it via state
  // (handleFieldFocus = what a click does), DEFERRED to the next tick: opening
  // it in the same commit that unmounts the closing popup lets the browser send
  // focus to <body> when the popup's focused field is removed, stealing it from
  // the list (the list shows but the cursor isn't in it → Enter does nothing —
  // the reported bug). Deferring lets the popup unmount first, so the List's
  // autofocus lands cleanly.
  const openSalesPurchaseLedger = useCallback(() => {
    setTimeout(() => {
      // If the voucher shows a Price Level field (same row as Party), that is the
      // next editable stop before the ledger — land on it so Enter walks Party →
      // Price Level → Sales/Purchase ledger. Only SalesVoucher renders it, so
      // every other trade voucher falls straight through to the ledger List.
      const priceLevel = document.querySelector('[data-price-level]') as HTMLElement | null;
      if (priceLevel) {
        openField(priceLevel); // focus + pop the dropdown so its list is shown
        return;
      }
      form.handleFieldFocus({ type: 'salesPurchase' });
    }, 0);
    setTimeout(() => form.handleFieldFocus({ type: 'salesPurchase' }), 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.handleFieldFocus]);

  // Inventory-only party vouchers have no sales/purchase ledger — go to item 1.
  const focusFirstStockItem = useCallback(() => {
    setTimeout(() => {
      (document.querySelector('[data-stock-item="1"]') as HTMLElement | null)?.focus();
    }, 0);
  }, []);

  const handleSaveDispatchDetails = useCallback(
    (details: any) => {
      form.setDispatchDetails(details);
      setShowDispatchDetails(false);
      setShowPartyDetails(true);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [form.setDispatchDetails],
  );

  const handleSaveOrderDetails = useCallback(
    (details: any) => {
      form.setOrderDetails(details);
      setShowOrderDetails(false);
      setShowPartyDetails(true);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [form.setOrderDetails],
  );

  // A saved order / receipt note was picked on the Order Details or Receipt
  // Details sub-screen — import that voucher's PENDING items into the grid:
  // ordered minus received/billed for orders, received minus rejected/billed
  // for notes (so a note of 12 with 2 rejected imports 10). The linking order
  // or tracking number is stamped on the allocations; the rows are ordinary
  // stock rows afterwards, fully editable.
  const handleImportVoucherItems = useCallback(
    async (voucherId: number, stamp: { order_no?: string; tracking_no?: string }) => {
      try {
        const mode = stamp.order_no ? 'order' : 'tracking';
        const res = await (window as any).api.report.pendingVoucherItems?.(
          selectedCompany?.company_id,
          voucherId,
          mode,
        );
        if (!res?.success || !res.items?.length) return;
        const imported = res.items
          .map((s: any) => {
            const stockItem =
              form.allStockItems.find((it: any) => it.item_id === s.stock_item_id) ?? null;
            if (!stockItem) return null;
            const godownName =
              s.batch?.godown ??
              form.allGodowns.find((g: any) => g.godown_id === s.godown_id)?.name;
            return {
              ...makeStockRow(),
              stockItem,
              godown: form.allGodowns.find((g: any) => g.godown_id === s.godown_id) ?? null,
              unit: form.allUnits.find((u: any) => u.unit_id === s.unit_id) ?? null,
              quantityRaw: String(s.quantity ?? ''),
              billedQtyRaw: String(s.quantity ?? ''),
              rateRaw: String(s.rate ?? ''),
              amountRaw: String(s.amount ?? ''),
              batchAllocations: [
                {
                  batch_number: s.batch?.batch_number ?? '',
                  godown: godownName ?? undefined,
                  quantity: s.quantity,
                  actual_quantity: s.quantity,
                  rate: s.rate,
                  // Prefer the source note's OWN tracking/order number (the real
                  // link, e.g. "341") over the picked label (e.g. "No. 3"), so the
                  // saved invoice is recognised as billing that note and doesn't
                  // double-remove stock.
                  order_no: s.batch?.order_no ?? stamp.order_no ?? undefined,
                  tracking_no: s.batch?.tracking_no ?? stamp.tracking_no ?? undefined,
                  due_on: s.batch?.due_on ?? undefined,
                },
              ],
            };
          })
          .filter(Boolean);
        if (!imported.length) return;
        const existing = form.stockEntries.filter((r: any) => r.stockItem);
        form.setStockEntries([...existing, ...imported]);
      } catch {
        /* keep the popup usable even if the voucher can't be loaded */
      }
    },
    [
      selectedCompany,
      form.allStockItems,
      form.allGodowns,
      form.allUnits,
      form.stockEntries,
      form.setStockEntries,
    ],
  );

  const handleSaveReceiptDetails = useCallback(
    (details: any) => {
      form.setReceiptDetails(details);
      setShowReceiptDetails(false);
      setShowPartyDetails(true);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [form.setReceiptDetails],
  );

  const handleSavePartyDetails = useCallback(
    (details: any) => {
      form.setPartyDetails(details);
      if (details.state) {
        form.setPlaceOfSupply(details.state);
      }
      setShowPartyDetails(false);
      if (effectiveVoucherType === 'Credit Note') {
        setShowExciseDetails(true);
      } else if (effectiveVoucherType === 'Debit Note') {
        setShowDebitNoteExcise(true);
      } else if (effectiveVoucherType === 'Purchase') {
        // Purchase goes straight to the Purchase ledger List — the Manufacturer /
        // Importer Details popup is intentionally skipped.
        openSalesPurchaseLedger();
      } else if (effectiveVoucherType === 'Sales') {
        // Tally Sales chain: Dispatch → Party → VAT Details.
        setShowVatDetails(true);
      } else if (effectiveVoucherType === 'Delivery Note') {
        // Delivery Note renders the Party → Price Level → Sales ledger row, so
        // hand focus there (not straight to the first item).
        openSalesPurchaseLedger();
      } else {
        // Inventory-only party vouchers (Delivery/Receipt Note, Rejection In):
        // no further detail popup and no sales/purchase ledger → first item.
        focusFirstStockItem();
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [form.setPartyDetails, form.setPlaceOfSupply, effectiveVoucherType],
  );

  // Purchase chain terminal → open the Purchase ledger List.
  const handleSaveManufacturerDetails = useCallback(
    (details: any) => {
      form.setManufacturerImporterDetails(details);
      setShowManufacturerDetails(false);
      if (effectiveVoucherType === 'Purchase') openSalesPurchaseLedger();
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [form.setManufacturerImporterDetails, effectiveVoucherType, openSalesPurchaseLedger],
  );
  // Credit Note chain terminal → open the Sales ledger List.
  const handleSaveExciseDetails = useCallback(
    (details: any) => {
      form.setExciseDetails(details);
      setShowExciseDetails(false);
      if (effectiveVoucherType === 'Credit Note') openSalesPurchaseLedger();
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [form.setExciseDetails, effectiveVoucherType, openSalesPurchaseLedger],
  );

  // Debit Note chain terminal → open the Purchase ledger List.
  const handleSaveDebitNoteExcise = useCallback(
    (details: any) => {
      form.setDebitNoteDetails({ ...form.debitNoteDetails, ...details });
      setShowDebitNoteExcise(false);
      if (effectiveVoucherType === 'Debit Note') openSalesPurchaseLedger();
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      form.setDebitNoteDetails,
      form.debitNoteDetails,
      effectiveVoucherType,
      openSalesPurchaseLedger,
    ],
    [
      form.setDebitNoteDetails,
      form.debitNoteDetails,
      effectiveVoucherType,
      openSalesPurchaseLedger,
    ],
  );

  // Sales chain terminal → open the Sales ledger List.
  const handleSaveVatDetails = useCallback(
    (details: any) => {
      form.setVatDetails({ ...form.vatDetails, ...details });
      setShowVatDetails(false);
      if (effectiveVoucherType === 'Sales') openSalesPurchaseLedger();
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [form.setVatDetails, form.vatDetails, effectiveVoucherType, openSalesPurchaseLedger],
  );

  const handleSaveCreditNoteDetails = useCallback(
    (details: any) => {
      form.setCreditNoteDetails(details);
      setShowCreditNoteDetails(false);
      setShowPartyDetails(true);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [form.setCreditNoteDetails],
  );

  const handleSaveDebitNoteDetails = useCallback(
    (details: any) => {
      form.setDebitNoteDetails(details);
      setShowDebitNoteDetails(false);
      setShowPartyDetails(true);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [form.setDebitNoteDetails],
  );

  return {
    handleSaveBillWise,
    handleSaveCostCentre,
    handleSaveBankDetails,
    handleSaveCashDenomination,
    handleSaveDispatchDetails,
    handleSaveOrderDetails,
    handleImportVoucherItems,
    handleSaveReceiptDetails,
    handleSavePartyDetails,
    handleSaveManufacturerDetails,
    handleSaveExciseDetails,
    handleSaveDebitNoteExcise,
    handleSaveVatDetails,
    handleSaveCreditNoteDetails,
    handleSaveDebitNoteDetails,
  };
}
