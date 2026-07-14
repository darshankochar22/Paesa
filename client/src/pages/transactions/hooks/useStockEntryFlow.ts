import { useCallback, useEffect, useRef } from 'react';
import type { useVoucherForm } from './useVoucherForm';
import { isFeatureEnabled } from '@/lib/companyFeatures';
import type { BatchAllocation, InventoryAllocationItem } from '../types';
import { makeStockRow } from '../utils/rowFactories';
import type { ExciseItemDetails } from '../components/popups/ItemExciseDetailsPopup';

// Per-item Excise Details sub-screen target (Credit Note / Sales / Purchase rows).
export interface ItemExciseState {
  rowId: string;
  itemName: string;
  initial: ExciseItemDetails | null;
}

// Inventory Allocations sub-screen for a Journal/Reversing Journal ledger row
// whose ledger affects inventory (Purchase/Sales A/c).
export interface InventoryAllocState {
  rowId: string;
  ledgerName: string;
  isInward: boolean;
  dcType: 'Dr' | 'Cr';
  allowCostCentres: boolean;
}

// Stock item entry focus flow (item selected → qty → rate → next row) plus the
// batch / material-in / job-work / item-excise / inventory allocation save
// handlers that write a popup's result back onto the row and advance the cursor.
// Extracted from Vouchers.tsx; behaviour unchanged.
export function useStockEntryFlow(
  form: ReturnType<typeof useVoucherForm>,
  effectiveVoucherType: string,
  deps: {
    itemExcise: ItemExciseState | null;
    setItemExcise: (v: ItemExciseState | null) => void;
    inventoryAlloc: InventoryAllocState | null;
    setInventoryAlloc: (v: InventoryAllocState | null) => void;
  },
) {
  const { itemExcise, setItemExcise, inventoryAlloc, setInventoryAlloc } = deps;

  const prevActiveFieldRef = useRef(form.activeField);

  useEffect(() => {
    const prev = prevActiveFieldRef.current;
    const curr = form.activeField;
    // Item picked → move to Quantity — but ONLY when no allocation popup opened.
    // Batch / order-tracked items (all Sales/Purchase items) open the Item
    // Allocations sub-screen on selection; that popup owns focus (Godown → Qty →
    // Rate) and writes qty/rate back on accept. Stealing focus to the main-grid
    // Quantity here left the popup unfocused, so Enter drove the voucher row.
    if (prev?.type === 'stockItem' && curr === null && !form.activeAllocation) {
      const rowIdx = form.stockEntries.findIndex((e) => e.id === prev.rowId);
      if (rowIdx >= 0 && form.stockEntries[rowIdx].stockItem) {
        setTimeout(() => {
          const el = document.querySelector(
            `[data-stock-qty="${rowIdx + 1}"]`,
          ) as HTMLInputElement | null;
          el?.focus();
        }, 50);
      }
    }
    prevActiveFieldRef.current = curr;
  }, [form.activeField, form.stockEntries, form.activeAllocation]);

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

  const advanceStockRow = useCallback(
    (idx: number) => {
      if (idx === form.stockEntries.length - 1) {
        form.handleAddStockRow();
      }
      setTimeout(() => {
        (
          document.querySelector(`[data-stock-item="${idx + 2}"]`) as HTMLInputElement | null
        )?.focus();
      }, 50);
    },
    [form.stockEntries.length, form.handleAddStockRow],
  );

  // Inward voucher types — mirrors the backend INWARD_TYPES; determines whether
  // the batch popup label reads Inward (new lots) or Outward (consume balances).
  const INWARD_VOUCHER_TYPES = [
    'Purchase',
    'Receipt Note',
    'Rejection In',
    'Material In',
    'Purchase Order',
  ];

  // Voucher types that prompt the per-item "Excise Details for <item>" sub-screen
  // once an item line is complete (mirrors TallyPrime). Gated further by the stock
  // item itself being Excise Applicable, so ordinary non-excise items don't pop it.
  const ITEM_EXCISE_VOUCHER_TYPES = ['Credit Note', 'Sales', 'Purchase'];

  // After an item row is complete: open its Excise Details popup when excise
  // applies to the item, otherwise just advance focus to the next item row.
  const promptItemExciseOrAdvance = useCallback(
    (rowId: string | undefined, idx: number) => {
      const row = form.stockEntries.find((e) => e.id === rowId);
      const applies =
        ITEM_EXCISE_VOUCHER_TYPES.includes(effectiveVoucherType) &&
        (row?.stockItem as any)?.excise_applicable === 'Applicable';
      if (applies) {
        setItemExcise({
          rowId,
          itemName: row?.stockItem?.name ?? '',
          initial: row?.exciseItemDetails ?? null,
        } as ItemExciseState);
        return;
      }
      if (idx >= 0) advanceStockRow(idx);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [form.stockEntries, effectiveVoucherType, advanceStockRow],
  );

  const proceedToNextStockRow = useCallback(
    (idx: number) => {
      const row = form.stockEntries[idx];
      const item = row?.stockItem;
      const qty = Number(row?.quantityRaw) || 0;
      // F11 "Enable Batches" gates the batch sub-screen — only a batch-tracked item
      // opens it, and only while the feature is on (else fall through to advance).
      const batchesOn = isFeatureEnabled(form.features, 'enable_batches');
      const expiryOn = isFeatureEnabled(form.features, 'maintain_expiry_date_for_batches');
      // Batch-tracked item → open the Stock Item Allocations sub-screen first.
      if (
        batchesOn &&
        item &&
        Number((item as any).track_batches) === 1 &&
        qty > 0 &&
        item.item_id
      ) {
        form.setActiveAllocation({
          type: 'batch',
          rowId: row.id,
          itemId: item.item_id,
          itemName: item.name,
          quantity: qty,
          rate: Number(row.rateRaw) || 0,
          unitSymbol: row.unit?.symbol,
          trackMfg: Number((item as any).track_date_of_manufacturing) === 1,
          trackExpiry: expiryOn && Number((item as any).track_expiry) === 1,
          isInward: INWARD_VOUCHER_TYPES.includes(effectiveVoucherType),
          initialAllocations: row.batchAllocations,
        });
        return; // advance happens after the popup is accepted
      }
      // Non-batch item complete → prompt Excise Details (if applicable) or advance.
      promptItemExciseOrAdvance(row?.id, idx);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      form.stockEntries,
      form.setActiveAllocation,
      effectiveVoucherType,
      advanceStockRow,
      promptItemExciseOrAdvance,
    ],
  );

  // Physical Stock: after entering a godown's quantity, add another godown row for
  // the SAME item and open its "List of Godowns" picker (instead of going to Rate).
  const handlePhysicalStockQtyEnter = useCallback(
    (idx: number) => {
      const row = form.stockEntries[idx];
      if (!row?.stockItem) {
        advanceStockRow(idx);
        return;
      }
      const newRow = makeStockRow();
      newRow.stockItem = row.stockItem;
      newRow.unit = row.unit;
      const newIdx = form.stockEntries.length; // appended at the end
      form.setStockEntries((prev) => [...prev, newRow]);
      setTimeout(() => {
        (
          document.querySelector(`[data-stock-godown="${newIdx + 1}"]`) as HTMLInputElement | null
        )?.focus();
      }, 50);
    },
    [form.stockEntries, form.setStockEntries, advanceStockRow],
  );

  // Physical Stock: end item entry (End of List / empty Enter on an item row) →
  // move to the Narration field.
  const physicalStockEndEntry = useCallback(() => {
    form.handleFieldBlur();
    setTimeout(() => {
      (document.querySelector(`[data-narration="true"]`) as HTMLInputElement | null)?.focus();
    }, 50);
  }, [form.handleFieldBlur]);

  // Physical Stock: "End of List" (or empty Enter) on a godown row finishes the
  // current item and starts a new one — the row becomes a fresh item row and the
  // List of Stock Items opens.
  const physicalStockGodownNewItem = useCallback(
    (rowId: string) => {
      const idx = form.stockEntries.findIndex((r) => r.id === rowId);
      form.setStockEntries((prev) =>
        prev.map((r) => (r.id === rowId ? { ...r, stockItem: null, godown: null, unit: null } : r)),
      );
      form.handleFieldBlur();
      setTimeout(() => {
        (
          document.querySelector(`[data-stock-item="${idx + 1}"]`) as HTMLInputElement | null
        )?.focus();
      }, 50);
    },
    [form.stockEntries, form.setStockEntries, form.handleFieldBlur],
  );

  // Stock Journal / Manufacturing Journal: a blank Enter on an empty item row means
  // "done with this side". From a Source row → jump to the Destination's first item;
  // from a Destination row → finish and move to Narration (ready to Accept).
  const handleStockJournalItemEndOfList = useCallback(() => {
    const af = form.activeField;
    if (af?.type !== 'stockItem') return;
    const onSource = form.sourceStockEntries.some((r) => r.id === af.rowId);
    form.handleFieldBlur();
    setTimeout(() => {
      const sel = onSource ? `[data-dest-item="1"]` : `[data-narration="true"]`;
      (document.querySelector(sel) as HTMLInputElement | null)?.focus();
    }, 50);
  }, [form.activeField, form.sourceStockEntries, form.handleFieldBlur]);

  // Journal / Reversing Journal / Memorandum: a blank Enter (or "End of List") on an
  // empty ledger row means "done entering" — close the picker and jump straight to
  // Narration (ready to Accept) instead of selecting the highlighted ledger.
  const journalParticularEndOfList = useCallback(() => {
    form.handleFieldBlur();
    setTimeout(() => {
      (document.querySelector(`[data-narration="true"]`) as HTMLInputElement | null)?.focus();
    }, 50);
  }, [form.handleFieldBlur]);

  // Trade vouchers: "End of List" (or a blank Enter) on the item field finishes
  // item entry — like TallyPrime — WITHOUT appending another stock row. The
  // current empty item row is left as-is; it carries no stock item, so voucher
  // save drops it (End of List is a navigation marker, never data).
  //
  // Sales / Purchase / Credit-Debit Note: TallyPrime then opens the List of
  // Ledger Accounts to add GST / other ledgers. We mirror that — ensure a
  // Tax/Ledger row exists, then focus its ledger cell, whose onFocus opens the
  // picker (an unfilled row is dropped on save: voucherSubmit filters additional
  // rows without a ledger + amount). Inventory-only party vouchers (Delivery /
  // Receipt Note) have no tax section, so they go straight to the Narration.
  const stockItemEndOfList = useCallback(() => {
    form.handleFieldBlur();
    const hasTaxSection = ['Sales', 'Purchase', 'Credit Note', 'Debit Note'].includes(
      effectiveVoucherType,
    );
    if (hasTaxSection && form.additionalEntries.length === 0) {
      form.handleAddAdditionalRow();
    }
    setTimeout(() => {
      const target = hasTaxSection
        ? ((document.querySelector('[data-additional-ledger="1"]') as HTMLElement | null) ??
          (document.querySelector('[data-narration="true"]') as HTMLElement | null))
        : (document.querySelector('[data-narration="true"]') as HTMLElement | null);
      target?.focus();
    }, 60);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    form.handleFieldBlur,
    form.additionalEntries.length,
    form.handleAddAdditionalRow,
    effectiveVoucherType,
  ]);

  // "End of List" (or blank Enter) on a Tax/Ledger row's List of Ledger Accounts
  // → done adding tax ledgers (stops the endless add-a-row loop). Drop the empty
  // trailing row we were about to fill, then move to the "Provide GST/e-Way Bill
  // details" toggle (Yes/No); if the voucher has no such toggle, go to Narration.
  const additionalLedgerEndOfList = useCallback(() => {
    const af = form.activeField;
    form.handleFieldBlur();
    if (af?.type === 'additional') form.handleRemoveAdditionalRow(af.rowId);
    setTimeout(() => {
      const target =
        (document.querySelector('[data-gst-eway]') as HTMLElement | null) ??
        (document.querySelector('[data-narration="true"]') as HTMLElement | null);
      target?.focus();
    }, 60);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.activeField, form.handleFieldBlur, form.handleRemoveAdditionalRow]);

  const handleSaveBatchAllocations = useCallback(
    (allocations: BatchAllocation[]) => {
      const alloc = form.activeAllocation;
      if (alloc?.type !== 'batch') return;
      const rowId = alloc.rowId;

      // Stock Journal / Manufacturing Journal keep Source & Destination in separate
      // arrays — derive line qty/rate from the batch rows, write back to the side that
      // owns this row, then advance to the next item row on that same side.
      const sjSrcIdx = form.sourceStockEntries.findIndex((e) => e.id === rowId);
      const sjDestIdx = form.destinationStockEntries.findIndex((e) => e.id === rowId);
      if (
        (effectiveVoucherType === 'Stock Journal' ||
          effectiveVoucherType === 'Manufacturing Journal') &&
        (sjSrcIdx >= 0 || sjDestIdx >= 0)
      ) {
        const onSource = sjSrcIdx >= 0;
        const totalBilled = allocations.reduce((s, a) => s + (Number(a.quantity) || 0), 0);
        const totalAmt = allocations.reduce(
          (s, a) =>
            s +
            (Number(a.quantity) || 0) *
              (Number(a.rate) || 0) *
              (1 - (Number(a.disc_percent) || 0) / 100),
          0,
        );
        const effRate = totalBilled > 0 ? totalAmt / totalBilled : 0;
        const firstGodownName = allocations.find((a) => a.godown)?.godown;
        const godownObj = firstGodownName
          ? (form.allGodowns.find((g: any) => g.name === firstGodownName) ?? null)
          : null;
        const updateRow = onSource
          ? form.handleUpdateSourceStockRow
          : form.handleUpdateDestinationStockRow;
        updateRow(rowId, {
          batchAllocations: allocations,
          quantityRaw: totalBilled ? String(totalBilled) : '',
          rateRaw: effRate ? String(effRate) : '',
          ...(godownObj ? { godown: godownObj } : {}),
        });
        form.setActiveAllocation(null);
        const list = onSource ? form.sourceStockEntries : form.destinationStockEntries;
        const idx = onSource ? sjSrcIdx : sjDestIdx;
        if (idx === list.length - 1) {
          (onSource ? form.handleAddSourceStockRow : form.handleAddDestinationStockRow)();
        }
        const sideAttr = onSource ? 'source' : 'dest';
        setTimeout(() => {
          (
            document.querySelector(
              `[data-${sideAttr}-item="${idx + 2}"]`,
            ) as HTMLInputElement | null
          )?.focus();
        }, 50);
        return;
      }

      if (alloc.quantityDriven) {
        // Line qty (actual/billed) & rate are derived from the batch rows. The
        // effective rate folds in per-batch discount so the line amount matches
        // the popup total exactly (Tally behaviour).
        const totalActual = allocations.reduce(
          (s, a) => s + (Number(a.actual_quantity ?? a.quantity) || 0),
          0,
        );
        const totalBilled = allocations.reduce((s, a) => s + (Number(a.quantity) || 0), 0);
        const totalAmt = allocations.reduce(
          (s, a) =>
            s +
            (Number(a.quantity) || 0) *
              (Number(a.rate) || 0) *
              (1 - (Number(a.disc_percent) || 0) / 100),
          0,
        );
        const effRate = totalBilled > 0 ? totalAmt / totalBilled : 0;
        // Persist the chosen godown on the row so voucher_stock_entries.godown_id
        // is set — every per-godown balance/report reads that column. Without this
        // the godown only lived on the batch rows and the item read as "no godown"
        // (dumped into Main Location). Mirrors the Stock Journal branch above. A
        // single-godown allocation is the common case; a multi-godown split uses
        // the first allocation's godown (one stock entry carries one godown_id).
        const firstGodownName = allocations.find((a) => a.godown)?.godown;
        const godownObj = firstGodownName
          ? (form.allGodowns.find((g: any) => g.name === firstGodownName) ?? null)
          : null;
        form.handleUpdateStockRow(rowId, {
          batchAllocations: allocations,
          quantityRaw: totalActual ? String(totalActual) : '',
          billedQtyRaw: totalBilled ? String(totalBilled) : '',
          rateRaw: effRate ? String(effRate) : '',
          ...(godownObj ? { godown: godownObj } : {}),
        });
      } else {
        form.handleUpdateStockRow(rowId, { batchAllocations: allocations });
      }
      form.setActiveAllocation(null);
      const idx = form.stockEntries.findIndex((e) => e.id === rowId);
      // Batch item complete → prompt per-item Excise Details (Credit Note / Sales /
      // Purchase, when the item is Excise Applicable) right after the allocation.
      promptItemExciseOrAdvance(rowId, idx);
    },
    [
      form.activeAllocation,
      form.handleUpdateStockRow,
      form.setActiveAllocation,
      form.stockEntries,
      effectiveVoucherType,
      advanceStockRow,
      promptItemExciseOrAdvance,
      form.sourceStockEntries,
      form.destinationStockEntries,
      form.handleUpdateSourceStockRow,
      form.handleUpdateDestinationStockRow,
      form.handleAddSourceStockRow,
      form.handleAddDestinationStockRow,
      form.allGodowns,
    ],
  );

  const handleSaveMaterialInAllocations = useCallback(
    (allocations: BatchAllocation[]) => {
      const alloc = form.activeAllocation;
      if (alloc?.type !== 'materialIn') return;
      const rowId = alloc.rowId;
      const totalQty = allocations.reduce((s, a) => s + (Number(a.quantity) || 0), 0);
      const totalAmt = allocations.reduce(
        (s, a) => s + (Number(a.quantity) || 0) * (Number(a.rate) || 0),
        0,
      );
      const effRate = totalQty > 0 ? totalAmt / totalQty : 0;
      form.handleUpdateStockRow(rowId, {
        batchAllocations: allocations,
        quantityRaw: totalQty ? String(totalQty) : '',
        rateRaw: effRate ? String(effRate) : '',
      });
      form.setActiveAllocation(null);
      const idx = form.stockEntries.findIndex((e) => e.id === rowId);
      if (idx >= 0) advanceStockRow(idx);
    },
    [
      form.activeAllocation,
      form.handleUpdateStockRow,
      form.setActiveAllocation,
      form.stockEntries,
      advanceStockRow,
    ],
  );

  const handleSaveJobWorkAllocations = useCallback(
    (allocations: import('../types').JobWorkItemAllocationRow[]) => {
      const alloc = form.activeAllocation;
      if (alloc?.type !== 'jobWork') return;
      const { rowId } = alloc;
      const totalQty = allocations.reduce((s, a) => s + (Number(a.quantity) || 0), 0);
      const totalAmount = allocations.reduce((s, a) => s + (Number(a.amount) || 0), 0);
      const effRate = totalQty > 0 ? totalAmount / totalQty : 0;
      form.handleUpdateStockRow(rowId, {
        jobWorkAllocations: allocations,
        quantityRaw: String(totalQty),
        rateRaw: String(effRate),
        amountRaw: String(totalAmount),
      });
      form.setActiveAllocation(null);
      const idx = form.stockEntries.findIndex((e) => e.id === rowId);
      if (idx >= 0) advanceStockRow(idx);
    },
    [
      form.activeAllocation,
      form.handleUpdateStockRow,
      form.setActiveAllocation,
      form.stockEntries,
      advanceStockRow,
    ],
  );

  const handleSaveItemExcise = useCallback(
    (details: ExciseItemDetails) => {
      if (!itemExcise) return;
      const rowId = itemExcise.rowId;
      form.handleUpdateStockRow(rowId, { exciseItemDetails: details });
      setItemExcise(null);
      const idx = form.stockEntries.findIndex((e) => e.id === rowId);
      if (idx >= 0) advanceStockRow(idx);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [itemExcise, form.handleUpdateStockRow, form.stockEntries, advanceStockRow],
  );

  // Inventory Allocations accepted for a Journal/Reversing Journal ledger row:
  // write the stock lines onto the row, derive the ledger amount from their total,
  // and aggregate their per-item cost centres onto the ledger entry.
  const handleSaveInventoryAllocation = useCallback(
    (allocItems: InventoryAllocationItem[]) => {
      if (!inventoryAlloc) return;
      const rowId = inventoryAlloc.rowId;
      const total = allocItems.reduce((s, it) => s + (Number(it.amount) || 0), 0);
      const ccMap = new Map<number, number>();
      allocItems.forEach((it) =>
        (it.cost_centres ?? []).forEach((c) =>
          ccMap.set(c.cost_centre_id, (ccMap.get(c.cost_centre_id) ?? 0) + (Number(c.amount) || 0)),
        ),
      );
      const costCentres = Array.from(ccMap.entries()).map(([cost_centre_id, amount]) => ({
        cost_centre_id,
        amount,
      }));
      form.handleUpdateJournalRow(rowId, {
        inventoryAllocations: allocItems,
        amountRaw: total ? String(total) : '',
        costCentres: costCentres.length ? costCentres : undefined,
      });
      setInventoryAlloc(null);
      const idx = form.journalRows.findIndex((r) => r.id === rowId);
      if (idx === form.journalRows.length - 1) form.handleAddJournalRow();
      setTimeout(() => {
        (
          document.querySelector(`[data-particular-ledger="${idx + 2}"]`) as HTMLInputElement | null
        )?.focus();
      }, 50);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [inventoryAlloc, form.handleUpdateJournalRow, form.journalRows, form.handleAddJournalRow],
  );

  return {
    focusStockQty,
    focusStockRate,
    advanceStockRow,
    proceedToNextStockRow,
    handlePhysicalStockQtyEnter,
    physicalStockEndEntry,
    physicalStockGodownNewItem,
    handleStockJournalItemEndOfList,
    journalParticularEndOfList,
    stockItemEndOfList,
    additionalLedgerEndOfList,
    handleSaveBatchAllocations,
    handleSaveMaterialInAllocations,
    handleSaveJobWorkAllocations,
    handleSaveItemExcise,
    handleSaveInventoryAllocation,
  };
}
