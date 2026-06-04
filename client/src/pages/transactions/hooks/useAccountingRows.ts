// hooks/useAccountingRows.ts
import { useState, useCallback } from "react";
import type { LedgerType } from "../../../types/api";
import type { ParticularRow } from "../types";
import { makeParticularRow } from "../utils/rowFactories";

interface UseAccountingRowsOptions {
  initialParticulars?: ParticularRow[];
  initialJournalRows?: ParticularRow[];
  initialContraDoubleRows?: ParticularRow[];
  initialReceiptDoubleRows?: ParticularRow[];
  initialPaymentDoubleRows?: ParticularRow[];
  initialContraEntryMode?: "single" | "double";
  initialReceiptEntryMode?: "single" | "double";
  initialJournalEntryMode?: "single" | "double";
  initialPaymentEntryMode?: "single" | "double";
  fetchLedgerBalance: (ledgerId: number) => Promise<string>;
  voucherType: string;
}

export function useAccountingRows({
  initialParticulars,
  initialJournalRows,
  initialContraDoubleRows,
  initialReceiptDoubleRows,
  initialPaymentDoubleRows,
  initialContraEntryMode = "double",
  initialReceiptEntryMode = "double",
  initialJournalEntryMode = "double",
  initialPaymentEntryMode = "double",
  fetchLedgerBalance,
  voucherType,
}: UseAccountingRowsOptions) {
  // ── Account field ──────────────────────────────────────────────────────────
  const [accountLedger, setAccountLedger] = useState<LedgerType | null>(null);
  const [accountBalance, setAccountBalance] = useState<string>("");

  // ── Single-entry particulars ───────────────────────────────────────────────
  const [particulars, setParticulars] = useState<ParticularRow[]>(
    () => initialParticulars ?? [makeParticularRow("Cr")]
  );

  // ── Double-entry rows ──────────────────────────────────────────────────────
  const [contraEntryMode, setContraEntryMode] = useState<"single" | "double">(initialContraEntryMode);
  const [contraDoubleRows, setContraDoubleRows] = useState<ParticularRow[]>(
    () => initialContraDoubleRows ?? [makeParticularRow("Cr"), makeParticularRow("Dr")]
  );

  const [receiptEntryMode, setReceiptEntryMode] = useState<"single" | "double">(initialReceiptEntryMode);
  const [receiptDoubleRows, setReceiptDoubleRows] = useState<ParticularRow[]>(
    () => initialReceiptDoubleRows ?? [makeParticularRow("Cr"), makeParticularRow("Dr")]
  );

  const [paymentEntryMode, setPaymentEntryMode] = useState<"single" | "double">(initialPaymentEntryMode);
  const [paymentDoubleRows, setPaymentDoubleRows] = useState<ParticularRow[]>(
    () => initialPaymentDoubleRows ?? [makeParticularRow("Cr"), makeParticularRow("Dr")]
  );

  const [journalEntryMode, setJournalEntryMode] = useState<"single" | "double">(initialJournalEntryMode);
  const [journalRows, setJournalRows] = useState<ParticularRow[]>(
    () => initialJournalRows ?? [makeParticularRow("Cr"), makeParticularRow("Dr")]
  );

  // ─── Derived: particular type for single-entry layouts ──────────────────────
  const deriveParticularType = useCallback(
    (currentType: "Dr" | "Cr"): "Dr" | "Cr" => {
      if (voucherType === "Receipt") return "Cr";
      if (voucherType === "Payment") return "Dr";
      if (voucherType === "Contra") return "Dr";
      if (voucherType === "Journal" && journalEntryMode === "single") return "Dr";
      return currentType;
    },
    [voucherType, journalEntryMode]
  );

  // ─── Single-entry particular row handlers ─────────────────────────────────
  const handleAddParticularRow = useCallback(() => {
    setParticulars((prev) => [
      ...prev,
      makeParticularRow(
        voucherType === "Receipt" ? "Cr" : voucherType === "Payment" ? "Dr" : "Dr"
      ),
    ]);
  }, [voucherType]);

  const handleUpdateParticularRow = useCallback(
    async (id: string, updates: Partial<Omit<ParticularRow, "id">>) => {
      setParticulars((prev) =>
        prev.map((p) => {
          if (p.id !== id) return p;
          const next = { ...p, ...updates };
          if (updates.ledger !== undefined) {
            next.type = deriveParticularType(p.type);
          }
          return next;
        })
      );
      if (updates.ledger?.ledger_id) {
        const bal = await fetchLedgerBalance(updates.ledger.ledger_id);
        setParticulars((prev) =>
          prev.map((p) => (p.id !== id ? p : { ...p, ledgerBalance: bal }))
        );
      }
    },
    [deriveParticularType, fetchLedgerBalance]
  );

  const handleRemoveParticularRow = useCallback((id: string) => {
    setParticulars((prev) => (prev.length > 1 ? prev.filter((p) => p.id !== id) : prev));
  }, []);

  // ─── Journal row handlers ──────────────────────────────────────────────────
  const handleAddJournalRow = useCallback(() => {
    setJournalRows((prev) => {
      const drSum = prev.reduce((s, r) => s + (r.type === "Dr" ? Number(r.amountRaw) || 0 : 0), 0);
      const crSum = prev.reduce((s, r) => s + (r.type === "Cr" ? Number(r.amountRaw) || 0 : 0), 0);
      const diff = drSum - crSum;
      const nextType: "Dr" | "Cr" =
        diff < -0.01 ? "Dr" : diff > 0.01 ? "Cr" : (prev[prev.length - 1]?.type === "Dr" ? "Cr" : "Dr");
      return [...prev, makeParticularRow(nextType)];
    });
  }, []);

  const handleUpdateJournalRow = useCallback(
    async (id: string, updates: Partial<Omit<ParticularRow, "id">>) => {
      setJournalRows((prev) => {
        const nextRows = prev.map((r) => (r.id !== id ? r : {
          ...r, ...updates,
          ...(updates.ledger !== undefined ? { ledgerBalance: "" } : {}),
        }));
        if (updates.ledger?.ledger_id) {
          const updatedRow = nextRows.find((r) => r.id === id);
          if (updatedRow && (!updatedRow.amountRaw || Number(updatedRow.amountRaw) === 0)) {
            const drTotal = nextRows.reduce((s, r) => s + (r.type === "Dr" ? Number(r.amountRaw) || 0 : 0), 0);
            const crTotal = nextRows.reduce((s, r) => s + (r.type === "Cr" ? Number(r.amountRaw) || 0 : 0), 0);
            const deficit = updatedRow.type === "Dr" ? crTotal - drTotal : drTotal - crTotal;
            if (Math.abs(deficit) > 0.01) {
              return nextRows.map((r) =>
                r.id === id ? { ...r, amountRaw: Math.abs(deficit).toFixed(2) } : r
              );
            }
          }
        }
        return nextRows;
      });
      if (updates.ledger?.ledger_id) {
        const bal = await fetchLedgerBalance(updates.ledger.ledger_id);
        setJournalRows((prev) =>
          prev.map((r) => (r.id !== id ? r : { ...r, ledgerBalance: bal }))
        );
      }
    },
    [fetchLedgerBalance]
  );

  const handleRemoveJournalRow = useCallback((id: string) => {
    setJournalRows((prev) => (prev.length > 2 ? prev.filter((r) => r.id !== id) : prev));
  }, []);

  // ─── Contra double-entry row handlers ─────────────────────────────────────
  const handleAddContraDoubleRow = useCallback(() => {
    setContraDoubleRows((prev) => {
      const drSum = prev.reduce((s, r) => s + (r.type === "Dr" ? Number(r.amountRaw) || 0 : 0), 0);
      const crSum = prev.reduce((s, r) => s + (r.type === "Cr" ? Number(r.amountRaw) || 0 : 0), 0);
      const diff = drSum - crSum;
      const nextType: "Dr" | "Cr" =
        diff < -0.01 ? "Dr" : diff > 0.01 ? "Cr" : (prev[prev.length - 1]?.type === "Dr" ? "Cr" : "Dr");
      return [...prev, makeParticularRow(nextType)];
    });
  }, []);

  const handleUpdateContraDoubleRow = useCallback(
    async (id: string, updates: Partial<Omit<ParticularRow, "id">>) => {
      setContraDoubleRows((prev) => {
        const nextRows = prev.map((r) => (r.id !== id ? r : {
          ...r, ...updates,
          ...(updates.ledger !== undefined ? { ledgerBalance: "" } : {}),
        }));
        if (updates.ledger?.ledger_id) {
          const updatedRow = nextRows.find((r) => r.id === id);
          if (updatedRow && (!updatedRow.amountRaw || Number(updatedRow.amountRaw) === 0)) {
            const drTotal = nextRows.reduce((s, r) => s + (r.type === "Dr" ? Number(r.amountRaw) || 0 : 0), 0);
            const crTotal = nextRows.reduce((s, r) => s + (r.type === "Cr" ? Number(r.amountRaw) || 0 : 0), 0);
            const deficit = updatedRow.type === "Dr" ? crTotal - drTotal : drTotal - crTotal;
            if (Math.abs(deficit) > 0.01) {
              return nextRows.map((r) =>
                r.id === id ? { ...r, amountRaw: Math.abs(deficit).toFixed(2) } : r
              );
            }
          }
        }
        return nextRows;
      });
      if (updates.ledger?.ledger_id) {
        const bal = await fetchLedgerBalance(updates.ledger.ledger_id);
        setContraDoubleRows((prev) =>
          prev.map((r) => (r.id !== id ? r : { ...r, ledgerBalance: bal }))
        );
      }
    },
    [fetchLedgerBalance]
  );

  const handleRemoveContraDoubleRow = useCallback((id: string) => {
    setContraDoubleRows((prev) => (prev.length > 2 ? prev.filter((r) => r.id !== id) : prev));
  }, []);

  // ─── Receipt double-entry row handlers ────────────────────────────────────
  const handleAddReceiptDoubleRow = useCallback(() => {
    setReceiptDoubleRows((prev) => {
      const drSum = prev.reduce((s, r) => s + (r.type === "Dr" ? Number(r.amountRaw) || 0 : 0), 0);
      const crSum = prev.reduce((s, r) => s + (r.type === "Cr" ? Number(r.amountRaw) || 0 : 0), 0);
      const diff = drSum - crSum;
      const nextType: "Dr" | "Cr" =
        diff < -0.01 ? "Dr" : diff > 0.01 ? "Cr" : (prev[prev.length - 1]?.type === "Dr" ? "Cr" : "Dr");
      return [...prev, makeParticularRow(nextType)];
    });
  }, []);

  const handleUpdateReceiptDoubleRow = useCallback(
    async (id: string, updates: Partial<Omit<ParticularRow, "id">>) => {
      setReceiptDoubleRows((prev) => {
        const nextRows = prev.map((r) => (r.id !== id ? r : {
          ...r, ...updates,
          ...(updates.ledger !== undefined ? { ledgerBalance: "" } : {}),
        }));
        if (updates.ledger?.ledger_id) {
          const updatedRow = nextRows.find((r) => r.id === id);
          if (updatedRow && (!updatedRow.amountRaw || Number(updatedRow.amountRaw) === 0)) {
            const drTotal = nextRows.reduce((s, r) => s + (r.type === "Dr" ? Number(r.amountRaw) || 0 : 0), 0);
            const crTotal = nextRows.reduce((s, r) => s + (r.type === "Cr" ? Number(r.amountRaw) || 0 : 0), 0);
            const deficit = updatedRow.type === "Dr" ? crTotal - drTotal : drTotal - crTotal;
            if (Math.abs(deficit) > 0.01) {
              return nextRows.map((r) =>
                r.id === id ? { ...r, amountRaw: Math.abs(deficit).toFixed(2) } : r
              );
            }
          }
        }
        return nextRows;
      });
      if (updates.ledger?.ledger_id) {
        const bal = await fetchLedgerBalance(updates.ledger.ledger_id);
        setReceiptDoubleRows((prev) =>
          prev.map((r) => (r.id !== id ? r : { ...r, ledgerBalance: bal }))
        );
      }
    },
    [fetchLedgerBalance]
  );

  const handleRemoveReceiptDoubleRow = useCallback((id: string) => {
    setReceiptDoubleRows((prev) => (prev.length > 2 ? prev.filter((r) => r.id !== id) : prev));
  }, []);

  // ─── Payment double-entry row handlers ────────────────────────────────────
  const handleAddPaymentDoubleRow = useCallback(() => {
    setPaymentDoubleRows((prev) => {
      const drSum = prev.reduce((s, r) => s + (r.type === "Dr" ? Number(r.amountRaw) || 0 : 0), 0);
      const crSum = prev.reduce((s, r) => s + (r.type === "Cr" ? Number(r.amountRaw) || 0 : 0), 0);
      const diff = drSum - crSum;
      const nextType: "Dr" | "Cr" =
        diff < -0.01 ? "Dr" : diff > 0.01 ? "Cr" : (prev[prev.length - 1]?.type === "Dr" ? "Cr" : "Dr");
      return [...prev, makeParticularRow(nextType)];
    });
  }, []);

  const handleUpdatePaymentDoubleRow = useCallback(
    async (id: string, updates: Partial<Omit<ParticularRow, "id">>) => {
      setPaymentDoubleRows((prev) => {
        const nextRows = prev.map((r) => (r.id !== id ? r : {
          ...r, ...updates,
          ...(updates.ledger !== undefined ? { ledgerBalance: "" } : {}),
        }));
        if (updates.ledger?.ledger_id) {
          const updatedRow = nextRows.find((r) => r.id === id);
          if (updatedRow && (!updatedRow.amountRaw || Number(updatedRow.amountRaw) === 0)) {
            const drTotal = nextRows.reduce((s, r) => s + (r.type === "Dr" ? Number(r.amountRaw) || 0 : 0), 0);
            const crTotal = nextRows.reduce((s, r) => s + (r.type === "Cr" ? Number(r.amountRaw) || 0 : 0), 0);
            const deficit = updatedRow.type === "Dr" ? crTotal - drTotal : drTotal - crTotal;
            if (Math.abs(deficit) > 0.01) {
              return nextRows.map((r) =>
                r.id === id ? { ...r, amountRaw: Math.abs(deficit).toFixed(2) } : r
              );
            }
          }
        }
        return nextRows;
      });
      if (updates.ledger?.ledger_id) {
        const bal = await fetchLedgerBalance(updates.ledger.ledger_id);
        setPaymentDoubleRows((prev) =>
          prev.map((r) => (r.id !== id ? r : { ...r, ledgerBalance: bal }))
        );
      }
    },
    [fetchLedgerBalance]
  );

  const handleRemovePaymentDoubleRow = useCallback((id: string) => {
    setPaymentDoubleRows((prev) => (prev.length > 2 ? prev.filter((r) => r.id !== id) : prev));
  }, []);

  // ─── Reset accounting rows ────────────────────────────────────────────────
  const resetAccountingRows = useCallback((defaultParticular: "Dr" | "Cr") => {
    setAccountLedger(null);
    setAccountBalance("");
    setParticulars([makeParticularRow(defaultParticular)]);
    setJournalRows([makeParticularRow("Cr"), makeParticularRow("Dr")]);
    setContraDoubleRows([makeParticularRow("Cr"), makeParticularRow("Dr")]);
    setReceiptDoubleRows([makeParticularRow("Cr"), makeParticularRow("Dr")]);
    setPaymentDoubleRows([makeParticularRow("Cr"), makeParticularRow("Dr")]);
    setContraEntryMode("double");
    setReceiptEntryMode("double");
    setJournalEntryMode("double");
    setPaymentEntryMode("double");
  }, []);

  return {
    accountLedger,
    setAccountLedger,
    accountBalance,
    setAccountBalance,
    particulars,
    setParticulars,
    contraEntryMode,
    setContraEntryMode,
    contraDoubleRows,
    setContraDoubleRows,
    receiptEntryMode,
    setReceiptEntryMode,
    receiptDoubleRows,
    setReceiptDoubleRows,
    paymentEntryMode,
    setPaymentEntryMode,
    paymentDoubleRows,
    setPaymentDoubleRows,
    journalEntryMode,
    setJournalEntryMode,
    journalRows,
    setJournalRows,
    deriveParticularType,
    handleAddParticularRow,
    handleUpdateParticularRow,
    handleRemoveParticularRow,
    handleAddJournalRow,
    handleUpdateJournalRow,
    handleRemoveJournalRow,
    handleAddContraDoubleRow,
    handleUpdateContraDoubleRow,
    handleRemoveContraDoubleRow,
    handleAddReceiptDoubleRow,
    handleUpdateReceiptDoubleRow,
    handleRemoveReceiptDoubleRow,
    handleAddPaymentDoubleRow,
    handleUpdatePaymentDoubleRow,
    handleRemovePaymentDoubleRow,
    resetAccountingRows,
  };
}
