import { useCallback, useEffect, useRef } from 'react';
import { useCompany } from '../../../context/CompanyContext';

import { useState } from 'react'; // add useState to your existing import from "react"

import { useVoucherMeta } from './useVoucherMeta';
import { useVoucherLedgers } from './useVoucherLedgers';
import { useVoucherRows as useVoucherRowsInternal } from './useVoucherRowsNew';
import { pickDefaultRegistrationFrom } from '../utils/defaultRegistration';
import { validateVoucher, submitVoucher } from './voucherSubmit';
import { makePayrollPayHeadRow } from '../utils/rowFactories';
import type { PayrollPayHeadRow } from '../types';

// Re-export types so any file that previously imported from this hook still works
export type { ParticularRow, StockEntryRow, ActiveField, ActiveAllocation } from '../types';

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useVoucherForm(
  resolveEffectiveType?: (type: string) => string,
  editVoucherId?: number | null,
  onSaved?: () => void,
  onNewVoucherSaved?: (info: {
    voucherId: number;
    savedNumber: string;
    partyGstin?: string;
    voucherType: string;
    provideEInvoice: 'Yes' | 'No';
  }) => void,
) {
  const { selectedCompany, activeFY, features } = useCompany();
  const companyId = selectedCompany?.company_id;
  const fyId = activeFY?.fy_id;
  // ── GST Registration / Tax Unit / Price Level masters ─────────────────────
  const [allGstRegistrations, setAllGstRegistrations] = useState<any[]>([]);
  const [allTaxUnits, setAllTaxUnits] = useState<any[]>([]);
  const [allPriceLevels, setAllPriceLevels] = useState<string[]>([]);

  const [gstRegistration, setGstRegistrationState] = useState<any | null>(null);
  const [taxUnit, setTaxUnit] = useState<any | null>(null);
  const [priceLevel, setPriceLevel] = useState<string>('');

  // Bug 5: the company's persisted "current default GST registration id" — the single
  // source of truth for what a NEW voucher prefills. Fetched fresh from the backend (not
  // read off a possibly-stale company object) and updated the instant the user changes it.
  const [defaultRegistrationId, setDefaultRegistrationId] = useState<number | null>(null);

  // Bug 5: the GST registration must default to the company's registration and persist —
  // not reset to "Not Applicable" on every new/reopened voucher. `gstTouchedRef` records
  // whether the user (or hydrate) explicitly set it, so the default-seeding effect below
  // never clobbers an explicit choice (including an explicit "Not Applicable"/null).
  const gstTouchedRef = useRef(false);
  const setGstRegistration = useCallback((val: any | null) => {
    gstTouchedRef.current = true;
    setGstRegistrationState(val);
  }, []);

  // Per-godown balances for the item currently being entered (Physical Stock's
  // "List of Godowns" quantity column). Fetched on item selection.
  const [godownBalances, setGodownBalances] = useState<Record<number, number>>({});
  const fetchGodownBalances = useCallback(
    async (itemId?: number | null) => {
      if (!companyId || !itemId) {
        setGodownBalances({});
        return;
      }
      try {
        const res = await window.api.stockItem.getStockBalancesByGodown({
          company_id: companyId,
          item_id: itemId,
        });
        setGodownBalances(res?.success && res.balances ? res.balances : {});
      } catch {
        setGodownBalances({});
      }
    },
    [companyId],
  );

  // Active batches for the item currently being entered (Physical Stock's
  // "List of Active Batches" picker on the Batch/Lot No. field).
  const [activeBatches, setActiveBatches] = useState<
    { name: string; expiry: string; balance: number }[]
  >([]);
  const fetchActiveBatches = useCallback(
    async (itemId?: number | null) => {
      if (!companyId || !itemId) {
        setActiveBatches([]);
        return;
      }
      try {
        const res = await window.api.stockItem.getActiveBatches({
          company_id: companyId,
          item_id: itemId,
        });
        setActiveBatches(res?.success && res.batches ? res.batches : []);
      } catch {
        setActiveBatches([]);
      }
    },
    [companyId],
  );

  const fetchTaxAndPriceMasters = useCallback(async () => {
    if (!companyId) return;
    // Each master loads INDEPENDENTLY — a failure in one (e.g. a newly-added IPC handler
    // not yet registered) must never blank the others. Previously these shared a single
    // Promise.all, so one rejected call wiped the whole GST-registration list.
    try {
      const gstRes = await window.api.gstRegistration.getAll(companyId);
      if (gstRes?.success) setAllGstRegistrations(gstRes.gstRegistrations || []);
    } catch (err) {
      console.error('Failed to load GST registrations:', err);
    }
    try {
      const taxUnitRes = await window.api.taxUnits.getAll(companyId);
      if (taxUnitRes?.success) setAllTaxUnits(taxUnitRes.taxUnits || []);
    } catch (err) {
      console.error('Failed to load tax units:', err);
    }
    try {
      const priceLevelRes = await window.api.priceLevels.get(companyId);
      if (priceLevelRes?.success) {
        setAllPriceLevels((priceLevelRes.data || []).filter((n: string) => !!n && n.trim() !== ''));
      }
    } catch (err) {
      console.error('Failed to load price levels:', err);
    }
    // The default registration persists in localStorage (durable across app restarts even
    // if the backend handler isn't yet live) with the backend as a secondary/cross-surface
    // store. localStorage wins when present.
    let backendId: number | null = null;
    try {
      const defaultRegRes = await window.api.company.getDefaultGstRegistration(companyId);
      if (defaultRegRes?.success && defaultRegRes.current_default_gst_registration_id != null) {
        backendId = Number(defaultRegRes.current_default_gst_registration_id);
      }
    } catch (err) {
      console.error('Failed to load default GST registration:', err);
    }
    let localId: number | null = null;
    try {
      const raw = localStorage.getItem(`defaultGstRegistration:${companyId}`);
      if (raw != null && raw !== '') localId = Number(raw);
    } catch {
      /* localStorage unavailable — fall back to backend */
    }
    setDefaultRegistrationId(localId != null ? localId : backendId);
  }, [companyId]);

  useEffect(() => {
    fetchTaxAndPriceMasters();
  }, [fetchTaxAndPriceMasters]);

  // Bug 5: seed strictly from the company's persisted default registration — NO fallback
  // to the first record (which was the reported bug: it showed Arunachal instead of the
  // last-selected Chhattisgarh).
  const pickDefaultRegistration = useCallback(
    () => pickDefaultRegistrationFrom(defaultRegistrationId, allGstRegistrations),
    [allGstRegistrations, defaultRegistrationId],
  );

  // Bug 5: persist the user's registration choice as the company default the INSTANT it is
  // picked (not only on save). Written to localStorage (durable, no backend dependency) AND
  // the backend (best-effort). A freshly-opened voucher — even after an app restart — seeds
  // from this, so the choice sticks until explicitly changed.
  const persistDefaultRegistration = useCallback(
    async (gstId: number | null) => {
      const value = gstId != null ? Number(gstId) : null;
      setDefaultRegistrationId(value);
      if (!companyId) return;
      try {
        if (value != null)
          localStorage.setItem(`defaultGstRegistration:${companyId}`, String(value));
        else localStorage.removeItem(`defaultGstRegistration:${companyId}`);
      } catch {
        /* localStorage unavailable — the backend write below still persists it */
      }
      try {
        await window.api.company.setDefaultGstRegistration(companyId, value);
      } catch (e) {
        console.error('Failed to persist default GST registration to backend:', e);
      }
    },
    [companyId],
  );

  // Seed the default for a NEW voucher once registrations + the persisted default load.
  // Edit mode hydrates from the saved voucher instead, and an explicit user choice is
  // never overwritten.
  useEffect(() => {
    if (editVoucherId) return;
    if (gstTouchedRef.current) return;
    const chosen = pickDefaultRegistration();
    if (chosen) setGstRegistrationState(chosen);
  }, [pickDefaultRegistration, editVoucherId]);

  // ── Sub-hooks ──────────────────────────────────────────────────────────────

  const meta = useVoucherMeta({
    initialVoucherType: 'Receipt',
    initialNarration: '',
    initialReferenceNumber: '',
    initialPlaceOfSupply: 'Select',
    initialPartyBillReferences: [],
    initialBankDetails: null,
  });

  const ledgers = useVoucherLedgers({ companyId, fyId });

  const effectiveVoucherType = resolveEffectiveType
    ? (resolveEffectiveType(meta.voucherType) ?? meta.voucherType)
    : meta.voucherType;

  const rows = useVoucherRowsInternal({
    initialAdditionalEntries: [],
    initialContraEntryMode: 'double',
    initialReceiptEntryMode: 'double',
    initialJournalEntryMode: 'double',
    initialPaymentEntryMode: 'double',
    fetchLedgerBalance: ledgers.fetchLedgerBalance,
    voucherType: effectiveVoucherType,
    allUnits: ledgers.allUnits,
    stockBalances: ledgers.stockBalances,
  });

  // ── Payroll Autofill ───────────────────────────────────────────────────────
  // TallyPrime fills each employee's pay heads from their saved Salary Details
  // when the employee is picked in a Payroll voucher — the user doesn't retype
  // the amounts. On employee selection we fetch their latest salary structure and
  // replace that employee's pay-head rows with the defined pay heads + amounts.
  const autofillPayrollEmployee = useCallback(
    async (groupId: string, empRowId: string, employee: { employee_id?: number } | null) => {
      if (!companyId || !employee?.employee_id) return;
      let res;
      try {
        res = await window.api.salaryStructure.getByEmployee(companyId, employee.employee_id);
      } catch {
        return;
      }
      // getByEmployee returns structures newest-first; use the most recent one.
      const def = res?.success ? (res.salaryStructures?.[0]?.pay_heads ?? []) : [];
      const filled: PayrollPayHeadRow[] = def
        .map((d) => ({
          ...makePayrollPayHeadRow(),
          payHead: ledgers.allPayHeads.find((p) => p.pay_head_id === d.pay_head_id) ?? null,
          amountRaw: d.amount ? String(d.amount) : '',
        }))
        .filter((r) => r.payHead); // drop pay heads not in the loaded master list
      if (filled.length === 0) return; // no salary details — leave the blank row as-is
      // Trailing blank row so the user can still add more pay heads (Tally-style).
      filled.push(makePayrollPayHeadRow());
      rows.setPayrollGroups((prev) =>
        prev.map((g) =>
          g.id === groupId
            ? {
                ...g,
                employeeRows: g.employeeRows.map((e) =>
                  e.id === empRowId ? { ...e, payHeadRows: filled } : e,
                ),
              }
            : g,
        ),
      );
    },
    [companyId, ledgers.allPayHeads, rows.setPayrollGroups],
  );

  // ── Load master data and next voucher number on mount ─────────────────────

  const fetchNextNumber = useCallback(async () => {
    await ledgers.fetchNextVoucherNumber(
      meta.voucherType,
      meta.setVoucherNumber,
      meta.setVoucherNumberLoading,
    );
  }, [
    ledgers.fetchNextVoucherNumber,
    meta.voucherType,
    meta.setVoucherNumber,
    meta.setVoucherNumberLoading,
  ]);

  useEffect(() => {
    ledgers.fetchContextData();
    // In edit mode the voucher number comes from the saved voucher, not a fresh one.
    if (!editVoucherId) fetchNextNumber();
  }, [ledgers.fetchContextData, fetchNextNumber, editVoucherId]);

  // ── Ledger balance sync ────────────────────────────────────────────────────

  useEffect(() => {
    if (rows.accountLedger?.ledger_id) {
      ledgers
        .fetchLedgerBalance(rows.accountLedger.ledger_id)
        .then((b) => rows.setAccountBalance(b.label));
    } else {
      rows.setAccountBalance('');
    }
  }, [rows.accountLedger, ledgers.fetchLedgerBalance]);

  useEffect(() => {
    if (rows.partyLedger?.ledger_id) {
      ledgers
        .fetchLedgerBalance(rows.partyLedger.ledger_id)
        .then((b) => rows.setPartyBalance(b.label));
    } else {
      rows.setPartyBalance('');
    }
  }, [rows.partyLedger, ledgers.fetchLedgerBalance]);

  useEffect(() => {
    if (rows.salesPurchaseLedger?.ledger_id) {
      ledgers
        .fetchLedgerBalance(rows.salesPurchaseLedger.ledger_id)
        .then((b) => rows.setSalesPurchaseBalance(b.label));
    } else {
      rows.setSalesPurchaseBalance('');
    }
  }, [rows.salesPurchaseLedger, ledgers.fetchLedgerBalance]);

  // ── Reset on voucher type change ───────────────────────────────────────────

  const resetFormRef = useRef<() => void>(() => {});
  const prevVoucherType = useRef(meta.voucherType);
  useEffect(() => {
    if (prevVoucherType.current !== meta.voucherType) {
      prevVoucherType.current = meta.voucherType;
      // In edit mode the type is set once from the saved voucher — don't wipe the
      // hydrated rows.
      if (!editVoucherId) resetFormRef.current?.();
    }
  }, [meta.voucherType, editVoucherId]);

  // ── Validate ───────────────────────────────────────────────────────────────

  // Full validation body lives in voucherSubmit.ts (validateVoucher) — same
  // closure surface, passed explicitly.
  const validate = useCallback(
    (): string | null =>
      validateVoucher({
        companyId,
        fyId,
        effectiveVoucherType,
        meta,
        rows,
        ledgers,
        editVoucherId,
        onSaved,
        gstRegistration,
        features,
        resetForm,
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [companyId, fyId, effectiveVoucherType, rows, meta.date, ledgers.checkIsCashOrBank],
  );

  // ── handleSubmit ───────────────────────────────────────────────────────────
  // Payload building + submission live in voucherSubmit.ts (submitVoucher).
  const handleSubmit = useCallback(
    () =>
      submitVoucher({
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
        features,
        resetForm,
        onNewVoucherSaved,
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      validate,
      companyId,
      fyId,
      effectiveVoucherType,
      meta,
      rows,
      ledgers.fetchContextData,
      editVoucherId,
      onSaved,
      gstRegistration,
      features,
    ],
  );

  // ── resetForm ──────────────────────────────────────────────────────────────

  const resetForm = useCallback(() => {
    meta.resetMeta();
    rows.resetRows(effectiveVoucherType);
    fetchNextNumber();
    // Bug 5: re-seed the default GST registration for the next new voucher rather than
    // dropping back to "Not Applicable".
    gstTouchedRef.current = false;
    setGstRegistrationState(pickDefaultRegistration());
  }, [
    meta.resetMeta,
    rows.resetRows,
    effectiveVoucherType,
    fetchNextNumber,
    pickDefaultRegistration,
  ]);

  resetFormRef.current = resetForm;

  // ── Public API — IDENTICAL to original useVoucherForm ─────────────────────

  return {
    // ── Voucher meta
    voucherType: meta.voucherType,
    setVoucherType: meta.setVoucherType,
    voucherNumber: meta.voucherNumber,
    voucherNumberLoading: meta.voucherNumberLoading,
    setVoucherNumber: meta.setVoucherNumber,
    date: meta.date,
    setDate: meta.setDate,
    dateDisplay: meta.dateDisplay,
    status: meta.status,
    setStatus: meta.setStatus,
    isOptional: meta.isOptional,
    setIsOptional: meta.setIsOptional,
    applicableUpto: meta.applicableUpto,
    setApplicableUpto: meta.setApplicableUpto,
    supplierInvoiceNo: meta.supplierInvoiceNo,
    setSupplierInvoiceNo: meta.setSupplierInvoiceNo,
    supplierInvoiceDate: meta.supplierInvoiceDate,
    setSupplierInvoiceDate: meta.setSupplierInvoiceDate,
    narration: meta.narration,
    setNarration: meta.setNarration,

    // ── Computed totals
    totalAmount: rows.totalAmount,
    debitTotal: rows.debitTotal,
    creditTotal: rows.creditTotal,
    particularsTotal: rows.particularsTotal,

    // ── Submission
    isSubmitting: meta.isSubmitting,
    error: meta.error,
    setError: meta.setError,
    success: meta.success,
    setSuccess: meta.setSuccess,
    handleSubmit,
    resetForm,

    // ── Advanced allocations
    activeAllocation: meta.activeAllocation,
    setActiveAllocation: meta.setActiveAllocation,
    partyBillReferences: meta.partyBillReferences,
    setPartyBillReferences: meta.setPartyBillReferences,
    bankDetails: meta.bankDetails,
    setBankDetails: meta.setBankDetails,
    cashDenominations: meta.cashDenominations,
    setCashDenominations: meta.setCashDenominations,
    receiptDetails: meta.receiptDetails,
    setReceiptDetails: meta.setReceiptDetails,
    partyDetails: meta.partyDetails,
    setPartyDetails: meta.setPartyDetails,
    dispatchDetails: meta.dispatchDetails,
    setDispatchDetails: meta.setDispatchDetails,
    creditNoteDetails: meta.creditNoteDetails,
    setCreditNoteDetails: meta.setCreditNoteDetails,
    debitNoteDetails: meta.debitNoteDetails,
    setDebitNoteDetails: meta.setDebitNoteDetails,
    exciseDetails: meta.exciseDetails,
    setExciseDetails: meta.setExciseDetails,
    vatDetails: meta.vatDetails,
    setVatDetails: meta.setVatDetails,
    gstEwayDetails: meta.gstEwayDetails,
    setGstEwayDetails: meta.setGstEwayDetails,
    provideEInvoice: meta.provideEInvoice,
    setProvideEInvoice: meta.setProvideEInvoice,
    eInvoiceDetails: meta.eInvoiceDetails,
    setEInvoiceDetails: meta.setEInvoiceDetails,
    manufacturerImporterDetails: meta.manufacturerImporterDetails,
    setManufacturerImporterDetails: meta.setManufacturerImporterDetails,
    orderDetails: meta.orderDetails,
    setOrderDetails: meta.setOrderDetails,
    sourceGodown: meta.sourceGodown,
    setSourceGodown: meta.setSourceGodown,

    // ── Reference / invoice
    referenceNumber: meta.referenceNumber,
    setReferenceNumber: meta.setReferenceNumber,
    referenceDate: meta.referenceDate,
    setReferenceDate: meta.setReferenceDate,
    placeOfSupply: meta.placeOfSupply,
    setPlaceOfSupply: meta.setPlaceOfSupply,
    voucherClass: meta.voucherClass,
    setVoucherClass: meta.setVoucherClass,

    // ── Master data
    allGstRegistrations,
    allTaxUnits,
    allPriceLevels,
    gstRegistration,
    setGstRegistration,
    persistDefaultRegistration,
    taxUnit,
    setTaxUnit,
    priceLevel,
    setPriceLevel,
    allLedgers: ledgers.allLedgers,
    allStockItems: ledgers.allStockItems,
    stockBalances: ledgers.stockBalances,
    godownBalances,
    fetchGodownBalances,
    activeBatches,
    fetchActiveBatches,
    allGodowns: ledgers.allGodowns,
    allUnits: ledgers.allUnits,
    allEmployees: ledgers.allEmployees,
    allAttendanceTypes: ledgers.allAttendanceTypes,
    allPayHeads: ledgers.allPayHeads,
    allCostCategories: ledgers.allCostCategories,
    allEmployeeCategories: ledgers.allEmployeeCategories,
    ledgersLoading: ledgers.ledgersLoading,
    fetchContextData: ledgers.fetchContextData,

    // ── Layout 4 — Attendance & Payroll
    attendanceEntries: rows.attendanceEntries,
    setAttendanceEntries: rows.setAttendanceEntries,
    handleAddAttendanceRow: rows.handleAddAttendanceRow,
    handleUpdateAttendanceRow: rows.handleUpdateAttendanceRow,
    handleRemoveAttendanceRow: rows.handleRemoveAttendanceRow,
    payrollEntries: rows.payrollEntries,
    setPayrollEntries: rows.setPayrollEntries,
    handleAddPayrollRow: rows.handleAddPayrollRow,
    handleUpdatePayrollRow: rows.handleUpdatePayrollRow,
    handleRemovePayrollRow: rows.handleRemovePayrollRow,
    // ── Payroll groups
    payrollGroups: rows.payrollGroups,
    setPayrollGroups: rows.setPayrollGroups,
    payrollEntriesFromGroups: rows.payrollEntriesFromGroups,
    handleAddPayrollGroup: rows.handleAddPayrollGroup,
    handleUpdatePayrollGroup: rows.handleUpdatePayrollGroup,
    handleAddPayrollEmployeeRow: rows.handleAddPayrollEmployeeRow,
    handleUpdatePayrollEmployeeRow: rows.handleUpdatePayrollEmployeeRow,
    autofillPayrollEmployee,
    handleAddPayrollPayHeadRow: rows.handleAddPayrollPayHeadRow,
    handleUpdatePayrollPayHeadRow: rows.handleUpdatePayrollPayHeadRow,
    handleRemovePayrollPayHeadRow: rows.handleRemovePayrollPayHeadRow,
    handleRemovePayrollEmployeeRow: rows.handleRemovePayrollEmployeeRow,
    sourceStockEntries: rows.sourceStockEntries,
    setSourceStockEntries: rows.setSourceStockEntries,
    handleAddSourceStockRow: rows.handleAddSourceStockRow,
    handleUpdateSourceStockRow: rows.handleUpdateSourceStockRow,
    handleRemoveSourceStockRow: rows.handleRemoveSourceStockRow,
    destinationStockEntries: rows.destinationStockEntries,
    setDestinationStockEntries: rows.setDestinationStockEntries,
    handleAddDestinationStockRow: rows.handleAddDestinationStockRow,
    handleUpdateDestinationStockRow: rows.handleUpdateDestinationStockRow,
    handleRemoveDestinationStockRow: rows.handleRemoveDestinationStockRow,

    // ── Search / panel
    ledgerSearchTerm: rows.ledgerSearchTerm,
    setLedgerSearchTerm: rows.setLedgerSearchTerm,
    stockSearchTerm: rows.stockSearchTerm,
    setStockSearchTerm: rows.setStockSearchTerm,
    activeField: rows.activeField,
    handleFieldFocus: rows.handleFieldFocus,
    handleFieldBlur: rows.handleFieldBlur,
    handleLedgerPanelSelect: rows.handleLedgerPanelSelect,

    // ── Layout 1 — single-entry
    accountLedger: rows.accountLedger,
    setAccountLedger: rows.setAccountLedger,
    accountBalance: rows.accountBalance,
    particulars: rows.particulars,
    setParticulars: rows.setParticulars,
    handleUpdateParticularRow: rows.handleUpdateParticularRow,
    handleAddParticularRow: rows.handleAddParticularRow,
    handleRemoveParticularRow: rows.handleRemoveParticularRow,

    // ── Layout 1b — Contra double-entry
    contraEntryMode: rows.contraEntryMode,
    setContraEntryMode: rows.setContraEntryMode,
    contraDoubleRows: rows.contraDoubleRows,
    setContraDoubleRows: rows.setContraDoubleRows,
    handleUpdateContraDoubleRow: rows.handleUpdateContraDoubleRow,
    handleAddContraDoubleRow: rows.handleAddContraDoubleRow,
    handleRemoveContraDoubleRow: rows.handleRemoveContraDoubleRow,

    // ── Layout 1c — Receipt double-entry
    receiptEntryMode: rows.receiptEntryMode,
    setReceiptEntryMode: rows.setReceiptEntryMode,
    receiptDoubleRows: rows.receiptDoubleRows,
    setReceiptDoubleRows: rows.setReceiptDoubleRows,
    handleUpdateReceiptDoubleRow: rows.handleUpdateReceiptDoubleRow,
    handleAddReceiptDoubleRow: rows.handleAddReceiptDoubleRow,
    handleRemoveReceiptDoubleRow: rows.handleRemoveReceiptDoubleRow,

    // ── Layout 1d — Payment double-entry
    paymentEntryMode: rows.paymentEntryMode,
    setPaymentEntryMode: rows.setPaymentEntryMode,
    paymentDoubleRows: rows.paymentDoubleRows,
    setPaymentDoubleRows: rows.setPaymentDoubleRows,
    handleUpdatePaymentDoubleRow: rows.handleUpdatePaymentDoubleRow,
    handleAddPaymentDoubleRow: rows.handleAddPaymentDoubleRow,
    handleRemovePaymentDoubleRow: rows.handleRemovePaymentDoubleRow,

    // ── Layout 2 — Journal
    journalEntryMode: rows.journalEntryMode,
    setJournalEntryMode: rows.setJournalEntryMode,
    journalRows: rows.journalRows,
    setJournalRows: rows.setJournalRows,
    handleUpdateJournalRow: rows.handleUpdateJournalRow,
    handleAddJournalRow: rows.handleAddJournalRow,
    handleRemoveJournalRow: rows.handleRemoveJournalRow,

    // ── Layout 3 — Sales / Purchase
    partyLedger: rows.partyLedger,
    setPartyLedger: rows.setPartyLedger,
    partyBalance: rows.partyBalance,
    salesPurchaseLedger: rows.salesPurchaseLedger,
    setSalesPurchaseLedger: rows.setSalesPurchaseLedger,
    salesPurchaseBalance: rows.salesPurchaseBalance,
    stockEntries: rows.stockEntries,
    setStockEntries: rows.setStockEntries,
    handleUpdateStockRow: rows.handleUpdateStockRow,
    handleAddStockRow: rows.handleAddStockRow,
    handleRemoveStockRow: rows.handleRemoveStockRow,
    additionalEntries: rows.additionalEntries,
    setAdditionalEntries: rows.setAdditionalEntries,
    handleUpdateAdditionalRow: rows.handleUpdateAdditionalRow,
    handleAddAdditionalRow: rows.handleAddAdditionalRow,
    handleRemoveAdditionalRow: rows.handleRemoveAdditionalRow,

    // ── Context helpers
    checkIsCashOrBank: ledgers.checkIsCashOrBank,
    checkIsCash: ledgers.checkIsCash,
    checkIsBank: ledgers.checkIsBank,
    checkIsParty: ledgers.checkIsParty,
    checkLedgerGroup: ledgers.checkLedgerGroup,
    negativeStockWarnings: rows.negativeStockWarnings,
    companyId,
    fyId,
  };
}
