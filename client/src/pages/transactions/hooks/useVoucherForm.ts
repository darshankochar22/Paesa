import { useCallback, useEffect, useRef } from "react";
import { useVoucherMeta }       from "./useVoucherMeta";
import { useVoucherMasterData } from "./useVoucherMasterData";
import { useVoucherRows }       from "./useVoucherRows";
import { useVoucherTotals }     from "./useVoucherTotals";
import { useVoucherSubmit }     from "./useVoucherSubmit";
import { loadFormState, saveFormState, clearFormState } from "../../../utils/formPersistence";

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
    particularsTotal: totals.particularsTotal,
    debitTotal:       totals.debitTotal,
    creditTotal:      totals.creditTotal,
    totalAmount:      totals.totalAmount,
    checkIsCashOrBank: master.checkIsCashOrBank,
    fetchContextData:  master.fetchContextData,
  });

  const hasRestored  = useRef(false);
  const persistKey   = meta.persistKey;

  useEffect(() => {
    if (!persistKey || hasRestored.current) return;
    const saved = loadFormState<any>(persistKey);
    if (saved) {
      if (saved.voucherType) meta.setVoucherType(saved.voucherType);
      if (saved.narration) meta.setNarration(saved.narration);
      if (saved.referenceNumber) meta.setReferenceNumber(saved.referenceNumber);
      if (saved.placeOfSupply) meta.setPlaceOfSupply(saved.placeOfSupply);
      if (saved.supplierInvoiceNo) meta.setSupplierInvoiceNo(saved.supplierInvoiceNo);
      if (saved.supplierInvoiceDate) meta.setSupplierInvoiceDate(saved.supplierInvoiceDate);
      if (saved.accountLedger) rows.setAccountLedger(saved.accountLedger);
      if (saved.particulars) rows.setParticulars(saved.particulars);
      if (saved.journalRows) rows.setJournalRows(saved.journalRows);
      if (saved.contraEntryMode) rows.setContraEntryMode(saved.contraEntryMode);
      if (saved.contraDoubleRows) rows.setContraDoubleRows(saved.contraDoubleRows);
      if (saved.partyLedger) rows.setPartyLedger(saved.partyLedger);
      if (saved.salesPurchaseLedger) rows.setSalesPurchaseLedger(saved.salesPurchaseLedger);
      if (saved.stockEntries) rows.setStockEntries(saved.stockEntries);
      if (saved.additionalEntries) rows.setAdditionalEntries(saved.additionalEntries);
      if (saved.partyBillReferences) rows.setPartyBillReferences(saved.partyBillReferences);
      if (saved.bankDetails) rows.setBankDetails(saved.bankDetails);
      if (saved.cashDenominations) rows.setCashDenominations(saved.cashDenominations);
    }
    hasRestored.current = true;
  }, [persistKey]);

  useEffect(() => {
    if (!persistKey || !hasRestored.current) return;
    saveFormState(persistKey, {
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
      cashDenominations:   rows.cashDenominations,
    });
  }, [
    persistKey,
    meta.voucherType,
    meta.narration,
    meta.referenceNumber,
    meta.placeOfSupply,
    meta.supplierInvoiceNo,
    meta.supplierInvoiceDate,
    rows.accountLedger,
    rows.particulars,
    rows.journalRows,
    rows.contraEntryMode,
    rows.contraDoubleRows,
    rows.partyLedger,
    rows.salesPurchaseLedger,
    rows.stockEntries,
    rows.additionalEntries,
    rows.partyBillReferences,
    rows.bankDetails,
    rows.cashDenominations,
  ]);

  useEffect(() => {
    master.fetchContextData();
    meta.fetchNextNumber();
  }, []);

  useEffect(() => {
    meta.fetchNextNumber();
  }, [meta.voucherType]);

  const resetForm = useCallback(() => {
    if (persistKey) clearFormState(persistKey);
    hasRestored.current = false;
    meta.resetMeta();
    rows.resetRows(meta.voucherType);
    meta.fetchNextNumber();
  }, [persistKey, meta, rows]);

  useEffect(() => {
    submit.setResetForm(resetForm);
  }, [resetForm, submit.setResetForm]);

  return {
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
    accountLedger:             rows.accountLedger,
    setAccountLedger:          rows.setAccountLedger,
    accountBalance:            rows.accountBalance,
    particulars:               rows.particulars,
    setParticulars:            rows.setParticulars,
    handleAddParticularRow:    rows.handleAddParticularRow,
    handleUpdateParticularRow: rows.handleUpdateParticularRow,
    handleRemoveParticularRow: rows.handleRemoveParticularRow,
    contraEntryMode:            rows.contraEntryMode,
    setContraEntryMode:         rows.setContraEntryMode,
    contraDoubleRows:           rows.contraDoubleRows,
    setContraDoubleRows:        rows.setContraDoubleRows,
    handleAddContraDoubleRow:   rows.handleAddContraDoubleRow,
    handleUpdateContraDoubleRow: rows.handleUpdateContraDoubleRow,
    handleRemoveContraDoubleRow: rows.handleRemoveContraDoubleRow,
    journalRows:          rows.journalRows,
    setJournalRows:       rows.setJournalRows,
    handleAddJournalRow:  rows.handleAddJournalRow,
    handleUpdateJournalRow: rows.handleUpdateJournalRow,
    handleRemoveJournalRow: rows.handleRemoveJournalRow,
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
    activeAllocation:      rows.activeAllocation,
    setActiveAllocation:   rows.setActiveAllocation,
    partyBillReferences:   rows.partyBillReferences,
    setPartyBillReferences: rows.setPartyBillReferences,
    bankDetails:           rows.bankDetails,
    setBankDetails:        rows.setBankDetails,
    cashDenominations:     rows.cashDenominations,
    setCashDenominations:  rows.setCashDenominations,
    ledgerSearchTerm:       rows.ledgerSearchTerm,
    setLedgerSearchTerm:    rows.setLedgerSearchTerm,
    stockSearchTerm:        rows.stockSearchTerm,
    setStockSearchTerm:     rows.setStockSearchTerm,
    activeField:            rows.activeField,
    handleFieldFocus:       rows.handleFieldFocus,
    handleFieldBlur:        rows.handleFieldBlur,
    handleLedgerPanelSelect: rows.handleLedgerPanelSelect,
    particularsTotal: totals.particularsTotal,
    debitTotal:       totals.debitTotal,
    creditTotal:      totals.creditTotal,
    totalAmount:      totals.totalAmount,
    isSubmitting:  submit.isSubmitting,
    error:         submit.error,
    setError:      submit.setError,
    success:       submit.success,
    setSuccess:    submit.setSuccess,
    handleSubmit:  submit.handleSubmit,
    resetForm,
  };
}