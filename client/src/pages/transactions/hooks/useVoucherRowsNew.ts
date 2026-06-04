// hooks/useVoucherRowsNew.ts
// ─── Barrel/Orchestrator hook: calls useAccountingRows & useInventoryRows ───────
//
// Public API returned from this hook is 100% identical to the monolithic version.
// No other hook or component file requires any modifications.

import { useState, useCallback, useMemo } from "react";
import type { LedgerType, StockItemType, UnitType } from "../../../types/api";
import type { ParticularRow, StockEntryRow, ActiveField } from "../types";
import { useAccountingRows } from "./useAccountingRows";
import { useInventoryRows } from "./useInventoryRows";

interface UseVoucherRowsOptions {
  initialParticulars?: ParticularRow[];
  initialJournalRows?: ParticularRow[];
  initialContraDoubleRows?: ParticularRow[];
  initialReceiptDoubleRows?: ParticularRow[];
  initialPaymentDoubleRows?: ParticularRow[];
  initialStockEntries?: StockEntryRow[];
  initialAdditionalEntries?: ParticularRow[];
  initialContraEntryMode?: "single" | "double";
  initialReceiptEntryMode?: "single" | "double";
  initialJournalEntryMode?: "single" | "double";
  initialPaymentEntryMode?: "single" | "double";
  fetchLedgerBalance: (ledgerId: number) => Promise<string>;
  voucherType: string;
  allUnits: UnitType[];
}

export function useVoucherRows({
  initialParticulars,
  initialJournalRows,
  initialContraDoubleRows,
  initialReceiptDoubleRows,
  initialPaymentDoubleRows,
  initialStockEntries,
  initialAdditionalEntries = [],
  initialContraEntryMode = "double",
  initialReceiptEntryMode = "double",
  initialJournalEntryMode = "double",
  initialPaymentEntryMode = "double",
  fetchLedgerBalance,
  voucherType,
  allUnits,
}: UseVoucherRowsOptions) {
  // ── Sub-hooks ──────────────────────────────────────────────────────────────
  const acct = useAccountingRows({
    initialParticulars,
    initialJournalRows,
    initialContraDoubleRows,
    initialReceiptDoubleRows,
    initialPaymentDoubleRows,
    initialContraEntryMode,
    initialReceiptEntryMode,
    initialJournalEntryMode,
    initialPaymentEntryMode,
    fetchLedgerBalance,
    voucherType,
  });

  const inv = useInventoryRows({
    initialStockEntries,
    initialAdditionalEntries,
    fetchLedgerBalance,
    voucherType,
  });

  // ── Active field / search ──────────────────────────────────────────────────
  const [ledgerSearchTerm, setLedgerSearchTerm] = useState("");
  const [stockSearchTerm, setStockSearchTerm] = useState("");
  const [activeField, setActiveField] = useState<ActiveField | null>(null);

  // ─── Computed totals ───────────────────────────────────────────────────────
  const particularsTotal = useMemo(
    () => acct.particulars.reduce((s, p) => s + (Number(p.amountRaw) || 0), 0),
    [acct.particulars]
  );

  const debitTotal = useMemo(() => {
    if (voucherType === "Journal" && acct.journalEntryMode === "double") {
      return acct.journalRows.reduce((sum, r) => sum + (r.type === "Dr" ? Number(r.amountRaw) || 0 : 0), 0);
    }
    if (voucherType === "Contra" && acct.contraEntryMode === "double") {
      return acct.contraDoubleRows.reduce((sum, r) => sum + (r.type === "Dr" ? Number(r.amountRaw) || 0 : 0), 0);
    }
    if (voucherType === "Receipt" && acct.receiptEntryMode === "double") {
      return acct.receiptDoubleRows.reduce((sum, r) => sum + (r.type === "Dr" ? Number(r.amountRaw) || 0 : 0), 0);
    }
    if (voucherType === "Payment" && acct.paymentEntryMode === "double") {
      return acct.paymentDoubleRows.reduce((sum, r) => sum + (r.type === "Dr" ? Number(r.amountRaw) || 0 : 0), 0);
    }
    return particularsTotal;
  }, [
    voucherType,
    acct.journalRows,
    acct.journalEntryMode,
    acct.contraDoubleRows,
    acct.contraEntryMode,
    acct.receiptDoubleRows,
    acct.receiptEntryMode,
    acct.paymentDoubleRows,
    acct.paymentEntryMode,
    particularsTotal,
  ]);

  const creditTotal = useMemo(() => {
    if (voucherType === "Journal" && acct.journalEntryMode === "double") {
      return acct.journalRows.reduce((sum, r) => sum + (r.type === "Cr" ? Number(r.amountRaw) || 0 : 0), 0);
    }
    if (voucherType === "Contra" && acct.contraEntryMode === "double") {
      return acct.contraDoubleRows.reduce((sum, r) => sum + (r.type === "Cr" ? Number(r.amountRaw) || 0 : 0), 0);
    }
    if (voucherType === "Receipt" && acct.receiptEntryMode === "double") {
      return acct.receiptDoubleRows.reduce((sum, r) => sum + (r.type === "Cr" ? Number(r.amountRaw) || 0 : 0), 0);
    }
    if (voucherType === "Payment" && acct.paymentEntryMode === "double") {
      return acct.paymentDoubleRows.reduce((sum, r) => sum + (r.type === "Cr" ? Number(r.amountRaw) || 0 : 0), 0);
    }
    return particularsTotal;
  }, [
    voucherType,
    acct.journalRows,
    acct.journalEntryMode,
    acct.contraDoubleRows,
    acct.contraEntryMode,
    acct.receiptDoubleRows,
    acct.receiptEntryMode,
    acct.paymentDoubleRows,
    acct.paymentEntryMode,
    particularsTotal,
  ]);

  const totalAmount = useMemo(() => {
    if (voucherType === "Receipt") return acct.receiptEntryMode === "double" ? debitTotal : particularsTotal;
    if (voucherType === "Payment") return acct.paymentEntryMode === "double" ? debitTotal : particularsTotal;
    if (voucherType === "Contra") return acct.contraEntryMode === "double" ? debitTotal : particularsTotal;
    if (voucherType === "Journal") return acct.journalEntryMode === "single" ? particularsTotal : debitTotal;
    if (["Sales", "Purchase", "Credit Note", "Debit Note"].includes(voucherType)) {
      const stockSum = inv.stockEntries.reduce((s, r) => s + (Number(r.amountRaw) || 0), 0);
      const adjSum = inv.additionalEntries.reduce((s, r) => {
        const amt = Number(r.amountRaw) || 0;
        if (voucherType === "Sales") return r.type === "Cr" ? s + amt : s - amt;
        return r.type === "Dr" ? s + amt : s - amt;
      }, 0);
      return Math.max(0, stockSum + adjSum);
    }
    return 0;
  }, [
    voucherType,
    particularsTotal,
    debitTotal,
    acct.contraEntryMode,
    acct.receiptEntryMode,
    acct.journalEntryMode,
    acct.paymentEntryMode,
    inv.stockEntries,
    inv.additionalEntries,
  ]);

  // ─── Active field / search panel ──────────────────────────────────────────
  const handleFieldFocus = useCallback((field: ActiveField) => {
    setActiveField(field);
    setLedgerSearchTerm("");
    setStockSearchTerm("");
  }, []);

  const handleFieldBlur = useCallback(() => {
    setActiveField(null);
  }, []);

  // ─── Universal ledger panel selection handler ─────────────────────────────
  const handleLedgerPanelSelect = useCallback(
    (item: any) => {
      if (!activeField) return;

      switch (activeField.type) {
        case "account":
          acct.setAccountLedger(item as LedgerType);
          break;
        case "party":
          inv.setPartyLedger(item as LedgerType);
          break;
        case "salesPurchase":
          inv.setSalesPurchaseLedger(item as LedgerType);
          break;
        case "particular": {
          const ledger = item as LedgerType;
          if (voucherType === "Journal") {
            acct.handleUpdateJournalRow(activeField.rowId, { ledger });
          } else if (voucherType === "Contra" && acct.contraEntryMode === "double") {
            acct.handleUpdateContraDoubleRow(activeField.rowId, { ledger });
          } else if (voucherType === "Receipt" && acct.receiptEntryMode === "double") {
            acct.handleUpdateReceiptDoubleRow(activeField.rowId, { ledger });
          } else if (voucherType === "Payment" && acct.paymentEntryMode === "double") {
            acct.handleUpdatePaymentDoubleRow(activeField.rowId, { ledger });
          } else {
            acct.handleUpdateParticularRow(activeField.rowId, { ledger });
          }
          break;
        }
        case "additional":
          inv.handleUpdateAdditionalRow(activeField.rowId, { ledger: item as LedgerType });
          break;
        case "stockItem": {
          const stockItem = item as StockItemType;
          const matchingUnit = allUnits.find((u) => u.unit_id === stockItem.unit_id) ?? null;
          inv.handleUpdateStockRow(activeField.rowId, { stockItem, unit: matchingUnit });
          break;
        }
        default:
          break;
      }

      setActiveField(null);
      setLedgerSearchTerm("");
      setStockSearchTerm("");
    },
    [
      activeField,
      voucherType,
      acct.contraEntryMode,
      acct.receiptEntryMode,
      acct.paymentEntryMode,
      allUnits,
      acct.handleUpdateParticularRow,
      acct.handleUpdateJournalRow,
      acct.handleUpdateContraDoubleRow,
      acct.handleUpdateReceiptDoubleRow,
      acct.handleUpdatePaymentDoubleRow,
      inv.handleUpdateAdditionalRow,
      inv.handleUpdateStockRow,
      acct.setAccountLedger,
      inv.setPartyLedger,
      inv.setSalesPurchaseLedger,
    ]
  );

  // ─── Reset rows (called from full resetForm) ──────────────────────────────
  const resetRows = useCallback(
    (currentVoucherType: string) => {
      const defaultParticular: "Dr" | "Cr" =
        currentVoucherType === "Receipt" ? "Cr"
        : currentVoucherType === "Payment" ? "Dr"
        : "Dr";
      acct.resetAccountingRows(defaultParticular);
      inv.resetInventoryRows();
      setActiveField(null);
      setLedgerSearchTerm("");
      setStockSearchTerm("");
    },
    [acct.resetAccountingRows, inv.resetInventoryRows]
  );

  return {
    // ── account
    accountLedger: acct.accountLedger,
    setAccountLedger: acct.setAccountLedger,
    accountBalance: acct.accountBalance,
    setAccountBalance: acct.setAccountBalance,
    // ── party
    partyLedger: inv.partyLedger,
    setPartyLedger: inv.setPartyLedger,
    partyBalance: inv.partyBalance,
    setPartyBalance: inv.setPartyBalance,
    salesPurchaseLedger: inv.salesPurchaseLedger,
    setSalesPurchaseLedger: inv.setSalesPurchaseLedger,
    salesPurchaseBalance: inv.salesPurchaseBalance,
    setSalesPurchaseBalance: inv.setSalesPurchaseBalance,
    // ── single-entry particulars
    particulars: acct.particulars,
    setParticulars: acct.setParticulars,
    handleAddParticularRow: acct.handleAddParticularRow,
    handleUpdateParticularRow: acct.handleUpdateParticularRow,
    handleRemoveParticularRow: acct.handleRemoveParticularRow,
    // ── contra double
    contraEntryMode: acct.contraEntryMode,
    setContraEntryMode: acct.setContraEntryMode,
    contraDoubleRows: acct.contraDoubleRows,
    setContraDoubleRows: acct.setContraDoubleRows,
    handleAddContraDoubleRow: acct.handleAddContraDoubleRow,
    handleUpdateContraDoubleRow: acct.handleUpdateContraDoubleRow,
    handleRemoveContraDoubleRow: acct.handleRemoveContraDoubleRow,
    // ── receipt double
    receiptEntryMode: acct.receiptEntryMode,
    setReceiptEntryMode: acct.setReceiptEntryMode,
    receiptDoubleRows: acct.receiptDoubleRows,
    setReceiptDoubleRows: acct.setReceiptDoubleRows,
    handleAddReceiptDoubleRow: acct.handleAddReceiptDoubleRow,
    handleUpdateReceiptDoubleRow: acct.handleUpdateReceiptDoubleRow,
    handleRemoveReceiptDoubleRow: acct.handleRemoveReceiptDoubleRow,
    // ── payment double
    paymentEntryMode: acct.paymentEntryMode,
    setPaymentEntryMode: acct.setPaymentEntryMode,
    paymentDoubleRows: acct.paymentDoubleRows,
    setPaymentDoubleRows: acct.setPaymentDoubleRows,
    handleAddPaymentDoubleRow: acct.handleAddPaymentDoubleRow,
    handleUpdatePaymentDoubleRow: acct.handleUpdatePaymentDoubleRow,
    handleRemovePaymentDoubleRow: acct.handleRemovePaymentDoubleRow,
    // ── journal
    journalEntryMode: acct.journalEntryMode,
    setJournalEntryMode: acct.setJournalEntryMode,
    journalRows: acct.journalRows,
    setJournalRows: acct.setJournalRows,
    handleAddJournalRow: acct.handleAddJournalRow,
    handleUpdateJournalRow: acct.handleUpdateJournalRow,
    handleRemoveJournalRow: acct.handleRemoveJournalRow,
    // ── stock / inventory
    stockEntries: inv.stockEntries,
    setStockEntries: inv.setStockEntries,
    handleAddStockRow: inv.handleAddStockRow,
    handleUpdateStockRow: inv.handleUpdateStockRow,
    handleRemoveStockRow: inv.handleRemoveStockRow,
    additionalEntries: inv.additionalEntries,
    setAdditionalEntries: inv.setAdditionalEntries,
    handleAddAdditionalRow: inv.handleAddAdditionalRow,
    handleUpdateAdditionalRow: inv.handleUpdateAdditionalRow,
    handleRemoveAdditionalRow: inv.handleRemoveAdditionalRow,
    // ── search / active field
    ledgerSearchTerm,
    setLedgerSearchTerm,
    stockSearchTerm,
    setStockSearchTerm,
    activeField,
    setActiveField,
    handleFieldFocus,
    handleFieldBlur,
    handleLedgerPanelSelect,
    // ── totals
    particularsTotal,
    debitTotal,
    creditTotal,
    totalAmount,
    // ── reset
    resetRows,
  };
}
