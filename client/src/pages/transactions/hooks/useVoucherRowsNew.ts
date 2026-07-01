// hooks/useVoucherRowsNew.ts
// ─── Barrel/Orchestrator hook: calls useAccountingRows & useInventoryRows ───────
//
// Public API returned from this hook is 100% identical to the monolithic version.
// No other hook or component file requires any modifications.

import { useState, useCallback, useMemo } from "react";
import type { LedgerType, StockItemType, UnitType, GodownType } from "../../../types/api";
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
  stockBalances: Record<number, number>;
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
  stockBalances,
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
    stockBalances,
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
    if (((voucherType === "Journal" || voucherType === "Reversing Journal") && acct.journalEntryMode === "double") || voucherType === "Memorandum") {
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
    if (((voucherType === "Journal" || voucherType === "Reversing Journal") && acct.journalEntryMode === "double") || voucherType === "Memorandum") {
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
    if (voucherType === "Journal" || voucherType === "Reversing Journal") return acct.journalEntryMode === "single" ? particularsTotal : debitTotal;
    if (voucherType === "Memorandum") return debitTotal;
    if (["Sales", "Purchase", "Credit Note", "Debit Note", "Delivery Note", "Receipt Note", "Rejection In", "Rejection Out", "Material In", "Material Out"].includes(voucherType)) {
      const stockSum = inv.stockEntries.reduce((s, r) => s + (Number(r.amountRaw) || 0), 0);
      const adjSum = inv.additionalEntries.reduce((s, r) => {
        const amt = Number(r.amountRaw) || 0;
        if (voucherType === "Sales") return r.type === "Cr" ? s + amt : s - amt;
        return r.type === "Dr" ? s + amt : s - amt;
      }, 0);
      return Math.max(0, stockSum + adjSum);
    }
    if (voucherType === "Physical Stock") {
      return inv.stockEntries.reduce((s, r) => s + (Number(r.amountRaw) || 0), 0);
    }
    if (voucherType === "Stock Journal" || voucherType === "Manufacturing Journal") {
      return inv.destinationStockEntries.reduce((s, r) => s + (Number(r.amountRaw) || 0), 0);
    }
    if (voucherType === "Payroll") {
      return acct.payrollEntriesFromGroups.reduce((s, r) => s + (Number(r.amountRaw) || 0), 0);
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
    inv.destinationStockEntries,
    acct.payrollEntries,
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
          if (voucherType === "Journal" || voucherType === "Reversing Journal" || voucherType === "Memorandum") {
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
          if (inv.sourceStockEntries.some(r => r.id === activeField.rowId)) {
            inv.handleUpdateSourceStockRow(activeField.rowId, { stockItem, unit: matchingUnit });
          } else if (inv.destinationStockEntries.some(r => r.id === activeField.rowId)) {
            inv.handleUpdateDestinationStockRow(activeField.rowId, { stockItem, unit: matchingUnit });
          } else {
            inv.handleUpdateStockRow(activeField.rowId, { stockItem, unit: matchingUnit });
          }
          break;
        }
        case "stockGodown": {
          const godown = item as GodownType;
          if (inv.sourceStockEntries.some(r => r.id === activeField.rowId)) {
            inv.handleUpdateSourceStockRow(activeField.rowId, { godown });
          } else if (inv.destinationStockEntries.some(r => r.id === activeField.rowId)) {
            inv.handleUpdateDestinationStockRow(activeField.rowId, { godown });
          } else {
            inv.handleUpdateStockRow(activeField.rowId, { godown });
          }
          break;
        }
        case "employee": {
          const employee = item as any;
          if (acct.attendanceEntries.some(r => r.id === activeField.rowId)) {
            acct.handleUpdateAttendanceRow(activeField.rowId, { employee });
          } else if (acct.payrollEntries.some(r => r.id === activeField.rowId)) {
            acct.handleUpdatePayrollRow(activeField.rowId, { employee });
          }
          break;
        }
        case "attendanceType": {
          const attendanceType = item as any;
          acct.handleUpdateAttendanceRow(activeField.rowId, { attendanceType });
          break;
        }
        case "payHead": {
          const payHead = item as any;
          acct.handleUpdatePayrollRow(activeField.rowId, { payHead });
          break;
        }
        case "payrollCategory": {
          const { groupId } = activeField as any;
          acct.handleUpdatePayrollGroup(groupId, { category: item });
          break;
        }
        case "payrollEmployee": {
          const { groupId, empRowId } = activeField as any;
          acct.handleUpdatePayrollEmployeeRow(groupId, empRowId, { employee: item });
          break;
        }
        case "payrollPayHead": {
          const { groupId, empRowId, phRowId } = activeField as any;
          acct.handleUpdatePayrollPayHeadRow(groupId, empRowId, phRowId, { payHead: item });
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
      inv.sourceStockEntries,
      inv.destinationStockEntries,
      inv.handleUpdateSourceStockRow,
      inv.handleUpdateDestinationStockRow,
      acct.attendanceEntries,
      acct.payrollEntries,
      acct.handleUpdateAttendanceRow,
      acct.handleUpdatePayrollRow,
      acct.handleUpdatePayrollGroup,
      acct.handleUpdatePayrollEmployeeRow,
      acct.handleUpdatePayrollPayHeadRow,
    ]
  );

  // ─── Reset rows (called from full resetForm) ──────────────────────────────
  const resetRows = useCallback(
    (currentVoucherType: string) => {
      const defaultParticular: "Dr" | "Cr" =
        currentVoucherType === "Receipt" ? "Cr"
        : currentVoucherType === "Payment" ? "Dr"
        : "Dr";
      acct.resetAccountingRows(defaultParticular, currentVoucherType);
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
    sourceStockEntries: inv.sourceStockEntries,
    setSourceStockEntries: inv.setSourceStockEntries,
    handleAddSourceStockRow: inv.handleAddSourceStockRow,
    handleUpdateSourceStockRow: inv.handleUpdateSourceStockRow,
    handleRemoveSourceStockRow: inv.handleRemoveSourceStockRow,
    destinationStockEntries: inv.destinationStockEntries,
    setDestinationStockEntries: inv.setDestinationStockEntries,
    handleAddDestinationStockRow: inv.handleAddDestinationStockRow,
    handleUpdateDestinationStockRow: inv.handleUpdateDestinationStockRow,
    handleRemoveDestinationStockRow: inv.handleRemoveDestinationStockRow,
    additionalEntries: inv.additionalEntries,
    setAdditionalEntries: inv.setAdditionalEntries,
    handleAddAdditionalRow: inv.handleAddAdditionalRow,
    handleUpdateAdditionalRow: inv.handleUpdateAdditionalRow,
    handleRemoveAdditionalRow: inv.handleRemoveAdditionalRow,
    // ── attendance
    attendanceEntries: acct.attendanceEntries,
    setAttendanceEntries: acct.setAttendanceEntries,
    handleAddAttendanceRow: acct.handleAddAttendanceRow,
    handleUpdateAttendanceRow: acct.handleUpdateAttendanceRow,
    handleRemoveAttendanceRow: acct.handleRemoveAttendanceRow,
    // ── payroll
    payrollEntries: acct.payrollEntries,
    setPayrollEntries: acct.setPayrollEntries,
    handleAddPayrollRow: acct.handleAddPayrollRow,
    handleUpdatePayrollRow: acct.handleUpdatePayrollRow,
    handleRemovePayrollRow: acct.handleRemovePayrollRow,
    // ── payroll groups
    payrollGroups: acct.payrollGroups,
    setPayrollGroups: acct.setPayrollGroups,
    payrollEntriesFromGroups: acct.payrollEntriesFromGroups,
    handleAddPayrollGroup: acct.handleAddPayrollGroup,
    handleUpdatePayrollGroup: acct.handleUpdatePayrollGroup,
    handleAddPayrollEmployeeRow: acct.handleAddPayrollEmployeeRow,
    handleUpdatePayrollEmployeeRow: acct.handleUpdatePayrollEmployeeRow,
    handleAddPayrollPayHeadRow: acct.handleAddPayrollPayHeadRow,
    handleUpdatePayrollPayHeadRow: acct.handleUpdatePayrollPayHeadRow,
    handleRemovePayrollPayHeadRow: acct.handleRemovePayrollPayHeadRow,
    handleRemovePayrollEmployeeRow: acct.handleRemovePayrollEmployeeRow,
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
    // ── warnings
    negativeStockWarnings: inv.negativeStockWarnings,
    // ── reset
    resetRows,
  };
}
