import { useCallback } from 'react';
import type { useVoucherForm } from './useVoucherForm';
import { validateTaxLedgerSelection } from '../utils/interstate';
import type { InventoryAllocState } from './useStockEntryFlow';

// Enter-on-amount allocation dispatch (bank / bill-wise / cost-centre) and the
// selection-time twin that opens the same popups when a balancing row's amount
// auto-fills (so Enter is never pressed). Extracted from Vouchers.tsx; behaviour
// unchanged.
export function useAmountConfirmFlow(
  form: ReturnType<typeof useVoucherForm>,
  effectiveVoucherType: string,
  deps: {
    proceedToNextRow: (idx: number) => void;
    setInventoryAlloc: (v: InventoryAllocState | null) => void;
  },
) {
  const { proceedToNextRow, setInventoryAlloc } = deps;

  const handleAmountConfirm = useCallback(
    (row: any, idx: number) => {
      const { ledger, amountRaw, id } = row;
      const amount = Number(amountRaw) || 0;
      if (!ledger) {
        proceedToNextRow(idx);
        return;
      }

      // Contra / Receipt / Payment double-entry: bank allocation for any bank ledger
      if (
        effectiveVoucherType === 'Contra' ||
        (effectiveVoucherType === 'Receipt' && form.receiptEntryMode === 'double') ||
        (effectiveVoucherType === 'Payment' && form.paymentEntryMode === 'double')
      ) {
        if (form.checkIsBank(ledger)) {
          const allowCash =
            effectiveVoucherType === 'Receipt' || effectiveVoucherType === 'Contra'
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
        // Non-bank: only party ledgers (Sundry Debtors/Creditors) or bill-wise
        // ledgers continue to the bill-wise popup; anything else just advances.
        if (!(form.checkIsParty(ledger) || ledger.is_bill_wise === 1)) {
          proceedToNextRow(idx);
          return;
        }
      }

      if (form.checkIsParty(ledger) || ledger.is_bill_wise === 1) {
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
      effectiveVoucherType,
      form.paymentEntryMode,
      form.receiptEntryMode,
      form.checkIsBank,
      form.checkIsParty,
      form.checkIsCash,
      form.bankDetails,
      form.cashDenominations,
      form.setActiveAllocation,
      proceedToNextRow,
    ],
  );

  // In a double-entry voucher the balancing row's amount auto-fills the moment
  // its ledger is picked — so the user never presses Enter in the amount field,
  // and the allocation popup (bank / bill-wise / cost-centre), which only opens
  // from that Enter via handleAmountConfirm, is skipped. Detect a ledger that
  // needs an allocation and open it anyway, using the same balancing amount
  // (row state updates async, so we recompute it here).
  const handleLedgerSelectWithAllocation = useCallback(
    (item: any) => {
      const field = form.activeField;

      // Validate a GST tax ledger AT SELECTION TIME (not at Accept): block IGST on an
      // intra-state supply, CGST/SGST on an inter-state supply, and the SAME component
      // being added twice — with a clear message, so the wrong ledger is never added.
      if (field?.type === 'additional') {
        const otherTaxLedgers = form.additionalEntries
          .filter((r: any) => r.id !== field.rowId && r.ledger)
          .map((r: any) => r.ledger);
        const err = validateTaxLedgerSelection(
          item,
          {
            companyState: form.gstRegistration?.state_id,
            companyGstin: form.gstRegistration?.gstin,
            placeOfSupply:
              form.placeOfSupply && form.placeOfSupply !== 'Select'
                ? form.placeOfSupply
                : undefined,
            partyState: form.partyLedger?.state,
            partyGstin: form.partyLedger?.gstin,
          },
          otherTaxLedgers,
        );
        if (err) {
          form.setError(err);
          form.handleFieldBlur?.();
          return; // do NOT attach the ledger
        }
      }

      form.handleLedgerPanelSelect(item);

      // Payroll hierarchy auto-advance: category → first employee, employee → first
      // pay head, pay head → its amount. Mirrors TallyPrime's cursor flow.
      if (field?.type === 'payrollCategory') {
        const { groupId } = field as any;
        setTimeout(() => {
          const nodes = document.querySelectorAll(`[data-payroll-emp^="${groupId}-"]`);
          (nodes[0] as HTMLInputElement | null)?.focus();
        }, 50);
        return;
      }
      if (field?.type === 'payrollEmployee') {
        const { groupId, empRowId } = field as any;
        // Autofill this employee's pay heads from their saved Salary Details (Tally-style).
        form.autofillPayrollEmployee?.(groupId, empRowId, item);
        setTimeout(() => {
          const nodes = document.querySelectorAll(`[data-payroll-ph^="${groupId}-${empRowId}-"]`);
          (nodes[0] as HTMLInputElement | null)?.focus();
        }, 50);
        return;
      }
      if (field?.type === 'payrollPayHead') {
        const { groupId, empRowId, phRowId } = field as any;
        setTimeout(() => {
          (
            document.querySelector(
              `[data-payroll-amt="${groupId}-${empRowId}-${phRowId}"]`,
            ) as HTMLInputElement | null
          )?.focus();
        }, 50);
        return;
      }

      // Attendance: pick employee → Attendance/Production Type field; pick type → Value.
      if (
        effectiveVoucherType === 'Attendance' &&
        (field?.type === 'employee' || field?.type === 'attendanceType')
      ) {
        const idx = form.attendanceEntries.findIndex((r) => r.id === field.rowId);
        if (idx >= 0) {
          const sel =
            field.type === 'employee'
              ? `[data-att-type="${idx + 1}"]`
              : `[data-att-value="${idx + 1}"]`;
          setTimeout(() => {
            (document.querySelector(sel) as HTMLInputElement | null)?.focus();
          }, 50);
          return;
        }
      }

      // Journal / Reversing Journal / Memorandum: an inventory-affecting ledger
      // (Purchase/Sales Accounts) opens the Inventory Allocations sub-screen instead
      // of a typed amount — the ledger's amount is derived from the stock total.
      if (
        (effectiveVoucherType === 'Journal' ||
          effectiveVoucherType === 'Reversing Journal' ||
          effectiveVoucherType === 'Memorandum') &&
        field?.type === 'particular' &&
        form.checkLedgerGroup(item, ['purchase accounts', 'sales accounts'])
      ) {
        const row = form.journalRows.find((r) => r.id === field.rowId);
        setInventoryAlloc({
          rowId: field.rowId,
          ledgerName: item.name,
          isInward: form.checkLedgerGroup(item, ['purchase accounts']),
          dcType: row?.type ?? 'Dr',
          allowCostCentres: item.allow_cost_centres === 1,
        });
        return;
      }

      // Physical Stock: pick item → open the godown picker (with per-godown balances);
      // pick godown → move to Batch (batch item) or Quantity.
      if (
        effectiveVoucherType === 'Physical Stock' &&
        field?.type === 'stockItem' &&
        item?.item_id
      ) {
        form.fetchGodownBalances(item.item_id);
        const idx = form.stockEntries.findIndex((r) => r.id === field.rowId);
        setTimeout(() => {
          (
            document.querySelector(`[data-stock-godown="${idx + 1}"]`) as HTMLInputElement | null
          )?.focus();
        }, 50);
        return;
      }
      if (effectiveVoucherType === 'Physical Stock' && field?.type === 'stockGodown') {
        const idx = form.stockEntries.findIndex((r) => r.id === field.rowId);
        const row = form.stockEntries[idx];
        const isBatch = Number((row?.stockItem as any)?.track_batches) === 1;
        setTimeout(() => {
          const sel = isBatch ? `[data-stock-batch="${idx + 1}"]` : `[data-stock-qty="${idx + 1}"]`;
          (document.querySelector(sel) as HTMLInputElement | null)?.focus();
        }, 50);
        return;
      }

      // Stock Journal / Manufacturing Journal: pick item → godown picker (or, for a
      // batch-tracked item, the Stock Item Allocations popup); pick godown → quantity.
      // Rows live in two arrays (source = Consumption, destination = Production), so
      // resolve which side owns the active row to target the right field / direction.
      if (
        (effectiveVoucherType === 'Stock Journal' ||
          effectiveVoucherType === 'Manufacturing Journal') &&
        (field?.type === 'stockItem' || field?.type === 'stockGodown')
      ) {
        const srcIdx = form.sourceStockEntries.findIndex((r) => r.id === field.rowId);
        const onSource = srcIdx >= 0;
        const side = onSource ? 'source' : 'dest';
        const idx = onSource
          ? srcIdx
          : form.destinationStockEntries.findIndex((r) => r.id === field.rowId);
        if (idx >= 0) {
          // Batch-tracked item → Stock Item Allocations popup (Godown + Batch/Lot + Qty + Rate).
          if (field.type === 'stockItem' && item?.item_id && Number(item?.track_batches) === 1) {
            const unit = form.allUnits.find((u: any) => u.unit_id === item.unit_id) ?? null;
            form.setActiveAllocation({
              type: 'batch',
              rowId: field.rowId,
              itemId: item.item_id,
              itemName: item.name,
              quantity: 0,
              rate: 0,
              unitSymbol: unit?.symbol,
              trackMfg: Number(item.track_date_of_manufacturing) === 1,
              trackExpiry: Number(item.track_expiry) === 1,
              // Source consumes existing stock (outward); Destination produces it (inward).
              isInward: !onSource,
              showBatch: true,
              quantityDriven: true,
            });
            return;
          }
          const col = field.type === 'stockItem' ? 'godown' : 'qty';
          setTimeout(() => {
            (
              document.querySelector(
                `[data-${side}-${col}="${idx + 1}"]`,
              ) as HTMLInputElement | null
            )?.focus();
          }, 50);
          return;
        }
      }

      // Material In / Material Out (job work): order-tracked Stock Item Allocations
      // popup. Batch items additionally get Batch/Lot No. + Mfg/Expiry columns.
      if (
        (effectiveVoucherType === 'Material In' || effectiveVoucherType === 'Material Out') &&
        field?.type === 'stockItem' &&
        item?.item_id
      ) {
        const isBatch = Number(item?.track_batches) === 1;
        const unit = form.allUnits.find((u: any) => u.unit_id === item.unit_id) ?? null;
        form.setActiveAllocation({
          type: 'materialIn',
          rowId: field.rowId,
          itemId: item.item_id,
          itemName: item.name,
          rate: 0,
          unitSymbol: unit?.symbol,
          showBatch: isBatch,
          trackMfg: isBatch && Number(item.track_date_of_manufacturing) === 1,
          trackExpiry: isBatch && Number(item.track_expiry) === 1,
        });
        return;
      }

      // Job Work In/Out Order: open Job Work Item Allocations popup (godown + qty + rate,
      // with optional component sub-allocation when Track Components = Yes).
      if (
        (effectiveVoucherType === 'Job Work In Order' ||
          effectiveVoucherType === 'Job Work Out Order') &&
        field?.type === 'stockItem' &&
        item?.item_id
      ) {
        const unit = form.allUnits.find((u: any) => u.unit_id === item.unit_id) ?? null;
        const existingRow = form.stockEntries.find((e) => e.id === field.rowId);
        form.setActiveAllocation({
          type: 'jobWork',
          rowId: field.rowId,
          itemId: item.item_id,
          itemName: item.name,
          unitSymbol: unit?.symbol,
          orderNo: form.orderDetails?.order_nos,
          initialAllocations: existingRow?.jobWorkAllocations,
        });
        return;
      }

      // Sales / Purchase / Credit Note / Debit Note / Receipt Note (Tally behaviour):
      // the moment a stock item is picked, open the Stock Item Allocations popup.
      // Items that "maintain in batches" get the Batch/Lot columns; others get a
      // godown-only allocation (Godown + Tracking No.). Quantity & rate are entered
      // inside and written back on Accept.
      if (
        [
          'Sales',
          'Purchase',
          'Credit Note',
          'Debit Note',
          'Receipt Note',
          'Delivery Note',
          'Rejection In',
          'Rejection Out',
          'Purchase Order',
          'Sales Order',
        ].includes(effectiveVoucherType) &&
        field?.type === 'stockItem' &&
        item?.item_id
      ) {
        const isBatch = Number(item?.track_batches) === 1;
        const unit = form.allUnits.find((u: any) => u.unit_id === item.unit_id) ?? null;
        form.setActiveAllocation({
          type: 'batch',
          rowId: field.rowId,
          itemId: item.item_id,
          itemName: item.name,
          quantity: 0,
          rate: 0,
          unitSymbol: unit?.symbol,
          trackMfg: isBatch && Number(item.track_date_of_manufacturing) === 1,
          trackExpiry: isBatch && Number(item.track_expiry) === 1,
          // Credit Note (sales return) brings stock in; Debit Note (purchase return) sends it out.
          // Purchase Order is inward — lets you allocate to a new/existing batch lot.
          isInward: [
            'Purchase',
            'Receipt Note',
            'Rejection In',
            'Material In',
            'Credit Note',
            'Purchase Order',
          ].includes(effectiveVoucherType),
          showBatch: isBatch,
          quantityDriven: true,
        });
        return;
      }

      if (field?.type !== 'particular') return;

      const dbl =
        effectiveVoucherType === 'Contra'
          ? form.contraDoubleRows
          : effectiveVoucherType === 'Receipt' && form.receiptEntryMode === 'double'
            ? form.receiptDoubleRows
            : effectiveVoucherType === 'Payment' && form.paymentEntryMode === 'double'
              ? form.paymentDoubleRows
              : (effectiveVoucherType === 'Journal' ||
                    effectiveVoucherType === 'Reversing Journal' ||
                    effectiveVoucherType === 'Memorandum') &&
                  form.journalEntryMode === 'double'
                ? form.journalRows
                : null;
      if (!dbl) return;

      const isBankAllocVoucher =
        effectiveVoucherType === 'Contra' ||
        (effectiveVoucherType === 'Receipt' && form.receiptEntryMode === 'double') ||
        (effectiveVoucherType === 'Payment' && form.paymentEntryMode === 'double');

      // Only act for ledgers that actually open an allocation popup — bank (in a
      // bank-allocation voucher), a party (Sundry Debtor/Creditor), any bill-wise
      // ledger, or a cost-centre ledger. Anything else is left untouched.
      const opensPopup =
        (isBankAllocVoucher && form.checkIsBank(item)) ||
        form.checkIsParty(item) ||
        item.is_bill_wise === 1 ||
        item.allow_cost_centres === 1;
      if (!opensPopup) return;

      const idx = dbl.findIndex((r) => r.id === field.rowId);
      const row = dbl[idx];
      if (!row) return;

      const drTotal = dbl.reduce((s, r) => s + (r.type === 'Dr' ? Number(r.amountRaw) || 0 : 0), 0);
      const crTotal = dbl.reduce((s, r) => s + (r.type === 'Cr' ? Number(r.amountRaw) || 0 : 0), 0);
      const existing = Number(row.amountRaw) || 0;
      const amount =
        existing > 0
          ? existing
          : Math.abs(row.type === 'Dr' ? crTotal - drTotal : drTotal - crTotal);

      // First row has no balancing figure yet → let the user type it (Enter then
      // opens the allocation through the normal path).
      if (amount <= 0.01) return;

      handleAmountConfirm({ ...row, ledger: item, amountRaw: String(amount) }, idx);
    },
    [
      form.activeField,
      form.handleLedgerPanelSelect,
      form.autofillPayrollEmployee,
      form.checkIsBank,
      form.checkIsParty,
      form.sourceStockEntries,
      form.destinationStockEntries,
      form.attendanceEntries,
      form.contraDoubleRows,
      form.receiptDoubleRows,
      form.paymentDoubleRows,
      form.journalRows,
      form.receiptEntryMode,
      form.paymentEntryMode,
      form.journalEntryMode,
      form.setActiveAllocation,
      form.allUnits,
      form.checkLedgerGroup,
      form.stockEntries,
      form.orderDetails,
      form.gstRegistration,
      form.placeOfSupply,
      form.partyLedger,
      form.additionalEntries,
      form.setError,
      form.handleFieldBlur,
      effectiveVoucherType,
      handleAmountConfirm,
      setInventoryAlloc,
    ],
  );

  return { handleAmountConfirm, handleLedgerSelectWithAllocation };
}
