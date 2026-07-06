// hooks/useInventoryRows.ts
import { useState, useCallback, useMemo } from 'react';
import type { LedgerType } from '../../../types/api';
import type { ParticularRow, StockEntryRow } from '../types';
import { makeParticularRow, makeStockRow } from '../utils/rowFactories';
import { gstComponentOf } from '../utils/gstRow';

interface UseInventoryRowsOptions {
  initialStockEntries?: StockEntryRow[];
  initialAdditionalEntries?: ParticularRow[];
  fetchLedgerBalance: (ledgerId: number) => Promise<import('../types').LedgerBalanceInfo>;
  voucherType: string;
  stockBalances: Record<number, number>;
}

export function useInventoryRows({
  initialStockEntries,
  initialAdditionalEntries = [],
  fetchLedgerBalance,
  voucherType,
  stockBalances,
}: UseInventoryRowsOptions) {
  // ── Party + Sales/Purchase ─────────────────────────────────────────────────
  const [partyLedger, setPartyLedger] = useState<LedgerType | null>(null);
  const [partyBalance, setPartyBalance] = useState<string>('');
  const [salesPurchaseLedger, setSalesPurchaseLedger] = useState<LedgerType | null>(null);
  const [salesPurchaseBalance, setSalesPurchaseBalance] = useState<string>('');

  // ── Inventory ──────────────────────────────────────────────────────────────
  const [stockEntries, setStockEntries] = useState<StockEntryRow[]>(
    () => initialStockEntries ?? [makeStockRow()],
  );
  const [additionalEntries, setAdditionalEntries] =
    useState<ParticularRow[]>(initialAdditionalEntries);

  // ─── Stock entry handlers ─────────────────────────────────────────────────
  const handleAddStockRow = useCallback(() => {
    setStockEntries((prev) => [...prev, makeStockRow()]);
  }, []);

  const handleUpdateStockRow = useCallback(
    async (id: string, updates: Partial<Omit<StockEntryRow, 'id'>>) => {
      setStockEntries((prev) =>
        prev.map((r) => {
          if (r.id !== id) return r;
          const updated = { ...r, ...updates };
          if (
            updates.quantityRaw !== undefined ||
            updates.rateRaw !== undefined ||
            updates.billedQtyRaw !== undefined ||
            updates.discPercentRaw !== undefined
          ) {
            const billedQty = Number(updated.billedQtyRaw ?? updated.quantityRaw) || 0;
            const rate = Number(updated.rateRaw) || 0;
            const discPercent = Number(updated.discPercentRaw) || 0;
            const gross = billedQty * rate;
            const net = gross * (1 - discPercent / 100);
            updated.amountRaw = billedQty > 0 && rate > 0 ? net.toFixed(2) : '';
          }
          return updated;
        }),
      );
    },
    [],
  );

  const handleRemoveStockRow = useCallback((id: string) => {
    setStockEntries((prev) => (prev.length > 1 ? prev.filter((r) => r.id !== id) : prev));
  }, []);

  // ─── Additional entry handlers ────────────────────────────────────────────
  const handleAddAdditionalRow = useCallback(() => {
    // Purchase defaults a tax/charge line to Dr; every other invoice (Sales, Credit
    // Note, Debit Note) to Cr — the side that keeps the voucher balanced.
    setAdditionalEntries((prev) => [
      ...prev,
      makeParticularRow(voucherType === 'Purchase' ? 'Dr' : 'Cr'),
    ]);
  }, [voucherType]);

  const handleUpdateAdditionalRow = useCallback(
    async (id: string, updates: Partial<Omit<ParticularRow, 'id'>>) => {
      setAdditionalEntries((prev) => prev.map((p) => (p.id !== id ? p : { ...p, ...updates })));
      if (updates.ledger?.ledger_id) {
        const bal = await fetchLedgerBalance(updates.ledger.ledger_id);
        // Bug 7 (UI auto-fill): when the picked ledger is a GST tax ledger, compute its
        // amount PER ITEM (each line's net value × that item's component rate) and fill it
        // in, so the user doesn't hand-type it. CGST/SGST use half the item's GST rate,
        // IGST the full rate. Non-tax ledgers (freight, discount) are left for manual entry.
        // The server recomputes authoritatively on save; this just mirrors that figure live.
        // Component is resolved via gst_tax_type OR the ledger name (so a ledger named
        // "IGST" with no gst_tax_type set still auto-fills).
        const component = gstComponentOf(updates.ledger);
        const isHalf = component === 'CGST' || component === 'SGST';
        const isFull = component === 'IGST';
        let autoAmount: string | undefined;
        if (isHalf || isFull) {
          const amt = stockEntries.reduce((s, r) => {
            const assessable = Number(r.amountRaw) || 0;
            const itemRate = Number((r.stockItem as any)?.gst_rate) || 0;
            const componentRate = isHalf ? itemRate / 2 : itemRate;
            return s + assessable * (componentRate / 100);
          }, 0);
          if (amt > 0) autoAmount = amt.toFixed(2);
        }
        setAdditionalEntries((prev) =>
          prev.map((p) =>
            p.id !== id
              ? p
              : {
                  ...p,
                  ledgerBalance: bal.raw,
                  ledgerBalanceLabel: bal.label,
                  ...(autoAmount ? { amountRaw: autoAmount } : {}),
                },
          ),
        );
      }
    },
    [fetchLedgerBalance, stockEntries],
  );

  const handleRemoveAdditionalRow = useCallback((id: string) => {
    setAdditionalEntries((prev) => prev.filter((p) => p.id !== id));
  }, []);

  // ── Stock Journal (Consumption / Production) ──────────────────────────────
  const [sourceStockEntries, setSourceStockEntries] = useState<StockEntryRow[]>(() => [
    makeStockRow(),
  ]);
  const [destinationStockEntries, setDestinationStockEntries] = useState<StockEntryRow[]>(() => [
    makeStockRow(),
  ]);

  // ── Negative stock warnings ───────────────────────────────────────────────
  const stockOutTypes = ['Sales', 'Delivery Note', 'Rejection Out', 'Material Out', 'Debit Note'];

  const negativeStockWarnings = useMemo(() => {
    if (
      !stockOutTypes.includes(voucherType) &&
      voucherType !== 'Stock Journal' &&
      voucherType !== 'Manufacturing Journal'
    ) {
      return [];
    }
    const warnings: string[] = [];
    const cumulativeOut: Record<number, number> = {};

    // A Sales line that bills goods already shipped by a linked Delivery Note
    // (it carries that note's tracking or order number) does NOT remove fresh
    // stock on save — the Delivery Note already did, and the backend's
    // tracking-billed guard excludes it. Mirror that here so the pre-save check
    // doesn't false-alarm (and block) a legitimate invoice against a delivery.
    const isTrackingBilled = (r: StockEntryRow) =>
      voucherType === 'Sales' &&
      (r.batchAllocations ?? []).some(
        (b) => !!(b.tracking_no && b.tracking_no.trim()) || !!(b.order_no && b.order_no.trim()),
      );

    const checkRow = (r: StockEntryRow) => {
      if (!r.stockItem) return;
      const id = r.stockItem.item_id;
      if (!id) return;
      if (isTrackingBilled(r)) return;
      const qty = Number(r.quantityRaw) || 0;
      if (qty <= 0) return;
      cumulativeOut[id] = (cumulativeOut[id] || 0) + qty;
    };

    stockEntries.forEach(checkRow);
    if (voucherType === 'Stock Journal' || voucherType === 'Manufacturing Journal') {
      sourceStockEntries.forEach(checkRow);
    }

    for (const [itemId, outQty] of Object.entries(cumulativeOut)) {
      const balance = stockBalances[Number(itemId)] ?? 0;
      if (outQty > balance) {
        const item =
          stockEntries.find((r) => r.stockItem?.item_id === Number(itemId))?.stockItem ??
          sourceStockEntries.find((r) => r.stockItem?.item_id === Number(itemId))?.stockItem;
        const name = item?.name ?? `Item #${itemId}`;
        warnings.push(`${name}: Available ${balance.toFixed(2)}, entering ${outQty.toFixed(2)}`);
      }
    }

    return warnings;
  }, [voucherType, stockEntries, sourceStockEntries, stockBalances]);

  const handleAddSourceStockRow = useCallback(() => {
    setSourceStockEntries((prev) => [...prev, makeStockRow()]);
  }, []);

  const handleUpdateSourceStockRow = useCallback(
    async (id: string, updates: Partial<Omit<StockEntryRow, 'id'>>) => {
      setSourceStockEntries((prev) =>
        prev.map((r) => {
          if (r.id !== id) return r;
          const updated = { ...r, ...updates };
          if (updates.quantityRaw !== undefined || updates.rateRaw !== undefined) {
            const qty = Number(updated.quantityRaw) || 0;
            const rate = Number(updated.rateRaw) || 0;
            updated.amountRaw = qty > 0 && rate > 0 ? (qty * rate).toFixed(2) : '';
          }
          return updated;
        }),
      );
    },
    [],
  );

  const handleRemoveSourceStockRow = useCallback((id: string) => {
    setSourceStockEntries((prev) => (prev.length > 1 ? prev.filter((r) => r.id !== id) : prev));
  }, []);

  const handleAddDestinationStockRow = useCallback(() => {
    setDestinationStockEntries((prev) => [...prev, makeStockRow()]);
  }, []);

  const handleUpdateDestinationStockRow = useCallback(
    async (id: string, updates: Partial<Omit<StockEntryRow, 'id'>>) => {
      setDestinationStockEntries((prev) =>
        prev.map((r) => {
          if (r.id !== id) return r;
          const updated = { ...r, ...updates };
          if (updates.quantityRaw !== undefined || updates.rateRaw !== undefined) {
            const qty = Number(updated.quantityRaw) || 0;
            const rate = Number(updated.rateRaw) || 0;
            updated.amountRaw = qty > 0 && rate > 0 ? (qty * rate).toFixed(2) : '';
          }
          return updated;
        }),
      );
    },
    [],
  );

  const handleRemoveDestinationStockRow = useCallback((id: string) => {
    setDestinationStockEntries((prev) =>
      prev.length > 1 ? prev.filter((r) => r.id !== id) : prev,
    );
  }, []);

  // ─── Reset inventory rows ──────────────────────────────────────────────────
  const resetInventoryRows = useCallback(() => {
    setPartyLedger(null);
    setPartyBalance('');
    setSalesPurchaseLedger(null);
    setSalesPurchaseBalance('');
    setStockEntries([makeStockRow()]);
    setSourceStockEntries([makeStockRow()]);
    setDestinationStockEntries([makeStockRow()]);
    setAdditionalEntries([]);
  }, []);

  return {
    partyLedger,
    setPartyLedger,
    partyBalance,
    setPartyBalance,
    salesPurchaseLedger,
    setSalesPurchaseLedger,
    salesPurchaseBalance,
    setSalesPurchaseBalance,
    stockEntries,
    setStockEntries,
    sourceStockEntries,
    setSourceStockEntries,
    destinationStockEntries,
    setDestinationStockEntries,
    additionalEntries,
    setAdditionalEntries,
    handleAddStockRow,
    handleUpdateStockRow,
    handleRemoveStockRow,
    handleAddSourceStockRow,
    handleUpdateSourceStockRow,
    handleRemoveSourceStockRow,
    handleAddDestinationStockRow,
    handleUpdateDestinationStockRow,
    handleRemoveDestinationStockRow,
    handleAddAdditionalRow,
    handleUpdateAdditionalRow,
    handleRemoveAdditionalRow,
    resetInventoryRows,
    negativeStockWarnings,
  };
}
