import { useMemo, useCallback } from "react";
import type { ActiveField } from "./useVoucherForm";
import type { LedgerType, StockItemType } from "../../../types/api";

interface UseVoucherCanAcceptParams {
  isSubmitting: boolean;
  voucherType: string;
  contraEntryMode: "single" | "double";

  // Layout 1 — single-entry
  accountLedger: LedgerType | null;
  particulars: { ledger: LedgerType | null; amountRaw: string }[];

  // Layout 1b — contra double
  contraDoubleRows: { ledger: LedgerType | null; amountRaw: string }[];
  debitTotal: number;
  creditTotal: number;

  // Layout 2 — journal
  journalRows: { ledger: LedgerType | null; amountRaw: string }[];

  // Layout 3 — sales/purchase
  partyLedger: LedgerType | null;
  salesPurchaseLedger: LedgerType | null;
  stockEntries: { stockItem: any; amountRaw: string }[];

  // Panel
  activeField: ActiveField | null;
  allLedgers: LedgerType[];
  allStockItems: StockItemType[];
  ledgerSearchTerm: string;
  stockSearchTerm: string;
  setLedgerSearchTerm: (v: string) => void;
  setStockSearchTerm: (v: string) => void;
  checkIsCashOrBank: (ledger: LedgerType | null) => boolean;
  checkLedgerGroup: (ledger: LedgerType | null, targets: string[]) => boolean;
}

export function useVoucherCanAccept({
  isSubmitting,
  voucherType,
  contraEntryMode,
  accountLedger,
  particulars,
  contraDoubleRows,
  debitTotal,
  creditTotal,
  journalRows,
  partyLedger,
  salesPurchaseLedger,
  stockEntries,
  activeField,
  allLedgers,
  allStockItems,
  ledgerSearchTerm,
  stockSearchTerm,
  setLedgerSearchTerm,
  setStockSearchTerm,
  checkIsCashOrBank,
  checkLedgerGroup,
}: UseVoucherCanAcceptParams) {

  const canAccept = useMemo(() => {
    if (isSubmitting) return false;

    if (["Receipt", "Payment"].includes(voucherType)) {
      return (
        !!accountLedger &&
        particulars.some((p) => !!p.ledger && (Number(p.amountRaw) || 0) > 0)
      );
    }

    if (voucherType === "Contra") {
      if (contraEntryMode === "single") {
        return (
          !!accountLedger &&
          particulars.some((p) => !!p.ledger && (Number(p.amountRaw) || 0) >= 0)
        );
      }
      const filled = contraDoubleRows.filter(
        (r) => !!r.ledger && (Number(r.amountRaw) || 0) >= 0
      );
      return (
        filled.length >= 2 &&
        Math.abs(debitTotal - creditTotal) < 0.01
      );
    }

    if (voucherType === "Journal") {
      const filled = journalRows.filter(
        (r) => !!r.ledger && (Number(r.amountRaw) || 0) > 0
      );
      return (
        filled.length >= 2 &&
        Math.abs(debitTotal - creditTotal) < 0.01
      );
    }

    if (["Sales", "Purchase"].includes(voucherType)) {
      return (
        !!partyLedger &&
        !!salesPurchaseLedger &&
        stockEntries.some((s) => !!s.stockItem && (Number(s.amountRaw) || 0) > 0)
      );
    }

    return false;
  }, [
    isSubmitting,
    voucherType,
    contraEntryMode,
    accountLedger,
    particulars,
    contraDoubleRows,
    debitTotal,
    creditTotal,
    journalRows,
    partyLedger,
    salesPurchaseLedger,
    stockEntries,
  ]);

  const panelItems = useMemo(() => {
    const af = activeField;
    if (!af) return [];

    if (af.type === "stockItem") return allStockItems;

    if (af.type === "account") {
      if (voucherType === "Contra") {
        return allLedgers.filter((l) => checkIsCashOrBank(l));
      }
      return allLedgers;
    }

    if (af.type === "party") {
      return allLedgers.filter((l) =>
        checkLedgerGroup(l, [
          "bank accounts",
          "bank od accounts",
          "bank od a/c",
          "cash-in-hand",
          "sundry debtors",
          "sundry creditors",
        ])
      );
    }

    if (af.type === "salesPurchase") {
      return allLedgers.filter((l) =>
        checkLedgerGroup(
          l,
          voucherType === "Sales" ? ["sales accounts"] : ["purchase accounts"]
        )
      );
    }

    if (voucherType === "Contra" && af.type === "particular") {
      return allLedgers.filter((l) => checkIsCashOrBank(l));
    }

    return allLedgers;
  }, [
    activeField,
    voucherType,
    allLedgers,
    allStockItems,
    checkIsCashOrBank,
    checkLedgerGroup,
  ]);

  const panelTitle = useMemo(() => {
    const af = activeField;
    if (!af) return "List of Ledger Accounts";
    if (af.type === "stockItem")    return "List of Stock Items";
    if (af.type === "account")      return "List of Cash / Bank Accounts";
    if (af.type === "party")        return "List of Party Accounts";
    if (af.type === "salesPurchase") return `List of ${voucherType} Ledgers`;
    return "List of Ledger Accounts";
  }, [activeField, voucherType]);

  const panelSearchTerm =
    activeField?.type === "stockItem" ? stockSearchTerm : ledgerSearchTerm;

  const handlePanelSearchChange = useCallback(
    (v: string) => {
      if (activeField?.type === "stockItem") setStockSearchTerm(v);
      else setLedgerSearchTerm(v);
    },
    [activeField, setStockSearchTerm, setLedgerSearchTerm]
  );

  return {
    canAccept,
    panelItems,
    panelTitle,
    panelSearchTerm,
    handlePanelSearchChange,
  };
}
