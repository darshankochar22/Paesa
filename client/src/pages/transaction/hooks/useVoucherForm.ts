import { useCallback, useEffect, useRef } from "react";
import { useVoucherMeta }       from "./useVoucherMeta";
import { useVoucherMasterData } from "./useVoucherMasterData";
import { useVoucherRows }       from "./useVoucherRows";
import { useVoucherTotals }     from "./useVoucherTotals";
import { useVoucherSubmit }     from "./useVoucherSubmit";
import { saveFormState, clearFormState } from "../../../utils/formPersistence";


export type { ParticularRow, StockEntryRow, ActiveField, ActiveAllocation } from "./useVoucherRows";
export type { VoucherType } from "./useVoucherMeta";

export function useVoucherForm() {

  const meta   = useVoucherMeta();
  const master = useVoucherMasterData(meta.companyId, meta.fyId);

  const rows = useVoucherRows({
    voucherType:       meta.voucherType,
    companyId:         meta.companyId,
    fyId:              meta.fyId,
    fetchLedgerBalance: master.fetchLedgerBalance,
    checkIsCashOrBank: master.checkIsCashOrBank,
    checkIsBank:       master.checkIsBank,
    checkIsCash:       master.checkIsCash,
    allUnits:          master.allUnits,
    persistKey:        meta.persistKey,
  });

  const totals = useVoucherTotals({
    voucherType:      meta.voucherType,
    contraEntryMode:  rows.contraEntryMode,
    particulars:      rows.particulars,
    journalRows:      rows.journalRows,
    contraDoubleRows: rows.contraDoubleRows,
    stockEntries:     rows.stockEntries,
    additionalEntries: rows.additionalEntries,
  });

  const submit = useVoucherSubmit({
    // meta
    companyId:          meta.companyId,
    fyId:               meta.fyId,
    voucherType:        meta.voucherType,
    date:               meta.date,
    status:             meta.status,
    supplierInvoiceNo:  meta.supplierInvoiceNo,
    supplierInvoiceDate: meta.supplierInvoiceDate,
    referenceNumber:    meta.referenceNumber,
    referenceDate:      meta.referenceDate,
    placeOfSupply:      meta.placeOfSupply,
    narration:          meta.narration,
    voucherNumber:      meta.voucherNumber,
    // rows
    contraEntryMode:     rows.contraEntryMode,
    accountLedger:       rows.accountLedger,
    particulars:         rows.particulars,
    contraDoubleRows:    rows.contraDoubleRows,
    journalRows:         rows.journalRows,
    partyLedger:         rows.partyLedger,
    salesPurchaseLedger: rows.salesPurchaseLedger,
    stockEntries:        rows.stockEntries,
    additionalEntries:   rows.additionalEntries,
    partyBillReferences: rows.partyBillReferences,
    bankDetails:         rows.bankDetails,
    cashDenominations:   rows.cashDenominations,
    // totals
    particularsTotal: totals.particularsTotal,
    debitTotal:       totals.debitTotal,
    creditTotal:      totals.creditTotal,
    totalAmount:      totals.totalAmount,
    // helpers
    checkIsCashOrBank: master.checkIsCashOrBank,
    fetchContextData:  master.fetchContextData,
  });

  // ─── Persistence ───────────────────────────────────────────────────────────

  const hasRestored  = useRef(false);
  const persistKey   = meta.persistKey;

  const getSnapshot = useCallback(() => ({
    voucherType:         meta.voucherType,
    narration:           meta.narration,
    referenceNumber:     meta.referenceNumber,
    placeOfSupply:       meta.placeOfSupply,
    supplierInvoiceNo:   meta.supplierInvoiceNo,
    supplierInvoiceDate: meta.supplierInvoiceDate,
    accountLedger:       rows.accountLedger,
    particulars:         rows.particulars,
    journalRows:         rows.journalRows,
    contraEntryMode:     rows.contraEntryMode,
    contraDoubleRows:    rows.contraDoubleRows,
    partyLedger:         rows.partyLedger,
    salesPurchaseLedger: rows.salesPurchaseLedger,
    stockEntries:        rows.stockEntries,
    additionalEntries:   rows.additionalEntries,
    partyBillReferences: rows.partyBillReferences,
    bankDetails:         rows.bankDetails,
  }), [meta, rows]);

  // Auto-save — skip first render so we don't overwrite just-restored state
  useEffect(() => {
    if (!persistKey) return;
    if (!hasRestored.current) {
      hasRestored.current = true;
      return;
    }
    saveFormState(persistKey, getSnapshot());
  }, [persistKey, getSnapshot]);

  // ─── Fetch on mount ────────────────────────────────────────────────────────

  useEffect(() => {
    master.fetchContextData();
    meta.fetchNextNumber();
  }, []);

  // Re-fetch voucher number whenever type changes
  useEffect(() => {
    meta.fetchNextNumber();
  }, [meta.voucherType]);

  // ─── Reset ─────────────────────────────────────────────────────────────────

  const resetForm = useCallback(() => {
    if (persistKey) clearFormState(persistKey);
    hasRestored.current = false;
    meta.resetMeta();
    rows.resetRows(meta.voucherType);
    meta.fetchNextNumber();
  }, [persistKey, meta, rows]);

  // Wire resetForm into submit via effect — never during render
  useEffect(() => {
    submit.setResetForm(resetForm);
  }, [resetForm, submit.setResetForm]);

  // ─── Public API ────────────────────────────────────────────────────────────

  return {
    // ── meta ──────────────────────────────────────────────────────────────────
    companyId:           meta.companyId,
    fyId:                meta.fyId,
    persistKey:          meta.persistKey,
    voucherType:         meta.voucherType,
    setVoucherType:      meta.setVoucherType,
    voucherNumber:       meta.voucherNumber,
    voucherNumberLoading: meta.voucherNumberLoading,
    date:                meta.date,
    setDate:             meta.setDate,
    dateDisplay:         meta.dateDisplay,
    status:              meta.status,
    setStatus:           meta.setStatus,
    supplierInvoiceNo:   meta.supplierInvoiceNo,
    setSupplierInvoiceNo: meta.setSupplierInvoiceNo,
    supplierInvoiceDate: meta.supplierInvoiceDate,
    setSupplierInvoiceDate: meta.setSupplierInvoiceDate,
    narration:           meta.narration,
    setNarration:        meta.setNarration,
    referenceNumber:     meta.referenceNumber,
    setReferenceNumber:  meta.setReferenceNumber,
    referenceDate:       meta.referenceDate,
    setReferenceDate:    meta.setReferenceDate,
    placeOfSupply:       meta.placeOfSupply,
    setPlaceOfSupply:    meta.setPlaceOfSupply,

    // ── master data ───────────────────────────────────────────────────────────
    allLedgers:        master.allLedgers,
    allStockItems:     master.allStockItems,
    allGodowns:        master.allGodowns,
    allUnits:          master.allUnits,
    ledgersLoading:    master.ledgersLoading,
    fetchContextData:  master.fetchContextData,
    checkIsCashOrBank: master.checkIsCashOrBank,
    checkIsCash:       master.checkIsCash,
    checkIsBank:       master.checkIsBank,
    checkLedgerGroup:  master.checkLedgerGroup,

    // ── rows — layout 1 ───────────────────────────────────────────────────────
    accountLedger:             rows.accountLedger,
    setAccountLedger:          rows.setAccountLedger,
    accountBalance:            rows.accountBalance,
    particulars:               rows.particulars,
    setParticulars:            rows.setParticulars,
    handleAddParticularRow:    rows.handleAddParticularRow,
    handleUpdateParticularRow: rows.handleUpdateParticularRow,
    handleRemoveParticularRow: rows.handleRemoveParticularRow,

    // ── rows — layout 1b ──────────────────────────────────────────────────────
    contraEntryMode:            rows.contraEntryMode,
    setContraEntryMode:         rows.setContraEntryMode,
    contraDoubleRows:           rows.contraDoubleRows,
    setContraDoubleRows:        rows.setContraDoubleRows,
    handleAddContraDoubleRow:   rows.handleAddContraDoubleRow,
    handleUpdateContraDoubleRow: rows.handleUpdateContraDoubleRow,
    handleRemoveContraDoubleRow: rows.handleRemoveContraDoubleRow,

    // ── rows — layout 2 ───────────────────────────────────────────────────────
    journalRows:          rows.journalRows,
    setJournalRows:       rows.setJournalRows,
    handleAddJournalRow:  rows.handleAddJournalRow,
    handleUpdateJournalRow: rows.handleUpdateJournalRow,
    handleRemoveJournalRow: rows.handleRemoveJournalRow,

    // ── rows — layout 3 ───────────────────────────────────────────────────────
    partyLedger:               rows.partyLedger,
    setPartyLedger:            rows.setPartyLedger,
    partyBalance:              rows.partyBalance,
    salesPurchaseLedger:       rows.salesPurchaseLedger,
    setSalesPurchaseLedger:    rows.setSalesPurchaseLedger,
    salesPurchaseBalance:      rows.salesPurchaseBalance,
    stockEntries:              rows.stockEntries,
    handleAddStockRow:         rows.handleAddStockRow,
    handleUpdateStockRow:      rows.handleUpdateStockRow,
    handleRemoveStockRow:      rows.handleRemoveStockRow,
    additionalEntries:         rows.additionalEntries,
    setAdditionalEntries:      rows.setAdditionalEntries,
    handleAddAdditionalRow:    rows.handleAddAdditionalRow,
    handleUpdateAdditionalRow: rows.handleUpdateAdditionalRow,
    handleRemoveAdditionalRow: rows.handleRemoveAdditionalRow,

    // ── allocations ───────────────────────────────────────────────────────────
    activeAllocation:      rows.activeAllocation,
    setActiveAllocation:   rows.setActiveAllocation,
    partyBillReferences:   rows.partyBillReferences,
    setPartyBillReferences: rows.setPartyBillReferences,
    bankDetails:           rows.bankDetails,
    setBankDetails:        rows.setBankDetails,
    cashDenominations:     rows.cashDenominations,
    setCashDenominations:  rows.setCashDenominations,

    // ── search / panel ────────────────────────────────────────────────────────
    ledgerSearchTerm:       rows.ledgerSearchTerm,
    setLedgerSearchTerm:    rows.setLedgerSearchTerm,
    stockSearchTerm:        rows.stockSearchTerm,
    setStockSearchTerm:     rows.setStockSearchTerm,
    activeField:            rows.activeField,
    handleFieldFocus:       rows.handleFieldFocus,
    handleFieldBlur:        rows.handleFieldBlur,
    handleLedgerPanelSelect: rows.handleLedgerPanelSelect,

    // ── totals ────────────────────────────────────────────────────────────────
    particularsTotal: totals.particularsTotal,
    debitTotal:       totals.debitTotal,
    creditTotal:      totals.creditTotal,
    totalAmount:      totals.totalAmount,

    // ── submit ────────────────────────────────────────────────────────────────
    isSubmitting:  submit.isSubmitting,
    error:         submit.error,
    setError:      submit.setError,
    success:       submit.success,
    setSuccess:    submit.setSuccess,
    handleSubmit:  submit.handleSubmit,

    // ── reset ─────────────────────────────────────────────────────────────────
    resetForm,
  };
}