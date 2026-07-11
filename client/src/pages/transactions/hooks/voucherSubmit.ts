// Voucher save pipeline — validation + payload building + submission, extracted
// from useVoucherForm.ts (behaviour unchanged). Both functions receive the
// hook's namespaced state (meta / rows / ledgers) plus context values, exactly
// the closure surface the original useCallback bodies had.
import { parseDueOn } from '@/lib/dueDate';
import type { useVoucherMeta } from './useVoucherMeta';
import type { useVoucherLedgers } from './useVoucherLedgers';
import type { useVoucherRows } from './useVoucherRowsNew';

export interface VoucherSubmitCtx {
  companyId?: number;
  fyId?: number;
  effectiveVoucherType: string;
  meta: ReturnType<typeof useVoucherMeta>;
  rows: ReturnType<typeof useVoucherRows>;
  ledgers: ReturnType<typeof useVoucherLedgers>;
  editVoucherId?: number | null;
  onSaved?: () => void;
  gstRegistration: any | null;
  features: any;
  // Called after a successful create-save to clear the form for the next entry.
  resetForm: () => void;
  // Hands a freshly-created voucher to the inline e-Invoice flow (owned by the
  // voucher screen). Not called in edit mode.
  onNewVoucherSaved?: (info: {
    voucherId: number;
    savedNumber: string;
    partyGstin?: string;
    voucherType: string;
    provideEInvoice: 'Yes' | 'No';
  }) => void;
}

export function validateVoucher(ctx: VoucherSubmitCtx): string | null {
  const { companyId, fyId, effectiveVoucherType, meta, rows, ledgers } = ctx;
  if (!companyId) return 'No company selected.';
  // Attendance vouchers are stored in their own table and don't use the financial
  // year, so a not-yet-loaded FY must not block saving them.
  if (!fyId && effectiveVoucherType !== 'Attendance') return 'No active financial year.';

  if (effectiveVoucherType === 'Receipt') {
    if (rows.receiptEntryMode === 'single') {
      if (!rows.accountLedger) return 'Account (cash/bank ledger) is required.';
      const filled = rows.particulars.filter((p) => p.ledger && Number(p.amountRaw) >= 0);
      if (filled.length < 1) return 'At least one Particulars entry with an amount is required.';
    } else {
      const filled = rows.receiptDoubleRows.filter((r) => r.ledger && Number(r.amountRaw) >= 0);
      if (filled.length < 2) return 'At least two valid entries are required.';
      if (Math.abs(rows.debitTotal - rows.creditTotal) > 0.01)
        return `Debit (${rows.debitTotal.toFixed(2)}) and Credit (${rows.creditTotal.toFixed(2)}) totals must balance.`;
    }
  }

  if (effectiveVoucherType === 'Payment') {
    if (rows.paymentEntryMode === 'single') {
      if (!rows.accountLedger) return 'Account (cash/bank ledger) is required.';
      const filled = rows.particulars.filter((p) => p.ledger && Number(p.amountRaw) > 0);
      if (filled.length < 1) return 'At least one Particulars entry with an amount is required.';
      if (rows.particularsTotal <= 0) return 'Total amount must be greater than zero.';
    } else {
      const filled = rows.paymentDoubleRows.filter((r) => r.ledger && Number(r.amountRaw) > 0);
      if (filled.length < 2) return 'At least two valid entries are required.';
      if (Math.abs(rows.debitTotal - rows.creditTotal) > 0.01)
        return `Debit (${rows.debitTotal.toFixed(2)}) and Credit (${rows.creditTotal.toFixed(2)}) totals must balance.`;
      if (rows.debitTotal <= 0) return 'Amount must be greater than zero.';
    }
  }

  if (effectiveVoucherType === 'Contra') {
    if (rows.contraEntryMode === 'single') {
      if (!rows.accountLedger) return 'Account (cash/bank ledger) is required.';
      if (!ledgers.checkIsCashOrBank(rows.accountLedger))
        return 'Contra Account must be a Cash or Bank ledger.';
      const filled = rows.particulars.filter((p) => p.ledger && Number(p.amountRaw) >= 0);
      if (filled.length < 1) return 'At least one Particulars entry with an amount is required.';
      for (const row of filled) {
        if (!ledgers.checkIsCashOrBank(row.ledger))
          return 'Contra vouchers may only use Cash/Bank ledgers on both sides.';
      }
    } else {
      const filled = rows.contraDoubleRows.filter((r) => r.ledger && Number(r.amountRaw) >= 0);
      if (filled.length < 2) return 'At least two valid entries are required.';
      for (const row of filled) {
        if (!ledgers.checkIsCashOrBank(row.ledger))
          return 'Contra vouchers may only use Cash/Bank ledgers.';
      }
      if (Math.abs(rows.debitTotal - rows.creditTotal) > 0.01)
        return `Debit (${rows.debitTotal.toFixed(2)}) and Credit (${rows.creditTotal.toFixed(2)}) totals must balance.`;
    }
  }

  if (effectiveVoucherType === 'Journal' || effectiveVoucherType === 'Reversing Journal') {
    if (rows.journalEntryMode === 'single') {
      if (!rows.accountLedger) return 'Account ledger is required.';
      const filled = rows.particulars.filter((p) => p.ledger && Number(p.amountRaw) > 0);
      if (filled.length < 1) return 'At least one Particulars entry with an amount is required.';
      if (rows.particularsTotal <= 0) return 'Total amount must be greater than zero.';
    } else {
      const filled = rows.journalRows.filter((r) => r.ledger && Number(r.amountRaw) > 0);
      if (filled.length < 2) return 'At least two valid Journal entries are required.';
      // Journal (like Reversing Journal) may use any ledger, including Cash/Bank.
      if (Math.abs(rows.debitTotal - rows.creditTotal) > 0.01)
        return `Debit (${rows.debitTotal.toFixed(2)}) and Credit (${rows.creditTotal.toFixed(2)}) totals must balance.`;
      if (rows.debitTotal <= 0) return 'Journal amount must be greater than zero.';
    }
  }

  // Memorandum is a non-accounting voucher entered like a double-entry Journal,
  // but (unlike Journal) it may use any ledger, including Cash/Bank.
  if (effectiveVoucherType === 'Memorandum') {
    const filled = rows.journalRows.filter((r) => r.ledger && Number(r.amountRaw) > 0);
    if (filled.length < 2) return 'At least two valid entries are required.';
    if (Math.abs(rows.debitTotal - rows.creditTotal) > 0.01)
      return `Debit (${rows.debitTotal.toFixed(2)}) and Credit (${rows.creditTotal.toFixed(2)}) totals must balance.`;
    if (rows.debitTotal <= 0) return 'Amount must be greater than zero.';
  }

  if (
    [
      'Sales',
      'Purchase',
      'Credit Note',
      'Debit Note',
      'Delivery Note',
      'Receipt Note',
      'Rejection In',
      'Rejection Out',
      'Material In',
      'Material Out',
    ].includes(effectiveVoucherType)
  ) {
    if (!rows.partyLedger) return 'Party A/c Name is required.';
    // Delivery Note / Receipt Note / Rejection In / Rejection Out are non-accounting
    // inventory vouchers in Tally — no Sales/Purchase ledger is posted, so unlike
    // Sales/Purchase/Credit Note/Debit Note it is never required here.
    const needsLedger = ['Sales', 'Purchase', 'Credit Note', 'Debit Note'].includes(
      effectiveVoucherType,
    );
    if (needsLedger && !rows.salesPurchaseLedger) {
      const baseLabel =
        effectiveVoucherType === 'Credit Note'
          ? 'Sales'
          : effectiveVoucherType === 'Debit Note'
            ? 'Purchase'
            : effectiveVoucherType;
      return `${baseLabel} Ledger is required.`;
    }
    if (needsLedger && rows.partyLedger.ledger_id === rows.salesPurchaseLedger.ledger_id)
      return `Party and ${effectiveVoucherType} ledger cannot be the same account.`;
    const filledItems = rows.stockEntries.filter(
      (r) => r.stockItem && Number(r.quantityRaw) > 0 && Number(r.rateRaw) > 0,
    );
    if (filledItems.length === 0)
      return 'At least one Stock Item with quantity and rate is required.';
    if (rows.totalAmount <= 0) return 'Total amount must be greater than zero.';
    // Negative stock is a non-blocking warning (shown as a banner), never a
    // hard error — Tally allows the entry to save. Do not block here.
  }

  // Order vouchers: stock entries only, no accounting, no stock balance effect
  if (
    ['Purchase Order', 'Sales Order', 'Job Work In Order', 'Job Work Out Order'].includes(
      effectiveVoucherType,
    )
  ) {
    if (!rows.partyLedger) return 'Party A/c Name is required.';
    const filledItems = rows.stockEntries.filter((r) => r.stockItem && Number(r.quantityRaw) > 0);
    if (filledItems.length === 0) return 'At least one Stock Item with quantity is required.';
  }

  if (effectiveVoucherType === 'Manufacturing Journal') {
    const filledSource = rows.sourceStockEntries.filter(
      (r) => r.stockItem && Number(r.quantityRaw) > 0,
    );
    const filledDest = rows.destinationStockEntries.filter(
      (r) => r.stockItem && Number(r.quantityRaw) > 0,
    );
    if (filledSource.length === 0 && filledDest.length === 0) {
      return 'At least one Stock Item is required (either Source or Destination).';
    }
    // Negative stock is a non-blocking warning (shown as a banner), never a
    // hard error — Tally allows the entry to save. Do not block here.
  }

  if (effectiveVoucherType === 'Physical Stock') {
    const filled = rows.stockEntries.filter((r) => r.stockItem && Number(r.quantityRaw) > 0);
    if (filled.length === 0) return 'At least one Stock Item with quantity is required.';
  }

  if (effectiveVoucherType === 'Stock Journal') {
    const filledSource = rows.sourceStockEntries.filter(
      (r) => r.stockItem && Number(r.quantityRaw) > 0,
    );
    const filledDest = rows.destinationStockEntries.filter(
      (r) => r.stockItem && Number(r.quantityRaw) > 0,
    );
    if (filledSource.length === 0 && filledDest.length === 0) {
      return 'At least one Stock Item is required (either Source or Destination).';
    }
    // Negative stock is a non-blocking warning (shown as a banner), never a
    // hard error — Tally allows the entry to save. Do not block here.
  }

  if (effectiveVoucherType === 'Attendance') {
    const filled = rows.attendanceEntries.filter(
      (r) => r.employee && r.attendanceType && Number(r.valueRaw) > 0,
    );
    if (filled.length === 0)
      return 'At least one Attendance entry with a positive value is required.';
  }

  if (effectiveVoucherType === 'Payroll') {
    if (!rows.accountLedger) return 'Account (cash/bank ledger) is required.';
    const filled = rows.payrollEntriesFromGroups.filter(
      (r) => r.employee && r.payHead && Number(r.amountRaw) > 0,
    );
    if (filled.length === 0)
      return 'At least one Payroll entry with a positive amount is required.';
  }

  // Manufacturing Date can never be later than the voucher date — Tally rejects
  // a future manufacture date. Applies to every batch-tracked stock row across
  // all voucher types (main table + Stock/Mfg Journal source & destination).
  const allStockRows = [
    ...rows.stockEntries,
    ...(rows.sourceStockEntries ?? []),
    ...(rows.destinationStockEntries ?? []),
  ];
  const futureMfg = allStockRows.find((r) => {
    const iso = parseDueOn((r as any).mfgDate, meta.date);
    return iso && meta.date && iso > meta.date;
  });
  if (futureMfg)
    return `Manufacturing Date (${(futureMfg as any).mfgDate}) cannot be after the voucher date (${meta.date}).`;

  return null;
}

export async function submitVoucher(ctx: VoucherSubmitCtx & { validate: () => string | null }) {
  const {
    validate,
    companyId,
    fyId,
    effectiveVoucherType,
    meta,
    rows,
    ledgers,
    editVoucherId,
    onSaved,
    gstRegistration,
    resetForm,
    onNewVoucherSaved,
  } = ctx;
  const validationError = validate();
  if (validationError) {
    meta.setError(validationError);
    return;
  }

  meta.setIsSubmitting(true);
  meta.setError(null);
  meta.setSuccess(null);

  try {
    let entries: any[] = [];
    let stock_entries: any[] = [];

    // ── Build accounting entries ─────────────────────────────────────────

    if (effectiveVoucherType === 'Receipt') {
      if (rows.receiptEntryMode === 'single') {
        entries.push({
          ledger_id: rows.accountLedger!.ledger_id,
          ledger_name: rows.accountLedger!.name,
          type: 'Dr',
          amount: rows.particularsTotal,
        });
        entries.push(
          ...rows.particulars
            .filter((p) => p.ledger && Number(p.amountRaw) > 0)
            .map((p) => ({
              ledger_id: p.ledger!.ledger_id,
              ledger_name: p.ledger!.name,
              type: p.type,
              amount: Number(p.amountRaw),
              currency: 'INR',
              cost_centres: p.costCentres,
            })),
        );
      } else {
        entries = rows.receiptDoubleRows
          .filter((r) => r.ledger && Number(r.amountRaw) > 0)
          .map((r) => ({
            ledger_id: r.ledger!.ledger_id,
            ledger_name: r.ledger!.name,
            type: r.type,
            amount: Number(r.amountRaw),
            currency: 'INR',
            cost_centres: r.costCentres,
          }));
      }
    } else if (effectiveVoucherType === 'Payment') {
      if (rows.paymentEntryMode === 'single') {
        entries.push({
          ledger_id: rows.accountLedger!.ledger_id,
          ledger_name: rows.accountLedger!.name,
          type: 'Cr',
          amount: rows.particularsTotal,
        });
        entries.push(
          ...rows.particulars
            .filter((p) => p.ledger && Number(p.amountRaw) > 0)
            .map((p) => ({
              ledger_id: p.ledger!.ledger_id,
              ledger_name: p.ledger!.name,
              type: p.type,
              amount: Number(p.amountRaw),
              currency: 'INR',
              cost_centres: p.costCentres,
            })),
        );
      } else {
        entries = rows.paymentDoubleRows
          .filter((r) => r.ledger && Number(r.amountRaw) > 0)
          .map((r) => ({
            ledger_id: r.ledger!.ledger_id,
            ledger_name: r.ledger!.name,
            type: r.type,
            amount: Number(r.amountRaw),
            currency: 'INR',
            cost_centres: r.costCentres,
          }));
      }
    } else if (effectiveVoucherType === 'Contra') {
      if (rows.contraEntryMode === 'single') {
        entries.push({
          ledger_id: rows.accountLedger!.ledger_id,
          ledger_name: rows.accountLedger!.name,
          type: 'Cr',
          amount: rows.particularsTotal,
        });
        entries.push(
          ...rows.particulars
            .filter((p) => p.ledger && Number(p.amountRaw) > 0)
            .map((p) => ({
              ledger_id: p.ledger!.ledger_id,
              ledger_name: p.ledger!.name,
              type: p.type,
              amount: Number(p.amountRaw),
              currency: 'INR',
              cost_centres: p.costCentres,
            })),
        );
      } else {
        entries = rows.contraDoubleRows
          .filter((r) => r.ledger && Number(r.amountRaw) > 0)
          .map((r) => ({
            ledger_id: r.ledger!.ledger_id,
            ledger_name: r.ledger!.name,
            type: r.type,
            amount: Number(r.amountRaw),
            currency: 'INR',
            cost_centres: r.costCentres,
          }));
      }
    } else if (
      effectiveVoucherType === 'Journal' ||
      effectiveVoucherType === 'Reversing Journal' ||
      effectiveVoucherType === 'Memorandum'
    ) {
      if (rows.journalEntryMode === 'single') {
        entries.push({
          ledger_id: rows.accountLedger!.ledger_id,
          ledger_name: rows.accountLedger!.name,
          type: 'Cr',
          amount: rows.particularsTotal,
        });
        entries.push(
          ...rows.particulars
            .filter((p) => p.ledger && Number(p.amountRaw) > 0)
            .map((p) => ({
              ledger_id: p.ledger!.ledger_id,
              ledger_name: p.ledger!.name,
              type: p.type,
              amount: Number(p.amountRaw),
              currency: 'INR',
              cost_centres: p.costCentres,
            })),
        );
      } else {
        entries = rows.journalRows
          .filter((r) => r.ledger && Number(r.amountRaw) > 0)
          .map((r) => ({
            ledger_id: r.ledger!.ledger_id,
            ledger_name: r.ledger!.name,
            type: r.type,
            amount: Number(r.amountRaw),
            currency: 'INR',
            cost_centres: r.costCentres,
          }));
        // Inventory-affecting ledgers (Purchase/Sales A/c) carry stock lines entered
        // via the Inventory Allocations sub-screen — flatten them into the voucher's
        // stock entries (persisted generically by the backend).
        stock_entries = rows.journalRows
          .filter((r) => r.inventoryAllocations?.length)
          .flatMap((r) =>
            r.inventoryAllocations!.map((it) => ({
              stock_item_id: it.stock_item_id,
              item_name: it.item_name,
              godown_id: it.godown_id ?? null,
              unit_id: it.unit_id ?? null,
              quantity: it.quantity,
              rate: it.rate,
              amount: it.amount,
              batches: it.batches && it.batches.length ? it.batches : undefined,
            })),
          );
      }
    } else if (
      [
        'Sales',
        'Purchase',
        'Credit Note',
        'Debit Note',
        'Delivery Note',
        'Receipt Note',
        'Rejection In',
        'Rejection Out',
        'Material In',
        'Material Out',
      ].includes(effectiveVoucherType)
    ) {
      const filledItems = rows.stockEntries.filter(
        (r) => r.stockItem && Number(r.quantityRaw) > 0 && Number(r.rateRaw) > 0,
      );
      const stockSubtotal = filledItems.reduce((s, r) => s + (Number(r.amountRaw) || 0), 0);
      stock_entries = filledItems.map((r) => ({
        stock_item_id: r.stockItem!.item_id ?? null,
        item_name: r.stockItem!.name,
        description: r.descriptionRaw?.trim() || null,
        godown_id: r.godown?.godown_id ?? null,
        unit_id: r.unit?.unit_id ?? null,
        quantity: Number(r.quantityRaw),
        rate: Number(r.rateRaw),
        amount: Number(r.amountRaw),
        batches: r.batchAllocations && r.batchAllocations.length ? r.batchAllocations : undefined,
        excise_item_details: r.exciseItemDetails || undefined,
      }));
      const isInventoryOnly = [
        'Delivery Note',
        'Receipt Note',
        'Rejection In',
        'Rejection Out',
        'Material In',
        'Material Out',
      ].includes(effectiveVoucherType);
      if (!isInventoryOnly) {
        // Only Purchase inverts sides (party Cr, ledger Dr, input GST Dr). Sales,
        // Credit Note and Debit Note all keep party Dr / ledger Cr / GST Cr — matching
        // the GST engine's party-side rule so the voucher stays balanced on save.
        const isPurchaseLike = effectiveVoucherType === 'Purchase';
        const partyType: 'Dr' | 'Cr' = isPurchaseLike ? 'Cr' : 'Dr';
        const spType: 'Dr' | 'Cr' = isPurchaseLike ? 'Dr' : 'Cr';

        entries = [
          {
            ledger_id: rows.partyLedger!.ledger_id,
            ledger_name: rows.partyLedger!.name,
            type: partyType,
            amount: rows.totalAmount,
            currency: 'INR',
          },
          {
            ledger_id: rows.salesPurchaseLedger!.ledger_id,
            ledger_name: rows.salesPurchaseLedger!.name,
            type: spType,
            amount: stockSubtotal,
            currency: 'INR',
          },
          ...(['Sales', 'Purchase', 'Credit Note', 'Debit Note'].includes(effectiveVoucherType)
            ? rows.additionalEntries
                .filter((p) => p.ledger && Number(p.amountRaw) > 0)
                .map((p) => ({
                  ledger_id: p.ledger!.ledger_id,
                  ledger_name: p.ledger!.name,
                  type: p.type,
                  amount: Number(p.amountRaw),
                  currency: 'INR',
                  cost_centres: p.costCentres,
                }))
            : []),
        ];
      }
    } else if (effectiveVoucherType === 'Stock Journal') {
      const filledSource = rows.sourceStockEntries.filter(
        (r) => r.stockItem && Number(r.quantityRaw) > 0,
      );
      const filledDest = rows.destinationStockEntries.filter(
        (r) => r.stockItem && Number(r.quantityRaw) > 0,
      );
      stock_entries = [
        ...filledSource.map((r) => ({
          stock_item_id: r.stockItem!.item_id ?? null,
          item_name: r.stockItem!.name,
          godown_id: r.godown?.godown_id ?? null,
          unit_id: r.unit?.unit_id ?? null,
          quantity: Number(r.quantityRaw),
          rate: Number(r.rateRaw),
          amount: Number(r.amountRaw),
          batches: r.batchAllocations && r.batchAllocations.length ? r.batchAllocations : undefined,
          is_source: 1,
        })),
        ...filledDest.map((r) => ({
          stock_item_id: r.stockItem!.item_id ?? null,
          item_name: r.stockItem!.name,
          godown_id: r.godown?.godown_id ?? null,
          unit_id: r.unit?.unit_id ?? null,
          quantity: Number(r.quantityRaw),
          rate: Number(r.rateRaw),
          amount: Number(r.amountRaw),
          batches: r.batchAllocations && r.batchAllocations.length ? r.batchAllocations : undefined,
          is_source: 0,
        })),
      ];
    } else if (effectiveVoucherType === 'Manufacturing Journal') {
      const filledSource = rows.sourceStockEntries.filter(
        (r) => r.stockItem && Number(r.quantityRaw) > 0,
      );
      const filledDest = rows.destinationStockEntries.filter(
        (r) => r.stockItem && Number(r.quantityRaw) > 0,
      );
      stock_entries = [
        ...filledSource.map((r) => ({
          stock_item_id: r.stockItem!.item_id ?? null,
          item_name: r.stockItem!.name,
          godown_id: r.godown?.godown_id ?? null,
          unit_id: r.unit?.unit_id ?? null,
          quantity: Number(r.quantityRaw),
          rate: Number(r.rateRaw),
          amount: Number(r.amountRaw),
          batches: r.batchAllocations && r.batchAllocations.length ? r.batchAllocations : undefined,
          is_source: 1,
        })),
        ...filledDest.map((r) => ({
          stock_item_id: r.stockItem!.item_id ?? null,
          item_name: r.stockItem!.name,
          godown_id: r.godown?.godown_id ?? null,
          unit_id: r.unit?.unit_id ?? null,
          quantity: Number(r.quantityRaw),
          rate: Number(r.rateRaw),
          amount: Number(r.amountRaw),
          batches: r.batchAllocations && r.batchAllocations.length ? r.batchAllocations : undefined,
          is_source: 0,
        })),
      ];
    } else if (
      ['Purchase Order', 'Sales Order', 'Job Work In Order', 'Job Work Out Order'].includes(
        effectiveVoucherType,
      )
    ) {
      const filledItems = rows.stockEntries.filter((r) => r.stockItem && Number(r.quantityRaw) > 0);
      const isJobWork =
        effectiveVoucherType === 'Job Work In Order' ||
        effectiveVoucherType === 'Job Work Out Order';
      stock_entries = filledItems.map((r) => {
        let batches: any[] | undefined;
        if (isJobWork && r.jobWorkAllocations?.length) {
          // Flatten jobWorkAllocations into voucher_batches rows.
          // Main row: batch_number = "JW:<idx>"; component rows: component_of = item name,
          // consider_as_scrap = "JW:<parentIdx>" to reconstruct the parent link on load.
          batches = r.jobWorkAllocations.flatMap((alloc, allocIdx) => [
            {
              batch_number: `JW:${allocIdx}`,
              due_on: alloc.due_on,
              godown: alloc.godown,
              quantity: alloc.quantity,
              actual_quantity: alloc.quantity,
              rate: alloc.rate,
              order_no: meta.orderDetails?.order_nos ?? '',
            },
            ...(alloc.components ?? []).map((comp) => ({
              batch_number: comp.batch_lot || '',
              tracking_no: comp.track || 'Pending to Issue',
              due_on: comp.due_on,
              godown: comp.godown,
              quantity: comp.actual_qty,
              actual_quantity: comp.as_per_bom,
              rate: comp.rate,
              component_of: comp.item_name,
              consider_as_scrap: `JW:${allocIdx}`,
            })),
          ]);
        } else if (r.batchAllocations?.length) {
          batches = r.batchAllocations;
        }
        return {
          stock_item_id: r.stockItem!.item_id ?? null,
          item_name: r.stockItem!.name,
          godown_id: r.godown?.godown_id ?? null,
          unit_id: r.unit?.unit_id ?? null,
          quantity: Number(r.quantityRaw),
          rate: Number(r.rateRaw),
          amount: Number(r.amountRaw),
          batches,
        };
      });
    }

    // ── Collect bill references ──────────────────────────────────────────
    let finalBillReferences: any[] = [];
    if (effectiveVoucherType === 'Receipt') {
      finalBillReferences =
        rows.receiptEntryMode === 'single'
          ? rows.particulars
              .filter((p) => p.ledger && p.billReferences?.length)
              .flatMap((p) =>
                p.billReferences!.map((b) => ({ ...b, ledger_id: p.ledger!.ledger_id })),
              )
          : rows.receiptDoubleRows
              .filter((r) => r.ledger && r.billReferences?.length)
              .flatMap((r) =>
                r.billReferences!.map((b) => ({ ...b, ledger_id: r.ledger!.ledger_id })),
              );
    } else if (effectiveVoucherType === 'Payment') {
      finalBillReferences =
        rows.paymentEntryMode === 'single'
          ? rows.particulars
              .filter((p) => p.ledger && p.billReferences?.length)
              .flatMap((p) =>
                p.billReferences!.map((b) => ({ ...b, ledger_id: p.ledger!.ledger_id })),
              )
          : rows.paymentDoubleRows
              .filter((r) => r.ledger && r.billReferences?.length)
              .flatMap((r) =>
                r.billReferences!.map((b) => ({ ...b, ledger_id: r.ledger!.ledger_id })),
              );
    } else if (effectiveVoucherType === 'Contra') {
      finalBillReferences =
        rows.contraEntryMode === 'single'
          ? rows.particulars
              .filter((p) => p.ledger && p.billReferences?.length)
              .flatMap((p) =>
                p.billReferences!.map((b) => ({ ...b, ledger_id: p.ledger!.ledger_id })),
              )
          : rows.contraDoubleRows
              .filter((r) => r.ledger && r.billReferences?.length)
              .flatMap((r) =>
                r.billReferences!.map((b) => ({ ...b, ledger_id: r.ledger!.ledger_id })),
              );
    } else if (
      effectiveVoucherType === 'Journal' ||
      effectiveVoucherType === 'Reversing Journal' ||
      effectiveVoucherType === 'Memorandum'
    ) {
      finalBillReferences = rows.journalRows
        .filter((r) => r.ledger && r.billReferences?.length)
        .flatMap((r) => r.billReferences!.map((b) => ({ ...b, ledger_id: r.ledger!.ledger_id })));
    } else if (
      [
        'Sales',
        'Purchase',
        'Credit Note',
        'Debit Note',
        'Delivery Note',
        'Receipt Note',
        'Rejection In',
        'Rejection Out',
        'Material In',
        'Material Out',
      ].includes(effectiveVoucherType)
    ) {
      if (rows.partyLedger && meta.partyBillReferences.length > 0) {
        finalBillReferences = meta.partyBillReferences.map((b) => ({
          ...b,
          ledger_id: rows.partyLedger!.ledger_id,
        }));
      }
      finalBillReferences = [
        ...finalBillReferences,
        ...rows.additionalEntries
          .filter((p) => p.ledger && p.billReferences?.length)
          .flatMap((p) => p.billReferences!.map((b) => ({ ...b, ledger_id: p.ledger!.ledger_id }))),
      ];
    }

    // ── Final payload / API submission ──────────────────────────────────
    let res: any;
    if (effectiveVoucherType === 'Physical Stock') {
      const physicalLines = rows.stockEntries
        .filter((r) => r.stockItem && Number(r.quantityRaw) > 0)
        .map((r, lineIdx) => ({
          stock_item_id: r.stockItem!.item_id,
          godown_id: r.godown?.godown_id ?? null,
          batch_no: r.batchNo || null,
          lot_no: r.lotNo || null,
          manufacturing_date: r.mfgDate || null,
          expiry_date: r.expiryDate || null,
          quantity: Number(r.quantityRaw),
          rate: Number(r.rateRaw) || 0,
          amount: Number(r.amountRaw) || 0,
          line_order: lineIdx + 1,
        }));
      res = await window.api.physicalStock.create({
        company_id: companyId!,
        voucher_no: meta.voucherNumber,
        voucher_date: meta.date,
        reference_no: meta.referenceNumber || null,
        narration: meta.narration || null,
        is_optional: meta.isOptional ? 1 : 0,
        is_post_dated: meta.status === 'Post-Dated' ? 1 : 0,
        lines: physicalLines,
      });
    } else if (effectiveVoucherType === 'Attendance') {
      const attEntries = rows.attendanceEntries
        .filter((r) => r.employee && r.attendanceType)
        .map((r) => ({
          employee_id: r.employee!.employee_id,
          attendance_type_id: r.attendanceType!.attendance_type_id,
          value: Number(r.valueRaw) || 0,
        }));
      res = await window.api.attendance.create({
        company_id: companyId!,
        voucher_number: meta.voucherNumber,
        date: meta.date,
        narration: meta.narration || null,
        entries: attEntries,
      });
    } else {
      const isInventoryOnly = [
        'Delivery Note',
        'Receipt Note',
        'Rejection In',
        'Rejection Out',
        'Material In',
        'Material Out',
        'Stock Journal',
        'Manufacturing Journal',
      ].includes(effectiveVoucherType);
      const isOrderVoucher = [
        'Purchase Order',
        'Sales Order',
        'Job Work In Order',
        'Job Work Out Order',
      ].includes(effectiveVoucherType);
      const hasAccountingEntries = ['Sales', 'Purchase', 'Credit Note', 'Debit Note'].includes(
        effectiveVoucherType,
      );
      // Memorandum: non-accounting. Store its Dr/Cr entries but mark the voucher
      // optional so it is excluded from all ledger-balance and report queries
      // (which already filter out is_optional = 1) — it must not affect the books.
      const isNonAccounting = effectiveVoucherType === 'Memorandum';
      // Reversing Journal: a balanced accounting entry (server validates Dr=Cr) but
      // non-posting — like Tally's scenario vouchers it shows in the Day Book yet is
      // excluded from ledger balances/reports (is_optional = 1). Carries an
      // "Applicable Upto" date.
      const isReversingJournal = effectiveVoucherType === 'Reversing Journal';
      const partyLedgerTypes = [
        'Sales',
        'Purchase',
        'Credit Note',
        'Debit Note',
        'Delivery Note',
        'Receipt Note',
        'Rejection In',
        'Rejection Out',
        'Material In',
        'Material Out',
        'Purchase Order',
        'Sales Order',
        'Job Work In Order',
        'Job Work Out Order',
      ];
      const payload: any = {
        company_id: companyId!,
        fy_id: fyId!,
        voucher_type: meta.voucherType,
        date: meta.date,
        status: meta.status,
        supplier_invoice_no: meta.supplierInvoiceNo || null,
        supplier_invoice_date: meta.supplierInvoiceDate || null,
        reference_number: meta.referenceNumber || null,
        reference_date: meta.referenceDate || null,
        place_of_supply: meta.placeOfSupply !== 'Select' ? meta.placeOfSupply : null,
        // Bug 5: persist the selected GST registration so it round-trips on reopen and
        // the backend snapshots the user's explicit choice (not just the company default).
        gst_registration_id: gstRegistration?.gst_id ?? null,
        voucher_class: meta.voucherClass || null,
        narration: meta.narration || null,
        // Payroll posts its net pay against the top "Account" (cash/bank) ledger, which
        // the payroll layout stores in accountLedger — not partyLedger. The backend needs
        // this id to add the balancing entry, else Dr/Cr won't equal on save.
        party_ledger_id:
          effectiveVoucherType === 'Payroll'
            ? (rows.accountLedger?.ledger_id ?? null)
            : partyLedgerTypes.includes(effectiveVoucherType)
              ? (rows.partyLedger?.ledger_id ?? null)
              : null,
        party_name:
          effectiveVoucherType === 'Payroll'
            ? (rows.accountLedger?.name ?? null)
            : partyLedgerTypes.includes(effectiveVoucherType)
              ? (rows.partyLedger?.name ?? null)
              : null,
        // Non-accounting vouchers (Receipt Note, orders) keep their Sales/Purchase
        // ledger on the voucher row since no accounting entry is posted for it.
        sales_purchase_ledger_id: rows.salesPurchaseLedger?.ledger_id ?? null,
        is_accounting_voucher: isInventoryOnly || isOrderVoucher || isNonAccounting ? 0 : 1,
        is_invoice: hasAccountingEntries ? 1 : 0,
        is_inventory_voucher:
          isInventoryOnly || isOrderVoucher || hasAccountingEntries || stock_entries.length > 0
            ? 1
            : 0,
        is_order_voucher:
          [
            'Delivery Note',
            'Receipt Note',
            'Rejection In',
            'Rejection Out',
            'Material In',
            'Material Out',
          ].includes(effectiveVoucherType) || isOrderVoucher
            ? 1
            : 0,
        is_optional: meta.isOptional || isNonAccounting || isReversingJournal ? 1 : 0,
        is_post_dated: meta.status === 'Post-Dated' ? 1 : 0,
        applicable_upto: isReversingJournal ? meta.applicableUpto || meta.date : null,
        entries: isInventoryOnly || isOrderVoucher ? [] : entries,
        stock_entries,
        bill_references: finalBillReferences.length > 0 ? finalBillReferences : undefined,
        bank_details: meta.bankDetails || undefined,
        cash_denominations: meta.cashDenominations || undefined,
        receipt_details:
          effectiveVoucherType === 'Receipt Note' ? meta.receiptDetails || undefined : undefined,
        party_details: meta.partyDetails || undefined,
        dispatch_details:
          effectiveVoucherType === 'Delivery Note' ||
          effectiveVoucherType === 'Job Work In Order' ||
          effectiveVoucherType === 'Job Work Out Order'
            ? meta.dispatchDetails || undefined
            : undefined,
        credit_note_details: meta.creditNoteDetails || undefined,
        debit_note_details: meta.debitNoteDetails || undefined,
        excise_details: meta.exciseDetails || undefined,
        vat_details: meta.vatDetails || undefined,
        gst_eway_details: meta.gstEwayDetails || undefined,
        manufacturer_importer_details: meta.manufacturerImporterDetails || undefined,
        order_details:
          meta.orderDetails || meta.sourceGodown
            ? {
                ...(meta.orderDetails || {}),
                source_godown_id: meta.sourceGodown?.godown_id ?? null,
                source_godown_name: meta.sourceGodown?.name ?? null,
              }
            : undefined,
        payroll_entries:
          effectiveVoucherType === 'Payroll'
            ? rows.payrollEntriesFromGroups
                .filter((r) => r.employee && r.payHead && Number(r.amountRaw) > 0)
                .map((r) => ({
                  employee_id: r.employee!.employee_id,
                  pay_head_id: r.payHead!.pay_head_id,
                  amount: Number(r.amountRaw),
                  category_id: r.category?.cc_cat_id ?? null,
                }))
            : undefined,
      };
      if (editVoucherId) {
        res = await window.api.voucher.update({ ...payload, voucher_id: editVoucherId });
      } else {
        res = await window.api.voucher.create(payload);
      }
    }

    if (res.success) {
      const savedNumber = meta.voucherNumber;
      // Surface any GST computation warnings (missing/zero rate, negative taxable value,
      // etc.) the engine returned — otherwise they were silently dropped on save.
      const warn =
        Array.isArray(res.warnings) && res.warnings.length
          ? ` Note: ${res.warnings.join(' ')}`
          : '';
      // Capture before resetForm() clears the form — needed for generate-at-save below.
      const newVoucherId = !editVoucherId ? (res as any).voucher?.voucher_id : null;
      const partyGstin = rows.partyLedger?.gstin;
      const provideEInvoice = meta.provideEInvoice;
      if (editVoucherId) {
        meta.setSuccess(`Voucher No. ${savedNumber} updated successfully.${warn}`);
        ledgers.fetchContextData();
        onSaved?.();
      } else {
        resetForm();
        meta.setSuccess(`Voucher No. ${savedNumber} saved successfully.${warn}`);
        ledgers.fetchContextData();
      }
      // Tally-style "generate after saving": hand a freshly-created voucher to the
      // inline e-Invoice flow owned by the voucher screen. It shows the "Do you want
      // to generate e-Invoice?" prompt when the user set "Provide e-Invoice details"
      // = Yes. `provideEInvoice` is captured above (before resetForm cleared it).
      // Never touches the already-saved voucher.
      if (newVoucherId) {
        onNewVoucherSaved?.({
          voucherId: newVoucherId,
          savedNumber: savedNumber || '',
          partyGstin,
          voucherType: effectiveVoucherType,
          provideEInvoice,
        });
      }
    } else {
      meta.setError(res.error || 'Failed to save voucher.');
    }
  } catch (e: any) {
    meta.setError(e?.message || 'Unexpected error.');
  } finally {
    meta.setIsSubmitting(false);
  }
}
