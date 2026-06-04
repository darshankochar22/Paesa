// hooks/useInventoryRows.ts
import { useState, useCallback } from "react";
import type { LedgerType } from "../../../types/api";
import type { ParticularRow, StockEntryRow } from "../types";
import { makeParticularRow, makeStockRow } from "../utils/rowFactories";

interface UseInventoryRowsOptions {
  initialStockEntries?: StockEntryRow[];
  initialAdditionalEntries?: ParticularRow[];
  fetchLedgerBalance: (ledgerId: number) => Promise<string>;
  voucherType: string;
}

export function useInventoryRows({
  initialStockEntries,
  initialAdditionalEntries = [],
  fetchLedgerBalance,
  voucherType,
}: UseInventoryRowsOptions) {
  // ── Party + Sales/Purchase ─────────────────────────────────────────────────
  const [partyLedger, setPartyLedger] = useState<LedgerType | null>(null);
  const [partyBalance, setPartyBalance] = useState<string>("");
  const [salesPurchaseLedger, setSalesPurchaseLedger] = useState<LedgerType | null>(null);
  const [salesPurchaseBalance, setSalesPurchaseBalance] = useState<string>("");

  // ── Inventory ──────────────────────────────────────────────────────────────
  const [stockEntries, setStockEntries] = useState<StockEntryRow[]>(
    () => initialStockEntries ?? [makeStockRow()]
  );
  const [additionalEntries, setAdditionalEntries] = useState<ParticularRow[]>(initialAdditionalEntries);

  // ─── Stock entry handlers ─────────────────────────────────────────────────
  const handleAddStockRow = useCallback(() => {
    setStockEntries((prev) => [...prev, makeStockRow()]);
  }, []);

  const handleUpdateStockRow = useCallback(
    async (id: string, updates: Partial<Omit<StockEntryRow, "id">>) => {
      setStockEntries((prev) =>
        prev.map((r) => {
          if (r.id !== id) return r;
          const updated = { ...r, ...updates };
          if (updates.quantityRaw !== undefined || updates.rateRaw !== undefined) {
            const qty = Number(updated.quantityRaw) || 0;
            const rate = Number(updated.rateRaw) || 0;
            updated.amountRaw = qty > 0 && rate > 0 ? (qty * rate).toFixed(2) : "";
          }
          return updated;
        })
      );
    },
    []
  );

  const handleRemoveStockRow = useCallback((id: string) => {
    setStockEntries((prev) => (prev.length > 1 ? prev.filter((r) => r.id !== id) : prev));
  }, []);

  // ─── Additional entry handlers ────────────────────────────────────────────
  const handleAddAdditionalRow = useCallback(() => {
    setAdditionalEntries((prev) => [
      ...prev,
      makeParticularRow(voucherType === "Sales" ? "Cr" : "Dr"),
    ]);
  }, [voucherType]);

  const handleUpdateAdditionalRow = useCallback(
    async (id: string, updates: Partial<Omit<ParticularRow, "id">>) => {
      setAdditionalEntries((prev) =>
        prev.map((p) => (p.id !== id ? p : { ...p, ...updates }))
      );
      if (updates.ledger?.ledger_id) {
        const bal = await fetchLedgerBalance(updates.ledger.ledger_id);
        setAdditionalEntries((prev) =>
          prev.map((p) => (p.id !== id ? p : { ...p, ledgerBalance: bal }))
        );
      }
    },
    [fetchLedgerBalance]
  );

  const handleRemoveAdditionalRow = useCallback((id: string) => {
    setAdditionalEntries((prev) => prev.filter((p) => p.id !== id));
  }, []);

  // ─── Reset inventory rows ──────────────────────────────────────────────────
  const resetInventoryRows = useCallback(() => {
    setPartyLedger(null);
    setPartyBalance("");
    setSalesPurchaseLedger(null);
    setSalesPurchaseBalance("");
    setStockEntries([makeStockRow()]);
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
    additionalEntries,
    setAdditionalEntries,
    handleAddStockRow,
    handleUpdateStockRow,
    handleRemoveStockRow,
    handleAddAdditionalRow,
    handleUpdateAdditionalRow,
    handleRemoveAdditionalRow,
    resetInventoryRows,
  };
}
